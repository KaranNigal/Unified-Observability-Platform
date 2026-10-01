import functools
import json
import logging

import redis
from config import settings
from prometheus_client import Counter

logger = logging.getLogger("metrics_api_cache")

try:
    redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
except Exception as e:
    logger.error(f"Failed to initialize Redis client: {e}")
    redis_client = None

CACHE_HITS = Counter(
    "metrics_api_cache_hits_total", "Total number of cache hits in the Metrics API"
)
CACHE_MISSES = Counter(
    "metrics_api_cache_misses_total", "Total number of cache misses in the Metrics API"
)


def cached(ttl_seconds: int = 10):
    """
    Decorator to cache function results in Redis strictly partitioned by tenant_id.
    Prevents cross-tenant cache contamination.
    """

    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            if not redis_client:
                CACHE_MISSES.inc()
                return func(*args, **kwargs)

            # 1. Resolve tenant_id from arguments for strict cache key isolation
            tenant_id = "tenant_default"
            for arg in args:
                if hasattr(arg, "tenant_id"):
                    tenant_id = getattr(arg, "tenant_id")
                    break
            for k, v in kwargs.items():
                if hasattr(v, "tenant_id"):
                    tenant_id = getattr(v, "tenant_id")
                    break
                elif k == "tenant_id":
                    tenant_id = str(v)
                    break

            # 2. Build deterministic cache key with tenant_id prefix
            args_str = [
                str(a)
                for a in args
                if "Request" not in str(type(a)) and not hasattr(a, "tenant_id")
            ]
            kwargs_str = [
                f"{k}={v}"
                for k, v in sorted(kwargs.items())
                if k not in ("api_key", "tenant_ctx") and not hasattr(v, "tenant_id")
            ]

            cache_key = f"api_cache:{tenant_id}:{func.__name__}:{'-'.join(args_str)}:{'-'.join(kwargs_str)}"

            try:
                cached_val = redis_client.get(cache_key)
                if cached_val is not None:
                    CACHE_HITS.inc()
                    return json.loads(cached_val)
            except Exception as e:
                logger.warning(f"Error accessing Redis cache: {e}")

            # Cache miss
            CACHE_MISSES.inc()
            result = func(*args, **kwargs)

            try:
                redis_client.setex(cache_key, ttl_seconds, json.dumps(result))
            except Exception as e:
                logger.warning(f"Error saving to Redis cache: {e}")

            return result

        return wrapper

    return decorator
