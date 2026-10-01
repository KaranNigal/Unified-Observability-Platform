import os


class Config:
    API_KEY = os.getenv("API_KEY", "super-secret-key-123")
    REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    PROMETHEUS_URL = os.getenv("PROMETHEUS_URL", "http://localhost:9090")
    DATABASE_URL = os.getenv(
        "DATABASE_URL", "postgresql://airflow:Niraj%4031@localhost:5432/airflow"
    )
    JWT_SECRET = os.getenv("JWT_SECRET", "capsule-super-secure-jwt-secret-key-2026")
    JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES = int(
        os.getenv("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", "1440")
    )  # 24 hours
    ENVIRONMENT = os.getenv("ENVIRONMENT", "development")


settings = Config()
