"""
database.py - MySQL connection via SQLAlchemy
"""
import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

load_dotenv()

DB_USER = os.getenv("DB_USER")
DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT")
DB_NAME = os.getenv("DB_NAME")

# PyMySQL Driver
DATABASE_URL = f"mysql+pymysql://{DB_USER}:@{DB_HOST}:{DB_PORT}/{DB_NAME}"

engine = create_engine(DATABASE_URL, echo=False)

# Each call to SessionLocal() gives you one DB session
# autocommit=False means we control when commits happen
# autoflush=False prevents SQLalchemy from auto-flushing before every query
# which avoids subtle bugs where half-written data leaks into reads
SessionLocal = sessionmaker(autocommit=False,
                            autoflush=False,
                            )

# All the ORM models inherit from this Base class
Base = declarative_base()


def get_db():
    """
    FastAPI dependency that yields a DB session per request
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
