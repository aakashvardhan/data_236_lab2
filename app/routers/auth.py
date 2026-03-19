from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User
from app.schemas import UserSignup, UserProfileResponse
from app.utils.security import hash_password

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/signup", response_model=UserProfileResponse, status_code=status.HTTP_201_CREATED)
def signup(request: UserSignup, db: Session = Depends(get_db)):
    # Check if the email already exists
    existing = db.query(User).filter(User.email == request.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Create User
    user = User(
        name=request.name,
        email=request.email,
        password_hash=hash_password(request.password),
        role=request.role
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return user
