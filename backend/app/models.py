# backend/app/models.py
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text, Float, Boolean, UniqueConstraint, Numeric
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

# ==============================
# USER MODEL
# ==============================

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password = Column(String, nullable=False)
    role = Column(String, default="customer")
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, nullable=True)

    # Provider Information
    service = Column(String, nullable=True)
    location = Column(String, nullable=True)
    experience = Column(String, nullable=True)
    rating = Column(String, nullable=True)
    price = Column(String, nullable=True)         # legacy/display string
    availability = Column(String, default="Available")
    category = Column(String, nullable=True, default="General")

    # ✅ Provider price range (shown on profile; final quote is per-job)
    min_price = Column(Numeric(10, 2), nullable=True, default=0)
    max_price = Column(Numeric(10, 2), nullable=True, default=0)

    # ✅ Provider's UPI ID (used by admin to send payouts)
    upi_id = Column(String, nullable=True)

    # ✅ Phone OTP + Google OAuth
    phone = Column(String, nullable=True, unique=True, index=True)
    phone_verified = Column(Integer, default=0)
    google_id = Column(String, nullable=True, unique=True, index=True)
    profile_picture = Column(String, nullable=True)

    # ✅ NEW: Avatar + Aadhaar verification
    avatar_url = Column(String, nullable=True)
    aadhaar_verified = Column(Integer, default=0)
    aadhaar_last4 = Column(String(4), nullable=True)

    # User Account Status
    is_active = Column(Integer, default=1)

    # Relationships
    bookings_as_customer = relationship(
        "Booking",
        foreign_keys="Booking.customer_id",
        back_populates="customer",
        cascade="all, delete-orphan",
    )
    bookings_as_provider = relationship(
        "Booking",
        foreign_keys="Booking.provider_id",
        back_populates="provider",
        cascade="all, delete-orphan",
    )
    reviews_given = relationship(
        "Review",
        foreign_keys="Review.customer_id",
        back_populates="customer",
        cascade="all, delete-orphan",
    )
    reviews_received = relationship(
        "Review",
        foreign_keys="Review.provider_id",
        back_populates="provider",
        cascade="all, delete-orphan",
    )
    notifications = relationship(
        "Notification",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    provider_availability = relationship(
        "ProviderAvailability",
        back_populates="provider",
        cascade="all, delete-orphan",
    )
    payments = relationship(
        "Payment",
        foreign_keys="Payment.user_id",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    received_payments = relationship(
        "Payment",
        foreign_keys="Payment.provider_id",
        back_populates="provider",
        cascade="all, delete-orphan",
    )
    # ✅ Payouts owed / paid to this provider
    payouts = relationship(
        "ProviderPayout",
        foreign_keys="ProviderPayout.provider_id",
        back_populates="provider",
        cascade="all, delete-orphan",
    )
    # ✅ Admin user who verified payments
    verified_payments = relationship(
        "Payment",
        foreign_keys="Payment.verified_by",
        back_populates="verifier",
    )
    # ✅ Bills where user is the customer
    bills_as_customer = relationship(
        "Bill",
        foreign_keys="Bill.customer_id",
        back_populates="customer",
    )
    # ✅ Bills where user is the provider
    bills_as_provider = relationship(
        "Bill",
        foreign_keys="Bill.provider_id",
        back_populates="provider",
    )

    def __repr__(self):
        return f"<User(id={self.id}, name={self.name}, role={self.role})>"


# ==============================
# OTP CODE MODEL
# ==============================
# Stores short-lived one-time passcodes for phone login.

class OtpCode(Base):
    __tablename__ = "otp_codes"

    id = Column(Integer, primary_key=True, index=True)
    phone = Column(String, nullable=False, index=True)
    code = Column(String(6), nullable=False)
    purpose = Column(String(20), default="login")
    attempts = Column(Integer, default=0)
    used = Column(Integer, default=0)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.now)

    def __repr__(self):
        return f"<OtpCode(id={self.id}, phone={self.phone}, used={self.used})>"


# ==============================
# BOOKING MODEL  (QUOTE FLOW)
# ==============================

class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    provider_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    provider_name = Column(String, nullable=False)
    service = Column(String, nullable=False)
    date = Column(String, nullable=False)  # YYYY-MM-DD
    time = Column(String, nullable=False)
    address = Column(String, nullable=False)
    description = Column(String, nullable=False)

    # Flow: pending_quote → quoted → accepted → payment_pending → paid → completed
    #                        → rejected
    #                        → cancelled
    status = Column(String, default="pending_quote")

    # Quote fields
    quoted_amount = Column(Numeric(10, 2), nullable=True)
    quote_note = Column(Text, nullable=True)
    quoted_at = Column(DateTime, nullable=True)
    quote_accepted_at = Column(DateTime, nullable=True)
    quote_rejected_at = Column(DateTime, nullable=True)
    rejection_reason = Column(Text, nullable=True)

    # Payment
    paid_at = Column(DateTime, nullable=True)
    paid_amount = Column(Integer, nullable=True)   # ✅ what customer actually paid

    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, nullable=True)

    # Relationships
    customer = relationship(
        "User",
        foreign_keys=[customer_id],
        back_populates="bookings_as_customer",
    )
    provider = relationship(
        "User",
        foreign_keys=[provider_id],
        back_populates="bookings_as_provider",
    )
    review = relationship(
        "Review",
        back_populates="booking",
        uselist=False,
        cascade="all, delete-orphan",
    )
    payment = relationship(
        "Payment",
        back_populates="booking",
        uselist=False,
        cascade="all, delete-orphan",
    )

    def __repr__(self):
        return f"<Booking(id={self.id}, service={self.service}, status={self.status}, quoted={self.quoted_amount})>"


# ==============================
# REVIEW MODEL
# ==============================

class Review(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=False, unique=True)
    customer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    provider_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    rating = Column(Integer, nullable=False)
    comment = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, nullable=True)

    booking = relationship("Booking", back_populates="review")
    customer = relationship("User", foreign_keys=[customer_id], back_populates="reviews_given")
    provider = relationship("User", foreign_keys=[provider_id], back_populates="reviews_received")

    def __repr__(self):
        return f"<Review(id={self.id}, rating={self.rating}, booking_id={self.booking_id})>"


# ==============================
# NOTIFICATION MODEL
# ==============================

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    message = Column(String, nullable=False)
    type = Column(String, default="info")
    is_read = Column(Integer, default=0)

    # Link to booking for deep-linking
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=True)

    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="notifications")

    def __repr__(self):
        return f"<Notification(id={self.id}, title={self.title}, is_read={self.is_read})>"


# ==============================
# SERVICE MODEL
# ==============================

class Service(Base):
    __tablename__ = "services"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    category = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    icon = Column(String, nullable=True)
    is_active = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, nullable=True)

    def __repr__(self):
        return f"<Service(id={self.id}, name={self.name}, category={self.category})>"


# ==============================
# PROVIDER AVAILABILITY MODEL
# ==============================

class ProviderAvailability(Base):
    __tablename__ = "provider_availability"

    id = Column(Integer, primary_key=True, index=True)
    provider_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    day_of_week = Column(Integer, nullable=False)  # 0=Mon … 6=Sun
    start_time = Column(String, nullable=False)
    end_time = Column(String, nullable=False)
    is_available = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, nullable=True)

    provider = relationship("User", back_populates="provider_availability")

    __table_args__ = (
        UniqueConstraint("provider_id", "day_of_week", name="unique_provider_day"),
    )

    def __repr__(self):
        return f"<ProviderAvailability(provider_id={self.provider_id}, day={self.day_of_week}, start={self.start_time}, end={self.end_time})>"


# ==============================
# ADMIN LOG MODEL
# ==============================

class AdminLog(Base):
    __tablename__ = "admin_logs"

    id = Column(Integer, primary_key=True, index=True)
    admin_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    action = Column(String, nullable=False)
    target_type = Column(String, nullable=False)
    target_id = Column(Integer, nullable=False)
    details = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.now)

    admin = relationship("User", foreign_keys=[admin_id])

    def __repr__(self):
        return f"<AdminLog(id={self.id}, admin_id={self.admin_id}, action={self.action})>"


# ==============================
# PAYMENT MODEL  (RUPEES, ESCROW FLOW)
# ==============================

class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    provider_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Amount in RUPEES (integer). e.g. 650 = ₹650
    amount = Column(Integer, nullable=False)
    currency = Column(String, default="INR")
    payment_method = Column(String, nullable=True)  # card, upi, cash, razorpay

    # Gateway details
    gateway = Column(String, nullable=False)        # razorpay, manual_upi, cash
    gateway_order_id = Column(String, nullable=True)
    gateway_payment_id = Column(String, nullable=True)
    gateway_signature = Column(String, nullable=True)

    # UPI-specific
    upi_id = Column(String, nullable=True)          # payee UPI id (owner)
    upi_txn_ref = Column(String, nullable=True)     # UPI ref
    utr_number = Column(String, nullable=True)      # customer-submitted UTR
    screenshot_url = Column(String, nullable=True)  # customer proof

    # Status: pending | awaiting_verification | completed | failed | refunded | rejected
    status = Column(String, default="pending")

    # Admin verification fields
    verified_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    verified_at = Column(DateTime, nullable=True)
    rejection_reason = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)

    # Relationships
    booking = relationship("Booking", back_populates="payment")
    user = relationship("User", foreign_keys=[user_id], back_populates="payments")
    provider = relationship("User", foreign_keys=[provider_id], back_populates="received_payments")
    verifier = relationship(
        "User",
        foreign_keys=[verified_by],
        back_populates="verified_payments",
    )
    # ✅ NEW: Bill generated for this payment (one-to-one)
    bill = relationship(
        "Bill",
        back_populates="payment",
        uselist=False,
        foreign_keys="Bill.payment_id",
    )

    def __repr__(self):
        return f"<Payment(id={self.id}, booking_id={self.booking_id}, amount={self.amount}, status={self.status}, gateway={self.gateway})>"


# ==============================
# PROVIDER PAYOUT MODEL
# ==============================
# Tracks what the platform owes each provider after customer pays.
# Owner collects to their own UPI, then transfers to the provider's UPI.

class ProviderPayout(Base):
    __tablename__ = "provider_payouts"

    id = Column(Integer, primary_key=True, index=True)
    provider_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=True)
    payment_id = Column(Integer, ForeignKey("payments.id"), nullable=True)

    amount = Column(Numeric(10, 2), nullable=False)        # gross customer paid
    commission = Column(Numeric(10, 2), default=0)         # platform cut
    net_amount = Column(Numeric(10, 2), nullable=False)    # amount - commission

    # Status: owed | paid_out | failed
    status = Column(String, default="owed")
    payout_ref = Column(String, nullable=True)             # owner's UPI txn when paid out
    notes = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.now)
    paid_out_at = Column(DateTime, nullable=True)

    provider = relationship("User", foreign_keys=[provider_id], back_populates="payouts")
    booking = relationship("Booking", foreign_keys=[booking_id])
    payment = relationship("Payment", foreign_keys=[payment_id])

    def __repr__(self):
        return f"<ProviderPayout(id={self.id}, provider={self.provider_id}, net={self.net_amount}, status={self.status})>"


# ==============================
# MESSAGE MODEL
# ==============================

class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    receiver_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=True)
    content = Column(Text, nullable=False)
    is_read = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.now)

    sender = relationship("User", foreign_keys=[sender_id])
    receiver = relationship("User", foreign_keys=[receiver_id])
    booking = relationship("Booking", foreign_keys=[booking_id])

    def __repr__(self):
        return f"<Message(id={self.id}, sender_id={self.sender_id}, receiver_id={self.receiver_id})>"


# ==============================
# BILL / INVOICE MODEL
# ==============================
# Immutable snapshot of an approved payment. Created once when an admin
# confirms the payment. PDF is regenerated on demand from these fields.

class Bill(Base):
    __tablename__ = "bills"

    id = Column(Integer, primary_key=True, index=True)
    bill_number = Column(String, unique=True, index=True, nullable=False)
    version = Column(Integer, default=1)

    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=False)
    payment_id = Column(Integer, ForeignKey("payments.id"), nullable=False)
    customer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    provider_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Snapshot of amounts at issuance (immutable)
    quoted_amount = Column(Numeric(10, 2), nullable=False)
    paid_amount = Column(Numeric(10, 2), nullable=False)
    commission = Column(Numeric(10, 2), default=0)
    net_to_provider = Column(Numeric(10, 2), default=0)
    currency = Column(String, default="INR")

    # Snapshot of parties (immutable for the record)
    customer_name = Column(String, nullable=False)
    customer_email = Column(String, nullable=False)
    provider_name = Column(String, nullable=True)
    service = Column(String, nullable=False)
    booking_date = Column(String, nullable=False)

    # Payment proof
    gateway = Column(String, nullable=False)
    utr_number = Column(String, nullable=True)
    verified_by_admin_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Delivery tracking
    issued_at = Column(DateTime, default=datetime.now)
    emailed_to_customer_at = Column(DateTime, nullable=True)
    emailed_to_provider_at = Column(DateTime, nullable=True)
    email_status = Column(String, default="pending")   # pending | sent | partial | failed
    email_error = Column(Text, nullable=True)

    # Relationships
    booking = relationship("Booking", foreign_keys=[booking_id])
    payment = relationship("Payment", foreign_keys=[payment_id], back_populates="bill")
    customer = relationship("User", foreign_keys=[customer_id], back_populates="bills_as_customer")
    provider = relationship("User", foreign_keys=[provider_id], back_populates="bills_as_provider")
    verified_by_admin = relationship("User", foreign_keys=[verified_by_admin_id])

    def __repr__(self):
        return f"<Bill(id={self.id}, number={self.bill_number}, amount={self.paid_amount})>"


# ==============================
# EMAIL LOG (audit trail for every email sent)
# ==============================

class EmailLog(Base):
    __tablename__ = "email_logs"

    id = Column(Integer, primary_key=True, index=True)
    to_email = Column(String, nullable=False)
    subject = Column(String, nullable=False)
    template = Column(String, nullable=False)
    status = Column(String, default="pending")     # pending | sent | failed
    error = Column(Text, nullable=True)
    bill_id = Column(Integer, ForeignKey("bills.id"), nullable=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.now)
    sent_at = Column(DateTime, nullable=True)

    def __repr__(self):
        return f"<EmailLog(id={self.id}, to={self.to_email}, status={self.status})>"