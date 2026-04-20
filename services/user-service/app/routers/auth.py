from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm

from app.database import get_db
from app.kafka_producer import publish_user_event
from app.schemas import TokenResponse, UserLogin, UserProfileResponse, UserSignup
from app.utils.security import (
    create_access_token,
    create_session,
    delete_session,
    get_current_user,
    hash_password,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post(
    "/signup",
    response_model=UserProfileResponse,
    status_code=status.HTTP_201_CREATED,
)
async def signup(request: UserSignup):
    mongo = get_db()
    existing = await mongo.users.find_one({"email": request.email})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    user_doc = {
        "name": request.name,
        "email": request.email,
        "password_hash": hash_password(request.password),
        "role": request.role.value,
        "phone": None,
        "about_me": None,
        "city": None,
        "state": None,
        "country": None,
        "languages": None,
        "gender": None,
        "profile_picture": None,
        "preferences": None,
        "created_at": datetime.now(timezone.utc),
    }

    result = await mongo.users.insert_one(user_doc)
    user_doc["id"] = str(result.inserted_id)
    await publish_user_event("user.created", {
        "user_id": user_doc["id"],
        "name": user_doc["name"],
        "email": user_doc["email"],
        "role": user_doc["role"],
    })

    return UserProfileResponse(**user_doc)


@router.post("/login", response_model=TokenResponse)
async def login(request: UserLogin):
    mongo = get_db()
    user = await mongo.users.find_one({"email": request.email})
    if not user or not verify_password(request.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token, session_id, expires_at = create_access_token(
        {"sub": str(user["_id"]), "role": user["role"]}
    )
    await create_session(str(user["_id"]), session_id, expires_at)
    return TokenResponse(access_token=token)


@router.post("/token", response_model=TokenResponse, include_in_schema=False)
async def login_for_swagger(form_data: OAuth2PasswordRequestForm = Depends()):
    """OAuth2-compatible endpoint used by Swagger UI's Authorize dialog."""
    mongo = get_db()
    user = await mongo.users.find_one({"email": form_data.username})
    if not user or not verify_password(form_data.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token, session_id, expires_at = create_access_token(
        {"sub": str(user["_id"]), "role": user["role"]}
    )
    await create_session(str(user["_id"]), session_id, expires_at)
    return TokenResponse(access_token=token)


@router.post(
    "/owner/signup",
    response_model=UserProfileResponse,
    status_code=status.HTTP_201_CREATED,
)
async def owner_signup(request: UserSignup):
    if request.role != "owner":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role must be 'owner' for this endpoint",
        )
    if not request.restaurant_location:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Restaurant location is required for owner signup",
        )

    mongo = get_db()
    existing = await mongo.users.find_one({"email": request.email})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    user_doc = {
        "name": request.name,
        "email": request.email,
        "password_hash": hash_password(request.password),
        "role": "owner",
        "phone": None,
        "about_me": None,
        "city": None,
        "state": None,
        "country": None,
        "languages": None,
        "gender": None,
        "profile_picture": None,
        "preferences": None,
        "created_at": datetime.now(timezone.utc),
    }

    result = await mongo.users.insert_one(user_doc)
    user_doc["id"] = str(result.inserted_id)
    await publish_user_event("user.created", {
        "user_id": user_doc["id"],
        "name": user_doc["name"],
        "email": user_doc["email"],
        "role": user_doc["role"],
    })

    return UserProfileResponse(**user_doc)


@router.post("/logout")
async def logout(current_user: dict = Depends(get_current_user)):
    session_id = current_user.get("_session_id")
    if session_id:
        await delete_session(session_id)
    return {"message": "Logged out successfully"}
