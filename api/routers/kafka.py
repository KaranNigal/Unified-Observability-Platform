from fastapi import APIRouter, Depends
from auth import get_current_tenant, TenantContext
from prom_api_client import prom_client
from cache import cached
import demo_data as demo

router = APIRouter(tags=["kafka"])

@router.get("/api/v1/kafka/lag")
@router.get("/kafka/lag")
@cached(ttl_seconds=10)
def get_kafka_lag(tenant_ctx: TenantContext = Depends(get_current_tenant)):
    """
    Fetch the current consumer lag for all Kafka consumer groups and topics for the tenant.
    """
    lag_data = prom_client.query_instant("otel_kafka_consumer_lag", tenant_id=tenant_ctx.tenant_id)

    formatted = []
    for item in lag_data:
        metric = item.get("metric", {})
        value  = item.get("value", [0, "0"])[1]
        formatted.append({
            "group": metric.get("group", "unknown"),
            "topic": metric.get("topic", "unknown"),
            "lag":   int(value)
        })

    if not formatted and demo.is_demo(tenant_ctx.tenant_id):
        return demo.DEMO_KAFKA_LAG

    return formatted
