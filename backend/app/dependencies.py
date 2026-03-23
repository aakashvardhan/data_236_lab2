from fastapi import Depends, HTTPException, Path
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth import get_current_user
from app.models import Restaurant, Review


async def get_owned_restaurant(
    restaurant_id: int = Path(..., ge=1),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
) -> Restaurant:
    restaurant = db.query(Restaurant).filter(
        Restaurant.id == restaurant_id).first()
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    if restaurant.owner_id != current_user.id:  # type: ignore[arg-type]
        raise HTTPException(status_code=403, detail="Not your restaurant")
    return restaurant


async def get_own_review(
    review_id: int = Path(..., ge=1),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
) -> Review:
    review = db.query(Review).filter(Review.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    if review.user_id != current_user.id:  # type: ignore[arg-type]
        raise HTTPException(status_code=403, detail="Not your review")
    return review
