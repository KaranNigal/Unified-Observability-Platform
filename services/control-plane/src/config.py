import os

class Config:
    DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://airflow:Niraj%4031@localhost:5432/airflow")
    JWT_SECRET = os.getenv("JWT_SECRET", "capsule-control-plane-jwt-super-secret-2026")
    JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
    REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))
    ENVIRONMENT = os.getenv("ENVIRONMENT", "development")

settings = Config()
