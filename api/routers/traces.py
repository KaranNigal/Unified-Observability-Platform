import os

import demo_data as demo
import requests
from auth import TenantContext, get_current_tenant
from fastapi import APIRouter, Depends, Query

router = APIRouter(tags=["traces"])

JAEGER_URL = os.getenv("JAEGER_URL", "http://jaeger:16686")


@router.get("/api/v1/traces")
@router.get("/api/v1/traces/search")
@router.get("/traces")
@router.get("/traces/search")
def get_traces(
    service: str = Query(
        "orders-service", description="Service name (e.g. orders-service)"
    ),
    limit: int = Query(20, description="Max traces to return"),
    tenant_ctx: TenantContext = Depends(get_current_tenant),
):
    """
    Returns recent traces from Jaeger strictly scoped by tenant_id.
    """
    try:
        # Jaeger API parameters with tenant_id tag filtering
        params = {
            "service": service,
            "limit": limit,
            # Jaeger supports tags query parameter formatted as json e.g. {"tenant_id":"xxx"}
            "tags": f'{{"tenant_id":"{tenant_ctx.tenant_id}"}}',
        }
        res = requests.get(f"{JAEGER_URL}/api/traces", params=params, timeout=5)
        res.raise_for_status()
        data = res.json()

        traces = data.get("data", [])

        formatted_traces = []
        for t in traces:
            trace_id = t.get("traceID")
            spans = t.get("spans", [])

            formatted_spans = []
            for s in spans:
                start_time = s.get("startTime", 0) / 1000  # microseconds to ms
                duration = s.get("duration", 0) / 1000  # microseconds to ms
                operation = s.get("operationName", "unknown")

                process_id = s.get("processID")
                process = t.get("processes", {}).get(process_id, {})
                span_service = process.get("serviceName", "unknown")

                formatted_spans.append(
                    {
                        "span_id": s.get("spanID"),
                        "parent_span_id": (
                            s.get("references", [{}])[0].get("spanID")
                            if s.get("references")
                            else None
                        ),
                        "operation": operation,
                        "service": span_service,
                        "start_time_ms": start_time,
                        "duration_ms": duration,
                        "tenant_id": tenant_ctx.tenant_id,
                    }
                )

            if formatted_spans:
                min_start = min(s["start_time_ms"] for s in formatted_spans)
                max_end = max(
                    s["start_time_ms"] + s["duration_ms"] for s in formatted_spans
                )
                total_duration = max_end - min_start
                start_time = min_start
            else:
                total_duration = 0
                start_time = 0

            formatted_traces.append(
                {
                    "trace_id": trace_id,
                    "start_time_ms": start_time,
                    "total_duration_ms": total_duration,
                    "spans": formatted_spans,
                    "span_count": len(formatted_spans),
                    "tenant_id": tenant_ctx.tenant_id,
                }
            )

        formatted_traces.sort(key=lambda x: x["start_time_ms"], reverse=True)

        if not formatted_traces and demo.is_demo(tenant_ctx.tenant_id):
            return demo.get_demo_traces(service=service, limit=limit)

        return formatted_traces
    except Exception as e:
        print(f"Notice: Jaeger not reachable: {e}")
        if demo.is_demo(tenant_ctx.tenant_id):
            return demo.get_demo_traces(service=service, limit=limit)
        return []
