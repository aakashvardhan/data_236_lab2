import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import get_settings
from app.database import client as mongo_client, ensure_indexes
from app.middleware.error_handler import GlobalErrorHandler
from app.routers.ai_assistant import router as ai_assistant_router
from app.routers.auth import router as auth_router
from app.routers.favorites import router as favorites_router
from app.routers.users import router as users_router

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    await mongo_client.admin.command("ping")
    print("Connected to MongoDB")
    await ensure_indexes()
    yield
    mongo_client.close()


app = FastAPI(
    title="User Service",
    description="User authentication, profiles, favorites, and AI assistant",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(GlobalErrorHandler)

CORS_ORIGINS = settings.CORS_ORIGINS.split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

app.include_router(auth_router)
app.include_router(users_router)
app.include_router(favorites_router)
app.include_router(ai_assistant_router)


@app.get("/", tags=["Health"])
def root():
    return {"status": "ok", "service": "user-service"}


@app.get("/health", tags=["Health"])
def health():
    return {"status": "healthy"}
