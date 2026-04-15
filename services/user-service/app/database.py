from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ASCENDING

from app.config import get_settings

settings = get_settings()

client = AsyncIOMotorClient(settings.MONGO_URI)
db = client[settings.MONGO_DB_NAME]


def get_db():
    """Return the motor database handle."""
    return db


async def ensure_indexes():
    """Create TTL index on sessions so MongoDB auto-deletes expired docs."""
    await db.sessions.create_index(
        [("expires_at", ASCENDING)],
        expireAfterSeconds=0,
        name="session_ttl",
    )
