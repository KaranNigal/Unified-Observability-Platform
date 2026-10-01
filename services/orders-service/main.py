import asyncio
import os
import random
import socket
import sys
import time
import uuid

import httpx
import structlog
from fastapi import FastAPI, HTTPException, Request
from opentelemetry import trace
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
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
log_file = open("/app/logs/orders-service.log", "a", encoding="utf-8")

# Configure structlog
structlog.configure(
    processors=[
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.dict_tracebacks,
        structlog.processors.JSONRenderer(),
    ],
    wrapper_class=structlog.make_filtering_bound_logger(20),
    logger_factory=structlog.PrintLoggerFactory(MultiWriter(sys.stdout, log_file)),
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()
HOSTNAME = socket.gethostname()

# Metrics
ORDERS_CREATED = Counter(
    "orders_created_total",
    "Total number of orders created",
    ["component", "environment", "status", "tenant_id"],
)
ORDER_PROCESSING_DURATION = Histogram(
    "order_processing_duration_seconds",
    "Time spent processing orders",
    ["component", "environment", "tenant_id"],
)

COMPONENT_LABEL = "microservice"
ENVIRONMENT_LABEL = os.getenv("ENVIRONMENT", "development")
SERVICE_NAME = "orders-service"
TENANT_ID = os.getenv("TENANT_ID", os.getenv("CAPSULE_TENANT_ID", "demo"))
API_KEY = os.getenv("API_KEY", os.getenv("CAPSULE_API_KEY", "uop_live_demo"))

app = FastAPI(title="Orders Service")

# Set up tracing with multi-tenant resource attributes
resource = Resource(attributes={"service.name": SERVICE_NAME, "tenant_id": TENANT_ID})
trace.set_tracer_provider(TracerProvider(resource=resource))
otlp_exporter = OTLPSpanExporter(endpoint="http://otel-collector:4317", insecure=True)
trace.get_tracer_provider().add_span_processor(BatchSpanProcessor(otlp_exporter))

FastAPIInstrumentor.instrument_app(app)
HTTPXClientInstrumentor().instrument()


@app.middleware("http")
async def add_trace_id_and_log(request: Request, call_next):
    trace_id = request.headers.get("X-Trace-ID", str(uuid.uuid4()))
    structlog.contextvars.clear_contextvars()
    structlog.contextvars.bind_contextvars(
        trace_id=trace_id,
        component=COMPONENT_LABEL,
        service_name=SERVICE_NAME,
        source_host=HOSTNAME,
        tenant_id=TENANT_ID,
    )

    start_time = time.time()
    response = await call_next(request)
    duration_ms = (time.time() - start_time) * 1000

    logger.info(
        "Request processed",
        method=request.method,
        path=request.url.path,
        status_code=response.status_code,
        duration_ms=duration_ms,
    )

    response.headers["X-Trace-ID"] = trace_id
    return response


# Auto-instrument FastAPI with Prometheus
Instrumentator().instrument(app).expose(app)


class OrderItem(BaseModel):
    product_id: str
    quantity: int


class OrderRequest(BaseModel):
    customer_id: int
    items: list[OrderItem]


@app.get("/health")
async def health():
    return {"status": "healthy", "service": SERVICE_NAME, "version": "1.0.0"}


@app.get("/")
async def root():
    return {
        "service": SERVICE_NAME,
        "version": "1.0.0",
        "endpoints": ["/health", "/metrics", "/orders"],
    }


@app.post("/orders")
async def create_order(order_req: OrderRequest):
    start_time = time.time()
    order_id = str(uuid.uuid4())

    # Check inventory
    async with httpx.AsyncClient() as client:
        for item in order_req.items:
            try:
                resp = await client.post(
                    "http://inventory-service:8001/inventory/check",
                    json={"product_id": item.product_id, "quantity": item.quantity},
                    timeout=2.0,
                )
                resp.raise_for_status()
            except Exception as e:
                logger.warning(
                    "Failed to check inventory",
                    product_id=item.product_id,
                    error=str(e),
                )

    # Simulate processing
    await asyncio.sleep(random.uniform(0.05, 0.3))

    # Simulate failures
    if random.random() < 0.05:
        ORDERS_CREATED.labels(
            component=COMPONENT_LABEL,
            environment=ENVIRONMENT_LABEL,
            status="failure",
            tenant_id=TENANT_ID,
        ).inc()
        duration = time.time() - start_time
        ORDER_PROCESSING_DURATION.labels(
            component=COMPONENT_LABEL,
            environment=ENVIRONMENT_LABEL,
            tenant_id=TENANT_ID,
        ).observe(duration)
        raise HTTPException(
            status_code=500, detail="Internal Server Error during order processing"
        )

    ORDERS_CREATED.labels(
        component=COMPONENT_LABEL,
        environment=ENVIRONMENT_LABEL,
        status="success",
        tenant_id=TENANT_ID,
    ).inc()
    duration = time.time() - start_time
    ORDER_PROCESSING_DURATION.labels(
        component=COMPONENT_LABEL, environment=ENVIRONMENT_LABEL, tenant_id=TENANT_ID
    ).observe(duration)

    return {
        "order_id": order_id,
        "customer_id": order_req.customer_id,
        "status": "created",
        "items": [item.dict() for item in order_req.items],
    }


@app.get("/orders/{order_id}")
async def get_order(order_id: str):
    return {"order_id": order_id, "status": "processing"}
