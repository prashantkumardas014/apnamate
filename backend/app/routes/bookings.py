# backend/app/routes/bookings.py
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, and_, desc, asc
from typing import List, Optional
from datetime import datetime, date, timedelta
from pydantic import BaseModel, Field

from app.database import get_db
from app import models
from app.auth import get_current_admin_user, get_current_user

router = APIRouter()

# =========================================================
# CONSTANTS
# =========================================================

# New canonical statuses (quote flow)
STATUS_PENDING_QUOTE = "pending_quote"
STATUS_QUOTED        = "quoted"
STATUS_ACCEPTED      = "accepted"
STATUS_REJECTED      = "rejected"
STATUS_PAID          = "paid"
STATUS_CANCELLED     = "cancelled"
STATUS_COMPLETED     = "completed"

# Legacy statuses still present in old rows
LEGACY_PENDING   = "Pending"
LEGACY_CONFIRMED = "Confirmed"
LEGACY_ACCEPTED  = "Accepted"
LEGACY_COMPLETED = "Completed"
LEGACY_REJECTED  = "Rejected"
LEGACY_CANCELLED = "Cancelled"

# =========================================================
# PYDANTIC SCHEMAS
# =========================================================

class BookingCreate(BaseModel):
    customer_id: int
    provider_id: int
    provider_name: str
    service: str
    date: str
    time: str
    address: str
    description: str

class BookingUpdate(BaseModel):
    date: Optional[str] = None
    time: Optional[str] = None
    address: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None

class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    service: Optional[str] = None
    location: Optional[str] = None
    experience: Optional[str] = None
    price: Optional[str] = None
    category: Optional[str] = None
    # ✅ NEW: provider UPI (used for payouts) + price range
    upi_id: Optional[str] = None
    min_price: Optional[float] = None
    max_price: Optional[float] = None

class DateAvailabilityResponse(BaseModel):
    date: str
    day: str
    available_slots: int
    is_available: bool
    is_past: bool

class BookingStatsResponse(BaseModel):
    total: int
    pending: int
    confirmed: int
    completed: int
    cancelled: int
    upcoming: int

# =========================================================
# HELPERS
# =========================================================

def validate_booking_date(date_str: str) -> date:
    try:
        booking_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        today = date.today()
        if booking_date < today:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot book past dates. Today is {today.strftime('%Y-%m-%d')}"
            )
        max_date = today + timedelta(days=60)
        if booking_date > max_date:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot book more than 60 days in advance. Max date: {max_date.strftime('%Y-%m-%d')}"
            )
        return booking_date
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid date format. Please use YYYY-MM-DD"
        )

def get_day_name(date_obj: date) -> str:
    days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    return days[date_obj.weekday()]

def create_notification(user_id: int, title: str, message: str, type: str = "booking", db: Session = None):
    if not db:
        return None
    notification = models.Notification(
        user_id=user_id,
        title=title,
        message=message,
        type=type,
        created_at=datetime.now()
    )
    db.add(notification)
    return notification

def get_provider_rating_stats(provider_id: int, db: Session):
    reviews = db.query(models.Review).filter(
        models.Review.provider_id == provider_id
    ).all()
    total_reviews = len(reviews)
    if total_reviews == 0:
        return {
            "average_rating": 0,
            "total_reviews": 0,
            "rating_distribution": {1: 0, 2: 0, 3: 0, 4: 0, 5: 0},
            "recent_reviews": []
        }
    total_rating = sum(r.rating for r in reviews)
    average_rating = round(total_rating / total_reviews, 1)
    distribution = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
    for review in reviews:
        distribution[review.rating] = distribution.get(review.rating, 0) + 1
    recent_reviews = []
    sorted_reviews = sorted(reviews, key=lambda x: x.created_at, reverse=True)[:5]
    for review in sorted_reviews:
        customer = db.query(models.User).filter(models.User.id == review.customer_id).first()
        recent_reviews.append({
            "id": review.id,
            "rating": review.rating,
            "comment": review.comment,
            "customer_name": customer.name if customer else "Unknown",
            "created_at": review.created_at.isoformat() if review.created_at else None
        })
    return {
        "average_rating": average_rating,
        "total_reviews": total_reviews,
        "rating_distribution": distribution,
        "recent_reviews": recent_reviews
    }

def get_booking_status_counts(provider_id: int, db: Session) -> dict:
    statuses = [
        STATUS_PENDING_QUOTE, STATUS_QUOTED, STATUS_ACCEPTED,
        STATUS_REJECTED, STATUS_PAID, STATUS_CANCELLED,
        LEGACY_PENDING, LEGACY_CONFIRMED, LEGACY_ACCEPTED,
        LEGACY_COMPLETED, LEGACY_REJECTED, LEGACY_CANCELLED,
    ]
    counts = {}
    for status_name in statuses:
        count = db.query(models.Booking).filter(
            models.Booking.provider_id == provider_id,
            models.Booking.status == status_name
        ).count()
        counts[status_name] = count
    return counts

def get_booking_stats(user_id: int, db: Session, role: str = "customer") -> dict:
    if role == "customer":
        base = db.query(models.Booking).filter(models.Booking.customer_id == user_id)
    else:
        base = db.query(models.Booking).filter(models.Booking.provider_id == user_id)

    total = base.count()
    pending = base.filter(models.Booking.status.in_([STATUS_PENDING_QUOTE, LEGACY_PENDING])).count()
    quoted = base.filter(models.Booking.status == STATUS_QUOTED).count()
    accepted = base.filter(models.Booking.status.in_([STATUS_ACCEPTED, LEGACY_ACCEPTED])).count()
    confirmed = base.filter(models.Booking.status == LEGACY_CONFIRMED).count()
    paid = base.filter(models.Booking.status == STATUS_PAID).count()
    completed = base.filter(models.Booking.status.in_([STATUS_COMPLETED, LEGACY_COMPLETED])).count()
    cancelled = base.filter(models.Booking.status.in_([STATUS_CANCELLED, LEGACY_CANCELLED])).count()
    rejected = base.filter(models.Booking.status.in_([STATUS_REJECTED, LEGACY_REJECTED])).count()

    today = date.today().isoformat()
    upcoming = base.filter(
        models.Booking.date >= today,
        models.Booking.status.in_([STATUS_PENDING_QUOTE, STATUS_QUOTED, STATUS_ACCEPTED,
                                   LEGACY_PENDING, LEGACY_CONFIRMED, LEGACY_ACCEPTED])
    ).count()

    return {
        "total": total,
        "pending": pending,
        "quoted": quoted,
        "accepted": accepted,
        "confirmed": confirmed,
        "paid": paid,
        "completed": completed,
        "cancelled": cancelled,
        "rejected": rejected,
        "upcoming": upcoming,
    }

# =========================================================
# SERIALIZE
# =========================================================

def serialize_booking(booking: models.Booking, db: Session, include_customer: bool = False) -> dict:
    """Serialize a Booking with all quote-flow fields."""
    booking_date = datetime.strptime(booking.date, '%Y-%m-%d').date()
    status_value = booking.status

    if booking_date < date.today() and status_value not in (STATUS_CANCELLED, LEGACY_CANCELLED, STATUS_PAID):
        if status_value in (STATUS_ACCEPTED, LEGACY_ACCEPTED, LEGACY_CONFIRMED):
            status_value = LEGACY_COMPLETED

    review = db.query(models.Review).filter(models.Review.booking_id == booking.id).first()
    has_review = review is not None
    review_data = None
    if review:
        review_data = {
            "rating": review.rating,
            "comment": review.comment,
            "created_at": review.created_at.isoformat() if review.created_at else None,
        }

    data = {
        "id": booking.id,
        "customer_id": booking.customer_id,
        "provider_id": booking.provider_id,
        "provider_name": booking.provider_name,
        "service": booking.service,
        "date": booking.date,
        "time": booking.time,
        "address": booking.address,
        "description": booking.description,
        "status": status_value,
        # Quote flow
        "quoted_amount": float(booking.quoted_amount) if booking.quoted_amount is not None else None,
        "quote_note": booking.quote_note,
        "quoted_at": booking.quoted_at.isoformat() if booking.quoted_at else None,
        "quote_accepted_at": booking.quote_accepted_at.isoformat() if booking.quote_accepted_at else None,
        "quote_rejected_at": booking.quote_rejected_at.isoformat() if booking.quote_rejected_at else None,
        "rejection_reason": booking.rejection_reason,
        "paid_at": booking.paid_at.isoformat() if booking.paid_at else None,
        # Review
        "has_review": has_review,
        "review": review_data,
        # Timestamps
        "created_at": booking.created_at.isoformat() if booking.created_at else None,
        "updated_at": booking.updated_at.isoformat() if booking.updated_at else None,
    }

    # ✅ Always include customer name when requested (was the same before)
    if include_customer:
        customer = db.query(models.User).filter(models.User.id == booking.customer_id).first()
        data["customer_name"] = customer.name if customer else "Unknown"
        data["customer_email"] = customer.email if customer else None

    return data

# =========================================================
# PROVIDERS
# =========================================================

@router.get("/providers")
async def get_providers_for_booking(
    db: Session = Depends(get_db),
    service: Optional[str] = None,
    location: Optional[str] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
    min_rating: Optional[float] = None,
    sort_by: Optional[str] = "rating",
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0)
):
    try:
        query = db.query(models.User).filter(
            models.User.role == "provider",
            models.User.is_active == 1
        )

        if service:
            query = query.filter(models.User.service.ilike(f"%{service}%"))
        if location:
            query = query.filter(models.User.location.ilike(f"%{location}%"))
        if category:
            query = query.filter(models.User.category.ilike(f"%{category}%"))
        if search:
            query = query.filter(
                or_(
                    models.User.name.ilike(f"%{search}%"),
                    models.User.service.ilike(f"%{search}%"),
                    models.User.location.ilike(f"%{search}%"),
                    models.User.category.ilike(f"%{search}%")
                )
            )

        total_count = query.count()
        providers = query.limit(limit).offset(offset).all()

        providers_list = []
        for p in providers:
            rating_stats = get_provider_rating_stats(p.id, db)
            avg_rating = rating_stats["average_rating"]
            total_reviews = rating_stats["total_reviews"]

            if min_rating and avg_rating < min_rating:
                continue

            total_bookings = db.query(models.Booking).filter(
                models.Booking.provider_id == p.id,
                models.Booking.status.notin_([STATUS_CANCELLED, LEGACY_CANCELLED])
            ).count()

            providers_list.append({
                "id": p.id,
                "name": p.name,
                "service": p.service,
                "location": p.location,
                "experience": p.experience,
                "rating": avg_rating,
                "total_reviews": total_reviews,
                "price": p.price,
                "min_price": float(p.min_price) if p.min_price is not None else 0,
                "max_price": float(p.max_price) if p.max_price is not None else 0,
                "category": p.category,
                "availability": p.availability or "Available",
                "total_bookings": total_bookings,
                "is_active": p.is_active
            })

        if sort_by == "rating":
            providers_list.sort(key=lambda x: x["rating"], reverse=True)
        elif sort_by == "bookings":
            providers_list.sort(key=lambda x: x["total_bookings"], reverse=True)
        elif sort_by == "price":
            providers_list.sort(
                key=lambda x: float((x["price"] or "0").replace('₹', '').replace('/hr', '').strip() or 0)
            )

        return {
            "success": True,
            "total": total_count,
            "count": len(providers_list),
            "providers": providers_list
        }

    except Exception as e:
        print(f"Error fetching providers: {str(e)}")
        raise HTTPException(500, f"Error fetching providers: {str(e)}")

# =========================================================
# BOOKING ENDPOINTS
# =========================================================

@router.post("/")
async def create_booking(
    booking: BookingCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        booking_date = validate_booking_date(booking.date)

        if current_user.role not in {"customer", "admin"}:
            raise HTTPException(403, "Only customers and admins can create bookings")

        if current_user.role != "admin" and current_user.id != booking.customer_id:
            raise HTTPException(403, "You can only create bookings for your own account")

        customer = db.query(models.User).filter(models.User.id == booking.customer_id).first()
        if not customer:
            raise HTTPException(404, "Customer not found")

        provider = db.query(models.User).filter(models.User.id == booking.provider_id).first()
        if not provider:
            raise HTTPException(404, "Provider not found")
        if provider.role != "provider":
            raise HTTPException(400, "Selected user is not a provider")

        provider_availability = provider.availability or "Available"
        if provider_availability != "Available":
            raise HTTPException(
                400,
                f"Provider is currently {provider_availability.lower()}. Please choose another provider."
            )

        MAX_BOOKINGS_PER_DAY = 10
        existing_count = db.query(models.Booking).filter(
            models.Booking.provider_id == booking.provider_id,
            models.Booking.date == booking.date,
            models.Booking.status.notin_([STATUS_CANCELLED, LEGACY_CANCELLED])
        ).count()
        if existing_count >= MAX_BOOKINGS_PER_DAY:
            raise HTTPException(400, f"Provider fully booked for {booking.date}.")

        slot_exists = db.query(models.Booking).filter(
            models.Booking.provider_id == booking.provider_id,
            models.Booking.date == booking.date,
            models.Booking.time == booking.time,
            models.Booking.status.notin_([STATUS_CANCELLED, LEGACY_CANCELLED])
        ).first()
        if slot_exists:
            raise HTTPException(400, f"Time slot {booking.time} is already booked on {booking.date}")

        new_booking = models.Booking(
            customer_id=booking.customer_id,
            provider_id=booking.provider_id,
            provider_name=booking.provider_name,
            service=booking.service,
            date=booking.date,
            time=booking.time,
            address=booking.address,
            description=booking.description,
            status=STATUS_PENDING_QUOTE,
            created_at=datetime.now()
        )
        db.add(new_booking)
        db.commit()
        db.refresh(new_booking)

        db.add(models.Notification(
            user_id=booking.customer_id,
            title="📋 Booking Request Sent",
            message=(
                f"Your {booking.service} request with {booking.provider_name} has been sent. "
                f"Booking ID: #{new_booking.id}. The provider will review and send a quote shortly."
            ),
            type="booking",
            created_at=datetime.now()
        ))
        db.add(models.Notification(
            user_id=booking.provider_id,
            title="📋 New Booking Request",
            message=(
                f"New request from {customer.name} for {booking.service} on {booking.date} at {booking.time}. "
                f"Booking ID: #{new_booking.id}. Please review the description and send a quote."
            ),
            type="booking",
            created_at=datetime.now()
        ))
        db.commit()

        return {
            "success": True,
            "message": "Booking request sent! Waiting for the provider to send a quote. ✅",
            "booking_id": new_booking.id,
            "booking_date": booking.date,
            "time_slot": booking.time,
            "status": STATUS_PENDING_QUOTE
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"❌ Error creating booking: {str(e)}")
        raise HTTPException(500, f"Error creating booking: {str(e)}")

@router.get("/available-dates/{provider_id}")
async def get_available_dates(
    provider_id: int,
    days_ahead: int = 60,
    db: Session = Depends(get_db)
):
    try:
        provider = db.query(models.User).filter(models.User.id == provider_id).first()
        if not provider:
            raise HTTPException(404, "Provider not found")

        today = date.today()
        max_date = today + timedelta(days=days_ahead)

        bookings = db.query(models.Booking).filter(
            models.Booking.provider_id == provider_id,
            models.Booking.date >= today.isoformat(),
            models.Booking.date <= max_date.isoformat(),
            models.Booking.status.notin_([STATUS_CANCELLED, LEGACY_CANCELLED])
        ).all()

        booking_counts = {}
        for booking in bookings:
            booking_counts[booking.date] = booking_counts.get(booking.date, 0) + 1

        MAX_BOOKINGS_PER_DAY = 10
        available_dates = []
        current_date = today
        for _ in range(days_ahead + 1):
            date_str = current_date.isoformat()
            booked_count = booking_counts.get(date_str, 0)
            available_dates.append({
                "date": date_str,
                "day": get_day_name(current_date),
                "available_slots": MAX_BOOKINGS_PER_DAY - booked_count,
                "is_available": booked_count < MAX_BOOKINGS_PER_DAY,
                "is_past": False
            })
            current_date += timedelta(days=1)

        return {
            "success": True,
            "provider_id": provider_id,
            "provider_name": provider.name,
            "available_dates": available_dates,
            "max_days_ahead": days_ahead
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Error fetching dates: {str(e)}")

@router.get("/time-slots/{provider_id}/{booking_date}")
async def get_available_time_slots(
    provider_id: int,
    booking_date: str,
    db: Session = Depends(get_db)
):
    try:
        validate_booking_date(booking_date)
        provider = db.query(models.User).filter(models.User.id == provider_id).first()
        if not provider:
            raise HTTPException(404, "Provider not found")

        all_time_slots = [
            "09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM",
            "11:00 AM", "11:30 AM", "12:00 PM", "12:30 PM",
            "01:00 PM", "01:30 PM", "02:00 PM", "02:30 PM",
            "03:00 PM", "03:30 PM", "04:00 PM", "04:30 PM",
            "05:00 PM", "05:30 PM", "06:00 PM", "06:30 PM",
            "07:00 PM", "07:30 PM", "08:00 PM", "08:30 PM",
            "09:00 PM", "09:30 PM", "10:00 PM"
        ]

        booked_slots = db.query(models.Booking.time).filter(
            models.Booking.provider_id == provider_id,
            models.Booking.date == booking_date,
            models.Booking.status.notin_([STATUS_CANCELLED, LEGACY_CANCELLED])
        ).all()
        booked_slots_list = [slot[0] for slot in booked_slots]
        available_slots = [slot for slot in all_time_slots if slot not in booked_slots_list]

        return {
            "success": True,
            "provider_id": provider_id,
            "provider_name": provider.name,
            "booking_date": booking_date,
            "available_slots": available_slots,
            "booked_slots": booked_slots_list,
            "total_slots": len(all_time_slots)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Error fetching time slots: {str(e)}")

@router.get("/check-availability/{provider_id}/{booking_date}")
async def check_date_availability(
    provider_id: int,
    booking_date: str,
    db: Session = Depends(get_db)
):
    try:
        date_obj = validate_booking_date(booking_date)
        provider = db.query(models.User).filter(models.User.id == provider_id).first()
        if not provider:
            raise HTTPException(404, "Provider not found")

        bookings = db.query(models.Booking).filter(
            models.Booking.provider_id == provider_id,
            models.Booking.date == booking_date,
            models.Booking.status.notin_([STATUS_CANCELLED, LEGACY_CANCELLED])
        ).all()

        MAX_BOOKINGS_PER_DAY = 10
        booked_count = len(bookings)

        return {
            "success": True,
            "provider_id": provider_id,
            "provider_name": provider.name,
            "booking_date": booking_date,
            "is_available": booked_count < MAX_BOOKINGS_PER_DAY,
            "booked_count": booked_count,
            "available_slots": MAX_BOOKINGS_PER_DAY - booked_count,
            "max_slots": MAX_BOOKINGS_PER_DAY,
            "day": get_day_name(date_obj)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Error checking availability: {str(e)}")

@router.put("/{booking_id}")
async def update_booking(
    booking_id: int,
    booking_update: BookingUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        booking = db.query(models.Booking).filter(models.Booking.id == booking_id).first()
        if not booking:
            raise HTTPException(404, "Booking not found")

        is_admin = current_user.role == "admin"
        is_customer = current_user.id == booking.customer_id
        is_provider = current_user.id == booking.provider_id

        if not (is_admin or is_customer or is_provider):
            raise HTTPException(403, "Not authorized to update this booking")

        if booking_update.status is not None:
            new_status = booking_update.status
            allowed_for_provider = {
                STATUS_QUOTED, STATUS_ACCEPTED, STATUS_REJECTED,
                STATUS_CANCELLED, STATUS_PAID
            }
            if is_admin:
                pass
            elif is_provider and new_status in allowed_for_provider:
                pass
            elif is_customer and new_status == STATUS_CANCELLED:
                pass
            else:
                raise HTTPException(403, "Not authorized to set this status")

        booking_date = datetime.strptime(booking.date, '%Y-%m-%d').date()
        if booking_date < date.today() and not is_admin:
            raise HTTPException(400, "Cannot update past bookings")

        if booking_update.date is not None:
            validate_booking_date(booking_update.date)
            booking.date = booking_update.date

        if booking_update.time is not None:
            slot_exists = db.query(models.Booking).filter(
                models.Booking.provider_id == booking.provider_id,
                models.Booking.date == booking.date,
                models.Booking.time == booking_update.time,
                models.Booking.id != booking_id,
                models.Booking.status.notin_([STATUS_CANCELLED, LEGACY_CANCELLED])
            ).first()
            if slot_exists:
                raise HTTPException(400, f"Time slot {booking_update.time} is already booked")
            booking.time = booking_update.time

        if booking_update.address is not None:
            booking.address = booking_update.address
        if booking_update.description is not None:
            booking.description = booking_update.description
        if booking_update.status is not None:
            booking.status = booking_update.status

        booking.updated_at = datetime.now()
        db.commit()
        db.refresh(booking)

        return {
            "success": True,
            "message": "Booking updated successfully ✅",
            "booking_id": booking.id,
            "status": booking.status
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(500, f"Error updating booking: {str(e)}")

@router.delete("/{booking_id}")
async def cancel_booking(
    booking_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        booking = db.query(models.Booking).filter(models.Booking.id == booking_id).first()
        if not booking:
            raise HTTPException(404, "Booking not found")

        if current_user.role not in {"customer", "admin", "provider"}:
            raise HTTPException(403, "Not authorized to cancel bookings")

        if current_user.role == "customer" and current_user.id != booking.customer_id:
            raise HTTPException(403, "Not authorized to cancel this booking")
        if current_user.role == "provider" and current_user.id != booking.provider_id:
            raise HTTPException(403, "Not authorized to cancel this booking")

        booking_date = datetime.strptime(booking.date, '%Y-%m-%d').date()
        if booking_date < date.today():
            raise HTTPException(400, "Cannot cancel past bookings")

        if booking.status in (STATUS_CANCELLED, LEGACY_CANCELLED):
            raise HTTPException(400, "Booking is already cancelled")

        booking.status = STATUS_CANCELLED
        booking.updated_at = datetime.now()
        db.commit()

        db.add(models.Notification(
            user_id=booking.customer_id,
            title="🚫 Booking Cancelled",
            message=(
                f"Your booking with {booking.provider_name} for {booking.service} "
                f"on {booking.date} has been cancelled."
            ),
            type="booking",
            created_at=datetime.now()
        ))
        db.commit()

        return {
            "success": True,
            "message": "Booking cancelled successfully ✅",
            "booking_id": booking.id,
            "status": STATUS_CANCELLED
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(500, f"Error cancelling booking: {str(e)}")

@router.get("/my-bookings/{customer_id}")
async def get_user_bookings(
    customer_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
    status_filter: Optional[str] = None,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0)
):
    try:
        if current_user.id != customer_id and current_user.role != "admin":
            raise HTTPException(403, "Not authorized to view these bookings")

        customer = db.query(models.User).filter(models.User.id == customer_id).first()
        if not customer:
            raise HTTPException(404, "Customer not found")

        query = db.query(models.Booking).filter(models.Booking.customer_id == customer_id)

        if status_filter and status_filter != "All":
            query = query.filter(models.Booking.status == status_filter)

        total_count = query.count()
        bookings = query.order_by(desc(models.Booking.date)).limit(limit).offset(offset).all()

        booking_rows = [serialize_booking(b, db) for b in bookings]
        stats = get_booking_stats(customer_id, db, "customer")

        return {
            "success": True,
            "customer_id": customer_id,
            "customer_name": customer.name,
            "total": total_count,
            "count": len(booking_rows),
            "bookings": booking_rows,
            "stats": stats
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Error fetching bookings: {str(e)}")

@router.get("/provider/{provider_id}")
async def get_provider_bookings(
    provider_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
    status_filter: Optional[str] = None,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0)
):
    try:
        if current_user.id != provider_id and current_user.role != "admin":
            raise HTTPException(403, "Not authorized to view these bookings")

        provider = db.query(models.User).filter(models.User.id == provider_id).first()
        if not provider:
            raise HTTPException(404, "Provider not found")

        query = db.query(models.Booking).filter(models.Booking.provider_id == provider_id)

        if status_filter and status_filter != "All":
            query = query.filter(models.Booking.status == status_filter)

        total_count = query.count()
        bookings = query.order_by(desc(models.Booking.date)).limit(limit).offset(offset).all()

        booking_rows = [serialize_booking(b, db, include_customer=True) for b in bookings]
        stats = get_booking_stats(provider_id, db, "provider")

        return {
            "success": True,
            "provider_id": provider_id,
            "provider_name": provider.name,
            "total": total_count,
            "count": len(booking_rows),
            "bookings": booking_rows,
            "stats": stats
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Error fetching bookings: {str(e)}")

@router.get("/upcoming/{customer_id}")
async def get_upcoming_bookings(
    customer_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = Query(10, ge=1, le=50)
):
    try:
        if current_user.id != customer_id and current_user.role != "admin":
            raise HTTPException(403, "Not authorized to view these bookings")

        today = date.today().isoformat()
        bookings = db.query(models.Booking).filter(
            models.Booking.customer_id == customer_id,
            models.Booking.date >= today,
            models.Booking.status.notin_([STATUS_CANCELLED, LEGACY_CANCELLED])
        ).order_by(models.Booking.date.asc()).limit(limit).all()

        return {
            "success": True,
            "customer_id": customer_id,
            "count": len(bookings),
            "upcoming_bookings": [serialize_booking(b, db) for b in bookings]
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Error fetching upcoming bookings: {str(e)}")

@router.get("/history/{customer_id}")
async def get_booking_history(
    customer_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0)
):
    try:
        if current_user.id != customer_id and current_user.role != "admin":
            raise HTTPException(403, "Not authorized to view these bookings")

        today = date.today().isoformat()
        query = db.query(models.Booking).filter(
            models.Booking.customer_id == customer_id,
            models.Booking.date < today,
            models.Booking.status.notin_([STATUS_CANCELLED, LEGACY_CANCELLED])
        )
        total_count = query.count()
        bookings = query.order_by(desc(models.Booking.date)).limit(limit).offset(offset).all()

        return {
            "success": True,
            "customer_id": customer_id,
            "total": total_count,
            "count": len(bookings),
            "booking_history": [serialize_booking(b, db) for b in bookings]
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Error fetching booking history: {str(e)}")

@router.patch("/{booking_id}/confirm")
async def confirm_booking(
    booking_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        booking = db.query(models.Booking).filter(models.Booking.id == booking_id).first()
        if not booking:
            raise HTTPException(404, "Booking not found")

        if current_user.role not in {"provider", "admin"}:
            raise HTTPException(403, "Only providers and admins can confirm bookings")
        if current_user.role == "provider" and current_user.id != booking.provider_id:
            raise HTTPException(403, "Only the assigned provider or an admin can confirm this booking")

        booking_date = datetime.strptime(booking.date, '%Y-%m-%d').date()
        if booking_date < date.today():
            raise HTTPException(400, "Cannot confirm past bookings")

        if booking.status in (STATUS_CANCELLED, LEGACY_CANCELLED):
            raise HTTPException(400, "Cannot confirm cancelled booking")
        if booking.status == LEGACY_CONFIRMED:
            return {"success": True, "message": "Booking is already confirmed", "booking_id": booking.id}

        if booking.status == STATUS_PENDING_QUOTE and not booking.quoted_amount:
            raise HTTPException(400, "Send a quote first.")

        booking.status = STATUS_ACCEPTED
        booking.updated_at = datetime.now()
        db.commit()

        db.add(models.Notification(
            user_id=booking.customer_id,
            title="✅ Provider Accepted",
            message=(
                f"{booking.provider_name} accepted your {booking.service} booking "
                f"on {booking.date} at {booking.time}. Booking ID: #{booking.id}."
            ),
            type="booking",
            created_at=datetime.now()
        ))
        db.commit()

        return {
            "success": True,
            "message": "Booking accepted ✅",
            "booking_id": booking.id,
            "status": booking.status
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(500, f"Error confirming booking: {str(e)}")

@router.patch("/{booking_id}/reject")
async def reject_booking(
    booking_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        booking = db.query(models.Booking).filter(models.Booking.id == booking_id).first()
        if not booking:
            raise HTTPException(404, "Booking not found")

        if current_user.role not in {"provider", "admin"}:
            raise HTTPException(403, "Only providers and admins can reject bookings")
        if current_user.role == "provider" and current_user.id != booking.provider_id:
            raise HTTPException(403, "Only the assigned provider or an admin can reject this booking")

        booking_date = datetime.strptime(booking.date, '%Y-%m-%d').date()
        if booking_date < date.today():
            raise HTTPException(400, "Cannot reject past bookings")
        if booking.status in (STATUS_CANCELLED, LEGACY_CANCELLED):
            raise HTTPException(400, "Booking is already cancelled")
        if booking.status == STATUS_REJECTED:
            return {"success": True, "message": "Booking is already rejected", "booking_id": booking.id}

        booking.status = STATUS_REJECTED
        booking.updated_at = datetime.now()
        db.commit()

        db.add(models.Notification(
            user_id=booking.customer_id,
            title="❌ Booking Rejected",
            message=(
                f"Your {booking.service} booking with {booking.provider_name} "
                f"on {booking.date} was rejected. Please try another provider. Booking ID: #{booking.id}"
            ),
            type="booking",
            created_at=datetime.now()
        ))
        db.commit()

        return {
            "success": True,
            "message": "Booking rejected ❌",
            "booking_id": booking.id,
            "status": STATUS_REJECTED
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(500, f"Error rejecting booking: {str(e)}")

@router.patch("/{booking_id}/complete")
async def complete_booking(
    booking_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        booking = db.query(models.Booking).filter(models.Booking.id == booking_id).first()
        if not booking:
            raise HTTPException(404, "Booking not found")

        if current_user.role not in {"provider", "admin"}:
            raise HTTPException(403, "Only providers and admins can complete bookings")
        if current_user.role == "provider" and current_user.id != booking.provider_id:
            raise HTTPException(403, "Only the assigned provider or an admin can complete this booking")

        if booking.status not in (STATUS_ACCEPTED, LEGACY_CONFIRMED, STATUS_PAID, LEGACY_ACCEPTED):
            raise HTTPException(400, "Only an accepted or confirmed booking can be completed")

        booking.status = STATUS_COMPLETED
        booking.updated_at = datetime.now()
        db.commit()

        db.add(models.Notification(
            user_id=booking.customer_id,
            title="✅ Service Completed",
            message=(
                f"{booking.provider_name} marked your {booking.service} booking as completed. "
                f"You can now rate the provider."
            ),
            type="booking",
            created_at=datetime.now()
        ))
        db.commit()

        return {
            "success": True,
            "message": "Booking marked as completed",
            "booking_id": booking.id,
            "status": booking.status
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(500, f"Error completing booking: {str(e)}")

@router.get("/stats/provider/{provider_id}")
async def get_provider_stats(
    provider_id: int,
    db: Session = Depends(get_db)
):
    try:
        provider = db.query(models.User).filter(models.User.id == provider_id).first()
        if not provider:
            raise HTTPException(404, "Provider not found")

        today = date.today()

        total = db.query(models.Booking).filter(
            models.Booking.provider_id == provider_id
        ).count()

        pending = db.query(models.Booking).filter(
            models.Booking.provider_id == provider_id,
            models.Booking.status.in_([STATUS_PENDING_QUOTE, LEGACY_PENDING])
        ).count()
        quoted = db.query(models.Booking).filter(
            models.Booking.provider_id == provider_id,
            models.Booking.status == STATUS_QUOTED
        ).count()
        confirmed = db.query(models.Booking).filter(
            models.Booking.provider_id == provider_id,
            models.Booking.status == LEGACY_CONFIRMED
        ).count()
        accepted = db.query(models.Booking).filter(
            models.Booking.provider_id == provider_id,
            models.Booking.status.in_([STATUS_ACCEPTED, LEGACY_ACCEPTED])
        ).count()
        paid = db.query(models.Booking).filter(
            models.Booking.provider_id == provider_id,
            models.Booking.status == STATUS_PAID
        ).count()
        completed = db.query(models.Booking).filter(
            models.Booking.provider_id == provider_id,
            models.Booking.status.in_([STATUS_COMPLETED, LEGACY_COMPLETED])
        ).count()
        cancelled = db.query(models.Booking).filter(
            models.Booking.provider_id == provider_id,
            models.Booking.status.in_([STATUS_CANCELLED, LEGACY_CANCELLED])
        ).count()
        rejected = db.query(models.Booking).filter(
            models.Booking.provider_id == provider_id,
            models.Booking.status.in_([STATUS_REJECTED, LEGACY_REJECTED])
        ).count()
        upcoming = db.query(models.Booking).filter(
            models.Booking.provider_id == provider_id,
            models.Booking.date >= today.isoformat(),
            models.Booking.status.notin_([STATUS_CANCELLED, LEGACY_CANCELLED])
        ).count()

        return {
            "success": True,
            "provider_id": provider_id,
            "provider_name": provider.name,
            "stats": {
                "total": total,
                "pending": pending,
                "quoted": quoted,
                "confirmed": confirmed,
                "accepted": accepted,
                "paid": paid,
                "completed": completed,
                "cancelled": cancelled,
                "rejected": rejected,
                "upcoming": upcoming
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Error fetching stats: {str(e)}")

# =========================================================
# PROFILE ENDPOINTS
# =========================================================

@router.get("/profile/{user_id}")
async def get_user_profile(
    user_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        is_owner = current_user.id == user_id if current_user else False
        is_admin = current_user.role == "admin" if current_user else False

        user = db.query(models.User).filter(models.User.id == user_id).first()
        if not user:
            raise HTTPException(404, "User not found")

        stats = get_booking_stats(user_id, db, "customer")

        provider_stats = None
        if user.role == "provider":
            provider_bookings = db.query(models.Booking).filter(
                models.Booking.provider_id == user_id
            ).count()
            rating_stats = get_provider_rating_stats(user_id, db)
            provider_stats = {
                "total_bookings": provider_bookings,
                "rating": rating_stats["average_rating"],
                "total_reviews": rating_stats["total_reviews"],
                "rating_distribution": rating_stats["rating_distribution"],
                "recent_reviews": rating_stats["recent_reviews"],
                "status_counts": get_booking_status_counts(user_id, db)
            }

        show_full = is_owner or is_admin

        return {
            "success": True,
            "user": {
                "id": user.id,
                "name": user.name,
                "email": user.email if show_full else None,
                "role": user.role,
                "service": user.service,
                "location": user.location,
                "experience": user.experience,
                "rating": user.rating,
                "price": user.price,
                "min_price": float(user.min_price) if user.min_price is not None else 0,
                "max_price": float(user.max_price) if user.max_price is not None else 0,
                # ✅ NEW: return UPI so provider dashboard can pre-fill
                "upi_id": user.upi_id,
                "category": user.category,
                "availability": user.availability or "Available",
                "is_active": user.is_active if show_full else None,
                "created_at": user.created_at.isoformat() if user.created_at else None,
                "stats": stats if show_full else None,
                "provider_stats": provider_stats
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Error fetching profile: {str(e)}")

@router.put("/profile/{user_id}")
async def update_user_profile(
    user_id: int,
    profile_update: ProfileUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.id != user_id and current_user.role != "admin":
        raise HTTPException(403, "Not authorized to update this profile")

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")

    if profile_update.email is not None:
        email_owner = db.query(models.User).filter(
            models.User.email == profile_update.email,
            models.User.id != user_id
        ).first()
        if email_owner:
            raise HTTPException(400, "Email is already registered")

    # ✅ Now includes upi_id + price range
    update_fields = [
        "name", "email", "service", "location", "experience",
        "price", "category", "upi_id", "min_price", "max_price"
    ]
    for field in update_fields:
        value = getattr(profile_update, field)
        if value is not None:
            setattr(user, field, value)

    user.updated_at = datetime.now()
    db.commit()
    db.refresh(user)

    return {
        "success": True,
        "message": "Profile updated successfully",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "service": user.service,
            "location": user.location,
            "experience": user.experience,
            "price": user.price,
            "min_price": float(user.min_price) if user.min_price is not None else 0,
            "max_price": float(user.max_price) if user.max_price is not None else 0,
            "upi_id": user.upi_id,
            "category": user.category,
            "availability": user.availability or "Available",
            "is_active": user.is_active,
        }
    }

@router.put("/availability/{user_id}")
async def update_provider_availability(
    user_id: int,
    availability: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.id != user_id and current_user.role != "admin":
        raise HTTPException(403, "Not authorized to update this availability")

    if availability not in {"Available", "Busy", "Offline"}:
        raise HTTPException(400, "Availability must be Available, Busy, or Offline")

    provider = db.query(models.User).filter(
        models.User.id == user_id,
        models.User.role == "provider"
    ).first()
    if not provider:
        raise HTTPException(404, "Provider not found")

    provider.availability = availability
    provider.updated_at = datetime.now()
    db.commit()

    return {
        "success": True,
        "message": "Availability updated successfully",
        "availability": provider.availability
    }

# =========================================================
# ADMIN ENDPOINTS
# =========================================================

@router.get("/admin/bookings", dependencies=[Depends(get_current_admin_user)])
async def get_all_bookings(
    db: Session = Depends(get_db),
    status_filter: Optional[str] = None,
    limit: int = 100,
    offset: int = 0
):
    try:
        query = db.query(models.Booking)
        if status_filter:
            query = query.filter(models.Booking.status == status_filter)

        total = query.count()
        bookings = query.order_by(desc(models.Booking.date)).limit(limit).offset(offset).all()

        bookings_list = []
        for booking in bookings:
            customer = db.query(models.User).filter(models.User.id == booking.customer_id).first()
            provider = db.query(models.User).filter(models.User.id == booking.provider_id).first()
            data = serialize_booking(booking, db, include_customer=True)
            data["customer_email"] = customer.email if customer else "Unknown"
            data["provider_email"] = provider.email if provider else "Unknown"
            bookings_list.append(data)

        return {
            "success": True,
            "total": total,
            "count": len(bookings_list),
            "bookings": bookings_list
        }
    except Exception as e:
        raise HTTPException(500, f"Error fetching bookings: {str(e)}")

@router.get("/admin/users", dependencies=[Depends(get_current_admin_user)])
async def get_all_users_admin(
    db: Session = Depends(get_db),
    role: Optional[str] = None,
    limit: int = 100,
    offset: int = 0
):
    try:
        query = db.query(models.User)
        if role:
            query = query.filter(models.User.role == role)

        total = query.count()
        users = query.order_by(models.User.id).limit(limit).offset(offset).all()

        users_list = []
        for user in users:
            booking_count = db.query(models.Booking).filter(
                models.Booking.customer_id == user.id
            ).count()
            users_list.append({
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "role": user.role,
                "service": user.service,
                "location": user.location,
                "experience": user.experience,
                "rating": user.rating,
                "price": user.price,
                "min_price": float(user.min_price) if user.min_price is not None else 0,
                "max_price": float(user.max_price) if user.max_price is not None else 0,
                "upi_id": user.upi_id,
                "category": user.category,
                "is_active": user.is_active,
                "booking_count": booking_count,
                "created_at": user.created_at.isoformat() if user.created_at else None
            })

        return {
            "success": True,
            "total": total,
            "count": len(users_list),
            "users": users_list
        }
    except Exception as e:
        raise HTTPException(500, f"Error fetching users: {str(e)}")

@router.get("/admin/bookings/{booking_id}", dependencies=[Depends(get_current_admin_user)])
async def get_booking_details_admin(
    booking_id: int,
    db: Session = Depends(get_db)
):
    try:
        booking = db.query(models.Booking).filter(models.Booking.id == booking_id).first()
        if not booking:
            raise HTTPException(404, "Booking not found")

        customer = db.query(models.User).filter(models.User.id == booking.customer_id).first()
        provider = db.query(models.User).filter(models.User.id == booking.provider_id).first()

        data = serialize_booking(booking, db, include_customer=True)
        data["customer_email"] = customer.email if customer else "Unknown"
        data["provider_email"] = provider.email if provider else "Unknown"

        return {"success": True, "booking": data}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Error fetching booking: {str(e)}")

@router.put("/admin/bookings/{booking_id}", dependencies=[Depends(get_current_admin_user)])
async def update_booking_admin(
    booking_id: int,
    booking_update: dict,
    db: Session = Depends(get_db)
):
    try:
        booking = db.query(models.Booking).filter(models.Booking.id == booking_id).first()
        if not booking:
            raise HTTPException(404, "Booking not found")

        allowed_fields = ["status", "date", "time", "address", "description",
                          "quoted_amount", "quote_note"]
        for field in allowed_fields:
            if field in booking_update:
                setattr(booking, field, booking_update[field])

        booking.updated_at = datetime.now()
        db.commit()
        db.refresh(booking)

        return {
            "success": True,
            "message": "Booking updated successfully",
            "booking": {
                "id": booking.id,
                "status": booking.status,
                "quoted_amount": float(booking.quoted_amount) if booking.quoted_amount is not None else None,
                "updated_at": booking.updated_at.isoformat() if booking.updated_at else None
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(500, f"Error updating booking: {str(e)}")

@router.delete("/admin/bookings/{booking_id}", dependencies=[Depends(get_current_admin_user)])
async def delete_booking_admin(
    booking_id: int,
    db: Session = Depends(get_db)
):
    try:
        booking = db.query(models.Booking).filter(models.Booking.id == booking_id).first()
        if not booking:
            raise HTTPException(404, "Booking not found")
        db.delete(booking)
        db.commit()
        return {"success": True, "message": f"Booking {booking_id} deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(500, f"Error deleting booking: {str(e)}")

@router.put("/admin/users/{user_id}", dependencies=[Depends(get_current_admin_user)])
async def update_user_admin(
    user_id: int,
    user_update: dict,
    db: Session = Depends(get_db)
):
    try:
        user = db.query(models.User).filter(models.User.id == user_id).first()
        if not user:
            raise HTTPException(404, "User not found")

        allowed_fields = ["name", "email", "role", "is_active", "service", "location",
                          "experience", "price", "category", "min_price", "max_price", "upi_id"]
        for field in allowed_fields:
            if field in user_update:
                setattr(user, field, user_update[field])

        user.updated_at = datetime.now()
        db.commit()
        db.refresh(user)

        return {
            "success": True,
            "message": "User updated successfully",
            "user": {
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "role": user.role,
                "is_active": user.is_active,
                "min_price": float(user.min_price) if user.min_price is not None else 0,
                "max_price": float(user.max_price) if user.max_price is not None else 0,
                "upi_id": user.upi_id,
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(500, f"Error updating user: {str(e)}")

@router.put("/admin/users/{user_id}/block", dependencies=[Depends(get_current_admin_user)])
async def block_user(user_id: int, db: Session = Depends(get_db)):
    try:
        user = db.query(models.User).filter(models.User.id == user_id).first()
        if not user:
            raise HTTPException(404, "User not found")
        user.is_active = 0
        user.updated_at = datetime.now()
        db.commit()
        return {"success": True, "message": f"User {user.name} has been blocked"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(500, f"Error blocking user: {str(e)}")

@router.put("/admin/users/{user_id}/unblock", dependencies=[Depends(get_current_admin_user)])
async def unblock_user(user_id: int, db: Session = Depends(get_db)):
    try:
        user = db.query(models.User).filter(models.User.id == user_id).first()
        if not user:
            raise HTTPException(404, "User not found")
        user.is_active = 1
        user.updated_at = datetime.now()
        db.commit()
        return {"success": True, "message": f"User {user.name} has been unblocked"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(500, f"Error unblocking user: {str(e)}")

@router.delete("/admin/users/{user_id}", dependencies=[Depends(get_current_admin_user)])
async def delete_user_admin(user_id: int, db: Session = Depends(get_db)):
    try:
        user = db.query(models.User).filter(models.User.id == user_id).first()
        if not user:
            raise HTTPException(404, "User not found")
        db.delete(user)
        db.commit()
        return {"success": True, "message": f"User {user.name} has been deleted"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(500, f"Error deleting user: {str(e)}")

# =========================================================
# NOTIFICATION ENDPOINTS
# =========================================================

@router.get("/notifications/{user_id}")
async def get_user_notifications(
    user_id: int,
    limit: int = 50,
    offset: int = 0,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        if current_user.id != user_id and current_user.role != "admin":
            raise HTTPException(403, "Not authorized to view these notifications")

        user = db.query(models.User).filter(models.User.id == user_id).first()
        if not user:
            raise HTTPException(404, "User not found")

        total = db.query(models.Notification).filter(
            models.Notification.user_id == user_id
        ).count()
        notifications = db.query(models.Notification).filter(
            models.Notification.user_id == user_id
        ).order_by(desc(models.Notification.created_at)).limit(limit).offset(offset).all()
        unread_count = db.query(models.Notification).filter(
            models.Notification.user_id == user_id,
            models.Notification.is_read == 0
        ).count()

        return {
            "success": True,
            "total": total,
            "unread_count": unread_count,
            "count": len(notifications),
            "notifications": [
                {
                    "id": n.id,
                    "title": n.title,
                    "message": n.message,
                    "type": n.type,
                    "is_read": n.is_read,
                    "booking_id": getattr(n, "booking_id", None),
                    "created_at": n.created_at.isoformat() if n.created_at else None
                }
                for n in notifications
            ]
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Error fetching notifications: {str(e)}")

@router.put("/notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        notification = db.query(models.Notification).filter(
            models.Notification.id == notification_id
        ).first()
        if not notification:
            raise HTTPException(404, "Notification not found")

        if notification.user_id != current_user.id and current_user.role != "admin":
            raise HTTPException(403, "Not authorized to update this notification")

        notification.is_read = 1
        notification.updated_at = datetime.now()
        db.commit()

        return {"success": True, "message": "Notification marked as read"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(500, f"Error marking notification: {str(e)}")

@router.put("/notifications/read-all/{user_id}")
async def mark_all_notifications_read(
    user_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        if current_user.id != user_id and current_user.role != "admin":
            raise HTTPException(403, "Not authorized to update these notifications")

        user = db.query(models.User).filter(models.User.id == user_id).first()
        if not user:
            raise HTTPException(404, "User not found")

        db.query(models.Notification).filter(
            models.Notification.user_id == user_id,
            models.Notification.is_read == 0
        ).update({"is_read": 1, "updated_at": datetime.now()})
        db.commit()

        return {"success": True, "message": "All notifications marked as read"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(500, f"Error marking notifications: {str(e)}")

@router.delete("/notifications/{notification_id}")
async def delete_notification(
    notification_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        notification = db.query(models.Notification).filter(
            models.Notification.id == notification_id
        ).first()
        if not notification:
            raise HTTPException(404, "Notification not found")
        if notification.user_id != current_user.id and current_user.role != "admin":
            raise HTTPException(403, "Not authorized to delete this notification")

        db.delete(notification)
        db.commit()
        return {"success": True, "message": "Notification deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(500, f"Error deleting notification: {str(e)}")

@router.delete("/notifications/clear-all/{user_id}")
async def clear_all_notifications(
    user_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        if current_user.id != user_id and current_user.role != "admin":
            raise HTTPException(403, "Not authorized to delete these notifications")

        user = db.query(models.User).filter(models.User.id == user_id).first()
        if not user:
            raise HTTPException(404, "User not found")

        db.query(models.Notification).filter(models.Notification.user_id == user_id).delete()
        db.commit()
        return {"success": True, "message": "All notifications cleared"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(500, f"Error clearing notifications: {str(e)}")

# =========================================================
# DEBUG
# =========================================================

@router.get("/debug/providers", dependencies=[Depends(get_current_admin_user)])
async def debug_providers(db: Session = Depends(get_db)):
    try:
        providers = db.query(models.User).filter(models.User.role == "provider").all()
        return {
            "count": len(providers),
            "providers": [
                {
                    "id": p.id,
                    "name": p.name,
                    "email": p.email,
                    "role": p.role,
                    "is_active": p.is_active,
                    "service": p.service,
                    "location": p.location,
                    "min_price": float(p.min_price) if p.min_price is not None else 0,
                    "max_price": float(p.max_price) if p.max_price is not None else 0,
                    "upi_id": p.upi_id,
                }
                for p in providers
            ]
        }
    except Exception as e:
        return {"error": str(e)}