import os
import uuid
import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from config import settings

# Graceful DB connection with fallback support
db_url = settings.DATABASE_URL
# Handle possible postgres:// -> postgresql:// alias
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

try:
    engine = create_engine(db_url, pool_pre_ping=True, pool_size=10, max_overflow=20)
except Exception as e:
    print(f"Warning: Failed to create Postgres engine with {db_url}: {e}. Falling back to SQLite memory/file.")
    engine = create_engine("sqlite:///./control_plane.db", connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
