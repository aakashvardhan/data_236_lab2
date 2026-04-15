import uuid
from datetime import datetime, timedelta, timezone

from bson import ObjectId
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext

from app.config import get_settings
from app.database import get_db

settings = get_settings()
pwd_context = CryptContext(schemes=["bcrypt"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")


def create_access_token(data: dict) -> str:
    """Create a JWT that also carries a unique session_id claim."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.JWT_EXPIRATION_MINUTES
    )
    session_id = uuid.uuid4().hex
    to_encode.update({"exp": expire, "sid": session_id})
    token = jwt.encode(
        to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM
    )
    return token, session_id, expire


def decode_access_token(token: str) -> dict | None:
    try:
        return jwt.decode(
            token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
        )
    except JWTError:
        return None


def hash_password(plain_password: str) -> str:
    return pwd_context.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


async def create_session(user_id: str, session_id: str, expires_at: datetime) -> None:
    """Store a session document in MongoDB. TTL index auto-deletes it."""
    mongo = get_db()
    await mongo.sessions.insert_one({
        "session_id": session_id,
        "user_id": user_id,
        "created_at": datetime.now(timezone.utc),
        "expires_at": expires_at,
    })


async def delete_session(session_id: str) -> None:
    """Remove a session document (logout)."""
    mongo = get_db()
    await mongo.sessions.delete_one({"session_id": session_id})


async def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    """Decode the JWT, verify session exists in MongoDB, and return user."""
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    mongo = get_db()

    # Verify session is still active in MongoDB
    session_id = payload.get("sid")
    if session_id:
        session = await mongo.sessions.find_one({"session_id": session_id})
        if not session:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session expired or invalidated",
                headers={"WWW-Authenticate": "Bearer"},
            )

    user = await mongo.users.find_one({"_id": ObjectId(payload["sub"])})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    user["id"] = str(user["_id"])
    user["_session_id"] = session_id
    return user
