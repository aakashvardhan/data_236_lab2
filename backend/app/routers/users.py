import os
import uuid
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, UserPreference
from app.schemas import UserProfileResponse, UserProfileUpdate, UserPreferenceCreate, UserPreferencesResponse
from app.utils.security import get_current_user

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/me", response_model=UserProfileResponse)
def get_profile(current_user: User = Depends(get_current_user)):
    return current_user

@router.put("/me", response_model=UserProfileResponse)
def update_profile(
    request: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    update_data = request.model_dump(exclude_unset=True)
    for k, v in update_data.items():
        if hasattr(current_user, k):
            setattr(current_user, k, v)
    db.commit()
    db.refresh(current_user)
    return current_user

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads", "profile_pics")
os.makedirs(UPLOAD_DIR, exist_ok=True)
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
MAX_FILE_SIZE = 5 * 1024 * 1024

@router.put("/me/profile-pic", response_model=dict)
async def upload_profile_pic(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type {ext} not allowed. Use: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size exceeds 5MB limit"
        )
    filename = f"{current_user.id}_{uuid.uuid4().hex}{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    with open(filepath, "wb") as f:
        f.write(contents)
    if current_user.profile_picture is not None:
        old_filename = os.path.basename(current_user.profile_picture)
        old_path = os.path.join(UPLOAD_DIR, old_filename)
        if os.path.exists(old_path):
            os.remove(old_path)
    current_user.profile_picture = f"/uploads/profile_pics/{filename}"
    db.commit()
    return {"profile_picture": current_user.profile_picture}

@router.post("/me/preferences", response_model=UserPreferencesResponse, status_code=status.HTTP_201_CREATED)
def save_preference(
    request: UserPreferenceCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    existing = db.query(UserPreference).filter(
        UserPreference.user_id == current_user.id).first()
    if existing:
        update_data = request.model_dump(exclude_unset=True)
        for k, v in update_data.items():
            setattr(existing, k, v)
        db.commit()
        db.refresh(existing)
        return existing
    preferences = UserPreference(
        user_id=current_user.id,
        **request.model_dump()
    )
    db.add(preferences)
    db.commit()
    db.refresh(preferences)
    return preferences

@router.get("/me/preferences", response_model=UserPreferencesResponse)
def get_preferences(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    preferences = db.query(UserPreference).filter(
        UserPreference.user_id == current_user.id
    ).first()
    if not preferences:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Preferences not set yet"
        )
    return preferences