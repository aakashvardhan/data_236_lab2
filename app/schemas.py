from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional
from datetime import datetime
from enum import Enum


# ------- Enums -----------
class GenderEnum(str, Enum):
    male = "male"
    female = "female"
    other = "other"
    prefer_not_to_say = "prefer_not_to_say"


class RoleEnum(str, Enum):
    user = "user"
    owner = "owner"


class SortEnum(str, Enum):
    rating = "rating"
    distance = "distance"
    popularity = "popularity"
    price = "price"


class PriceTier(str, Enum):
    one = "$"
    two = "$$"
    three = "$$$"
    four = "$$$$"


# ------------- Auth ----------------

class UserSignup(BaseModel):
    name: str = Field(..., max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6)
    role: RoleEnum = RoleEnum.user
    restaurant_location: Optional[str] = None  # this is required if role=owner


class UserLogin(BaseModel):
    email: EmailStr
    password: str

# this shapes the login endpoint after successful authentication


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"  # this is default

# ----------- User Profile --------------


class UserProfileUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    phone: Optional[str] = Field(None, max_length=20)
    about_me: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = Field(None, max_length=10)
    country: Optional[str] = None
    language: Optional[str] = None
    gender: Optional[GenderEnum] = None


class UserProfileResponse(BaseModel):
    id: int
    name: str
    email: str
    phone: Optional[str] = None
    about_me: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    language: Optional[str] = None
    gender: Optional[str] = None
    profile_pic_url: Optional[str] = None
    role: RoleEnum
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------- User Preference -----------

class UserPreferenceCreate(BaseModel):
    cuisines: Optional[list[str]] = None
    price_range: Optional[str] = None
    preferred_locations: Optional[list[str]] = None
    search_radius: Optional[int] = 10
    dietary_restrictions: Optional[list[str]] = None
    ambiance: Optional[list[str]] = None
    sort_preference: Optional[SortEnum] = SortEnum.rating


class UserPreferencesResponse(UserPreferenceCreate):
    id: int
    user_id: int

    model_config = ConfigDict(from_attributes=True)


# --------------- Restaurant --------------------

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
    email: Optional[EmailStr] = None
    website: Optional[str] = None
    price_tier: Optional[PriceTier] = None
    hours_of_operation: Optional[dict] = None
    amenities: Optional[list[dict]] = None


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
    email: Optional[EmailStr] = None
    website: Optional[str] = None
    price_tier: Optional[PriceTier] = None
    hours_of_operation: Optional[dict] = None
    amenities: Optional[list[dict]] = None


class RestaurantResponse(BaseModel):
    id: int
    owner_id: Optional[int] = None
    added_by: int
    name: str
    cuisine_type: Optional[str] = None
    description: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    phone: Optional[str] = None
    price_tier: Optional[PriceTier] = None
    hours_of_operation: Optional[dict] = None
    amenities: Optional[list[str]] = None
    avg_rating: float = 0.0
    review_count: int = 0
    is_claimed: bool = False
    created_at = datetime

    model_config = ConfigDict(from_attributes=True)


class RestaurantSearchParams(BaseModel):
    name: Optional[str] = None
    cuisine_type: Optional[str] = None
    city: Optional[str] = None
    zip_code: Optional[str] = None
    keywords: Optional[str] = None  # fulltext search
    price_tier: Optional[PriceTier] = None
    page: int = 1
    per_page: int = 20


# ----------- Review --------------------

class ReviewCreate(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = None


class ReviewUpdate(BaseModel):
    rating: Optional[str] = Field(None, ge=1, le=5)
    comment: Optional[str] = None


class ReviewResponse(BaseModel):
    id: int
    user_id: int
    restaurant_id: int
    rating: int
    comment: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    user_name: Optional[str] = None  # joined from the user table

    model_config = ConfigDict(from_attributes=True)


# --------------- Favorites ---------------------

class FavoriteResponse(BaseModel):
    id: int
    restaurant_id: int
    restaurant_name: Optional[str] = None  # joined from the restaurant table
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# --------------- AI Assistant --------------------

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[int] = None  # none means new conversation


class ChatResponse(BaseModel):
    session_id: int
    response: str
    recommendations: Optional[list[RestaurantResponse]] = None


# -------------- Shared Utility --------------------

class PaginatedResponse(BaseModel):
    items: list
    total: int
    page: int
    per_page: int
    total_pages: int
