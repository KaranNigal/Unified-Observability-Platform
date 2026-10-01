import requests
from cache import redis_client
from config import settings
from fastapi import APIRouter

router = APIRouter(prefix="/health", tags=["health"])


@router.get("")
def check_health():
    """
    Unauthenticated endpoint that validates connectivity to Redis,
    Prometheus, and Elasticsearch.
    """
    redis_healthy = False
    if redis_client:
        try:
            redis_healthy = redis_client.ping()
        except Exception:
            pass

    prometheus_healthy = False
    try:
        res = requests.get(f"{settings.PROMETHEUS_URL}/-/healthy", timeout=2)
        prometheus_healthy = res.status_code == 200
    except Exception:
        pass

    # Resolve Elasticsearch URL dynamically depending on running context (Docker vs local host)
    es_url = (
        "http://elasticsearch:9200"
        if "redis" in settings.REDIS_URL
        else "http://localhost:9200"
    )
    elasticsearch_healthy = False
    try:
        res = requests.get(es_url, timeout=2)
        elasticsearch_healthy = res.status_code == 200
    except Exception:
        pass

    overall = redis_healthy and prometheus_healthy and elasticsearch_healthy

    return {
        "status": "healthy" if overall else "unhealthy",
        "services": {
            "redis": "healthy" if redis_healthy else "unhealthy",
            "prometheus": "healthy" if prometheus_healthy else "unhealthy",
            "elasticsearch": "healthy" if elasticsearch_healthy else "unhealthy",
        },
    }
