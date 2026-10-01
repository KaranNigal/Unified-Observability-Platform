# Data Source Services & Telemetry Generators

This directory contains the data-generating services monitored by the **Capsule Unified Observability Platform**.

---

## 📦 Services Overview

### 1. [Apache Airflow (`airflow/`)](file:///c:/Users/Niraj/Documents/Niraj/Final-Year-Project/Codebase/services/airflow)
- **Role**: Workflow orchestration and scheduled ETL batch pipelines.
- **Telemetry Emitted**:
  - Task execution duration, DAG success/failure counts, scheduler heartbeat.
  - Pushed via **StatsD (UDP :9125)** to Prometheus `statsd-exporter` (port `9102`).
  - Structured execution logs written to shared volume `/opt/airflow/logs`.

### 2. [PySpark Batch Jobs (`pyspark/`)](file:///c:/Users/Niraj/Documents/Niraj/Final-Year-Project/Codebase/services/pyspark)
- **Role**: Distributed data processing and batch aggregation jobs.
- **Telemetry Emitted**:
  - Ephemeral batch runtime duration, records processed, job exit codes.
  - Pushed to **Prometheus Pushgateway (port `9091`)** at job completion.

### 3. [Orders Microservice (`orders-service/`)](file:///c:/Users/Niraj/Documents/Niraj/Final-Year-Project/Codebase/services/orders-service)
- **Role**: Transactional FastAPI microservice that processes user purchase orders and calls the Inventory Service.
- **Port**: `8000`
- **Telemetry Emitted**:
  - Distributed OpenTelemetry traces with `traceparent` propagation to Jaeger (port `4317`).
  - Prometheus metrics (`/metrics`) for HTTP request latencies and status codes.
  - JSON application logs forwarded to OpenTelemetry Collector / Logstash.

### 4. [Inventory Microservice (`inventory-service/`)](file:///c:/Users/Niraj/Documents/Niraj/Final-Year-Project/Codebase/services/inventory-service)
- **Role**: Warehouse stock tracking and inventory reservation API.
- **Port**: `8001`
- **Telemetry Emitted**:
  - Trace spans, `/metrics` endpoint, structured JSON logs.

### 5. [Kafka Trading Simulator (`kafka-trading/`)](file:///c:/Users/Niraj/Documents/Niraj/Final-Year-Project/Codebase/services/kafka-trading)
- **Role**: High-velocity synthetic financial transaction pipeline.
- **Producer (`producer.py`)**: Emits trade orders into Kafka topic `trading-events` at 100–10,000+ msgs/sec (Prometheus metrics on port `8002`).
- **Consumer (`consumer.py`)**: Consumes trading events, validates orders, tracks partition consumer lag, and exposes lag metrics on port `8003`.
