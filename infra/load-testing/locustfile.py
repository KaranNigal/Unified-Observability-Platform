import os

from locust import HttpUser, between, task


class TenantABurstUser(HttpUser):
    """
    Tenant A: High-burst noisy neighbor simulating aggressive polling and telemetry queries.
    """

    wait_time = between(0.1, 0.4)
    weight = 4  # 80% of traffic

    def on_start(self):
        self.headers = {
            "X-API-Key": os.environ.get("TENANT_A_API_KEY", "uop_live_demo")
        }

    @task(4)
    def test_component_metrics(self):
        self.client.get(
            "/api/v1/metrics/airflow",
            headers=self.headers,
            name="[Tenant A] /metrics/{component}",
        )

    @task(3)
    def test_kafka_lag(self):
        self.client.get(
            "/api/v1/kafka/lag", headers=self.headers, name="[Tenant A] /kafka/lag"
        )

    @task(2)
    def test_dashboard_summary(self):
        self.client.get(
            "/api/v1/dashboard/summary",
            headers=self.headers,
            name="[Tenant A] /dashboard/summary",
        )

    @task(1)
    def test_logs_search(self):
        self.client.get(
            "/api/v1/logs/search?level=error&limit=50",
            headers=self.headers,
            name="[Tenant A] /logs/search",
        )

    @task(1)
    def test_traces_search(self):
        self.client.get(
            "/api/v1/traces/search?service=orders-service&limit=20",
            headers=self.headers,
            name="[Tenant A] /traces/search",
        )


class TenantBSteadyUser(HttpUser):
    """
    Tenant B: Steady baseline user measuring isolation latency under neighbor burst load.
    """

    wait_time = between(0.8, 1.5)
    weight = 1  # 20% of traffic

    def on_start(self):
        self.headers = {
            "X-API-Key": os.environ.get("TENANT_B_API_KEY", "uop_live_demo")
        }

    @task(3)
    def test_component_metrics(self):
        self.client.get(
            "/api/v1/metrics/microservice",
            headers=self.headers,
            name="[Tenant B - Isolated] /metrics/{component}",
        )

    @task(2)
    def test_dashboard_summary(self):
        self.client.get(
            "/api/v1/dashboard/summary",
            headers=self.headers,
            name="[Tenant B - Isolated] /dashboard/summary",
        )

    @task(1)
    def test_kafka_lag(self):
        self.client.get(
            "/api/v1/kafka/lag",
            headers=self.headers,
            name="[Tenant B - Isolated] /kafka/lag",
        )

    @task(1)
    def test_logs_search(self):
        self.client.get(
            "/api/v1/logs/search?level=info&limit=50",
            headers=self.headers,
            name="[Tenant B - Isolated] /logs/search",
        )
