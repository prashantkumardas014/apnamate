from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session

from .database import get_db
from .models import User, Booking, Review, Notification
from .email_service import send_booking_confirmation_email, send_booking_status_update_email, send_account_status_email


router = APIRouter(
    prefix="/bookings",
    tags=["Bookings"]
)


# =========================================================
# NOTIFICATION HELPER
# =========================================================

def create_notification(
    db: Session,
    user_id: int,
    title: str,
    message: str,
    type: str = "info"
):
    notification = Notification(
        user_id=user_id,
        title=title,
        message=message,
        type=type,
        is_read=0
    )

    db.add(notification)


# =========================================================
# GET ALL PROVIDERS
# =========================================================

@router.get("/providers")
def get_providers(
    category: str = None,
    db: Session = Depends(get_db)
):

    query = db.query(User).filter(User.role == "provider")
    
    if category:
        query = query.filter(User.category == category)

    providers = query.all()

    result = []

    for provider in providers:

        reviews = db.query(Review).filter(
            Review.provider_id == provider.id
        ).all()

        if reviews:
            average_rating = round(
                sum(review.rating for review in reviews)
                / len(reviews),
                1
            )
        else:
            average_rating = provider.rating or "New"

        result.append({
            "id": provider.id,
            "name": provider.name,
            "email": provider.email,
            "service": provider.service,
            "location": provider.location,
            "experience": provider.experience,
            "rating": average_rating,
            "price": provider.price,
            "availability": provider.availability or "Available",
            "category": provider.category or "General"
        })

    return result


# =========================================================
# GET PROVIDER PROFILE
# =========================================================

@router.get("/profile/{provider_id}")
def get_provider_profile(
    provider_id: int,
    db: Session = Depends(get_db)
):

    provider = db.query(User).filter(
        User.id == provider_id,
        User.role == "provider"
    ).first()

    if not provider:
        raise HTTPException(
            status_code=404,
            detail="Provider not found"
        )

    return {
        "id": provider.id,
        "name": provider.name,
        "email": provider.email,
        "service": provider.service,
        "location": provider.location,
        "experience": provider.experience,
        "rating": provider.rating,
        "price": provider.price,
        "availability": provider.availability or "Available",
        "category": provider.category or "General"
    }


# =========================================================
# UPDATE PROVIDER PROFILE
# =========================================================

@router.put("/profile/{provider_id}")
def update_provider_profile(
    provider_id: int,
    service: str,
    location: str,
    experience: str,
    price: str,
    category: str = None,
    db: Session = Depends(get_db)
):

    provider = db.query(User).filter(
        User.id == provider_id,
        User.role == "provider"
    ).first()

    if not provider:
        raise HTTPException(
            status_code=404,
            detail="Provider not found"
        )

    provider.service = service
    provider.location = location
    provider.experience = experience
    provider.price = price
    if category:
        provider.category = category

    db.commit()
    db.refresh(provider)

    return {
        "message": "Profile updated successfully",
        "provider": {
            "id": provider.id,
            "name": provider.name,
            "email": provider.email,
            "service": provider.service,
            "location": provider.location,
            "experience": provider.experience,
            "price": provider.price,
            "availability": provider.availability or "Available",
            "category": provider.category or "General"
        }
    }


# =========================================================
# UPDATE PROVIDER AVAILABILITY
# =========================================================

@router.put("/availability/{provider_id}")
def update_provider_availability(
    provider_id: int,
    availability: str,
    db: Session = Depends(get_db)
):

    provider = db.query(User).filter(
        User.id == provider_id,
        User.role == "provider"
    ).first()

    if not provider:
        raise HTTPException(
            status_code=404,
            detail="Provider not found"
        )

    if availability not in [
        "Available",
        "Busy",
        "Offline"
    ]:
        raise HTTPException(
            status_code=400,
            detail=(
                "Availability must be "
                "Available, Busy or Offline"
            )
        )

    provider.availability = availability

    db.commit()
    db.refresh(provider)

    return {
        "message": "Availability updated successfully",
        "provider_id": provider.id,
        "availability": provider.availability
    }


# =========================================================
# GET CUSTOMER PROFILE
# =========================================================

@router.get("/customer-profile/{customer_id}")
def get_customer_profile(
    customer_id: int,
    db: Session = Depends(get_db)
):

    customer = db.query(User).filter(
        User.id == customer_id,
        User.role == "customer"
    ).first()

    if not customer:
        raise HTTPException(
            status_code=404,
            detail="Customer not found"
        )

    return {
        "id": customer.id,
        "name": customer.name,
        "email": customer.email,
        "role": customer.role
    }


# =========================================================
# UPDATE CUSTOMER PROFILE
# =========================================================

@router.put("/customer-profile/{customer_id}")
def update_customer_profile(
    customer_id: int,
    name: str,
    email: str,
    db: Session = Depends(get_db)
):

    customer = db.query(User).filter(
        User.id == customer_id,
        User.role == "customer"
    ).first()

    if not customer:
        raise HTTPException(
            status_code=404,
            detail="Customer not found"
        )

    existing_user = db.query(User).filter(
        User.email == email,
        User.id != customer_id
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email is already registered"
        )

    customer.name = name
    customer.email = email

    db.commit()
    db.refresh(customer)

    return {
        "message": "Customer profile updated successfully",
        "customer": {
            "id": customer.id,
            "name": customer.name,
            "email": customer.email,
            "role": customer.role
        }
    }


# =========================================================
# CREATE BOOKING
# =========================================================

@router.post("/")
def create_booking(
    customer_id: int,
    provider_id: int,
    provider_name: str,
    service: str,
    date: str,
    time: str,
    address: str,
    description: str,
    db: Session = Depends(get_db)
):

    customer = db.query(User).filter(
        User.id == customer_id,
        User.role == "customer"
    ).first()

    if not customer:
        raise HTTPException(
            status_code=404,
            detail="Customer not found"
        )

    provider = db.query(User).filter(
        User.id == provider_id,
        User.role == "provider"
    ).first()

    if not provider:
        raise HTTPException(
            status_code=404,
            detail="Provider not found"
        )

    if provider.availability != "Available":
        raise HTTPException(
            status_code=400,
            detail=(
                f"This provider is currently "
                f"{provider.availability.lower()} "
                f"and cannot accept new bookings"
            )
        )

    booking = Booking(
        customer_id=customer_id,
        provider_id=provider_id,
        provider_name=provider_name,
        service=service,
        date=date,
        time=time,
        address=address,
        description=description,
        status="Pending"
    )

    db.add(booking)

    create_notification(
        db,
        customer_id,
        "Booking Created",
        f"Your {service} booking with {provider.name} has been created.",
        "booking"
    )

    create_notification(
        db,
        provider_id,
        "New Booking Received",
        f"You have received a new {service} booking from {customer.name}.",
        "booking"
    )

    db.commit()
    db.refresh(booking)

    # Send email notification
    send_booking_confirmation_email(
        customer.email,
        customer.name,
        booking
    )

    return {
        "message": "Booking created successfully",
        "booking_id": booking.id,
        "status": booking.status
    }


# =========================================================
# GET CUSTOMER BOOKINGS
# =========================================================

@router.get("/customer/{customer_id}")
def get_customer_bookings(
    customer_id: int,
    db: Session = Depends(get_db)
):

    bookings = db.query(Booking).filter(
        Booking.customer_id == customer_id
    ).order_by(
        Booking.id.desc()
    ).all()

    return bookings


# =========================================================
# GET PROVIDER BOOKINGS
# =========================================================

@router.get("/provider/{provider_id}")
def get_provider_bookings(
    provider_id: int,
    db: Session = Depends(get_db)
):

    bookings = db.query(Booking).filter(
        Booking.provider_id == provider_id
    ).order_by(
        Booking.id.desc()
    ).all()

    return bookings


# =========================================================
# ACCEPT BOOKING
# =========================================================

@router.put("/{booking_id}/accept")
def accept_booking(
    booking_id: int,
    db: Session = Depends(get_db)
):

    booking = db.query(Booking).filter(
        Booking.id == booking_id
    ).first()

    if not booking:
        raise HTTPException(
            status_code=404,
            detail="Booking not found"
        )

    if booking.status != "Pending":
        raise HTTPException(
            status_code=400,
            detail="Only pending bookings can be accepted"
        )

    booking.status = "Accepted"

    create_notification(
        db,
        booking.customer_id,
        "Booking Accepted",
        f"Your {booking.service} booking with {booking.provider_name} has been accepted.",
        "booking"
    )

    db.commit()
    db.refresh(booking)

    # Get customer and send email
    customer = db.query(User).filter(User.id == booking.customer_id).first()
    if customer:
        send_booking_status_update_email(
            customer.email,
            customer.name,
            booking,
            "Accepted"
        )

    return {
        "message": "Booking accepted successfully",
        "booking": booking
    }


# =========================================================
# REJECT BOOKING
# =========================================================

@router.put("/{booking_id}/reject")
def reject_booking(
    booking_id: int,
    db: Session = Depends(get_db)
):

    booking = db.query(Booking).filter(
        Booking.id == booking_id
    ).first()

    if not booking:
        raise HTTPException(
            status_code=404,
            detail="Booking not found"
        )

    if booking.status != "Pending":
        raise HTTPException(
            status_code=400,
            detail="Only pending bookings can be rejected"
        )

    booking.status = "Rejected"

    create_notification(
        db,
        booking.customer_id,
        "Booking Rejected",
        f"Unfortunately, your {booking.service} booking with {booking.provider_name} was rejected.",
        "booking"
    )

    db.commit()
    db.refresh(booking)

    # Get customer and send email
    customer = db.query(User).filter(User.id == booking.customer_id).first()
    if customer:
        send_booking_status_update_email(
            customer.email,
            customer.name,
            booking,
            "Rejected"
        )

    return {
        "message": "Booking rejected successfully",
        "booking": booking
    }


# =========================================================
# COMPLETE BOOKING
# =========================================================

@router.put("/{booking_id}/complete")
def complete_booking(
    booking_id: int,
    db: Session = Depends(get_db)
):

    booking = db.query(Booking).filter(
        Booking.id == booking_id
    ).first()

    if not booking:
        raise HTTPException(
            status_code=404,
            detail="Booking not found"
        )

    if booking.status != "Accepted":
        raise HTTPException(
            status_code=400,
            detail="Only accepted bookings can be completed"
        )

    booking.status = "Completed"

    create_notification(
        db,
        booking.customer_id,
        "Service Completed",
        f"Your {booking.service} service by {booking.provider_name} has been completed.",
        "booking"
    )

    db.commit()
    db.refresh(booking)

    # Get customer and send email
    customer = db.query(User).filter(User.id == booking.customer_id).first()
    if customer:
        send_booking_status_update_email(
            customer.email,
            customer.name,
            booking,
            "Completed"
        )

    return {
        "message": "Booking completed successfully",
        "booking": booking
    }


# =========================================================
# CANCEL BOOKING
# =========================================================

@router.put("/{booking_id}/cancel")
def cancel_booking(
    booking_id: int,
    db: Session = Depends(get_db)
):

    booking = db.query(Booking).filter(
        Booking.id == booking_id
    ).first()

    if not booking:
        raise HTTPException(
            status_code=404,
            detail="Booking not found"
        )

    if booking.status in [
        "Completed",
        "Rejected",
        "Cancelled"
    ]:
        raise HTTPException(
            status_code=400,
            detail="This booking cannot be cancelled"
        )

    booking.status = "Cancelled"

    if booking.provider_id:
        create_notification(
            db,
            booking.provider_id,
            "Booking Cancelled",
            f"The {booking.service} booking from the customer has been cancelled.",
            "booking"
        )

    create_notification(
        db,
        booking.customer_id,
        "Booking Cancelled",
        f"Your {booking.service} booking with {booking.provider_name} has been cancelled.",
        "booking"
    )

    db.commit()
    db.refresh(booking)

    return {
        "message": "Booking cancelled successfully",
        "booking": booking
    }


# =========================================================
# CREATE REVIEW
# =========================================================

@router.post("/reviews")
def create_review(
    booking_id: int,
    customer_id: int,
    provider_id: int,
    rating: int,
    comment: str,
    db: Session = Depends(get_db)
):

    if rating < 1 or rating > 5:
        raise HTTPException(
            status_code=400,
            detail="Rating must be between 1 and 5"
        )

    booking = db.query(Booking).filter(
        Booking.id == booking_id
    ).first()

    if not booking:
        raise HTTPException(
            status_code=404,
            detail="Booking not found"
        )

    if booking.status != "Completed":
        raise HTTPException(
            status_code=400,
            detail="Only completed bookings can be reviewed"
        )

    existing_review = db.query(Review).filter(
        Review.booking_id == booking_id
    ).first()

    if existing_review:
        raise HTTPException(
            status_code=400,
            detail="This booking has already been reviewed"
        )

    review = Review(
        booking_id=booking_id,
        customer_id=customer_id,
        provider_id=provider_id,
        rating=rating,
        comment=comment
    )

    db.add(review)

    create_notification(
        db,
        provider_id,
        "New Review Received",
        f"You received a {rating}-star review.",
        "review"
    )

    db.commit()
    db.refresh(review)

    return {
        "message": "Review submitted successfully",
        "review_id": review.id
    }


# =========================================================
# GET PROVIDER REVIEWS
# =========================================================

@router.get("/reviews/{provider_id}")
def get_provider_reviews(
    provider_id: int,
    db: Session = Depends(get_db)
):

    reviews = db.query(Review).filter(
        Review.provider_id == provider_id
    ).order_by(
        Review.id.desc()
    ).all()

    return reviews


# =========================================================
# GET USER NOTIFICATIONS
# =========================================================

@router.get("/notifications/{user_id}")
def get_notifications(
    user_id: int,
    db: Session = Depends(get_db)
):

    notifications = (
        db.query(Notification)
        .filter(Notification.user_id == user_id)
        .order_by(Notification.id.desc())
        .all()
    )

    return notifications


# =========================================================
# MARK ONE NOTIFICATION AS READ
# =========================================================

@router.put("/notifications/{notification_id}/read")
def mark_notification_read(
    notification_id: int,
    user_id: int,
    db: Session = Depends(get_db)
):

    notification = (
        db.query(Notification)
        .filter(
            Notification.id == notification_id,
            Notification.user_id == user_id
        )
        .first()
    )

    if not notification:
        raise HTTPException(
            status_code=404,
            detail="Notification not found"
        )

    notification.is_read = 1

    db.commit()

    return {
        "message": "Notification marked as read"
    }


# =========================================================
# MARK ALL NOTIFICATIONS AS READ
# =========================================================

@router.put("/notifications/{user_id}/read-all")
def mark_all_notifications_read(
    user_id: int,
    db: Session = Depends(get_db)
):

    notifications = (
        db.query(Notification)
        .filter(
            Notification.user_id == user_id,
            Notification.is_read == 0
        )
        .all()
    )

    for notification in notifications:
        notification.is_read = 1

    db.commit()

    return {
        "message": "All notifications marked as read"
    }


# =========================================================
# ADMIN - GET ALL USERS
# =========================================================

@router.get("/admin/users")
def get_all_users(
    x_user_id: int = Header(...),
    db: Session = Depends(get_db)
):

    admin = db.query(User).filter(
        User.id == x_user_id
    ).first()

    if not admin:
        raise HTTPException(
            status_code=401,
            detail="User not found"
        )

    if admin.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Admin access required"
        )

    users = db.query(User).order_by(
        User.id.desc()
    ).all()

    result = []

    for user in users:

        result.append({
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "service": user.service,
            "location": user.location,
            "experience": user.experience,
            "rating": user.rating,
            "price": user.price,
            "availability": user.availability,
            "is_active": user.is_active,
            "category": user.category or "General"
        })

    return result


# =========================================================
# ADMIN - GET ALL BOOKINGS
# =========================================================

@router.get("/admin/bookings")
def get_all_bookings(
    x_user_id: int = Header(...),
    db: Session = Depends(get_db)
):

    admin = db.query(User).filter(
        User.id == x_user_id
    ).first()

    if not admin:
        raise HTTPException(
            status_code=401,
            detail="User not found"
        )

    if admin.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Admin access required"
        )

    bookings = db.query(Booking).order_by(
        Booking.id.desc()
    ).all()

    result = []

    for booking in bookings:

        customer = db.query(User).filter(
            User.id == booking.customer_id
        ).first()

        result.append({
            "id": booking.id,
            "customer_id": booking.customer_id,
            "customer_name": (
                customer.name
                if customer
                else "Unknown"
            ),
            "provider_id": booking.provider_id,
            "provider_name": booking.provider_name,
            "service": booking.service,
            "date": booking.date,
            "time": booking.time,
            "address": booking.address,
            "description": booking.description,
            "status": booking.status
        })

    return result


# =========================================================
# ADMIN - CANCEL BOOKING
# =========================================================

@router.put("/admin/bookings/{booking_id}/cancel")
def admin_cancel_booking(
    booking_id: int,
    x_user_id: int = Header(...),
    db: Session = Depends(get_db)
):

    admin = db.query(User).filter(
        User.id == x_user_id
    ).first()

    if not admin:
        raise HTTPException(
            status_code=401,
            detail="User not found"
        )

    if admin.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Admin access required"
        )

    booking = db.query(Booking).filter(
        Booking.id == booking_id
    ).first()

    if not booking:
        raise HTTPException(
            status_code=404,
            detail="Booking not found"
        )

    if booking.status in [
        "Completed",
        "Rejected",
        "Cancelled"
    ]:
        raise HTTPException(
            status_code=400,
            detail="This booking cannot be cancelled"
        )

    booking.status = "Cancelled"

    create_notification(
        db,
        booking.customer_id,
        "Booking Cancelled by Admin",
        f"Your {booking.service} booking with {booking.provider_name} was cancelled by the administrator.",
        "booking"
    )

    if booking.provider_id:
        create_notification(
            db,
            booking.provider_id,
            "Booking Cancelled by Admin",
            f"The {booking.service} booking has been cancelled by the administrator.",
            "booking"
        )

    db.commit()
    db.refresh(booking)

    return {
        "message": "Booking cancelled successfully by admin",
        "booking_id": booking.id,
        "status": booking.status
    }


# =========================================================
# ADMIN - ACCEPT BOOKING
# =========================================================

@router.put("/admin/bookings/{booking_id}/accept")
def admin_accept_booking(
    booking_id: int,
    x_user_id: int = Header(...),
    db: Session = Depends(get_db)
):

    admin = db.query(User).filter(
        User.id == x_user_id
    ).first()

    if not admin:
        raise HTTPException(
            status_code=401,
            detail="User not found"
        )

    if admin.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Admin access required"
        )

    booking = db.query(Booking).filter(
        Booking.id == booking_id
    ).first()

    if not booking:
        raise HTTPException(
            status_code=404,
            detail="Booking not found"
        )

    if booking.status != "Pending":
        raise HTTPException(
            status_code=400,
            detail="Only pending bookings can be accepted"
        )

    booking.status = "Accepted"

    create_notification(
        db,
        booking.customer_id,
        "Booking Accepted by Admin",
        f"Your {booking.service} booking with {booking.provider_name} has been accepted by the administrator.",
        "booking"
    )

    if booking.provider_id:
        create_notification(
            db,
            booking.provider_id,
            "Booking Accepted by Admin",
            f"The {booking.service} booking has been accepted by the administrator.",
            "booking"
        )

    db.commit()
    db.refresh(booking)

    # Get customer and send email
    customer = db.query(User).filter(User.id == booking.customer_id).first()
    if customer:
        send_booking_status_update_email(
            customer.email,
            customer.name,
            booking,
            "Accepted"
        )

    return {
        "message": "Booking accepted successfully by admin",
        "booking_id": booking.id,
        "status": booking.status
    }


# =========================================================
# ADMIN - REJECT BOOKING
# =========================================================

@router.put("/admin/bookings/{booking_id}/reject")
def admin_reject_booking(
    booking_id: int,
    x_user_id: int = Header(...),
    db: Session = Depends(get_db)
):

    admin = db.query(User).filter(
        User.id == x_user_id
    ).first()

    if not admin:
        raise HTTPException(
            status_code=401,
            detail="User not found"
        )

    if admin.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Admin access required"
        )

    booking = db.query(Booking).filter(
        Booking.id == booking_id
    ).first()

    if not booking:
        raise HTTPException(
            status_code=404,
            detail="Booking not found"
        )

    if booking.status != "Pending":
        raise HTTPException(
            status_code=400,
            detail="Only pending bookings can be rejected"
        )

    booking.status = "Rejected"

    create_notification(
        db,
        booking.customer_id,
        "Booking Rejected by Admin",
        f"Your {booking.service} booking with {booking.provider_name} was rejected by the administrator.",
        "booking"
    )

    if booking.provider_id:
        create_notification(
            db,
            booking.provider_id,
            "Booking Rejected by Admin",
            f"The {booking.service} booking has been rejected by the administrator.",
            "booking"
        )

    db.commit()
    db.refresh(booking)

    # Get customer and send email
    customer = db.query(User).filter(User.id == booking.customer_id).first()
    if customer:
        send_booking_status_update_email(
            customer.email,
            customer.name,
            booking,
            "Rejected"
        )

    return {
        "message": "Booking rejected successfully by admin",
        "booking_id": booking.id,
        "status": booking.status
    }


# =========================================================
# ADMIN - BLOCK USER
# =========================================================

@router.put("/admin/users/{user_id}/block")
def admin_block_user(
    user_id: int,
    x_user_id: int = Header(...),
    db: Session = Depends(get_db)
):

    admin = db.query(User).filter(
        User.id == x_user_id
    ).first()

    if not admin:
        raise HTTPException(
            status_code=401,
            detail="User not found"
        )

    if admin.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Admin access required"
        )

    user = db.query(User).filter(
        User.id == user_id
    ).first()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    if user.id == admin.id:
        raise HTTPException(
            status_code=400,
            detail="You cannot block your own account"
        )

    if user.is_active == 0:
        raise HTTPException(
            status_code=400,
            detail="User is already blocked"
        )

    user.is_active = 0
    db.commit()
    db.refresh(user)

    create_notification(
        db,
        user.id,
        "Account Blocked",
        f"Your account has been blocked by the administrator.",
        "admin"
    )

    db.commit()

    # Send email notification
    send_account_status_email(
        user.email,
        user.name,
        "blocked"
    )

    return {
        "message": f"User '{user.name}' has been blocked successfully",
        "user_id": user.id,
        "is_active": user.is_active
    }


# =========================================================
# ADMIN - UNBLOCK USER
# =========================================================

@router.put("/admin/users/{user_id}/unblock")
def admin_unblock_user(
    user_id: int,
    x_user_id: int = Header(...),
    db: Session = Depends(get_db)
):

    admin = db.query(User).filter(
        User.id == x_user_id
    ).first()

    if not admin:
        raise HTTPException(
            status_code=401,
            detail="User not found"
        )

    if admin.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Admin access required"
        )

    user = db.query(User).filter(
        User.id == user_id
    ).first()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    if user.is_active == 1:
        raise HTTPException(
            status_code=400,
            detail="User is already active"
        )

    user.is_active = 1
    db.commit()
    db.refresh(user)

    create_notification(
        db,
        user.id,
        "Account Unblocked",
        f"Your account has been unblocked by the administrator.",
        "admin"
    )

    db.commit()

    # Send email notification
    send_account_status_email(
        user.email,
        user.name,
        "unblocked"
    )

    return {
        "message": f"User '{user.name}' has been unblocked successfully",
        "user_id": user.id,
        "is_active": user.is_active
    }


# =========================================================
# ADMIN - GET USER STATUS
# =========================================================

@router.get("/admin/users/{user_id}/status")
def admin_get_user_status(
    user_id: int,
    x_user_id: int = Header(...),
    db: Session = Depends(get_db)
):

    admin = db.query(User).filter(
        User.id == x_user_id
    ).first()

    if not admin:
        raise HTTPException(
            status_code=401,
            detail="User not found"
        )

    if admin.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Admin access required"
        )

    user = db.query(User).filter(
        User.id == user_id
    ).first()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    return {
        "user_id": user.id,
        "name": user.name,
        "is_active": user.is_active,
        "status": "Active" if user.is_active == 1 else "Blocked"
    }


# =========================================================
# ADMIN - DELETE USER
# =========================================================

@router.delete("/admin/users/{user_id}")
def admin_delete_user(
    user_id: int,
    x_user_id: int = Header(...),
    db: Session = Depends(get_db)
):

    admin = db.query(User).filter(
        User.id == x_user_id
    ).first()

    if not admin:
        raise HTTPException(
            status_code=401,
            detail="User not found"
        )

    if admin.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Admin access required"
        )

    user = db.query(User).filter(
        User.id == user_id
    ).first()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    if user.id == admin.id:
        raise HTTPException(
            status_code=400,
            detail="You cannot delete your own account"
        )

    if user.role == "admin":
        raise HTTPException(
            status_code=400,
            detail="Cannot delete another admin account"
        )

    user_name = user.name

    db.query(Booking).filter(
        Booking.customer_id == user_id
    ).delete()

    db.query(Booking).filter(
        Booking.provider_id == user_id
    ).delete()

    db.query(Review).filter(
        Review.customer_id == user_id
    ).delete()

    db.query(Review).filter(
        Review.provider_id == user_id
    ).delete()

    db.query(Notification).filter(
        Notification.user_id == user_id
    ).delete()

    db.delete(user)
    db.commit()

    return {
        "message": f"User '{user_name}' has been deleted successfully",
        "user_id": user_id
    }


# =========================================================
# ADMIN - DELETE BOOKING
# =========================================================

@router.delete("/admin/bookings/{booking_id}")
def admin_delete_booking(
    booking_id: int,
    x_user_id: int = Header(...),
    db: Session = Depends(get_db)
):

    admin = db.query(User).filter(
        User.id == x_user_id
    ).first()

    if not admin:
        raise HTTPException(
            status_code=401,
            detail="User not found"
        )

    if admin.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Admin access required"
        )

    booking = db.query(Booking).filter(
        Booking.id == booking_id
    ).first()

    if not booking:
        raise HTTPException(
            status_code=404,
            detail="Booking not found"
        )

    db.query(Review).filter(
        Review.booking_id == booking_id
    ).delete()

    db.delete(booking)
    db.commit()

    return {
        "message": f"Booking #{booking_id} deleted successfully",
        "booking_id": booking_id
    }