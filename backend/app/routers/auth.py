from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User
from app.schemas import UserSignup, UserProfileResponse, TokenResponse, UserLogin
from app.utils.security import hash_password, verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/auth", tags=["Auth"])

@router.post("/signup", response_model=UserProfileResponse, status_code=status.HTTP_201_CREATED)
def signup(request: UserSignup, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == request.email).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
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

@router.post("/login", response_model=TokenResponse)
def login(request: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.email).first()
    if not user or not verify_password(request.password, str(user.password_hash)):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password", headers={"WWW-Authenticate": "Bearer"})
    token = create_access_token({"sub": str(user.id), "role": user.role})
    return TokenResponse(access_token=token)

@router.post("/token", response_model=TokenResponse, include_in_schema=False)
def login_for_swagger(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, str(user.password_hash)):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password", headers={"WWW-Authenticate": "Bearer"})
    token = create_access_token({"sub": str(user.id), "role": user.role})
    return TokenResponse(access_token=token)

@router.post("/owner/signup", response_model=UserProfileResponse, status_code=status.HTTP_201_CREATED)
def owner_signup(request: UserSignup, db: Session = Depends(get_db)):
    if request.role != "owner":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Role must be 'owner' for this endpoint")
    if not request.restaurant_location:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Restaurant location is required for owner signup")
    existing = db.query(User).filter(User.email == request.email).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
    user = User(name=request.name, email=request.email, password_hash=hash_password(request.password), role="owner")
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@router.post("/logout")
def logout(current_user: User = Depends(get_current_user)):
    return {"message": "Logged out successfully"}