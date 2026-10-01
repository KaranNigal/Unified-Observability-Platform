import os
import secrets
import sys
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

# Add parent directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db import SessionLocal
from main import app
from models import ApiKey, Organization
from security import create_access_token, generate_api_key

client = TestClient(app)


# In-Memory Mock Redis to isolate tests from running Redis container
class MockRedis:
    def __init__(self):
        self.store = {}

    def get(self, key):
        return self.store.get(key)

    def setex(self, key, ttl, val):
        self.store[key] = val

    def ping(self):
        return True


@pytest.fixture(autouse=True)
def setup_mocks():
    mock_redis = MockRedis()
    with (
        patch("cache.redis_client", mock_redis),
        patch("routers.health.redis_client", mock_redis),
    ):
        yield mock_redis


@pytest.fixture
def test_tenants():
    """
    Creates two distinct isolated tenants (Tenant A and Tenant B) with their own
    control-plane API keys and JWT access tokens.
    """
    db = SessionLocal()
    rand_a = secrets.token_hex(4)
    rand_b = secrets.token_hex(4)

    tenant_a_id = f"tenant_alpha_{rand_a}"
    tenant_b_id = f"tenant_beta_{rand_b}"

    # Tenant A
    org_a = Organization(
        name=f"Org Alpha {rand_a}", slug=f"alpha-{rand_a}", tenant_id=tenant_a_id
    )
    db.add(org_a)
    db.flush()

    raw_key_a, hash_a, prefix_a = generate_api_key("uop_live_")
    api_key_a = ApiKey(
        org_id=org_a.id,
        tenant_id=tenant_a_id,
        key_hash=hash_a,
        key_prefix=prefix_a,
        name="Key A",
        is_active=True,
    )
    db.add(api_key_a)

    token_a = create_access_token(
        {
            "sub": "user_a",
            "tenant_id": tenant_a_id,
            "org_id": org_a.id,
            "email": "a@alpha.io",
        }
    )

    # Tenant B
    org_b = Organization(
        name=f"Org Beta {rand_b}", slug=f"beta-{rand_b}", tenant_id=tenant_b_id
    )
    db.add(org_b)
    db.flush()

    raw_key_b, hash_b, prefix_b = generate_api_key("uop_live_")
    api_key_b = ApiKey(
        org_id=org_b.id,
        tenant_id=tenant_b_id,
        key_hash=hash_b,
        key_prefix=prefix_b,
        name="Key B",
        is_active=True,
    )
    db.add(api_key_b)

    token_b = create_access_token(
        {
            "sub": "user_b",
            "tenant_id": tenant_b_id,
            "org_id": org_b.id,
            "email": "b@beta.io",
        }
    )

    # Revoked Key for Tenant A
    raw_key_revoked, hash_rev, prefix_rev = generate_api_key("uop_live_")
    api_key_revoked = ApiKey(
        org_id=org_a.id,
        tenant_id=tenant_a_id,
        key_hash=hash_rev,
        key_prefix=prefix_rev,
        name="Revoked Key",
        is_active=False,
    )
    db.add(api_key_revoked)

    db.commit()

    context = {
        "tenant_a_id": tenant_a_id,
        "key_a": raw_key_a,
        "token_a": token_a,
        "tenant_b_id": tenant_b_id,
        "key_b": raw_key_b,
        "token_b": token_b,
        "key_revoked": raw_key_revoked,
    }
    yield context
    db.close()


# ============================================================================
# 1. TEST: Strict rejection of client-supplied tenant_id query parameter
# ============================================================================
ALL_ENDPOINTS = [
    "/metrics/airflow",
    "/metrics/pyspark",
    "/metrics/microservice",
    "/metrics/kafka-trading",
    "/kafka/lag",
    "/dashboard/summary",
    "/dashboard/airflow/dags",
    "/dashboard/airflow/tasks?dag_id=sample_etl_pipeline",
    "/dashboard/pyspark/jobs",
    "/dashboard/microservices?service=orders-service",
    "/dashboard/kafka/throughput",
    "/dashboard/system-health",
    "/logs/search",
    "/traces/search?service=orders-service",
    "/health",
]


@pytest.mark.parametrize("endpoint", ALL_ENDPOINTS)
def test_reject_crafted_tenant_id_param(endpoint, test_tenants):
    """
    Every endpoint must reject any request attempting to pass tenant_id as a parameter.
    """
    separator = "&" if "?" in endpoint else "?"
    crafted_url = f"{endpoint}{separator}tenant_id={test_tenants['tenant_b_id']}"

    response = client.get(crafted_url, headers={"X-API-Key": test_tenants["key_a"]})
    assert response.status_code == 400
    assert "Client-supplied tenant_id is forbidden" in response.json()["detail"]


# ============================================================================
# 2. TEST: Server-Side Tenant ID Resolution across All Telemetry Endpoints
# ============================================================================


def test_metrics_component_isolation(test_tenants):
    """
    Verifies /metrics/{component} strictly queries Prometheus with caller's tenant_id.
    """
    with patch("prom_api_client.prom_client.query_instant") as mock_prom:
        mock_prom.return_value = []

        # 1. Request by Tenant A using API Key
        res_a = client.get(
            "/metrics/airflow", headers={"X-API-Key": test_tenants["key_a"]}
        )
        assert res_a.status_code == 200
        assert mock_prom.called
        assert mock_prom.call_args[1].get("tenant_id") == test_tenants["tenant_a_id"]
        mock_prom.reset_mock()

        # 2. Request by Tenant B using JWT Token
        res_b = client.get(
            "/metrics/airflow",
            headers={"Authorization": f"Bearer {test_tenants['token_b']}"},
        )
        assert res_b.status_code == 200
        assert mock_prom.called
        assert mock_prom.call_args[1].get("tenant_id") == test_tenants["tenant_b_id"]


def test_kafka_lag_isolation(test_tenants):
    """
    Verifies /kafka/lag injects caller's tenant_id into otel_kafka_consumer_lag.
    """
    with patch("prom_api_client.prom_client.query_instant") as mock_prom:
        mock_prom.return_value = []

        # Tenant A
        client.get("/kafka/lag", headers={"X-API-Key": test_tenants["key_a"]})
        assert mock_prom.call_args[1].get("tenant_id") == test_tenants["tenant_a_id"]

        # Tenant B
        client.get("/kafka/lag", headers={"X-API-Key": test_tenants["key_b"]})
        assert mock_prom.call_args[1].get("tenant_id") == test_tenants["tenant_b_id"]


def test_dashboard_summary_isolation(test_tenants):
    """
    Verifies /dashboard/summary queries metrics strictly scoped to caller's tenant_id.
    """
    with (
        patch("prom_api_client.prom_client.query_instant") as mock_prom,
        patch("prom_api_client.prom_client.get_alerts") as mock_alerts,
    ):
        mock_prom.return_value = []
        mock_alerts.return_value = []

        # Tenant A
        res_a = client.get(
            "/dashboard/summary",
            headers={"Authorization": f"Bearer {test_tenants['token_a']}"},
        )
        assert res_a.status_code == 200
        assert res_a.json()["tenant_id"] == test_tenants["tenant_a_id"]
        for call in mock_prom.call_args_list:
            assert call[1].get("tenant_id") == test_tenants["tenant_a_id"]

        # Tenant B
        res_b = client.get(
            "/dashboard/summary",
            headers={"Authorization": f"Bearer {test_tenants['token_b']}"},
        )
        assert res_b.status_code == 200
        assert res_b.json()["tenant_id"] == test_tenants["tenant_b_id"]
        for call in mock_prom.call_args_list[-4:]:
            assert call[1].get("tenant_id") == test_tenants["tenant_b_id"]


def test_elasticsearch_logs_isolation(test_tenants):
    """
    Verifies /logs/search injects mandatory tenant filter into Elasticsearch DSL queries.
    """
    with patch("routers.logs.requests.post") as mock_es:
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {"hits": {"hits": []}}
        mock_es.return_value = mock_resp

        # Tenant A
        client.get(
            "/logs/search?level=info", headers={"X-API-Key": test_tenants["key_a"]}
        )
        assert mock_es.called
        sent_query_a = mock_es.call_args[1]["json"]["query"]["bool"]["must"]
        tenant_a_found = any(
            test_tenants["tenant_a_id"] in str(item)
            for clause in sent_query_a
            if "bool" in clause
            for item in clause["bool"].get("should", [])
        )
        assert tenant_a_found

        mock_es.reset_mock()

        # Tenant B
        client.get(
            "/logs/search?level=error", headers={"X-API-Key": test_tenants["key_b"]}
        )
        assert mock_es.called
        sent_query_b = mock_es.call_args[1]["json"]["query"]["bool"]["must"]
        tenant_b_found = any(
            test_tenants["tenant_b_id"] in str(item)
            for clause in sent_query_b
            if "bool" in clause
            for item in clause["bool"].get("should", [])
        )
        assert tenant_b_found


def test_jaeger_traces_isolation(test_tenants):
    """
    Verifies /traces/search injects tenant tag into Jaeger API queries.
    """
    with patch("routers.traces.requests.get") as mock_jaeger:
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {"data": []}
        mock_jaeger.return_value = mock_resp

        # Tenant A
        client.get(
            "/traces/search?service=orders-service",
            headers={"X-API-Key": test_tenants["key_a"]},
        )
        assert mock_jaeger.called
        tags_param_a = mock_jaeger.call_args[1]["params"]["tags"]
        assert test_tenants["tenant_a_id"] in tags_param_a
        assert test_tenants["tenant_b_id"] not in tags_param_a

        mock_jaeger.reset_mock()

        # Tenant B
        client.get(
            "/traces/search?service=orders-service",
            headers={"Authorization": f"Bearer {test_tenants['token_b']}"},
        )
        assert mock_jaeger.called
        tags_param_b = mock_jaeger.call_args[1]["params"]["tags"]
        assert test_tenants["tenant_b_id"] in tags_param_b
        assert test_tenants["tenant_a_id"] not in tags_param_b


# ============================================================================
# 3. TEST: Revoked and Invalid Credentials Rejection
# ============================================================================


def test_revoked_api_key_rejected(test_tenants):
    """
    Revoked API keys must be rejected with 401 Unauthorized.
    """
    res = client.get(
        "/metrics/airflow", headers={"X-API-Key": test_tenants["key_revoked"]}
    )
    assert res.status_code == 401
    assert "revoked" in res.json()["detail"].lower()


def test_invalid_api_key_rejected():
    """
    Non-existent or forged API keys must be rejected with 401 Unauthorized.
    """
    res = client.get(
        "/metrics/airflow", headers={"X-API-Key": "uop_live_forged_key_123456"}
    )
    assert res.status_code == 401


def test_invalid_jwt_rejected():
    """
    Malformed or forged JWT access tokens must be rejected with 401 Unauthorized.
    """
    res = client.get(
        "/metrics/airflow", headers={"Authorization": "Bearer invalid.jwt.token"}
    )
    assert res.status_code == 401
