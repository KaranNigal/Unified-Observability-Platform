from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.db import Base, engine
from src.routers import auth, organizations, api_keys

# Initialize database tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Capsule Control Plane API",
    description="Multi-tenant Organization, Membership, and API Key Management Service for Capsule Observability Platform.",
    version="1.0.0",
    docs_url="/control-plane/docs",
    openapi_url="/control-plane/openapi.json",
    redoc_url="/control-plane/redoc"
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router)
app.include_router(organizations.router)
app.include_router(api_keys.router)

@app.get("/")
def read_root():
    return {
        "service": "Capsule Control Plane",
        "status": "healthy",
        "docs": "/control-plane/docs"
    }

@app.get("/health")
def health():
    return {"status": "healthy"}
