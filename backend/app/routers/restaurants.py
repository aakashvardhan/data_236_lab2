import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy import case
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, Restaurant
from app.schemas import RestaurantCreate, RestaurantResponse, RestaurantUpdate
from app.utils.security import get_current_user
router = APIRouter(prefix="/restaurants", tags=["Restaurants"])

RESTAURANT_UPLOAD_DIR = "uploads/restaurant_photos"
os.makedirs(RESTAURANT_UPLOAD_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
MAX_FILE_SIZE = 5 * 1024 * 1024

@router.post("", response_model=RestaurantResponse, status_code=status.HTTP_201_CREATED)
def create_restaurant(
    request: RestaurantCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    data = request.model_dump()
    restaurant = Restaurant(
        name=data.get('name'),
        cuisine_type=data.get('cuisine_type'),
        description=data.get('description'),
        address=data.get('address'),
        city=data.get('city'),
        state=data.get('state'),
        zip_code=data.get('zip_code'),
        contact_info=data.get('phone'),
        pricing_tier=data.get('pricing_tier'),
        hours=data.get('hours'),
    )
    if str(current_user.role) == 'owner':
        restaurant.owner_id = current_user.id
    db.add(restaurant)
    db.commit()
    db.refresh(restaurant)
    return restaurant
@router.get("/{restaurant_id}", response_model=RestaurantResponse)
def get_restaurant(
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

    return restaurant


@router.get("", response_model=dict)
def search_restaurants(
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
    db: Session = Depends(get_db)
):
    query = db.query(Restaurant)

    if name:
        query = query.filter(Restaurant.name.ilike(f"%{name}%"))

    if cuisine_type:
        query = query.filter(
            Restaurant.cuisine_type.ilike(f"%{cuisine_type}%"))

    if city:
        query = query.filter(Restaurant.city.ilike(f"%{city}%"))

    if zip_code:
        query = query.filter(Restaurant.zip_code.ilike(f"%{zip_code}%"))

    if pricing_tier:
        query = query.filter(Restaurant.pricing_tier == pricing_tier)

    if keywords:
        keyword_filter = f"%{keywords}%"
        query = query.filter(
            (Restaurant.name.ilike(keyword_filter))
            | (Restaurant.cuisine_type.ilike(keyword_filter))
            | (Restaurant.description.ilike(keyword_filter))
        )

    price_rank_expr = case(
        (Restaurant.pricing_tier == "$", 1),
        (Restaurant.pricing_tier == "$$", 2),
        (Restaurant.pricing_tier == "$$$", 3),
        (Restaurant.pricing_tier == "$$$$", 4),
        else_=99,
    )
    sort_columns = {
        "rating": Restaurant.avg_rating,
        "reviews": Restaurant.review_count,
        "price": price_rank_expr,
        "name": Restaurant.name,
        "created_at": Restaurant.created_at,
    }
    sort_column = sort_columns.get(sort_by, Restaurant.avg_rating)
    if sort_order.lower() == "asc":
        query = query.order_by(sort_column.asc(), Restaurant.id.asc())
    else:
        query = query.order_by(sort_column.desc(), Restaurant.id.desc())

    # total count before pagination
    total = query.count()

    # Paginate
    restaurants = query.offset((page - 1) * per_page).limit(per_page).all()

    return {
        "items": [RestaurantResponse.model_validate(r) for r in restaurants],
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": (total + per_page - 1) // per_page
    }


@router.put("/{restaurant_id}", response_model=RestaurantResponse)
def update_restaurant(
    restaurant_id: int,
    request: RestaurantUpdate,
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

    if restaurant.owner_id is None or int(restaurant.owner_id) != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the restaurant owner can update this restaurant"
        )

    update_data = request.model_dump(exclude_unset=True)
    for k, v in update_data.items():
        setattr(restaurant, k, v)

    db.commit()
    db.refresh(restaurant)

    return restaurant


@router.post("/{restaurant_id}/photos", status_code=status.HTTP_201_CREATED)
async def upload_restaurant_photo(restaurant_id: int,
                                  file: UploadFile = File(...),
                                  current_user: User = Depends(
                                      get_current_user),
                                  db: Session = Depends(get_db)):

    restaurant = db.query(Restaurant).filter(
        Restaurant.id == restaurant_id).first()

    if not restaurant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Restaurant not found"
        )

    # Validate extension
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type {ext} not allowed. Use: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    # Validate size
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size exceeds 5MB limit"
        )

    # Save file
    filename = f"{restaurant_id}_{uuid.uuid4().hex}{ext}"
    filepath = os.path.join(RESTAURANT_UPLOAD_DIR, filename)

    with open(filepath, "wb") as f:
        f.write(contents)

    # Append to existing photos (comma-separated in your schema)
    new_url = f"/{filepath}"
    if restaurant.photos is not None:
        restaurant.photos = f"{restaurant.photos},{new_url}"

    else:
        restaurant.photos = new_url

    db.commit()

    return {"photo_url": new_url}


@router.post("/{restaurant_id}/claim", response_model=RestaurantResponse)
def claim_restaurant(
    restaurant_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if str(current_user.role) != "owner":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only owners can claim restaurants"
        )

    restaurant = db.query(Restaurant).filter(
        Restaurant.id == restaurant_id).first()

    if not restaurant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Restaurant not found"
        )

    if restaurant.owner_id is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Restaurant is already claimed"
        )

    restaurant.owner_id = current_user.id
    db.commit()
    db.refresh(restaurant)

    return restaurant
