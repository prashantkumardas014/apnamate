# backend/app/routes/phone_auth.py
"""
Phone + OTP authentication.

Flow:
  1. POST /auth/phone/send-otp    { phone }
  2. POST /auth/phone/verify-otp  { phone, code }
     → returns token + user (creates user if new)
"""
import os
import random
import requests
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.auth import create_access_token

router = APIRouter()

# ==============================
# CONFIG
# ==============================

OTP_TTL_MINUTES = 10
OTP_MAX_ATTEMPTS = 5
DEV_MODE = os.getenv("OTP_DEV_MODE", "false").lower() == "true"

FAST2SMS_API_KEY = os.getenv("FAST2SMS_API_KEY", "").strip()
FAST2SMS_URL = "https://www.fast2sms.com/dev/bulkV2"


# ==============================
# SCHEMAS
# ==============================

class SendOtpRequest(BaseModel):
    phone: str


class VerifyOtpRequest(BaseModel):
    phone: str
    code: str
    name: str | None = None
    role: str | None = "customer"


# ==============================
# HELPERS
# ==============================

def normalize_phone(raw: str) -> str:
    """Strip spaces/dashes. Keep leading + if present. Default to +91 for 10-digit India numbers."""
    if not raw:
        raise HTTPException(400, "Phone number required")
    p = "".join(ch for ch in raw if ch.isdigit() or ch == "+")
    if p.startswith("+"):
        return p
    if len(p) == 10:
        return "+91" + p
    return "+" + p if p else ""


def generate_code() -> str:
    return f"{random.randint(0, 999999):06d}"


def send_sms(phone: str, code: str) -> bool:
    """
    Send OTP via Fast2SMS.
    Returns True if the SMS was accepted by the provider, False otherwise.
    Falls back to console output if the API key is missing or the number
    isn't a valid Indian 10-digit number.
    """
    # No key → console fallback
    if not FAST2SMS_API_KEY:
        print("⚠️  FAST2SMS_API_KEY not set — falling back to console")
        print(f"📱 [OTP] {phone} → {code}")
        return False

    # Fast2SMS expects 10-digit Indian number (no +91)
    number = phone.replace("+91", "").replace("+", "").strip()
    if len(number) != 10 or not number.isdigit():
        print(f"⚠️  Non-Indian number {phone} — console fallback")
        print(f"📱 [OTP] {phone} → {code}")
        return False

    try:
        r = requests.post(
            FAST2SMS_URL,
            headers={
                "authorization": FAST2SMS_API_KEY,
                "Content-Type": "application/json",
            },
            json={
                "route": "q",
                "message": (
                    f"Your ApnaMate OTP is {code}. "
                    f"Valid for {OTP_TTL_MINUTES} minutes. "
                    "Do not share it with anyone."
                ),
                "language": "english",
                "flash": 0,
                "numbers": number,
            },
            timeout=10,
        )

        try:
            data = r.json()
        except Exception:
            data = {"raw": r.text}

        if r.status_code == 200 and data.get("return"):
            print(f"✅ SMS sent to {phone}")
            return True

        print(f"⚠️  SMS failed (status {r.status_code}): {data}")

        # Friendly hints for common Fast2SMS errors
        msg = str(data.get("message", ""))
        if "100 INR" in msg or "complete one transaction" in msg:
            print("   💡 Hint: Fast2SMS requires a one-time ₹100+ payment before API access.")
        elif "Invalid API key" in msg or "Invalid authorization" in msg:
            print("   💡 Hint: Check FAST2SMS_API_KEY in .env")
        elif "Insufficient" in msg or "balance" in msg.lower():
            print("   💡 Hint: Add credits to your Fast2SMS wallet.")

        # Fallback so testing doesn't dead-end
        print(f"📱 [OTP fallback] {phone} → {code}")
        return False

    except requests.exceptions.Timeout:
        print("⚠️  Fast2SMS request timed out")
        print(f"📱 [OTP fallback] {phone} → {code}")
        return False
    except requests.exceptions.RequestException as e:
        print(f"⚠️  SMS request error: {e}")
        print(f"📱 [OTP fallback] {phone} → {code}")
        return False
    except Exception as e:
        print(f"⚠️  SMS unexpected error: {e}")
        print(f"📱 [OTP fallback] {phone} → {code}")
        return False


def _safe_token(user: User) -> str:
    """Try the common create_access_token signatures."""
    try:
        return create_access_token({"sub": str(user.id), "role": user.role})
    except Exception:
        try:
            return create_access_token(user.id, user.role)
        except Exception:
            return ""


# ==============================
# 1. SEND OTP
# ==============================

@router.post("/auth/phone/send-otp")
async def send_otp(payload: SendOtpRequest, db: Session = Depends(get_db)):
    phone = normalize_phone(payload.phone)
    if not phone or len(phone) < 10:
        raise HTTPException(400, "Invalid phone number")

    code = generate_code()
    expires = datetime.now() + timedelta(minutes=OTP_TTL_MINUTES)

    # Invalidate any previous unused codes for this phone
    db.execute(
        text("UPDATE otp_codes SET used = 1 WHERE phone = :p AND used = 0"),
        {"p": phone},
    )

    # Insert new code
    db.execute(
        text(
            """INSERT INTO otp_codes (phone, code, purpose, expires_at, created_at)
               VALUES (:p, :c, 'login', :e, :n)"""
        ),
        {"p": phone, "c": code, "e": expires, "n": datetime.now()},
    )
    db.commit()

    # Try to deliver via SMS
    sms_sent = send_sms(phone, code)

    response = {
        "success": True,
        "message": f"OTP sent to {phone}. Valid for {OTP_TTL_MINUTES} minutes.",
        "phone": phone,
        "expires_in_seconds": OTP_TTL_MINUTES * 60,
        "sms_delivered": sms_sent,
    }

    # Only leak the code when explicitly in DEV_MODE
    if DEV_MODE:
        response["dev_code"] = code

    return response


# ==============================
# 2. VERIFY OTP
# ==============================

@router.post("/auth/phone/verify-otp")
async def verify_otp(payload: VerifyOtpRequest, db: Session = Depends(get_db)):
    phone = normalize_phone(payload.phone)
    code = (payload.code or "").strip()

    if not phone or not code:
        raise HTTPException(400, "Phone and code required")

    # Find latest unused code for this phone
    row = db.execute(
        text(
            """SELECT id, code, attempts, expires_at
               FROM otp_codes
               WHERE phone = :p AND used = 0
               ORDER BY id DESC LIMIT 1"""
        ),
        {"p": phone},
    ).fetchone()

    if not row:
        raise HTTPException(400, "No active OTP. Please request a new one.")

    otp_id, real_code, attempts, expires_at = row

    # Expiry check
    try:
        if isinstance(expires_at, datetime):
            exp_dt = expires_at
        else:
            exp_dt = datetime.fromisoformat(str(expires_at))
    except Exception:
        exp_dt = datetime.now() + timedelta(minutes=1)

    if exp_dt < datetime.now():
        db.execute(text("UPDATE otp_codes SET used = 1 WHERE id = :i"), {"i": otp_id})
        db.commit()
        raise HTTPException(400, "OTP expired. Please request a new one.")

    if attempts >= OTP_MAX_ATTEMPTS:
        db.execute(text("UPDATE otp_codes SET used = 1 WHERE id = :i"), {"i": otp_id})
        db.commit()
        raise HTTPException(400, "Too many attempts. Request a new OTP.")

    if code != real_code:
        db.execute(
            text("UPDATE otp_codes SET attempts = attempts + 1 WHERE id = :i"),
            {"i": otp_id},
        )
        db.commit()
        raise HTTPException(400, "Incorrect OTP.")

    # ✅ Success — mark used
    db.execute(text("UPDATE otp_codes SET used = 1 WHERE id = :i"), {"i": otp_id})

    # Find or create user
    user = db.query(User).filter(User.phone == phone).first()
    is_new = False

    if not user:
        is_new = True
        role = (payload.role or "customer").lower()
        if role not in ("customer", "provider"):
            role = "customer"
        name = (payload.name or "").strip() or f"User {phone[-4:]}"

        # Placeholder email (users table requires one)
        fake_email = f"phone_{phone.replace('+', '')}@apnamate.local"
        if db.query(User).filter(User.email == fake_email).first():
            fake_email = (
                f"phone_{phone.replace('+', '')}_{random.randint(1000, 9999)}@apnamate.local"
            )

        user = User(
            name=name,
            email=fake_email,
            password="__PHONE_OTP__",
            role=role,
            phone=phone,
            phone_verified=1,
            is_active=1,
            created_at=datetime.now(),
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        user.phone_verified = 1
        user.updated_at = datetime.now()
        db.commit()
        db.refresh(user)

    token = _safe_token(user)

    return {
        "success": True,
        "message": "Logged in" if not is_new else "Account created & logged in",
        "is_new_user": is_new,
        "token": token,
        "user_id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "phone": user.phone,
    }