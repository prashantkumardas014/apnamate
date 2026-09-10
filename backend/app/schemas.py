# backend/app/schemas.py
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime

# =========================================================
# USER SCHEMAS
# =========================================================

class UserCreate(BaseModel):
    """Schema for user registration"""
    name: str = Field(..., min_length=2, max_length=100, description="User's full name")
    email: EmailStr = Field(..., description="User's email address")
    password: str = Field(..., min_length=6, description="User's password (min 6 characters)")
    role: str = Field(..., description="User role: admin, provider, or user")
    
    # Optional provider fields
    service: Optional[str] = Field(None, max_length=100, description="Service offered (for providers)")
    location: Optional[str] = Field(None, max_length=200, description="Provider's location")
    experience: Optional[str] = Field(None, max_length=50, description="Years of experience")
    price: Optional[str] = Field(None, max_length=50, description="Price for service")
    category: Optional[str] = Field(None, max_length=100, description="Service category")
    
    class Config:
        json_schema_extra = {
            "example": {
                "name": "John Doe",
                "email": "john@example.com",
                "password": "SecurePass123",
                "role": "provider",
                "service": "Plumbing",
                "location": "Mumbai, India",
                "experience": "5 years",
                "price": "₹500/hour",
                "category": "Home Services"
            }
        }

class UserResponse(BaseModel):
    """Schema for user response (excluding password)"""
    id: int
    name: str
    email: str
    role: str
    is_active: int
    rating: Optional[str] = None
    service: Optional[str] = None
    location: Optional[str] = None
    experience: Optional[str] = None
    price: Optional[str] = None
    category: Optional[str] = None
    created_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class LoginRequest(BaseModel):
    """Schema for login request"""
    email: EmailStr = Field(..., description="User's email address")
    password: str = Field(..., description="User's password")
    
    class Config:
        json_schema_extra = {
            "example": {
                "email": "admin@apnamate.com",
                "password": "Admin@123"
            }
        }

class LoginResponse(BaseModel):
    """Schema for login response"""
    success: bool = Field(True, description="Login success status")
    message: str = Field(..., description="Response message")
    user_id: int = Field(..., description="User ID")
    name: str = Field(..., description="User's full name")
    email: str = Field(..., description="User's email")
    role: str = Field(..., description="User role")
    is_active: int = Field(..., description="User active status")
    token: Optional[str] = Field(None, description="JWT access token")
    
    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "message": "Login successful",
                "user_id": 1,
                "name": "Admin",
                "email": "admin@apnamate.com",
                "role": "admin",
                "is_active": 1,
                "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
            }
        }

class UserUpdate(BaseModel):
    """Schema for updating user"""
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    is_active: Optional[int] = Field(None, ge=0, le=1)
    service: Optional[str] = None
    location: Optional[str] = None
    experience: Optional[str] = None
    price: Optional[str] = None
    category: Optional[str] = None
    rating: Optional[str] = None

class PasswordResetRequest(BaseModel):
    """Schema for password reset request"""
    email: EmailStr = Field(..., description="User's email address")

class PasswordResetConfirm(BaseModel):
    """Schema for password reset confirmation"""
    token: str = Field(..., description="Reset token")
    new_password: str = Field(..., min_length=6, description="New password")

class PasswordChange(BaseModel):
    """Schema for changing password"""
    current_password: str = Field(..., description="Current password")
    new_password: str = Field(..., min_length=6, description="New password")
    
    class Config:
        json_schema_extra = {
            "example": {
                "current_password": "OldPassword123",
                "new_password": "NewPassword123"
            }
        }

class Token(BaseModel):
    """Schema for JWT token"""
    access_token: str = Field(..., description="JWT access token")
    token_type: str = Field("bearer", description="Token type")

class TokenData(BaseModel):
    """Schema for token data"""
    user_id: Optional[int] = None
    role: Optional[str] = None

# =========================================================
# BOOKING SCHEMAS
# =========================================================

class BookingCreate(BaseModel):
    """Schema for creating a booking"""
    customer_id: int = Field(..., description="Customer ID")
    provider_id: int = Field(..., description="Provider ID")
    provider_name: str = Field(..., description="Provider name")
    service: str = Field(..., description="Service name")
    date: str = Field(..., description="Booking date (YYYY-MM-DD)")
    time: str = Field(..., description="Booking time")
    address: str = Field(..., description="Service address")
    description: str = Field(..., description="Service description")
    
    class Config:
        json_schema_extra = {
            "example": {
                "customer_id": 1,
                "provider_id": 2,
                "provider_name": "John Electrician",
                "service": "Electrical Repair",
                "date": "2026-09-20",
                "time": "10:00 AM",
                "address": "123 Main St, City",
                "description": "Need to fix wiring"
            }
        }

class BookingUpdate(BaseModel):
    """Schema for updating a booking"""
    date: Optional[str] = Field(None, description="New booking date (YYYY-MM-DD)")
    time: Optional[str] = Field(None, description="New booking time")
    address: Optional[str] = Field(None, description="New service address")
    description: Optional[str] = Field(None, description="New service description")
    status: Optional[str] = Field(None, description="Booking status")

class BookingResponse(BaseModel):
    """Schema for booking response"""
    id: int
    customer_id: int
    provider_id: int
    provider_name: str
    service: str
    date: str
    time: str
    address: str
    description: str
    status: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class BookingStatusUpdate(BaseModel):
    """Schema for updating booking status"""
    status: str = Field(..., description="New status (Pending, Confirmed, Completed, Cancelled, Rejected)")

# =========================================================
# DATE AVAILABILITY SCHEMAS
# =========================================================

class DateAvailabilityResponse(BaseModel):
    """Schema for date availability response"""
    date: str
    day: str
    available_slots: int
    is_available: bool
    is_past: bool

class AvailableDatesResponse(BaseModel):
    """Schema for available dates response"""
    success: bool
    provider_id: int
    provider_name: str
    available_dates: list[DateAvailabilityResponse]
    max_days_ahead: int

class TimeSlotsResponse(BaseModel):
    """Schema for time slots response"""
    success: bool
    provider_id: int
    provider_name: str
    booking_date: str
    available_slots: list[str]
    booked_slots: list[str]
    total_slots: int

# =========================================================
# REVIEW SCHEMAS
# =========================================================

class ReviewCreate(BaseModel):
    """Schema for creating a review"""
    booking_id: int = Field(..., description="Booking ID")
    customer_id: int = Field(..., description="Customer ID")
    provider_id: int = Field(..., description="Provider ID")
    rating: int = Field(..., ge=1, le=5, description="Rating (1-5)")
    comment: str = Field(..., min_length=3, max_length=500, description="Review comment")
    
    class Config:
        json_schema_extra = {
            "example": {
                "booking_id": 1,
                "customer_id": 1,
                "provider_id": 2,
                "rating": 5,
                "comment": "Excellent service! Very professional and timely."
            }
        }

class ReviewResponse(BaseModel):
    """Schema for review response"""
    id: int
    booking_id: int
    customer_id: int
    provider_id: int
    rating: int
    comment: str
    created_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# =========================================================
# NOTIFICATION SCHEMAS
# =========================================================

class NotificationCreate(BaseModel):
    """Schema for creating a notification"""
    user_id: int = Field(..., description="User ID")
    title: str = Field(..., max_length=100, description="Notification title")
    message: str = Field(..., max_length=500, description="Notification message")
    type: str = Field("info", description="Notification type (info, booking, welcome, alert)")

class NotificationResponse(BaseModel):
    """Schema for notification response"""
    id: int
    user_id: int
    title: str
    message: str
    type: str
    is_read: int
    created_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class NotificationUpdate(BaseModel):
    """Schema for updating notification"""
    is_read: Optional[int] = Field(None, ge=0, le=1, description="Read status (0=unread, 1=read)")

# =========================================================
# PROVIDER SCHEMAS
# =========================================================

class ProviderResponse(BaseModel):
    """Schema for provider response"""
    id: int
    name: str
    service: Optional[str] = None
    location: Optional[str] = None
    experience: Optional[str] = None
    rating: Optional[str] = None
    price: Optional[str] = None
    category: Optional[str] = None
    total_bookings: Optional[int] = 0
    total_reviews: Optional[int] = 0
    average_rating: Optional[float] = 0.0

class ProviderListResponse(BaseModel):
    """Schema for provider list response"""
    success: bool
    count: int
    providers: list[ProviderResponse]

# =========================================================
# ADMIN SCHEMAS
# =========================================================

class AdminDashboardStats(BaseModel):
    """Schema for admin dashboard statistics"""
    total_users: int
    total_providers: int
    total_bookings: int
    pending_bookings: int
    completed_bookings: int
    cancelled_bookings: int
    total_reviews: int
    average_rating: float

class AdminUserListResponse(BaseModel):
    """Schema for admin user list response"""
    success: bool
    count: int
    users: list[UserResponse]

# =========================================================
# DASHBOARD SCHEMAS
# =========================================================

class ProviderStats(BaseModel):
    """Schema for provider statistics"""
    total: int
    pending: int
    confirmed: int
    completed: int
    cancelled: int
    upcoming: int

class ProviderStatsResponse(BaseModel):
    """Schema for provider statistics response"""
    success: bool
    provider_id: int
    provider_name: str
    stats: ProviderStats

# =========================================================
# ERROR SCHEMAS
# =========================================================

class ErrorResponse(BaseModel):
    """Schema for error response"""
    success: bool = False
    message: str
    detail: Optional[str] = None
    path: Optional[str] = None