# backend/app/routes/quotes.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from pydantic import BaseModel
from typing import Optional

from app.database import get_db
from app.models import User, Booking, Notification
from app.auth import get_current_user

router = APIRouter()

# ==============================
# SCHEMAS
# ==============================

class QuoteCreate(BaseModel):
    quoted_amount: float
    quote_note: Optional[str] = None

class PriceRangeUpdate(BaseModel):
    min_price: float
    max_price: float

# ==============================
# PROVIDER: SET PRICE RANGE
# URL: PUT /bookings/provider/price-range
# ==============================

@router.put("/provider/price-range")
async def update_price_range(
    data: PriceRangeUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != "provider":
        raise HTTPException(403, "Only providers can set price range")

    if data.min_price < 0 or data.max_price < 0:
        raise HTTPException(400, "Price must be positive")

    if data.min_price > data.max_price:
        raise HTTPException(400, "Min price cannot be greater than max price")

    current_user.min_price = data.min_price
    current_user.max_price = data.max_price
    current_user.updated_at = datetime.now()
    db.commit()

    return {
        "success": True,
        "message": f"Price range updated: ₹{data.min_price:.0f} – ₹{data.max_price:.0f}",
        "min_price": float(current_user.min_price),
        "max_price": float(current_user.max_price),
    }

# ==============================
# PROVIDER: SEND QUOTE
# URL: POST /bookings/{booking_id}/quote
# ==============================

@router.post("/{booking_id}/quote")
async def send_quote(
    booking_id: int,
    quote_data: QuoteCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != "provider":
        raise HTTPException(403, "Only providers can send quotes")

    booking = db.query(Booking).filter(
        Booking.id == booking_id,
        Booking.provider_id == current_user.id,
    ).first()

    if not booking:
        raise HTTPException(404, "Booking not found")

    # Allow quoting only when the booking is waiting for a quote,
    # OR when it was rejected and the provider wants to re-quote.
    if booking.status not in ("pending_quote", "rejected"):
        raise HTTPException(
            400,
            f"Cannot quote a booking with status '{booking.status}'",
        )

    if quote_data.quoted_amount <= 0:
        raise HTTPException(400, "Quote amount must be positive")

    # Soft range check — warn but don't block
    outside_range = False
    if current_user.min_price and float(quote_data.quoted_amount) < float(current_user.min_price):
        outside_range = True
    if current_user.max_price and float(quote_data.quoted_amount) > float(current_user.max_price):
        outside_range = True

    booking.quoted_amount = quote_data.quoted_amount
    booking.quote_note = quote_data.quote_note
    booking.quoted_at = datetime.now()
    booking.status = "quoted"
    booking.updated_at = datetime.now()
    db.commit()

    db.add(Notification(
        user_id=booking.customer_id,
        title="💰 New Quote Received!",
        message=(
            f"{current_user.name} quoted ₹{float(quote_data.quoted_amount):.0f} "
            f"for your {booking.service} booking."
        ),
        type="quote",
        booking_id=booking.id,
        created_at=datetime.now(),
    ))
    db.commit()

    return {
        "success": True,
        "message": f"Quote of ₹{float(quote_data.quoted_amount):.0f} sent to customer",
        "booking_id": booking.id,
        "quoted_amount": float(booking.quoted_amount),
        "quote_note": booking.quote_note,
        "outside_range": outside_range,
    }

# ==============================
# CUSTOMER: ACCEPT QUOTE
# URL: POST /bookings/{booking_id}/quote/accept
# ==============================

@router.post("/{booking_id}/quote/accept")
async def accept_quote(
    booking_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    booking = db.query(Booking).filter(
        Booking.id == booking_id,
        Booking.customer_id == current_user.id,
    ).first()

    if not booking:
        raise HTTPException(404, "Booking not found")

    if not booking.quoted_amount:
        raise HTTPException(400, "No quote available")

    if booking.status != "quoted":
        raise HTTPException(
            400,
            f"Cannot accept quote — booking status is '{booking.status}'",
        )

    booking.status = "accepted"
    booking.quote_accepted_at = datetime.now()
    booking.updated_at = datetime.now()
    db.commit()

    db.add(Notification(
        user_id=booking.provider_id,
        title="✅ Quote Accepted",
        message=(
            f"{current_user.name} accepted your quote of "
            f"₹{float(booking.quoted_amount):.0f}."
        ),
        type="quote",
        booking_id=booking.id,
        created_at=datetime.now(),
    ))
    db.commit()

    return {
        "success": True,
        "message": "Quote accepted. Proceed to payment.",
        "booking_id": booking.id,
        "quoted_amount": float(booking.quoted_amount),
    }

# ==============================
# CUSTOMER: REJECT QUOTE
# URL: POST /bookings/{booking_id}/quote/reject
# ==============================

@router.post("/{booking_id}/quote/reject")
async def reject_quote(
    booking_id: int,
    reason: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    booking = db.query(Booking).filter(
        Booking.id == booking_id,
        Booking.customer_id == current_user.id,
    ).first()

    if not booking:
        raise HTTPException(404, "Booking not found")

    if booking.status != "quoted":
        raise HTTPException(
            400,
            f"No active quote to reject (status: '{booking.status}')",
        )

    booking.status = "rejected"
    booking.quote_rejected_at = datetime.now()
    booking.rejection_reason = reason
    booking.updated_at = datetime.now()
    db.commit()

    db.add(Notification(
        user_id=booking.provider_id,
        title="❌ Quote Rejected",
        message=(
            f"{current_user.name} rejected your quote of "
            f"₹{float(booking.quoted_amount or 0):.0f}."
            + (f" Reason: {reason}" if reason else "")
        ),
        type="quote",
        booking_id=booking.id,
        created_at=datetime.now(),
    ))
    db.commit()

    return {"success": True, "message": "Quote rejected."}

# ==============================
# GET QUOTE
# URL: GET /bookings/{booking_id}/quote
# ==============================

@router.get("/{booking_id}/quote")
async def get_booking_quote(
    booking_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(404, "Booking not found")

    is_owner = current_user.id in (booking.customer_id, booking.provider_id)
    if not (is_owner or current_user.role == "admin"):
        raise HTTPException(403, "Not allowed")

    return {
        "success": True,
        "booking_id": booking.id,
        "status": booking.status,
        "quoted_amount": float(booking.quoted_amount) if booking.quoted_amount else None,
        "quote_note": booking.quote_note,
        "quoted_at": booking.quoted_at.isoformat() if booking.quoted_at else None,
    }