from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional
from datetime import datetime
from enum import Enum

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

class UserProfileUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    phone: Optional[str] = Field(None, max_length=20)
    about_me: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = Field(None, max_length=10)
    country: Optional[str] = None
    languages: Optional[str] = None
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
    languages: Optional[str] = None
    gender: Optional[str] = None
    profile_picture: Optional[str] = None
    role: RoleEnum
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class UserPreferenceCreate(BaseModel):
    cuisines: Optional[str] = None
    price_range: Optional[str] = None
    preferred_locations: Optional[str] = None
    dietary_needs: Optional[str] = None
    ambience: Optional[str] = None
    sort_preference: Optional[str] = None

class UserPreferencesResponse(UserPreferenceCreate):
    id: int
    user_id: int
    model_config = ConfigDict(from_attributes=True)

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
    id: int
    owner_id: Optional[int] = None
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

class ReviewCreate(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = None

class ReviewUpdate(BaseModel):
    rating: Optional[int] = Field(None, ge=1, le=5)
    comment: Optional[str] = None

class ReviewResponse(BaseModel):
    id: int
    user_id: int
    restaurant_id: int
    rating: int
    comment: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    user_name: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class FavoriteResponse(BaseModel):
    id: int
    restaurant_id: int
    restaurant_name: Optional[str] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[int] = None

class ChatResponse(BaseModel):
    session_id: int
    response: str
    recommendations: Optional[list[RestaurantResponse]] = None

class PaginatedResponse(BaseModel):
    items: list
    total: int
    page: int
    per_page: int
    total_pages: int