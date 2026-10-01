from fastapi import APIRouter, HTTPException, Depends, Query
from auth import get_current_tenant, TenantContext
from prom_api_client import prom_client
from cache import cached
import demo_data as demo

router = APIRouter(tags=["metrics"])

VALID_COMPONENTS = ["airflow", "pyspark", "microservice", "kafka-trading"]

@router.get("/api/v1/metrics/{component}")
@router.get("/metrics/{component}")
@cached(ttl_seconds=10)
def get_component_metrics(
    component: str,
    tenant_ctx: TenantContext = Depends(get_current_tenant)
):
    """
    Fetch the latest instant metrics for a given component scoped to tenant.
    """
    if component not in VALID_COMPONENTS:
        raise HTTPException(status_code=400, detail=f"Invalid component. Valid components: {VALID_COMPONENTS}")

    tenant_id = tenant_ctx.tenant_id
    results = {}

    if component == "airflow":
        results["dagrun_success"] = prom_client.query_instant("sum(otel_airflow_dagrun_success) by (dag_id)", tenant_id=tenant_id)
        results["dagrun_failed"]  = prom_client.query_instant("sum(otel_airflow_dagrun_failed) by (dag_id)", tenant_id=tenant_id)

        if not results["dagrun_success"] and not results["dagrun_failed"] and demo.is_demo(tenant_id):
            # Return demo data in Prometheus vector format
            results["dagrun_success"] = [
                {"metric": {"dag_id": d["dag_id"]}, "value": [0, str(d["success_count"])]}
                for d in demo.DEMO_AIRFLOW_DAGS
            ]
            results["dagrun_failed"] = [
                {"metric": {"dag_id": d["dag_id"]}, "value": [0, str(d["failure_count"])]}
                for d in demo.DEMO_AIRFLOW_DAGS
            ]

    elif component == "pyspark":
        results["job_status"]      = prom_client.query_instant("otel_spark_job_status", tenant_id=tenant_id)
        results["job_duration"]    = prom_client.query_instant("otel_spark_job_duration_seconds", tenant_id=tenant_id)
        results["records_processed"] = prom_client.query_instant("otel_spark_job_processed_records_total", tenant_id=tenant_id)

        if not results["job_duration"] and demo.is_demo(tenant_id):
            results["job_status"] = [
                {"metric": {"job_name": j["job_name"]}, "value": [0, "1" if j["status"] == "success" else "0"]}
                for j in demo.DEMO_SPARK_JOBS
            ]
            results["job_duration"] = [
                {"metric": {"job_name": j["job_name"]}, "value": [0, str(j["duration_seconds"])]}
                for j in demo.DEMO_SPARK_JOBS
            ]
            results["records_processed"] = [
                {"metric": {"job_name": j["job_name"]}, "value": [0, str(j["records_processed"])]}
                for j in demo.DEMO_SPARK_JOBS
            ]

    elif component == "microservice":
        results["request_rate_5m"] = prom_client.query_instant(
            "sum(rate(capsule_demo_http_requests_total[5m])) by (service_name, status)",
            tenant_id=tenant_id
        )
        results["latency_p99"] = prom_client.query_instant(
            "capsule_demo_http_latency_p99_seconds",
            tenant_id=tenant_id
        )
        if not results["request_rate_5m"] and demo.is_demo(tenant_id):
            results["request_rate_5m"] = [
                {"metric": {"service_name": svc, "status": "200"}, "value": [0, str(data["request_rate"])]}
                for svc, data in demo.DEMO_MICROSERVICES.items()
            ]
            results["latency_p99"] = [
                {"metric": {"service_name": svc}, "value": [0, str(data["latency_p99_ms"] / 1000)]}
                for svc, data in demo.DEMO_MICROSERVICES.items()
            ]

    elif component == "kafka-trading":
        results["consumer_lag"]           = prom_client.query_instant("otel_kafka_consumer_lag", tenant_id=tenant_id)
        results["producer_throughput_5m"] = prom_client.query_instant("rate(otel_kafka_producer_messages_sent_total[5m])", tenant_id=tenant_id)

        if not results["consumer_lag"] and demo.is_demo(tenant_id):
            results["consumer_lag"] = [
                {"metric": {"group": l["group"], "topic": l["topic"]}, "value": [0, str(l["lag"])]}
                for l in demo.DEMO_KAFKA_LAG
            ]
            results["producer_throughput_5m"] = [
                {"metric": {"topic": "trades"}, "value": [0, str(demo.DEMO_KAFKA_THROUGHPUT["producer_message_rate"])]}
            ]

    return results


@router.get("/api/v1/metrics/{component}/history")
@cached(ttl_seconds=30)
def get_component_history(
    component: str,
    from_ts: float = Query(..., alias="from", description="Unix timestamp for start time"),
    to_ts:   float = Query(..., alias="to",   description="Unix timestamp for end time"),
    step: str = "15s",
    tenant_ctx: TenantContext = Depends(get_current_tenant)
):
    """
    Fetch the time-series history of a key metric scoped to tenant.
    """
    if component not in VALID_COMPONENTS:
        raise HTTPException(status_code=400, detail=f"Invalid component. Valid components: {VALID_COMPONENTS}")

    tenant_id = tenant_ctx.tenant_id

    if component == "airflow":
        query = "sum(otel_airflow_dagrun_success) by (dag_id)"
    elif component == "pyspark":
        query = "otel_spark_job_processed_records_total"
    elif component == "microservice":
        query = "sum(rate(capsule_demo_http_requests_total[5m])) by (service_name)"
    elif component == "kafka-trading":
        query = "sum(otel_kafka_consumer_lag) by (group, topic)"

    return prom_client.query_range(query, str(from_ts), str(to_ts), step, tenant_id=tenant_id)


@router.get("/api/v1/alerts")
@cached(ttl_seconds=10)
def get_rules_and_alerts(tenant_ctx: TenantContext = Depends(get_current_tenant)):
    """
    Fetch active rules and firing alerts from Prometheus filtered by tenant.
    Falls back to demo alerts for the demo tenant.
    """
    tenant_id     = tenant_ctx.tenant_id
    rules         = prom_client.get_rules(tenant_id=tenant_id)
    active_alerts = prom_client.get_alerts(tenant_id=tenant_id)

    if not active_alerts and demo.is_demo(tenant_id):
        demo_alert_data = demo.get_demo_alerts()
        return demo_alert_data

    return {
        "rules":         rules,
        "active_alerts": active_alerts
    }
