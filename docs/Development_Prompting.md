# Development Master Prompt Set — Unified Observability Platform

## How to use this document

1. Paste the **Master Context Prompt** (Part 0) into a `CLAUDE.md` / `AGENTS.md` file at your repo root, or as the first message of any new agent/LLM coding session. It gives the assistant persistent project memory so you don't re-explain architecture every session.
2. Run the **phase prompts** (Part 1–9) *in order*, one per session/sprint. Each is self-contained but assumes the previous phase's output exists.
3. The sequencing below **deliberately differs from the early PRD phase order** — see the note below.

### Why the sequencing changed from the PRD

The initial PRD provisioned AWS infrastructure in **Phase 2**, before any data sources or services existed to run on it. That meant EKS, ALB, and ElastiCache would sit idle and billing while application code was still being written — which is an unnecessary cloud cost risk.

The plan below builds and proves the entire stack locally with **Docker Compose** first (Phases 1–6), and introduces Terraform/EKS once there's a fully working system to deploy (Phases 7–9). This is a direct mitigation for cloud cost overruns: you only pay for AWS during the infrastructure/cloud deployment phases and the final benchmark run.

| # | This plan | Purpose / Scope |
|---|---|---|
| 1 | Repo scaffold & local environment | Folder structure, base Docker Compose, tooling (`run.ps1`, `Makefile`) |
| 2 | Data sources (Airflow, PySpark, microservices, Kafka producer) | Telemetry-emitting sample services & trading simulation |
| 3 | Ingestion & Tracing (OpenTelemetry Collector, Jaeger, StatsD) | Metric scraping, span forwarding, log routing |
| 4 | Storage layer (Prometheus, Alertmanager, ELK Stack) | TSDB retention, Elasticsearch index policies, alerting rules |
| 5 | Telemetry Gateway API (FastAPI + Redis) | REST endpoints, PromQL caching, ES/Jaeger proxies, self-instrumentation |
| 6A | Deep-dive visualization & alerting (Grafana, Kibana, Jaeger UI) | Operational dashboards, saved log queries, trace waterfall views |
| 6B | Capsule Next.js Dashboard | Modern single-pane-of-glass UI (Next.js 15 App Router, React 19, Tailwind) |
| 7 | Infrastructure as Code (Terraform on AWS) | VPC, EKS, ALB, ElastiCache Redis modules |
| 8 | Cloud deployment (EKS) | Kubernetes manifests, HPA, ALB Ingress routing |
| 9 | Load testing at scale + benchmarking | Locust API benchmarks, Kafka burst testing, Datadog cost comparison |
| — | Final report & demo | Capstone documentation, presentation, viva-voce defense |

---

## Part 0 — Master Context Prompt

> Paste this once as `CLAUDE.md` / `AGENTS.md` or as your first message in every new session.

```
PROJECT CONTEXT — Capsule (Unified Observability Platform)

We are building a final-year B.Tech capstone project: a unified observability
platform for Apache Airflow, PySpark, microservices, and a Kafka-based trading
system, with a high-performance Telemetry API and Next.js Single-Pane-of-Glass UI.

ARCHITECTURE (5 layers):
1. Data Sources — Airflow (DAG orchestration), PySpark (batch analytics),
   polyglot microservices (Orders & Inventory via FastAPI/OTel), Kafka trading simulator
2. Collection & Ingestion — OpenTelemetry Collector, StatsD Exporter, Pushgateway
3. Storage & Processing — Prometheus TSDB (metrics), Elasticsearch + Logstash (logs),
   Jaeger (traces), Redis (cache)
4. API & Visualization — FastAPI Telemetry API + Redis cache, Next.js 15 Dashboard,
   Grafana, Kibana, Jaeger UI
5. Infrastructure — Docker Compose (local dev), Amazon EKS, Terraform on AWS (IaC)

TECH STACK: Python 3.11, FastAPI, Redis, Apache Airflow 2.10, PySpark 3.5,
Apache Kafka 3.8 (KRaft), Prometheus 2.55, Elasticsearch 8.17, Logstash 8.17,
Kibana 8.17, Jaeger 1.54, Next.js 15, React 19, TypeScript, Tailwind CSS,
OpenTelemetry Contrib, Docker Compose, Terraform, Amazon EKS.

CENTRAL DASHBOARD: Next.js 15 (Capsule UI) is the single-pane-of-glass interface.
It is a pure client of the FastAPI Telemetry API (Phase 5) — it never queries
Prometheus, Elasticsearch, or Redis directly. This keeps one source of truth for
query logic and lets the dashboard inherit Redis caching for free. Grafana,
Kibana, and Jaeger remain the tools of record for operational deep dives;
Capsule links out to them rather than reimplementing all their views.

NON-FUNCTIONAL TARGETS:
- Kafka: sustain 10k–60k msg/s bursts; 1–2 billion monthly message scale, no data loss
- Metrics API: sub-10ms response on Redis cache hits (8ms p50 achieved)
- All cloud infrastructure defined as code via Terraform (VPC, EKS, ALB, ElastiCache)
- Open source, vendor-neutral, no proprietary lock-in
- Single AWS region for initial version (multi-region is future scope)

BUILD STRATEGY:
- Local-first. Everything runs via Docker Compose (`make up` or `.\run.ps1 up`)
  before anything touches AWS. Terraform/EKS is introduced in the infrastructure phase.
- Every phase must be runnable and demoable on its own.
```

---

## Part 1 — Repo Scaffold & Local Environment

```
PROMPT — Phase 1: Repo Scaffold

Set up the monorepo structure described in the project context. Deliverables:

1. Create the folder structure:
   /services/, /collector/, /api/, /dashboards/, /next-dashboard/, /infra/, /docs/
2. Add a root docker-compose.yml with core services: Airflow (webserver, scheduler,
   Postgres DB, Redis Celery broker), Kafka (KRaft mode), Prometheus, Alertmanager,
   Elasticsearch, Logstash, Kibana, Grafana, Jaeger, and OpenTelemetry Collector.
3. Add a root README.md explaining how to run the stack and which ports map to which UI.
4. Add .gitignore, .env.example, Makefile (Linux/macOS), and run.ps1 (Windows PowerShell).
5. Set up GitHub Actions CI for compose syntax validation and Python linting.

Verify: All containers start cleanly without crash loops and pass health checks.
```

---

## Part 2 — Data Sources

```
PROMPT — Phase 2: Data Sources

Implement the four data-generating components against the local stack:

1. Airflow: Add sample ETL DAGs with realistic variability (random delays, occasional
   retries) and configure Airflow StatsD metrics emission to StatsD Exporter on port 9125.
2. PySpark: Create batch analytics jobs that process synthetic transaction data and push
   runtime metrics (duration, records processed) to Prometheus Pushgateway on port 9091.
3. Microservices: Build 'orders-service' and 'inventory-service' in FastAPI. Instrument
   with OpenTelemetry SDK for distributed tracing, metrics, and structured JSON logs.
4. Kafka Trading Simulator: Write a high-throughput producer generating financial order
   events (100–10,000+ msgs/s) and a consumer tracking partition-level consumer lag.

Verify: All four components emit observable metrics and structured logs.
```

---

## Part 3 — Ingestion & Tracing

```
PROMPT — Phase 3: Ingestion Layer

Configure OpenTelemetry Collector and exporter bridges:

1. Ingest StatsD metrics, Pushgateway metrics, and direct FastAPI /metrics scrapes.
2. Receive distributed trace spans via OTLP (gRPC: 4317 / HTTP: 4318) and forward to Jaeger.
3. Collect container application logs from shared volumes and forward to Logstash.
4. Check in otel-collector-config.yaml to /collector/.

Verify: OTel collector metrics show zero drop rate and active trace span forwarding.
```

---

## Part 4 — Storage Layer

```
PROMPT — Phase 4: Storage Engines

1. Prometheus: Configure scrape targets, 15-day TSDB retention, and alert rules
   (DAG failure rates, consumer lag thresholds, 5xx error spikes).
2. Elasticsearch & Logstash: Configure Logstash pipeline filter to parse JSON logs and index
   into Elasticsearch (`logs-YYYY.MM.DD`) with automated 7-day index rollover.
3. Jaeger: Retain distributed trace spans for deep waterfall inspection.
4. Check in /docs/data-retention.md with capacity planning and storage growth models.

Verify: Metrics queryable in Prometheus UI, logs searchable in Kibana, spans visible in Jaeger.
```

---

## Part 5 — Telemetry Gateway API

```
PROMPT — Phase 5: Telemetry API

Build the FastAPI Telemetry API in /api/:

1. Implement core endpoints:
   - GET /api/v1/health — aggregated platform component health
   - GET /api/v1/metrics/{component} — real-time snapshot
   - GET /api/v1/metrics/{component}/history — PromQL range query
   - GET /api/v1/kafka/lag — consumer lag and topic velocity
   - GET /api/v1/dashboard/summary — single aggregated payload for Next.js UI
   - GET /api/v1/logs/search — Elasticsearch log search proxy
   - GET /api/v1/traces/search — Jaeger trace search proxy
2. Add Redis caching layer: 5–15s TTL for high-frequency queries to reduce TSDB load.
3. Add API key authentication via `X-API-Key` header.
4. Add self-instrumentation using `prometheus-fastapi-instrumentator` on `/metrics`.

Verify: Endpoints return cached responses in <10ms and pass pytest test suites.
```

---

## Part 6A — Operational Dashboards (Grafana, Kibana, Jaeger)

```
PROMPT — Phase 6A: Grafana, Kibana & Jaeger Provisioning

1. Build Grafana dashboards provisioned as JSON files in /dashboards/grafana/:
   - Pipeline Health (Airflow DAGs, PySpark runs)
   - Kafka Trading Performance (lag, throughput, partition distributions)
   - System Overview (cluster health, cache hit rates)
2. Configure Prometheus Alertmanager notification channels.
3. Export Kibana saved search objects to /dashboards/kibana/.

Verify: Provisioned dashboards automatically populate in Grafana without manual UI creation.
```

---

## Part 6B — Capsule Next.js Dashboard

```
PROMPT — Phase 6B: Capsule Next.js UI

Build the single-pane-of-glass frontend in /next-dashboard/:

1. Build using Next.js 15 App Router, React 19, TypeScript, and Tailwind CSS.
2. Implement real-time overview cards: Total Requests, Active DAGs, Kafka Lag, Firing Alerts.
3. Implement dedicated tabs:
   - Airflow & PySpark Pipeline telemetry
   - Kafka Trading Consumer Lag & velocity charts
   - Microservices latency & error rate meters
   - Live Elasticsearch log explorer
   - Jaeger distributed trace viewer
4. Provide direct deep-dive launch links to Grafana, Kibana, Airflow, and Jaeger.

Verify: Dashboard runs on port 3000, updates seamlessly without full page reloads, and renders live data.
```

---

## Part 7 — Infrastructure as Code (Terraform on AWS)

```
PROMPT — Phase 7: Terraform Cloud Modules

Write Terraform modules in /infra/terraform/:

1. VPC module: Multi-AZ public and private subnets with NAT Gateway.
2. EKS module: Managed Kubernetes cluster with autoscaling `t3.medium` worker nodes.
3. ElastiCache module: Managed Redis instance.
4. ALB Ingress: AWS Application Load Balancer routing traffic to services.
5. Remote S3 backend + DynamoDB lock table configuration.

Verify: `terraform plan` executes with zero errors. Run `terraform destroy` when testing concludes.
```

---

## Part 8 — Kubernetes Cloud Deployment

```
PROMPT — Phase 8: Kubernetes Manifests

Write Kubernetes deployment manifests in /infra/k8s/:

1. Deployments, Services, and ConfigMaps for all platform containers.
2. Horizontal Pod Autoscalers (HPA) for microservices and API gateways.
3. Ingress definitions routing through AWS Application Load Balancer.
4. Resource requests and limits defined across all pods.

Verify: All pods enter Running/Ready status on EKS and ingress endpoints resolve.
```

---

## Part 9 — Benchmarking & Evaluation

```
PROMPT — Phase 9: Evaluation & Benchmarks

1. Run Locust load tests against the FastAPI Telemetry API to measure p50/p90/p95/p99 latency.
2. Execute Kafka burst load tests (10,000+ msgs/s) to evaluate consumer lag and recovery.
3. Calculate monthly total cost of ownership (TCO) compared to Datadog SaaS and self-hosted EC2 ELK.
4. Document all findings in /docs/benchmark-results.md.

Verify: All benchmarks are documented with honest analysis and cost comparisons.
```
