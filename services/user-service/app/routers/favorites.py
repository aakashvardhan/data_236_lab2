from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status

from app.database import get_db
from app.schemas import FavoriteResponse
from app.utils.security import get_current_user

router = APIRouter(prefix="/favorites", tags=["Favorites"])


@router.post(
    "/{restaurant_id}",
    response_model=FavoriteResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_favorite(
    restaurant_id: str,
    current_user: dict = Depends(get_current_user),
):
    mongo = get_db()

    restaurant = await mongo.restaurants.find_one(
        {"_id": ObjectId(restaurant_id)}, {"name": 1}
    )
    if not restaurant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Restaurant not found",
        )

    existing = await mongo.favorites.find_one(
        {"user_id": current_user["id"], "restaurant_id": restaurant_id}
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Already in favorites",
        )

    fav_doc = {
        "user_id": current_user["id"],
        "restaurant_id": restaurant_id,
        "restaurant_name": restaurant.get("name", ""),
        "created_at": datetime.now(timezone.utc),
    }
    result = await mongo.favorites.insert_one(fav_doc)

    return FavoriteResponse(
        id=str(result.inserted_id),
        restaurant_id=restaurant_id,
        restaurant_name=restaurant.get("name", ""),
        created_at=fav_doc["created_at"],
    )


@router.delete("/{restaurant_id}", status_code=status.HTTP_200_OK)
async def remove_favorite(
    restaurant_id: str,
    current_user: dict = Depends(get_current_user),
):
    mongo = get_db()
    result = await mongo.favorites.delete_one(
        {"user_id": current_user["id"], "restaurant_id": restaurant_id}
    )
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Favorite not found",
        )

    return {"message": "Removed from favorites"}


@router.get("", response_model=list[FavoriteResponse])
async def list_favorites(current_user: dict = Depends(get_current_user)):
    mongo = get_db()
    cursor = mongo.favorites.find({"user_id": current_user["id"]}).sort(
        "created_at", -1
    )
    favorites = await cursor.to_list(length=500)

    results: list[FavoriteResponse] = []
    for fav in favorites:
        restaurant_name = fav.get("restaurant_name", "")
        if not restaurant_name:
            restaurant = await mongo.restaurants.find_one(
                {"_id": ObjectId(fav["restaurant_id"])}, {"name": 1}
            )
            restaurant_name = restaurant.get("name", "") if restaurant else ""

        results.append(
            FavoriteResponse(
                id=str(fav["_id"]),
                restaurant_id=fav["restaurant_id"],
                restaurant_name=restaurant_name,
                created_at=fav["created_at"],
            )
        )

    return results


@router.get("/me/history", response_model=dict)
async def get_user_history(current_user: dict = Depends(get_current_user)):
    mongo = get_db()

    review_cursor = (
        mongo.reviews.find({"user_id": current_user["id"]})
        .sort("created_at", -1)
    )
    reviews = await review_cursor.to_list(length=500)

    review_history: list[dict] = []
    for review in reviews:
        restaurant = await mongo.restaurants.find_one(
            {"_id": ObjectId(review["restaurant_id"])}, {"name": 1}
        )
        review_history.append(
            {
                "type": "review",
                "review_id": str(review["_id"]),
                "restaurant_id": review["restaurant_id"],
                "restaurant_name": restaurant.get("name", "") if restaurant else "",
                "rating": review["rating"],
                "comment": review.get("comment"),
                "date": review["created_at"],
            }
        )

    restaurant_cursor = (
        mongo.restaurants.find({"owner_id": current_user["id"]})
        .sort("created_at", -1)
    )
    restaurants = await restaurant_cursor.to_list(length=500)

    restaurant_history: list[dict] = [
        {
            "type": "restaurant_added",
            "restaurant_id": str(r["_id"]),
            "restaurant_name": r.get("name", ""),
            "date": r.get("created_at"),
        }
        for r in restaurants
    ]

    return {"reviews": review_history, "restaurants_added": restaurant_history}
