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
from app.routes.payments import router as payments_router
from app.routes.quotes import router as quotes_router
from app.routes import phone_auth
from app.routes import profile as profile_router
from app.database import engine
from app import models
from app.config import config

# =========================================================
# DATABASE INITIALIZATION
# =========================================================

print(f"🗄️  ACTUAL DB URL: {engine.url}")

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

PAYMENT_UPLOAD_DIR = UPLOAD_DIR / "payments"
PAYMENT_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

AVATAR_UPLOAD_DIR = UPLOAD_DIR / "avatars"
AVATAR_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

STATIC_DIR = Path("static")
STATIC_DIR.mkdir(exist_ok=True)

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
        {"name": "Quotes", "description": "Provider quote-based payment flow"},
        {"name": "Reviews", "description": "Review and Rating management endpoints"},
        {"name": "Payments", "description": "Payment processing, admin verification, provider payouts, bills & email"},
        {"name": "Bills", "description": "Invoice / receipt download and resend"},
        {"name": "Admin", "description": "Admin management endpoints"},
        {"name": "Notifications", "description": "Notification endpoints"},
    ],
)

# =========================================================
# CORS CONFIGURATION
# =========================================================

_raw_origins = os.getenv("CORS_ORIGINS", "").strip()

if _raw_origins == "*":
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["*"],
        max_age=3600,
    )
    print("🌐 CORS: ALLOWING ALL ORIGINS (*) — lock down before public launch")

elif _raw_origins:
    _origins = [o.strip() for o in _raw_origins.split(",") if o.strip()]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["*"],
        max_age=3600,
    )
    print(f"🌐 CORS: allowing {len(_origins)} explicit origins")

else:
    _origins = [
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
    ]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=_origins,
        allow_origin_regex=r"https://.*\.vercel\.app",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["*"],
        max_age=3600,
    )
    print("🌐 CORS: localhost + any *.vercel.app (default mode)")

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
app.include_router(phone_auth.router, tags=["Phone Auth"])
app.include_router(profile_router.router, tags=["Profile"])
app.include_router(payments_router, prefix="/bookings", tags=["Payments"])
app.include_router(quotes_router, prefix="/bookings", tags=["Quotes"])

# =========================================================
# ROOT ENDPOINTS
# =========================================================

@app.get("/", tags=["Root"])
async def root():
    return {
        "success": True,
        "message": "ApnaMate API is running! 🚀",
        "version": "1.1.0",
        "docs": "/docs",
        "redoc": "/redoc",
        "health": "/health",
        "timestamp": datetime.now().isoformat(),
    }

@app.get("/health", tags=["Root"])
async def health_check():
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
    for error in exc.errors():
        field = " -> ".join(str(loc) for loc in error["loc"])
        errors.append({
            "field": field,
            "message": error["msg"],
            "type": error["type"],
        })

    print("=" * 60)
    print("❌ VALIDATION ERROR:", request.url.path)
    for e in errors:
        print(f"  - {e['field']}: {e['message']}")
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
# ADMIN BOOTSTRAP HELPER
# =========================================================

def _bootstrap_admin():
    """
    Ensure an admin account exists.
    Reads ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NAME from env.
    Promotes existing user if email already exists.
    Idempotent — safe to run on every startup.
    """
    admin_email = os.getenv("ADMIN_EMAIL", "").strip().lower()
    admin_password = os.getenv("ADMIN_PASSWORD", "").strip()
    admin_name = os.getenv("ADMIN_NAME", "Admin").strip() or "Admin"

    if not admin_email or not admin_password:
        print("ℹ️  ADMIN_EMAIL / ADMIN_PASSWORD not set — skipping admin bootstrap")
        return

    try:
        from app.database import SessionLocal
        from app.models import User

        try:
            from app.auth import hash_password
        except ImportError:
            try:
                from app.auth import get_password_hash as hash_password
            except ImportError:
                print("⚠️  Could not find password hasher in app.auth — skipping admin bootstrap")
                return

        db = SessionLocal()

        existing_admin = db.query(User).filter(User.role == "admin").first()
        if existing_admin:
            print(f"ℹ️  Admin already exists: {existing_admin.email} — skipping bootstrap")
            db.close()
            return

        existing_user = db.query(User).filter(User.email == admin_email).first()

        if existing_user:
            existing_user.role = "admin"
            existing_user.is_active = 1
            existing_user.updated_at = datetime.now()
            db.commit()
            print(f"✅ Promoted existing user to admin: {admin_email}")
        else:
            admin = User(
                name=admin_name,
                email=admin_email,
                password=hash_password(admin_password),
                role="admin",
                is_active=1,
                created_at=datetime.now(),
            )
            db.add(admin)
            db.commit()
            print(f"✅ Admin created on startup: {admin_email}")

        db.close()

    except Exception as e:
        print(f"⚠️  Admin bootstrap failed: {e}")
        import traceback
        traceback.print_exc()

# =========================================================
# STARTUP EVENT
# =========================================================

@app.on_event("startup")
async def startup_event():
    # ✅ DEBUG: print which DB we're actually connected to
    try:
        from app.database import engine as _eng
        print(f"🗄️  ACTUAL DB URL (startup): {_eng.url}")
    except Exception as e:
        print(f"⚠️  Could not read DB URL at startup: {e}")

    smtp_user = os.getenv("SMTP_USER", "")
    smtp_pass = os.getenv("SMTP_PASS", "")
    smtp_ready = bool(smtp_user and smtp_pass)

    fast2sms_key = os.getenv("FAST2SMS_API_KEY", "")
    sms_ready = bool(fast2sms_key)

    print("=" * 60)
    print("🚀 ApnaMate API Started!")
    print(f"📅 {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)
    print("📧 Email:", "✅ configured" if smtp_ready else "⚠️  not configured")
    print("📱 SMS  :", "✅ configured" if sms_ready else "⚠️  not configured")
    print("=" * 60)

    # ✅ Auto-create/promote admin on startup
    _bootstrap_admin()

    print("=" * 60)
    print("✅ Server is ready to accept connections!")


@app.on_event("shutdown")
async def shutdown_event():
    print("👋 ApnaMate API Shutting down...")

# =========================================================
# RUN (Optional)
# =========================================================

if __name__ == "__main__":
    import uvicorn
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", 8000))
    reload = os.getenv("ENVIRONMENT", "development") == "development"
    uvicorn.run("app.main:app", host=host, port=port, reload=reload)