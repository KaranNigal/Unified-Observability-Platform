from fastapi import APIRouter, Depends, Query, HTTPException
from auth import get_current_tenant, TenantContext
from cache import cached
import os
import requests
import demo_data as demo

router = APIRouter(tags=["logs"])

ELASTICSEARCH_URL = os.getenv("ELASTICSEARCH_URL", "http://elasticsearch:9200")

@router.get("/api/v1/logs")
@router.get("/api/v1/logs/search")
@router.get("/logs")
@router.get("/logs/search")
def get_recent_logs(
    component: str = Query(None, description="Filter by component (e.g., airflow, orders-service)"),
    service: str = Query(None, description="Filter by service"),
    level: str = Query(None, description="Filter by log level (e.g., error, warn, info)"),
    search: str = Query(None, description="Full-text search on log message"),
    query: str = Query(None, description="Search query alias"),
    limit: int = Query(100, description="Max logs to return"),
    tenant_ctx: TenantContext = Depends(get_current_tenant)
):
    """
    Returns recent logs from Elasticsearch strictly scoped to the tenant.
    """
    must_queries = []
    
    # Injected Tenant Filter (never accepted or overridden by client)
    # Match on tenant_id field, or fallback to wildcard if in demo environment
    must_queries.append({
        "bool": {
            "should": [
                {"match": {"tenant_id": tenant_ctx.tenant_id}},
                {"term": {"tenant_id.keyword": tenant_ctx.tenant_id}},
                {"term": {"attributes.tenant_id.keyword": tenant_ctx.tenant_id}},
                # Allow logs with no tenant_id label only for the demo tenant (simulation data)
                *([{"bool": {"must_not": {"exists": {"field": "tenant_id"}}}}] if tenant_ctx.tenant_id == "demo" else [])
            ],
            "minimum_should_match": 1
        }
    })
    
    if component:
        must_queries.append({
            "match": {
                "service.name": component
            }
        })
    if level:
        must_queries.append({
            "match": {
                "log_level": level.lower()
            }
        })
    if search:
        must_queries.append({
            "match": {
                "message": search
            }
        })
        
    query_body = {
        "size": limit,
        "sort": [{"@timestamp": {"order": "desc"}}],
        "query": {
            "bool": {
                "must": must_queries
            }
        }
    }

    try:
        res = requests.post(
            f"{ELASTICSEARCH_URL}/logs-*/_search",
            json=query_body,
            timeout=5
        )
        res.raise_for_status()
        data = res.json()

        hits = data.get("hits", {}).get("hits", [])

        results = []
        for hit in hits:
            source = hit.get("_source", {})
            results.append({
                "timestamp": source.get("@timestamp"),
                "level": source.get("log_level", source.get("level", "info")),
                "component": source.get("service.name", source.get("service", "unknown")),
                "message": source.get("message", ""),
                "trace_id": source.get("trace_id", ""),
                "tenant_id": source.get("tenant_id", tenant_ctx.tenant_id)
            })

        # If ES is up but returns nothing for demo tenant, use demo logs
        if not results and demo.is_demo(tenant_ctx.tenant_id):
            return demo.get_demo_logs(component=component or service, level=level, search=search or query, limit=limit)

        return results
    except Exception as e:
        print(f"Notice: Elasticsearch not reachable: {e}")
        if demo.is_demo(tenant_ctx.tenant_id):
            return demo.get_demo_logs(component=component or service, level=level, search=search or query, limit=limit)
        return []
