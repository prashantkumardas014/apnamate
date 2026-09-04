from sqlalchemy import Column, Integer, String, ForeignKey
from .database import Base


# ==============================
# USER MODEL
# ==============================

class User(Base):
    __tablename__ = "users"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    name = Column(
        String,
        nullable=False
    )

    email = Column(
        String,
        unique=True,
        index=True,
        nullable=False
    )

    password = Column(
        String,
        nullable=False
    )

    role = Column(
        String,
        default="customer"
    )

    # ==============================
    # PROVIDER INFORMATION
    # ==============================

    service = Column(
        String,
        nullable=True
    )

    location = Column(
        String,
        nullable=True
    )

    experience = Column(
        String,
        nullable=True
    )

    rating = Column(
        String,
        nullable=True
    )

    price = Column(
        String,
        nullable=True
    )

    availability = Column(
        String,
        default="Available"
    )

    category = Column(
        String,
        nullable=True,
        default="General"
    )

    # ==============================
    # USER ACCOUNT STATUS
    # ==============================

    is_active = Column(
        Integer,
        default=1
    )


# ==============================
# BOOKING MODEL
# ==============================

class Booking(Base):
    __tablename__ = "bookings"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    customer_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    provider_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True
    )

    provider_name = Column(
        String,
        nullable=False
    )

    service = Column(
        String,
        nullable=False
    )

    date = Column(
        String,
        nullable=False
    )

    time = Column(
        String,
        nullable=False
    )

    address = Column(
        String,
        nullable=False
    )

    description = Column(
        String,
        nullable=False
    )

    status = Column(
        String,
        default="Pending"
    )


# ==============================
# REVIEW MODEL
# ==============================

class Review(Base):
    __tablename__ = "reviews"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    booking_id = Column(
        Integer,
        ForeignKey("bookings.id"),
        nullable=False,
        unique=True
    )

    customer_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    provider_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    rating = Column(
        Integer,
        nullable=False
    )

    comment = Column(
        String,
        nullable=False
    )


# ==============================
# NOTIFICATION MODEL
# ==============================

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    title = Column(
        String,
        nullable=False
    )

    message = Column(
        String,
        nullable=False
    )

    type = Column(
        String,
        default="info"
    )

    is_read = Column(
        Integer,
        default=0
    )