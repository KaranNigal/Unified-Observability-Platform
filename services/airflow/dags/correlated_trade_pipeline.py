import os
import time
from datetime import datetime

import requests
from airflow import DAG
from airflow.operators.python import PythonOperator

TENANT_ID = os.getenv("TENANT_ID", os.getenv("CAPSULE_TENANT_ID", "demo"))
API_KEY = os.getenv("API_KEY", os.getenv("CAPSULE_API_KEY", "uop_live_demo"))

# We need to gracefully handle opentelemetry imports in case they aren't installed yet
# due to the container restarting.
try:
    from opentelemetry import trace
    from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
    from opentelemetry.propagate import inject
    from opentelemetry.sdk.resources import Resource
    from opentelemetry.sdk.trace import TracerProvider
    from opentelemetry.sdk.trace.export import BatchSpanProcessor

    # Initialize Tracing for Airflow with multi-tenant resource attributes
    resource = Resource(
        attributes={"service.name": "airflow-pipeline", "tenant_id": TENANT_ID}
    )
    tracer_provider = TracerProvider(resource=resource)
    # otel-collector is reachable from airflow on obs-network
    otlp_exporter = OTLPSpanExporter(
        endpoint="http://otel-collector:4317", insecure=True
    )
    tracer_provider.add_span_processor(BatchSpanProcessor(otlp_exporter))
    trace.set_tracer_provider(tracer_provider)
    tracer = trace.get_tracer(__name__)
    OTEL_AVAILABLE = True
except ImportError:
    OTEL_AVAILABLE = False


def start_trade_processing(**context):
    if not OTEL_AVAILABLE:
        print("OpenTelemetry not available.")
        return {}

    with tracer.start_as_current_span("dag_start_trade") as span:
        span.set_attribute("event.name", "trade_execution")
        span.set_attribute("trade.id", context["run_id"])
        span.set_attribute("tenant_id", TENANT_ID)

        # Inject the trace context into a dictionary to pass via XCom
        headers = {}
        inject(headers)
        headers["X-Tenant-ID"] = TENANT_ID
        headers["X-API-Key"] = API_KEY

        print(f"Trace injected headers: {headers}")
        time.sleep(1)  # simulate work
        return headers


def run_spark_job(**context):
    if not OTEL_AVAILABLE:
        return {}

    ti = context["ti"]
    headers = ti.xcom_pull(task_ids="start_trade_processing") or {}

    # We extract the context from the headers to continue the trace
    from opentelemetry.propagate import extract

    ctx = extract(headers)

    # Simulate a Spark Job span (normally Spark would do this)
    # We set the service.name to spark-cluster to simulate the boundary cross
    spark_resource = Resource(
        attributes={"service.name": "spark-cluster", "tenant_id": TENANT_ID}
    )
    spark_tracer_provider = TracerProvider(resource=spark_resource)
    spark_tracer_provider.add_span_processor(
        BatchSpanProcessor(
            OTLPSpanExporter(endpoint="http://otel-collector:4317", insecure=True)
        )
    )
    spark_tracer = spark_tracer_provider.get_tracer(__name__)

    with spark_tracer.start_as_current_span(
        "spark_batch_processing", context=ctx
    ) as span:
        span.set_attribute("records_processed", 5000)
        span.set_attribute("tenant_id", TENANT_ID)
        time.sleep(2)  # simulate Spark processing time

        # Inject the new context to pass to the microservice
        new_headers = {}
        inject(new_headers)
        new_headers["X-Tenant-ID"] = TENANT_ID
        new_headers["X-API-Key"] = API_KEY
        return new_headers


def call_microservice(**context):
    ti = context["ti"]
    headers = ti.xcom_pull(task_ids="run_spark_job") or {}
    headers["X-Tenant-ID"] = TENANT_ID
    headers["X-API-Key"] = API_KEY

    if not headers:
        print("No trace headers found.")
        return

    # Call the actual orders-service
    payload = {
        "customer_id": 123,
        "items": [
            {"product_id": "PROD-001", "quantity": 10},
            {"product_id": "PROD-005", "quantity": 2},
        ],
    }

    print(f"Calling Orders Service with headers: {headers}")
    try:
        # orders-service is available in the docker network
        res = requests.post(
            "http://orders-service:8000/orders",
            json=payload,
            headers=headers,
            timeout=5,
        )
        res.raise_for_status()
        print(f"Orders Service Response: {res.json()}")
    except Exception as e:
        print(f"Microservice call failed: {e}")


with DAG(
    dag_id="correlated_trade_pipeline",
    schedule="*/2 * * * *",  # Run every 2 minutes
    start_date=datetime(2024, 1, 1),
    catchup=False,
    tags=["trading", "correlated", "observability", "demo"],
) as dag:

    t1 = PythonOperator(
        task_id="start_trade_processing",
        python_callable=start_trade_processing,
    )

    t2 = PythonOperator(
        task_id="run_spark_job",
        python_callable=run_spark_job,
    )

    t3 = PythonOperator(
        task_id="call_microservice",
        python_callable=call_microservice,
    )

    t1 >> t2 >> t3
