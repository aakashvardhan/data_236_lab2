from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    DB_USER: str = "root"
    DB_PASSWORD: str = "yourpassword"
    DB_HOST: str = "localhost"
    DB_PORT: int = 3306
    DB_NAME: str = "yelp_db"

    JWT_SECRET_KEY: str = "change-me"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_MINUTES: int = 60
    TAVILY_API_KEY: str = ""
    GEMINI_API_KEY: str = ""
    HF_API_TOKEN: str = ""
    YELP_API_KEY: str = ""

    class Config:
        env_file = "../.env"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
