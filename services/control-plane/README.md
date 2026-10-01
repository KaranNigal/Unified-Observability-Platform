# Capsule Control Plane Service

The **Capsule Control Plane** is a dedicated FastAPI microservice responsible for multi-tenant identity, organization hierarchies, role-based access control (RBAC), and API key lifecycles.

---

## Architecture & Database Strategy

- **Database**: PostgreSQL (reusing the platform PostgreSQL container `obs-postgres`, database `airflow`).
- **Namespace Strategy**: Uses dedicated table prefixes (`cp_organizations`, `cp_users`, `cp_memberships`, `cp_api_keys`) to eliminate any schema or table name collisions with existing Airflow metadata tables.
- **Port**: `8005`
- **Interactive Documentation**: Swagger UI at `/control-plane/docs` (OpenAPI schema at `/control-plane/openapi.json`).

---

## Data Models

### 1. `cp_organizations`
| Column | Type | Description |
|---|---|---|
| `id` | `VARCHAR(36)` (UUID) | Primary Key |
| `name` | `VARCHAR(255)` | Display name of the organization |
| `slug` | `VARCHAR(255)` | Unique URL-friendly slug |
| `created_at` | `TIMESTAMP` | Creation timestamp (UTC) |
| `updated_at` | `TIMESTAMP` | Last updated timestamp (UTC) |

### 2. `cp_users`
| Column | Type | Description |
|---|---|---|
| `id` | `VARCHAR(36)` (UUID) | Primary Key |
| `email` | `VARCHAR(255)` | Unique lowercase email |
| `name` | `VARCHAR(255)` | User full name |
| `hashed_password` | `VARCHAR(255)` | bcrypt salted hash |
| `created_at` | `TIMESTAMP` | Registration timestamp (UTC) |

### 3. `cp_memberships`
| Column | Type | Description |
|---|---|---|
| `id` | `VARCHAR(36)` (UUID) | Primary Key |
| `org_id` | `VARCHAR(36)` | Foreign Key -> `cp_organizations.id` |
| `user_id` | `VARCHAR(36)` | Foreign Key -> `cp_users.id` |
| `role` | `VARCHAR(50)` | `owner`, `admin`, or `viewer` |
| `created_at` | `TIMESTAMP` | Membership timestamp |

### 4. `cp_api_keys`
| Column | Type | Description |
|---|---|---|
| `id` | `VARCHAR(36)` (UUID) | Primary Key |
| `org_id` | `VARCHAR(36)` | Foreign Key -> `cp_organizations.id` |
| `key_hash` | `VARCHAR(255)` | SHA-256 hash of raw API key |
| `key_prefix` | `VARCHAR(50)` | Prefixed with `uop_live_` (e.g. `uop_live_a1b2c3...`) |
| `name` | `VARCHAR(255)` | Human-readable key name |
| `is_revoked` | `BOOLEAN` | Revocation status |
| `last_used_at` | `TIMESTAMP` | Last authentication timestamp (nullable) |
| `created_at` | `TIMESTAMP` | Key issuance timestamp |
| `revoked_at` | `TIMESTAMP` | Key revocation timestamp (nullable) |

---

## API Endpoints

### Authentication (`/auth`)
- `POST /auth/signup`: Registers a user, provisions initial organization, assigns `owner` role, and returns JWT access + refresh tokens.
- `POST /auth/login`: Authenticates email/password, returning JWT access + refresh tokens.
- `POST /auth/refresh`: Issues a refreshed access token using a valid refresh token.
- `GET /auth/me`: Returns the authenticated user profile.

### Organizations & Memberships (`/organizations`)
- `POST /organizations`: Creates a new organization.
- `GET /organizations`: Lists all organizations the authenticated user belongs to.
- `GET /organizations/{org_id}`: Retrieves organization details (scoped to members).
- `PATCH /organizations/{org_id}`: Updates organization name or slug (requires `admin`/`owner`).
- `DELETE /organizations/{org_id}`: Deletes organization (requires `owner`).
- `POST /organizations/{org_id}/members`: Invites a registered user with role `owner`, `admin`, or `viewer`.
- `GET /organizations/{org_id}/members`: Lists members of the organization.
- `PATCH /organizations/{org_id}/members/{membership_id}`: Updates a member's role.
- `DELETE /organizations/{org_id}/members/{membership_id}`: Removes a member.

### API Keys (`/organizations/{org_id}/api-keys` and `/api-keys`)
- `POST /organizations/{org_id}/api-keys`: Generates a new API key prefixed with `uop_live_` (returns raw key once, stores SHA-256 hash).
- `GET /organizations/{org_id}/api-keys`: Lists active/revoked API keys with prefixes.
- `POST /organizations/{org_id}/api-keys/{key_id}/revoke`: Immediately revokes an API key.
- `POST /api-keys/verify`: Internal verification endpoint used by the Telemetry Gateway.

---

## Running Automated Tests

Run the full control plane test suite (including cross-tenant isolation and negative permission tests):

```bash
pytest services/control-plane/tests/test_control_plane.py
```
