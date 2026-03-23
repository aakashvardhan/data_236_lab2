from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models import User, Restaurant, Review
from schemas import RestaurantResponse, ReviewResponse
from utils.security import get_current_user
router = APIRouter(prefix="/owner", tags=["Owner"])


@router.get("/restaurants", response_model=list[RestaurantResponse])
def get_own_restaurants(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if str(current_user.role) != "owner":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only owners can access this endpoint",
        )

    restaurants = (
        db.query(Restaurant)
        .filter(Restaurant.owner_id == current_user.id)
        .order_by(Restaurant.created_at.desc())
        .all()
    )

    return restaurants


@router.get("/restaurants/{restaurant_id}/reviews", response_model=list[ReviewResponse])
def get_reviews_for_own_restaurant(
    restaurant_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if str(current_user.role) != "owner":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only owners can access this endpoint",
        )

    restaurant = db.query(Restaurant).filter(
        Restaurant.id == restaurant_id,
        Restaurant.owner_id == current_user.id,
    ).first()

    if not restaurant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Restaurant not found or not owned by you",
        )

    reviews = (
        db.query(Review, User.name)
        .join(User, Review.user_id == User.id)
        .filter(Review.restaurant_id == restaurant_id)
        .order_by(Review.created_at.desc())
        .all()
    )

    return [
        ReviewResponse(
            id=int(review.id),
            user_id=int(review.user_id),
            restaurant_id=int(review.restaurant_id),
            rating=int(review.rating),
            comment=str(review.comment) if review.comment else None,
            created_at=review.created_at,  # type: ignore
            updated_at=review.updated_at,  # type: ignore
            user_name=name,
        )
        for review, name in reviews
    ]


@router.get("/restaurants/{restaurant_id}/analytics", response_model=dict)
def get_restaurant_analytics(
    restaurant_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if str(current_user.role) != "owner":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only owners can access this endpoint",
        )

    restaurant = db.query(Restaurant).filter(
        Restaurant.id == restaurant_id,
        Restaurant.owner_id == current_user.id,
    ).first()

    if not restaurant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Restaurant not found or not owned by you",
        )

    reviews = (
        db.query(Review)
        .filter(Review.restaurant_id == restaurant_id)
        .order_by(Review.created_at.desc())
        .all()
    )

    # Rating distribution
    distribution = {"1": 0, "2": 0, "3": 0, "4": 0, "5": 0}
    for review in reviews:
        distribution[str(int(review.rating))] += 1

    # Recent reviews (last 5)
    recent = [
        {
            "id": int(r.id),
            "rating": int(r.rating),
            "comment": str(r.comment) if r.comment else None,
            "created_at": r.created_at,
        }
        for r in reviews[:5]
    ]

    return {
        "restaurant_id": int(restaurant.id),
        "restaurant_name": str(restaurant.name),
        "total_reviews": len(reviews),
        "avg_rating": float(restaurant.avg_rating or 0),
        "review_count": int(restaurant.review_count or 0),
        "rating_distribution": distribution,
        "recent_reviews": recent,
    }
