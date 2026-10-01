# Telemetry Data Retention & Capacity Planning

This document details the data retention configurations, estimated storage growth under simulated workloads, and the architectural modifications required for a production-grade deployment of the **Capsule Unified Observability Platform**.

---

## 1. Retention Windows

| Telemetry Pillar | Storage Engine | Default Retention | Mechanism | Rationale |
| :--- | :--- | :--- | :--- | :--- |
| **Metrics** | Prometheus TSDB | 15 days | `--storage.tsdb.retention.time=15d` | Sufficient window for capstone validation and analyzing multi-day trend deviations without exhausting local disk volumes. |
| **Logs** | Elasticsearch | 7 days | Index Lifecycle Policy (`logs_retention_policy`) | Standard retention for high-velocity application logs. Daily indices roll over and delete automatically to prevent disk saturation. |
| **Distributed Traces** | Jaeger Memory / Storage | 48 hours | In-memory ring buffer (Local) / S3-backed index (Cloud) | Sufficient duration for active incident diagnosis and debugging transaction bottlenecks. |

---

## 2. Capacity Planning & Storage Growth Estimation

### 2.1 Metrics (Prometheus)
- **Workload Profile**:
  - Scrape interval: 10–15 seconds.
  - Active scrape targets: 7 (Airflow StatsD Exporter, PySpark Pushgateway, Orders Service, Inventory Service, Kafka Producer, Kafka Consumer, FastAPI Metrics API).
  - Average metrics per target: ~100 time-series.
  - Total active time series: ~700.
- **Storage Calculation**:
  - Scrapes per day per target: `(24 * 3600) / 10 = 8,640` scrapes.
  - Total samples per day: `8,640 * 700 = 6,048,000` samples.
  - Prometheus TSDB compression averages ~1.5 to 2.0 bytes per sample.
  - **Daily Storage Growth**: `6,048,000 * 2 bytes = ~12.1 MB / day`.
  - **15-Day Metric Footprint**: `12.1 MB * 15 days = ~181.5 MB`.

### 2.2 Logs (Elasticsearch)
- **Workload Profile**:
  - Health check probes: Periodic requests generating ~12,000 logs/day.
  - Simulated trading events & microservice calls: ~2–5 logs/second average = ~250,000 logs/day.
  - Average raw JSON log size: ~250 bytes.
- **Storage Calculation**:
  - Raw uncompressed log size: `250,000 * 250 bytes = ~62.5 MB / day`.
  - Elasticsearch indexing overhead factor (inverted index, mapping data, doc values): ~2.5x.
  - **Daily Log Storage Growth**: `62.5 MB * 2.5 = ~156.25 MB / day`.
  - **7-Day Log Footprint**: `156.25 MB * 7 days = ~1.09 GB`.

### 2.3 Distributed Traces (Jaeger / OTel)
- **Workload Profile**:
  - Microservice inter-service transactions: ~10 traces/sec with 3–5 spans per trace.
  - Average span size: ~400 bytes (attributes, events, timings).
  - **Daily Trace Growth**: `10 * 4 * 400 bytes * 86,400 = ~1.38 GB / day` (uncompressed).
  - Local in-memory limit capped at **512 MB** via Docker container limits.

### 2.4 Total Local Storage Footprint
At steady state, the local development environment stores approximately **~1.5 GB** of active telemetry data (181 MB metrics + 1.09 GB logs + in-memory traces), providing a lightweight footprint suitable for local developer workstations.

---

## 3. Production Cloud Architecture Recommendations

To transition the platform to an enterprise-scale AWS EKS deployment, the following storage modifications are recommended:

### 3.1 Long-Term Metric Scalability (Thanos / Mimir)
- **Thanos Sidecar & Amazon S3**: Deploy Thanos Sidecar alongside Prometheus to ship 2-hour TSDB blocks to an Amazon S3 bucket.
- **Automated Downsampling**: Enable Thanos Compactor to downsample historical data (e.g., 5-minute resolution after 40 hours, 1-hour resolution after 14 days), allowing multi-year queries at low storage cost.

### 3.2 Tiered Log Storage (Amazon OpenSearch & ISM)
- **Tiered Index State Management**:
  - **Hot Phase (Days 1–3)**: Fast NVMe SSD EBS volumes for high-speed indexing and immediate debugging.
  - **Warm Phase (Days 4–14)**: UltraWarm nodes backed by Amazon S3 for cost-effective querying.
  - **Cold / Archive Phase (Days 15–90)**: Snapshot indices to Glacier/S3 for compliance and audit retention.

### 3.3 Kafka Log Buffering
- Introduce Kafka as a persistent buffering layer between the OpenTelemetry Collector and Logstash/OpenSearch. This absorbs sudden traffic spikes without overwhelming downstream indexing nodes.
