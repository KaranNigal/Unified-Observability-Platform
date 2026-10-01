from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from routers import health, metrics, kafka, dashboard, logs, traces, rca, auth_router, tenant_router
from prometheus_fastapi_instrumentator import Instrumentator

app = FastAPI(
    title="Unified Observability Platform - Metrics & Control Plane API",
    description="Multi-tenant REST API Gateway and Control Plane for Observability.",
    version="2.0.0"
)

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow dashboard and local dev origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Multi-Tenant Guard Middleware: Strictly reject any client attempting to pass tenant_id
@app.middleware("http")
async def reject_client_supplied_tenant_id(request: Request, call_next):
    if "tenant_id" in request.query_params:
        return JSONResponse(
            status_code=400,
            content={
                "detail": "Client-supplied tenant_id is forbidden. Tenant identity is strictly resolved server-side from authenticated credentials."
            }
        )
    return await call_next(request)

# Register routers
app.include_router(health.router, prefix="/api/v1")
app.include_router(health.router)
app.include_router(auth_router.router)
app.include_router(tenant_router.router)
app.include_router(metrics.router)
app.include_router(kafka.router)
app.include_router(dashboard.router)
app.include_router(logs.router)
app.include_router(traces.router)
app.include_router(rca.router)

# Self-monitor the Metrics API itself using Prometheus FastAPI Instrumentator.
# This automatically registers standard HTTP request metrics and exposes
# all metrics (including our custom cache hit/miss counters) on the "/metrics" endpoint.
Instrumentator().instrument(app).expose(app)

@app.get("/")
def read_root():
    return {
        "message": "Unified Observability Platform Metrics API is running.",
        "docs": "/docs"
    }
