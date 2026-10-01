from fastapi import APIRouter, Depends
from auth import get_current_tenant, TenantContext
from prom_api_client import prom_client
from cache import cached
import demo_data as demo

router = APIRouter(tags=["dashboard"])

VALID_RANGES = ["15m", "1h", "6h", "24h"]

def clean_range(r: str) -> str:
    if r not in VALID_RANGES:
        return "1h"
    return r

def extract_instant_value(result, default=0.0):
    if not result:
        return default
    try:
        return float(result[0]["value"][1])
    except (IndexError, KeyError, ValueError):
        return default

def extract_labeled_values(result, label_key, default_val=0.0):
    if not result:
        return {}
    out = {}
    for item in result:
        metric = item.get("metric", {})
        val = item.get("value", [0, "0"])[1]
        label_val = metric.get(label_key)
        if label_val:
            try:
                out[label_val] = float(val)
            except ValueError:
                out[label_val] = default_val
    return out

# ─── Dashboard Summary ────────────────────────────────────────────────────────

@router.get("/api/v1/dashboard/summary")
@router.get("/dashboard/summary")
@cached(ttl_seconds=10)
def get_dashboard_summary(tenant_ctx: TenantContext = Depends(get_current_tenant)):
    """Returns high-level summary metrics scoped strictly to the authenticated tenant."""
    tenant_id = tenant_ctx.tenant_id

    dag_success   = extract_instant_value(prom_client.query_instant("sum(otel_airflow_dagrun_success)", tenant_id=tenant_id), 0.0)
    dag_failed    = extract_instant_value(prom_client.query_instant("sum(otel_airflow_dagrun_failed)", tenant_id=tenant_id), 0.0)
    kafka_lag     = extract_instant_value(prom_client.query_instant("sum(otel_kafka_consumer_lag)", tenant_id=tenant_id), 0.0)
    producer_rate = extract_instant_value(prom_client.query_instant("sum(rate(otel_kafka_producer_messages_sent_total[5m]))", tenant_id=tenant_id), 0.0)
    spark_records = extract_instant_value(prom_client.query_instant("sum(otel_spark_job_processed_records_total)", tenant_id=tenant_id), 0.0)

    active_alerts = prom_client.get_alerts(tenant_id=tenant_id)
    firing_count  = len([a for a in active_alerts if a.get("state") == "firing"])

    has_prom_data = int(dag_success) > 0 or int(dag_failed) > 0 or int(kafka_lag) > 0

    if not has_prom_data and demo.is_demo(tenant_id):
        d = demo.DEMO_DASHBOARD_SUMMARY.copy()
        # Layer in live alert count from demo_data
        d["active_alerts_count"] = len(demo.get_demo_alerts()["active_alerts"])
        return d

    return {
        "tenant_id": tenant_id,
        "dags_success_total": int(dag_success),
        "dags_failed_total": int(dag_failed),
        "kafka_lag_total": int(kafka_lag),
        "kafka_producer_rate_5m": round(producer_rate, 2),
        "spark_records_processed_total": int(spark_records),
        "active_alerts_count": firing_count,
        "status": "healthy" if firing_count == 0 else "degraded"
    }

# ─── Airflow DAGs ─────────────────────────────────────────────────────────────

@router.get("/api/v1/dashboard/airflow/dags")
@router.get("/dashboard/airflow/dags")
@cached(ttl_seconds=10)
def get_airflow_dags_aggregate(
    range: str = "1h",
    tenant_ctx: TenantContext = Depends(get_current_tenant)
):
    """Returns per-DAG success/failure rate and run counts for the authenticated tenant."""
    tenant_id = tenant_ctx.tenant_id

    # Use raw counter sums (not increase/rate) so data is visible immediately
    # after the simulator starts — no need for 1h of history.
    success_res = prom_client.query_instant(
        "sum(otel_airflow_dagrun_success) by (dag_id)",
        tenant_id=tenant_id
    )
    failure_res = prom_client.query_instant(
        "sum(otel_airflow_dagrun_failed) by (dag_id)",
        tenant_id=tenant_id
    )

    success_map = extract_labeled_values(success_res, "dag_id")
    failure_map = extract_labeled_values(failure_res, "dag_id")
    all_dags = set(success_map.keys()).union(failure_map.keys())

    if not all_dags:
        if demo.is_demo(tenant_id):
            return demo.DEMO_AIRFLOW_DAGS
        return []

    out = []
    for dag_id in all_dags:
        s     = int(success_map.get(dag_id, 0))
        f     = int(failure_map.get(dag_id, 0))
        total = s + f
        rate  = round((s / total) * 100, 1) if total > 0 else 100.0
        out.append({
            "dag_id": dag_id,
            "success_count": s,
            "failure_count": f,
            "total_runs": total,
            "success_rate": rate
        })
    return out

# ─── Airflow Tasks ────────────────────────────────────────────────────────────

@router.get("/api/v1/dashboard/airflow/tasks")
@cached(ttl_seconds=10)
def get_airflow_tasks_aggregate(
    dag_id: str,
    range: str = "1h",
    tenant_ctx: TenantContext = Depends(get_current_tenant)
):
    """Returns task-level duration distribution for a given DAG scoped to tenant."""
    r = clean_range(range)

    p50_res = prom_client.query_instant(
        f"histogram_quantile(0.50, sum(rate(otel_airflow_task_duration_seconds_bucket{{dag_id='{dag_id}'}}[{r}])) by (le, task_id))",
        tenant_id=tenant_ctx.tenant_id
    )
    p95_res = prom_client.query_instant(
        f"histogram_quantile(0.95, sum(rate(otel_airflow_task_duration_seconds_bucket{{dag_id='{dag_id}'}}[{r}])) by (le, task_id))",
        tenant_id=tenant_ctx.tenant_id
    )
    max_res = prom_client.query_instant(
        f"max(otel_airflow_task_duration_seconds_max{{dag_id='{dag_id}'}}) by (task_id) or max(otel_airflow_task_timer_seconds{{dag_id='{dag_id}'}}) by (task_id)",
        tenant_id=tenant_ctx.tenant_id
    )

    p50_map = extract_labeled_values(p50_res, "task_id")
    p95_map = extract_labeled_values(p95_res, "task_id")
    max_map = extract_labeled_values(max_res, "task_id")
    all_tasks = set(p50_map.keys()).union(p95_map.keys()).union(max_map.keys())

    if not all_tasks:
        if demo.is_demo(tenant_ctx.tenant_id):
            return demo.DEMO_AIRFLOW_TASKS.get(dag_id, demo.DEMO_AIRFLOW_TASKS["correlated_trade_pipeline"])
        return []

    out = []
    for t_id in all_tasks:
        out.append({
            "task_id": t_id,
            "p50": round(p50_map.get(t_id, 0.0), 3),
            "p95": round(p95_map.get(t_id, 0.0), 3),
            "max": round(max_map.get(t_id, 0.0), 3)
        })
    return out

# ─── PySpark Jobs ─────────────────────────────────────────────────────────────

@router.get("/api/v1/dashboard/pyspark/jobs")
@cached(ttl_seconds=10)
def get_pyspark_jobs_aggregate(
    range: str = "1h",
    tenant_ctx: TenantContext = Depends(get_current_tenant)
):
    """Returns PySpark job status, duration, and records processed for tenant."""
    tenant_id = tenant_ctx.tenant_id

    duration_res = prom_client.query_instant("max(otel_pyspark_job_duration_seconds) by (job_name)", tenant_id=tenant_id)
    records_res  = prom_client.query_instant("max(otel_pyspark_job_records_processed_total) by (job_name)", tenant_id=tenant_id)
    status_res   = prom_client.query_instant("max(otel_pyspark_job_status) by (job_name)", tenant_id=tenant_id)

    duration_map = extract_labeled_values(duration_res, "job_name")
    records_map  = extract_labeled_values(records_res,  "job_name")
    status_map   = extract_labeled_values(status_res,   "job_name")
    all_jobs     = set(duration_map.keys()).union(records_map.keys())

    if not all_jobs:
        if demo.is_demo(tenant_id):
            return demo.DEMO_SPARK_JOBS
        return []

    out = []
    for job_name in all_jobs:
        status_val = status_map.get(job_name, 1.0)
        out.append({
            "job_name": job_name,
            "duration_seconds": round(duration_map.get(job_name, 0.0), 2),
            "records_processed": int(records_map.get(job_name, 0)),
            "status": "success" if status_val >= 0.5 else "failed"
        })
    return out

# ─── PySpark Executors ────────────────────────────────────────────────────────

@router.get("/api/v1/dashboard/pyspark/executors")
@cached(ttl_seconds=10)
def get_pyspark_executors_aggregate(
    job_id: str,
    tenant_ctx: TenantContext = Depends(get_current_tenant)
):
    tenant_id = tenant_ctx.tenant_id

    executors_res = prom_client.query_instant(f"otel_spark_executor_count{{job_id='{job_id}'}}", tenant_id=tenant_id)
    cpu_res       = prom_client.query_instant(f"avg(otel_spark_executor_cpu_utilization{{job_id='{job_id}'}})", tenant_id=tenant_id)
    mem_res       = prom_client.query_instant(f"avg(otel_spark_executor_memory_utilization{{job_id='{job_id}'}})", tenant_id=tenant_id)

    exec_count = int(extract_instant_value(executors_res, 0.0))
    cpu_util   = round(extract_instant_value(cpu_res, 0.0), 2)
    mem_util   = round(extract_instant_value(mem_res, 0.0), 2)

    if exec_count == 0 and demo.is_demo(tenant_id):
        import random as _r
        return {
            "job_id": job_id,
            "executor_count": 8,
            "cpu_utilization_pct": round(_r.uniform(48, 72), 1),
            "memory_utilization_pct": round(_r.uniform(55, 78), 1),
        }

    return {
        "job_id": job_id,
        "executor_count": exec_count,
        "cpu_utilization_pct": cpu_util * 100,
        "memory_utilization_pct": mem_util * 100
    }

# ─── Microservices ────────────────────────────────────────────────────────────

@router.get("/api/v1/dashboard/microservices")
@cached(ttl_seconds=10)
def get_microservices_aggregate(
    service: str,
    range: str = "1h",
    tenant_ctx: TenantContext = Depends(get_current_tenant)
):
    r         = clean_range(range)
    tenant_id = tenant_ctx.tenant_id

    req_metric = "capsule_demo_http_requests_total"
    lat_metric = "capsule_demo_http_latency_p99_seconds"

    rate_res  = prom_client.query_instant(
        f"sum(rate({req_metric}{{service_name='{service}'}}[{r}]))",
        tenant_id=tenant_id
    )
    error_res = prom_client.query_instant(
        f"sum(rate({req_metric}{{service_name='{service}',status='500'}}[{r}]))"
        f" / sum(rate({req_metric}{{service_name='{service}'}}[{r}]))",
        tenant_id=tenant_id
    )
    p99_res   = prom_client.query_instant(
        f"avg({lat_metric}{{service_name='{service}'}})",
        tenant_id=tenant_id
    )

    req_rate = extract_instant_value(rate_res, 0.0)
    err_rate = extract_instant_value(error_res, 0.0)
    p99      = extract_instant_value(p99_res, 0.0)

    if req_rate == 0.0 and demo.is_demo(tenant_id):
        svc_data = demo.DEMO_MICROSERVICES.get(service, demo.DEMO_MICROSERVICES["orders-service"])
        return {**svc_data, "service": service}

    return {
        "service": service,
        "request_rate": round(req_rate, 2),
        "error_rate_pct": round(err_rate * 100, 2),
        "latency_p50_ms": round(p99 * 500, 1),
        "latency_p95_ms": round(p99 * 900, 1),
        "latency_p99_ms": round(p99 * 1000, 1)
    }

# ─── Kafka Throughput ─────────────────────────────────────────────────────────

@router.get("/api/v1/dashboard/kafka/throughput")
@cached(ttl_seconds=10)
def get_kafka_throughput(
    range: str = "1h",
    tenant_ctx: TenantContext = Depends(get_current_tenant)
):
    r         = clean_range(range)
    tenant_id = tenant_ctx.tenant_id

    prod_res = prom_client.query_instant(f"sum(rate(otel_kafka_producer_messages_sent_total[{r}]))", tenant_id=tenant_id)
    cons_res = prom_client.query_instant(f"sum(rate(otel_kafka_consumer_messages_processed_total[{r}]))", tenant_id=tenant_id)

    prod_rate = extract_instant_value(prod_res, 0.0)
    cons_rate = extract_instant_value(cons_res, 0.0)

    if prod_rate == 0.0 and demo.is_demo(tenant_id):
        return demo.DEMO_KAFKA_THROUGHPUT

    return {
        "producer_message_rate": round(prod_rate, 2),
        "consumer_message_rate": round(cons_rate, 2)
    }

# ─── System Health ────────────────────────────────────────────────────────────

@router.get("/api/v1/dashboard/system-health")
@cached(ttl_seconds=10)
def get_system_health(tenant_ctx: TenantContext = Depends(get_current_tenant)):
    tenant_id     = tenant_ctx.tenant_id
    active_alerts = prom_client.get_alerts(tenant_id=tenant_id)
    firing_names  = [a.get("labels", {}).get("alertname") for a in active_alerts if a.get("state") == "firing"]

    # If Prometheus returned no alerts but we are demo, use demo alert set
    if not firing_names and demo.is_demo(tenant_id):
        firing_names = [a["labels"]["alertname"] for a in demo.get_demo_alerts()["active_alerts"]]

    airflow_status       = "healthy"
    pyspark_status       = "healthy"
    microservices_status = "healthy"
    kafka_status         = "healthy"

    if "AirflowDAGRunFailed" in firing_names or "ReconJobFailed" in firing_names:
        airflow_status = "degraded"
    if "SparkJobFailed" in firing_names or "ReconJobFailed" in firing_names:
        pyspark_status = "degraded"
    if "MicroserviceErrorRateHigh" in firing_names:
        microservices_status = "critical"
    if "KafkaConsumerLagHigh" in firing_names:
        kafka_status = "degraded"

    return {
        "status": "healthy" if not firing_names else "degraded",
        "active_alert_count": len(firing_names),
        "tenant_id": tenant_id,
        "components": {
            "airflow":       airflow_status,
            "pyspark":       pyspark_status,
            "microservices": microservices_status,
            "kafka":         kafka_status
        }
    }
