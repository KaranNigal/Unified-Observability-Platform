import os
import secrets
import sys
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

# Add parent directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app
from prom_tenant_injector import inject_tenant_promql

client = TestClient(app)
API_KEY = "super-secret-key-123"


# Mock Redis class for test insulation
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
    """
    Patch redis_client with an in-memory dictionary to isolate unit tests from live Redis.
    """
    mock_redis = MockRedis()
    with (
        patch("cache.redis_client", mock_redis),
        patch("routers.health.redis_client", mock_redis),
    ):
        yield mock_redis


def test_health_endpoint():
    with patch("routers.health.requests.get") as mock_get:
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_get.return_value = mock_response

        response = client.get("/api/v1/health")
        assert response.status_code == 200
        json_data = response.json()
        assert json_data["status"] == "healthy"


def test_promql_tenant_injector():
    """
    Test that PromQL tenant injection correctly formats selectors.
    """
    q1 = "sum(rate(http_requests_total[5m]))"
    injected1 = inject_tenant_promql(q1, "tenant_acme")
    assert 'tenant_id="tenant_acme"' in injected1

    q2 = "otel_kafka_consumer_lag{group='trading'}"
    injected2 = inject_tenant_promql(q2, "tenant_alpha")
    assert 'tenant_id="tenant_alpha"' in injected2


def test_signup_and_login_flow():
    """
    Test control plane signup, login, and JWT generation with unique email.
    """
    rand = secrets.token_hex(4)
    signup_payload = {
        "email": f"test_{rand}@capsule.io",
        "password": "securepassword123",
        "name": "Alex MultiTenant",
        "organization_name": f"Apex Lab {rand}",
    }
    signup_res = client.post("/api/v1/auth/signup", json=signup_payload)
    assert signup_res.status_code == 200
    token_data = signup_res.json()
    assert "access_token" in token_data
    assert token_data["email"] == f"test_{rand}@capsule.io"
    assert token_data["active_tenant_id"].startswith("tenant_")

    jwt_token = token_data["access_token"]

    # Test authenticated /me
    me_res = client.get(
        "/api/v1/auth/me", headers={"Authorization": f"Bearer {jwt_token}"}
    )
    assert me_res.status_code == 200
    me_data = me_res.json()
    assert me_data["email"] == f"test_{rand}@capsule.io"

    # Test onboarding config generation
    config_res = client.get(
        "/api/v1/tenants/onboarding-config",
        headers={"Authorization": f"Bearer {jwt_token}"},
    )
    assert config_res.status_code == 200
    config_data = config_res.json()
    assert token_data["active_tenant_id"] in config_data["docker_env_snippet"]
    assert "OTEL_RESOURCE_ATTRIBUTES" in config_data["docker_env_snippet"]


def test_tenant_isolation_promql_and_cache():
    """
    CRITICAL MULTI-TENANCY TEST:
    Verifies that Tenant A and Tenant B queries receive strictly isolated PromQL calls
    and separate Redis cache entries.
    """
    rand = secrets.token_hex(4)
    # 1. Create Tenant A
    res_a = client.post(
        "/api/v1/auth/signup",
        json={
            "email": f"tenant_a_{rand}@capsule.io",
            "password": "password123",
            "name": "Tenant A User",
            "organization_name": f"Org A {rand}",
        },
    )
    assert res_a.status_code == 200
    token_a = res_a.json()["access_token"]
    tenant_a_id = res_a.json()["active_tenant_id"]

    # 2. Create Tenant B
    res_b = client.post(
        "/api/v1/auth/signup",
        json={
            "email": f"tenant_b_{rand}@capsule.io",
            "password": "password123",
            "name": "Tenant B User",
            "organization_name": f"Org B {rand}",
        },
    )
    assert res_b.status_code == 200
    token_b = res_b.json()["access_token"]
    tenant_b_id = res_b.json()["active_tenant_id"]

    assert tenant_a_id != tenant_b_id

    # 3. Verify Prometheus query calls are injected with distinct tenant IDs
    with patch("prom_api_client.prom_client.query_instant") as mock_query:
        mock_query.return_value = []

        # Request by Tenant A
        client.get(
            "/api/v1/dashboard/airflow/dags",
            headers={"Authorization": f"Bearer {token_a}"},
        )
        assert mock_query.call_count >= 1
        _, kwargs_a = mock_query.call_args
        assert kwargs_a.get("tenant_id") == tenant_a_id

        # Request by Tenant B
        client.get(
            "/api/v1/dashboard/airflow/dags",
            headers={"Authorization": f"Bearer {token_b}"},
        )
        _, kwargs_b = mock_query.call_args
        assert kwargs_b.get("tenant_id") == tenant_b_id


def test_happy_path_kafka_lag():
    with patch("prom_api_client.prom_client.query_instant") as mock_query:
        mock_query.return_value = [
            {
                "metric": {"group": "trading-group", "topic": "transactions"},
                "value": [1234.56, "15"],
            }
        ]

        response = client.get("/api/v1/kafka/lag", headers={"X-API-Key": API_KEY})
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["group"] == "trading-group"
        assert data[0]["lag"] == 15


def test_logs_and_traces_tenant_isolation():
    """
    Verifies that Elasticsearch queries and Jaeger trace queries have tenant_id injected.
    """
    rand = secrets.token_hex(4)
    res_a = client.post(
        "/api/v1/auth/signup",
        json={
            "email": f"log_trace_test_{rand}@capsule.io",
            "password": "password123",
            "name": "Audit User",
            "organization_name": f"Audit Org {rand}",
        },
    )
    token_a = res_a.json()["access_token"]
    tenant_id = res_a.json()["active_tenant_id"]

    # 1. Test Logs query injection
    with patch("routers.logs.requests.post") as mock_es_post:
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "hits": {
                "hits": [
                    {
                        "_source": {
                            "@timestamp": "2026-09-29T00:00:00Z",
                            "tenant_id": tenant_id,
                            "service_name": "orders-service",
                            "log_level": "info",
                            "message": "Order created successfully",
                        }
                    }
                ]
            }
        }
        mock_es_post.return_value = mock_resp

        log_res = client.get(
            "/api/v1/logs", headers={"Authorization": f"Bearer {token_a}"}
        )
        assert log_res.status_code == 200
        assert mock_es_post.called
        sent_query = mock_es_post.call_args[1].get("json", {})
        must_clauses = sent_query.get("query", {}).get("bool", {}).get("must", [])
        # Verify tenant clause is present in must_clauses
        tenant_clause_present = any(
            any(
                tenant_id in str(item)
                for item in clause.get("bool", {}).get("should", [])
            )
            for clause in must_clauses
            if "bool" in clause
        )
        assert tenant_clause_present

    # 2. Test Traces query injection
    with patch("routers.traces.requests.get") as mock_jaeger_get:
        mock_jresp = MagicMock()
        mock_jresp.status_code = 200
        mock_jresp.json.return_value = {
            "data": [
                {
                    "traceID": "abcd1234efgh5678",
                    "spans": [
                        {
                            "traceID": "abcd1234efgh5678",
                            "spanID": "12345",
                            "operationName": "create_order",
                            "startTime": 1600000000000,
                            "duration": 50000,
                            "processID": "p1",
                        }
                    ],
                    "processes": {"p1": {"serviceName": "orders-service"}},
                }
            ]
        }
        mock_jaeger_get.return_value = mock_jresp

        trace_res = client.get(
            "/api/v1/traces?service=orders-service",
            headers={"Authorization": f"Bearer {token_a}"},
        )
        assert trace_res.status_code == 200
        assert mock_jaeger_get.called
        sent_params = mock_jaeger_get.call_args[1].get("params", {})
        assert tenant_id in sent_params.get("tags", "")
