import os

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    DB_USER: str = os.environ.get("DB_USER", "root")
    DB_PASSWORD: str = os.environ.get("DB_PASSWORD", "")
    DB_HOST: str = os.environ.get("DB_HOST", "mysql")
    DB_PORT: int = int(os.environ.get("DB_PORT", "3306"))
    DB_NAME: str = os.environ.get("DB_NAME", "yelp_db")

    JWT_SECRET_KEY: str = os.environ.get("JWT_SECRET_KEY", "")
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_MINUTES: int = 60
    TAVILY_API_KEY: str = os.environ.get("TAVILY_API_KEY", "")
    GEMINI_API_KEY: str = os.environ.get("GEMINI_API_KEY", "")
    HF_API_TOKEN: str = os.environ.get("HF_API_TOKEN", "")
    YELP_API_KEY: str = os.environ.get("YELP_API_KEY", "")

    class Config:
        env_file = "../.env"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
