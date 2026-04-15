import os
import uuid
from datetime import datetime, timezone

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    Query,
    UploadFile,
    status,
)

from app.database import get_db
from app.schemas import RestaurantCreate, RestaurantResponse, RestaurantUpdate
from app.utils.security import get_current_user

router = APIRouter(prefix="/restaurants", tags=["Restaurants"])

RESTAURANT_UPLOAD_DIR = "uploads/restaurant_photos"
os.makedirs(RESTAURANT_UPLOAD_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB

PRICE_TIER_RANK = {"$": 1, "$$": 2, "$$$": 3, "$$$$": 4}


def _to_response(doc: dict) -> dict:
    """Convert a MongoDB restaurant document to an API-safe dict."""
    return {
        "id": str(doc["_id"]),
        "owner_id": str(doc["owner_id"]) if doc.get("owner_id") else None,
        "name": doc.get("name", ""),
        "cuisine_type": doc.get("cuisine_type"),
        "description": doc.get("description"),
        "address": doc.get("address"),
        "city": doc.get("city"),
        "state": doc.get("state"),
        "zip_code": doc.get("zip_code"),
        "contact_info": doc.get("contact_info"),
        "hours": doc.get("hours"),
        "photos": doc.get("photos"),
        "pricing_tier": doc.get("pricing_tier"),
        "avg_rating": doc.get("avg_rating", 0.0),
        "review_count": doc.get("review_count", 0),
        "created_at": doc.get("created_at"),
    }


def _parse_object_id(raw_id: str) -> ObjectId:
    """Safely parse a string into an ObjectId, raising 400 on bad format."""
    try:
        return ObjectId(raw_id)
    except (InvalidId, TypeError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid ID format: {raw_id}",
        )


# ── Create ───────────────────────────────────────────────────────────────────


@router.post("", response_model=RestaurantResponse, status_code=status.HTTP_201_CREATED)
async def create_restaurant(
    request: RestaurantCreate,
    current_user: dict = Depends(get_current_user),
):
    mongo = get_db()
    now = datetime.now(timezone.utc)

    doc = {
        "name": request.name,
        "cuisine_type": request.cuisine_type,
        "description": request.description,
        "address": request.address,
        "city": request.city,
        "state": request.state,
        "zip_code": request.zip_code,
        "contact_info": request.phone,
        "pricing_tier": request.pricing_tier,
        "hours": request.hours,
        "photos": None,
        "avg_rating": 0.0,
        "review_count": 0,
        "created_at": now,
        "updated_at": now,
        "owner_id": None,
    }

    if str(current_user.get("role", "")) == "owner":
        doc["owner_id"] = current_user["id"]

    result = await mongo.restaurants.insert_one(doc)
    doc["_id"] = result.inserted_id
    return _to_response(doc)


# ── Read Single ──────────────────────────────────────────────────────────────


@router.get("/{restaurant_id}", response_model=RestaurantResponse)
async def get_restaurant(restaurant_id: str):
    oid = _parse_object_id(restaurant_id)
    mongo = get_db()
    doc = await mongo.restaurants.find_one({"_id": oid})

    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Restaurant not found",
        )

    return _to_response(doc)


# ── Search / List ────────────────────────────────────────────────────────────


@router.get("", response_model=dict)
async def search_restaurants(
    name: str | None = Query(None),
    cuisine_type: str | None = Query(None),
    city: str | None = Query(None),
    zip_code: str | None = Query(None),
    pricing_tier: str | None = Query(None),
    keywords: str | None = Query(None),
    sort_by: str = Query("rating"),
    sort_order: str = Query("desc"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
):
    mongo = get_db()
    query_filter: dict = {}

    if name:
        query_filter["name"] = {"$regex": name, "$options": "i"}
    if cuisine_type:
        query_filter["cuisine_type"] = {"$regex": cuisine_type, "$options": "i"}
    if city:
        query_filter["city"] = {"$regex": city, "$options": "i"}
    if zip_code:
        query_filter["zip_code"] = {"$regex": zip_code, "$options": "i"}
    if pricing_tier:
        query_filter["pricing_tier"] = pricing_tier

    if keywords:
        keyword_regex = {"$regex": keywords, "$options": "i"}
        query_filter["$or"] = [
            {"name": keyword_regex},
            {"cuisine_type": keyword_regex},
            {"description": keyword_regex},
        ]

    total = await mongo.restaurants.count_documents(query_filter)

    sort_mapping = {
        "rating": "avg_rating",
        "reviews": "review_count",
        "name": "name",
        "created_at": "created_at",
    }
    sort_field = sort_mapping.get(sort_by, "avg_rating")
    direction = 1 if sort_order.lower() == "asc" else -1

    # Price sorting requires in-memory ranking since values are strings like "$", "$$"
    if sort_by == "price":
        cursor = mongo.restaurants.find(query_filter)
        all_docs = await cursor.to_list(length=None)
        all_docs.sort(
            key=lambda d: PRICE_TIER_RANK.get(d.get("pricing_tier", ""), 99),
            reverse=(direction == -1),
        )
        skip = (page - 1) * per_page
        page_docs = all_docs[skip : skip + per_page]
    else:
        cursor = (
            mongo.restaurants.find(query_filter)
            .sort([(sort_field, direction), ("_id", direction)])
            .skip((page - 1) * per_page)
            .limit(per_page)
        )
        page_docs = await cursor.to_list(length=per_page)

    total_pages = (total + per_page - 1) // per_page if total else 0

    return {
        "items": [_to_response(d) for d in page_docs],
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": total_pages,
    }


# ── Update ───────────────────────────────────────────────────────────────────


@router.put("/{restaurant_id}", response_model=RestaurantResponse)
async def update_restaurant(
    restaurant_id: str,
    request: RestaurantUpdate,
    current_user: dict = Depends(get_current_user),
):
    oid = _parse_object_id(restaurant_id)
    mongo = get_db()
    doc = await mongo.restaurants.find_one({"_id": oid})

    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Restaurant not found",
        )

    doc_owner = str(doc["owner_id"]) if doc.get("owner_id") else None
    if doc_owner is None or doc_owner != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the restaurant owner can update this restaurant",
        )

    updates = request.model_dump(exclude_unset=True)
    if "phone" in updates:
        updates["contact_info"] = updates.pop("phone")
    if updates:
        updates["updated_at"] = datetime.now(timezone.utc)
        await mongo.restaurants.update_one({"_id": oid}, {"$set": updates})

    updated = await mongo.restaurants.find_one({"_id": oid})
    return _to_response(updated)


# ── Photo Upload ─────────────────────────────────────────────────────────────


@router.post("/{restaurant_id}/photos", status_code=status.HTTP_201_CREATED)
async def upload_restaurant_photo(
    restaurant_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    oid = _parse_object_id(restaurant_id)
    mongo = get_db()
    doc = await mongo.restaurants.find_one({"_id": oid})

    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Restaurant not found",
        )

    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type {ext} not allowed. Use: {', '.join(ALLOWED_EXTENSIONS)}",
        )

    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size exceeds 5MB limit",
        )

    filename = f"{restaurant_id}_{uuid.uuid4().hex}{ext}"
    filepath = os.path.join(RESTAURANT_UPLOAD_DIR, filename)

    with open(filepath, "wb") as f:
        f.write(contents)

    new_url = f"/{filepath}"

    existing_photos = doc.get("photos")
    updated_photos = (
        f"{existing_photos},{new_url}" if existing_photos else new_url
    )
    await mongo.restaurants.update_one(
        {"_id": oid}, {"$set": {"photos": updated_photos}}
    )

    await mongo.photos.insert_one(
        {
            "entity_type": "restaurant",
            "entity_id": restaurant_id,
            "url": new_url,
            "uploaded_by": current_user["id"],
            "created_at": datetime.now(timezone.utc),
        }
    )

    return {"photo_url": new_url}


# ── Claim ────────────────────────────────────────────────────────────────────


@router.post("/{restaurant_id}/claim", response_model=RestaurantResponse)
async def claim_restaurant(
    restaurant_id: str,
    current_user: dict = Depends(get_current_user),
):
    if str(current_user.get("role", "")) != "owner":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only owners can claim restaurants",
        )

    oid = _parse_object_id(restaurant_id)
    mongo = get_db()
    doc = await mongo.restaurants.find_one({"_id": oid})

    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Restaurant not found",
        )

    if doc.get("owner_id") is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Restaurant is already claimed",
        )

    await mongo.restaurants.update_one(
        {"_id": oid}, {"$set": {"owner_id": current_user["id"]}}
    )

    updated = await mongo.restaurants.find_one({"_id": oid})
    return _to_response(updated)
