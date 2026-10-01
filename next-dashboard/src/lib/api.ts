// All real API endpoints served by the FastAPI Metrics API (api/ folder)
// Default port: 8004 (set via METRICS_API_URL env var)

export const METRICS_API_URL =
  process.env.NEXT_PUBLIC_METRICS_API_URL || "http://localhost:8004";

const TOKEN_STORAGE_KEY = "capsule_auth_token";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setStoredToken(token: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  }
}

export function clearStoredToken() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  } else {
    headers["X-API-Key"] = process.env.NEXT_PUBLIC_API_KEY || "super-secret-key-123";
  }

  const url = `${METRICS_API_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers,
    cache: "no-store",
  });

  if (!res.ok) {
    const errorText = await res.text();
    let detail = errorText;
    try {
      const parsed = JSON.parse(errorText);
      detail = parsed.detail || errorText;
    } catch {
      // keep raw text
    }
    throw new Error(detail || `API Error ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ─── Type Definitions ────────────────────────────────────────────────────────

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user_id: string;
  email: string;
  name: string;
  active_tenant_id: string;
  active_org_id: string;
  active_org_name: string;
  role: string;
}

export interface UserOrganization {
  id: string;
  name: string;
  slug: string;
  tenant_id: string;
  role: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  created_at: string;
  active_tenant_id: string;
  active_org_id: string;
  organizations: UserOrganization[];
}

export interface OnboardingConfig {
  tenant_id: string;
  organization_id: string;
  organization_name: string;
  active_api_key_prefix: string;
  otel_exporter_otlp_endpoint_grpc: string;
  otel_exporter_otlp_endpoint_http: string;
  otel_resource_attributes: string;
  statsd_host: string;
  statsd_port: number;
  pushgateway_target: string;
  docker_env_snippet: string;
  python_otel_snippet: string;
  bash_export_snippet: string;
}

export interface ProjectItem {
  id: string;
  name: string;
  description: string;
  tenant_id: string;
  created_at: string;
}

export interface ApiKeyItem {
  id: string;
  name: string;
  key_prefix: string;
  raw_key?: string;
  tenant_id: string;
  created_at: string;
  is_active: boolean;
}

export interface SystemHealth {
  status: string;
  active_alert_count: number;
  tenant_id?: string;
  components: {
    airflow: string;
    pyspark: string;
    microservices: string;
    kafka: string;
  };
}

export interface ServiceHealth {
  status: string;
  services: {
    redis: string;
    prometheus: string;
    elasticsearch: string;
  };
}

export interface AirflowDag {
  dag_id: string;
  success_count: number;
  failure_count: number;
  total_runs: number;
  success_rate: number;
}

export interface AirflowLiveDag {
  dag_id: string;
  dag_display_name?: string;
  description?: string | null;
  fileloc?: string;
  is_active: boolean;
  is_paused: boolean;
  has_import_errors: boolean;
  schedule_interval?: {
    __type?: string;
    value?: string;
  } | string | null;
  timetable_description?: string;
  next_dagrun?: string | null;
  tags?: { name: string }[];
  owners?: string[];
  max_active_runs?: number;
}

export interface AirflowDagRun {
  dag_id: string;
  dag_run_id: string;
  execution_date: string;
  start_date: string | null;
  end_date: string | null;
  state: "success" | "running" | "failed" | "queued" | string;
  run_type: "manual" | "scheduled" | "backfill" | string;
  external_trigger: boolean;
  conf?: Record<string, any>;
}

export interface AirflowTask {
  task_id: string;
  p50: number;
  p95: number;
  max: number;
}

export interface PysparkJob {
  job_name: string;
  duration_seconds: number;
  records_processed: number;
  status: string;
}

export interface PysparkExecutors {
  job_id: string;
  executor_count: number;
  cpu_utilization_pct: number;
  memory_utilization_pct: number;
}

export interface MicroserviceMetrics {
  service: string;
  request_rate: number;
  error_rate_pct: number;
  latency_p50_ms: number;
  latency_p95_ms: number;
  latency_p99_ms: number;
}

export interface KafkaThroughput {
  producer_message_rate: number;
  consumer_message_rate: number;
}

export interface KafkaLagEntry {
  group: string;
  topic: string;
  lag: number;
}

export interface PrometheusAlert {
  labels: Record<string, string>;
  annotations: Record<string, string>;
  state: string;
  activeAt: string;
  value: string;
}

export interface AlertsAndRules {
  rules: unknown[];
  active_alerts: PrometheusAlert[];
}

export interface LogEntry {
  timestamp: string;
  level: string;
  component: string;
  message: string;
  trace_id: string;
  tenant_id?: string;
}

export interface Span {
  span_id: string;
  parent_span_id: string | null;
  operation: string;
  service: string;
  start_time_ms: number;
  duration_ms: number;
  tenant_id?: string;
}

export interface Trace {
  trace_id: string;
  start_time_ms: number;
  total_duration_ms: number;
  span_count: number;
  tenant_id?: string;
  spans: Span[];
}

// ─── API Calls ────────────────────────────────────────────────────────────────

export const metricsApi = {
  // Auth endpoints
  login: (data: { email: string; password: string }) =>
    apiFetch<AuthResponse>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  signup: (data: { email: string; password: string; name: string; organization_name?: string }) =>
    apiFetch<AuthResponse>("/api/v1/auth/signup", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getMe: () => apiFetch<UserProfile>("/api/v1/auth/me"),

  switchTenant: (orgId: string) =>
    apiFetch<AuthResponse>("/api/v1/auth/switch-tenant", {
      method: "POST",
      body: JSON.stringify({ org_id: orgId }),
    }),

  // Multi-Tenant Onboarding & Config
  getOnboardingConfig: () =>
    apiFetch<OnboardingConfig>("/api/v1/tenants/onboarding-config"),

  getProjects: () =>
    apiFetch<ProjectItem[]>("/api/v1/tenants/projects"),

  createProject: (data: { name: string; description?: string }) =>
    apiFetch<ProjectItem>("/api/v1/tenants/projects", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getApiKeys: () =>
    apiFetch<ApiKeyItem[]>("/api/v1/tenants/api-keys"),

  createApiKey: (data: { name: string }) =>
    apiFetch<ApiKeyItem>("/api/v1/tenants/api-keys", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Overall system health
  getSystemHealth: () =>
    apiFetch<SystemHealth>("/api/v1/dashboard/system-health"),

  // Infrastructure health
  getServiceHealth: () => apiFetch<ServiceHealth>("/api/v1/health"),

  // Airflow DAG-level aggregate
  getAirflowDags: (range: string = "1h") =>
    apiFetch<AirflowDag[]>(`/api/v1/dashboard/airflow/dags?range=${range}`),

  // Airflow task-level duration
  getAirflowTasks: (dagId: string, range: string = "1h") =>
    apiFetch<AirflowTask[]>(
      `/api/v1/dashboard/airflow/tasks?dag_id=${dagId}&range=${range}`
    ),

  // PySpark jobs
  getSparkJobs: (range: string = "1h") =>
    apiFetch<PysparkJob[]>(`/api/v1/dashboard/pyspark/jobs?range=${range}`),

  // PySpark executor resource utilisation
  getSparkExecutors: (jobId: string) =>
    apiFetch<PysparkExecutors>(
      `/api/v1/dashboard/pyspark/executors?job_id=${jobId}`
    ),

  // Microservice latency + error/request rate
  getMicroserviceMetrics: (service: string, range: string = "1h") =>
    apiFetch<MicroserviceMetrics>(
      `/api/v1/dashboard/microservices?service=${service}&range=${range}`
    ),

  // Kafka producer/consumer message rates
  getKafkaThroughput: (range: string = "1h") =>
    apiFetch<KafkaThroughput>(
      `/api/v1/dashboard/kafka/throughput?range=${range}`
    ),

  // Kafka consumer group lag per topic
  getKafkaLag: () => apiFetch<KafkaLagEntry[]>("/api/v1/kafka/lag"),

  // All active Prometheus firing alerts + rules
  getAlerts: () => apiFetch<AlertsAndRules>("/api/v1/alerts"),

  // Raw component metrics (instant)
  getRawMetrics: (component: string) =>
    apiFetch<Record<string, unknown>>(`/api/v1/metrics/${component}`),

  // Centralized logs from Elasticsearch
  getLogs: (component?: string, level?: string, search?: string, limit: number = 100) => {
    const params = new URLSearchParams();
    if (component) params.append("component", component);
    if (level) params.append("level", level);
    if (search) params.append("search", search);
    params.append("limit", limit.toString());
    return apiFetch<LogEntry[]>(`/api/v1/logs?${params.toString()}`);
  },

  // Traces from Jaeger
  getTraces: (service: string, limit: number = 20) => {
    return apiFetch<Trace[]>(`/api/v1/traces?service=${service}&limit=${limit}`);
  },

  // Airflow Management & Control Plane
  getAirflowHealth: async () => {
    const token = getStoredToken();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch("/api/airflow/health", { cache: "no-store", headers });
    return res.json();
  },

  getAirflowLiveDags: async () => {
    const token = getStoredToken();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch("/api/airflow/dags", { cache: "no-store", headers });
    return res.json() as Promise<{ dags: AirflowLiveDag[]; total_entries: number; error?: string }>;
  },

  triggerAirflowDag: async (dagId: string, conf: Record<string, any> = {}) => {
    const token = getStoredToken();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch("/api/airflow/trigger", {
      method: "POST",
      headers,
      body: JSON.stringify({ dag_id: dagId, conf }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  toggleAirflowDagPause: async (dagId: string, isPaused: boolean) => {
    const token = getStoredToken();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch("/api/airflow/pause", {
      method: "POST",
      headers,
      body: JSON.stringify({ dag_id: dagId, is_paused: isPaused }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  getAirflowDagRuns: async (dagId: string, limit: number = 10) => {
    const token = getStoredToken();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch(`/api/airflow/runs?dag_id=${encodeURIComponent(dagId)}&limit=${limit}`, {
      cache: "no-store",
      headers,
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<{ dag_runs: AirflowDagRun[]; total_entries: number }>;
  },

  deployAirflowDag: async (dagId: string, filename: string, code: string) => {
    const res = await fetch("/api/airflow/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dag_id: dagId, filename, code }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `HTTP ${res.status}`);
    }
    return res.json();
  },
};

