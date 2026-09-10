# backend/app/routes/reviews.py
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from datetime import datetime, timedelta
from typing import Optional
from pydantic import BaseModel

from app.database import get_db
from app.models import User, Booking, Review, Notification
from app.auth import get_current_user

router = APIRouter()

# ==============================
# PYDANTIC SCHEMAS
# ==============================

class ReviewCreate(BaseModel):
    booking_id: int
    rating: int  # 1-5
    comment: str

class ReviewUpdate(BaseModel):
    rating: Optional[int] = None
    comment: Optional[str] = None

class ReviewResponse(BaseModel):
    id: int
    booking_id: int
    customer_id: int
    provider_id: int
    rating: int
    comment: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    customer_name: Optional[str] = None
    provider_name: Optional[str] = None

# ==============================
# ROUTES
# ==============================

@router.post("/reviews")
async def create_review(
    review_data: ReviewCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Customer creates a review for a completed booking"""
    
    print("=" * 60)
    print("📝 REVIEW SUBMISSION")
    print("=" * 60)
    print(f"📤 Booking ID: {review_data.booking_id}")
    print(f"📤 Rating: {review_data.rating}")
    print(f"📤 Comment: {review_data.comment[:50] if review_data.comment else 'EMPTY'}...")
    print(f"👤 User: {current_user.id} - {current_user.role} - {current_user.name}")
    
    # 1. Check if user is customer
    if current_user.role != "customer":
        print(f"❌ User is not a customer: {current_user.role}")
        raise HTTPException(status_code=403, detail="Only customers can write reviews")
    
    # 2. Check if booking exists and belongs to this customer
    booking = db.query(Booking).filter(
        Booking.id == review_data.booking_id,
        Booking.customer_id == current_user.id
    ).first()
    
    if not booking:
        print(f"❌ Booking {review_data.booking_id} not found for customer {current_user.id}")
        raise HTTPException(status_code=404, detail="Booking not found or not yours")
    
    print(f"✅ Booking found: ID={booking.id}, Status='{booking.status}', Service='{booking.service}'")
    
    # 3. Check if booking is completed
    if booking.status.lower() != "completed":
        print(f"❌ Booking status is '{booking.status}', not 'completed'")
        raise HTTPException(
            status_code=400, 
            detail=f"Can only review completed bookings. Current status: {booking.status}"
        )
    
    # 4. Check if already reviewed
    existing_review = db.query(Review).filter(
        Review.booking_id == review_data.booking_id
    ).first()
    
    if existing_review:
        print(f"❌ Booking already has a review")
        raise HTTPException(status_code=400, detail="You already reviewed this booking")
    
    # 5. Validate rating
    if review_data.rating < 1 or review_data.rating > 5:
        print(f"❌ Invalid rating: {review_data.rating}")
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")
    
    # 6. Create review
    try:
        new_review = Review(
            booking_id=review_data.booking_id,
            customer_id=current_user.id,
            provider_id=booking.provider_id,
            rating=review_data.rating,
            comment=review_data.comment,
            created_at=datetime.now()
        )
        
        db.add(new_review)
        db.commit()
        db.refresh(new_review)
        
        print(f"✅ Review created: ID={new_review.id}")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Database error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    
    # 7. Update provider's average rating
    try:
        update_provider_rating(booking.provider_id, db)
        print(f"✅ Provider rating updated")
    except Exception as e:
        print(f"⚠️ Error updating provider rating: {str(e)}")
    
    # 8. Create notification for provider
    try:
        notification = Notification(
            user_id=booking.provider_id,
            title="New Review Received! ⭐",
            message=f"{current_user.name} gave you {review_data.rating}⭐ for '{booking.service}'",
            type="review",
            created_at=datetime.now()
        )
        db.add(notification)
        db.commit()
        print(f"✅ Notification sent")
    except Exception as e:
        print(f"⚠️ Error creating notification: {str(e)}")
    
    print("=" * 60)
    print("✅ Review submitted successfully!")
    print("=" * 60)
    
    return {
        "success": True,
        "message": "Review submitted successfully!",
        "review": {
            "id": new_review.id,
            "rating": new_review.rating,
            "comment": new_review.comment,
            "created_at": new_review.created_at
        }
    }

@router.put("/reviews/{review_id}")
async def update_review(
    review_id: int,
    review_update: ReviewUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a review (only by the customer who wrote it)"""
    
    review = db.query(Review).filter(Review.id == review_id).first()
    
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    
    if review.customer_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only edit your own reviews")
    
    if review_update.rating is not None:
        if review_update.rating < 1 or review_update.rating > 5:
            raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")
        review.rating = review_update.rating
    
    if review_update.comment is not None:
        if len(review_update.comment.strip()) < 3:
            raise HTTPException(status_code=400, detail="Comment must be at least 3 characters")
        review.comment = review_update.comment.strip()
    
    review.updated_at = datetime.now()
    
    db.commit()
    db.refresh(review)
    
    update_provider_rating(review.provider_id, db)
    
    customer = db.query(User).filter(User.id == review.customer_id).first()
    provider = db.query(User).filter(User.id == review.provider_id).first()
    
    return {
        "success": True,
        "message": "Review updated successfully!",
        "review": {
            "id": review.id,
            "rating": review.rating,
            "comment": review.comment,
            "created_at": review.created_at,
            "updated_at": review.updated_at,
            "customer_name": customer.name if customer else "Unknown",
            "provider_name": provider.name if provider else "Unknown"
        }
    }

@router.delete("/reviews/{review_id}")
async def delete_review(
    review_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a review (only by the customer who wrote it)"""
    
    review = db.query(Review).filter(Review.id == review_id).first()
    
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    
    if review.customer_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only delete your own reviews")
    
    provider_id = review.provider_id
    db.delete(review)
    db.commit()
    
    update_provider_rating(provider_id, db)
    
    return {
        "success": True,
        "message": "Review deleted successfully!"
    }

@router.get("/reviews/booking/{booking_id}")
async def check_booking_review(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Check if a booking has been reviewed by the current user"""
    
    review = db.query(Review).filter(
        Review.booking_id == booking_id,
        Review.customer_id == current_user.id
    ).first()
    
    return {
        "has_reviewed": review is not None,
        "review": {
            "id": review.id,
            "rating": review.rating,
            "comment": review.comment,
            "created_at": review.created_at,
            "updated_at": review.updated_at
        } if review else None
    }

@router.get("/reviews/provider/{provider_id}")
async def get_provider_reviews(
    provider_id: int,
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db)
):
    """Get all reviews for a provider with pagination"""
    
    provider = db.query(User).filter(
        User.id == provider_id,
        User.role == "provider"
    ).first()
    
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    
    total_count = db.query(Review).filter(
        Review.provider_id == provider_id
    ).count()
    
    offset = (page - 1) * limit
    reviews = db.query(Review).filter(
        Review.provider_id == provider_id
    ).order_by(desc(Review.created_at)).offset(offset).limit(limit).all()
    
    distribution = db.query(
        Review.rating,
        func.count(Review.id)
    ).filter(Review.provider_id == provider_id).group_by(Review.rating).all()
    
    rating_dist = {r: 0 for r in range(1, 6)}
    for rating, count in distribution:
        rating_dist[rating] = count
    
    avg_rating = db.query(func.avg(Review.rating)).filter(
        Review.provider_id == provider_id
    ).scalar() or 0
    
    reviews_list = []
    for r in reviews:
        customer = db.query(User).filter(User.id == r.customer_id).first()
        reviews_list.append({
            "id": r.id,
            "rating": r.rating,
            "comment": r.comment,
            "created_at": r.created_at,
            "updated_at": r.updated_at,
            "customer_name": customer.name if customer else "Unknown",
            "customer_id": r.customer_id
        })
    
    return {
        "provider_id": provider_id,
        "provider_name": provider.name,
        "average_rating": round(float(avg_rating), 1),
        "total_reviews": total_count,
        "rating_distribution": rating_dist,
        "page": page,
        "limit": limit,
        "reviews": reviews_list
    }

@router.get("/reviews/customer/my-reviews")
async def get_my_reviews(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all reviews written by the current customer"""
    
    if current_user.role != "customer":
        raise HTTPException(status_code=403, detail="Only customers can access this")
    
    reviews = db.query(Review).filter(
        Review.customer_id == current_user.id
    ).order_by(desc(Review.created_at)).all()
    
    reviews_list = []
    for r in reviews:
        provider = db.query(User).filter(User.id == r.provider_id).first()
        booking = db.query(Booking).filter(Booking.id == r.booking_id).first()
        reviews_list.append({
            "id": r.id,
            "booking_id": r.booking_id,
            "provider_id": r.provider_id,
            "provider_name": provider.name if provider else "Unknown",
            "rating": r.rating,
            "comment": r.comment,
            "created_at": r.created_at,
            "updated_at": r.updated_at,
            "service": booking.service if booking else "Unknown"
        })
    
    return {
        "total": len(reviews_list),
        "reviews": reviews_list
    }

# ==============================
# ANALYTICS ENDPOINT
# ==============================

@router.get("/analytics/provider/{provider_id}")
async def get_review_analytics(
    provider_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get review analytics for a provider"""
    
    if current_user.id != provider_id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to view these analytics")
    
    reviews = db.query(Review).filter(
        Review.provider_id == provider_id
    ).order_by(Review.created_at.desc()).all()
    
    total_reviews = len(reviews)
    
    if total_reviews == 0:
        return {
            "total_reviews": 0,
            "average_rating": 0,
            "rating_distribution": {1: 0, 2: 0, 3: 0, 4: 0, 5: 0},
            "monthly_trend": [],
            "recent_reviews": []
        }
    
    total_rating = sum(r.rating for r in reviews)
    average_rating = round(total_rating / total_reviews, 1)
    
    distribution = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
    for review in reviews:
        distribution[review.rating] = distribution.get(review.rating, 0) + 1
    
    monthly_data = {}
    today = datetime.now()
    
    for i in range(6):
        month = today - timedelta(days=30 * i)
        month_key = month.strftime("%Y-%m")
        monthly_data[month_key] = {"total": 0, "avg": 0, "count": 0}
    
    for review in reviews:
        if review.created_at:
            month_key = review.created_at.strftime("%Y-%m")
            if month_key in monthly_data:
                monthly_data[month_key]["total"] += review.rating
                monthly_data[month_key]["count"] += 1
    
    for key in monthly_data:
        if monthly_data[key]["count"] > 0:
            monthly_data[key]["avg"] = round(monthly_data[key]["total"] / monthly_data[key]["count"], 1)
    
    monthly_trend = [
        {
            "month": key,
            "average_rating": data["avg"],
            "total_reviews": data["count"]
        }
        for key, data in sorted(monthly_data.items())
    ]
    
    recent_reviews = []
    for review in reviews[:10]:
        customer = db.query(User).filter(User.id == review.customer_id).first()
        recent_reviews.append({
            "id": review.id,
            "rating": review.rating,
            "comment": review.comment,
            "customer_name": customer.name if customer else "Unknown",
            "created_at": review.created_at.isoformat() if review.created_at else None,
            "updated_at": review.updated_at.isoformat() if review.updated_at else None
        })
    
    return {
        "total_reviews": total_reviews,
        "average_rating": average_rating,
        "rating_distribution": distribution,
        "monthly_trend": monthly_trend,
        "recent_reviews": recent_reviews
    }

# ==============================
# ✅ ADMIN REVIEWS ENDPOINT - FIXED
# ==============================

@router.get("/admin/reviews")
async def get_all_reviews_admin(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all reviews (Admin only)"""
    
    # Check if user is admin
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    try:
        # Get all reviews with related data
        reviews = db.query(Review).order_by(desc(Review.created_at)).all()
        
        reviews_list = []
        for review in reviews:
            # Get customer name
            customer = db.query(User).filter(User.id == review.customer_id).first()
            # Get provider name
            provider = db.query(User).filter(User.id == review.provider_id).first()
            # Get booking service
            booking = db.query(Booking).filter(Booking.id == review.booking_id).first()
            
            reviews_list.append({
                "id": review.id,
                "booking_id": review.booking_id,
                "customer_id": review.customer_id,
                "customer_name": customer.name if customer else "Unknown",
                "provider_id": review.provider_id,
                "provider_name": provider.name if provider else "Unknown",
                "service": booking.service if booking else "Unknown",
                "rating": review.rating,
                "comment": review.comment,
                "created_at": review.created_at.isoformat() if review.created_at else None,
                "updated_at": review.updated_at.isoformat() if review.updated_at else None
            })
        
        return {
            "success": True,
            "total": len(reviews_list),
            "reviews": reviews_list
        }
        
    except Exception as e:
        print(f"❌ Error fetching admin reviews: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching reviews: {str(e)}"
        )

# ==============================
# HELPER FUNCTIONS
# ==============================

def update_provider_rating(provider_id: int, db: Session):
    """Update provider's average rating and total count"""
    
    avg_rating = db.query(func.avg(Review.rating)).filter(
        Review.provider_id == provider_id
    ).scalar() or 0
    
    total_reviews = db.query(Review).filter(
        Review.provider_id == provider_id
    ).count()
    
    provider = db.query(User).filter(User.id == provider_id).first()
    if provider:
        provider.rating = str(round(float(avg_rating), 1))
        db.commit()
    
    return {
        "average_rating": round(float(avg_rating), 1),
        "total_reviews": total_reviews
    }