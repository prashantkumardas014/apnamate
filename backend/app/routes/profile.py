# backend/app/routes/profile.py
"""
Profile management:
  PUT  /profile/me           → update name, phone, location, service, bio
  POST /profile/me/avatar    → upload/replace profile photo
  POST /profile/me/verify-aadhaar → offline Aadhaar validation
"""
import os
import re
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.auth import get_current_user

router = APIRouter()

AVATAR_DIR = Path("uploads/avatars")
AVATAR_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".webp"}
MAX_AVATAR_SIZE = 5 * 1024 * 1024   # 5 MB


class ProfileUpdate(BaseModel):
    name: str | None = None
    phone: str | None = None
    location: str | None = None
    service: str | None = None
    experience: str | None = None
    category: str | None = None
    bio: str | None = None


class AadhaarVerify(BaseModel):
    aadhaar_number: str


# ---------- Verhoeff checksum (Aadhaar syntax validation) ----------

_VERHOEFF_D = [
    [0,1,2,3,4,5,6,7,8,9],
    [1,2,3,4,0,6,7,8,9,5],
    [2,3,4,0,1,7,8,9,5,6],
    [3,4,0,1,2,8,9,5,6,7],
    [4,0,1,2,3,9,5,6,7,8],
    [5,9,8,7,6,0,4,3,2,1],
    [6,5,9,8,7,1,0,4,3,2],
    [7,6,5,9,8,2,1,0,4,3],
    [8,7,6,5,9,3,2,1,0,4],
    [9,8,7,6,5,4,3,2,1,0],
]
_VERHOEFF_P = [
    [0,1,2,3,4,5,6,7,8,9],
    [1,5,7,6,2,8,3,0,9,4],
    [5,8,0,3,7,9,6,1,4,2],
    [8,9,1,6,0,4,3,5,2,7],
    [9,4,5,3,1,2,6,8,7,0],
    [4,2,8,6,5,7,3,9,0,1],
    [2,7,9,3,8,0,6,4,1,5],
    [7,0,4,6,9,1,3,2,5,8],
]


def validate_aadhaar_syntax(aadhaar: str) -> bool:
    """Verhoeff checksum validation. Returns True if the 12-digit number is syntactically valid."""
    if not aadhaar or not aadhaar.isdigit() or len(aadhaar) != 12:
        return False
    if aadhaar[0] in ("0", "1"):     # UIDAI never issues these
        return False

    c = 0
    for i, ch in enumerate(reversed(aadhaar)):
        c = _VERHOEFF_D[c][_VERHOEFF_P[i % 8][int(ch)]]
    return c == 0


# ---------- Endpoints ----------

@router.put("/profile/me")
async def update_profile(
    payload: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if payload.name is not None and payload.name.strip():
        current_user.name = payload.name.strip()
    if payload.phone is not None:
        current_user.phone = payload.phone.strip() or None
    if payload.location is not None:
        current_user.location = payload.location.strip()
    if payload.service is not None:
        current_user.service = payload.service.strip()
    if payload.experience is not None:
        current_user.experience = payload.experience.strip()
    if payload.category is not None:
        current_user.category = payload.category.strip()
    if payload.bio is not None:
        # Reuse experience field for bio if you don't have a dedicated column
        current_user.experience = payload.bio.strip()

    current_user.updated_at = datetime.now()
    db.commit()
    db.refresh(current_user)

    return {
        "success": True,
        "message": "Profile updated",
        "user": {
            "id": current_user.id,
            "name": current_user.name,
            "email": current_user.email,
            "phone": current_user.phone,
            "location": current_user.location,
            "service": current_user.service,
            "experience": current_user.experience,
            "category": current_user.category,
            "avatar_url": current_user.avatar_url,
            "aadhaar_verified": bool(current_user.aadhaar_verified),
            "aadhaar_last4": current_user.aadhaar_last4,
        },
    }


@router.post("/profile/me/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_IMAGE_EXTS:
        raise HTTPException(400, f"Allowed formats: {', '.join(ALLOWED_IMAGE_EXTS)}")

    content = await file.read()
    if len(content) > MAX_AVATAR_SIZE:
        raise HTTPException(400, "Image too large (max 5 MB)")

    filename = f"user_{current_user.id}{ext}"
    filepath = AVATAR_DIR / filename

    # Remove any older avatar for this user (different extension)
    for old in AVATAR_DIR.glob(f"user_{current_user.id}.*"):
        try:
            old.unlink()
        except Exception:
            pass

    with open(filepath, "wb") as f:
        f.write(content)

    current_user.avatar_url = f"/uploads/avatars/{filename}"
    current_user.updated_at = datetime.now()
    db.commit()
    db.refresh(current_user)

    return {
        "success": True,
        "avatar_url": current_user.avatar_url,
    }


@router.post("/profile/me/verify-aadhaar")
async def verify_aadhaar(
    payload: AadhaarVerify,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Offline Aadhaar validation using the Verhoeff checksum.
    This proves the number is syntactically valid — it does NOT prove the user owns it.
    For full KYC ownership proof, integrate a paid provider (Sandbox, Cashfree, DigiLocker).
    """
    aadhaar = re.sub(r"\D", "", payload.aadhaar_number or "")

    if not validate_aadhaar_syntax(aadhaar):
        raise HTTPException(400, "Invalid Aadhaar number (checksum failed)")

    current_user.aadhaar_verified = 1
    current_user.aadhaar_last4 = aadhaar[-4:]
    current_user.updated_at = datetime.now()
    db.commit()

    return {
        "success": True,
        "message": "Aadhaar syntax verified",
        "aadhaar_last4": aadhaar[-4:],
        "verified": True,
    }
