from fastapi import APIRouter, Depends, HTTPException, status
from bson import ObjectId
from bson.errors import InvalidId
from app.database import get_db
from app.schemas import RestaurantResponse, ReviewResponse
from app.utils.security import get_current_user

router = APIRouter(prefix="/owner", tags=["Owner"])


def _restaurant_to_response(doc: dict) -> RestaurantResponse:
    return RestaurantResponse(
        id=str(doc["_id"]),
        owner_id=doc.get("owner_id"),
        name=doc.get("name", ""),
        cuisine_type=doc.get("cuisine_type"),
        description=doc.get("description"),
        address=doc.get("address"),
        city=doc.get("city"),
        state=doc.get("state"),
        zip_code=doc.get("zip_code"),
        contact_info=doc.get("contact_info"),
        hours=doc.get("hours"),
        photos=doc.get("photos"),
        pricing_tier=doc.get("pricing_tier"),
        avg_rating=float(doc.get("avg_rating", 0) or 0),
        review_count=int(doc.get("review_count", 0) or 0),
        is_claimed=bool(doc.get("owner_id")),
        created_at=doc.get("created_at"),
    )


def _review_to_response(doc: dict, user_name: str | None = None) -> ReviewResponse:
    return ReviewResponse(
        id=str(doc["_id"]),
        user_id=doc.get("user_id", ""),
        restaurant_id=doc.get("restaurant_id", ""),
        rating=int(doc.get("rating", 0)),
        comment=doc.get("comment"),
        created_at=doc.get("created_at"),
        updated_at=doc.get("updated_at"),
        user_name=user_name,
    )


def _require_owner(current_user: dict):
    if current_user.get("role") != "owner":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only owners can access this endpoint",
        )


async def _get_owned_restaurant(mongo, restaurant_id: str, user_id: str) -> dict:
    try:
        oid = ObjectId(restaurant_id)
    except InvalidId as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid restaurant ID format",
        ) from exc

    restaurant = await mongo.restaurants.find_one({"_id": oid})
    if not restaurant or restaurant.get("owner_id") != user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Restaurant not found or not owned by you",
        )
    return restaurant


@router.get("/restaurants", response_model=list[RestaurantResponse])
async def get_own_restaurants(current_user: dict = Depends(get_current_user)):
    _require_owner(current_user)
    mongo = get_db()

    cursor = mongo.restaurants.find(
        {"owner_id": current_user["id"]}
    ).sort("created_at", -1)
    restaurants = await cursor.to_list(None)

    return [_restaurant_to_response(r) for r in restaurants]


@router.get(
    "/restaurants/{restaurant_id}/reviews", response_model=list[ReviewResponse]
)
async def get_reviews_for_own_restaurant(
    restaurant_id: str, current_user: dict = Depends(get_current_user)
):
    _require_owner(current_user)
    mongo = get_db()
    await _get_owned_restaurant(mongo, restaurant_id, current_user["id"])

    reviews = await mongo.reviews.find(
        {"restaurant_id": restaurant_id}
    ).sort("created_at", -1).to_list(None)

    user_ids = []
    for r in reviews:
        try:
            user_ids.append(ObjectId(r["user_id"]))
        except (InvalidId, KeyError):
            continue

    users = await mongo.users.find(
        {"_id": {"$in": user_ids}}, {"name": 1}
    ).to_list(None)
    user_map = {str(u["_id"]): u.get("name", "") for u in users}

    return [
        _review_to_response(r, user_name=user_map.get(r.get("user_id")))
        for r in reviews
    ]


@router.get("/restaurants/{restaurant_id}/analytics")
async def get_restaurant_analytics(
    restaurant_id: str, current_user: dict = Depends(get_current_user)
):
    _require_owner(current_user)
    mongo = get_db()
    restaurant = await _get_owned_restaurant(
        mongo, restaurant_id, current_user["id"]
    )

    reviews = await mongo.reviews.find(
        {"restaurant_id": restaurant_id}
    ).sort("created_at", -1).to_list(None)

    distribution = {"1": 0, "2": 0, "3": 0, "4": 0, "5": 0}
    for review in reviews:
        rating_key = str(int(review.get("rating", 0)))
        if rating_key in distribution:
            distribution[rating_key] += 1

    recent = [
        {
            "id": str(r["_id"]),
            "rating": int(r.get("rating", 0)),
            "comment": r.get("comment"),
            "created_at": r.get("created_at"),
        }
        for r in reviews[:5]
    ]

    return {
        "restaurant_id": str(restaurant["_id"]),
        "restaurant_name": restaurant.get("name", ""),
        "total_reviews": len(reviews),
        "avg_rating": float(restaurant.get("avg_rating", 0) or 0),
        "review_count": int(restaurant.get("review_count", 0) or 0),
        "rating_distribution": distribution,
        "recent_reviews": recent,
    }


@router.post(
    "/restaurants/{restaurant_id}/claim", response_model=RestaurantResponse
)
async def claim_restaurant(
    restaurant_id: str, current_user: dict = Depends(get_current_user)
):
    _require_owner(current_user)
    mongo = get_db()

    try:
        oid = ObjectId(restaurant_id)
    except InvalidId as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid restaurant ID format",
        ) from exc

    restaurant = await mongo.restaurants.find_one({"_id": oid})
    if not restaurant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Restaurant not found",
        )

    if restaurant.get("owner_id"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Restaurant is already claimed",
        )

    await mongo.restaurants.update_one(
        {"_id": oid},
        {"$set": {"owner_id": current_user["id"]}},
    )

    restaurant["owner_id"] = current_user["id"]
    return _restaurant_to_response(restaurant)
