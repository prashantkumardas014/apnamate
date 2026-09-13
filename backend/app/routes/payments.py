# backend/app/routes/payments.py
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import Response
from sqlalchemy.orm import Session
from datetime import datetime
from pydantic import BaseModel
from typing import Optional
from pathlib import Path
import os
import qrcode
from io import BytesIO
import base64

from app.database import get_db
from app.models import (
    User, Booking, Payment, Notification, ProviderPayout,
    Bill, EmailLog, AdminLog,
)
from app.auth import get_current_user

# ✅ Services for bills and emails
from app.services.email_service import send_email, render_template
from app.services.bill_service import (
    generate_bill_pdf,
    generate_bill_number,
    generate_customer_bill_pdf,
    generate_provider_bill_pdf,
)

router = APIRouter()

# ==============================
# CONFIG
# ==============================

UPI_ID = os.getenv("UPI_ID", "pd5935306@oksbi")
UPI_PHONE = os.getenv("UPI_PHONE", "7069112526")
UPI_NAME = os.getenv("UPI_NAME", "ApnaMate")

COMMISSION_RATE = 0.10   # 10% platform cut

ALLOWED_GATEWAYS = {"upi", "cash", "card", "razorpay"}

PAYABLE_BOOKING_STATUSES = {
    "accepted", "confirmed", "Accepted", "Confirmed",
    "payment_pending", "pending_verification",
}

# ==============================
# SCHEMAS
# ==============================

class PaymentCreate(BaseModel):
    booking_id: int
    gateway: str
    amount: Optional[float] = None
    currency: str = "INR"


class PaymentVerify(BaseModel):
    gateway: str
    payment_id: Optional[int] = None
    order_id: Optional[str] = None
    transaction_id: Optional[str] = None
    signature: Optional[str] = None
    action: str = "submit"        # submit | admin_confirm | reject
    notes: Optional[str] = None

# ==============================
# HELPERS
# ==============================

def to_rupees_int(amount) -> int:
    return int(round(float(amount)))


def to_rupees_float(amount) -> float:
    return float(int(amount))


def generate_upi_qr_code(upi_id: str, amount_rupees: float, booking_id: int, name: str = "ApnaMate"):
    try:
        amount_str = f"{float(amount_rupees):.2f}"
        upi_url = (
            f"upi://pay?"
            f"pa={upi_id}"
            f"&pn={name}"
            f"&am={amount_str}"
            f"&cu=INR"
            f"&tn=Booking-{booking_id}"
        )

        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(upi_url)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")

        buffered = BytesIO()
        img.save(buffered, format="PNG")
        img_str = base64.b64encode(buffered.getvalue()).decode("utf-8")

        return {"success": True, "qr_code": img_str, "upi_url": upi_url,
                "amount": float(amount_rupees)}
    except Exception as e:
        return {"success": False, "error": str(e)}


def create_notification(user_id, title, message, type="payment", db=None, booking_id=None):
    if not db:
        return None
    n = Notification(
        user_id=user_id,
        title=title,
        message=message,
        type=type,
        booking_id=booking_id,
        created_at=datetime.now(),
    )
    db.add(n)
    return n

# ==============================
# CREATE PAYMENT
# ==============================

@router.post("/payments/create")
async def create_payment(
    payment_data: PaymentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        gateway = (payment_data.gateway or "").lower()
        if gateway not in ALLOWED_GATEWAYS:
            raise HTTPException(400, f"Unsupported gateway: {payment_data.gateway}")

        booking = db.query(Booking).filter(
            Booking.id == payment_data.booking_id,
            Booking.customer_id == current_user.id,
        ).first()
        if not booking:
            raise HTTPException(404, "Booking not found")

        if booking.status not in PAYABLE_BOOKING_STATUSES:
            raise HTTPException(400, f"Cannot pay for booking with status '{booking.status}'. Accept the quote first.")

        if not booking.quoted_amount or float(booking.quoted_amount) <= 0:
            raise HTTPException(400, "Booking has no quote. Wait for provider to send a quote.")

        # ✅ STRICT: quote is the only source of truth
        quoted_rupees = float(booking.quoted_amount)
        quoted_int = to_rupees_int(quoted_rupees)

        if quoted_int <= 0:
            raise HTTPException(400, f"Invalid quoted amount: {booking.quoted_amount}")

        if payment_data.amount is not None:
            client_int = to_rupees_int(payment_data.amount)
            if client_int != quoted_int:
                raise HTTPException(
                    400,
                    f"Amount mismatch: quote is ₹{quoted_int}, but request has ₹{client_int}. "
                    f"Refusing to create payment."
                )

        existing_completed = db.query(Payment).filter(
            Payment.booking_id == booking.id,
            Payment.status == "completed",
        ).first()
        if existing_completed:
            raise HTTPException(400, "Booking already paid")

        existing_pending = db.query(Payment).filter(
            Payment.booking_id == booking.id,
            Payment.user_id == current_user.id,
            Payment.status.in_(["pending", "pending_cash", "pending_card", "awaiting_verification"]),
        ).first()

        if existing_pending:
            new_payment = existing_pending
            new_payment.amount = quoted_int
            new_payment.gateway = gateway
            new_payment.updated_at = datetime.now()
            db.commit()
            db.refresh(new_payment)
        else:
            new_payment = Payment(
                booking_id=booking.id,
                user_id=current_user.id,
                provider_id=booking.provider_id or 0,
                amount=quoted_int,
                currency=payment_data.currency or "INR",
                gateway=gateway,
                status="pending",
                created_at=datetime.now(),
            )
            db.add(new_payment)
            db.commit()
            db.refresh(new_payment)

        # ---------------- UPI ----------------
        if gateway == "upi":
            result = generate_upi_qr_code(UPI_ID, quoted_rupees, booking.id, UPI_NAME)
            if not result["success"]:
                new_payment.status = "failed"
                db.commit()
                raise HTTPException(500, result.get("error", "QR failed"))

            new_payment.gateway_order_id = f"UPI_{booking.id}_{int(datetime.now().timestamp())}"
            new_payment.payment_method = "upi"
            new_payment.upi_id = UPI_ID
            db.commit()

            return {
                "success": True,
                "payment_id": new_payment.id,
                "gateway_order_id": new_payment.gateway_order_id,
                "amount": quoted_rupees,
                "currency": new_payment.currency,
                "status": new_payment.status,
                "qr_code": result["qr_code"],
                "upi_id": UPI_ID,
                "upi_phone": UPI_PHONE,
                "upi_name": UPI_NAME,
                "upi_url": result["upi_url"],
                "message": "Scan the QR or use UPI ID to pay",
            }

        # ---------------- CASH ----------------
        if gateway == "cash":
            new_payment.status = "pending_cash"
            new_payment.payment_method = "cash"
            new_payment.gateway_order_id = f"COD_{booking.id}_{int(datetime.now().timestamp())}"
            db.commit()

            if booking.provider_id:
                create_notification(
                    user_id=booking.provider_id,
                    title="💰 New COD Booking",
                    message=f"COD booking from {current_user.name}. Amount ₹{quoted_rupees:.0f}. Booking #{booking.id}",
                    db=db, booking_id=booking.id,
                )
                db.commit()

            return {
                "success": True,
                "payment_id": new_payment.id,
                "amount": quoted_rupees,
                "status": "pending_cash",
                "message": "Booking confirmed. Pay provider in cash after service.",
            }

        # ---------------- CARD / RAZORPAY ----------------
        if gateway in ("razorpay", "card"):
            new_payment.status = "pending_card"
            new_payment.payment_method = gateway
            new_payment.gateway_order_id = f"RZP_{booking.id}_{int(datetime.now().timestamp())}"
            db.commit()

            return {
                "success": True,
                "payment_id": new_payment.id,
                "amount": quoted_rupees,
                "status": "pending_card",
                "message": "Card payment initiated.",
            }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(500, f"Error creating payment: {str(e)}")


# ==============================
# VERIFY PAYMENT  (3-action state machine)
# ==============================

@router.post("/payments/verify")
async def verify_payment(
    verify_data: PaymentVerify,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    submit        → CUSTOMER claims paid → awaiting_verification + booking payment_pending
    admin_confirm → ADMIN sees money     → completed + booking.paid + payout + bill + emails
    reject        → ADMIN rejects        → pending + booking back to accepted
    """
    try:
        payment = None
        if verify_data.payment_id:
            payment = db.query(Payment).filter(Payment.id == verify_data.payment_id).first()
            if not payment:
                payment = db.query(Payment).filter(
                    Payment.booking_id == verify_data.payment_id
                ).order_by(Payment.created_at.desc()).first()
        elif verify_data.order_id:
            payment = db.query(Payment).filter(
                Payment.gateway_order_id == verify_data.order_id
            ).first()

        if not payment:
            raise HTTPException(404, "Payment not found")

        booking = db.query(Booking).filter(Booking.id == payment.booking_id).first()
        is_admin = current_user.role == "admin"
        is_owner = payment.user_id == current_user.id
        action = (verify_data.action or "submit").lower()
        amount_rupees = to_rupees_float(payment.amount)

        # ---------- SUBMIT ----------
        if action == "submit":
            if not is_owner and not is_admin:
                raise HTTPException(403, "Only the customer can submit payment proof")

            if booking and booking.quoted_amount:
                quote_int = to_rupees_int(booking.quoted_amount)
                if quote_int != int(payment.amount):
                    raise HTTPException(
                        400,
                        f"Payment amount (₹{int(payment.amount)}) does not match booking quote "
                        f"(₹{quote_int}). Please re-initiate payment."
                    )

            if payment.status == "completed":
                return {"success": True, "payment_id": payment.id, "status": "completed"}

            if payment.status == "awaiting_verification":
                return {"success": True, "payment_id": payment.id, "status": "awaiting_verification"}

            payment.status = "awaiting_verification"
            payment.upi_txn_ref = verify_data.transaction_id
            payment.utr_number = verify_data.transaction_id
            payment.gateway_payment_id = verify_data.transaction_id or "UPI_MANUAL"
            payment.updated_at = datetime.now()

            if booking:
                booking.status = "payment_pending"
                booking.updated_at = datetime.now()

            db.commit()

            admins = db.query(User).filter(User.role == "admin").all()
            for a in admins:
                create_notification(
                    user_id=a.id,
                    title="🔔 Payment Awaiting Verification",
                    message=f"{current_user.name} submitted ₹{amount_rupees:.0f} for booking #{booking.id}. UTR: {verify_data.transaction_id}",
                    db=db, booking_id=booking.id,
                )
            db.commit()

            return {
                "success": True,
                "message": f"₹{amount_rupees:.0f} submitted. Admin will verify shortly.",
                "payment_id": payment.id,
                "status": "awaiting_verification",
                "amount": amount_rupees,
            }

        # ---------- ADMIN CONFIRM ----------
        if action == "admin_confirm":
            if not is_admin:
                raise HTTPException(403, "Admin only")

            if payment.status == "completed":
                return {"success": True, "payment_id": payment.id, "status": "completed"}

            if payment.status != "awaiting_verification":
                raise HTTPException(400, f"Cannot confirm payment in status '{payment.status}'")

            if booking and booking.quoted_amount:
                quote_int = to_rupees_int(booking.quoted_amount)
                if quote_int != int(payment.amount):
                    raise HTTPException(
                        400,
                        f"Cannot approve: payment ₹{int(payment.amount)} != booking quote ₹{quote_int}"
                    )

            # ---- 1. Update payment + booking ----
            payment.status = "completed"
            payment.completed_at = datetime.now()
            payment.updated_at = datetime.now()
            payment.verified_by = current_user.id
            payment.verified_at = datetime.now()

            if booking:
                booking.status = "paid"
                booking.paid_at = datetime.now()
                booking.paid_amount = int(amount_rupees)
                booking.updated_at = datetime.now()

            # ---- 2. Create payout row ----
            payout = None
            commission = 0.0
            net_to_provider = 0.0

            if payment.provider_id:
                commission = round(amount_rupees * COMMISSION_RATE, 2)
                net_to_provider = round(amount_rupees - commission, 2)

                payout = ProviderPayout(
                    provider_id=payment.provider_id,
                    booking_id=payment.booking_id,
                    payment_id=payment.id,
                    amount=amount_rupees,
                    commission=commission,
                    net_amount=net_to_provider,
                    status="owed",
                    created_at=datetime.now(),
                )
                db.add(payout)
                db.commit()
                db.refresh(payout)

            # ---- 3. Create immutable Bill ----
            customer = db.query(User).filter(User.id == payment.user_id).first()
            provider = (
                db.query(User).filter(User.id == payment.provider_id).first()
                if payment.provider_id else None
            )

            bill = Bill(
                bill_number=generate_bill_number(booking.id if booking else payment.booking_id),
                version=1,
                booking_id=payment.booking_id,
                payment_id=payment.id,
                customer_id=payment.user_id,
                provider_id=payment.provider_id,
                quoted_amount=float(booking.quoted_amount) if booking and booking.quoted_amount else amount_rupees,
                paid_amount=amount_rupees,
                commission=commission,
                net_to_provider=net_to_provider,
                currency=payment.currency or "INR",
                customer_name=customer.name if customer else "Customer",
                customer_email=customer.email if customer else "",
                provider_name=provider.name if provider else None,
                service=booking.service if booking else "Service",
                booking_date=booking.date if booking else datetime.now().strftime("%Y-%m-%d"),
                gateway=payment.gateway,
                utr_number=payment.utr_number or payment.upi_txn_ref,
                verified_by_admin_id=current_user.id,
                issued_at=datetime.now(),
                email_status="pending",
            )
            db.add(bill)
            db.commit()
            db.refresh(bill)

            # ---- 4. Admin audit log ----
            try:
                db.add(AdminLog(
                    admin_id=current_user.id,
                    action="approve_payment",
                    target_type="payment",
                    target_id=payment.id,
                    details=f"Bill {bill.bill_number} · ₹{amount_rupees} · booking #{payment.booking_id}",
                    created_at=datetime.now(),
                ))
                db.commit()
            except Exception as log_err:
                print(f"⚠️ AdminLog failed: {log_err}")
                db.rollback()

            # ---- 5. Generate PDFs + send emails ----
            try:
                # ✅ Role-aware PDFs: customer sees receipt only, provider sees payout
                customer_pdf = generate_customer_bill_pdf(bill)
                provider_pdf = generate_provider_bill_pdf(bill)

                email_ok_customer = True
                email_ok_provider = True

                # Customer email
                if customer and customer.email:
                    html_c = render_template(
                        "bill_customer.html",
                        subject=f"Payment Confirmed — Booking #{bill.booking_id}",
                        bill=bill,
                        fallback_text=f"Payment of ₹{bill.paid_amount} confirmed. Bill: {bill.bill_number}",
                    )
                    result_c = send_email(
                        to_email=customer.email,
                        subject=f"✅ ApnaMate Payment Confirmed — Bill {bill.bill_number}",
                        html_body=html_c,
                        text_body=(
                            f"Your payment of ₹{bill.paid_amount} for booking "
                            f"#{bill.booking_id} is confirmed. Bill {bill.bill_number}."
                        ),
                        attachments=[{
                            "data": customer_pdf,
                            "maintype": "application",
                            "subtype": "pdf",
                            "filename": f"ApnaMate-Bill-{bill.bill_number}.pdf",
                        }],
                        db=db,
                        template="bill_customer",
                        bill_id=bill.id,
                        booking_id=bill.booking_id,
                    )
                    email_ok_customer = result_c["success"]
                    if email_ok_customer:
                        bill.emailed_to_customer_at = datetime.now()
                    else:
                        bill.email_error = result_c.get("error")

                # Provider email
                if provider and provider.email:
                    html_p = render_template(
                        "bill_provider.html",
                        subject=f"Payment Received — Booking #{bill.booking_id}",
                        bill=bill,
                        fallback_text=f"Payment received for booking #{bill.booking_id}.",
                    )
                    result_p = send_email(
                        to_email=provider.email,
                        subject=f"💵 ApnaMate Payment Received — Booking #{bill.booking_id}",
                        html_body=html_p,
                        text_body=(
                            f"Payment of ₹{bill.paid_amount} received for booking "
                            f"#{bill.booking_id}. Your share: ₹{bill.net_to_provider}."
                        ),
                        attachments=[{
                            "data": provider_pdf,
                            "maintype": "application",
                            "subtype": "pdf",
                            "filename": f"ApnaMate-Receipt-{bill.bill_number}.pdf",
                        }],
                        db=db,
                        template="bill_provider",
                        bill_id=bill.id,
                        booking_id=bill.booking_id,
                    )
                    email_ok_provider = result_p["success"]
                    if email_ok_provider:
                        bill.emailed_to_provider_at = datetime.now()
                    else:
                        bill.email_error = (bill.email_error or "") + " | " + str(result_p.get("error"))

                # Update overall status
                if email_ok_customer and email_ok_provider:
                    bill.email_status = "sent"
                elif email_ok_customer or email_ok_provider:
                    bill.email_status = "partial"
                else:
                    bill.email_status = "failed"
                db.commit()

            except Exception as e:
                print(f"⚠️ Bill email failed: {e}")
                bill.email_status = "failed"
                bill.email_error = str(e)
                db.commit()

            # ---- 6. Notifications ----
            create_notification(
                user_id=payment.user_id,
                title="✅ Payment Confirmed!",
                message=(
                    f"₹{amount_rupees:.0f} payment for booking #{payment.booking_id} "
                    f"is confirmed. Bill {bill.bill_number} emailed to you."
                ),
                db=db, booking_id=payment.booking_id,
            )

            if payment.provider_id and payout:
                create_notification(
                    user_id=payment.provider_id,
                    title="💵 Payout Recorded",
                    message=(
                        f"₹{float(payout.net_amount):.0f} will be paid to you for "
                        f"booking #{payment.booking_id} (commission ₹{float(payout.commission):.0f})."
                    ),
                    db=db, booking_id=payment.booking_id,
                )

            db.commit()

            return {
                "success": True,
                "message": f"₹{amount_rupees:.0f} confirmed. Bill {bill.bill_number} created and emailed.",
                "payment_id": payment.id,
                "status": "completed",
                "amount": amount_rupees,
                "payout_id": payout.id if payout else None,
                "bill_id": bill.id,
                "bill_number": bill.bill_number,
                "email_status": bill.email_status,
            }

        # ---------- ADMIN REJECT ----------
        if action == "reject":
            if not is_admin:
                raise HTTPException(403, "Admin only")

            reason = verify_data.notes or "Payment proof invalid"
            payment.status = "pending"
            payment.upi_txn_ref = None
            payment.utr_number = None
            payment.gateway_payment_id = None
            payment.rejection_reason = reason
            payment.updated_at = datetime.now()

            if booking:
                booking.status = "accepted"
                booking.updated_at = datetime.now()

            db.commit()

            # Audit log
            try:
                db.add(AdminLog(
                    admin_id=current_user.id,
                    action="reject_payment",
                    target_type="payment",
                    target_id=payment.id,
                    details=f"Reason: {reason} · booking #{payment.booking_id}",
                    created_at=datetime.now(),
                ))
                db.commit()
            except Exception as log_err:
                print(f"⚠️ AdminLog failed: {log_err}")
                db.rollback()

            create_notification(
                user_id=payment.user_id,
                title="❌ Payment Not Verified",
                message=f"Booking #{booking.id} payment rejected. Reason: {reason}. Please retry.",
                db=db, booking_id=booking.id,
            )
            db.commit()

            return {
                "success": True,
                "message": "Rejected. Customer notified.",
                "payment_id": payment.id,
                "status": "pending",
            }

        raise HTTPException(400, f"Unknown action: {action}")

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(500, f"Error: {str(e)}")


# ==============================
# ADMIN — convenience aliases
# ==============================

@router.post("/payments/admin/{payment_id}/approve")
async def admin_approve_payment(
    payment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Alias for verify(action='admin_confirm')."""
    return await verify_payment(
        verify_data=PaymentVerify(
            gateway="upi",
            payment_id=payment_id,
            action="admin_confirm",
        ),
        current_user=current_user,
        db=db,
    )


@router.post("/payments/admin/{payment_id}/reject")
async def admin_reject_payment(
    payment_id: int,
    reason: str = "",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Alias for verify(action='reject')."""
    return await verify_payment(
        verify_data=PaymentVerify(
            gateway="upi",
            payment_id=payment_id,
            action="reject",
            notes=reason or "Payment proof invalid",
        ),
        current_user=current_user,
        db=db,
    )


# ==============================
# SCREENSHOT UPLOAD
# ==============================

@router.post("/payments/{payment_id}/screenshot")
async def upload_screenshot(
    payment_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    payment = db.query(Payment).filter(
        Payment.id == payment_id,
        Payment.user_id == current_user.id,
    ).first()
    if not payment:
        raise HTTPException(404, "Payment not found")

    upload_dir = Path("uploads/payments")
    upload_dir.mkdir(parents=True, exist_ok=True)

    ext = (file.filename or "png").split(".")[-1].lower()
    if ext not in ("png", "jpg", "jpeg", "webp", "pdf"):
        raise HTTPException(400, "Allowed: png jpg jpeg webp pdf")

    path = upload_dir / f"payment_{payment_id}.{ext}"
    with open(path, "wb") as f:
        f.write(await file.read())

    payment.screenshot_url = f"/uploads/payments/payment_{payment_id}.{ext}"
    payment.updated_at = datetime.now()
    db.commit()

    return {"success": True, "url": payment.screenshot_url}


# ==============================
# ADMIN — pending verification list
# ==============================

@router.get("/payments/admin/pending-verification")
async def admin_pending_verifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != "admin":
        raise HTTPException(403, "Admin only")

    rows = db.query(Payment).filter(
        Payment.status == "awaiting_verification"
    ).order_by(Payment.updated_at.desc()).all()

    out = []
    for p in rows:
        customer = db.query(User).filter(User.id == p.user_id).first()
        booking = db.query(Booking).filter(Booking.id == p.booking_id).first()

        booking_quoted = (
            float(booking.quoted_amount)
            if booking and booking.quoted_amount is not None
            else None
        )
        payment_amount = to_rupees_float(p.amount)
        matches = (
            booking_quoted is not None
            and int(booking_quoted) == int(payment_amount)
        )

        out.append({
            "payment_id": p.id,
            "booking_id": p.booking_id,
            "amount": payment_amount,
            "booking_quoted": booking_quoted,
            "amount_matches_quote": matches,
            "gateway": p.gateway,
            "utr": p.utr_number or p.upi_txn_ref,
            "screenshot_url": p.screenshot_url,
            "submitted_at": (p.updated_at or p.created_at).isoformat()
                if (p.updated_at or p.created_at) else None,
            "customer": {
                "name": customer.name if customer else "Unknown",
                "email": customer.email if customer else None,
            },
            "booking": {
                "service": booking.service if booking else None,
                "date": booking.date if booking else None,
                "quoted_amount": booking_quoted,
            },
        })
    return {"success": True, "count": len(out), "payments": out}


# ==============================
# ADMIN — payouts list
# ==============================

@router.get("/payments/admin/payouts")
async def admin_list_payouts(
    status_filter: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != "admin":
        raise HTTPException(403, "Admin only")

    q = db.query(ProviderPayout)
    if status_filter:
        q = q.filter(ProviderPayout.status == status_filter)
    rows = q.order_by(ProviderPayout.created_at.desc()).all()

    out = []
    for r in rows:
        provider = db.query(User).filter(User.id == r.provider_id).first()
        out.append({
            "payout_id": r.id,
            "provider_id": r.provider_id,
            "provider_name": provider.name if provider else "Unknown",
            "provider_upi": provider.upi_id if provider else None,
            "booking_id": r.booking_id,
            "amount": float(r.amount),
            "commission": float(r.commission or 0),
            "net_amount": float(r.net_amount),
            "status": r.status,
            "payout_ref": r.payout_ref,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "paid_out_at": r.paid_out_at.isoformat() if r.paid_out_at else None,
        })

    owed = sum(o["net_amount"] for o in out if o["status"] == "owed")
    return {"success": True, "count": len(out),
            "owed_total": round(owed, 2), "payouts": out}


# ==============================
# ADMIN — mark payout paid
# ==============================

@router.post("/payments/admin/payouts/{payout_id}/mark-paid")
async def admin_mark_payout_paid(
    payout_id: int,
    payout_ref: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != "admin":
        raise HTTPException(403, "Admin only")

    row = db.query(ProviderPayout).filter(ProviderPayout.id == payout_id).first()
    if not row:
        raise HTTPException(404, "Payout not found")
    if row.status == "paid_out":
        return {"success": True, "message": "Already marked paid"}

    row.status = "paid_out"
    row.payout_ref = payout_ref
    row.paid_out_at = datetime.now()
    db.commit()

    create_notification(
        user_id=row.provider_id,
        title="💰 Payout Sent!",
        message=f"₹{float(row.net_amount):.0f} has been sent to you. Ref: {payout_ref}",
        db=db, booking_id=row.booking_id,
    )
    db.commit()

    return {"success": True, "message": "Marked as paid"}


# ==============================
# PROVIDER — my payouts
# ==============================

@router.get("/payments/provider/payouts")
async def provider_my_payouts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != "provider":
        raise HTTPException(403, "Provider only")

    rows = db.query(ProviderPayout).filter(
        ProviderPayout.provider_id == current_user.id
    ).order_by(ProviderPayout.created_at.desc()).all()

    owed = sum(float(r.net_amount) for r in rows if r.status == "owed")
    paid = sum(float(r.net_amount) for r in rows if r.status == "paid_out")

    return {
        "success": True,
        "owed_total": round(owed, 2),
        "paid_total": round(paid, 2),
        "payouts": [
            {
                "payout_id": r.id,
                "booking_id": r.booking_id,
                "net_amount": float(r.net_amount),
                "status": r.status,
                "payout_ref": r.payout_ref,
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "paid_out_at": r.paid_out_at.isoformat() if r.paid_out_at else None,
            } for r in rows
        ],
    }


# ==============================
# PROVIDER — save UPI
# ==============================

class UpiUpdate(BaseModel):
    upi_id: str


@router.put("/payments/provider/save-upi")
async def provider_save_upi(
    data: UpiUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != "provider":
        raise HTTPException(403, "Provider only")
    upi = (data.upi_id or "").strip()
    if "@" not in upi:
        raise HTTPException(400, "Invalid UPI ID")

    current_user.upi_id = upi
    current_user.updated_at = datetime.now()
    db.commit()
    return {"success": True, "upi_id": upi}


# ==============================
# GET payment status
# ==============================

@router.get("/payments/booking/{booking_id}")
async def get_payment_status(
    booking_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    payment = db.query(Payment).filter(
        Payment.booking_id == booking_id
    ).order_by(Payment.created_at.desc()).first()

    if not payment:
        return {
            "success": True,
            "has_payment": False,
            "quoted_amount": float(booking.quoted_amount) if booking and booking.quoted_amount else None,
            "message": "No payment found",
        }

    return {
        "success": True,
        "has_payment": payment.status == "completed",
        "quoted_amount": float(booking.quoted_amount) if booking and booking.quoted_amount else None,
        "payment": {
            "id": payment.id,
            "amount": to_rupees_float(payment.amount),
            "currency": payment.currency,
            "status": payment.status,
            "gateway": payment.gateway,
            "screenshot_url": payment.screenshot_url,
            "utr": payment.utr_number or payment.upi_txn_ref,
            "created_at": payment.created_at,
            "completed_at": payment.completed_at,
        },
    }


@router.get("/payments/my-payments")
async def get_my_payments(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rows = db.query(Payment).filter(
        Payment.user_id == current_user.id
    ).order_by(Payment.created_at.desc()).all()

    return {
        "success": True,
        "count": len(rows),
        "payments": [
            {
                "id": p.id,
                "booking_id": p.booking_id,
                "amount": to_rupees_float(p.amount),
                "currency": p.currency,
                "status": p.status,
                "gateway": p.gateway,
                "created_at": p.created_at,
                "completed_at": p.completed_at,
            } for p in rows
        ],
    }


# ==============================
# BILLS — list / get / download
# ==============================

@router.get("/payments/bills/my")
async def list_my_bills(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List bills where the current user is a party (customer or provider)."""
    q = db.query(Bill)
    if current_user.role == "admin":
        pass
    elif current_user.role == "provider":
        q = q.filter(Bill.provider_id == current_user.id)
    else:
        q = q.filter(Bill.customer_id == current_user.id)

    rows = q.order_by(Bill.issued_at.desc()).all()

    return {
        "success": True,
        "count": len(rows),
        "bills": [
            {
                "bill_id": b.id,
                "bill_number": b.bill_number,
                "booking_id": b.booking_id,
                "paid_amount": float(b.paid_amount),
                "service": b.service,
                "issued_at": b.issued_at.isoformat() if b.issued_at else None,
                "email_status": b.email_status,
            }
            for b in rows
        ],
    }


# ✅ NEW: auto-backfill + list all bills for current user
@router.get("/payments/bills/all")
async def list_all_my_bills(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    List ALL bills for the current user, and auto-generate any
    missing bills from paid/completed bookings first.
    """
    # ---------- 1. Auto-backfill missing bills ----------
    backfilled = 0
    try:
        q = db.query(Booking).filter(
            Booking.status.in_(["paid", "completed", "Completed"])
        )
        if current_user.role == "provider":
            q = q.filter(Booking.provider_id == current_user.id)
        elif current_user.role == "customer":
            q = q.filter(Booking.customer_id == current_user.id)
        # admin sees everything

        paid_bookings = q.all()

        for booking in paid_bookings:
            existing = db.query(Bill).filter(Bill.booking_id == booking.id).first()
            if existing:
                continue

            payment = (
                db.query(Payment)
                .filter(Payment.booking_id == booking.id, Payment.status == "completed")
                .order_by(Payment.created_at.desc())
                .first()
            )
            if not payment:
                continue

            customer = db.query(User).filter(User.id == payment.user_id).first()
            provider = (
                db.query(User).filter(User.id == payment.provider_id).first()
                if payment.provider_id else None
            )

            amount = float(payment.amount)
            commission = round(amount * COMMISSION_RATE, 2)
            net = round(amount - commission, 2)

            try:
                new_bill = Bill(
                    bill_number=generate_bill_number(booking.id),
                    version=1,
                    booking_id=booking.id,
                    payment_id=payment.id,
                    customer_id=payment.user_id,
                    provider_id=payment.provider_id,
                    quoted_amount=float(booking.quoted_amount or amount),
                    paid_amount=amount,
                    commission=commission,
                    net_to_provider=net,
                    currency="INR",
                    customer_name=customer.name if customer else "Customer",
                    customer_email=customer.email if customer else "",
                    provider_name=provider.name if provider else None,
                    service=booking.service,
                    booking_date=booking.date,
                    gateway=payment.gateway,
                    utr_number=payment.utr_number or payment.upi_txn_ref,
                    verified_by_admin_id=payment.verified_by,
                    issued_at=payment.completed_at or datetime.now(),
                    email_status="pending",
                )
                db.add(new_bill)
                db.commit()
                backfilled += 1
            except Exception as bf_err:
                db.rollback()
                print(f"⚠️ Backfill failed for booking {booking.id}: {bf_err}")

    except Exception as e:
        print(f"⚠️ Backfill loop error: {e}")
        db.rollback()

    # ---------- 2. Fetch all bills for this user ----------
    bq = db.query(Bill)
    if current_user.role == "provider":
        bq = bq.filter(Bill.provider_id == current_user.id)
    elif current_user.role == "customer":
        bq = bq.filter(Bill.customer_id == current_user.id)
    # admin sees all

    rows = bq.order_by(Bill.issued_at.desc()).all()

    # ✅ Hide commission / net_to_provider from customers
    is_customer = current_user.role not in ("admin", "provider")

    bills_out = []
    for b in rows:
        item = {
            "bill_id": b.id,
            "bill_number": b.bill_number,
            "booking_id": b.booking_id,
            "service": b.service,
            "paid_amount": float(b.paid_amount),
            "provider_name": b.provider_name,
            "customer_name": b.customer_name,
            "booking_date": b.booking_date,
            "gateway": b.gateway,
            "utr_number": b.utr_number,
            "issued_at": b.issued_at.isoformat() if b.issued_at else None,
            "email_status": b.email_status,
        }
        if not is_customer:
            item["commission"] = float(b.commission or 0)
            item["net_to_provider"] = float(b.net_to_provider or 0)
        bills_out.append(item)

    return {
        "success": True,
        "backfilled": backfilled,
        "count": len(bills_out),
        "bills": bills_out,
    }


@router.get("/payments/bills/booking/{booking_id}")
async def get_bill_for_booking(
    booking_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    bill = (
        db.query(Bill)
        .filter(Bill.booking_id == booking_id)
        .order_by(Bill.version.desc(), Bill.issued_at.desc())
        .first()
    )
    if not bill:
        raise HTTPException(404, "Bill not found for this booking")

    is_party = (
        bill.customer_id == current_user.id
        or bill.provider_id == current_user.id
        or current_user.role == "admin"
    )
    if not is_party:
        raise HTTPException(403, "Not allowed")

    # ✅ Hide commission / net_to_provider from the customer view
    is_customer_view = (
        current_user.role == "customer"
        and bill.customer_id == current_user.id
        and bill.provider_id != current_user.id
    )

    payload = {
        "bill_id": bill.id,
        "bill_number": bill.bill_number,
        "booking_id": bill.booking_id,
        "paid_amount": float(bill.paid_amount),
        "quoted_amount": float(bill.quoted_amount),
        "service": bill.service,
        "customer_name": bill.customer_name,
        "provider_name": bill.provider_name,
        "booking_date": bill.booking_date,
        "gateway": bill.gateway,
        "utr_number": bill.utr_number,
        "issued_at": bill.issued_at.isoformat() if bill.issued_at else None,
        "email_status": bill.email_status,
    }
    if not is_customer_view:
        payload["commission"] = float(bill.commission or 0)
        payload["net_to_provider"] = float(bill.net_to_provider or 0)

    return {"success": True, "bill": payload}


@router.get("/payments/bills/{bill_id}/download")
async def download_bill(
    bill_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    bill = db.query(Bill).filter(Bill.id == bill_id).first()
    if not bill:
        raise HTTPException(404, "Bill not found")

    is_party = (
        bill.customer_id == current_user.id
        or bill.provider_id == current_user.id
        or current_user.role == "admin"
    )
    if not is_party:
        raise HTTPException(403, "Not allowed")

    # ✅ Role-aware PDF: provider/admin gets payout statement, customer gets receipt
    if current_user.role == "admin" or bill.provider_id == current_user.id:
        pdf_bytes = generate_provider_bill_pdf(bill)
        filename_prefix = "ApnaMate-Payout"
    else:
        pdf_bytes = generate_customer_bill_pdf(bill)
        filename_prefix = "ApnaMate-Bill"

    filename = f"{filename_prefix}-{bill.bill_number}.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/payments/bills/{bill_id}/resend")
async def admin_resend_bill(
    bill_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Admin: re-send the bill email (e.g. if delivery failed)."""
    if current_user.role != "admin":
        raise HTTPException(403, "Admin only")

    bill = db.query(Bill).filter(Bill.id == bill_id).first()
    if not bill:
        raise HTTPException(404, "Bill not found")

    # ✅ Two different PDFs — customer receipt vs provider statement
    customer_pdf = generate_customer_bill_pdf(bill)
    provider_pdf = generate_provider_bill_pdf(bill)

    customer = db.query(User).filter(User.id == bill.customer_id).first()
    provider = (
        db.query(User).filter(User.id == bill.provider_id).first()
        if bill.provider_id else None
    )

    sent_to = []

    if customer and customer.email:
        html_c = render_template(
            "bill_customer.html",
            subject=f"Payment Confirmed — Booking #{bill.booking_id}",
            bill=bill,
            fallback_text=f"Payment of ₹{bill.paid_amount} confirmed. Bill: {bill.bill_number}",
        )
        r = send_email(
            to_email=customer.email,
            subject=f"✅ ApnaMate Payment Confirmed (Resend) — Bill {bill.bill_number}",
            html_body=html_c,
            text_body=f"Your bill {bill.bill_number} for booking #{bill.booking_id}.",
            attachments=[{
                "data": customer_pdf,
                "maintype": "application",
                "subtype": "pdf",
                "filename": f"ApnaMate-Bill-{bill.bill_number}.pdf",
            }],
            db=db,
            template="bill_customer_resend",
            bill_id=bill.id,
            booking_id=bill.booking_id,
        )
        if r["success"]:
            bill.emailed_to_customer_at = datetime.now()
            sent_to.append("customer")

    if provider and provider.email:
        html_p = render_template(
            "bill_provider.html",
            subject=f"Payment Received — Booking #{bill.booking_id}",
            bill=bill,
            fallback_text=f"Payment received for booking #{bill.booking_id}.",
        )
        r = send_email(
            to_email=provider.email,
            subject=f"💵 ApnaMate Payment Received (Resend) — Booking #{bill.booking_id}",
            html_body=html_p,
            text_body=f"Payment received for booking #{bill.booking_id}.",
            attachments=[{
                "data": provider_pdf,
                "maintype": "application",
                "subtype": "pdf",
                "filename": f"ApnaMate-Receipt-{bill.bill_number}.pdf",
            }],
            db=db,
            template="bill_provider_resend",
            bill_id=bill.id,
            booking_id=bill.booking_id,
        )
        if r["success"]:
            bill.emailed_to_provider_at = datetime.now()
            sent_to.append("provider")

    if sent_to:
        bill.email_status = "sent"
    db.commit()

    return {"success": True, "sent_to": sent_to}