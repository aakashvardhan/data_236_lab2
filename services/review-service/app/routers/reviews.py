from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from bson import ObjectId
from bson.errors import InvalidId
from app.database import get_db
from app.kafka_producer import publish_review_event
from app.schemas import ReviewCreate, ReviewUpdate, ReviewResponse
from app.utils.security import get_current_user

router = APIRouter(tags=["Reviews"])


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


async def _recalculate_rating(mongo, restaurant_id: str):
    pipeline = [
        {"$match": {"restaurant_id": restaurant_id}},
        {"$group": {"_id": None, "avg": {"$avg": "$rating"}, "count": {"$sum": 1}}},
    ]
    result = await mongo.reviews.aggregate(pipeline).to_list(1)
    if result:
        avg = round(result[0]["avg"], 1)
        count = result[0]["count"]
    else:
        avg = 0.0
        count = 0

    await mongo.restaurants.update_one(
        {"_id": ObjectId(restaurant_id)},
        {"$set": {"avg_rating": avg, "review_count": count}},
    )


async def _get_user_review(mongo, review_id: str, user_id: str) -> dict:
    try:
        oid = ObjectId(review_id)
    except InvalidId as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid review ID format",
        ) from exc

    review = await mongo.reviews.find_one({"_id": oid})
    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found",
        )
    if review.get("user_id") != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only modify your own reviews",
        )
    return review


@router.post(
    "/restaurants/{restaurant_id}/reviews",
    response_model=ReviewResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_review(
    restaurant_id: str,
    request: ReviewCreate,
    current_user: dict = Depends(get_current_user),
):
    mongo = get_db()

    try:
        rest_oid = ObjectId(restaurant_id)
    except InvalidId as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid restaurant ID format",
        ) from exc

    restaurant = await mongo.restaurants.find_one({"_id": rest_oid})
    if not restaurant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Restaurant not found",
        )

    existing = await mongo.reviews.find_one(
        {"user_id": current_user["id"], "restaurant_id": restaurant_id}
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already reviewed this restaurant",
        )

    now = datetime.now(timezone.utc)
    review_doc = {
        "user_id": current_user["id"],
        "restaurant_id": restaurant_id,
        "rating": request.rating,
        "comment": request.comment,
        "created_at": now,
        "updated_at": now,
    }

    result = await mongo.reviews.insert_one(review_doc)
    review_doc["_id"] = result.inserted_id

    await _recalculate_rating(mongo, restaurant_id)
    await publish_review_event("review.created", {
        "review_id": str(result.inserted_id),
        "user_id": current_user["id"],
        "restaurant_id": restaurant_id,
        "rating": request.rating,
        "comment": request.comment,
    })

    return _review_to_response(review_doc, user_name=current_user.get("name"))


@router.get(
    "/restaurants/{restaurant_id}/reviews", response_model=list[ReviewResponse]
)
async def list_reviews(restaurant_id: str):
    mongo = get_db()

    try:
        rest_oid = ObjectId(restaurant_id)
    except InvalidId as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid restaurant ID format",
        ) from exc

    restaurant = await mongo.restaurants.find_one({"_id": rest_oid})
    if not restaurant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Restaurant not found",
        )

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


@router.put("/reviews/{review_id}", response_model=ReviewResponse)
async def update_review(
    review_id: str,
    request: ReviewUpdate,
    current_user: dict = Depends(get_current_user),
):
    mongo = get_db()
    review = await _get_user_review(mongo, review_id, current_user["id"])

    update_data = request.model_dump(exclude_unset=True)
    if not update_data:
        return _review_to_response(review, user_name=current_user.get("name"))

    update_data["updated_at"] = datetime.now(timezone.utc)
    rating_changed = "rating" in update_data

    await mongo.reviews.update_one(
        {"_id": review["_id"]}, {"$set": update_data}
    )

    if rating_changed:
        await _recalculate_rating(mongo, review["restaurant_id"])

    updated = await mongo.reviews.find_one({"_id": review["_id"]})
    await publish_review_event("review.updated", {
        "review_id": review_id,
        "user_id": current_user["id"],
        "restaurant_id": review["restaurant_id"],
        **{k: str(v) if hasattr(v, "isoformat") else v for k, v in update_data.items()},
    })

    return _review_to_response(updated, user_name=current_user.get("name"))


@router.delete("/reviews/{review_id}", status_code=status.HTTP_200_OK)
async def delete_review(
    review_id: str,
    current_user: dict = Depends(get_current_user),
):
    mongo = get_db()
    review = await _get_user_review(mongo, review_id, current_user["id"])
    restaurant_id = review["restaurant_id"]

    await mongo.reviews.delete_one({"_id": review["_id"]})
    await _recalculate_rating(mongo, restaurant_id)
    await publish_review_event("review.deleted", {
        "review_id": review_id,
        "user_id": current_user["id"],
        "restaurant_id": restaurant_id,
    })

    return {"message": "Review deleted successfully"}
