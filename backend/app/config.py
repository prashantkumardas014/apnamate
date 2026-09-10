# backend/app/config.py
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class Config:
    # =========================================================
    # APP CONFIG
    # =========================================================
    
    APP_NAME = "ApnaMate"
    APP_VERSION = "1.0.0"
    APP_URL = os.getenv("APP_URL", "http://localhost:5173")
    API_URL = os.getenv("API_URL", "http://localhost:8000")
    ENVIRONMENT = os.getenv("ENVIRONMENT", "development").lower()
    
    # =========================================================
    # DATABASE
    # =========================================================
    
    DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./apnamate.db")
    
    # =========================================================
    # SECURITY
    # =========================================================
    
    SECRET_KEY = os.getenv("SECRET_KEY", "your-super-secret-key-change-in-production")
    ALGORITHM = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours
    REFRESH_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days
    
    # =========================================================
    # STRIPE (Payments)
    # =========================================================
    
    STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "")
    STRIPE_PUBLISHABLE_KEY = os.getenv("STRIPE_PUBLISHABLE_KEY", "")
    STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")
    
    # =========================================================
    # EMAIL (SendGrid)
    # =========================================================
    
    SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY", "")
    FROM_EMAIL = os.getenv("FROM_EMAIL", "noreply@apnamate.com")
    
    # =========================================================
    # UPLOAD
    # =========================================================
    
    MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB
    ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}

    @classmethod
    def validate(cls):
        if cls.ENVIRONMENT == "production":
            if len(cls.SECRET_KEY) < 32 or "change" in cls.SECRET_KEY.lower():
                raise RuntimeError("A strong production SECRET_KEY is required")
            if cls.APP_URL.startswith("http://localhost") or cls.API_URL.startswith("http://localhost"):
                raise RuntimeError("Production APP_URL and API_URL must use deployed hosts")

        return cls

# =========================================================
# Create config instance for easy access
# =========================================================

config = Config.validate()