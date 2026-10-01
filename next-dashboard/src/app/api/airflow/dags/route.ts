import { NextResponse } from "next/server";

// Decode JWT payload without verification (verification happens in FastAPI)
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = Buffer.from(parts[1], "base64url").toString("utf-8");
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

// Rich demo DAGs shown when the tenant is "demo" and Airflow is unreachable/empty
const DEMO_DAGS = [
  {
    dag_id: "correlated_trade_pipeline",
    dag_display_name: "Correlated Trade Pipeline",
    description: "End-to-end trade ingestion, enrichment, validation, and DWH load pipeline.",
    is_active: true,
    is_paused: false,
    has_import_errors: false,
    timetable_description: "Every hour",
    schedule_interval: { __type: "CronExpression", value: "0 * * * *" },
    next_dagrun: new Date(Date.now() + 28 * 60 * 1000).toISOString(),
    tags: [{ name: "demo" }, { name: "etl" }, { name: "trading" }],
    owners: ["data-platform-team"],
    max_active_runs: 3,
  },
  {
    dag_id: "sample_etl_pipeline",
    dag_display_name: "Sample ETL Pipeline",
    description: "Extracts, transforms, and loads business records from staging into the data warehouse.",
    is_active: true,
    is_paused: false,
    has_import_errors: false,
    timetable_description: "Every 4 hours",
    schedule_interval: { __type: "CronExpression", value: "0 */4 * * *" },
    next_dagrun: new Date(Date.now() + 95 * 60 * 1000).toISOString(),
    tags: [{ name: "demo" }, { name: "etl" }, { name: "postgres" }],
    owners: ["etl-team"],
    max_active_runs: 2,
  },
  {
    dag_id: "production_dwh_etl_pipeline",
    dag_display_name: "Production DWH ETL",
    description: "Production data warehouse pipeline: ingest → quality gate → transform → load.",
    is_active: true,
    is_paused: false,
    has_import_errors: false,
    timetable_description: "Daily at midnight",
    schedule_interval: { __type: "CronExpression", value: "0 0 * * *" },
    next_dagrun: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
    tags: [{ name: "demo" }, { name: "production" }, { name: "dwh" }],
    owners: ["data-engineering"],
    max_active_runs: 1,
  },
  {
    dag_id: "data_quality_checks",
    dag_display_name: "Data Quality Checks",
    description: "Runs automated schema validation, null checks, and referential integrity tests.",
    is_active: true,
    is_paused: false,
    has_import_errors: false,
    timetable_description: "Every 30 minutes",
    schedule_interval: { __type: "CronExpression", value: "*/30 * * * *" },
    next_dagrun: new Date(Date.now() + 12 * 60 * 1000).toISOString(),
    tags: [{ name: "demo" }, { name: "quality" }, { name: "monitoring" }],
    owners: ["data-quality-team"],
    max_active_runs: 5,
  },
  {
    dag_id: "ml_feature_pipeline",
    dag_display_name: "ML Feature Pipeline",
    description: "Computes and publishes ML features: VWAP, session counts, user embeddings.",
    is_active: true,
    is_paused: false,
    has_import_errors: false,
    timetable_description: "Every 6 hours",
    schedule_interval: { __type: "CronExpression", value: "0 */6 * * *" },
    next_dagrun: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    tags: [{ name: "demo" }, { name: "ml" }, { name: "feature-store" }],
    owners: ["ml-platform"],
    max_active_runs: 2,
  },
  {
    dag_id: "recon_settlement_job",
    dag_display_name: "Settlement Reconciliation",
    description: "Reconciles executed trades against settlement records. Currently has import errors.",
    is_active: true,
    is_paused: true,
    has_import_errors: false,
    timetable_description: "Daily at 06:00",
    schedule_interval: { __type: "CronExpression", value: "0 6 * * *" },
    next_dagrun: null,
    tags: [{ name: "demo" }, { name: "settlement" }, { name: "critical" }],
    owners: ["finance-engineering"],
    max_active_runs: 1,
  },
];

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization") || "";
  let tenantId: string | null = null;

  if (authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const payload = decodeJwtPayload(token);
    if (payload && typeof payload.tenant_id === "string") {
      tenantId = payload.tenant_id;
    }
  }

  // ── Try the live Airflow REST API ─────────────────────────────────────────
  try {
    const auth = Buffer.from("admin:Niraj@31").toString("base64");

    const res = await fetch("http://127.0.0.1:8080/api/v1/dags?limit=100", {
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: "application/json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(3000), // 3 s timeout so UI doesn't hang
    });

    if (res.ok) {
      const data = await res.json();
      const allDags: Array<{ tags?: { name: string }[] }> = data.dags || [];

      // For demo tenant: show ALL dags (or those tagged demo), for others filter strictly
      const filteredDags =
        tenantId === "demo"
          ? allDags.filter(
              (dag) =>
                !Array.isArray(dag.tags) || // untagged dags are visible to demo
                dag.tags.length === 0 ||
                dag.tags.some((t) => t.name === "demo" || t.name === tenantId)
            )
          : tenantId
          ? allDags.filter(
              (dag) =>
                Array.isArray(dag.tags) && dag.tags.some((t) => t.name === tenantId)
            )
          : [];

      // If Airflow is up but returns nothing for demo, fall back to our rich demo set
      if (filteredDags.length === 0 && tenantId === "demo") {
        return NextResponse.json({
          dags: DEMO_DAGS,
          total_entries: DEMO_DAGS.length,
        });
      }

      return NextResponse.json({
        ...data,
        dags: filteredDags,
        total_entries: filteredDags.length,
      });
    }
  } catch {
    // Airflow is not reachable — fall through to demo fallback below
  }

  // ── Demo fallback when Airflow is completely unreachable ──────────────────
  if (tenantId === "demo") {
    return NextResponse.json({
      dags: DEMO_DAGS,
      total_entries: DEMO_DAGS.length,
    });
  }

  // New / non-demo tenants see an empty list (clean slate)
  return NextResponse.json({ dags: [], total_entries: 0 });
}
