from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models import User, Restaurant, Favorite, Review
from schemas import FavoriteResponse
from utils.security import get_current_user

router = APIRouter(prefix="/favorites", tags=["Favorites"])


@router.post("/{restaurant_id}", response_model=FavoriteResponse, status_code=status.HTTP_201_CREATED)
def add_favorite(
    restaurant_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    restaurant = db.query(Restaurant).filter(
        Restaurant.id == restaurant_id).first()
    if not restaurant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Restaurant not found"
        )

    existing = db.query(Favorite).filter(
        Favorite.user_id == current_user.id,
        Favorite.restaurant_id == restaurant_id
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Already in favorites"
        )

    favorite = Favorite(
        user_id=current_user.id,
        restaurant_id=restaurant_id
    )
    db.add(favorite)
    db.commit()
    db.refresh(favorite)

    return FavoriteResponse(
        id=int(favorite.id),
        restaurant_id=int(favorite.restaurant_id),
        restaurant_name=str(restaurant.name),
        created_at=favorite.created_at,
    )


@router.delete("/{restaurant_id}", status_code=status.HTTP_200_OK)
def remove_favorite(
    restaurant_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    favorite = db.query(Favorite).filter(
        Favorite.user_id == current_user.id,
        Favorite.restaurant_id == restaurant_id
    ).first()

    if not favorite:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Favorite not found"
        )

    db.delete(favorite)
    db.commit()

    return {"message": "Removed from favorites"}


@router.get("", response_model=list[FavoriteResponse])
def list_favorites(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    favorites = (
        db.query(Favorite, Restaurant.name)
        .join(Restaurant, Favorite.restaurant_id == Restaurant.id)
        .filter(Favorite.user_id == current_user.id)
        .order_by(Favorite.created_at.desc())
        .all()
    )

    return [
        FavoriteResponse(
            id=int(fav.id),
            restaurant_id=int(fav.restaurant_id),
            restaurant_name=name,
            created_at=fav.created_at
        )
        for fav, name in favorites
    ]


@router.get("/me/history", response_model=dict)
def get_user_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Reviews written by user
    reviews = (
        db.query(Review, Restaurant.name)
        .join(Restaurant, Review.restaurant_id == Restaurant.id)
        .filter(Review.user_id == current_user.id)
        .order_by(Review.created_at.desc())
        .all()
    )

    review_history = [
        {
            "type": "review",
            "review_id": int(review.id),
            "restaurant_id": int(review.restaurant_id),
            "restaurant_name": name,
            "rating": int(review.rating),
            "comment": str(review.comment) if review.comment else None,
            "date": review.created_at,
        }
        for review, name in reviews
    ]

    # Restaurants added by user
    restaurants = (
        db.query(Restaurant)
        .filter(Restaurant.owner_id == current_user.id)
        .order_by(Restaurant.created_at.desc())
        .all()
    )

    restaurant_history = [
        {
            "type": "restaurant_added",
            "restaurant_id": int(r.id),
            "restaurant_name": str(r.name),
            "date": r.created_at,
        }
        for r in restaurants
    ]

    return {
        "reviews": review_history,
        "restaurants_added": restaurant_history,
    }
