from motor.motor_asyncio import AsyncIOMotorClient

from app.config import get_settings

settings = get_settings()

client = AsyncIOMotorClient(settings.MONGO_URI)
db = client[settings.MONGO_DB_NAME]


def get_db():
    return db
