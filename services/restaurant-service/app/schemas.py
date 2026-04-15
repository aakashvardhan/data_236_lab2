from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class PriceTier(str, Enum):
    one = "$"
    two = "$$"
    three = "$$$"
    four = "$$$$"


class RestaurantCreate(BaseModel):
    name: str = Field(..., max_length=200)
    cuisine_type: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = Field(None, max_length=10)
    zip_code: Optional[str] = Field(None, max_length=10)
    country: Optional[str] = None
    phone: Optional[str] = None
    pricing_tier: Optional[str] = None
    hours: Optional[str] = None


class RestaurantUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=200)
    cuisine_type: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = Field(None, max_length=10)
    zip_code: Optional[str] = Field(None, max_length=10)
    country: Optional[str] = None
    phone: Optional[str] = None
    pricing_tier: Optional[str] = None
    hours: Optional[str] = None


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
    created_at: Optional[datetime] = None
