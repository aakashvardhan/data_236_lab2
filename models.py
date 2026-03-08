"""
SQLAlchemy ORM models

Each class = one MySQL table. SQLAlchemy maps Python objects <-> rows

- 'role' column on User distinguishes "user" vs "owner" (single table, simpler auth)
- Reviews have a composite uniqueness: one review per user per restaurant
- Favorites is a simple junction table (user_id, restaurant_id)
- UserPreference stores JSON-like csv for multi-select fields
    (cuisines, dietary, ambience) 
"""

from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Text, Float, DateTime,
    ForeignKey, Enum, UniqueConstraint
)
from sqlalchemy.orm import relationship
from database import Base

# basic user profile information


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(Enum("user", "owner", name="user_role"),
                  default="user", nullable=False)

    # Profile fields
    phone = Column(String(20), nullable=True)
    about_me = Column(Text, nullable=True)
    city = Column(String(100), nullable=True)
    state = Column(String(10), nullable=True)  # state abbreviation
    country = Column(String(100), nullable=True)
    languages = Column(String(255), nullable=True)  # comma-separated
    gender = Column(String(20), nullable=True)
    profile_picture = Column(String(500), nullable=True)  # file path

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow,
                        onupdate=datetime.utcnow)

    # Relationships
    reviews = relationship("Review", back_populates="user",
                           cascade="all, delete-orphan")
    favorites = relationship(
        "Favorite", back_populates="user", cascade="all, delete-orphan")
    preferences = relationship("UserPreference", back_populates="user", uselist=False,
                               cascade="all, delete-orphan")
    restaurants = relationship("Restaurant", back_populates="owner")


# Storing the user's AI assistant preferences (one row per user)
class UserPreference(Base):
    __tablename__ = "user_preferences"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey(
        "users.id", ondelete="CASCADE"), unique=True, nullable=False)

    cuisines = Column(String(500), nullable=True)
    price_range = Column(String(20), nullable=True)
    preferred_locations = Column(String(500), nullable=True)
    dietary_needs = Column(String(500), nullable=True)
    ambiance = Column(String(500), nullable=True)
    sort_preference = Column(String(50), nullable=True)

    user = relationship("User", back_populates="preferences")


class Restaurant(Base):
    __tablename__ = "restaurants"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"),
                      nullable=True)  # nullable = unclaimed
    name = Column(String(200), nullable=False, index=True)
    cuisine_type = Column(String(100), nullable=True)
    description = Column(Text, nullable=True)
    address = Column(String(300), nullable=True)
    city = Column(String(100), nullable=True, index=True)
    state = Column(String(10), nullable=True)
    zip_code = Column(String(20), nullable=True)
    country = Column(String(100), nullable=True)
    contact_info = Column(String(200), nullable=True)
    # JSON string or free text
    hours = Column(Text, nullable=True)
    # comma-separated URLs
    photos = Column(Text, nullable=True)
    pricing_tier = Column(String(10), nullable=True)        # $, $$, $$$, $$$$
    # comma-separated keywords
    amenities = Column(Text, nullable=True)
    # "quiet,wifi,outdoor seating"
    keywords = Column(Text, nullable=True)

    avg_rating = Column(Float, default=0.0)
    review_count = Column(Integer, default=0)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow,
                        onupdate=datetime.utcnow)

    # Relationships
    owner = relationship("User", back_populates="restaurants")
    reviews = relationship(
        "Review", back_populates="restaurant", cascade="all, delete-orphan")
    favorited_by = relationship(
        "Favorite", back_populates="restaurant", cascade="all, delete-orphan")


class Review(Base):
    __tablename__ = "reviews"
    __table_args__ = (
        UniqueConstraint("user_id", "restaurant_id",
                         name="uq_user_restaurant_review"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey(
        "users.id", ondelete="CASCADE"), nullable=False)
    restaurant_id = Column(Integer, ForeignKey(
        "restaurants.id", ondelete="CASCADE"), nullable=False)
    rating = Column(Integer, nullable=False)               # 1–5
    comment = Column(Text, nullable=True)
    # comma-separated URLs
    photos = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow,
                        onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="reviews")
    restaurant = relationship("Restaurant", back_populates="reviews")


class Favorite(Base):
    __tablename__ = "favorites"
    __table_args__ = (
        UniqueConstraint("user_id", "restaurant_id",
                         name="uq_user_restaurant_favorite"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey(
        "users.id", ondelete="CASCADE"), nullable=False)
    restaurant_id = Column(Integer, ForeignKey(
        "restaurants.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="favorites")
    restaurant = relationship("Restaurant", back_populates="favorited_by")
