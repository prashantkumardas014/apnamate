# backend/app/admin_routes.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app import models
from datetime import datetime

router = APIRouter(prefix="/admin", tags=["Admin"])

@router.get("/dashboard/stats")
async def get_admin_stats(db: Session = Depends(get_db)):
    """Get admin dashboard statistics"""
    try:
        total_users = db.query(models.User).count()
        total_providers = db.query(models.User).filter(models.User.role == "provider").count()
        total_bookings = db.query(models.Booking).count()
        pending_bookings = db.query(models.Booking).filter(models.Booking.status == "Pending").count()
        
        return {
            "success": True,
            "stats": {
                "total_users": total_users,
                "total_providers": total_providers,
                "total_bookings": total_bookings,
                "pending_bookings": pending_bookings
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))