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

# Load environment variables
load_dotenv()

# Import route modules
from app import auth
from app.routes import bookings, reviews
# ✅ Import payments router directly
from app.routes.payments import router as payments_router
# ✅ NEW: Import quotes router (quote-based payment flow)
from app.routes.quotes import router as quotes_router
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

STATIC_DIR = Path("static")
STATIC_DIR.mkdir(exist_ok=True)

# =========================================================
# FASTAPI APP INITIALIZATION
# =========================================================

app = FastAPI(
    title="ApnaMate API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    description="ApnaMate Backend API for Service Booking Platform",
    openapi_tags=[
        {"name": "Authentication", "description": "Authentication endpoints"},
        {"name": "Bookings", "description": "Booking management endpoints"},
        {"name": "Quotes", "description": "Provider quote-based payment flow — set price range, send quote, accept/reject"},
        {"name": "Reviews", "description": "Review and Rating management endpoints"},
        {"name": "Payments", "description": "Payment processing endpoints"},
        {"name": "Admin", "description": "Admin management endpoints"},
        {"name": "Notifications", "description": "Notification endpoints"}
    ]
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
        "http://localhost:8000"
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

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
app.mount("/static", StaticFiles(directory="static"), name="static")

# =========================================================
# FAVICON
# =========================================================

@app.get("/favicon.ico")
async def get_favicon():
    """Return a simple favicon to avoid 404 errors"""
    pixel = base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==")
    return Response(content=pixel, media_type="image/png")

# =========================================================
# REGISTER ROUTES
# =========================================================

app.include_router(auth.router, prefix="", tags=["Authentication"])
app.include_router(bookings.router, prefix="/bookings", tags=["Bookings"])
app.include_router(reviews.router, prefix="/bookings", tags=["Reviews"])
# ✅ Register payments router
app.include_router(payments_router, prefix="/bookings", tags=["Payments"])
# ✅ NEW: Register quotes router
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
        "version": "1.0.0",
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
                "reset_password": "POST /reset-password"
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
                "history": "GET /bookings/history/{customer_id}"
            },
            "quotes": {
                "set_price_range": "PUT /bookings/provider/price-range",
                "send_quote": "POST /bookings/{booking_id}/quote",
                "accept_quote": "POST /bookings/{booking_id}/quote/accept",
                "reject_quote": "POST /bookings/{booking_id}/quote/reject",
                "get_quote": "GET /bookings/{booking_id}/quote"
            },
            "reviews": {
                "create": "POST /bookings/reviews",
                "update": "PUT /bookings/reviews/{review_id}",
                "delete": "DELETE /bookings/reviews/{review_id}",
                "check_booking": "GET /bookings/reviews/booking/{booking_id}",
                "provider_reviews": "GET /bookings/reviews/provider/{provider_id}",
                "my_reviews": "GET /bookings/reviews/customer/my-reviews",
                "analytics": "GET /bookings/analytics/provider/{provider_id}",
                "admin_all": "GET /bookings/admin/reviews"
            },
            "payments": {
                "create": "POST /bookings/payments/create",
                "verify": "POST /bookings/payments/verify",
                "status": "GET /bookings/payments/booking/{booking_id}",
                "my_payments": "GET /bookings/payments/my-payments"
            },
            "notifications": {
                "get": "GET /bookings/notifications/{user_id}",
                "mark_read": "PUT /bookings/notifications/{notification_id}/read",
                "mark_all_read": "PUT /bookings/notifications/read-all/{user_id}",
                "delete": "DELETE /bookings/notifications/{notification_id}",
                "clear_all": "DELETE /bookings/notifications/clear-all/{user_id}"
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
                "reviews": "GET /bookings/admin/reviews"
            }
        }
    }

@app.get("/health", tags=["Root"])
async def health_check():
    """Health check endpoint"""
    return {
        "success": True,
        "status": "healthy",
        "timestamp": datetime.now().isoformat()
    }

# =========================================================
# ENHANCED ERROR HANDLERS WITH DEBUG LOGGING
# =========================================================

@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """Handle HTTP exceptions with detailed logging"""
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
            "timestamp": datetime.now().isoformat()
        }
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle validation errors with detailed information"""
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
            "input": error.get("input") if "input" in error else None
        })

        error_details.append(f"{field}: {error_msg}")

    print("=" * 60)
    print("❌ VALIDATION ERROR")
    print("=" * 60)
    print(f"Path: {request.url.path}")
    print(f"Method: {request.method}")
    print(f"Errors:")
    for err in error_details:
        print(f"  - {err}")

    try:
        body = await request.body()
        if body:
            print(f"Raw Body: {body.decode()[:500]}")
    except:
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
            "timestamp": datetime.now().isoformat()
        }
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle all unhandled exceptions"""
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
            "detail": str(exc) if config.DEBUG else "An unexpected error occurred",
            "path": str(request.url.path),
            "timestamp": datetime.now().isoformat()
        }
    )

# =========================================================
# MIDDLEWARE TO LOG ALL REQUESTS
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
            except:
                pass

        start_time = time.time()
        response = await call_next(request)
        process_time = time.time() - start_time

        print(f"⬅️ {request.method} {request.url.path} - {response.status_code} ({process_time:.3f}s)")

        return response

# Uncomment to enable request logging
# app.add_middleware(RequestLoggingMiddleware)

# =========================================================
# STARTUP EVENT
# =========================================================

@app.on_event("startup")
async def startup_event():
    print("=" * 60)
    print("🚀 ApnaMate API Started!")
    print("=" * 60)
    print(f"📅 Server time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"📚 API Docs: http://localhost:8000/docs")
    print(f"📖 ReDoc: http://localhost:8000/redoc")
    print(f"🏥 Health Check: http://localhost:8000/health")
    print("=" * 60)
    print("💡 Available Endpoints:")
    print("  📋 AUTHENTICATION:")
    print("    - POST /register - User registration")
    print("    - POST /login - User login")
    print("    - GET /users/me - Current user")
    print("    - GET /providers - List providers")
    print("    - POST /change-password - Change password")
    print("    - POST /forgot-password - Request password reset")
    print("    - POST /reset-password - Reset password")
    print("  📋 BOOKINGS:")
    print("    - POST /bookings/ - Create booking (status: pending_quote)")
    print("    - GET /bookings/my-bookings/{customer_id} - My bookings")
    print("    - PUT /bookings/{booking_id} - Update booking")
    print("    - DELETE /bookings/{booking_id} - Cancel booking")
    print("    - PATCH /bookings/{booking_id}/confirm - Confirm booking")
    print("    - PATCH /bookings/{booking_id}/reject - Reject booking")
    print("    - PATCH /bookings/{booking_id}/complete - Complete booking")
    print("    - GET /bookings/available-dates/{provider_id} - Check availability")
    print("    - GET /bookings/time-slots/{provider_id}/{booking_date} - Time slots")
    print("  📋 QUOTES (NEW):")
    print("    - PUT  /bookings/provider/price-range - Set provider price range")
    print("    - POST /bookings/{booking_id}/quote - Provider sends quote")
    print("    - POST /bookings/{booking_id}/quote/accept - Customer accepts quote")
    print("    - POST /bookings/{booking_id}/quote/reject - Customer rejects quote")
    print("    - GET  /bookings/{booking_id}/quote - Get booking quote")
    print("  📋 REVIEWS:")
    print("    - POST /bookings/reviews - Create review")
    print("    - PUT /bookings/reviews/{review_id} - Update review")
    print("    - DELETE /bookings/reviews/{review_id} - Delete review")
    print("    - GET /bookings/reviews/booking/{booking_id} - Check review status")
    print("    - GET /bookings/reviews/provider/{provider_id} - Get provider reviews")
    print("    - GET /bookings/reviews/customer/my-reviews - Get my reviews")
    print("    - GET /bookings/analytics/provider/{provider_id} - Review analytics")
    print("  📋 PAYMENTS:")
    print("    - POST /bookings/payments/create - Create payment")
    print("    - POST /bookings/payments/verify - Verify payment")
    print("    - GET /bookings/payments/booking/{booking_id} - Payment status")
    print("    - GET /bookings/payments/my-payments - My payments")
    print("  📋 NOTIFICATIONS:")
    print("    - GET /bookings/notifications/{user_id} - Get notifications")
    print("    - PUT /bookings/notifications/{id}/read - Mark as read")
    print("    - PUT /bookings/notifications/read-all/{user_id} - Mark all as read")
    print("  📋 ADMIN:")
    print("    - GET /bookings/admin/users - List users")
    print("    - GET /bookings/admin/users/roles - List users with roles")
    print("    - PUT /bookings/admin/users/{id}/role - Update user role")
    print("    - GET /bookings/admin/bookings - List bookings")
    print("    - GET /bookings/admin/bookings/{id} - Booking details")
    print("    - GET /bookings/admin/reviews - List all reviews")
    print("    - PUT /bookings/admin/users/{id}/block - Block user")
    print("    - PUT /bookings/admin/users/{id}/unblock - Unblock user")
    print("    - DELETE /bookings/admin/users/{id} - Delete user")
    print("=" * 60)
    print("✅ Server is ready to accept connections!")

@app.on_event("shutdown")
async def shutdown_event():
    print("=" * 60)
    print("👋 ApnaMate API Shutting down...")
    print("=" * 60)

# =========================================================
# RUN (Optional - for direct execution)
# =========================================================

if __name__ == "__main__":
    import uvicorn
    host = os.getenv("HOST", "127.0.0.1")
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("app.main:app", host=host, port=port, reload=True)