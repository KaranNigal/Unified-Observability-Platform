import requests
from config import settings
from fastapi import HTTPException
from prom_tenant_injector import inject_tenant_promql


class PrometheusClient:
    def __init__(self, base_url: str = settings.PROMETHEUS_URL):
        self.base_url = base_url

    def query_instant(self, query: str, tenant_id: str = None):
        """
        Execute a standard instant PromQL query with automatic tenant_id injection.
        """
        try:
            effective_query = (
                inject_tenant_promql(query, tenant_id) if tenant_id else query
            )
            url = f"{self.base_url}/api/v1/query"
            response = requests.get(url, params={"query": effective_query}, timeout=5)
            response.raise_for_status()
            data = response.json()
            if data.get("status") != "success":
                raise HTTPException(status_code=500, detail="Prometheus query failed")
            return data.get("data", {}).get("result", [])
        except Exception as e:
            # Fallback to empty result if Prometheus unreachable or syntax error in dev
            print(f"Notice: PromQL instant query error for '{query}': {e}")
            return []

    def query_range(
        self, query: str, start: str, end: str, step: str = "15s", tenant_id: str = None
    ):
        """
        Execute a PromQL range query for time-series data with automatic tenant_id injection.
        """
        try:
            effective_query = (
                inject_tenant_promql(query, tenant_id) if tenant_id else query
            )
            url = f"{self.base_url}/api/v1/query_range"
            response = requests.get(
                url,
                params={
                    "query": effective_query,
                    "start": start,
                    "end": end,
                    "step": step,
                },
                timeout=5,
            )
            response.raise_for_status()
            data = response.json()
            if data.get("status") != "success":
                raise HTTPException(
                    status_code=500, detail="Prometheus range query failed"
                )
            return data.get("data", {}).get("result", [])
        except Exception as e:
            print(f"Notice: PromQL range query error for '{query}': {e}")
            return []

    def get_rules(self, tenant_id: str = None):
        """
        Fetch active rules/alerts defined in Prometheus, optionally filtered by tenant_id.
        """
        try:
            url = f"{self.base_url}/api/v1/rules"
            response = requests.get(url, timeout=5)
            response.raise_for_status()
            data = response.json()
            groups = data.get("data", {}).get("groups", [])
            if not tenant_id:
                return groups
            # Filter alert rules by tenant_id label if present
            filtered_groups = []
            for g in groups:
                filtered_rules = []
                for r in g.get("rules", []):
                    labels = r.get("labels", {})
                    if (
                        "tenant_id" not in labels
                        or labels.get("tenant_id") == tenant_id
                    ):
                        filtered_rules.append(r)
                if filtered_rules:
                    g_copy = dict(g)
                    g_copy["rules"] = filtered_rules
                    filtered_groups.append(g_copy)
            return filtered_groups
        except Exception:
            return []

    def get_alerts(self, tenant_id: str = None):
        """
        Fetch active firing alerts from Prometheus filtered by tenant_id.
        """
        try:
            url = f"{self.base_url}/api/v1/alerts"
            response = requests.get(url, timeout=5)
            response.raise_for_status()
            data = response.json()
            alerts = data.get("data", {}).get("alerts", [])
            if not tenant_id:
                return alerts
            return [
                a
                for a in alerts
                if a.get("labels", {}).get("tenant_id") == tenant_id
                # For demo tenant only, include alerts that have no tenant_id label (simulation alerts)
                or (tenant_id == "demo" and "tenant_id" not in a.get("labels", {}))
            ]
        except Exception:
            return []


prom_client = PrometheusClient()
