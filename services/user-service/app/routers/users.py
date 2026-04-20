import os
import uuid

from bson import ObjectId
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from app.database import get_db
from app.kafka_producer import publish_user_event
from app.schemas import (
    UserPreferenceCreate,
    UserPreferencesResponse,
    UserProfileResponse,
    UserProfileUpdate,
)
from app.utils.security import get_current_user

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me", response_model=UserProfileResponse)
async def get_profile(current_user: dict = Depends(get_current_user)):
    return UserProfileResponse(
        id=current_user["id"],
        name=current_user["name"],
        email=current_user["email"],
        phone=current_user.get("phone"),
        about_me=current_user.get("about_me"),
        city=current_user.get("city"),
        state=current_user.get("state"),
        country=current_user.get("country"),
        languages=current_user.get("languages"),
        gender=current_user.get("gender"),
        profile_picture=current_user.get("profile_picture"),
        role=current_user["role"],
        created_at=current_user["created_at"],
    )


@router.put("/me", response_model=UserProfileResponse)
async def update_profile(
    request: UserProfileUpdate,
    current_user: dict = Depends(get_current_user),
):
    update_data = request.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update",
        )

    if "gender" in update_data and update_data["gender"] is not None:
        update_data["gender"] = update_data["gender"].value

    mongo = get_db()
    await mongo.users.update_one(
        {"_id": ObjectId(current_user["id"])},
        {"$set": update_data},
    )

    updated = await mongo.users.find_one({"_id": ObjectId(current_user["id"])})
    updated["id"] = str(updated["_id"])
    await publish_user_event("user.updated", {
        "user_id": updated["id"],
        **{k: v for k, v in update_data.items()},
    })

    return UserProfileResponse(
        id=updated["id"],
        name=updated["name"],
        email=updated["email"],
        phone=updated.get("phone"),
        about_me=updated.get("about_me"),
        city=updated.get("city"),
        state=updated.get("state"),
        country=updated.get("country"),
        languages=updated.get("languages"),
        gender=updated.get("gender"),
        profile_picture=updated.get("profile_picture"),
        role=updated["role"],
        created_at=updated["created_at"],
    )


UPLOAD_DIR = "uploads/profile_pics"
os.makedirs(UPLOAD_DIR, exist_ok=True)
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
MAX_FILE_SIZE = 5 * 1024 * 1024


@router.put("/me/profile-pic", response_model=dict)
async def upload_profile_pic(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type {ext} not allowed. Use: {', '.join(ALLOWED_EXTENSIONS)}",
        )

    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size exceeds 5MB limit",
        )

    filename = f"{current_user['id']}_{uuid.uuid4().hex}{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    with open(filepath, "wb") as f:
        f.write(contents)

    old_pic = current_user.get("profile_picture")
    if old_pic:
        old_path = old_pic.lstrip("/")
        if os.path.exists(old_path):
            os.remove(old_path)

    new_path = f"/{filepath}"
    mongo = get_db()
    await mongo.users.update_one(
        {"_id": ObjectId(current_user["id"])},
        {"$set": {"profile_picture": new_path}},
    )

    return {"profile_picture": new_path}


@router.post(
    "/me/preferences",
    response_model=UserPreferencesResponse,
    status_code=status.HTTP_201_CREATED,
)
async def save_preference(
    request: UserPreferenceCreate,
    current_user: dict = Depends(get_current_user),
):
    pref_data = request.model_dump(exclude_unset=True)
    mongo = get_db()

    await mongo.users.update_one(
        {"_id": ObjectId(current_user["id"])},
        {"$set": {"preferences": pref_data}},
    )

    return UserPreferencesResponse(user_id=current_user["id"], **pref_data)


@router.get("/me/preferences", response_model=UserPreferencesResponse)
async def get_preferences(current_user: dict = Depends(get_current_user)):
    prefs = current_user.get("preferences")
    if not prefs:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Preferences not set yet",
        )

    return UserPreferencesResponse(user_id=current_user["id"], **prefs)
