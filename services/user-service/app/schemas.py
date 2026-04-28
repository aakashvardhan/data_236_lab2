from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field


# ── Enums ──────────────────────────────────────────────────────────────


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


# ── Auth ───────────────────────────────────────────────────────────────


class UserSignup(BaseModel):
    name: str = Field(..., max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6)
    role: RoleEnum = RoleEnum.user
    restaurant_location: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ── User Profile ───────────────────────────────────────────────────────


class UserProfileUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    phone: Optional[str] = Field(None, max_length=20)
    about_me: Optional[str] = Field(None, max_length=1000)
    city: Optional[str] = Field(None, max_length=100)
    state: Optional[str] = Field(None, max_length=10)
    country: Optional[str] = Field(None, max_length=100)
    languages: Optional[str] = Field(None, max_length=200)
    gender: Optional[GenderEnum] = None


class UserProfileResponse(BaseModel):
    id: str
    name: str
    email: str
    phone: Optional[str] = None
    about_me: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    languages: Optional[str] = None
    gender: Optional[str] = None
    profile_picture: Optional[str] = None
    role: RoleEnum
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ── Preferences ────────────────────────────────────────────────────────


class UserPreferenceCreate(BaseModel):
    cuisines: Optional[str] = None
    price_range: Optional[str] = None
    preferred_locations: Optional[str] = None
    dietary_needs: Optional[str] = None
    ambience: Optional[str] = None
    sort_preference: Optional[str] = None


class UserPreferencesResponse(UserPreferenceCreate):
    user_id: str
    model_config = ConfigDict(from_attributes=True)


# ── Favorites ──────────────────────────────────────────────────────────


class FavoriteResponse(BaseModel):
    id: str
    restaurant_id: str
    restaurant_name: Optional[str] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ── Restaurant (read-only, for favorites join / AI search) ─────────────


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
    model_config = ConfigDict(from_attributes=True)


# ── Review (read-only, for user history) ───────────────────────────────


class ReviewResponse(BaseModel):
    id: str
    user_id: str
    restaurant_id: str
    rating: int
    comment: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    user_name: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)


# ── AI Assistant ───────────────────────────────────────────────────────


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    session_id: str = Field("default", max_length=100)


class RestaurantRecommendation(BaseModel):
    id: Optional[str] = None
    name: Optional[str] = None
    rating: Optional[float] = None
    pricing_tier: Optional[str] = None
    cuisines: Optional[str] = None


class ChatResponse(BaseModel):
    response: str
    recommendations: list[RestaurantRecommendation] = []
    session_id: str
