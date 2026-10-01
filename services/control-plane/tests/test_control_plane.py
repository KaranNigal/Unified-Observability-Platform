import os
import sys

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Set up module path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.db import Base, get_db
from src.main import app

# Create in-memory SQLite database for test suite isolation
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(autouse=True)
def setup_database():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client():
    return TestClient(app)


# Helper function to create user and org
def create_test_user(
    client,
    name="User A",
    email="usera@test.com",
    password="password123",
    org_name="Org A",
):
    res = client.post(
        "/auth/signup",
        json={
            "name": name,
            "email": email,
            "password": password,
            "organization_name": org_name,
        },
    )
    assert res.status_code == 200
    data = res.json()
    token = data["access_token"]

    # Get user's org id
    orgs_res = client.get(
        "/organizations", headers={"Authorization": f"Bearer {token}"}
    )
    assert orgs_res.status_code == 200
    org_id = orgs_res.json()[0]["id"]

    return {
        "user_id": data["user_id"],
        "token": token,
        "refresh_token": data["refresh_token"],
        "email": email,
        "org_id": org_id,
        "headers": {"Authorization": f"Bearer {token}"},
    }


# ---------------------------------------------------------------------------
# 1. Auth & JWT Refresh Tests
# ---------------------------------------------------------------------------


def test_signup_and_login(client):
    # Signup
    res = client.post(
        "/auth/signup",
        json={
            "name": "Jane Doe",
            "email": "jane@example.com",
            "password": "securepassword",
            "organization_name": "Jane Labs",
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["email"] == "jane@example.com"

    # Login
    login_res = client.post(
        "/auth/login", json={"email": "jane@example.com", "password": "securepassword"}
    )
    assert login_res.status_code == 200
    login_data = login_res.json()
    assert "access_token" in login_data

    # Token Refresh
    refresh_res = client.post(
        "/auth/refresh", json={"refresh_token": login_data["refresh_token"]}
    )
    assert refresh_res.status_code == 200
    ref_data = refresh_res.json()
    assert "access_token" in ref_data
    assert "refresh_token" in ref_data


def test_login_invalid_password(client):
    create_test_user(client, email="alice@test.com")
    res = client.post(
        "/auth/login", json={"email": "alice@test.com", "password": "wrongpassword"}
    )
    assert res.status_code == 401
    assert "Invalid email or password" in res.json()["detail"]


# ---------------------------------------------------------------------------
# 2. Multi-Tenant Negative Tests: User in Org A CANNOT read/modify Org B's data
# ---------------------------------------------------------------------------


def test_org_cross_tenant_isolation(client):
    user_a = create_test_user(
        client, name="User A", email="usera@org-a.com", org_name="Alpha Corp"
    )
    user_b = create_test_user(
        client, name="User B", email="userb@org-b.com", org_name="Beta Inc"
    )

    assert user_a["org_id"] != user_b["org_id"]

    # User A tries to GET Org B's details -> 403 Forbidden
    res = client.get(f"/organizations/{user_b['org_id']}", headers=user_a["headers"])
    assert res.status_code == 403
    assert "Access denied" in res.json()["detail"]

    # User A tries to PATCH Org B -> 403 Forbidden
    res = client.patch(
        f"/organizations/{user_b['org_id']}",
        json={"name": "Hacked Org"},
        headers=user_a["headers"],
    )
    assert res.status_code == 403

    # User A tries to DELETE Org B -> 403 Forbidden
    res = client.delete(f"/organizations/{user_b['org_id']}", headers=user_a["headers"])
    assert res.status_code == 403

    # User A tries to list Org B's members -> 403 Forbidden
    res = client.get(
        f"/organizations/{user_b['org_id']}/members", headers=user_a["headers"]
    )
    assert res.status_code == 403

    # User A tries to list Org B's API keys -> 403 Forbidden
    res = client.get(
        f"/organizations/{user_b['org_id']}/api-keys", headers=user_a["headers"]
    )
    assert res.status_code == 403

    # User A tries to CREATE an API key in Org B -> 403 Forbidden
    res = client.post(
        f"/organizations/{user_b['org_id']}/api-keys",
        json={"name": "Injected Key"},
        headers=user_a["headers"],
    )
    assert res.status_code == 403


# ---------------------------------------------------------------------------
# 3. RBAC: Role-based Permission Enforcement (Viewer vs Admin vs Owner)
# ---------------------------------------------------------------------------


def test_rbac_permissions(client):
    owner = create_test_user(
        client, name="Owner", email="owner@corp.com", org_name="Dev Corp"
    )
    org_id = owner["org_id"]

    # Create a second user to invite
    viewer_signup = client.post(
        "/auth/signup",
        json={
            "name": "Viewer User",
            "email": "viewer@corp.com",
            "password": "password123",
            "organization_name": "Temp Org",
        },
    ).json()
    viewer_token = viewer_signup["access_token"]
    viewer_headers = {"Authorization": f"Bearer {viewer_token}"}

    # Owner invites Viewer as 'viewer'
    invite_res = client.post(
        f"/organizations/{org_id}/members",
        json={"email": "viewer@corp.com", "role": "viewer"},
        headers=owner["headers"],
    )
    assert invite_res.status_code == 200
    assert invite_res.json()["role"] == "viewer"

    # Viewer CAN read org details
    res = client.get(f"/organizations/{org_id}", headers=viewer_headers)
    assert res.status_code == 200

    # Viewer CANNOT create API keys -> 403 Forbidden
    res = client.post(
        f"/organizations/{org_id}/api-keys",
        json={"name": "Viewer Key"},
        headers=viewer_headers,
    )
    assert res.status_code == 403
    assert "Forbidden" in res.json()["detail"]

    # Viewer CANNOT invite members -> 403 Forbidden
    res = client.post(
        f"/organizations/{org_id}/members",
        json={"email": "another@corp.com", "role": "viewer"},
        headers=viewer_headers,
    )
    assert res.status_code == 403

    # Viewer CANNOT update org info -> 403 Forbidden
    res = client.patch(
        f"/organizations/{org_id}",
        json={"name": "Renamed by Viewer"},
        headers=viewer_headers,
    )
    assert res.status_code == 403


# ---------------------------------------------------------------------------
# 4. API Key Lifecycle: Creation, Verification, and Revocation
# ---------------------------------------------------------------------------


def test_api_key_lifecycle_and_revocation(client):
    owner = create_test_user(
        client, name="Key Master", email="keymaster@test.com", org_name="Key Lab"
    )
    org_id = owner["org_id"]

    # 1. Create API key (Prefixed with uop_live_)
    create_res = client.post(
        f"/organizations/{org_id}/api-keys",
        json={"name": "Production Ingestion Key"},
        headers=owner["headers"],
    )
    assert create_res.status_code == 200
    key_data = create_res.json()
    assert "raw_key" in key_data
    raw_key = key_data["raw_key"]
    key_id = key_data["id"]

    # Verify format
    assert raw_key.startswith("uop_live_")
    assert key_data["key_prefix"].startswith("uop_live_")
    assert key_data["is_revoked"] is False

    # 2. Verify active key via verification endpoint
    verify_res = client.post("/api-keys/verify", json={"raw_key": raw_key})
    assert verify_res.status_code == 200
    verify_data = verify_res.json()
    assert verify_data["valid"] is True
    assert verify_data["org_id"] == org_id

    # 3. Revoke the API key
    revoke_res = client.post(
        f"/organizations/{org_id}/api-keys/{key_id}/revoke", headers=owner["headers"]
    )
    assert revoke_res.status_code == 200
    assert revoke_res.json()["is_revoked"] is True
    assert revoke_res.json()["revoked_at"] is not None

    # 4. Attempt to verify revoked key -> MUST BE REJECTED
    verify_revoked_res = client.post("/api-keys/verify", json={"raw_key": raw_key})
    assert verify_revoked_res.status_code == 200
    verify_revoked_data = verify_revoked_res.json()
    assert verify_revoked_data["valid"] is False
    assert "revoked" in verify_revoked_data["reason"].lower()


# ---------------------------------------------------------------------------
# 5. Swagger Documentation Endpoint Acceptance
# ---------------------------------------------------------------------------


def test_swagger_docs_endpoints(client):
    docs_res = client.get("/control-plane/docs")
    assert docs_res.status_code == 200
    assert "html" in docs_res.headers.get("content-type", "").lower()

    openapi_res = client.get("/control-plane/openapi.json")
    assert openapi_res.status_code == 200
    openapi_data = openapi_res.json()
    assert openapi_data["info"]["title"] == "Capsule Control Plane API"
