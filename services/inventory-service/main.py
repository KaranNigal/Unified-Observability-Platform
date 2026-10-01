import asyncio
import os
import random
import socket
import sys
import time
import uuid

import structlog
from fastapi import FastAPI, HTTPException, Request
from opentelemetry import trace
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from prometheus_client import Counter, Histogram
from prometheus_fastapi_instrumentator import Instrumentator
from pydantic import BaseModel


class MultiWriter:
    def __init__(self, *files):
        self.files = files

    def write(self, data):
        for f in self.files:
            f.write(data)

    def flush(self):
        for f in self.files:
            f.flush()


os.makedirs("/app/logs", exist_ok=True)
log_file = open("/app/logs/inventory-service.log", "a", encoding="utf-8")

# Configure structured logging
structlog.configure(
    processors=[
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.dict_tracebacks,
        structlog.processors.JSONRenderer(),
    ],
    wrapper_class=structlog.make_filtering_bound_logger(20),
    context_class=dict,
    logger_factory=structlog.PrintLoggerFactory(MultiWriter(sys.stdout, log_file)),
)
logger = structlog.get_logger(
    component="microservice",
    service_name="inventory-service",
    source_host=socket.gethostname(),
)

TENANT_ID = os.getenv("TENANT_ID", os.getenv("CAPSULE_TENANT_ID", "demo"))
API_KEY = os.getenv("API_KEY", os.getenv("CAPSULE_API_KEY", "uop_live_demo"))

# Custom Prometheus Metrics
INVENTORY_CHECKS_TOTAL = Counter(
    "inventory_checks_total",
    "Total number of inventory checks",
    ["component", "environment", "service_name", "result", "tenant_id"],
)
INVENTORY_CHECK_DURATION = Histogram(
    "inventory_check_duration_seconds",
    "Duration of inventory checks",
    ["component", "environment", "service_name", "tenant_id"],
)

COMMON_LABELS = {
    "component": "microservice",
    "environment": os.getenv("ENVIRONMENT", "development"),
    "service_name": "inventory-service",
    "tenant_id": TENANT_ID,
}

app = FastAPI(title="Inventory Service")

# Set up tracing with tenant_id
resource = Resource(
    attributes={"service.name": "inventory-service", "tenant_id": TENANT_ID}
)
trace.set_tracer_provider(TracerProvider(resource=resource))
otlp_exporter = OTLPSpanExporter(endpoint="http://otel-collector:4317", insecure=True)
trace.get_tracer_provider().add_span_processor(BatchSpanProcessor(otlp_exporter))

FastAPIInstrumentor.instrument_app(app)

# Setup Instrumentator
Instrumentator().instrument(app).expose(app)

# In-Memory Stock
stock_db: dict[str, int] = {
    f"PROD-{i:03d}": random.randint(50, 500) for i in range(1, 21)
}


# Middleware for Trace ID and Logging
@app.middleware("http")
async def logging_middleware(request: Request, call_next):
    trace_id = request.headers.get("X-Trace-ID", str(uuid.uuid4()))
    request.state.trace_id = trace_id

    start_time = time.time()
    response = await call_next(request)
    duration_ms = (time.time() - start_time) * 1000

    response.headers["X-Trace-ID"] = trace_id

    # Log request details
    logger.info(
        "Request processed",
        trace_id=trace_id,
        method=request.method,
        path=request.url.path,
        status_code=response.status_code,
        duration_ms=duration_ms,
        tenant_id=TENANT_ID,
    )

    return response


# Pydantic Models
class CheckRequest(BaseModel):
    product_id: str
    quantity: int


class RestockRequest(BaseModel):
    product_id: str
    quantity: int


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "inventory-service", "version": "1.0.0"}


@app.get("/")
async def root():
    return {
        "service": "inventory-service",
        "version": "1.0.0",
        "endpoints": ["/health", "/metrics", "/inventory/check", "/inventory/stock"],
    }


@app.post("/inventory/check")
async def check_inventory(request: CheckRequest):
    with INVENTORY_CHECK_DURATION.labels(**COMMON_LABELS).time():
        await asyncio.sleep(random.uniform(0.01, 0.1))

        # Simulate DB timeout (3% chance)
        if random.random() < 0.03:
            INVENTORY_CHECKS_TOTAL.labels(**COMMON_LABELS, result="error").inc()
            raise HTTPException(status_code=503, detail="Database timeout")

        if request.product_id not in stock_db:
            INVENTORY_CHECKS_TOTAL.labels(**COMMON_LABELS, result="error").inc()
            raise HTTPException(status_code=404, detail="Product not found")

        current_stock = stock_db[request.product_id]
        available = current_stock >= request.quantity

        result_label = "in_stock" if available else "out_of_stock"
        INVENTORY_CHECKS_TOTAL.labels(**COMMON_LABELS, result=result_label).inc()

        return {
            "product_id": request.product_id,
            "available": available,
            "current_stock": current_stock,
        }


@app.get("/inventory/stock")
async def get_stock():
    return stock_db


@app.put("/inventory/restock")
async def restock(request: RestockRequest):
    if request.product_id not in stock_db:
        stock_db[request.product_id] = 0

    stock_db[request.product_id] += request.quantity
    return {"product_id": request.product_id, "new_stock": stock_db[request.product_id]}
