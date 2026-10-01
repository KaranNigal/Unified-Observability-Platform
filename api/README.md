# FastAPI Telemetry Gateway API

The **FastAPI Telemetry Gateway** (`api/`) is the centralized REST API layer that queries, normalizes, and caches telemetry data from backend observability engines (Prometheus, Elasticsearch, Jaeger, and Redis) for downstream consumption by web dashboards and automated risk/health systems.

---

## 🚀 Key Capabilities

- **High-Performance Asynchronous Routing**: Built with FastAPI and Uvicorn for asynchronous I/O and high concurrency.
- **Sub-10ms Redis Caching**: Implements intelligent query caching with short TTLs (5–15 seconds) to prevent excessive query load on Prometheus and Elasticsearch.
- **Multi-Engine Telemetry Proxies**:
  - **Metrics**: Real-time and historical range queries to Prometheus TSDB.
  - **Kafka Lag**: Ingestion velocity and consumer lag calculation across topics and consumer groups.
  - **Logs**: Filterable structured log search proxying Elasticsearch.
  - **Distributed Traces**: Search and span retrieval proxying Jaeger.
- **Self-Monitoring**: Auto-instruments its own HTTP endpoints via `prometheus-fastapi-instrumentator`, exposing latency and error metrics on `/metrics`.
- **API Key Security**: Validates incoming client requests using the `X-API-Key` HTTP header.

---

## 📡 API Endpoints Reference

### Health & Self-Monitoring
| Method | Route | Description | Auth Required |
|:---|:---|:---|:---|
| `GET` | `/api/v1/health` | Checks status of Prometheus, Redis, and Elasticsearch | No |
| `GET` | `/metrics` | Prometheus scrape endpoint for API metrics | No |
| `GET` | `/docs` | Interactive Swagger / OpenAPI documentation | No |

### Telemetry & Metrics
| Method | Route | Parameters | Description |
|:---|:---|:---|:---|
| `GET` | `/api/v1/metrics/{component}` | `component`: `airflow` \| `pyspark` \| `orders-service` \| `inventory-service` \| `kafka` | Returns current metrics snapshot |
| `GET` | `/api/v1/metrics/{component}/history` | `step`, `duration` (e.g., `15m`, `1h`) | Returns historical time-series data |
| `GET` | `/api/v1/kafka/lag` | None | Returns consumer lag and message throughput per topic/partition |
| `GET` | `/api/v1/dashboard/summary` | None | Returns consolidated single-payload platform summary |

### Logs & Traces
| Method | Route | Parameters | Description |
|:---|:---|:---|:---|
| `GET` | `/api/v1/logs/search` | `service`, `level`, `limit`, `query` | Queries logs from Elasticsearch |
| `GET` | `/api/v1/traces/search` | `service`, `limit`, `lookback` | Queries distributed traces from Jaeger |

---

## ⚙️ Configuration & Environment Variables

| Variable | Default Value | Description |
|:---|:---|:---|
| `API_KEY` | `super-secret-key-123` | Shared secret token expected in `X-API-Key` header |
| `REDIS_URL` | `redis://localhost:6379/0` | Connection URI for Redis cache |
| `PROMETHEUS_URL` | `http://localhost:9090` | Base URL for Prometheus query API |
| `ELASTICSEARCH_URL` | `http://localhost:9200` | Base URL for Elasticsearch REST API |
| `JAEGER_URL` | `http://localhost:16686` | Base URL for Jaeger query API |
| `ENVIRONMENT` | `development` | Runtime environment name |

---

## 💻 Running the API Locally

### Via Root Scripts (Recommended)

```powershell
# Windows
.\run.ps1 api

# Linux / macOS
make api
```

### Manually

```bash
cd api
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8004 --reload
```

Interactive documentation is available at [http://localhost:8004/docs](http://localhost:8004/docs).
