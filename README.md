# Capsule — Unified Observability Platform
### For Apache Airflow, PySpark, Microservices & High-Volume Trading Systems with a High-Performance Telemetry API

[![Python 3.11](https://img.shields.io/badge/Python-3.11%2B-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688.svg)](https://fastapi.tiangolo.com/)
[![Next.js 15](https://img.shields.io/badge/Next.js-15.1-black.svg)](https://nextjs.org/)
[![Apache Airflow](https://img.shields.io/badge/Airflow-2.10.5-017CEE.svg)](https://airflow.apache.org/)
[![Apache Spark](https://img.shields.io/badge/PySpark-3.5.4-E25A1C.svg)](https://spark.apache.org/)
[![Apache Kafka](https://img.shields.io/badge/Kafka-3.8.1-231F20.svg)](https://kafka.apache.org/)
[![Prometheus](https://img.shields.io/badge/Prometheus-v2.55-E6522C.svg)](https://prometheus.io/)
[![Elasticsearch](https://img.shields.io/badge/Elasticsearch-8.17-005571.svg)](https://www.elastic.co/)
[![Jaeger](https://img.shields.io/badge/Jaeger-1.54-60D0E4.svg)](https://www.jaegertracing.io/)
[![Terraform](https://img.shields.io/badge/Terraform-1.5%2B-7B42BC.svg)](https://www.terraform.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**Capsule** is an open-source, cloud-native unified observability platform that ingests, correlates, and visualizes **Metrics, Logs, and Distributed Traces** across heterogeneous data engineering pipelines and real-time event systems.

Built as a final-year B.Tech capstone project at **AISSMS Institute of Information Technology, Pune (2026–27)**.

---

## 📑 Table of Contents

- [System Architecture](#-system-architecture)
- [Monitored Data Sources](#-monitored-data-sources)
- [Key Features](#-key-features)
- [Service Port & Credentials Map](#-service-port--credentials-map)
- [Quick Start](#-quick-start)
  - [Prerequisites](#prerequisites)
  - [Windows (PowerShell)](#windows-powershell-recommended)
  - [Linux / macOS / WSL2 (Make)](#linux--macos--wsl2-make)
- [FastAPI Telemetry Gateway](#-fastapi-telemetry-gateway)
- [Capsule Next.js Dashboard](#-capsule-nextjs-dashboard)
- [Cloud Infrastructure & Kubernetes](#-cloud-infrastructure--kubernetes)
- [Benchmarks & Performance](#-benchmarks--performance)
- [Project Directory Structure](#-project-directory-structure)
- [Documentation Links](#-documentation-links)
- [Project Team & Academic Control](#-project-team--academic-control)

---

## 🏛 System Architecture

The platform implements a modular 5-tier telemetry architecture:

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                                 DATA SOURCES                                     │
│  Airflow DAGs      │ PySpark Batch Jobs │ Orders & Inventory │ Kafka Trading    │
│  (StatsD / Logs)   │ (Pushgateway/Logs) │ (OTel SDK/FastAPI) │ (Prometheus/Logs)│
└─────────┬──────────┴─────────┬──────────┴─────────┬──────────┴────────┬─────────┘
          │                    │                    │                   │
          ▼                    ▼                    ▼                   ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                       INGESTION & COLLECTION LAYER                               │
│  StatsD Exporter (9125) │ Pushgateway (9091) │ OpenTelemetry Collector (8889/4317)│
└─────────┬────────────────────┴────────────────────┴───────────────────┬─────────┘
          │ (Metrics)                                                   │ (Logs & Spans)
          ▼                                                             ▼
┌──────────────────────────────────────┐       ┌───────────────────────────────────┐
│           STORAGE LAYER              │       │         STORAGE LAYER             │
│   Prometheus TSDB (Port 9090)        │       │   Elasticsearch (Port 9200)       │
│   Alertmanager (Port 9093)           │       │   Jaeger Traces (Port 16686/4317) │
└──────────────────┬───────────────────┘       └─────────────────┬─────────────────┘
                   │                                             │
                   │ Query Metrics                               │ Query Logs & Traces
                   ▼                                             ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                          FASTAPI TELEMETRY GATEWAY                               │
│                 Endpoints: /health, /metrics, /kafka/lag,                        │
│                 /dashboard/summary, /logs/search, /traces/search                 │
│                 Caching: Redis (Port 6379) - Sub-10ms responses                  │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         │
                         REST API & Cache Ingestion
                                         │
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                              VISUALIZATION LAYER                                 │
│  ┌─────────────────────────────────┐   ┌──────────────────┐   ┌───────────────┐  │
│  │   Capsule Next.js Dashboard     │   │     Grafana      │   │    Kibana     │  │
│  │     (Port 3000 - Single Pane)   │──▶│   (Port 3001)    │──▶│  (Port 5601)  │  │
│  └─────────────────────────────────┘   └──────────────────┘   └───────────────┘  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Monitored Data Sources

1. **Apache Airflow (2.10.5)**:
   - Orchestrates ETL workflows and DAG schedules.
   - Emits real-time task durations, success/failure states, and scheduler heartbeat via **StatsD Exporter** on UDP port `9125`.
2. **PySpark (3.5.4)**:
   - Executes batch analytics jobs on a master-worker cluster.
   - Emits ephemeral job completion status, record counts, and execution runtimes to **Prometheus Pushgateway** on port `9091`.
3. **Polyglot Microservices (FastAPI)**:
   - `orders-service` (port `8000`) and `inventory-service` (port `8001`).
   - Integrated with OpenTelemetry Python SDK for distributed trace propagation (`traceparent`), request latency metrics, and structured JSON logging.
4. **Kafka Real-Time Trading Simulator**:
   - High-throughput trade producer emitting market transactions (100–10,000+ msgs/sec).
   - Dedicated trading consumer tracking partition offset lag, trade execution error rates, and throughput counters.

---

## ✨ Key Features

- **Three Pillars of Observability**: Unifies **Metrics** (Prometheus), **Logs** (Elasticsearch + Logstash), and **Traces** (Jaeger + OpenTelemetry) in one coherent stack.
- **FastAPI Telemetry Gateway**: High-concurrency async REST API with Redis caching, delivering **8ms p50** metric retrieval latencies.
- **Capsule Next.js 15 Dashboard**: Modern dark-themed glassmorphism interface with real-time status gauges, Kafka consumer lag monitors, service health trackers, and log/trace inspection.
- **Automated Alerting**: Pre-configured Prometheus Alertmanager rules for pipeline failures, high consumer lag, and microservice downtime.
- **Dual Operating Profiles**: Run the **Full Stack** (with ELK) for complete log search or the **Lite Stack** (6 GB RAM) for core metric/trace observability.
- **Production-Ready IaC**: Complete AWS Terraform modules (EKS, VPC, ALB, ElastiCache) and Kubernetes deployment manifests.
- **88% Cost Reduction**: Self-hosted cloud architecture saves ~88% compared to commercial SaaS solutions like Datadog for 1B monthly events.

---

## 🌐 Service Port & Credentials Map

| Service | Port / URL | Credentials / Notes |
|---|---|---|
| **Capsule Next.js Dashboard** | [http://localhost:3000](http://localhost:3000) | Single-Pane-of-Glass UI |
| **FastAPI Metrics API** | [http://localhost:8004](http://localhost:8004) | Header: `X-API-Key: super-secret-key-123` |
| **API Interactive Swagger Docs** | [http://localhost:8004/docs](http://localhost:8004/docs) | Interactive API exploration |
| **Apache Airflow Webserver** | [http://localhost:8080](http://localhost:8080) | `admin` / `admin` (or `Niraj@31`) |
| **Grafana Dashboards** | [http://localhost:3001](http://localhost:3001) | `admin` / `admin` (or `Niraj@31`) |
| **Prometheus Server** | [http://localhost:9090](http://localhost:9090) | Time-series query & targets |
| **Prometheus Alertmanager** | [http://localhost:9093](http://localhost:9093) | Active firing alerts |
| **Jaeger Tracing UI** | [http://localhost:16686](http://localhost:16686) | Distributed waterfall traces |
| **Kibana Logs UI** *(full only)* | [http://localhost:5601](http://localhost:5601) | Full-text Elasticsearch search |
| **Elasticsearch** *(full only)* | [http://localhost:9200](http://localhost:9200) | JSON log storage |
| **Spark Master UI** | [http://localhost:8180](http://localhost:8180) | Spark cluster status |
| **Spark Worker UI** | [http://localhost:8181](http://localhost:8181) | Worker node execution status |
| **Orders Microservice** | [http://localhost:8000](http://localhost:8000) | Sample transactional API |
| **Inventory Microservice** | [http://localhost:8001](http://localhost:8001) | Sample inventory API |
| **Kafka Broker** | `localhost:9094` (Host) / `kafka:9092` (Docker) | KRaft mode (no Zookeeper) |
| **Redis Cache** | `localhost:6379` | Celery broker & API query cache |
| **PostgreSQL** | `localhost:5432` | `airflow` / `airflow` |

---

## 🛠 Quick Start

### Prerequisites

| Tool | Minimum Version | Verify Command |
|---|---|---|
| **Docker & Docker Compose** | 24.0+ (Compose V2) | `docker compose version` |
| **Python** | 3.11+ | `python --version` |
| **Node.js & npm** | Node 18+ / npm 9+ | `node -v` && `npm -v` |
| **PowerShell** (Windows) or **Make** (Linux/macOS) | Any | `make --version` |

> [!IMPORTANT]
> **Elasticsearch Kernel Configuration (WSL2 / Linux)**:
> Run this command once to permit Elasticsearch memory allocation:
> ```bash
> # Windows (WSL2 with Docker Desktop)
> wsl -d docker-desktop sysctl -w vm.max_map_count=262144
>
> # Linux
> sudo sysctl -w vm.max_map_count=262144
> ```

---

### Windows (PowerShell) [Recommended]

The repository includes a PowerShell master CLI `.\run.ps1` that mirrors all development operations:

```powershell
# 1. Initialize environment files (.env and next-dashboard/.env.local)
.\run.ps1 init

# 2. Generate Airflow encryption keys and update .env
.\run.ps1 generate-keys

# 3. Start the Docker stack
.\run.ps1 up              # Full profile (with ELK, ~12 GB RAM)
# OR
.\run.ps1 up -Lite        # Lite profile (without ELK, ~6 GB RAM)

# 4. Start local dev servers (FastAPI on 8004 + Next.js on 3000)
.\run.ps1 dev

# 5. Check stack health & container status
.\run.ps1 status

# 6. Launch all web dashboards in your browser
.\run.ps1 open
```

---

### Linux / macOS / WSL2 (Make)

```bash
# 1. Setup environment files
make init

# 2. Generate Airflow security keys
make generate-keys
# (Paste output into .env)

# 3. Start the stack
make up                   # Full stack
# OR
make up-lite              # Lite stack (skips ELK)

# 4. Run API and Next.js frontend in development mode
make api                  # Terminal 1: FastAPI on port 8004
make dashboard            # Terminal 2: Next.js on port 3000

# 5. Check container health
make status
```

---

## ⚡ FastAPI Telemetry Gateway

The **FastAPI Telemetry API** (`api/`) acts as an intelligent query and caching layer between the frontends and storage backends (Prometheus, Elasticsearch, Jaeger, Redis):

- **Sub-10ms Cache Retrieval**: Redis caches repeated metric and lag queries with a 5–15 second TTL.
- **Built-in Self Instrumentation**: Uses `prometheus-fastapi-instrumentator` to expose its own metrics at `http://localhost:8004/metrics`.
- **API Key Security**: Endpoints are protected via `X-API-Key` headers.

### Primary API Routes

```http
GET  /api/v1/health                  # Aggregated health of all storage & telemetry services
GET  /api/v1/metrics/{component}     # Current metrics (airflow, pyspark, orders-service, kafka, etc.)
GET  /api/v1/metrics/{component}/history # Historical time-series with range query params
GET  /api/v1/kafka/lag               # Consumer lag across partitions & consumer groups
GET  /api/v1/dashboard/summary       # Aggregated single-payload summary for Next.js UI
GET  /api/v1/logs/search             # Filterable log query proxy over Elasticsearch
GET  /api/v1/traces/search           # Filterable trace query proxy over Jaeger
GET  /metrics                        # Self-monitoring Prometheus scrape endpoint
```

---

## 🖥 Capsule Next.js Dashboard

Located in `next-dashboard/`, the Capsule UI provides an executive overview and operational control panel:

- **Unified Status Overview**: Live counters for total requests, active DAGs, Kafka throughput, and firing alerts.
- **Kafka Trading Monitor**: Real-time consumer lag meters, message velocity gauges, and error tracking.
- **Service Telemetry Grid**: Status cards for Airflow, PySpark, Orders, Inventory, Collector, and Kafka.
- **Live Logs & Trace Explorer**: Interactive viewers connected to Elasticsearch and Jaeger.
- **Direct Drill-down Links**: Instant access to Airflow Webserver, Grafana, Kibana, and Jaeger.

```bash
# To run frontend independently:
cd next-dashboard
npm install
npm run dev
# Open http://localhost:3000
```

---

## ☁️ Cloud Infrastructure & Kubernetes

The infrastructure is 100% defined as code using **Terraform** in `infra/terraform/` and **Kubernetes manifests** in `infra/k8s/`:

- **Amazon EKS Cluster**: Managed Kubernetes control plane with autoscaling worker node groups (`t3.medium`).
- **AWS VPC**: Multi-AZ public and private subnets, NAT Gateway, and security groups.
- **Amazon ElastiCache Redis**: Managed Redis instance for Airflow Celery and API query caching.
- **Application Load Balancer (ALB)**: AWS Load Balancer Controller routing external ingress traffic.

To provision cloud infrastructure:
```bash
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars
terraform init
terraform plan
terraform apply
```
> [!CAUTION]
> Always execute `terraform destroy` when testing is complete to prevent unintended AWS charges.

---

## 📊 Benchmarks & Performance

### 1. API Latency & Caching Efficiency (50 Concurrent Users)
- **Cache Hit Latency**: **8ms p50** / 17ms p90 / 30ms p95.
- **Direct Prometheus Query (Cache Miss)**: 18ms p50 / 34ms p90 / 68ms p95.
- **Conclusion**: Redis caching reduces backend Prometheus query load by over 80% while delivering consistent sub-10ms UI responses.

### 2. High-Throughput Kafka Stream Validation
- **Tested Burst Capacity**: 10,000–60,000 msgs/sec with **0.00% data loss**.
- **Projected 1 Billion Monthly Events**: Validated on Kubernetes horizontal pod autoscaling (HPA) with consumer lag recovering within seconds after traffic bursts.

### 3. Cost-Benefit Analysis (1TB Monthly Log Volume, 15-Day Retention)

| Solution | Estimated Monthly Cost | Total Cost of Ownership (TCO) |
|:---|:---|:---|
| **Capsule (Custom AWS EKS)** | **~$210.00** | **Baseline (88% Savings)** |
| **Datadog SaaS** | **~$1,800.00** | +757% higher cost |
| **Self-Hosted EC2 ELK** | **~$830.00** | +295% higher cost |

---

## 📂 Project Directory Structure

```
Codebase/
├── api/                         # FastAPI Telemetry Gateway & Redis caching
│   ├── routers/                 # Health, metrics, kafka, dashboard, logs, traces
│   ├── auth.py                  # API key authentication
│   ├── cache.py                 # Redis caching decorator & client
│   └── main.py                  # FastAPI application entrypoint
├── collector/                   # OpenTelemetry Collector configuration
│   └── otel-collector-config.yaml
├── dashboards/                  # Pre-configured Grafana & Kibana artifacts
│   ├── grafana/provisioning/    # Datasources and dashboard JSON files
│   └── kibana/                  # Index patterns and saved objects
├── docs/                        # Complete project documentation
│   ├── PRD.md                   # Authoritative Product Requirements Document
│   ├── Development_Prompting.md # Sprint & phase prompts
│   ├── benchmark-results.md     # Load testing & latency benchmarks
│   └── data-retention.md        # Capacity planning & storage retention
├── infra/
│   ├── terraform/               # AWS infrastructure (VPC, EKS, ElastiCache, ALB)
│   ├── k8s/                     # Kubernetes manifests & deploy scripts
│   └── load-testing/            # Locust load test scripts
├── logstash/pipeline/           # Logstash filter and output pipeline configs
├── next-dashboard/              # Capsule Next.js 15 Web Application
│   ├── src/app/                 # App Router pages, layout, and API proxies
│   └── src/lib/                 # Backend API client & TypeScript interfaces
├── prometheus/                  # Prometheus scraping config, alert rules, StatsD maps
├── services/                    # Monitored data source services
│   ├── airflow/dags/            # Synthetic ETL pipeline DAGs
│   ├── pyspark/                 # PySpark batch analytics processing scripts
│   ├── orders-service/          # Orders microservice with OTel tracing
│   ├── inventory-service/       # Inventory microservice
│   └── kafka-trading/           # High-volume Kafka trading producer & consumer
├── docker-compose.yml           # Complete local multi-container stack definition
├── Makefile                     # Cross-platform development shortcut targets
├── run.ps1                      # Master PowerShell automation script for Windows
├── pyproject.toml               # Python formatting & linting configuration
└── .env.example                 # Environment variables template
```

---

## 📖 Documentation Links

- 📄 [Product Requirements Document (PRD)](docs/PRD.md)
- ⚡ [Benchmark & Load Test Results](docs/benchmark-results.md)
- 💾 [Data Retention & Capacity Planning](docs/data-retention.md)
- 🤖 [Development Prompting Guide](docs/Development_Prompting.md)
- ☁️ [Terraform AWS Infrastructure Guide](infra/terraform/README.md)
- 🖥 [Next.js Dashboard Guide](next-dashboard/README.md)

---

## 👥 Project Team & Academic Control

**Group 4 — Department of Information Technology**  
**AISSMS Institute of Information Technology, Pune (AY 2026–27)**

| Name | PRN / Roll No. | Role |
|:---|:---|:---|
| **Manish Sanjay Narkhede** | 23510038 | Data Pipelines & PySpark Integration |
| **Karan Sunil Nigal** | 23510039 | Infrastructure, Kafka & Storage Engines |
| **Niraj Tushar Shevade** | 23510055 | Telemetry API, Tracing & Next.js Frontend |

- **Project Guide**: Prof. R. Y. Totare (Assistant Professor, Dept. of IT)
- **Head of Department**: Dr. H. B. Magar (HOD, Dept. of IT)

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
