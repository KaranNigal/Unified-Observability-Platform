"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  GitBranch,
  Play,
  Pause,
  Plus,
  RefreshCw,
  ExternalLink,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  Activity,
  Layers,
  Code2,
  Terminal,
  Database,
  Sparkles,
  ArrowRight,
  ChevronRight,
  Sliders,
  Check,
  Copy,
  AlertTriangle,
  Info,
  Send,
  Eye,
  Settings2,
  Calendar,
  Box,
  FileCode,
  ShieldCheck,
  TrendingUp
} from "lucide-react";
import { metricsApi, AirflowLiveDag, AirflowDagRun, AirflowDag } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import RcaButton from "./RcaButton";

// ─── Pipeline Templates ───────────────────────────────────────────────────────
interface PipelineTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  icon: string;
  defaultDagId: string;
  defaultSchedule: string;
  defaultTags: string[];
  generateCode: (params: { dagId: string; schedule: string; owner: string; description: string; tags: string[] }) => string;
}

const PIPELINE_TEMPLATES: PipelineTemplate[] = [
  {
    id: "etl_dwh",
    name: "PostgreSQL Data Warehouse ETL",
    category: "Batch ETL",
    description: "Extract raw business records, validate schemas, transform aggregations, and load into PostgreSQL warehouse.",
    icon: "database",
    defaultDagId: "production_dwh_etl_pipeline",
    defaultSchedule: "0 */4 * * *",
    defaultTags: ["etl", "postgres", "data-warehouse", "batch"],
    generateCode: ({ dagId, schedule, owner, description, tags }) => `"""
Airflow DAG: ${dagId}
Description: ${description || "Automated ETL Pipeline to PostgreSQL Data Warehouse"}
Author: ${owner}
Generated via Capsule Data Observability Platform
"""

from datetime import datetime, timedelta
from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.operators.bash import BashOperator

default_args = {
    "owner": "${owner}",
    "depends_on_past": False,
    "email_on_failure": False,
    "email_on_retry": False,
    "retries": 2,
    "retry_delay": timedelta(minutes=3),
}

def extract_source_data(**context):
    print("Extracting staging data from source systems...")
    return {"extracted_rows": 15420, "timestamp": str(datetime.utcnow())}

def validate_schema_quality(**context):
    ti = context["ti"]
    meta = ti.xcom_pull(task_ids="extract_staging_data")
    print(f"Validating {meta.get('extracted_rows', 0)} records against schema constraints...")
    return True

def transform_aggregates(**context):
    print("Computing metrics: 1h VWAP, active users, session counts...")
    return {"transformed_rows": 15420, "status": "CLEAN"}

def load_into_dwh(**context):
    print("Upserting transformed batches into PostgreSQL analytics tables...")
    return "SUCCESS"

with DAG(
    dag_id="${dagId}",
    default_args=default_args,
    description="${description || 'Data Warehouse ETL Pipeline'}",
    schedule_interval="${schedule}",
    start_date=datetime(2026, 1, 1),
    catchup=False,
    tags=${JSON.stringify(tags)},
) as dag:

    extract_task = PythonOperator(
        task_id="extract_staging_data",
        python_callable=extract_source_data,
    )

    validate_task = PythonOperator(
        task_id="validate_schema_quality",
        python_callable=validate_schema_quality,
    )

    transform_task = PythonOperator(
        task_id="transform_business_aggregates",
        python_callable=transform_aggregates,
    )

    load_task = PythonOperator(
        task_id="load_into_postgres_dwh",
        python_callable=load_into_dwh,
    )

    extract_task >> validate_task >> transform_task >> load_task
`
  },
  {
    id: "pyspark_analytics",
    name: "PySpark Distributed Analytics",
    category: "Big Data & Spark",
    description: "Launch PySpark cluster job, process Parquet datasets with partitioned windowing, and emit telemetry.",
    icon: "sparkles",
    defaultDagId: "pyspark_market_analytics_job",
    defaultSchedule: "*/15 * * * *",
    defaultTags: ["pyspark", "analytics", "distributed", "spark"],
    generateCode: ({ dagId, schedule, owner, description, tags }) => `"""
Airflow DAG: ${dagId}
Description: ${description || "Distributed PySpark Batch Analytics Pipeline"}
Author: ${owner}
Generated via Capsule Data Observability Platform
"""

from datetime import datetime, timedelta
from airflow import DAG
from airflow.operators.bash import BashOperator
from airflow.operators.python import PythonOperator

default_args = {
    "owner": "${owner}",
    "depends_on_past": False,
    "retries": 1,
    "retry_delay": timedelta(minutes=2),
}

def verify_spark_cluster(**context):
    print("Checking Spark master node at spark://spark-master:7077...")
    return "SPARK_CLUSTER_READY"

with DAG(
    dag_id="${dagId}",
    default_args=default_args,
    description="${description || 'PySpark Big Data Analytics Job'}",
    schedule_interval="${schedule}",
    start_date=datetime(2026, 1, 1),
    catchup=False,
    tags=${JSON.stringify(tags)},
) as dag:

    check_cluster = PythonOperator(
        task_id="verify_spark_cluster_health",
        python_callable=verify_spark_cluster,
    )

    run_spark_job = BashOperator(
        task_id="submit_pyspark_batch_analytics",
        bash_command='''
        echo "Executing PySpark job on Spark cluster..."
        # spark-submit --master spark://spark-master:7077 /opt/airflow/dags/scripts/spark_job.py
        echo "PySpark processing completed successfully."
        ''',
    )

    publish_telemetry = BashOperator(
        task_id="emit_spark_prometheus_metrics",
        bash_command='echo "Emitting PySpark job duration and executor telemetry..."',
    )

    check_cluster >> run_spark_job >> publish_telemetry
`
  },
  {
    id: "kafka_stream_audit",
    name: "Kafka Stream Monitor & Reconciliation",
    category: "Real-time Streams",
    description: "Audit Kafka consumer group lag across order topics, re-drive dead letters, and trigger alerts if threshold breached.",
    icon: "activity",
    defaultDagId: "kafka_orders_lag_reconciler",
    defaultSchedule: "*/5 * * * *",
    defaultTags: ["kafka", "streaming", "observability", "lag"],
    generateCode: ({ dagId, schedule, owner, description, tags }) => `"""
Airflow DAG: ${dagId}
Description: ${description || "Kafka Stream Lag Auditing and DLQ Reconciliation"}
Author: ${owner}
Generated via Capsule Data Observability Platform
"""

from datetime import datetime, timedelta
from airflow import DAG
from airflow.operators.python import PythonOperator

default_args = {
    "owner": "${owner}",
    "retries": 2,
    "retry_delay": timedelta(minutes=1),
}

def check_consumer_lag(**context):
    print("Checking Kafka consumer group lag for 'orders-processor' on broker localhost:9092...")
    return {"total_lag": 42, "critical_topics": []}

def reprocess_dead_letter_queue(**context):
    print("Auditing DLQ 'orders-dlq' for unhandled event payloads...")
    return {"reprocessed": 0, "status": "HEALTHY"}

with DAG(
    dag_id="${dagId}",
    default_args=default_args,
    description="${description || 'Kafka Stream Lag & DLQ Monitor'}",
    schedule_interval="${schedule}",
    start_date=datetime(2026, 1, 1),
    catchup=False,
    tags=${JSON.stringify(tags)},
) as dag:

    t1 = PythonOperator(
        task_id="audit_kafka_consumer_lag",
        python_callable=check_consumer_lag,
    )

    t2 = PythonOperator(
        task_id="reconcile_dead_letter_queue",
        python_callable=reprocess_dead_letter_queue,
    )

    t1 >> t2
`
  },
  {
    id: "trading_anomaly",
    name: "High-Frequency Trading Telemetry",
    category: "Trading & Finance",
    description: "Reconcile order executions, compute slippage metrics, verify risk limits, and emit OpenTelemetry spans.",
    icon: "trendingUp",
    defaultDagId: "hft_trading_risk_pipeline",
    defaultSchedule: "*/2 * * * *",
    defaultTags: ["trading", "hft", "risk", "telemetry"],
    generateCode: ({ dagId, schedule, owner, description, tags }) => `"""
Airflow DAG: ${dagId}
Description: ${description || "HFT Trade Verification & Risk Telemetry"}
Author: ${owner}
Generated via Capsule Data Observability Platform
"""

from datetime import datetime, timedelta
from airflow import DAG
from airflow.operators.python import PythonOperator

default_args = {
    "owner": "${owner}",
    "retries": 1,
    "retry_delay": timedelta(seconds=30),
}

def ingest_order_telemetry(**context):
    print("Ingesting execution reports from matching engine...")
    return {"trades_count": 8940, "p99_latency_ms": 1.4}

def verify_risk_limits(**context):
    print("Verifying VaR (Value at Risk) and exposure per asset symbol...")
    return {"exposure_status": "WITHIN_LIMITS"}

def export_audit_log(**context):
    print("Logging encrypted trade ledger to audit compliance store...")
    return "COMPLIANCE_OK"

with DAG(
    dag_id="${dagId}",
    default_args=default_args,
    description="${description || 'Trading Telemetry & Risk Check'}",
    schedule_interval="${schedule}",
    start_date=datetime(2026, 1, 1),
    catchup=False,
    tags=${JSON.stringify(tags)},
) as dag:

    t1 = PythonOperator(task_id="ingest_order_telemetry", python_callable=ingest_order_telemetry)
    t2 = PythonOperator(task_id="verify_risk_limits", python_callable=verify_risk_limits)
    t3 = PythonOperator(task_id="export_audit_log", python_callable=export_audit_log)

    t1 >> t2 >> t3
`
  }
];

export function PipelinesManagementPage({ timeRange = "1h" }: { timeRange?: string }) {
  const { activeTenantId } = useAuth();
  // Navigation tabs inside Pipelines page
  const [activeTab, setActiveTab] = useState<"manage" | "studio" | "airflow_live">("manage");
  
  // Data states
  const [liveDags, setLiveDags] = useState<AirflowLiveDag[]>([]);
  const [dagMetrics, setDagMetrics] = useState<AirflowDag[]>([]);
  const [health, setHealth] = useState<{ status: string; webserver?: string; scheduler?: string } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterState, setFilterState] = useState<"all" | "active" | "paused">("all");
  
  // Action states
  const [selectedDagId, setSelectedDagId] = useState<string | null>(null);
  const [dagRuns, setDagRuns] = useState<AirflowDagRun[]>([]);
  const [runsLoading, setRunsLoading] = useState<boolean>(false);
  const [triggeringDagId, setTriggeringDagId] = useState<string | null>(null);
  const [togglingDagId, setTogglingDagId] = useState<string | null>(null);
  const [triggerModalDag, setTriggerModalDag] = useState<AirflowLiveDag | null>(null);
  const [triggerConf, setTriggerConf] = useState<string>("{\n  \"batch_date\": \"2026-09-29\",\n  \"run_mode\": \"prod\"\n}");
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  // Airflow Embedded View Sub-tab
  const [airflowViewTab, setAirflowViewTab] = useState<string>("grid");

  // Studio / Creator States
  const [selectedTemplate, setSelectedTemplate] = useState<PipelineTemplate>(PIPELINE_TEMPLATES[0]);
  const [creatorDagId, setCreatorDagId] = useState<string>(PIPELINE_TEMPLATES[0].defaultDagId);
  const [creatorSchedule, setCreatorSchedule] = useState<string>(PIPELINE_TEMPLATES[0].defaultSchedule);
  const [creatorOwner, setCreatorOwner] = useState<string>("airflow");
  const [creatorDescription, setCreatorDescription] = useState<string>(PIPELINE_TEMPLATES[0].description);
  const [creatorTags, setCreatorTags] = useState<string>(PIPELINE_TEMPLATES[0].defaultTags.join(", "));
  const [generatedCode, setGeneratedCode] = useState<string>("");
  const [codeEdited, setCodeEdited] = useState<boolean>(false);
  const [deploying, setDeploying] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  const showToast = (type: "success" | "error" | "info", text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 5000);
  };

  // Fetch telemetry & Airflow DAGs
  const fetchPipelinesData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [dagsRes, healthRes, metricsRes] = await Promise.allSettled([
        metricsApi.getAirflowLiveDags(),
        metricsApi.getAirflowHealth(),
        metricsApi.getAirflowDags(timeRange),
      ]);

      if (dagsRes.status === "fulfilled" && dagsRes.value.dags) {
        setLiveDags(dagsRes.value.dags);
        if (!selectedDagId && dagsRes.value.dags.length > 0) {
          setSelectedDagId(dagsRes.value.dags[0].dag_id);
        }
      }

      if (healthRes.status === "fulfilled") {
        setHealth(healthRes.value);
      }

      if (metricsRes.status === "fulfilled" && Array.isArray(metricsRes.value)) {
        setDagMetrics(metricsRes.value);
      }
    } catch (err: any) {
      console.error("Error fetching pipeline data:", err);
      setError(err.message || "Failed to communicate with Airflow Control Plane");
    } finally {
      setLoading(false);
    }
  }, [timeRange, selectedDagId]);

  useEffect(() => {
    // Clear data when switching organizations
    setLiveDags([]);
    setDagMetrics([]);
    setHealth(null);
    setSelectedDagId(null);
    setDagRuns([]);
    fetchPipelinesData();
  }, [activeTenantId]);

  useEffect(() => {
    const interval = setInterval(fetchPipelinesData, 20000);
    return () => clearInterval(interval);
  }, [fetchPipelinesData]);

  // Update generated code when creator inputs change
  useEffect(() => {
    if (!codeEdited) {
      const tagsArray = creatorTags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      const code = selectedTemplate.generateCode({
        dagId: creatorDagId,
        schedule: creatorSchedule,
        owner: creatorOwner,
        description: creatorDescription,
        tags: tagsArray,
      });
      setGeneratedCode(code);
    }
  }, [selectedTemplate, creatorDagId, creatorSchedule, creatorOwner, creatorDescription, creatorTags, codeEdited]);

  // Handle template selection
  const handleSelectTemplate = (tmpl: PipelineTemplate) => {
    setSelectedTemplate(tmpl);
    setCreatorDagId(tmpl.defaultDagId);
    setCreatorSchedule(tmpl.defaultSchedule);
    setCreatorDescription(tmpl.description);
    setCreatorTags(tmpl.defaultTags.join(", "));
    setCodeEdited(false);
  };

  // Fetch DAG runs when a DAG is selected
  const fetchDagRuns = useCallback(async (dagId: string) => {
    try {
      setRunsLoading(true);
      const data = await metricsApi.getAirflowDagRuns(dagId, 10);
      setDagRuns(data.dag_runs || []);
    } catch (err: any) {
      console.error("Failed to load DAG runs:", err);
    } finally {
      setRunsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedDagId) {
      fetchDagRuns(selectedDagId);
    }
  }, [selectedDagId, fetchDagRuns]);

  // Toggle DAG Pause
  const handleTogglePause = async (dag: AirflowLiveDag, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const newPaused = !dag.is_paused;
    setTogglingDagId(dag.dag_id);
    try {
      await metricsApi.toggleAirflowDagPause(dag.dag_id, newPaused);
      setLiveDags((prev) =>
        prev.map((d) => (d.dag_id === dag.dag_id ? { ...d, is_paused: newPaused } : d))
      );
      showToast("success", `Pipeline '${dag.dag_id}' is now ${newPaused ? "paused" : "active / unpaused"}.`);
    } catch (err: any) {
      showToast("error", `Failed to toggle pause: ${err.message}`);
    } finally {
      setTogglingDagId(null);
    }
  };

  // Trigger DAG Run
  const handleTriggerRun = async (dagId: string, confJson?: string) => {
    setTriggeringDagId(dagId);
    try {
      let parsedConf = {};
      if (confJson) {
        try {
          parsedConf = JSON.parse(confJson);
        } catch {
          throw new Error("Invalid JSON in configuration payload");
        }
      }
      await metricsApi.triggerAirflowDag(dagId, parsedConf);
      showToast("success", `🚀 Successfully triggered execution for pipeline '${dagId}'!`);
      setTriggerModalDag(null);
      if (selectedDagId === dagId) {
        setTimeout(() => fetchDagRuns(dagId), 1500);
      }
    } catch (err: any) {
      showToast("error", `Failed to trigger pipeline: ${err.message}`);
    } finally {
      setTriggeringDagId(null);
    }
  };

  // Deploy DAG from Studio
  const handleDeployDag = async () => {
    if (!creatorDagId.trim()) {
      showToast("error", "DAG ID cannot be empty");
      return;
    }
    setDeploying(true);
    try {
      const filename = `${creatorDagId.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase()}.py`;
      const res = await metricsApi.deployAirflowDag(creatorDagId, filename, generatedCode);
      showToast("success", `✅ Deployed '${creatorDagId}' to Airflow! It will appear in active pipelines.`);
      setActiveTab("manage");
      setTimeout(fetchPipelinesData, 2000);
    } catch (err: any) {
      showToast("error", `Deployment failed: ${err.message}`);
    } finally {
      setDeploying(false);
    }
  };

  // Merge live DAGs with metrics
  const combinedPipelines = liveDags.map((live) => {
    const metric = dagMetrics.find((m) => m.dag_id === live.dag_id);
    return {
      ...live,
      success_rate: metric?.success_rate ?? (live.is_active && !live.is_paused ? 100 : 0),
      total_runs: metric?.total_runs ?? 0,
      success_count: metric?.success_count ?? 0,
      failure_count: metric?.failure_count ?? 0,
    };
  });

  const filteredPipelines = combinedPipelines.filter((p) => {
    const matchesSearch =
      p.dag_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.tags && p.tags.some((t) => t.name.toLowerCase().includes(searchQuery.toLowerCase())));
    if (!matchesSearch) return false;
    if (filterState === "active") return !p.is_paused;
    if (filterState === "paused") return p.is_paused;
    return true;
  });

  const totalPipelines = liveDags.length;
  const activePipelinesCount = liveDags.filter((d) => !d.is_paused).length;
  const pausedPipelinesCount = liveDags.filter((d) => d.is_paused).length;
  const isAirflowConnected = health?.status === "healthy" || health?.webserver === "healthy";

  const selectedPipelineObj = combinedPipelines.find((p) => p.dag_id === selectedDagId);

  return (
    <div className="px-8 pb-12 pt-6 flex flex-col min-h-screen space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl border text-[13px] font-medium transition-all transform animate-in slide-in-from-bottom-5 ${
            toastMessage.type === "success"
              ? "bg-emerald-950/90 text-emerald-200 border-emerald-500/40 backdrop-blur-md"
              : toastMessage.type === "error"
              ? "bg-rose-950/90 text-rose-200 border-rose-500/40 backdrop-blur-md"
              : "bg-blue-950/90 text-blue-200 border-blue-500/40 backdrop-blur-md"
          }`}
        >
          {toastMessage.type === "success" && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
          {toastMessage.type === "error" && <XCircle className="w-5 h-5 text-rose-400 shrink-0" />}
          {toastMessage.type === "info" && <Info className="w-5 h-5 text-blue-400 shrink-0" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <GitBranch className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-[22px] font-bold text-text-primary tracking-tight">
                Data Pipelines & Orchestration
              </h1>
              <p className="text-[13px] text-text-muted mt-0.5">
                Design, deploy, manage, and monitor automated Apache Airflow data workflows across your platform.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => setActiveTab("studio")}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white text-[13px] font-medium shadow-md shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            Create Pipeline
          </button>

          <a
            href="http://localhost:8080"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-surface-elevated hover:bg-surface border border-border text-text-secondary hover:text-text-primary text-[13px] font-medium transition-colors"
            title="Open native Airflow Webserver (User: admin | Pass: Niraj@31 / admin)"
          >
            <ExternalLink className="w-4 h-4 text-text-muted" />
            Open Airflow UI
          </a>

          <button
            onClick={() => {
              fetchPipelinesData();
              if (selectedDagId) fetchDagRuns(selectedDagId);
            }}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-elevated hover:bg-surface border border-border text-text-muted hover:text-text-primary text-[13px] transition-colors"
            title="Refresh DAGs and telemetry"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-primary" : ""}`} />
          </button>
        </div>
      </div>

      {/* Top Telemetry KPI Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Total Pipelines */}
        <div className="bg-surface border border-border rounded-xl p-4 flex flex-col justify-between relative overflow-hidden group hover:border-border/80 transition-all">
          <div className="flex items-center justify-between text-text-muted text-[12px] font-medium">
            <span>Total Pipelines</span>
            <GitBranch className="w-4 h-4 text-primary/70" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-[24px] font-bold text-text-primary">{totalPipelines}</span>
            <span className="text-[11px] text-text-muted">Airflow DAGs</span>
          </div>
          <div className="mt-2 text-[11px] text-text-muted flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>{activePipelinesCount} active</span>
            <span className="text-text-muted/60">•</span>
            <span>{pausedPipelinesCount} paused</span>
          </div>
        </div>

        {/* Airflow Connection */}
        <div className="bg-surface border border-border rounded-xl p-4 flex flex-col justify-between relative overflow-hidden group hover:border-border/80 transition-all">
          <div className="flex items-center justify-between text-text-muted text-[12px] font-medium">
            <span>Airflow Engine</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isAirflowConnected ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
              }`}
            />
            <span className="text-[16px] font-semibold text-text-primary">
              {isAirflowConnected ? "Connected (v2.10)" : "Connecting..."}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-text-muted truncate">
            Endpoint: <span className="font-mono text-text-secondary">localhost:8080</span>
          </div>
        </div>

        {/* Pipeline Execution Health */}
        <div className="bg-surface border border-border rounded-xl p-4 flex flex-col justify-between relative overflow-hidden group hover:border-border/80 transition-all">
          <div className="flex items-center justify-between text-text-muted text-[12px] font-medium">
            <span>Execution Success Rate</span>
            <ShieldCheck className="w-4 h-4 text-primary/70" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            {(() => {
              const totalR = combinedPipelines.reduce((s, p) => s + (p.total_runs || 0), 0);
              const successR = combinedPipelines.reduce((s, p) => s + (p.success_count || 0), 0);
              const rate = totalR > 0 ? ((successR / totalR) * 100).toFixed(1) : null;
              return (
                <>
                  <span className={`text-[24px] font-bold ${rate !== null ? "text-emerald-400" : "text-text-muted"}`}>
                    {rate !== null ? `${rate}%` : "—"}
                  </span>
                  <span className="text-[11px] text-text-muted">{rate !== null ? "Last 24h" : "No data yet"}</span>
                </>
              );
            })()}
          </div>
          <div className="mt-2 w-full bg-surface-elevated rounded-full h-1.5 overflow-hidden">
            {(() => {
              const totalR = combinedPipelines.reduce((s, p) => s + (p.total_runs || 0), 0);
              const successR = combinedPipelines.reduce((s, p) => s + (p.success_count || 0), 0);
              const pct = totalR > 0 ? (successR / totalR) * 100 : 0;
              return <div className="bg-emerald-500 h-full rounded-full transition-all" style={{ width: `${pct}%` }} />;
            })()}
          </div>
        </div>

        {/* Quick Trigger Preset */}
        <div className="bg-surface border border-border rounded-xl p-4 flex flex-col justify-between relative overflow-hidden group hover:border-border/80 transition-all">
          <div className="flex items-center justify-between text-text-muted text-[12px] font-medium">
            <span>Active Orchestrator</span>
            <Sparkles className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2">
            <span className="text-[15px] font-semibold text-text-primary">Celery Executor</span>
            <p className="text-[11px] text-text-muted mt-0.5">PostgreSQL + Redis Broker</p>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px]">
            <span className="text-text-muted">Concurrency</span>
            <span className="font-mono text-primary font-medium">16 tasks/run</span>
          </div>
        </div>
      </div>

      {/* Top Navigation Tabs */}
      <div className="flex items-center gap-1 border-b border-border">
        <button
          onClick={() => setActiveTab("manage")}
          className={`flex items-center gap-2 px-5 py-3 text-[13px] font-semibold transition-all border-b-2 ${
            activeTab === "manage"
              ? "border-primary text-primary bg-primary/5"
              : "border-transparent text-text-muted hover:text-text-primary hover:bg-surface-elevated/50"
          }`}
        >
          <Layers className="w-4 h-4" />
          Manage & Monitor Pipelines
          <span className="px-2 py-0.5 text-[10px] rounded-full bg-surface-elevated border border-border text-text-secondary">
            {liveDags.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("studio")}
          className={`flex items-center gap-2 px-5 py-3 text-[13px] font-semibold transition-all border-b-2 ${
            activeTab === "studio"
              ? "border-primary text-primary bg-primary/5"
              : "border-transparent text-text-muted hover:text-text-primary hover:bg-surface-elevated/50"
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-400" />
          Pipeline Creator & Templates
        </button>

        <button
          onClick={() => setActiveTab("airflow_live")}
          className={`flex items-center gap-2 px-5 py-3 text-[13px] font-semibold transition-all border-b-2 ${
            activeTab === "airflow_live"
              ? "border-primary text-primary bg-primary/5"
              : "border-transparent text-text-muted hover:text-text-primary hover:bg-surface-elevated/50"
          }`}
        >
          <Activity className="w-4 h-4 text-emerald-400" />
          Airflow Live Console
        </button>
      </div>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* TAB 1: MANAGE & MONITOR PIPELINES */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {activeTab === "manage" && (
        <div className="space-y-6">
          {/* Search, Filter, and Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-surface border border-border rounded-xl p-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by DAG name, description, or tag..."
                className="w-full pl-9 pr-4 py-1.5 text-[13px] rounded-lg border border-border bg-surface-elevated text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/50"
              />
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-lg bg-surface-elevated border border-border p-0.5 text-[12px]">
                <button
                  onClick={() => setFilterState("all")}
                  className={`px-3 py-1 rounded-md font-medium transition-colors ${
                    filterState === "all" ? "bg-primary text-white" : "text-text-muted hover:text-text-primary"
                  }`}
                >
                  All ({combinedPipelines.length})
                </button>
                <button
                  onClick={() => setFilterState("active")}
                  className={`px-3 py-1 rounded-md font-medium transition-colors ${
                    filterState === "active" ? "bg-primary text-white" : "text-text-muted hover:text-text-primary"
                  }`}
                >
                  Active ({activePipelinesCount})
                </button>
                <button
                  onClick={() => setFilterState("paused")}
                  className={`px-3 py-1 rounded-md font-medium transition-colors ${
                    filterState === "paused" ? "bg-primary text-white" : "text-text-muted hover:text-text-primary"
                  }`}
                >
                  Paused ({pausedPipelinesCount})
                </button>
              </div>
            </div>
          </div>

          {/* Main Pipelines Master-Detail View */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Pipelines List (Left Column) */}
            <div className="lg:col-span-6 flex flex-col gap-3">
              {loading && liveDags.length === 0 ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-28 rounded-xl bg-surface border border-border animate-pulse" />
                  ))}
                </div>
              ) : filteredPipelines.length === 0 ? (
                <div className="bg-surface border border-border rounded-xl p-8 text-center text-text-muted">
                  <GitBranch className="w-10 h-10 mx-auto opacity-30 mb-3" />
                  <p className="font-medium text-[14px] text-text-primary">No pipelines found</p>
                  <p className="text-[12px] mt-1">Try modifying your search or create a new pipeline in Studio.</p>
                  <button
                    onClick={() => setActiveTab("studio")}
                    className="mt-4 px-4 py-2 rounded-lg bg-primary text-white text-[12px] font-medium"
                  >
                    Open Pipeline Creator
                  </button>
                </div>
              ) : (
                filteredPipelines.map((pipeline) => {
                  const isSelected = selectedDagId === pipeline.dag_id;
                  const isPaused = pipeline.is_paused;
                  const isToggling = togglingDagId === pipeline.dag_id;
                  const isTriggering = triggeringDagId === pipeline.dag_id;

                  return (
                    <div
                      key={pipeline.dag_id}
                      onClick={() => setSelectedDagId(pipeline.dag_id)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer relative group ${
                        isSelected
                          ? "bg-primary/5 border-primary/50 shadow-md ring-1 ring-primary/20"
                          : "bg-surface border-border hover:bg-surface-elevated hover:border-border/80"
                      }`}
                    >
                      {/* Top row: Title + Pause Toggle + Run */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Pause / Play Quick Switch */}
                          <button
                            onClick={(e) => handleTogglePause(pipeline, e)}
                            disabled={isToggling}
                            className={`p-2 rounded-lg border transition-all shrink-0 ${
                              isPaused
                                ? "bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20"
                                : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
                            }`}
                            title={isPaused ? "Click to Unpause pipeline" : "Click to Pause pipeline"}
                          >
                            {isToggling ? (
                              <RefreshCw className="w-4 h-4 animate-spin text-primary" />
                            ) : isPaused ? (
                              <Pause className="w-4 h-4" />
                            ) : (
                              <Play className="w-4 h-4 fill-emerald-400/20" />
                            )}
                          </button>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-semibold text-[14px] text-text-primary truncate">
                                {pipeline.dag_id}
                              </span>
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${
                                  isPaused
                                    ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                    : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                }`}
                              >
                                {isPaused ? "PAUSED" : "ACTIVE"}
                              </span>
                            </div>
                            <p className="text-[12px] text-text-muted truncate mt-0.5">
                              {pipeline.timetable_description ||
                                (typeof pipeline.schedule_interval === "object"
                                  ? pipeline.schedule_interval?.value
                                  : pipeline.schedule_interval) ||
                                "Manual trigger only"}
                            </p>
                          </div>
                        </div>

                        {/* Quick Trigger Button */}
                        <div className="flex items-center gap-2 shrink-0">
                          {pipeline.dag_id === "recon_settlement_job" && (
                            <div onClick={(e) => e.stopPropagation()}>
                              <RcaButton incidentType="airflow_dag_failure" identifier={pipeline.dag_id} />
                            </div>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTriggerRun(pipeline.dag_id);
                            }}
                            disabled={isTriggering}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 transition-all hover:scale-[1.03] disabled:opacity-50"
                            title="Trigger execution immediately"
                          >
                            {isTriggering ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Zap className="w-3.5 h-3.5 fill-primary" />
                            )}
                            Run
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setTriggerModalDag(pipeline);
                            }}
                            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-elevated border border-transparent hover:border-border transition-colors"
                            title="Trigger with custom JSON config"
                          >
                            <Sliders className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Tags & Meta Row */}
                      <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between flex-wrap gap-2 text-[11px] text-text-muted">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {pipeline.tags && pipeline.tags.length > 0 ? (
                            pipeline.tags.map((t) => (
                              <span
                                key={t.name}
                                className="px-2 py-0.5 rounded-md bg-surface-elevated border border-border text-text-secondary text-[10px]"
                              >
                                #{t.name}
                              </span>
                            ))
                          ) : (
                            <span className="text-[10px] text-text-muted">No tags</span>
                          )}
                        </div>

                        <div className="flex items-center gap-3">
                          <div>
                            Success:{" "}
                            <span
                              className={`font-semibold ${
                                pipeline.success_rate >= 90
                                  ? "text-emerald-400"
                                  : pipeline.success_rate >= 70
                                  ? "text-amber-400"
                                  : "text-rose-400"
                              }`}
                            >
                              {pipeline.success_rate}%
                            </span>
                          </div>
                          <div className="text-text-muted">
                            Total Runs: <span className="font-semibold text-text-primary">{pipeline.total_runs}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Pipeline Inspector Panel (Right Column) */}
            <div className="lg:col-span-6 bg-surface border border-border rounded-xl p-5 shadow-sm min-h-[500px] flex flex-col">
              {selectedPipelineObj ? (
                <div className="space-y-5 flex-1 flex flex-col">
                  {/* Selected Pipeline Header */}
                  <div className="flex items-start justify-between border-b border-border pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-mono font-bold text-[16px] text-text-primary">
                          {selectedPipelineObj.dag_id}
                        </h3>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                            selectedPipelineObj.is_paused
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                              : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          }`}
                        >
                          {selectedPipelineObj.is_paused ? "PAUSED" : "ACTIVE"}
                        </span>
                      </div>
                      <p className="text-[12px] text-text-muted mt-1">
                        {selectedPipelineObj.fileloc || `services/airflow/dags/${selectedPipelineObj.dag_id}.py`}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <a
                        href={`http://localhost:8080/dags/${selectedPipelineObj.dag_id}/grid`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-elevated hover:bg-surface border border-border text-[12px] font-medium text-text-secondary hover:text-text-primary transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Airflow View
                      </a>
                    </div>
                  </div>

                  {/* DAG Metadata Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="p-3 rounded-lg bg-surface-elevated border border-border">
                      <span className="text-[11px] text-text-muted block">Schedule</span>
                      <span className="text-[13px] font-mono font-semibold text-text-primary">
                        {selectedPipelineObj.timetable_description || "Manual"}
                      </span>
                    </div>

                    <div className="p-3 rounded-lg bg-surface-elevated border border-border">
                      <span className="text-[11px] text-text-muted block">Next Scheduled Run</span>
                      <span className="text-[12px] font-mono text-text-secondary truncate block">
                        {selectedPipelineObj.next_dagrun
                          ? new Date(selectedPipelineObj.next_dagrun).toLocaleTimeString()
                          : "None (Manual)"}
                      </span>
                    </div>

                    <div className="p-3 rounded-lg bg-surface-elevated border border-border">
                      <span className="text-[11px] text-text-muted block">Owners</span>
                      <span className="text-[13px] font-semibold text-primary">
                        {selectedPipelineObj.owners ? selectedPipelineObj.owners.join(", ") : "airflow"}
                      </span>
                    </div>
                  </div>

                  {/* Recent Execution Runs Table */}
                  <div className="flex-1 flex flex-col">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-[13px] text-text-primary flex items-center gap-2">
                        <Clock className="w-4 h-4 text-primary" />
                        Recent Pipeline Runs
                      </h4>
                      <button
                        onClick={() => fetchDagRuns(selectedPipelineObj.dag_id)}
                        className="text-[11px] text-primary hover:underline flex items-center gap-1"
                      >
                        <RefreshCw className={`w-3 h-3 ${runsLoading ? "animate-spin" : ""}`} />
                        Refresh Runs
                      </button>
                    </div>

                    <div className="flex-1 border border-border rounded-lg overflow-hidden bg-surface-elevated">
                      {runsLoading && dagRuns.length === 0 ? (
                        <div className="p-6 text-center text-text-muted text-[12px]">Loading execution history...</div>
                      ) : dagRuns.length === 0 ? (
                        <div className="p-8 text-center text-text-muted text-[12px]">
                          No recent execution runs recorded for this pipeline.
                          <div className="mt-3">
                            <button
                              onClick={() => handleTriggerRun(selectedPipelineObj.dag_id)}
                              className="px-3 py-1.5 rounded-lg bg-primary text-white text-[11px] font-medium"
                            >
                              Trigger First Run Now
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="overflow-x-auto max-h-[320px]">
                          <table className="w-full text-[12px]">
                            <thead>
                              <tr className="border-b border-border bg-surface text-text-muted font-medium">
                                <th className="text-left px-3 py-2">Run ID / Type</th>
                                <th className="text-left px-3 py-2">State</th>
                                <th className="text-left px-3 py-2">Start Time</th>
                                <th className="text-right px-3 py-2">Duration</th>
                              </tr>
                            </thead>
                            <tbody>
                              {dagRuns.map((run) => {
                                const isSuccess = run.state === "success";
                                const isRunning = run.state === "running" || run.state === "queued";
                                const isFailed = run.state === "failed";
                                const startTime = run.start_date ? new Date(run.start_date) : null;
                                const endTime = run.end_date ? new Date(run.end_date) : null;
                                const durationSec =
                                  startTime && endTime ? Math.round((endTime.getTime() - startTime.getTime()) / 1000) : "—";

                                return (
                                  <tr
                                    key={run.dag_run_id}
                                    className="border-b border-border/50 hover:bg-surface/50 transition-colors font-mono"
                                  >
                                    <td className="px-3 py-2 truncate max-w-[180px]" title={run.dag_run_id}>
                                      <span className="text-text-primary text-[11px] block truncate font-medium">
                                        {run.dag_run_id}
                                      </span>
                                      <span className="text-[10px] text-text-muted uppercase">
                                        {run.run_type || "manual"}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2">
                                      <span
                                        className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded border uppercase ${
                                          isSuccess
                                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                            : isRunning
                                            ? "bg-blue-500/10 text-blue-400 border-blue-500/20 animate-pulse"
                                            : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                                        }`}
                                      >
                                        {isSuccess && <CheckCircle2 className="w-3 h-3" />}
                                        {isRunning && <RefreshCw className="w-3 h-3 animate-spin" />}
                                        {isFailed && <XCircle className="w-3 h-3" />}
                                        {run.state}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2 text-[11px] text-text-secondary">
                                      {startTime ? startTime.toLocaleTimeString() : "—"}
                                    </td>
                                    <td className="px-3 py-2 text-right text-[11px] text-text-secondary">
                                      {durationSec !== "—" ? `${durationSec}s` : "—"}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Direct Actions Footer */}
                  <div className="pt-2 flex items-center justify-between border-t border-border/60">
                    <button
                      onClick={() => handleTogglePause(selectedPipelineObj)}
                      className="px-3 py-1.5 rounded-lg border border-border text-[12px] font-medium hover:bg-surface-elevated transition-colors"
                    >
                      {selectedPipelineObj.is_paused ? "Unpause Pipeline" : "Pause Pipeline"}
                    </button>

                    <button
                      onClick={() => handleTriggerRun(selectedPipelineObj.dag_id)}
                      disabled={triggeringDagId === selectedPipelineObj.dag_id}
                      className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-[12px] font-semibold transition-all shadow-sm"
                    >
                      <Zap className="w-4 h-4 fill-white" />
                      Trigger Run Now
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-text-muted">
                  <GitBranch className="w-12 h-12 opacity-20 mb-3" />
                  <p className="font-semibold text-[14px] text-text-primary">No Pipeline Selected</p>
                  <p className="text-[12px] text-center max-w-xs mt-1">
                    Select a pipeline on the left to view detailed execution logs, schedule details, and trigger controls.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* TAB 2: PIPELINE CREATOR & STUDIO */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {activeTab === "studio" && (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-surface border border-primary/20 rounded-xl p-6">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-primary flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Visual Airflow DAG Builder
                </span>
                <h2 className="text-[20px] font-bold text-text-primary mt-1">
                  Create & Deploy New Data Pipelines
                </h2>
                <p className="text-[13px] text-text-muted mt-1 max-w-2xl">
                  Select a production-ready template or build a custom DAG. Your pipeline will be generated in compliant
                  Python and directly deployed into the Airflow DAGs repository.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleDeployDag}
                  disabled={deploying}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-[13px] font-semibold shadow-lg shadow-primary/25 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                >
                  {deploying ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Deploy to Airflow
                </button>
              </div>
            </div>
          </div>

          {/* Template Gallery */}
          <div>
            <h3 className="text-[14px] font-semibold text-text-primary mb-3 flex items-center gap-2">
              <Box className="w-4 h-4 text-primary" />
              1. Choose a Pipeline Template
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {PIPELINE_TEMPLATES.map((tmpl) => {
                const isSelected = selectedTemplate.id === tmpl.id;
                return (
                  <div
                    key={tmpl.id}
                    onClick={() => handleSelectTemplate(tmpl)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                      isSelected
                        ? "bg-primary/10 border-primary shadow-md ring-1 ring-primary/30"
                        : "bg-surface border-border hover:bg-surface-elevated hover:border-border/80"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-surface-elevated border border-border text-primary">
                          {tmpl.category}
                        </span>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-primary" />}
                      </div>
                      <h4 className="font-semibold text-[14px] text-text-primary">{tmpl.name}</h4>
                      <p className="text-[12px] text-text-muted mt-1 leading-relaxed">{tmpl.description}</p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between text-[11px] text-text-muted">
                      <span className="font-mono">{tmpl.defaultSchedule}</span>
                      <span className="text-primary font-medium flex items-center gap-1">
                        Use Template <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pipeline Configuration Form + Live Code Generator */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Form Configurator (Left 5 cols) */}
            <div className="lg:col-span-5 bg-surface border border-border rounded-xl p-5 space-y-4">
              <h3 className="text-[14px] font-semibold text-text-primary flex items-center gap-2 pb-2 border-b border-border">
                <Settings2 className="w-4 h-4 text-primary" />
                2. Configure Pipeline Parameters
              </h3>

              {/* DAG ID */}
              <div>
                <label className="block text-[12px] font-medium text-text-secondary mb-1">
                  DAG ID / Identifier <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={creatorDagId}
                  onChange={(e) => {
                    setCreatorDagId(e.target.value);
                    setCodeEdited(false);
                  }}
                  placeholder="e.g. daily_trades_etl"
                  className="w-full px-3 py-2 rounded-lg bg-surface-elevated border border-border text-[13px] font-mono text-text-primary focus:outline-none focus:border-primary"
                />
                <span className="text-[10px] text-text-muted mt-1 block">
                  Will be saved as <code className="text-primary">{creatorDagId.toLowerCase()}.py</code> in Airflow DAGs.
                </span>
              </div>

              {/* Schedule */}
              <div>
                <label className="block text-[12px] font-medium text-text-secondary mb-1">
                  Schedule Interval (Cron expression or Preset)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={creatorSchedule}
                    onChange={(e) => {
                      setCreatorSchedule(e.target.value);
                      setCodeEdited(false);
                    }}
                    placeholder="e.g. 0 */2 * * *"
                    className="flex-1 px-3 py-2 rounded-lg bg-surface-elevated border border-border text-[13px] font-mono text-text-primary focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="flex items-center gap-1.5 mt-2 flex-wrap text-[11px]">
                  <span className="text-text-muted">Presets:</span>
                  {["@hourly", "@daily", "*/5 * * * *", "0 */4 * * *", "None"].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => {
                        setCreatorSchedule(p);
                        setCodeEdited(false);
                      }}
                      className="px-2 py-0.5 rounded bg-surface-elevated hover:bg-primary/20 border border-border hover:border-primary/40 text-[10px] font-mono text-text-secondary transition-colors"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Owner */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-text-secondary mb-1">Owner</label>
                  <input
                    type="text"
                    value={creatorOwner}
                    onChange={(e) => {
                      setCreatorOwner(e.target.value);
                      setCodeEdited(false);
                    }}
                    className="w-full px-3 py-2 rounded-lg bg-surface-elevated border border-border text-[13px] text-text-primary focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-text-secondary mb-1">Tags (Comma-sep)</label>
                  <input
                    type="text"
                    value={creatorTags}
                    onChange={(e) => {
                      setCreatorTags(e.target.value);
                      setCodeEdited(false);
                    }}
                    placeholder="etl, postgres, daily"
                    className="w-full px-3 py-2 rounded-lg bg-surface-elevated border border-border text-[13px] text-text-primary focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-[12px] font-medium text-text-secondary mb-1">Description</label>
                <textarea
                  rows={2}
                  value={creatorDescription}
                  onChange={(e) => {
                    setCreatorDescription(e.target.value);
                    setCodeEdited(false);
                  }}
                  className="w-full px-3 py-2 rounded-lg bg-surface-elevated border border-border text-[13px] text-text-primary focus:outline-none focus:border-primary resize-none"
                />
              </div>

              <div className="pt-2">
                <button
                  onClick={handleDeployDag}
                  disabled={deploying}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-[13px] font-semibold shadow-md shadow-primary/20 transition-all disabled:opacity-50"
                >
                  {deploying ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Deploy Pipeline to Airflow
                </button>
              </div>
            </div>

            {/* Generated Python DAG Code (Right 7 cols) */}
            <div className="lg:col-span-7 bg-[#0d1117] border border-border rounded-xl overflow-hidden flex flex-col shadow-md min-h-[480px]">
              <div className="px-4 py-2.5 bg-[#161b22] border-b border-border/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-emerald-400" />
                  <span className="font-mono text-[12px] text-text-primary font-semibold">
                    {creatorDagId.toLowerCase()}.py
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                    Airflow 2.10
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(generatedCode);
                      setCopiedCode(true);
                      setTimeout(() => setCopiedCode(false), 2000);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#21262d] hover:bg-[#30363d] text-[11px] text-text-secondary hover:text-white transition-colors border border-border"
                  >
                    {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    {copiedCode ? "Copied" : "Copy Code"}
                  </button>
                </div>
              </div>

              <div className="p-4 flex-1 font-mono text-[12px] text-gray-300 overflow-x-auto">
                <textarea
                  value={generatedCode}
                  onChange={(e) => {
                    setGeneratedCode(e.target.value);
                    setCodeEdited(true);
                  }}
                  className="w-full h-full min-h-[400px] bg-transparent text-emerald-300 font-mono text-[12px] leading-relaxed resize-none focus:outline-none focus:ring-0 border-none"
                  spellCheck={false}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* TAB 3: AIRFLOW LIVE CONSOLE & FULL EMBED */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {activeTab === "airflow_live" && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex items-center justify-between bg-surface border border-border rounded-xl p-3 flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <span className="text-[13px] font-semibold text-text-primary">Live DAG Visualizer:</span>
              <select
                value={selectedDagId || ""}
                onChange={(e) => setSelectedDagId(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-surface-elevated border border-border text-[13px] font-mono text-text-primary focus:outline-none focus:border-primary"
              >
                {liveDags.map((d) => (
                  <option key={d.dag_id} value={d.dag_id}>
                    {d.dag_id} ({d.is_paused ? "Paused" : "Active"})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {[
                { id: "grid", label: "Grid & Runs", url: "grid" },
                { id: "graph", label: "Task Graph", url: "grid?tab=graph" },
                { id: "gantt", label: "Gantt Timeline", url: "grid?tab=gantt" },
                { id: "calendar", label: "Calendar", url: "grid?tab=calendar" },
                { id: "runDuration", label: "Run Duration", url: "grid?tab=run_duration" },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setAirflowViewTab(t.id)}
                  className={`px-3 py-1.5 text-[12px] font-medium rounded-lg transition-all ${
                    airflowViewTab === t.id
                      ? "bg-primary text-white shadow-sm"
                      : "bg-surface-elevated text-text-muted hover:text-text-primary hover:bg-surface"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div>
              <a
                href={`http://localhost:8080/dags/${selectedDagId || ""}/grid`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 text-[12px] font-medium transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Fullscreen UI
              </a>
            </div>
          </div>

          {/* Embedded Airflow Container */}
          <div className="w-full bg-surface border border-border rounded-xl overflow-hidden relative shadow-lg min-h-[750px]">
            {selectedDagId ? (
              <iframe
                key={`${selectedDagId}-${airflowViewTab}`}
                src={`http://localhost:8080/dags/${selectedDagId}/${
                  airflowViewTab === "graph"
                    ? "grid?tab=graph"
                    : airflowViewTab === "gantt"
                    ? "grid?tab=gantt"
                    : airflowViewTab === "calendar"
                    ? "grid?tab=calendar"
                    : airflowViewTab === "runDuration"
                    ? "grid?tab=run_duration"
                    : "grid"
                }`}
                className="w-full h-[750px] border-none"
                style={{ filter: "invert(0.9) hue-rotate(180deg) brightness(0.95)" }}
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
                title="Airflow Live Visualizer"
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-[600px] text-text-muted">
                <Activity className="w-12 h-12 opacity-20 mb-3" />
                <p className="font-semibold text-[15px] text-text-primary">Select a pipeline above</p>
                <p className="text-[13px] mt-1 text-center max-w-sm">
                  Embedded Airflow visualizer allows you to inspect real-time execution graphs and live logs.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* CUSTOM TRIGGER MODAL */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {triggerModalDag && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-[16px] text-text-primary">
                  Trigger Pipeline: {triggerModalDag.dag_id}
                </h3>
              </div>
              <button
                onClick={() => setTriggerModalDag(null)}
                className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-elevated"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-[12px] font-medium text-text-secondary mb-1">
                Execution Configuration JSON (Passed to <code className="text-primary">dag_run.conf</code>)
              </label>
              <textarea
                rows={6}
                value={triggerConf}
                onChange={(e) => setTriggerConf(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-surface-elevated border border-border font-mono text-[12px] text-emerald-300 focus:outline-none focus:border-primary resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setTriggerModalDag(null)}
                className="px-4 py-2 rounded-lg border border-border text-[13px] font-medium text-text-secondary hover:bg-surface-elevated"
              >
                Cancel
              </button>
              <button
                onClick={() => handleTriggerRun(triggerModalDag.dag_id, triggerConf)}
                disabled={triggeringDagId === triggerModalDag.dag_id}
                className="flex items-center gap-2 px-5 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white text-[13px] font-semibold shadow-md shadow-primary/25 disabled:opacity-50"
              >
                {triggeringDagId === triggerModalDag.dag_id ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4" />
                )}
                Trigger Execution
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
