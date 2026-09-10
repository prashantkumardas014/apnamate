# backend/app/routes/auth.py
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import Optional
from datetime import datetime, timedelta
import bcrypt
from jose import JWTError, jwt
import os
from dotenv import load_dotenv

# Use absolute imports
from app.database import get_db
from app.models import User, Booking, Review, Notification
from app.schemas import (
    UserCreate, 
    LoginRequest, 
    LoginResponse, 
    UserResponse,
    Token,
    TokenData,
    PasswordChange,
    PasswordResetRequest,
    PasswordResetConfirm
)
from app.security import hash_password, verify_password
from app.config import config

load_dotenv()

router = APIRouter()

# =========================================================
# JWT Configuration - Using config
# =========================================================

SECRET_KEY = config.SECRET_KEY
ALGORITHM = config.ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = config.ACCESS_TOKEN_EXPIRE_MINUTES

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

# =========================================================
# HELPER FUNCTIONS
# =========================================================

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str):
    """Decode JWT access token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """Get current user from JWT token"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: int = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception
    
    return user

def get_current_admin_user(current_user: User = Depends(get_current_user)):
    """Get current user and verify they are admin"""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )
    return current_user

# =========================================================
# AUTH ENDPOINTS
# =========================================================

@router.post("/register", response_model=dict)
def register(
    user: UserCreate,
    db: Session = Depends(get_db)
):
    """Register a new user"""
    try:
        # Check if email already exists
        existing_user = db.query(User).filter(
            User.email == user.email
        ).first()

        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Hash the password
        hashed_password = hash_password(user.password)

        # Create new user with all fields
        new_user = User(
            name=user.name,
            email=user.email,
            password=hashed_password,
            role=user.role,
            is_active=1,  # Active by default
            
            # Provider details (optional fields)
            service=user.service,
            location=user.location,
            experience=user.experience,
            price=user.price,
            category=user.category,
            rating="New",  # Default rating for new providers
            created_at=datetime.now()
        )

        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        # Create welcome notification
        notification = Notification(
            user_id=new_user.id,
            title="Welcome to ApnaMate! 🎉",
            message=f"Welcome {new_user.name}! Start exploring services and book your first service today.",
            type="welcome",
            created_at=datetime.now()
        )
        db.add(notification)
        db.commit()

        # Send welcome email (try, but don't fail if email fails)
        try:
            from app.email_service import send_welcome_email
            send_welcome_email(new_user.email, new_user.name)
        except Exception as e:
            print(f"⚠️ Welcome email failed: {e}")

        return {
            "success": True,
            "message": "User registered successfully",
            "user_id": new_user.id,
            "email": new_user.email,
            "role": new_user.role
        }
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {str(e)}"
        )

@router.post("/login", response_model=LoginResponse)
def login(
    credentials: LoginRequest,
    db: Session = Depends(get_db)
):
    """Login user"""
    try:
        # Find user by email
        user = db.query(User).filter(
            User.email == credentials.email
        ).first()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )

        # Check if account is active
        is_blocked = False
        if hasattr(user, 'is_active'):
            if isinstance(user.is_active, bool):
                is_blocked = not user.is_active
            else:  # integer case
                is_blocked = user.is_active == 0
        
        if is_blocked:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your account has been blocked by admin"
            )

        # Verify password
        try:
            if not verify_password(credentials.password, user.password):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid email or password"
                )
        except Exception as e:
            print(f"Password verification error: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )

        # Create access token
        access_token = create_access_token(
            data={"sub": str(user.id), "role": user.role}
        )

        # Login successful
        return LoginResponse(
            success=True,
            message="Login successful",
            user_id=user.id,
            name=user.name,
            email=user.email,
            role=user.role,
            is_active=user.is_active if hasattr(user, 'is_active') else 1,
            token=access_token
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Login failed: {str(e)}"
        )

@router.get("/users/me", response_model=UserResponse)
def get_current_user_info(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user details"""
    try:
        return UserResponse(
            id=current_user.id,
            name=current_user.name,
            email=current_user.email,
            role=current_user.role,
            service=current_user.service,
            location=current_user.location,
            experience=current_user.experience,
            rating=current_user.rating,
            price=current_user.price,
            category=current_user.category,
            is_active=current_user.is_active
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching user: {str(e)}"
        )

@router.get("/users/{user_id}")
def get_user_by_id(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user by ID"""
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        return {
            "success": True,
            "user": {
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "role": user.role,
                "service": user.service,
                "location": user.location,
                "experience": user.experience,
                "rating": user.rating,
                "price": user.price,
                "category": user.category,
                "is_active": user.is_active
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching user: {str(e)}"
        )

@router.get("/providers")
def get_all_providers(
    db: Session = Depends(get_db),
    service: Optional[str] = None,
    location: Optional[str] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
    min_rating: Optional[float] = None
):
    """Get all providers with advanced filters"""
    try:
        query = db.query(User).filter(
            User.role == "provider",
            User.is_active == 1
        )
        
        # Apply filters
        if service:
            query = query.filter(User.service.ilike(f"%{service}%"))
        
        if location:
            query = query.filter(User.location.ilike(f"%{location}%"))
        
        if category:
            query = query.filter(User.category.ilike(f"%{category}%"))
        
        if search:
            query = query.filter(
                or_(
                    User.name.ilike(f"%{search}%"),
                    User.service.ilike(f"%{search}%"),
                    User.location.ilike(f"%{search}%"),
                    User.category.ilike(f"%{search}%")
                )
            )
        
        providers = query.all()
        
        # Format response with ratings
        providers_list = []
        for p in providers:
            # Get average rating from reviews
            avg_rating_result = db.query(func.avg(Review.rating)).filter(
                Review.provider_id == p.id
            ).first()
            
            avg_rating = avg_rating_result[0] if avg_rating_result and avg_rating_result[0] else 0
            avg_rating = round(float(avg_rating), 1) if avg_rating else 0
            
            # Apply min rating filter
            if min_rating and avg_rating < min_rating:
                continue
            
            # Get total bookings count
            total_bookings = db.query(Booking).filter(
                Booking.provider_id == p.id,
                Booking.status != 'Cancelled'
            ).count()
            
            providers_list.append({
                "id": p.id,
                "name": p.name,
                "service": p.service,
                "location": p.location,
                "experience": p.experience,
                "rating": str(avg_rating) if avg_rating > 0 else "New",
                "price": p.price,
                "category": p.category,
                "total_bookings": total_bookings,
                "is_active": p.is_active
            })
        
        return {
            "success": True,
            "count": len(providers_list),
            "providers": providers_list
        }
    
    except Exception as e:
        print(f"Error in providers endpoint: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching providers: {str(e)}"
        )

@router.get("/providers/{provider_id}")
def get_provider_details(
    provider_id: int,
    db: Session = Depends(get_db)
):
    """Get provider details by ID"""
    try:
        provider = db.query(User).filter(
            User.id == provider_id,
            User.role == "provider",
            User.is_active == 1
        ).first()
        
        if not provider:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Provider not found"
            )
        
        # Get provider's bookings
        total_bookings = db.query(Booking).filter(
            Booking.provider_id == provider_id,
            Booking.status != 'Cancelled'
        ).count()
        
        # Get provider's reviews
        reviews = db.query(Review).filter(
            Review.provider_id == provider_id
        ).all()
        
        avg_rating = 0
        if reviews:
            total_rating = sum(r.rating for r in reviews)
            avg_rating = total_rating / len(reviews)
        
        return {
            "success": True,
            "provider": {
                "id": provider.id,
                "name": provider.name,
                "email": provider.email,
                "service": provider.service,
                "location": provider.location,
                "experience": provider.experience,
                "rating": provider.rating,
                "price": provider.price,
                "category": provider.category,
                "total_bookings": total_bookings,
                "total_reviews": len(reviews),
                "average_rating": round(avg_rating, 1) if avg_rating > 0 else "New"
            }
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching provider details: {str(e)}"
        )

@router.put("/users/{user_id}")
def update_user(
    user_id: int,
    user_update: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update user details"""
    try:
        # Check if user is updating their own profile or is admin
        if current_user.id != user_id and current_user.role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to update this user"
            )
        
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Update fields
        allowed_fields = ["name", "service", "location", "experience", "price", "category"]
        for field in allowed_fields:
            if field in user_update:
                setattr(user, field, user_update[field])
        
        # Only admin can update role and is_active
        if current_user.role == "admin":
            if "role" in user_update:
                user.role = user_update["role"]
            if "is_active" in user_update:
                user.is_active = 1 if user_update["is_active"] else 0
        
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
                "service": user.service,
                "location": user.location,
                "is_active": user.is_active
            }
        }
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating user: {str(e)}"
        )

@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete user (soft delete)"""
    try:
        # Only admin can delete users
        if current_user.role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admin can delete users"
            )
        
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        user.is_active = 0  # Soft delete
        user.updated_at = datetime.now()
        db.commit()
        
        return {
            "success": True,
            "message": f"User {user.email} has been deactivated"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting user: {str(e)}"
        )

@router.get("/users")
def get_all_users(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all users (admin only)"""
    try:
        if current_user.role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admin can view all users"
            )
        
        users = db.query(User).all()
        
        return {
            "success": True,
            "count": len(users),
            "users": [
                {
                    "id": u.id,
                    "name": u.name,
                    "email": u.email,
                    "role": u.role,
                    "is_active": u.is_active,
                    "service": u.service,
                    "location": u.location
                }
                for u in users
            ]
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching users: {str(e)}"
        )

@router.post("/change-password")
def change_password(
    password_data: PasswordChange,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Change user password"""
    try:
        user = db.query(User).filter(User.id == current_user.id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Verify current password
        if not verify_password(password_data.current_password, user.password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Current password is incorrect"
            )
        
        # Update password
        user.password = hash_password(password_data.new_password)
        user.updated_at = datetime.now()
        db.commit()
        
        return {
            "success": True,
            "message": "Password changed successfully"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error changing password: {str(e)}"
        )

# =========================================================
# PASSWORD RESET ENDPOINTS
# =========================================================

@router.post("/forgot-password")
def forgot_password(
    request: PasswordResetRequest,
    db: Session = Depends(get_db)
):
    """Request password reset - sends email with reset link"""
    try:
        user = db.query(User).filter(User.email == request.email).first()
        if not user:
            # Don't reveal if user exists or not (security best practice)
            return {
                "success": True,
                "message": "If your email is registered, you will receive a password reset link"
            }
        
        # Create password reset token (expires in 1 hour)
        reset_token = create_access_token(
            data={"sub": str(user.id), "reset": True},
            expires_delta=timedelta(hours=1)
        )
        
        # Try to send email with reset link
        try:
            from app.email_service import send_password_reset_email
            email_sent = send_password_reset_email(
                to_email=user.email,
                reset_token=reset_token,
                user_name=user.name
            )
            
            if email_sent:
                print(f"✅ Password reset email sent to {user.email}")
                return {
                    "success": True,
                    "message": "Password reset link sent to your email! 📧"
                }
            else:
                # Email failed - log but still return success
                print(f"⚠️ Failed to send password reset email to {user.email}")
                return {
                    "success": True,
                    "message": "If your email is registered, you will receive a password reset link"
                }
                
        except ImportError:
            # Email service not configured - return token for development
            print(f"⚠️ Email service not configured. Returning token for development.")
            return {
                "success": True,
                "message": "Password reset link (Development Mode)",
                "reset_token": reset_token,
                "reset_link": f"http://localhost:5173/reset-password?token={reset_token}"
            }
        except Exception as e:
            print(f"❌ Email error: {str(e)}")
            return {
                "success": True,
                "message": "If your email is registered, you will receive a password reset link"
            }
        
    except Exception as e:
        print(f"❌ Error in forgot-password: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing password reset: {str(e)}"
        )

@router.post("/reset-password")
def reset_password(
    reset_data: PasswordResetConfirm,
    db: Session = Depends(get_db)
):
    """Reset password with token"""
    try:
        # Decode and verify token
        try:
            payload = jwt.decode(reset_data.token, SECRET_KEY, algorithms=[ALGORITHM])
            user_id = payload.get("sub")
            is_reset = payload.get("reset", False)
        except JWTError as e:
            print(f"❌ JWT decode error: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired reset token. Please request a new password reset."
            )
        
        if not is_reset:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid reset token. Please request a new password reset."
            )
        
        # Find user
        user = db.query(User).filter(User.id == int(user_id)).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Validate new password
        if len(reset_data.new_password) < 6:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password must be at least 6 characters long"
            )
        
        # Update password
        user.password = hash_password(reset_data.new_password)
        user.updated_at = datetime.now()
        db.commit()
        
        print(f"✅ Password reset successful for user: {user.email}")
        
        return {
            "success": True,
            "message": "Password reset successfully! You can now login with your new password."
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"❌ Error resetting password: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error resetting password: {str(e)}"
        )

# =========================================================
# ADMIN USER MANAGEMENT ENDPOINTS
# =========================================================

# ✅ NEW: Get all users with roles (Admin only)
@router.get("/admin/users/roles")
def get_all_user_roles(
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Get all users with their roles (Admin only)"""
    try:
        users = db.query(User).all()
        return {
            "success": True,
            "count": len(users),
            "users": [
                {
                    "id": u.id,
                    "name": u.name,
                    "email": u.email,
                    "role": u.role,
                    "is_active": u.is_active,
                    "created_at": u.created_at.isoformat() if u.created_at else None
                }
                for u in users
            ]
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching users: {str(e)}"
        )

# ✅ NEW: Update user role (Admin only)
@router.put("/admin/users/{user_id}/role")
def update_user_role(
    user_id: int,
    role_update: dict,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Update user role (Admin only)"""
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        new_role = role_update.get("role")
        if new_role not in ["admin", "provider", "customer"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid role. Must be: admin, provider, or customer"
            )
        
        # Prevent admin from changing their own role
        if user.id == current_admin.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You cannot change your own role"
            )
        
        user.role = new_role
        user.updated_at = datetime.now()
        db.commit()
        db.refresh(user)
        
        return {
            "success": True,
            "message": f"User {user.name}'s role updated to {new_role}",
            "user": {
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "role": user.role
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating role: {str(e)}"
        )

@router.put("/admin/users/{user_id}/block")
def block_user_admin(
    user_id: int,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Block a user (Admin only)"""
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        if user.role == "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot block another admin"
            )
        
        user.is_active = 0
        user.updated_at = datetime.now()
        db.commit()
        
        return {
            "success": True,
            "message": f"User {user.name} has been blocked"
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error blocking user: {str(e)}"
        )

@router.put("/admin/users/{user_id}/unblock")
def unblock_user_admin(
    user_id: int,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Unblock a user (Admin only)"""
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        user.is_active = 1
        user.updated_at = datetime.now()
        db.commit()
        
        return {
            "success": True,
            "message": f"User {user.name} has been unblocked"
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error unblocking user: {str(e)}"
        )

@router.delete("/admin/users/{user_id}")
def delete_user_admin(
    user_id: int,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Delete a user (Admin only)"""
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        if user.role == "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot delete another admin"
            )
        
        db.delete(user)
        db.commit()
        
        return {
            "success": True,
            "message": f"User {user.name} has been deleted"
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting user: {str(e)}"
        )

# =========================================================
# DEBUG ENDPOINT
# =========================================================

@router.get("/debug-providers")
def debug_providers(db: Session = Depends(get_db)):
    """Debug endpoint to check providers (remove in production)"""
    try:
        providers = db.query(User).filter(User.role == "provider").all()
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
                    "location": p.location
                }
                for p in providers
            ]
        }
    except Exception as e:
        return {"error": str(e)}