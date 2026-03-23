import os
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from routers.auth import router as auth_router
from routers.restaurants import router as restaurant_router
from routers.reviews import router as review_router
from routers.users import router as user_router
from routers.favorites import router as favorite_router
from routers.owner import router as owner_router
from database import engine, Base
from models import User, UserPreference, Restaurant, Review, Favorite

from fastapi.requests import Request
from fastapi.responses import JSONResponse
from routers.ai_assistant import router as ai_assistant_router
from middleware.error_handler import GlobalErrorHandler
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException


from models import ConversationMessage
load_dotenv()

tags_metadata = [
    {"name": "Auth", "description": "Registration, login, and logout"},
    {"name": "Users", "description": "Profile management and preferences"},
    {"name": "Restaurants", "description": "Restaurant CRUD and search"},
    {"name": "Reviews", "description": "Create, edit, delete reviews"},
    {"name": "Favorites", "description": "Bookmark restaurants"},
    {"name": "Owner", "description": "Owner dashboard and analytics"},
]

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    print("Database tables created...")
    yield

app = FastAPI(
    title="Yelp Restaurant API",
    description="Restaurant discovery and review platform with AI assistant",
    version="1.0.0",
    openapi_tags=tags_metadata,
    lifespan=lifespan
)
app.add_middleware(GlobalErrorHandler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

app.include_router(auth_router)
app.include_router(restaurant_router)
app.include_router(review_router)
app.include_router(user_router)
app.include_router(favorite_router)
app.include_router(owner_router)
app.include_router(ai_assistant_router)


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "type": "http_error"},
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={
            "detail": "Invalid request data",
            "errors": exc.errors(),
            "type": "validation_error",
        },
    )

@app.get("/", tags=["Health"])
def root():
    return {"status": "ok", "message": "Yelp Restaurant API is running"}

@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "healthy"}