from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings
from app.database import client as mongo_client
from app.routers.owner import router as owner_router
from app.middleware.error_handler import GlobalErrorHandler

settings = get_settings()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    await mongo_client.admin.command("ping")
    print("Connected to MongoDB")
    yield
    mongo_client.close()


app = FastAPI(
    title="Restaurant Owner Service",
    description="Owner dashboard and restaurant management",
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

app.include_router(owner_router)


@app.get("/", tags=["Health"])
def root():
    return {"status": "ok", "service": "restaurant-owner-service"}


@app.get("/health", tags=["Health"])
def health():
    return {"status": "healthy"}
