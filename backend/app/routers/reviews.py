from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, Restaurant, Review
from app.schemas import ReviewCreate, ReviewResponse, ReviewUpdate
from app.utils.security import get_current_user
from app.utils.ratings import recalculate_rating
router = APIRouter(tags=["Reviews"])

def _get_user_review(review_id: int, user_id, db: Session) -> Review:
    review = db.query(Review).filter(Review.id == review_id).first()
    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found"
        )
    if int(review.user_id) != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only modify your own reviews"
        )
    return review

@router.post("/restaurants/{restaurant_id}/reviews", response_model=ReviewResponse, status_code=status.HTTP_201_CREATED)
def create_review(
    restaurant_id: int,
    request: ReviewCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Check Restaurant status
    restaurant = db.query(Restaurant).filter(
        Restaurant.id == restaurant_id).first()
    if not restaurant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Restaurant not found"
        )

    # check if user already reviewed the restaurant
    existing = db.query(Review).filter(
        Review.user_id == current_user.id,
        Review.restaurant_id == restaurant_id
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already reviewed this restaurant"
        )

    review = Review(
        user_id=current_user.id,
        restaurant_id=restaurant_id,
        rating=request.rating,
        comment=request.comment
    )
    db.add(review)
    db.flush()

    # Update restaurant avg_rating and review_count
    recalculate_rating(db, restaurant_id)

    db.commit()
    db.refresh(review)

    return ReviewResponse(
        id=int(review.id),
        user_id=int(review.user_id),
        restaurant_id=int(review.restaurant_id),
        rating=int(review.rating),
        comment=str(review.comment) if review.comment is not None else None,
        created_at=review.created_at,
        updated_at=review.updated_at,
        user_name=str(current_user.name)
    )


@router.get("/restaurants/{restaurant_id}/reviews", response_model=list[ReviewResponse])
def list_reviews(
    restaurant_id: int,
    db: Session = Depends(get_db)
):
    restaurant = db.query(Restaurant).filter(
        Restaurant.id == restaurant_id).first()

    if not restaurant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Restaurant not found"
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
            id=review.id,
            user_id=review.user_id,
            restaurant_id=review.restaurant_id,
            rating=int(review.rating),
            comment=review.comment,
            created_at=review.created_at,
            updated_at=review.updated_at,
            user_name=name,
        )
        for review, name in reviews
    ]


@router.put("/reviews/{review_id}", response_model=ReviewResponse)
def update_review(
    review_id: int,
    request: ReviewUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    #aakash updated this
    # review = db.query(Review).filter(Review.id == review_id).first()

    # if not review:
    #     raise HTTPException(
    #         status_code=status.HTTP_404_NOT_FOUND,
    #         detail="Review not found"
    #     )

    # if int(review.user_id) != current_user.id:
    #     raise HTTPException(
    #         status_code=status.HTTP_403_FORBIDDEN,
    #         detail="You can only update your own reviews"
    #     )
    #to this
    review = _get_user_review(review_id, current_user.id, db)
    update_data = request.model_dump(exclude_unset=True)
    for k, v in update_data.items():
        setattr(review, k, v)

    # Recalculate avg_rating if rating changed
    if "rating" in update_data:
        recalculate_rating(db, int(review.restaurant_id))

    db.commit()
    db.refresh(review)

    return ReviewResponse(
        id=int(review.id),
        user_id=int(review.user_id),
        restaurant_id=int(review.restaurant_id),
        rating=int(review.rating),
        comment=str(review.comment) if review.comment else None,
        created_at=review.created_at,
        updated_at=review.updated_at,
        user_name=str(current_user.name),
    )


@router.delete("/reviews/{review_id}", status_code=status.HTTP_200_OK)
def delete_review(
    review_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # review = db.query(Review).filter(Review.id == review_id).first()

    # if not review:
    #     raise HTTPException(
    #         status_code=status.HTTP_404_NOT_FOUND,
    #         detail="Review not found"
    #     )

    # if int(review.user_id) != current_user.id:
    #     raise HTTPException(
    #         status_code=status.HTTP_403_FORBIDDEN,
    #         detail="You can only delete your own reviews"
    #     )
    review = _get_user_review(review_id, current_user.id, db)
    restaurant_id = int(review.restaurant_id)
    db.delete(review)
    db.flush()

    # Recalculate avg_rating and review count
    recalculate_rating(db, restaurant_id)

    db.commit()

    return {"message": "Review deleted successfully"}
