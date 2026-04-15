"""
database.py - MySQL connection via SQLAlchemy
"""
import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

load_dotenv()

DB_USER = os.environ.get("DB_USER", "root")
DB_PASSWORD = os.environ.get("DB_PASSWORD", "")
DB_HOST = os.environ.get("DB_HOST", "mysql")
DB_PORT = os.environ.get("DB_PORT", "3306")
DB_NAME = os.environ.get("DB_NAME", "yelp_db")

# PyMySQL Driver
DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

engine = create_engine(DATABASE_URL, echo=True)  # echo=True for debugging

# Each call to SessionLocal() gives you one DB session
# autocommit=False means we control when commits happen
# autoflush=False prevents SQLalchemy from auto-flushing before every query
# which avoids subtle bugs where half-written data leaks into reads
SessionLocal = sessionmaker(autocommit=False,
                            autoflush=False,
                            bind=engine)

# All the ORM models inherit from this Base class


class Base(DeclarativeBase):
    pass


def get_db():
    """
    FastAPI dependency that yields a DB session per request
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
