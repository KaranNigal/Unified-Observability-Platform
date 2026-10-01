"""
demo_data.py
============
Rich, static-but-realistic demo datasets for every section of the Capsule
platform when the requesting tenant is 'demo'.

Used as a fallback whenever the real data source (Prometheus, Elasticsearch,
Jaeger, Airflow) is unavailable or returns empty results.
"""

import datetime

DEMO_TENANT = "demo"


def is_demo(tenant_id: str) -> bool:
    return tenant_id == DEMO_TENANT


# ─── Helpers ─────────────────────────────────────────────────────────────────


def _ts(minutes_ago: int) -> str:
    """Return ISO timestamp N minutes ago."""
    dt = datetime.datetime.utcnow() - datetime.timedelta(minutes=minutes_ago)
    return dt.strftime("%Y-%m-%dT%H:%M:%S.000Z")


def _ms(minutes_ago: int) -> float:
    """Return Unix millisecond timestamp N minutes ago."""
    dt = datetime.datetime.utcnow() - datetime.timedelta(minutes=minutes_ago)
    return dt.timestamp() * 1000


# ─── Airflow DAGs ─────────────────────────────────────────────────────────────

DEMO_AIRFLOW_DAGS = [
    {
        "dag_id": "correlated_trade_pipeline",
        "success_count": 47,
        "failure_count": 3,
        "total_runs": 50,
        "success_rate": 94.0,
    },
    {
        "dag_id": "sample_etl_pipeline",
        "success_count": 38,
        "failure_count": 2,
        "total_runs": 40,
        "success_rate": 95.0,
    },
    {
        "dag_id": "data_quality_checks",
        "success_count": 22,
        "failure_count": 0,
        "total_runs": 22,
        "success_rate": 100.0,
    },
    {
        "dag_id": "ml_feature_pipeline",
        "success_count": 11,
        "failure_count": 2,
        "total_runs": 13,
        "success_rate": 84.6,
    },
    {
        "dag_id": "production_dwh_etl_pipeline",
        "success_count": 18,
        "failure_count": 1,
        "total_runs": 19,
        "success_rate": 94.7,
    },
    {
        "dag_id": "recon_settlement_job",
        "success_count": 0,
        "failure_count": 12,
        "total_runs": 12,
        "success_rate": 0.0,
    },
]

DEMO_AIRFLOW_TASKS = {
    "correlated_trade_pipeline": [
        {"task_id": "extract_raw_trades", "p50": 0.8, "p95": 1.2, "max": 1.8},
        {"task_id": "validate_schema", "p50": 0.3, "p95": 0.5, "max": 0.7},
        {"task_id": "transform_aggregations", "p50": 2.1, "p95": 3.4, "max": 5.2},
        {"task_id": "load_into_warehouse", "p50": 1.4, "p95": 2.0, "max": 3.1},
        {"task_id": "notify_downstream", "p50": 0.1, "p95": 0.2, "max": 0.4},
    ],
    "sample_etl_pipeline": [
        {"task_id": "extract_source_data", "p50": 1.1, "p95": 1.8, "max": 2.5},
        {"task_id": "clean_and_deduplicate", "p50": 0.9, "p95": 1.4, "max": 2.0},
        {"task_id": "enrich_with_metadata", "p50": 0.4, "p95": 0.6, "max": 0.9},
        {"task_id": "write_to_postgres", "p50": 0.6, "p95": 1.0, "max": 1.5},
    ],
    "production_dwh_etl_pipeline": [
        {"task_id": "ingest_raw", "p50": 1.5, "p95": 2.3, "max": 3.1},
        {"task_id": "quality_gate", "p50": 0.5, "p95": 0.8, "max": 1.1},
        {"task_id": "transform_and_aggregate", "p50": 3.2, "p95": 5.0, "max": 7.4},
        {"task_id": "load_dwh", "p50": 1.8, "p95": 2.6, "max": 3.9},
    ],
    "data_quality_checks": [
        {"task_id": "check_nulls", "p50": 0.2, "p95": 0.3, "max": 0.5},
        {"task_id": "check_foreign_keys", "p50": 0.4, "p95": 0.7, "max": 1.1},
    ],
    "ml_feature_pipeline": [
        {"task_id": "extract_features", "p50": 4.1, "p95": 6.2, "max": 8.5},
        {"task_id": "train_model", "p50": 12.3, "p95": 15.4, "max": 19.2},
    ],
    "recon_settlement_job": [
        {"task_id": "fetch_trades", "p50": 1.1, "p95": 1.5, "max": 2.1},
        {"task_id": "reconcile", "p50": 3.4, "p95": 5.1, "max": 7.3},
    ],
}

# ─── PySpark Jobs ─────────────────────────────────────────────────────────────

DEMO_SPARK_JOBS = [
    {
        "job_name": "trade_enrichment_job",
        "duration_seconds": 143.7,
        "records_processed": 84500,
        "status": "success",
    },
    {
        "job_name": "daily_aggregation_job",
        "duration_seconds": 67.9,
        "records_processed": 35200,
        "status": "success",
    },
    {
        "job_name": "fraud_detection_job",
        "duration_seconds": 39.2,
        "records_processed": 15800,
        "status": "success",
    },
    {
        "job_name": "feature_engineering_job",
        "duration_seconds": 112.4,
        "records_processed": 62000,
        "status": "success",
    },
    {
        "job_name": "recon_settlement_job",
        "duration_seconds": 55.1,
        "records_processed": 9400,
        "status": "failed",
    },
]

# ─── Microservices ────────────────────────────────────────────────────────────

DEMO_MICROSERVICES = {
    "orders-service": {
        "service": "orders-service",
        "request_rate": 42.3,
        "error_rate_pct": 1.2,
        "latency_p50_ms": 18.4,
        "latency_p95_ms": 54.2,
        "latency_p99_ms": 118.7,
    },
    "inventory-service": {
        "service": "inventory-service",
        "request_rate": 27.8,
        "error_rate_pct": 0.4,
        "latency_p50_ms": 12.1,
        "latency_p95_ms": 38.5,
        "latency_p99_ms": 82.3,
    },
}

# ─── Kafka ────────────────────────────────────────────────────────────────────

DEMO_KAFKA_THROUGHPUT = {
    "producer_message_rate": 84.2,
    "consumer_message_rate": 81.6,
}

DEMO_KAFKA_LAG = [
    {"group": "trade-consumer", "topic": "trades", "lag": 127},
    {"group": "audit-consumer", "topic": "audit-events", "lag": 43},
    {"group": "risk-consumer", "topic": "risk-events", "lag": 8},
    {"group": "ml-feature-sink", "topic": "feature-bus", "lag": 312},
]

# ─── System Health ────────────────────────────────────────────────────────────

DEMO_SYSTEM_HEALTH = {
    "status": "degraded",
    "active_alert_count": 2,
    "tenant_id": "demo",
    "components": {
        "airflow": "healthy",
        "pyspark": "degraded",
        "microservices": "healthy",
        "kafka": "healthy",
    },
}

# ─── Dashboard Summary ────────────────────────────────────────────────────────

DEMO_DASHBOARD_SUMMARY = {
    "tenant_id": "demo",
    "dags_success_total": 136,
    "dags_failed_total": 8,
    "kafka_lag_total": 490,
    "kafka_producer_rate_5m": 84.2,
    "spark_records_processed_total": 207100,
    "active_alerts_count": 2,
    "status": "degraded",
}

# ─── Logs ─────────────────────────────────────────────────────────────────────

_LOG_MESSAGES = [
    # Airflow
    (
        "info",
        "airflow",
        "DAG correlated_trade_pipeline completed successfully in 18.3s",
    ),
    ("info", "airflow", "Task extract_raw_trades finished: 15420 rows extracted"),
    (
        "warn",
        "airflow",
        "DAG recon_settlement_job retrying task load_into_warehouse (attempt 2/3)",
    ),
    (
        "error",
        "airflow",
        "DAG ml_feature_pipeline FAILED: upstream dependency timeout after 30s",
    ),
    ("info", "airflow", "Task validate_schema passed all 12 quality checks"),
    ("info", "airflow", "Scheduler heartbeat OK — 5 DAGs active, 0 import errors"),
    # Spark
    (
        "info",
        "spark-master",
        "Job trade_enrichment_job submitted (appId=app-20261001-001)",
    ),
    ("info", "spark-worker", "Stage 3/5 complete: 84500 records processed in 38.1s"),
    ("warn", "spark-worker", "Executor 3 lost — resubmitting 2 tasks to executor 4"),
    (
        "info",
        "spark-master",
        "Job daily_aggregation_job completed: 35200 records, 67.9s",
    ),
    (
        "error",
        "spark-driver",
        "Job recon_settlement_job FAILED: OutOfMemoryError in stage 4",
    ),
    # Kafka
    (
        "info",
        "kafka-broker",
        "Producer trade-producer throughput: 84.2 msg/s (topic: trades)",
    ),
    (
        "warn",
        "kafka-broker",
        "Consumer group ml-feature-sink lag growing: 312 (topic: feature-bus)",
    ),
    ("info", "kafka-broker", "Consumer group trade-consumer caught up: lag 127 → 91"),
    (
        "info",
        "kafka-consumer",
        "Batch of 500 trade messages committed (offset: 982451)",
    ),
    # Microservices
    (
        "info",
        "orders-service",
        "POST /api/orders 200 OK — latency 18ms — order_id=ORD-7782",
    ),
    ("info", "orders-service", "GET /api/orders/status 200 OK — 200 req/s sustained"),
    (
        "warn",
        "orders-service",
        "Slow query detected: /api/orders/history took 312ms (p99 threshold: 200ms)",
    ),
    (
        "error",
        "orders-service",
        "POST /api/orders 500 InternalServerError — DB connection pool exhausted",
    ),
    ("info", "inventory-service", "Stock check completed for 1842 SKUs in 12ms"),
    ("info", "inventory-service", "Cache hit ratio: 94.2% (Redis)"),
    # Infrastructure
    ("info", "prometheus", "Scrape target pushgateway OK — 48 metrics collected"),
    (
        "info",
        "postgres",
        "Checkpoint complete: wrote 312 buffers (0.4%); elapsed 0.021 s",
    ),
    (
        "warn",
        "redis",
        "Memory usage at 74% (745 MB / 1 GB) — consider increasing maxmemory",
    ),
    ("info", "grafana", "Dashboard capsule-overview loaded by user admin"),
]


def get_demo_logs(
    component: str = None,
    level: str = None,
    search: str = None,
    limit: int = 100,
) -> list:
    results = []
    for i, (lvl, comp, msg) in enumerate(_LOG_MESSAGES * 4):  # repeat to hit limit
        if len(results) >= limit:
            break
        if component and component.lower() not in comp.lower():
            continue
        if level and level.lower() != lvl.lower():
            continue
        if search and search.lower() not in msg.lower():
            continue
        results.append(
            {
                "timestamp": _ts(i * 3),  # spread over past 2 hours
                "level": lvl,
                "component": comp,
                "message": msg,
                "trace_id": f"demo{i:04x}cafe{i*7:04x}",
                "tenant_id": DEMO_TENANT,
            }
        )
    return results


# ─── Traces ──────────────────────────────────────────────────────────────────


def _make_trace(trace_index: int, service: str, operations: list[dict]) -> dict:
    base_ms = _ms(trace_index * 8)  # one trace every 8 minutes
    trace_id = f"demo{trace_index:04x}{'abcdef1234567890'[:16]}"

    spans = []
    cursor = base_ms
    for j, op in enumerate(operations):
        duration = op["duration_ms"]
        spans.append(
            {
                "span_id": f"{trace_index:04x}{j:04x}",
                "parent_span_id": None if j == 0 else f"{trace_index:04x}{0:04x}",
                "operation": op["name"],
                "service": op.get("service", service),
                "start_time_ms": cursor,
                "duration_ms": duration,
                "tenant_id": DEMO_TENANT,
            }
        )
        cursor += duration * 0.6  # overlapping spans

    total_duration = max(s["start_time_ms"] + s["duration_ms"] for s in spans) - base_ms
    return {
        "trace_id": trace_id,
        "start_time_ms": base_ms,
        "total_duration_ms": total_duration,
        "span_count": len(spans),
        "tenant_id": DEMO_TENANT,
        "spans": spans,
    }


_ORDERS_TRACE_OPS = [
    [
        {"name": "POST /api/orders", "duration_ms": 42},
        {"name": "validate_order", "duration_ms": 3},
        {
            "name": "inventory.checkStock",
            "duration_ms": 12,
            "service": "inventory-service",
        },
        {"name": "postgres.INSERT orders", "duration_ms": 8},
        {"name": "kafka.publish trade-event", "duration_ms": 5},
    ],
    [
        {"name": "GET /api/orders/history", "duration_ms": 312},
        {"name": "postgres.SELECT orders", "duration_ms": 285},
        {"name": "serialize_response", "duration_ms": 7},
    ],
    [
        {"name": "POST /api/orders", "duration_ms": 18},
        {"name": "validate_order", "duration_ms": 2},
        {
            "name": "inventory.checkStock",
            "duration_ms": 9,
            "service": "inventory-service",
        },
        {"name": "postgres.INSERT orders", "duration_ms": 5},
        {"name": "kafka.publish trade-event", "duration_ms": 2},
    ],
]

_INVENTORY_TRACE_OPS = [
    [
        {"name": "GET /api/inventory/check", "duration_ms": 14},
        {"name": "redis.GET sku:cache", "duration_ms": 1},
        {"name": "serialize_response", "duration_ms": 1},
    ],
    [
        {"name": "POST /api/inventory/reserve", "duration_ms": 28},
        {"name": "postgres.SELECT stock", "duration_ms": 12},
        {"name": "postgres.UPDATE stock", "duration_ms": 9},
        {"name": "redis.DEL sku:cache", "duration_ms": 1},
    ],
]


def get_demo_traces(service: str = "orders-service", limit: int = 20) -> list:
    ops_list = _ORDERS_TRACE_OPS if "order" in service else _INVENTORY_TRACE_OPS
    traces = []
    for i in range(min(limit, 15)):
        ops = ops_list[i % len(ops_list)]
        traces.append(_make_trace(i, service, ops))
    # Sort newest first
    traces.sort(key=lambda x: x["start_time_ms"], reverse=True)
    return traces


# ─── Alerts ──────────────────────────────────────────────────────────────────


def get_demo_alerts() -> dict:
    return {
        "rules": [
            {
                "name": "capsule_demo_rules",
                "rules": [
                    {"name": "ReconJobFailed", "type": "alerting"},
                    {"name": "KafkaConsumerLagHigh", "type": "alerting"},
                    {"name": "SparkExecutorLost", "type": "alerting"},
                    {"name": "AirflowDAGRunFailed", "type": "alerting"},
                ],
            }
        ],
        "active_alerts": [
            {
                "labels": {
                    "alertname": "ReconJobFailed",
                    "severity": "critical",
                    "job": "recon_settlement_job",
                    "tenant_id": "demo",
                },
                "annotations": {
                    "summary": "PySpark recon_settlement_job failed — OutOfMemoryError in stage 4",
                    "description": "The settlement reconciliation job has been failing for 2 consecutive runs.",
                },
                "state": "firing",
                "activeAt": _ts(45),
                "value": "0",
            },
            {
                "labels": {
                    "alertname": "KafkaConsumerLagHigh",
                    "severity": "warning",
                    "group": "ml-feature-sink",
                    "topic": "feature-bus",
                    "tenant_id": "demo",
                },
                "annotations": {
                    "summary": "Consumer group ml-feature-sink lag is 312 (threshold: 200)",
                    "description": "Feature pipeline consumer is falling behind producers.",
                },
                "state": "firing",
                "activeAt": _ts(12),
                "value": "312",
            },
        ],
    }
