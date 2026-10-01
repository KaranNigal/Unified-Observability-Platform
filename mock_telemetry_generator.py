"""
Capsule – Demo Telemetry Simulator
===================================
Pushes realistic, time-varying mock metrics to the Prometheus Pushgateway
strictly tagged with tenant_id="demo".

Usage:
    python mock_telemetry_generator.py

Requires:
    pip install requests
"""

import math
import time
import random
import requests

PUSHGATEWAY_URL = "http://localhost:9091/metrics/job/capsule_demo_sim"

# ─── Simulation state ────────────────────────────────────────────────────────

# Airflow DAG run counters
dag_success = {
    "correlated_trade_pipeline": 42,
    "sample_etl_pipeline":       31,
    "data_quality_checks":       18,
    "ml_feature_pipeline":        9,
    "production_dwh_etl_pipeline": 18,
    "recon_settlement_job":       0,
}
dag_failed = {
    "correlated_trade_pipeline": 3,
    "sample_etl_pipeline":       1,
    "data_quality_checks":       0,
    "ml_feature_pipeline":       2,
    "production_dwh_etl_pipeline": 1,
    "recon_settlement_job":      12,
}

# PySpark jobs
spark_records = {
    "trade_enrichment_job":  82000,
    "daily_aggregation_job": 34000,
    "fraud_detection_job":   15000,
}
spark_duration = {
    "trade_enrichment_job":  142.5,
    "daily_aggregation_job":  67.2,
    "fraud_detection_job":    38.8,
}
spark_status = {
    "trade_enrichment_job":  1,
    "daily_aggregation_job": 1,
    "fraud_detection_job":   1,
}

# Microservices
svc_requests = {"orders-service": 18000, "inventory-service": 11000}
svc_errors   = {"orders-service": 120,   "inventory-service":  45}
svc_lat_p99  = {"orders-service": 0.120, "inventory-service": 0.085}

# Kafka
kafka_produced = 0
kafka_consumed = 0
kafka_lag      = 120

tick = 0


def jitter(val, pct=0.05):
    return val * (1.0 + random.uniform(-pct, pct))


def push_metrics():
    global tick, kafka_produced, kafka_consumed, kafka_lag

    TENANT = "demo"

    # ── Update Airflow DAG counters ───────────────────────────────────────────
    for dag_id in dag_success:
        if random.random() < 0.08:
            dag_success[dag_id] += 1
        if random.random() < 0.008:
            dag_failed[dag_id] += 1

    # ── Update PySpark ────────────────────────────────────────────────────────
    for job in spark_records:
        spark_records[job]  += int(jitter(250))
        spark_duration[job] += jitter(0.4)
        spark_status[job]    = 0 if random.random() < 0.02 else 1

    # ── Update Microservices ──────────────────────────────────────────────────
    wave = 1.0 + 0.3 * math.sin(tick / 6.0)
    for svc in svc_requests:
        svc_requests[svc] += int(jitter(30))
        if random.random() < 0.04:
            svc_errors[svc] += 1
        svc_lat_p99[svc] = jitter(0.110 * wave)

    # ── Update Kafka ──────────────────────────────────────────────────────────
    produced_batch = int(jitter(80))
    consumed_batch = int(jitter(75))
    kafka_produced += produced_batch
    kafka_consumed += consumed_batch
    kafka_lag = max(0, kafka_lag + (produced_batch - consumed_batch) + random.randint(-10, 10))

    # ─────────────────────────────────────────────────────────────────────────
    # Build valid Prometheus text exposition
    # Rule: every metric name used in a sample line must match the preceding
    #       # HELP / # TYPE declaration exactly.
    # ─────────────────────────────────────────────────────────────────────────
    lines = []

    # ── Airflow DAG run counters ──────────────────────────────────────────────
    lines.append("# HELP otel_airflow_dagrun_success Airflow DAG successful run count")
    lines.append("# TYPE otel_airflow_dagrun_success counter")
    for dag_id, count in dag_success.items():
        lines.append(f'otel_airflow_dagrun_success{{dag_id="{dag_id}",tenant_id="{TENANT}"}} {count}')

    lines.append("# HELP otel_airflow_dagrun_failed Airflow DAG failed run count")
    lines.append("# TYPE otel_airflow_dagrun_failed counter")
    for dag_id, count in dag_failed.items():
        lines.append(f'otel_airflow_dagrun_failed{{dag_id="{dag_id}",tenant_id="{TENANT}"}} {count}')

    # ── PySpark (uses metric names expected by dashboard.py) ──────────────────
    lines.append("# HELP otel_pyspark_job_duration_seconds PySpark job duration seconds")
    lines.append("# TYPE otel_pyspark_job_duration_seconds gauge")
    for job, dur in spark_duration.items():
        lines.append(f'otel_pyspark_job_duration_seconds{{job_name="{job}",tenant_id="{TENANT}"}} {dur:.3f}')

    lines.append("# HELP otel_pyspark_job_records_processed_total PySpark records processed")
    lines.append("# TYPE otel_pyspark_job_records_processed_total counter")
    for job, rec in spark_records.items():
        lines.append(f'otel_pyspark_job_records_processed_total{{job_name="{job}",tenant_id="{TENANT}"}} {rec}')

    lines.append("# HELP otel_pyspark_job_status PySpark job status 1=success 0=failed")
    lines.append("# TYPE otel_pyspark_job_status gauge")
    for job, st in spark_status.items():
        lines.append(f'otel_pyspark_job_status{{job_name="{job}",tenant_id="{TENANT}"}} {st}')

    # Aliases used by /dashboard/summary and /metrics/pyspark
    lines.append("# HELP otel_spark_job_processed_records_total Alias records processed")
    lines.append("# TYPE otel_spark_job_processed_records_total counter")
    for job, rec in spark_records.items():
        lines.append(f'otel_spark_job_processed_records_total{{job_name="{job}",tenant_id="{TENANT}"}} {rec}')

    lines.append("# HELP otel_spark_job_duration_seconds Alias duration")
    lines.append("# TYPE otel_spark_job_duration_seconds gauge")
    for job, dur in spark_duration.items():
        lines.append(f'otel_spark_job_duration_seconds{{job_name="{job}",tenant_id="{TENANT}"}} {dur:.3f}')

    lines.append("# HELP otel_spark_job_status Alias status")
    lines.append("# TYPE otel_spark_job_status gauge")
    for job, st in spark_status.items():
        lines.append(f'otel_spark_job_status{{job_name="{job}",tenant_id="{TENANT}"}} {st}')

    # ── Microservices HTTP counters ───────────────────────────────────────────
    # NOTE: 'job' is a reserved Pushgateway label (from URL path), so we use
    #       'service_name' instead to avoid a label collision 400 error.
    lines.append("# HELP capsule_demo_http_requests_total HTTP request counter by status")
    lines.append("# TYPE capsule_demo_http_requests_total counter")
    for svc, req in svc_requests.items():
        lines.append(f'capsule_demo_http_requests_total{{service_name="{svc}",status="200",tenant_id="{TENANT}"}} {req}')
        lines.append(f'capsule_demo_http_requests_total{{service_name="{svc}",status="500",tenant_id="{TENANT}"}} {svc_errors[svc]}')

    # Latency p99 gauge (simple, no histogram)
    lines.append("# HELP capsule_demo_http_latency_p99_seconds HTTP latency p99 seconds")
    lines.append("# TYPE capsule_demo_http_latency_p99_seconds gauge")
    for svc in svc_requests:
        lines.append(f'capsule_demo_http_latency_p99_seconds{{service_name="{svc}",tenant_id="{TENANT}"}} {svc_lat_p99[svc]:.5f}')

    # ── Kafka counters & gauges ───────────────────────────────────────────────
    lines.append("# HELP otel_kafka_producer_messages_sent_total Kafka messages produced")
    lines.append("# TYPE otel_kafka_producer_messages_sent_total counter")
    lines.append(f'otel_kafka_producer_messages_sent_total{{topic="trades",tenant_id="{TENANT}"}} {kafka_produced}')

    lines.append("# HELP otel_kafka_consumer_messages_processed_total Kafka messages consumed")
    lines.append("# TYPE otel_kafka_consumer_messages_processed_total counter")
    lines.append(f'otel_kafka_consumer_messages_processed_total{{group="trade-consumer",topic="trades",tenant_id="{TENANT}"}} {kafka_consumed}')

    lines.append("# HELP otel_kafka_consumer_lag Kafka consumer group lag")
    lines.append("# TYPE otel_kafka_consumer_lag gauge")
    lines.append(f'otel_kafka_consumer_lag{{group="trade-consumer",topic="trades",tenant_id="{TENANT}"}} {kafka_lag}')

    # ─────────────────────────────────────────────────────────────────────────
    payload = "\n".join(lines) + "\n"

    try:
        resp = requests.post(
            PUSHGATEWAY_URL,
            data=payload.encode("utf-8"),
            headers={"Content-Type": "text/plain; charset=utf-8"},
            timeout=5,
        )
        if resp.status_code not in (200, 202):
            print(f"[WARN] Pushgateway returned {resp.status_code}: {resp.text[:200]}")
        else:
            print(
                f"[tick {tick:4d}] OK  lag={kafka_lag:4d}  "
                f"orders={svc_requests['orders-service']:6d}  "
                f"produced={kafka_produced:7d}"
            )
    except Exception as exc:
        print(f"[ERROR] Could not reach Pushgateway: {exc}")

    tick += 1


if __name__ == "__main__":
    print("Capsule Demo Telemetry Simulator starting ...")
    print(f"  -> tenant_id = demo")
    print(f"  -> Pushgateway: {PUSHGATEWAY_URL}")
    print("Press CTRL+C to stop.\n")

    while True:
        push_metrics()
        time.sleep(5)
