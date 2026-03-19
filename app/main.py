"""
main.py -- FastAPI application entry point
"""
import os
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.routers.auth import router as auth_router

from .database import engine, Base


# Uncomment as we build each component
# from .routers import auth, users, restaurants, reviews, favorites, owner, ai_assistant


from .models import User, UserPreference, Restaurant, Review, Favorite

load_dotenv()


# lifespan: runs once on startup / shutdown
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Creates all tables if they don't exist yet.
    """
    Base.metadata.create_all(bind=engine)
    print("Database tables created...")
    yield

# ----------- App Instance -------------
app = FastAPI(
    title="Yelp Restaurant API",
    description="Restaurant discovery and review platform with AI assistant",
    version="1.0.0",
    lifespan=lifespan
)

# ------------- CORS Middleware ------------
# React dev server is running on port 3000
# Without CORS middleware, browser blocks cross-origin requests.

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000"
    ],
    allow_credentials=True,  # needed if you use cookies/sessions
    allow_methods=["*"],  # GET, POST, PUT, DELETE, etc
    allow_headers=["*"]  # Authorization header, Content-Type,etc
)

# ------------- Static Files (for uploaded images) -------------

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


# -------------- Routers -----------------------------
# Mounting all route modules
app.include_router(auth_router)


# ------------ Health Check ---------------------


@app.get("/", tags=["Health"])
def root():
    return {"status": "ok",
            "message": "Yelp Restaurant API is running"}


@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "healthy"}
