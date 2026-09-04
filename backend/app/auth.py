from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .database import get_db
from .models import User
from .schemas import UserCreate
from .security import hash_password, verify_password


router = APIRouter()


@router.post("/register")
def register(
    user: UserCreate,
    db: Session = Depends(get_db)
):

    existing_user = db.query(User).filter(
        User.email == user.email
    ).first()

    if existing_user:
        return {
            "message": "Email already registered"
        }

    hashed_password = hash_password(user.password)

    new_user = User(
        name=user.name,
        email=user.email,
        password=hashed_password,
        role=user.role,

        # Provider details
        service=user.service,
        location=user.location,
        experience=user.experience,
        price=user.price,

        # Default rating for new providers
        rating="New"
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {
        "message": "User registered successfully",
        "user_id": new_user.id
    }


@router.post("/login")
def login(
    email: str,
    password: str,
    db: Session = Depends(get_db)
):

    user = db.query(User).filter(
        User.email == email
    ).first()

    if not user:
        return {
            "message": "Invalid email or password"
        }

    # BLOCKED USER CHECK
    if user.is_active == 0:
        return {
            "message": "Your account has been blocked by admin"
        }

    if not verify_password(password, user.password):
        return {
            "message": "Invalid email or password"
        }

    return {
        "message": "Login successful",
        "user_id": user.id,
        "name": user.name,
        "role": user.role
    }