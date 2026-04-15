import os
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    MONGO_URI: str = os.environ.get("MONGO_URI", "mongodb://mongodb:27017")
    MONGO_DB_NAME: str = os.environ.get("MONGO_DB_NAME", "yelp_db")
    JWT_SECRET_KEY: str = os.environ.get("JWT_SECRET_KEY", "change-me-in-production")
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_MINUTES: int = 60
    CORS_ORIGINS: str = os.environ.get(
        "CORS_ORIGINS", "http://localhost:3000,http://localhost:5173"
    )

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
