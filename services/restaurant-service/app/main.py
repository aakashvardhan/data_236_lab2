import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import get_settings
from app.database import client as mongo_client
from app.middleware.error_handler import GlobalErrorHandler
from app.routers.restaurants import router as restaurants_router

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    await mongo_client.admin.command("ping")
    print("Connected to MongoDB")
    yield
    mongo_client.close()


app = FastAPI(
    title="Restaurant Service",
    description="Restaurant CRUD and search",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(GlobalErrorHandler)

cors_origins = settings.CORS_ORIGINS.split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

app.include_router(restaurants_router)


@app.get("/", tags=["Health"])
def root():
    return {"status": "ok", "service": "restaurant-service"}


@app.get("/health", tags=["Health"])
def health():
    return {"status": "healthy"}
