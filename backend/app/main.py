# app/main.py
from fastapi import FastAPI, Response, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from pathlib import Path
from datetime import datetime
import base64
import os
import json
from dotenv import load_dotenv

# Load environment variables FIRST
load_dotenv()

# Import route modules
from app import auth
from app.routes import bookings, reviews
# ✅ Payments router (admin verification + payouts + bills + email)
from app.routes.payments import router as payments_router
# ✅ Quotes router (quote-based payment flow)
from app.routes.quotes import router as quotes_router
# ✅ Phone OTP auth router
from app.routes import phone_auth
# ✅ Profile router (avatar upload + Aadhaar verification)
from app.routes import profile as profile_router
from app.database import engine
from app import models
from app.config import config

# =========================================================
# DATABASE INITIALIZATION
# =========================================================

try:
    models.Base.metadata.create_all(bind=engine)
    print("✅ Database tables created/verified successfully")
except Exception as e:
    print(f"❌ Database initialization error: {e}")

# =========================================================
# DIRECTORY SETUP
# =========================================================

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

# Payment screenshots
PAYMENT_UPLOAD_DIR = UPLOAD_DIR / "payments"
PAYMENT_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# ✅ NEW: Avatars
AVATAR_UPLOAD_DIR = UPLOAD_DIR / "avatars"
AVATAR_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

STATIC_DIR = Path("static")
STATIC_DIR.mkdir(exist_ok=True)

# ✅ Ensure email template folder exists (so first run doesn't crash)
TEMPLATES_DIR = Path(__file__).resolve().parent / "templates" / "emails"
TEMPLATES_DIR.mkdir(parents=True, exist_ok=True)
print(f"📁 Email templates dir: {TEMPLATES_DIR}")

# =========================================================
# FASTAPI APP INITIALIZATION
# =========================================================

app = FastAPI(
    title="ApnaMate API",
    version="1.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    description="ApnaMate Backend API for Service Booking Platform",
    openapi_tags=[
        {"name": "Authentication", "description": "Authentication endpoints"},
        {"name": "Phone Auth", "description": "Phone + OTP login flow"},
        {"name": "Profile", "description": "User profile, avatar upload, Aadhaar verification"},
        {"name": "Bookings", "description": "Booking management endpoints"},
        {"name": "Quotes", "description": "Provider quote-based payment flow — set price range, send quote, accept/reject"},
        {"name": "Reviews", "description": "Review and Rating management endpoints"},
        {"name": "Payments", "description": "Payment processing, admin verification, provider payouts, bills & email delivery"},
        {"name": "Bills", "description": "Invoice / receipt download and resend"},
        {"name": "Admin", "description": "Admin management endpoints"},
        {"name": "Notifications", "description": "Notification endpoints"},
    ],
)

# =========================================================
# CORS CONFIGURATION
# =========================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:5175",
        "http://127.0.0.1:5175",
        "http://localhost:5176",
        "http://127.0.0.1:5176",
        "http://localhost:3000",
        "http://localhost:8000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,
)

# =========================================================
# STATIC FILES
# =========================================================
# /uploads/payments/payment_XX.png  → served for admin to view screenshots
# /uploads/avatars/user_XX.png      → served for profile pictures
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
app.mount("/static", StaticFiles(directory="static"), name="static")

# =========================================================
# FAVICON
# =========================================================

@app.get("/favicon.ico")
async def get_favicon():
    """Return a simple favicon to avoid 404 errors"""
    pixel = base64.b64decode(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
    )
    return Response(content=pixel, media_type="image/png")

# =========================================================
# REGISTER ROUTES
# =========================================================

app.include_router(auth.router, prefix="", tags=["Authentication"])
app.include_router(bookings.router, prefix="/bookings", tags=["Bookings"])
app.include_router(reviews.router, prefix="/bookings", tags=["Reviews"])

# ✅ Phone OTP auth (no prefix — exposes /auth/phone/*)
app.include_router(phone_auth.router, tags=["Phone Auth"])

# ✅ NEW: Profile — avatar upload + Aadhaar verification
# Final URLs:
#   PUT  /profile/me
#   POST /profile/me/avatar
#   POST /profile/me/verify-aadhaar
app.include_router(profile_router.router, tags=["Profile"])

# ✅ Payments — create / verify / screenshots / admin approvals / payouts / bills
# Final URLs:
#   POST   /bookings/payments/create
#   POST   /bookings/payments/verify
#   POST   /bookings/payments/{payment_id}/screenshot
#   GET    /bookings/payments/booking/{booking_id}
#   GET    /bookings/payments/my-payments
#   GET    /bookings/payments/provider/payouts
#   PUT    /bookings/payments/provider/save-upi
#   GET    /bookings/payments/admin/pending-verification
#   GET    /bookings/payments/admin/payouts
#   POST   /bookings/payments/admin/payouts/{payout_id}/mark-paid
#   POST   /bookings/payments/admin/{payment_id}/approve
#   POST   /bookings/payments/admin/{payment_id}/reject
#   GET    /bookings/payments/bills/my
#   GET    /bookings/payments/bills/booking/{booking_id}
#   GET    /bookings/payments/bills/{bill_id}/download
#   POST   /bookings/payments/bills/{bill_id}/resend
app.include_router(payments_router, prefix="/bookings", tags=["Payments"])

# ✅ Quotes — set price range, send quote, accept/reject
# Final URLs:
#   PUT    /bookings/provider/price-range
#   POST   /bookings/{booking_id}/quote
#   POST   /bookings/{booking_id}/quote/accept
#   POST   /bookings/{booking_id}/quote/reject
#   GET    /bookings/{booking_id}/quote
app.include_router(quotes_router, prefix="/bookings", tags=["Quotes"])

# =========================================================
# ROOT ENDPOINTS
# =========================================================

@app.get("/", tags=["Root"])
async def root():
    """Root endpoint - API information"""
    return {
        "success": True,
        "message": "ApnaMate API is running! 🚀",
        "version": "1.1.0",
        "docs": "/docs",
        "redoc": "/redoc",
        "health": "/health",
        "timestamp": datetime.now().isoformat(),
        "endpoints": {
            "auth": {
                "register": "POST /register",
                "login": "POST /login",
                "me": "GET /users/me",
                "providers": "GET /providers",
                "change_password": "POST /change-password",
                "forgot_password": "POST /forgot-password",
                "reset_password": "POST /reset-password",
            },
            "phone_auth": {
                "send_otp": "POST /auth/phone/send-otp",
                "verify_otp": "POST /auth/phone/verify-otp",
            },
            "profile": {
                "update": "PUT /profile/me",
                "upload_avatar": "POST /profile/me/avatar",
                "verify_aadhaar": "POST /profile/me/verify-aadhaar",
            },
            "bookings": {
                "create": "POST /bookings/",
                "my_bookings": "GET /bookings/my-bookings/{customer_id}",
                "update": "PUT /bookings/{booking_id}",
                "cancel": "DELETE /bookings/{booking_id}",
                "confirm": "PATCH /bookings/{booking_id}/confirm",
                "reject": "PATCH /bookings/{booking_id}/reject",
                "complete": "PATCH /bookings/{booking_id}/complete",
                "available_dates": "GET /bookings/available-dates/{provider_id}",
                "time_slots": "GET /bookings/time-slots/{provider_id}/{booking_date}",
                "provider_bookings": "GET /bookings/provider/{provider_id}",
                "upcoming": "GET /bookings/upcoming/{customer_id}",
                "history": "GET /bookings/history/{customer_id}",
            },
            "quotes": {
                "set_price_range": "PUT /bookings/provider/price-range",
                "send_quote": "POST /bookings/{booking_id}/quote",
                "accept_quote": "POST /bookings/{booking_id}/quote/accept",
                "reject_quote": "POST /bookings/{booking_id}/quote/reject",
                "get_quote": "GET /bookings/{booking_id}/quote",
            },
            "reviews": {
                "create": "POST /bookings/reviews",
                "update": "PUT /bookings/reviews/{review_id}",
                "delete": "DELETE /bookings/reviews/{review_id}",
                "check_booking": "GET /bookings/reviews/booking/{booking_id}",
                "provider_reviews": "GET /bookings/reviews/provider/{provider_id}",
                "my_reviews": "GET /bookings/reviews/customer/my-reviews",
                "analytics": "GET /bookings/analytics/provider/{provider_id}",
                "admin_all": "GET /bookings/admin/reviews",
            },
            "payments": {
                "create": "POST /bookings/payments/create",
                "verify": "POST /bookings/payments/verify",
                "status": "GET /bookings/payments/booking/{booking_id}",
                "my_payments": "GET /bookings/payments/my-payments",
                "screenshot_upload": "POST /bookings/payments/{payment_id}/screenshot",
                "provider_payouts": "GET /bookings/payments/provider/payouts",
                "provider_save_upi": "PUT /bookings/payments/provider/save-upi",
                "admin_pending_verification": "GET /bookings/payments/admin/pending-verification",
                "admin_payouts": "GET /bookings/payments/admin/payouts",
                "admin_mark_payout_paid": "POST /bookings/payments/admin/payouts/{payout_id}/mark-paid",
                "admin_approve": "POST /bookings/payments/admin/{payment_id}/approve",
                "admin_reject": "POST /bookings/payments/admin/{payment_id}/reject",
            },
            "bills": {
                "my_bills": "GET /bookings/payments/bills/my",
                "bill_for_booking": "GET /bookings/payments/bills/booking/{booking_id}",
                "download_bill": "GET /bookings/payments/bills/{bill_id}/download",
                "resend_bill_admin": "POST /bookings/payments/bills/{bill_id}/resend",
            },
            "notifications": {
                "get": "GET /bookings/notifications/{user_id}",
                "mark_read": "PUT /bookings/notifications/{notification_id}/read",
                "mark_all_read": "PUT /bookings/notifications/read-all/{user_id}",
                "delete": "DELETE /bookings/notifications/{notification_id}",
                "clear_all": "DELETE /bookings/notifications/clear-all/{user_id}",
            },
            "admin": {
                "users": "GET /bookings/admin/users",
                "users_roles": "GET /bookings/admin/users/roles",
                "user_role": "PUT /bookings/admin/users/{user_id}/role",
                "bookings": "GET /bookings/admin/bookings",
                "booking_details": "GET /bookings/admin/bookings/{booking_id}",
                "update_booking": "PUT /bookings/admin/bookings/{booking_id}",
                "delete_booking": "DELETE /bookings/admin/bookings/{booking_id}",
                "block_user": "PUT /bookings/admin/users/{user_id}/block",
                "unblock_user": "PUT /bookings/admin/users/{user_id}/unblock",
                "delete_user": "DELETE /bookings/admin/users/{user_id}",
                "reviews": "GET /bookings/admin/reviews",
            },
        },
    }

@app.get("/health", tags=["Root"])
async def health_check():
    """Health check endpoint"""
    return {
        "success": True,
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
    }

# =========================================================
# ENHANCED ERROR HANDLERS
# =========================================================

@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    print(f"❌ HTTP Exception: {exc.status_code} - {exc.detail}")
    print(f"   Path: {request.url.path}")
    print(f"   Method: {request.method}")

    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "status_code": exc.status_code,
            "detail": str(exc.detail) if exc.detail else "An error occurred",
            "path": str(request.url.path),
            "timestamp": datetime.now().isoformat(),
        },
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = []
    error_details = []

    for error in exc.errors():
        field = " -> ".join(str(loc) for loc in error["loc"])
        error_msg = error["msg"]
        error_type = error["type"]

        errors.append({
            "field": field,
            "message": error_msg,
            "type": error_type,
            "input": error.get("input") if "input" in error else None,
        })
        error_details.append(f"{field}: {error_msg}")

    print("=" * 60)
    print("❌ VALIDATION ERROR")
    print("=" * 60)
    print(f"Path: {request.url.path}")
    print(f"Method: {request.method}")
    print("Errors:")
    for err in error_details:
        print(f"  - {err}")

    try:
        body = await request.body()
        if body:
            print(f"Raw Body: {body.decode()[:500]}")
    except Exception:
        pass

    if request.query_params:
        print(f"Query Params: {dict(request.query_params)}")

    print("=" * 60)

    return JSONResponse(
        status_code=422,
        content={
            "success": False,
            "status_code": 422,
            "message": "Validation error",
            "errors": errors,
            "path": str(request.url.path),
            "timestamp": datetime.now().isoformat(),
        },
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    print("=" * 60)
    print(f"❌ UNHANDLED EXCEPTION: {exc}")
    print(f"   Path: {request.url.path}")
    print(f"   Method: {request.method}")
    import traceback
    traceback.print_exc()
    print("=" * 60)

    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "status_code": 500,
            "message": "Internal server error",
            "detail": str(exc) if getattr(config, "DEBUG", False) else "An unexpected error occurred",
            "path": str(request.url.path),
            "timestamp": datetime.now().isoformat(),
        },
    )

# =========================================================
# (OPTIONAL) REQUEST LOGGING MIDDLEWARE
# =========================================================
from starlette.middleware.base import BaseHTTPMiddleware
import time


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        print(f"➡️ {request.method} {request.url.path}")

        if request.method in ["POST", "PUT", "PATCH"]:
            try:
                body = await request.body()
                if body:
                    print(f"   Body: {body[:500]}")
            except Exception:
                pass

        start_time = time.time()
        response = await call_next(request)
        process_time = time.time() - start_time

        print(f"⬅️ {request.method} {request.url.path} - {response.status_code} ({process_time:.3f}s)")

        return response


# Uncomment to enable verbose request logging (helpful for debugging)
# app.add_middleware(RequestLoggingMiddleware)

# =========================================================
# STARTUP EVENT
# =========================================================

@app.on_event("startup")
async def startup_event():
    # SMTP sanity check
    smtp_user = os.getenv("SMTP_USER", "")
    smtp_pass = os.getenv("SMTP_PASS", "")
    smtp_ready = bool(smtp_user and smtp_pass)

    # SMS sanity check
    fast2sms_key = os.getenv("FAST2SMS_API_KEY", "")
    sms_ready = bool(fast2sms_key)

    print("=" * 60)
    print("🚀 ApnaMate API Started!")
    print("=" * 60)
    print(f"📅 Server time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("📚 API Docs: http://localhost:8000/docs")
    print("📖 ReDoc: http://localhost:8000/redoc")
    print("🏥 Health Check: http://localhost:8000/health")
    print("=" * 60)
    print("📧 Email system:")
    if smtp_ready:
        print(f"    ✅ SMTP configured for {smtp_user}")
        if smtp_pass and len(smtp_pass) == 16 and " " not in smtp_pass:
            print("    ✅ App password length OK (16 chars, no spaces)")
        else:
            print(f"    ⚠️  App password length: {len(smtp_pass)} (expected 16, no spaces)")
    else:
        print("    ⚠️  SMTP NOT configured — set SMTP_USER and SMTP_PASS in .env")
    print(f"📁 Templates dir: {TEMPLATES_DIR}")
    print(f"📁 Avatars dir: {AVATAR_UPLOAD_DIR}")
    print("=" * 60)
    print("📱 SMS / OTP:")
    if sms_ready:
        print(f"    ✅ Fast2SMS configured (key length {len(fast2sms_key)})")
    else:
        print("    ⚠️  FAST2SMS_API_KEY not set — OTP will print to console")
    print("=" * 60)
    print("🔐 Auth methods:")
    print("    ✅ Email + password")
    print("    ✅ Phone + OTP")
    print("=" * 60)
    print("👤 Profile features:")
    print("    ✅ Avatar upload       POST /profile/me/avatar")
    print("    ✅ Profile update      PUT  /profile/me")
    print("    ✅ Aadhaar verify      POST /profile/me/verify-aadhaar")
    print("=" * 60)
    print("💡 Available Endpoints:")
    print("  📋 AUTHENTICATION:")
    print("    - POST /register")
    print("    - POST /login")
    print("    - GET  /users/me")
    print("    - GET  /providers")
    print("    - POST /change-password")
    print("    - POST /forgot-password")
    print("    - POST /reset-password")
    print("  📱 PHONE OTP:")
    print("    - POST /auth/phone/send-otp")
    print("    - POST /auth/phone/verify-otp")
    print("  👤 PROFILE:")
    print("    - PUT  /profile/me")
    print("    - POST /profile/me/avatar")
    print("    - POST /profile/me/verify-aadhaar")
    print("  📋 BOOKINGS:")
    print("    - POST   /bookings/")
    print("    - GET    /bookings/my-bookings/{customer_id}")
    print("    - PUT    /bookings/{booking_id}")
    print("    - DELETE /bookings/{booking_id}")
    print("    - GET    /bookings/provider/{provider_id}")
    print("  📋 QUOTES:")
    print("    - PUT  /bookings/provider/price-range")
    print("    - POST /bookings/{booking_id}/quote")
    print("    - POST /bookings/{booking_id}/quote/accept")
    print("    - POST /bookings/{booking_id}/quote/reject")
    print("    - GET  /bookings/{booking_id}/quote")
    print("  📋 REVIEWS:")
    print("    - POST   /bookings/reviews")
    print("    - PUT    /bookings/reviews/{review_id}")
    print("    - DELETE /bookings/reviews/{review_id}")
    print("    - GET    /bookings/reviews/booking/{booking_id}")
    print("    - GET    /bookings/reviews/provider/{provider_id}")
    print("    - GET    /bookings/reviews/customer/my-reviews")
    print("    - GET    /bookings/analytics/provider/{provider_id}")
    print("  📋 PAYMENTS:")
    print("    - POST /bookings/payments/create")
    print("    - POST /bookings/payments/verify")
    print("    - POST /bookings/payments/{payment_id}/screenshot")
    print("    - GET  /bookings/payments/booking/{booking_id}")
    print("    - GET  /bookings/payments/my-payments")
    print("    - GET  /bookings/payments/provider/payouts")
    print("    - PUT  /bookings/payments/provider/save-upi")
    print("  📋 ADMIN — PAYMENTS:")
    print("    - GET  /bookings/payments/admin/pending-verification")
    print("    - GET  /bookings/payments/admin/payouts")
    print("    - POST /bookings/payments/admin/payouts/{payout_id}/mark-paid")
    print("    - POST /bookings/payments/admin/{payment_id}/approve")
    print("    - POST /bookings/payments/admin/{payment_id}/reject")
    print("  📋 BILLS / RECEIPTS:")
    print("    - GET  /bookings/payments/bills/my")
    print("    - GET  /bookings/payments/bills/booking/{booking_id}")
    print("    - GET  /bookings/payments/bills/{bill_id}/download")
    print("    - POST /bookings/payments/bills/{bill_id}/resend")
    print("  📋 NOTIFICATIONS:")
    print("    - GET    /bookings/notifications/{user_id}")
    print("    - PUT    /bookings/notifications/{id}/read")
    print("    - PUT    /bookings/notifications/read-all/{user_id}")
    print("    - DELETE /bookings/notifications/{notification_id}")
    print("    - DELETE /bookings/notifications/clear-all/{user_id}")
    print("  📋 ADMIN — USERS & BOOKINGS:")
    print("    - GET    /bookings/admin/users")
    print("    - GET    /bookings/admin/users/roles")
    print("    - PUT    /bookings/admin/users/{id}/role")
    print("    - GET    /bookings/admin/bookings")
    print("    - GET    /bookings/admin/bookings/{id}")
    print("    - GET    /bookings/admin/reviews")
    print("    - PUT    /bookings/admin/users/{id}/block")
    print("    - PUT    /bookings/admin/users/{id}/unblock")
    print("    - DELETE /bookings/admin/users/{id}")
    print("=" * 60)
    print("✅ Server is ready to accept connections!")


@app.on_event("shutdown")
async def shutdown_event():
    print("=" * 60)
    print("👋 ApnaMate API Shutting down...")
    print("=" * 60)

# =========================================================
# RUN (Optional — for direct execution)
# =========================================================
if __name__ == "__main__":
    import uvicorn
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", 8000))
    reload = os.getenv("ENVIRONMENT", "development") == "development"
    uvicorn.run("app.main:app", host=host, port=port, reload=reload)