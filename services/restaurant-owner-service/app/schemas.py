from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class RestaurantResponse(BaseModel):
    id: str
    owner_id: Optional[str] = None
    name: str
    cuisine_type: Optional[str] = None
    description: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    contact_info: Optional[str] = None
    hours: Optional[str] = None
    photos: Optional[str] = None
    pricing_tier: Optional[str] = None
    avg_rating: float = 0.0
    review_count: int = 0
    is_claimed: bool = False
    created_at: Optional[datetime] = None


class ReviewResponse(BaseModel):
    id: str
    user_id: str
    restaurant_id: str
    rating: int
    comment: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    user_name: Optional[str] = None
