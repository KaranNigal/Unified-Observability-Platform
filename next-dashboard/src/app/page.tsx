"use client";

import React, { useState, useCallback, useEffect } from "react";
import {
  Activity,
  Database,
  Server,
  TrendingUp,
  AlertCircle,
  Clock,
  Home,
  GitBranch,
  Layers,
  Network,
  BarChart3,
  Bell,
  Settings,
  Search,
  ChevronDown,
  ArrowRight,
  Zap,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Wifi,
  WifiOff,
  FileText,
  PieChart,
  Key,
  Shield,
  Copy,
  Plus,
  Check,
  ExternalLink,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import Image from "next/image";
import { metricsApi, AirflowDag, PysparkJob, PrometheusAlert, ApiKeyItem, OnboardingConfig } from "@/lib/api";
import { usePolling } from "@/lib/usePolling";
import { TenantSwitcher } from "./components/TenantSwitcher";
import { NotificationBell } from "./components/NotificationBell";
import { useAuth } from "@/lib/auth-context";
import { PipelinesManagementPage } from "./components/PipelinesPage";
import { MetricsPage } from "./components/MetricsPage";

// ─── Pages ───────────────────────────────────────────────────────────────────
type Page =
  | "Overview"
  | "Pipelines"
  | "Airflow"
  | "Data Processing"
  | "Microservices"
  | "Trading Systems"
  | "Metrics"
  | "Grafana"
  | "Kibana"
  | "Alerts"
  | "Infrastructure"
  | "Logs"
  | "Traces"
  | "Settings";

// ─── SVG 7-Segment Clock Components ──────────────────────────────────────────
const DIGIT_MAP: Record<string, boolean[]> = {
  //  A      B      C      D      E      F      G
  '0': [true,  true,  true,  true,  true,  true,  false],
  '1': [false, true,  true,  false, false, false, false],
  '2': [true,  true,  false, true,  true,  false, true ],
  '3': [true,  true,  true,  true,  false, false, true ],
  '4': [false, true,  true,  false, false, true,  true ],
  '5': [true,  false, true,  true,  false, true,  true ],
  '6': [true,  false, true,  true,  true,  true,  true ],
  '7': [true,  true,  true,  false, false, false, false],
  '8': [true,  true,  true,  true,  true,  true,  true ],
  '9': [true,  true,  true,  true,  false, true,  true ],
  ' ': [false, false, false, false, false, false, false],
};

function SevenSegmentDigit({ digit }: { digit: string }) {
  const segments = DIGIT_MAP[digit] || DIGIT_MAP[' '];
  const onColor = "#ef4444";
  const offColor = "rgba(239, 68, 68, 0.1)";
  const stroke = 5;
  return (
    <svg width="18" height="34" viewBox="0 0 30 50" style={{ overflow: "visible" }} className="mx-0.5">
      <line x1="6" y1="4" x2="24" y2="4" stroke={segments[0] ? onColor : offColor} strokeWidth={stroke} strokeLinecap="round" />
      <line x1="26" y1="6" x2="26" y2="23" stroke={segments[1] ? onColor : offColor} strokeWidth={stroke} strokeLinecap="round" />
      <line x1="26" y1="27" x2="26" y2="44" stroke={segments[2] ? onColor : offColor} strokeWidth={stroke} strokeLinecap="round" />
      <line x1="6" y1="46" x2="24" y2="46" stroke={segments[3] ? onColor : offColor} strokeWidth={stroke} strokeLinecap="round" />
      <line x1="4" y1="27" x2="4" y2="44" stroke={segments[4] ? onColor : offColor} strokeWidth={stroke} strokeLinecap="round" />
      <line x1="4" y1="6" x2="4" y2="23" stroke={segments[5] ? onColor : offColor} strokeWidth={stroke} strokeLinecap="round" />
      <line x1="6" y1="25" x2="24" y2="25" stroke={segments[6] ? onColor : offColor} strokeWidth={stroke} strokeLinecap="round" />
    </svg>
  );
}

function SevenSegmentColon({ blink }: { blink: boolean }) {
  const onColor = "#ef4444";
  const offColor = "rgba(239, 68, 68, 0.1)";
  const color = blink ? onColor : offColor;
  return (
    <svg width="8" height="34" viewBox="0 0 14 50" className="mx-1">
      <circle cx="7" cy="16" r="3" fill={color} />
      <circle cx="7" cy="34" r="3" fill={color} />
    </svg>
  );
}

function DigitalClock({ time }: { time: Date | null }) {
  if (!time) return <div className="h-[44px] w-[160px]" />; 
  const h = time.getHours().toString().padStart(2, '0');
  const m = time.getMinutes().toString().padStart(2, '0');
  const s = time.getSeconds().toString().padStart(2, '0');
  const blink = time.getSeconds() % 2 === 0;
  
  return (
    <div className="flex items-center justify-center bg-black/80 px-4 py-2 rounded-lg border border-red-900/30 shadow-[inset_0_0_15px_rgba(0,0,0,0.8)]" style={{ filter: "drop-shadow(0 0 6px rgba(239, 68, 68, 0.3))" }}>
      <SevenSegmentDigit digit={h[0]} />
      <SevenSegmentDigit digit={h[1]} />
      <SevenSegmentColon blink={blink} />
      <SevenSegmentDigit digit={m[0]} />
      <SevenSegmentDigit digit={m[1]} />
      <SevenSegmentColon blink={blink} />
      <SevenSegmentDigit digit={s[0]} />
      <SevenSegmentDigit digit={s[1]} />
    </div>
  );
}

export default function Dashboard() {
  const { setIsOnboardingOpen, isLoading } = useAuth();
  const [activePage, setActivePage] = useState<Page>("Overview");
  const [timeRange, setTimeRange] = useState("1h");
  const [time, setTime] = useState<Date | null>(null);

  useEffect(() => {
    setTime(new Date());
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Listen for custom event from the empty state "Open Onboarding Wizard" button
  useEffect(() => {
    const handler = () => setIsOnboardingOpen(true);
    window.addEventListener("open-onboarding", handler);
    return () => window.removeEventListener("open-onboarding", handler);
  }, [setIsOnboardingOpen]);

  // Determine time period (8 hour chunks for 3 equal parts of 24h)
  const hour = time ? time.getHours() : 12;
  let bgImage = "";
  let greeting = "";
  let themeClass = "";

  if (hour >= 0 && hour < 8) {
    // Night (00:00 to 07:59)
    bgImage = "/images/dashboard-bg-2.jpg";
    greeting = "Good Night";
    themeClass = "theme-night";
  } else if (hour >= 8 && hour < 16) {
    // Daylight (08:00 to 15:59)
    bgImage = "/images/dashboard-bg-1.jpg";
    greeting = "Good Morning";
    themeClass = "theme-day";
  } else {
    // Evening (16:00 to 23:59)
    bgImage = "/images/dashboard-bg.jpg";
    greeting = "Good Evening";
    themeClass = "theme-evening";
  }

  if (isLoading) {
    return (
      <div className="flex h-screen w-full bg-slate-950 items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-4 text-slate-400">
          <RefreshCw className="animate-spin text-indigo-500" size={32} />
          <span className="text-sm font-medium">Verifying Session...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex h-screen w-full bg-background font-sans text-text-primary overflow-hidden ${themeClass}`}>
      {/* Sidebar */}
      <aside className="w-[252px] bg-sidebar border-r border-border flex flex-col shrink-0 z-20">
        <div className="h-[72px] px-5 flex items-center gap-3 shrink-0">
          <div className="text-primary flex items-center justify-center">
            <Activity size={24} strokeWidth={2.5} />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-[18px] leading-tight text-text-primary">
              Capsule
            </span>
            <span className="text-[11px] text-text-muted leading-tight">
              Data Observability Platform
            </span>
          </div>
        </div>

        <nav className="flex-1 py-4 px-3 flex flex-col gap-1 overflow-y-auto">
          <NavItem icon={<Home size={18} />} label="Overview" active={activePage === "Overview"} onClick={() => setActivePage("Overview")} />
          <NavItem icon={<GitBranch size={18} />} label="Pipelines" active={activePage === "Pipelines"} onClick={() => setActivePage("Pipelines")} />
          <NavItem icon={<Activity size={18} />} label="Airflow" active={activePage === "Airflow"} onClick={() => setActivePage("Airflow")} />
          <NavItem icon={<Layers size={18} />} label="Data Processing" active={activePage === "Data Processing"} onClick={() => setActivePage("Data Processing")} />
          <NavItem icon={<Network size={18} />} label="Microservices" active={activePage === "Microservices"} onClick={() => setActivePage("Microservices")} />
          <NavItem icon={<TrendingUp size={18} />} label="Trading Systems" active={activePage === "Trading Systems"} onClick={() => setActivePage("Trading Systems")} />
          <div className="my-2 border-t border-border/50" />
          <NavItem icon={<BarChart3 size={18} />} label="Metrics" active={activePage === "Metrics"} onClick={() => setActivePage("Metrics")} />
          <NavItem icon={<PieChart size={18} />} label="Grafana" active={activePage === "Grafana"} onClick={() => setActivePage("Grafana")} />
          <NavItem icon={<Search size={18} />} label="Kibana" active={activePage === "Kibana"} onClick={() => setActivePage("Kibana")} />
          <NavItem icon={<Bell size={18} />} label="Alerts" active={activePage === "Alerts"} onClick={() => setActivePage("Alerts")} />
          <NavItem icon={<Server size={18} />} label="Infrastructure" active={activePage === "Infrastructure"} onClick={() => setActivePage("Infrastructure")} />
          <NavItem icon={<FileText size={18} />} label="Logs" active={activePage === "Logs"} onClick={() => setActivePage("Logs")} />
          <NavItem icon={<Network size={18} />} label="Traces" active={activePage === "Traces"} onClick={() => setActivePage("Traces")} />
          <div className="mt-auto" />
          <NavItem icon={<Settings size={18} />} label="Settings" active={activePage === "Settings"} onClick={() => setActivePage("Settings")} />
        </nav>

        <div className="p-5 mt-auto">
          <div className="flex items-start gap-2">
            <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
            <p className="text-[12px] text-text-muted leading-relaxed">
              Reliable data
              <br />
              for smarter
              <br />
              decisions.
            </p>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col relative min-w-0">
        {/* Dashboard Background Image - Full Screen Dynamic */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <Image
            src={bgImage}
            alt="Dashboard Background"
            fill
            priority
            quality={100}
            unoptimized={true}
            className="object-cover transition-opacity duration-1000"
            style={{ objectPosition: "center 35%" }}
          />
          {/* Responsive overlay to ensure text legibility while keeping the theme */}
          <div className={`absolute inset-0 transition-colors duration-1000 ${
            themeClass === 'theme-day' ? 'bg-white/30' : 
            themeClass === 'theme-evening' ? 'bg-slate-900/50' : 
            'bg-slate-950/70'
          }`} />
        </div>

        {/* Top Bar */}
        <header className="h-[72px] px-8 flex items-center justify-between z-50 shrink-0 relative bg-surface-elevated/30 backdrop-blur-xl border-b border-border shadow-sm">
          {/* Timer section shifted to left */}
          <div className="flex items-center gap-6">
            <DigitalClock time={time} />
            
            {/* Time range selector */}
            <div className="flex bg-[var(--color-input-bg)] backdrop-blur-md border border-[var(--color-box-border)] rounded-xl p-1 shadow-inner">
              {["Live", "15m", "1h", "6h", "24h"].map((r) => (
                <button
                  key={r}
                  onClick={() => setTimeRange(r)}
                  className={`px-3 py-1 text-[12px] font-bold rounded-lg transition-colors flex items-center justify-center ${
                    timeRange === r
                      ? "bg-surface-elevated text-text-primary shadow-sm"
                      : "text-text-muted hover:text-text-primary hover:bg-surface-elevated/50"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* ── Notification Bell ─────────────────────────────────── */}
            <NotificationBell onViewAll={() => setActivePage("Alerts")} />

            <TenantSwitcher />
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto z-10">
          {activePage === "Overview" && <OverviewPage timeRange={timeRange === "Live" ? "1m" : timeRange} isLive={timeRange === "Live"} greeting={greeting} />}
          {activePage === "Pipelines" && <PipelinesManagementPage timeRange={timeRange === "Live" ? "1m" : timeRange} />}
          {activePage === "Airflow" && <AirflowPage timeRange={timeRange === "Live" ? "1m" : timeRange} />}
          {activePage === "Data Processing" && <DataProcessingPage timeRange={timeRange === "Live" ? "1m" : timeRange} />}
          {activePage === "Trading Systems" && <TradingPage timeRange={timeRange === "Live" ? "1m" : timeRange} />}
          {activePage === "Alerts" && <AlertsPage />}
          {activePage === "Infrastructure" && <InfrastructurePage />}
          {activePage === "Logs" && <LogsPage />}
          {activePage === "Traces" && <TracesPage />}
          {activePage === "Microservices" && <MicroservicesPage timeRange={timeRange === "Live" ? "1m" : timeRange} />}
          {activePage === "Grafana" && <GrafanaPage />}
          {activePage === "Kibana" && <KibanaPage />}
          {activePage === "Settings" && <SettingsPage />}
          {activePage === "Metrics" && <MetricsPage />}
        </div>
      </main>
    </div>
  );
}

// ─── Overview Page ────────────────────────────────────────────────────────────
function OverviewPage({ timeRange, greeting, isLive = false }: { timeRange: string; greeting: string; isLive?: boolean }) {
  const { user, activeTenantId, activeOrgName } = useAuth();
  
  const pollInterval = isLive ? 2000 : 15000;

  const { data: health, loading: hLoading } = usePolling(
    useCallback(() => metricsApi.getSystemHealth(), [activeTenantId]),
    pollInterval
  );
  const { data: dags, loading: dLoading } = usePolling(
    useCallback(() => metricsApi.getAirflowDags(timeRange), [timeRange, activeTenantId]),
    pollInterval
  );
  const { data: kafka, loading: kLoading } = usePolling(
    useCallback(() => metricsApi.getKafkaThroughput(timeRange), [timeRange, activeTenantId]),
    pollInterval
  );
  const { data: alerts } = usePolling(
    useCallback(() => metricsApi.getAlerts(), [activeTenantId]),
    pollInterval
  );

  // Derived KPIs from real data
  const totalRuns = dags?.reduce((a, d) => a + d.total_runs, 0) ?? 0;
  const successRuns = dags?.reduce((a, d) => a + d.success_count, 0) ?? 0;
  const failedRuns = dags?.reduce((a, d) => a + d.failure_count, 0) ?? 0;
  const overallSuccessRate =
    totalRuns > 0 ? ((successRuns / totalRuns) * 100).toFixed(1) : "—";

  const firingAlerts =
    alerts?.active_alerts.filter((a) => a.state === "firing") ?? [];

  // Build per-dag chart data
  const dagChartData = (dags ?? []).map((d) => ({
    name: d.dag_id,
    Success: d.success_count,
    Failed: d.failure_count,
  }));

  // Detect if this tenant has no real data yet (new tenant)
  const hasNoData = !dLoading && !hLoading && totalRuns === 0 && (dags ?? []).length === 0;

  return (
    <div className="px-8 pb-8 pt-6 space-y-6 relative z-10">
      {/* Hero */}
      <div className="pt-4 pb-6 flex justify-between items-end">
        <div>
          <p className="text-[var(--color-hero-text)] opacity-90 text-[16px] mb-2 font-bold drop-shadow-[0_1px_3px_rgba(0,0,0,0.3)]">
            {greeting}, {user?.name || "Niraj"} 👋
          </p>
          <h1 className="text-[36px] font-bold leading-[1.1] tracking-tight mb-3 text-[var(--color-hero-text)] flex items-center gap-3 drop-shadow-[0_2px_12px_rgba(0,0,0,0.3)]">
            <span>Your Data. Always Observable.</span>
            <span className="text-[11px] px-3 py-1.5 rounded-full bg-indigo-500/30 backdrop-blur-md text-indigo-500 font-mono font-bold shadow-lg">
              {activeOrgName}
            </span>
          </h1>
          <p className="text-[var(--color-box-text-muted)] text-[16px] font-medium">
            Monitor pipelines, services and infrastructure in real-time.
          </p>
        </div>
        <div className="text-right hidden xl:block">
          <p className="text-[var(--color-box-text-muted)] text-[14px] leading-relaxed font-semibold">
            Observe.
            <br />
            Understand.
            <br />
            <span className="text-[var(--color-hero-text)] font-bold">Keep Data in Flow.</span>
          </p>
        </div>
      </div>

      {/* Getting Started Empty State — shown for new tenants with no data */}
      {hasNoData ? (
        <div className="flex flex-col items-center justify-center py-16 gap-8">
          <div className="bg-[var(--color-box-bg)] backdrop-blur-xl border border-[var(--color-box-border)] rounded-3xl p-10 shadow-2xl max-w-2xl w-full text-center">
            <div className="w-20 h-20 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">🚀</span>
            </div>
            <h2 className="text-[24px] font-bold text-[var(--color-box-text)] mb-3">
              Welcome to Capsule, {activeOrgName}!
            </h2>
            <p className="text-[var(--color-box-text-muted)] text-[15px] mb-8 leading-relaxed">
              No telemetry data yet. Connect your pipelines, services, and infrastructure using the Onboarding Wizard to start seeing live metrics, logs, and traces here.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 text-left">
              {[
                { icon: "⚡", step: "1", title: "Configure OTEL", desc: "Set your OTLP endpoint and tenant credentials via the Onboarding Wizard." },
                { icon: "🔗", step: "2", title: "Connect Services", desc: "Instrument your apps, Airflow DAGs, Spark jobs, and Kafka consumers." },
                { icon: "📊", step: "3", title: "See Live Data", desc: "Metrics, logs, and traces will populate here automatically as data flows in." },
              ].map((s) => (
                <div key={s.step} className="bg-[var(--color-input-bg)] border border-[var(--color-box-border)] rounded-xl p-4">
                  <div className="text-2xl mb-2">{s.icon}</div>
                  <div className="text-[11px] text-indigo-400 font-mono font-bold mb-1">STEP {s.step}</div>
                  <div className="text-[13px] font-semibold text-[var(--color-box-text)] mb-1">{s.title}</div>
                  <div className="text-[12px] text-[var(--color-box-text-muted)] leading-relaxed">{s.desc}</div>
                </div>
              ))}
            </div>
            <button
              onClick={() => {
                // Trigger onboarding wizard via auth context
                const event = new CustomEvent("open-onboarding");
                window.dispatchEvent(event);
              }}
              className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/20 transition-all text-[14px]"
            >
              ⚡ Open Onboarding Wizard
            </button>
          </div>
        </div>
      ) : (
        <>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          title="Pipeline Runs"
          value={hLoading ? "…" : String(totalRuns)}
          icon={<Database size={20} className="text-purple" />}
          iconBg="bg-purple/10 border-purple/20"
          sub={
            dLoading
              ? "Loading…"
              : `${successRuns} success  •  ${failedRuns} failed`
          }
        />
        <KpiCard
          title="Pipeline Success Rate"
          value={dLoading ? "…" : `${overallSuccessRate}%`}
          icon={<CheckCircle2 size={20} className="text-success" />}
          iconBg="bg-success/10 border-success/20"
          sub={`Last ${timeRange}`}
          trend={Number(overallSuccessRate) >= 90 ? "good" : "bad"}
        />
        <KpiCard
          title="Active Services"
          value={
            health
              ? `${Object.values(health.components).filter((s) => s === "healthy").length} / ${Object.keys(health.components).length}`
              : "…"
          }
          icon={<Server size={20} className="text-primary" />}
          iconBg="bg-primary/10 border-primary/20"
          sub={health?.status === "healthy" ? "All systems healthy" : `Status: ${health?.status ?? "—"}`}
          trend={health?.status === "healthy" ? "good" : "bad"}
        />
        <KpiCard
          title="Active Alerts"
          value={String(firingAlerts.length)}
          icon={<AlertCircle size={20} className="text-danger" />}
          iconBg="bg-danger/10 border-danger/20"
          sub={`${health?.active_alert_count ?? "—"} alert(s) firing`}
          trend={firingAlerts.length === 0 ? "good" : "bad"}
        />
      </div>

      {/* Main Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Pipeline DAG bar chart */}
        <div className="xl:col-span-2 bg-[var(--color-box-bg)] backdrop-blur-xl border border-[var(--color-box-border)] rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-[16px] font-semibold text-[var(--color-box-text)] mb-1">
                Airflow DAG Runs — Live
              </h2>
              <p className="text-[13px] text-[var(--color-box-text-muted)]">
                Success / failure counts per DAG over {timeRange}
              </p>
            </div>
            <LiveBadge />
          </div>
          {dLoading ? (
            <Skeleton h="h-60" />
          ) : (
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dagChartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#263449" vertical={false} />
                  <XAxis dataKey="name" stroke="#748197" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#748197" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: "#182334", border: "1px solid #263449", borderRadius: "8px", color: "#F3F6FB", fontSize: "12px" }} />
                  <Bar dataKey="Success" fill="#38D996" radius={[4, 4, 0, 0]} maxBarSize={32} />
                  <Bar dataKey="Failed" fill="#EF5B5B" radius={[4, 4, 0, 0]} maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Active Alerts */}
        <div className="bg-[var(--color-box-bg)] backdrop-blur-xl border border-[var(--color-box-border)] rounded-2xl p-6 shadow-xl">
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-[16px] font-semibold text-[var(--color-box-text)]">
              Active Alerts
            </h2>
            <button
              onClick={() => {}}
              className="text-[13px] text-primary hover:text-primary/80 transition-colors flex items-center gap-1 font-medium"
            >
              View All <ArrowRight size={14} />
            </button>
          </div>

          {firingAlerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-text-muted gap-2">
              <CheckCircle2 size={32} className="text-success/60" />
              <p className="text-sm">No active alerts</p>
            </div>
          ) : (
            <div className="space-y-4">
              {firingAlerts.slice(0, 4).map((a, i) => (
                <AlertRow
                  key={i}
                  title={a.labels.alertname ?? "Alert"}
                  resource={a.annotations.summary ?? a.labels.job ?? "—"}
                  time={new Date(a.activeAt).toLocaleTimeString()}
                  severity={a.labels.severity === "critical" ? "Critical" : "Warning"}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Kafka Throughput */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-[var(--color-box-bg)] backdrop-blur-xl border border-[var(--color-box-border)] rounded-2xl p-6 shadow-xl">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-[16px] font-semibold text-[var(--color-box-text)]">
              Kafka Message Rates
            </h2>
            <LiveBadge />
          </div>
          <p className="text-[13px] text-[var(--color-box-text-muted)] mb-6">
            Producer vs Consumer throughput (msgs/s)
          </p>
          {kLoading ? (
            <Skeleton h="h-40" />
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <MetricBlock
                label="Producer Rate"
                value={`${kafka?.producer_message_rate?.toFixed(1) ?? "—"}`}
                unit="msgs/s"
                color="text-primary"
              />
              <MetricBlock
                label="Consumer Rate"
                value={`${kafka?.consumer_message_rate?.toFixed(1) ?? "—"}`}
                unit="msgs/s"
                color="text-success"
              />
            </div>
          )}
        </div>

        {/* Component status grid */}
        <div className="bg-[var(--color-box-bg)] backdrop-blur-xl border border-[var(--color-box-border)] rounded-2xl p-6 shadow-xl">
          <h2 className="text-[16px] font-semibold text-[var(--color-box-text)] mb-6">
            Component Health
          </h2>
          {hLoading ? (
            <Skeleton h="h-40" />
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {health &&
                Object.entries(health.components).map(([name, status]) => (
                  <div
                    key={name}
                    className="flex items-center justify-between p-3.5 rounded-xl bg-[var(--color-input-bg)] backdrop-blur-md border border-[var(--color-box-border)] shadow-inner"
                  >
                    <span className="text-[13px] capitalize font-medium text-[var(--color-box-text)]">{name}</span>
                    <StatusDot status={status} />
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
        </>
      )}
    </div>
  );
}

// ─── Airflow Page ─────────────────────────────────────────────────────────────
function AirflowPage({ timeRange }: { timeRange: string }) {
  const { data: dags, loading, error } = usePolling(
    useCallback(() => metricsApi.getAirflowDags(timeRange), [timeRange]),
    15000
  );

  const [selectedDag, setSelectedDag] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("grid");
  const [triggering, setTriggering] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const tabs = [
    { id: "grid", label: "Grid & Details", url: "grid" },
    { id: "graph", label: "Graph", url: "grid?tab=graph" },
    { id: "gantt", label: "Gantt", url: "grid?tab=gantt" },
    { id: "calendar", label: "Calendar", url: "grid?tab=calendar" },
    { id: "runDuration", label: "Run Duration", url: "grid?tab=run_duration" },
    { id: "taskDuration", label: "Task Duration", url: "grid?tab=task_duration" }
  ];

  const handleTrigger = async (dagId: string) => {
    setTriggering(dagId);
    try {
      const res = await fetch("/api/airflow/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dag_id: dagId })
      });
      if (!res.ok) throw new Error(await res.text());
      alert(`✅ Successfully triggered DAG: ${dagId}`);
    } catch (e: any) {
      alert(`❌ Failed to trigger: ${e.message}`);
    } finally {
      setTriggering(null);
    }
  };

  const filteredDags = (dags ?? []).filter((d: AirflowDag) => 
    d.dag_id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="px-8 pb-8 pt-6 flex flex-col min-h-screen space-y-4">
      <PageHeader title="Airflow Pipelines" desc="Live DAG execution, triggering, and comprehensive visualizations" />

      {error && <ErrorBanner message={error} />}

      {/* Horizontal Pipeline Selector */}
      <div className="bg-surface border border-border rounded-xl p-4 shrink-0 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-[15px]">Available Pipelines</h3>
            <LiveBadge />
          </div>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input 
              type="text"
              placeholder="Search pipelines..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-1.5 text-[13px] w-64 rounded-lg border border-border bg-surface-elevated text-text-primary focus:outline-none focus:border-primary/50 transition-colors"
            />
          </div>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-2 hide-scrollbar">
          {loading ? (
            <div className="w-full flex gap-4">
              <Skeleton h="h-20 w-[280px]" />
              <Skeleton h="h-20 w-[280px]" />
              <Skeleton h="h-20 w-[280px]" />
            </div>
          ) : filteredDags.length === 0 ? (
            <div className="text-[13px] text-text-muted p-4">No pipelines match your search.</div>
          ) : (
            filteredDags.map((d: AirflowDag) => (
              <div 
                key={d.dag_id} 
                onClick={() => setSelectedDag(d.dag_id)}
                className={`w-[300px] shrink-0 p-3.5 rounded-lg border flex flex-col cursor-pointer transition-all duration-200 ${
                  selectedDag === d.dag_id 
                    ? 'bg-primary/5 border-primary/40 shadow-sm transform scale-[1.02]' 
                    : 'border-border hover:bg-surface-elevated hover:border-border/80'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="font-mono text-[13px] font-semibold text-text-primary truncate pr-2" title={d.dag_id}>
                    {d.dag_id}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTrigger(d.dag_id);
                    }}
                    disabled={triggering === d.dag_id}
                    className="shrink-0 flex items-center gap-1.5 text-[11px] font-medium text-primary bg-primary/10 hover:bg-primary/20 border border-primary/20 px-2.5 py-1 rounded transition-colors disabled:opacity-50"
                  >
                    {triggering === d.dag_id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                    Run
                  </button>
                </div>
                <div className="flex items-center justify-between text-[11px] text-text-muted mt-auto">
                  <div>
                    Success: <span className={`font-semibold ${d.success_rate >= 90 ? "text-success" : d.success_rate >= 70 ? "text-warning" : "text-danger"}`}>
                      {d.success_rate}%
                    </span>
                  </div>
                  <div>{d.total_runs} total runs</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Airflow Visualizations Full Width Panel */}
      <div className="w-full bg-surface border border-border rounded-xl overflow-hidden flex flex-col relative shadow-sm min-h-[1200px]">
        {selectedDag ? (
          <>
            {/* Tab Navigation */}
            <div className="border-b border-border px-4 py-2.5 bg-surface flex gap-2 overflow-x-auto shrink-0 hide-scrollbar items-center">
              <div className="text-[12px] font-medium text-text-muted mr-2">Views:</div>
              {tabs.map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`px-3.5 py-1.5 text-[12px] font-medium rounded-md transition-all whitespace-nowrap flex items-center gap-2 ${
                    activeTab === t.id 
                      ? 'bg-primary text-white shadow-sm' 
                      : 'text-text-muted hover:text-text-primary hover:bg-surface-elevated'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            
            {/* Airflow embedded iframe */}
            <div className="flex-1 bg-white relative">
              {/* Overlay to dim initial flash of Airflow loading */}
              <iframe 
                key={`${selectedDag}-${activeTab}`}
                src={`http://localhost:8080/dags/${selectedDag}/${tabs.find(t => t.id === activeTab)?.url}`} 
                className="w-full h-full border-none absolute inset-0"
                style={{ filter: "invert(0.9) hue-rotate(180deg) brightness(0.95)" }} 
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
                title={`Airflow ${activeTab}`}
              />
            </div>
          </>
        ) : (
           <div className="flex-1 flex flex-col items-center justify-center text-text-muted">
             <Layers className="w-14 h-14 mb-4 opacity-20" />
             <p className="font-semibold text-[15px] text-text-primary">Select a Pipeline above</p>
             <p className="text-[13px] mt-2 text-center max-w-md">Choose a DAG from the horizontal list to view its execution graph, gantt charts, event logs, and detailed task durations directly from Airflow in full screen.</p>
           </div>
        )}
      </div>
    </div>
  );
}

// ─── Data Processing (PySpark) Page ──────────────────────────────────────────
function DataProcessingPage({ timeRange }: { timeRange: string }) {
  const { data: jobs, loading, error } = usePolling(
    useCallback(() => metricsApi.getSparkJobs(timeRange), [timeRange]),
    15000
  );

  return (
    <div className="px-8 pb-8 pt-6 space-y-6">
      <PageHeader title="PySpark Job Monitor" desc="Real-time job status, duration, and records processed from Prometheus" />

      {error && <ErrorBanner message={error} />}

      <div className="bg-surface border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-[15px]">Spark Job Runs — Last {timeRange}</h3>
          <LiveBadge />
        </div>
        {loading ? (
          <Skeleton h="h-40" />
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-text-muted border-b border-border">
                <th className="text-left pb-3 font-medium">Job Name</th>
                <th className="text-right pb-3 font-medium">Status</th>
                <th className="text-right pb-3 font-medium">Duration</th>
                <th className="text-right pb-3 font-medium">Records Processed</th>
              </tr>
            </thead>
            <tbody>
              {(jobs ?? []).map((j: PysparkJob) => (
                <tr key={j.job_name} className="border-b border-border/50 hover:bg-surface-elevated/50 transition-colors">
                  <td className="py-3 font-mono text-primary">{j.job_name}</td>
                  <td className="py-3 text-right">
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${
                      j.status === "success"
                        ? "bg-success/10 text-success border-success/20"
                        : "bg-danger/10 text-danger border-danger/20"
                    }`}>
                      {j.status}
                    </span>
                  </td>
                  <td className="py-3 text-right text-text-secondary">{j.duration_seconds}s</td>
                  <td className="py-3 text-right font-semibold">{j.records_processed.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─── Trading Systems (Kafka) Page ─────────────────────────────────────────────
function TradingPage({ timeRange }: { timeRange: string }) {
  const { data: throughput, loading: tLoading } = usePolling(
    useCallback(() => metricsApi.getKafkaThroughput(timeRange), [timeRange]),
    10000
  );
  const { data: lag, loading: lLoading } = usePolling(
    useCallback(() => metricsApi.getKafkaLag(), []),
    10000
  );

  return (
    <div className="px-8 pb-8 pt-6 space-y-6">
      <PageHeader title="Trading System Monitor" desc="Kafka producer/consumer throughput and consumer group lag from Prometheus" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Throughput */}
        <div className="bg-surface border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-[15px]">Kafka Throughput</h3>
            <LiveBadge />
          </div>
          {tLoading ? (
            <Skeleton h="h-32" />
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <MetricBlock label="Producer Rate" value={String(throughput?.producer_message_rate?.toFixed(2) ?? "—")} unit="msgs/s" color="text-primary" />
              <MetricBlock label="Consumer Rate" value={String(throughput?.consumer_message_rate?.toFixed(2) ?? "—")} unit="msgs/s" color="text-success" />
            </div>
          )}
        </div>

        {/* Consumer Lag */}
        <div className="bg-surface border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[15px]">Consumer Group Lag</h3>
            <LiveBadge />
          </div>
          {lLoading ? (
            <Skeleton h="h-32" />
          ) : lag && lag.length > 0 ? (
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-text-muted border-b border-border">
                  <th className="text-left pb-2 font-medium">Group</th>
                  <th className="text-left pb-2 font-medium">Topic</th>
                  <th className="text-right pb-2 font-medium">Lag</th>
                </tr>
              </thead>
              <tbody>
                {lag.map((l, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="py-2 font-mono text-primary text-[12px]">{l.group}</td>
                    <td className="py-2 text-text-secondary">{l.topic}</td>
                    <td className={`py-2 text-right font-semibold ${l.lag > 10000 ? "text-danger" : l.lag > 1000 ? "text-warning" : "text-success"}`}>
                      {l.lag.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-text-muted text-sm">No consumer lag data.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Microservices Page ───────────────────────────────────────────────────────
function MicroservicesPage({ timeRange }: { timeRange: string }) {
  const [selectedService, setSelectedService] = useState<string>("orders-service");
  
  const { data, loading, error } = usePolling(
    useCallback(() => metricsApi.getMicroserviceMetrics(selectedService, timeRange), [selectedService, timeRange]),
    10000
  );

  return (
    <div className="px-8 pb-8 pt-6 space-y-6">
      <PageHeader title="Microservices Monitor" desc="Live API metrics, latency percentiles, and error rates" />
      
      {error && <ErrorBanner message={error} />}
      
      <div className="flex gap-2">
        {["orders-service", "inventory-service"].map((svc) => (
          <button
            key={svc}
            onClick={() => setSelectedService(svc)}
            className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-colors border ${
              selectedService === svc
                ? "bg-primary/20 text-primary border-primary/30"
                : "bg-surface border-border text-text-secondary hover:text-text-primary hover:border-border/80"
            }`}
          >
            {svc}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-surface border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[15px]">Request Rate</h3>
            <LiveBadge />
          </div>
          {loading ? (
            <Skeleton h="h-24" />
          ) : (
            <MetricBlock label="Total Traffic" value={String(data?.request_rate ?? "—")} unit="req/s" color="text-primary" />
          )}
        </div>
        
        <div className="bg-surface border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[15px]">Error Rate</h3>
            <LiveBadge />
          </div>
          {loading ? (
            <Skeleton h="h-24" />
          ) : (
            <MetricBlock label="5xx / Total" value={String(data?.error_rate_pct ?? "—")} unit="%" color={(data?.error_rate_pct ?? 0) > 5 ? "text-danger" : "text-success"} />
          )}
        </div>
        
        <div className="bg-surface border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[15px]">Latency (p99)</h3>
            <LiveBadge />
          </div>
          {loading ? (
            <Skeleton h="h-24" />
          ) : (
            <MetricBlock label="99th Percentile" value={String(data?.latency_p99_ms ?? "—")} unit="ms" color={(data?.latency_p99_ms ?? 0) > 500 ? "text-warning" : "text-primary"} />
          )}
        </div>
      </div>
      
      <div className="bg-surface border border-border rounded-xl p-6 mt-4">
         <h3 className="font-semibold text-[15px] mb-4">Latency Distribution</h3>
         {loading ? (
            <Skeleton h="h-40" />
         ) : (
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[
                  { name: "p50", value: data?.latency_p50_ms ?? 0, fill: "#38bdf8" },
                  { name: "p95", value: data?.latency_p95_ms ?? 0, fill: "#fbbf24" },
                  { name: "p99", value: data?.latency_p99_ms ?? 0, fill: "#ef4444" }
                ]} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#263449" vertical={false} />
                  <XAxis dataKey="name" stroke="#748197" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#748197" fontSize={12} tickLine={false} axisLine={false} unit="ms" />
                  <Tooltip contentStyle={{ backgroundColor: "#182334", border: "1px solid #263449", borderRadius: "8px", color: "#F3F6FB", fontSize: "12px" }} cursor={{fill: 'rgba(255, 255, 255, 0.05)'}} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={60}>
                    {
                      [
                        { name: "p50", fill: "#38bdf8" },
                        { name: "p95", fill: "#fbbf24" },
                        { name: "p99", fill: "#ef4444" }
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))
                    }
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
         )}
      </div>
    </div>
  );
}

// ─── Alerts Page ──────────────────────────────────────────────────────────────
function AlertsPage() {
  const { data, loading, error, refetch } = usePolling(
    useCallback(() => metricsApi.getAlerts(), []),
    10000
  );

  const firing = data?.active_alerts.filter((a) => a.state === "firing") ?? [];
  const pending = data?.active_alerts.filter((a) => a.state === "pending") ?? [];

  return (
    <div className="px-8 pb-8 pt-6 space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="Active Prometheus Alerts" desc="Live firing and pending alerts from your Prometheus alertmanager" />
        <button onClick={refetch} className="flex items-center gap-2 text-[13px] text-primary bg-primary/10 hover:bg-primary/20 border border-primary/20 px-3 py-1.5 rounded-lg transition-colors">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {error && <ErrorBanner message={error} />}

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-surface border border-border rounded-xl p-5 flex flex-col gap-1">
          <span className="text-text-muted text-[12px]">Firing</span>
          <span className="text-3xl font-semibold text-danger">{firing.length}</span>
        </div>
        <div className="bg-surface border border-border rounded-xl p-5 flex flex-col gap-1">
          <span className="text-text-muted text-[12px]">Pending</span>
          <span className="text-3xl font-semibold text-warning">{pending.length}</span>
        </div>
        <div className="bg-surface border border-border rounded-xl p-5 flex flex-col gap-1">
          <span className="text-text-muted text-[12px]">Total Rules</span>
          <span className="text-3xl font-semibold text-text-primary">{(data?.rules as unknown[])?.length ?? "—"}</span>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-xl p-6">
        <h3 className="font-semibold text-[15px] mb-4">All Active Alerts</h3>
        {loading ? (
          <Skeleton h="h-40" />
        ) : data?.active_alerts.length === 0 ? (
          <div className="flex items-center gap-3 text-success py-4">
            <CheckCircle2 size={24} />
            <span>No alerts are currently firing.</span>
          </div>
        ) : (
          <div className="space-y-3">
            {data?.active_alerts.map((a: PrometheusAlert, i: number) => (
              <AlertRow
                key={i}
                title={a.labels.alertname ?? "Unnamed Alert"}
                resource={a.annotations.summary ?? a.labels.job ?? "—"}
                time={new Date(a.activeAt).toLocaleString()}
                severity={a.state === "firing" ? (a.labels.severity === "critical" ? "Critical" : "Warning") : "Info"}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Infrastructure Page ──────────────────────────────────────────────────────
function InfrastructurePage() {
  const { data, loading, error } = usePolling(
    useCallback(() => metricsApi.getServiceHealth(), []),
    15000
  );

  return (
    <div className="px-8 pb-8 pt-6 space-y-6">
      <PageHeader title="Infrastructure Health" desc="Connectivity status of Redis, Prometheus, and Elasticsearch" />

      {error && <ErrorBanner message={error} />}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} h="h-32" />)
          : data &&
            Object.entries(data.services).map(([service, status]) => (
              <div key={service} className="bg-surface border border-border rounded-xl p-6 flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${status === "healthy" ? "bg-success/10 border-success/20" : "bg-danger/10 border-danger/20"}`}>
                  {status === "healthy" ? (
                    <Wifi size={22} className="text-success" />
                  ) : (
                    <WifiOff size={22} className="text-danger" />
                  )}
                </div>
                <div>
                  <div className="text-[15px] font-semibold capitalize">{service}</div>
                  <StatusDot status={status} withLabel />
                </div>
              </div>
            ))}
      </div>
    </div>
  );
}

// ─── Logs Page ────────────────────────────────────────────────────────────────
function LogsPage() {
  const [component, setComponent] = useState<string>("");
  const [level, setLevel] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(timer);
  }, [search]);
  
  const { data, loading, error, refetch } = usePolling(
    useCallback(() => metricsApi.getLogs(component, level, debouncedSearch, 100), [component, level, debouncedSearch]),
    10000
  );

  return (
    <div className="px-8 pb-8 pt-6 space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="Centralized Logs" desc="Real-time logs from Elasticsearch across all services" />
        <button onClick={refetch} className="flex items-center gap-2 text-[13px] text-primary bg-primary/10 hover:bg-primary/20 border border-primary/20 px-3 py-1.5 rounded-lg transition-colors">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {error && <ErrorBanner message={error} />}

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Search log messages..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-surface border border-border rounded-lg pl-9 pr-4 py-2 text-[13px] text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/50"
          />
        </div>
        <select
          value={component}
          onChange={(e) => setComponent(e.target.value)}
          className="bg-surface border border-border rounded-lg px-3 py-2 text-[13px] text-text-primary focus:outline-none focus:border-primary/50"
        >
          <option value="">All Components</option>
          <option value="orders-service">Orders Service</option>
          <option value="inventory-service">Inventory Service</option>
          <option value="airflow">Airflow</option>
          <option value="kafka">Kafka</option>
        </select>
        
        <select
          value={level}
          onChange={(e) => setLevel(e.target.value)}
          className="bg-surface border border-border rounded-lg px-3 py-2 text-[13px] text-text-primary focus:outline-none focus:border-primary/50"
        >
          <option value="">All Levels</option>
          <option value="info">Info</option>
          <option value="warn">Warn</option>
          <option value="error">Error</option>
        </select>
      </div>

      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        {loading && !data ? (
          <div className="p-6"><Skeleton h="h-96" /></div>
        ) : data && data.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px] text-left">
              <thead className="bg-surface-elevated text-text-muted border-b border-border">
                <tr>
                  <th className="py-3 px-4 font-medium w-[180px]">Timestamp</th>
                  <th className="py-3 px-4 font-medium w-[100px]">Level</th>
                  <th className="py-3 px-4 font-medium w-[150px]">Component</th>
                  <th className="py-3 px-4 font-medium">Message</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {data.map((log, i) => (
                  <tr key={i} className="hover:bg-surface-elevated/30 transition-colors">
                    <td className="py-2.5 px-4 text-text-secondary font-mono text-[11px] whitespace-nowrap">
                      {log.timestamp ? new Date(log.timestamp).toLocaleString() : "—"}
                    </td>
                    <td className="py-2.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-medium border ${
                        log.level === "error" || log.level === "critical"
                          ? "bg-danger/10 text-danger border-danger/30"
                          : log.level === "warn"
                          ? "bg-warning/10 text-warning border-warning/30"
                          : "bg-surface-elevated text-text-secondary border-border"
                      }`}>
                        {log.level.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-primary font-medium truncate">
                      {log.component}
                    </td>
                    <td className="py-2.5 px-4 text-text-primary font-mono text-[12px] break-all">
                      {log.message}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-10 text-center text-text-muted flex flex-col items-center gap-3">
            <FileText size={32} className="opacity-50" />
            <p>No logs found for the selected filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Traces Page ──────────────────────────────────────────────────────────────
function TracesPage() {
  const [service, setService] = useState<string>("orders-service");
  
  const { data, loading, error, refetch } = usePolling(
    useCallback(() => metricsApi.getTraces(service, 20), [service]),
    10000
  );

  return (
    <div className="px-8 pb-8 pt-6 space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="Distributed Traces" desc="Request flow and latency analysis via Jaeger" />
        <button onClick={refetch} className="flex items-center gap-2 text-[13px] text-primary bg-primary/10 hover:bg-primary/20 border border-primary/20 px-3 py-1.5 rounded-lg transition-colors">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {error && <ErrorBanner message={error} />}

      <div className="flex gap-4">
        <select
          value={service}
          onChange={(e) => setService(e.target.value)}
          className="bg-surface border border-border rounded-lg px-3 py-2 text-[13px] text-text-primary focus:outline-none focus:border-primary/50"
        >
          <option value="orders-service">Orders Service</option>
          <option value="inventory-service">Inventory Service</option>
        </select>
      </div>

      <div className="bg-surface border border-border rounded-xl p-6">
        {loading && !data ? (
          <Skeleton h="h-64" />
        ) : data && data.length > 0 ? (
          <div className="space-y-6">
            {data.map((trace, i) => (
              <div key={i} className="border border-border rounded-lg overflow-hidden">
                <div className="bg-surface-elevated p-3 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-[13px] font-mono text-primary">{trace.trace_id.substring(0, 12)}...</span>
                    <span className="text-[12px] text-text-muted">{new Date(trace.start_time_ms).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-4 text-[12px]">
                    <span className="text-text-secondary">{trace.span_count} spans</span>
                    <span className="font-semibold text-text-primary">{trace.total_duration_ms.toFixed(2)} ms</span>
                  </div>
                </div>
                <div className="p-4 space-y-2">
                  {trace.spans.map((span, j) => {
                    const leftOffset = trace.total_duration_ms > 0 ? ((span.start_time_ms - trace.start_time_ms) / trace.total_duration_ms) * 100 : 0;
                    const width = trace.total_duration_ms > 0 ? (span.duration_ms / trace.total_duration_ms) * 100 : 100;
                    
                    return (
                      <div key={j} className="flex flex-col gap-1 text-[11px]">
                        <div className="flex justify-between text-text-muted px-1">
                          <span className="truncate w-1/3">{span.service}: {span.operation}</span>
                          <span>{span.duration_ms.toFixed(2)} ms</span>
                        </div>
                        <div className="h-4 bg-surface-elevated rounded-sm relative overflow-hidden">
                          <div 
                            className={`absolute top-0 bottom-0 rounded-sm ${span.service === 'orders-service' ? 'bg-primary' : span.service === 'inventory-service' ? 'bg-warning' : 'bg-success'}`}
                            style={{ 
                              left: `${Math.max(0, leftOffset)}%`, 
                              width: `${Math.max(0.5, width)}%` 
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-10 text-center text-text-muted flex flex-col items-center gap-3">
            <Network size={32} className="opacity-50" />
            <p>No traces found for {service}.</p>
          </div>
        )}
      </div>
    </div>
  );
}


// ─── Grafana Page ─────────────────────────────────────────────────────────────
function GrafanaPage() {
  const { activeTenantId } = useAuth();
  const [isConfigured, setIsConfigured] = useState(true);
  const [isConfiguring, setIsConfiguring] = useState(false);

  useEffect(() => {
    if (activeTenantId?.includes("demo") || activeTenantId?.includes("acme")) {
      setIsConfigured(true);
    } else {
      const configured = localStorage.getItem(`grafana_configured_${activeTenantId}`);
      setIsConfigured(configured === "true");
    }
  }, [activeTenantId]);

  const handleConfigure = () => {
    setIsConfiguring(true);
    setTimeout(() => {
      localStorage.setItem(`grafana_configured_${activeTenantId}`, "true");
      setIsConfigured(true);
      setIsConfiguring(false);
    }, 1500);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <div className="px-8 pt-6 pb-4 shrink-0">
        <PageHeader title="Grafana Dashboards" desc="Advanced visualizations, metrics, and custom graphs" />
      </div>
      
      {!isConfigured ? (
        <div className="flex-1 m-8 mt-0 bg-surface relative rounded-xl overflow-hidden border border-border flex flex-col items-center justify-center p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-5 border border-primary/20">
            <PieChart size={32} className="text-primary" />
          </div>
          <h2 className="text-xl font-bold text-text-primary mb-2">No Dashboards Configured</h2>
          <p className="text-text-secondary text-sm max-w-md mx-auto leading-relaxed mb-6">
            Grafana boards have not been provisioned for the <span className="font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded mx-1">{activeTenantId}</span> tenant yet. Please provision your dashboards to get started.
          </p>
          <button
            onClick={handleConfigure}
            disabled={isConfiguring}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white font-semibold transition-all shadow-lg shadow-primary/20 disabled:opacity-70"
          >
            {isConfiguring ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                Provisioning Folders & Boards...
              </>
            ) : (
              <>
                <PieChart size={16} />
                Provision Grafana Dashboards
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="flex-1 w-full bg-surface relative h-[calc(100vh-140px)] rounded-xl overflow-hidden border border-border">
          <iframe 
            src="http://localhost:3000/dashboards" 
            className="w-full h-full border-none absolute inset-0"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
            title="Grafana Dashboard"
          />
        </div>
      )}
    </div>
  );
}

// ─── Kibana Page ──────────────────────────────────────────────────────────────
function KibanaPage() {
  const { activeTenantId } = useAuth();
  const [isConfigured, setIsConfigured] = useState(true);
  const [isConfiguring, setIsConfiguring] = useState(false);

  useEffect(() => {
    if (activeTenantId?.includes("demo") || activeTenantId?.includes("acme")) {
      setIsConfigured(true);
    } else {
      const configured = localStorage.getItem(`kibana_configured_${activeTenantId}`);
      setIsConfigured(configured === "true");
    }
  }, [activeTenantId]);

  const handleConfigure = () => {
    setIsConfiguring(true);
    setTimeout(() => {
      localStorage.setItem(`kibana_configured_${activeTenantId}`, "true");
      setIsConfigured(true);
      setIsConfiguring(false);
    }, 1500);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <div className="px-8 pt-6 pb-4 shrink-0 flex items-center justify-between">
        <PageHeader title="Kibana Dashboards" desc="Log exploration, analysis, and discovery" />
        {isConfigured && (
          <a
            href="http://localhost:5601"
            target="_blank"
            rel="noreferrer"
            className="px-3.5 py-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <span>Open in New Tab</span>
            <ArrowRight size={13} />
          </a>
        )}
      </div>
      
      {!isConfigured ? (
        <div className="flex-1 m-8 mt-0 bg-surface relative rounded-xl overflow-hidden border border-border flex flex-col items-center justify-center p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-5 border border-emerald-500/20">
            <BarChart3 size={32} className="text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold text-text-primary mb-2">No Indices Found</h2>
          <p className="text-text-secondary text-sm max-w-md mx-auto leading-relaxed mb-6">
            Kibana indices and dashboards have not been configured for <span className="font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded mx-1">{activeTenantId}</span>. Provision Kibana spaces to begin log exploration.
          </p>
          <button
            onClick={handleConfigure}
            disabled={isConfiguring}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-70"
          >
            {isConfiguring ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                Creating Kibana Spaces...
              </>
            ) : (
              <>
                <BarChart3 size={16} />
                Configure Kibana Spaces
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="flex-1 w-full bg-surface relative h-[calc(100vh-140px)] rounded-xl overflow-hidden border border-border">
          <iframe 
            src="http://localhost:5601/app/home#/" 
            className="w-full h-full border-none absolute inset-0"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
            title="Kibana Dashboard"
          />
        </div>
      )}
    </div>
  );
}

// ─── Settings Page (Multi-Tenant & RBAC Protected) ───────────────────────────
function SettingsPage() {
  const { user, activeTenantId, activeOrgName, activeOrgId, currentRole, isViewer, canManageSettings } = useAuth();
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>([]);
  const [loadingKeys, setLoadingKeys] = useState<boolean>(true);
  const [newKeyName, setNewKeyName] = useState<string>("");
  const [createdRawKey, setCreatedRawKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isCreatingKey, setIsCreatingKey] = useState<boolean>(false);

  useEffect(() => {
    if (canManageSettings) {
      loadKeys();
    }
  }, [canManageSettings, activeTenantId]);

  const loadKeys = async () => {
    setLoadingKeys(true);
    try {
      const keys = await metricsApi.getApiKeys();
      setApiKeys(keys);
    } catch (e) {
      console.error("Failed to load API keys", e);
    } finally {
      setLoadingKeys(false);
    }
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleCreateApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName) return;
    setIsCreatingKey(true);
    try {
      const keyItem = await metricsApi.createApiKey({ name: newKeyName });
      setCreatedRawKey(keyItem.raw_key || keyItem.key_prefix);
      setNewKeyName("");
      await loadKeys();
    } catch (err) {
      alert("Failed to create API key: " + err);
    } finally {
      setIsCreatingKey(false);
    }
  };

  // RBAC RESTRICTION: Viewers cannot see settings or API key management
  if (isViewer) {
    return (
      <div className="p-8 max-w-4xl mx-auto flex flex-col items-center justify-center pt-24 text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4 text-amber-400">
          <Shield size={32} />
        </div>
        <h2 className="text-xl font-semibold text-text-primary mb-2">Access Restricted</h2>
        <p className="text-text-muted max-w-md mb-6 leading-relaxed">
          Your account currently has <span className="text-amber-400 font-mono font-medium">Viewer</span> permissions in <span className="text-white font-medium">{activeOrgName}</span>.
          <br /><br />
          Viewer-role members can monitor telemetry dashboards, logs, and traces, but are restricted from viewing or managing organization settings and API keys.
        </p>
        <div className="px-4 py-2 rounded-xl bg-surface border border-border text-xs text-text-muted">
          Contact your organization Administrator or Owner to upgrade permissions.
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-200">
      <PageHeader
        title="Organization Settings & API Keys"
        desc={`Manage tenant configurations, credentials, and telemetry ingestion security for ${activeOrgName}.`}
      />

      {/* Organization Overview Card */}
      <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-border">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-white">{activeOrgName}</h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 capitalize">
                Role: {currentRole}
              </span>
            </div>
            <p className="text-xs text-text-muted mt-1">
              Active Organization ID: <span className="font-mono text-slate-300">{activeOrgId}</span>
            </p>
          </div>
          <div className="flex items-center gap-2 bg-slate-900 px-3.5 py-2 rounded-xl border border-slate-800">
            <span className="text-xs text-slate-400">Tenant ID:</span>
            <span className="text-xs font-mono font-bold text-cyan-400">{activeTenantId}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6">
          <div className="p-4 rounded-xl bg-surface-elevated/40 border border-border">
            <div className="text-xs text-text-muted mb-1">Ingestion Protocol</div>
            <div className="text-sm font-semibold text-white">OpenTelemetry OTLP & StatsD</div>
            <div className="text-[11px] text-cyan-400 font-mono mt-1">gRPC :4317 / HTTP :4318</div>
          </div>
          <div className="p-4 rounded-xl bg-surface-elevated/40 border border-border">
            <div className="text-xs text-text-muted mb-1">Tenant Scope</div>
            <div className="text-sm font-semibold text-white">Strict Isolation (Enforced)</div>
            <div className="text-[11px] text-emerald-400 mt-1">✓ Server-side Query Injected</div>
          </div>
          <div className="p-4 rounded-xl bg-surface-elevated/40 border border-border">
            <div className="text-xs text-text-muted mb-1">User Identity</div>
            <div className="text-sm font-semibold text-white truncate">{user?.email || "admin@capsule.io"}</div>
            <div className="text-[11px] text-indigo-400 mt-1">JWT Authenticated Session</div>
          </div>
        </div>
      </div>

      {/* API Key Management */}
      <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Key size={18} className="text-indigo-400" />
              <span>Control-Plane API Keys</span>
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              Service API keys authenticate your Airflow pipelines, microservices, and Kafka producers.
            </p>
          </div>
        </div>

        {/* Create Key Form */}
        <form onSubmit={handleCreateApiKey} className="flex gap-3 max-w-xl">
          <input
            type="text"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            placeholder="e.g. Production Ingestion Key"
            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
          />
          <button
            type="submit"
            disabled={!newKeyName || isCreatingKey}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shrink-0 shadow-sm"
          >
            <Plus size={14} />
            <span>Generate Key</span>
          </button>
        </form>

        {/* Newly Created Key Alert */}
        {createdRawKey && (
          <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-300 space-y-2 animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-200">
                🎉 New API Key Generated — Copy it now!
              </span>
              <button
                type="button"
                onClick={() => setCreatedRawKey(null)}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-bold"
              >
                ✕
              </button>
            </div>
            <p className="text-[11px] text-emerald-400/80">
              For security, this secret is displayed once. Store it in your secrets manager or environment file.
            </p>
            <div className="flex items-center justify-between bg-black/40 px-3 py-2 rounded-lg border border-emerald-500/20 font-mono text-xs text-emerald-200">
              <span className="truncate mr-2">{createdRawKey}</span>
              <button
                type="button"
                onClick={() => handleCopy(createdRawKey, "new_raw_key")}
                className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-sans font-semibold transition flex items-center gap-1 shrink-0"
              >
                {copiedKey === "new_raw_key" ? <Check size={12} /> : <Copy size={12} />}
                <span>{copiedKey === "new_raw_key" ? "Copied" : "Copy"}</span>
              </button>
            </div>
          </div>
        )}

        {/* API Key List */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Keys</div>
          {loadingKeys ? (
            <div className="text-xs text-slate-500 py-4 text-center">Loading keys...</div>
          ) : apiKeys.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500 border border-dashed border-border rounded-xl">
              No custom API keys generated yet. Generate your first key above.
            </div>
          ) : (
            <div className="divide-y divide-border border border-border rounded-xl overflow-hidden bg-surface-elevated/20">
              {apiKeys.map((k) => (
                <div key={k.id} className="p-3.5 flex items-center justify-between text-xs hover:bg-surface-elevated/40 transition">
                  <div className="space-y-0.5">
                    <div className="font-semibold text-white">{k.name}</div>
                    <div className="font-mono text-[11px] text-slate-400">{k.key_prefix}</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${k.is_active ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>
                      {k.is_active ? "Active" : "Revoked"}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {new Date(k.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Environment Integration Snippet */}
      <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">Docker & Environment Integration Snippet</h3>
            <p className="text-xs text-text-muted mt-0.5">
              Copy these environment variables to inject telemetry directly into your tenant space.
            </p>
          </div>
          <button
            onClick={() => handleCopy(`TENANT_ID=${activeTenantId}\nAPI_KEY=uop_live_demo\nOTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4317\nOTEL_RESOURCE_ATTRIBUTES=tenant_id=${activeTenantId}`, "env_snippet")}
            className="px-3 py-1.5 rounded-lg bg-surface-elevated hover:bg-surface border border-border text-xs font-semibold text-slate-200 transition flex items-center gap-1.5"
          >
            {copiedKey === "env_snippet" ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
            <span>{copiedKey === "env_snippet" ? "Copied" : "Copy Snippet"}</span>
          </button>
        </div>

        <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-cyan-300 overflow-x-auto">
{`# Capsule Multi-Tenant Environment Config
TENANT_ID=${activeTenantId}
API_KEY=uop_live_... (Use your generated API key)
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4317
OTEL_RESOURCE_ATTRIBUTES=tenant_id=${activeTenantId},service.name=my-service`}
        </pre>
      </div>
    </div>
  );
}

// ─── Coming Soon ──────────────────────────────────────────────────────────────
function ComingSoonPage({ name, onBack }: { name: string; onBack: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center pt-32 px-8">
      <div className="w-16 h-16 rounded-2xl bg-surface border border-border flex items-center justify-center mb-4 opacity-50">
        <Settings size={32} className="text-text-muted" />
      </div>
      <h2 className="text-xl font-semibold text-text-primary mb-2">{name}</h2>
      <p className="text-text-muted">This module is under construction.</p>
      <button
        onClick={onBack}
        className="mt-6 px-4 py-2 bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 rounded-lg transition-colors text-sm font-medium"
      >
        Return to Overview
      </button>
    </div>
  );
}

// ─── Shared UI Components ─────────────────────────────────────────────────────

function NavItem({ icon, label, active = false, onClick }: { icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-2.5 rounded-lg cursor-pointer transition-colors duration-150 ${
        active
          ? "bg-primary/10 text-primary border border-primary/20"
          : "text-text-secondary hover:bg-surface hover:text-text-primary border border-transparent"
      }`}
    >
      <div className={`${active ? "text-primary" : "text-text-muted"} shrink-0`}>{icon}</div>
      <span className="font-medium text-[14px]">{label}</span>
    </div>
  );
}

function PageHeader({ title, desc }: { title: string; desc: string }) {
  return (
    <div>
      <h1 className="text-[22px] font-semibold text-text-primary mb-1">{title}</h1>
      <p className="text-[13px] text-text-muted">{desc}</p>
    </div>
  );
}

function KpiCard({ title, value, icon, iconBg, sub, trend }: { title: string; value: string; icon: React.ReactNode; iconBg: string; sub: string; trend?: "good" | "bad" }) {
  return (
    <div className="bg-[var(--color-box-bg)] backdrop-blur-xl border border-[var(--color-box-border)] rounded-2xl p-5 flex flex-col gap-3 shadow-xl hover:brightness-110 transition-all duration-200">
      <div className="flex items-center justify-between">
        <span className="text-[13px] text-[var(--color-box-text-muted)] font-semibold">{title}</span>
        <div className={`w-9 h-9 rounded-lg border flex items-center justify-center ${iconBg}`}>{icon}</div>
      </div>
      <div className="text-[32px] font-bold tracking-tight text-[var(--color-box-text)] drop-shadow-sm">{value}</div>
      <div className="text-[12px] flex items-center gap-1.5 font-medium">
        {trend && (
          <span className={trend === "good" ? "text-success drop-shadow-[0_0_5px_rgba(56,217,150,0.6)]" : "text-danger drop-shadow-[0_0_5px_rgba(239,91,91,0.6)]"}>
            {trend === "good" ? "●" : "●"}
          </span>
        )}
        <span className="text-[var(--color-box-text-muted)]">{sub}</span>
      </div>
    </div>
  );
}

function MetricBlock({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <div className="p-4 rounded-xl bg-[var(--color-input-bg)] backdrop-blur-md border border-[var(--color-box-border)] shadow-inner flex flex-col justify-center">
      <div className="text-[12px] text-[var(--color-box-text-muted)] font-medium mb-2">{label}</div>
      <div className={`text-[28px] font-bold ${color} drop-shadow-sm`}>{value}</div>
      <div className="text-[11px] text-[var(--color-box-text-muted)] font-medium opacity-80">{unit}</div>
    </div>
  );
}

function AlertRow({ title, resource, time, severity }: { title: string; resource: string; time: string; severity: string }) {
  const isCritical = severity === "Critical";
  return (
    <div className="flex items-start gap-4 p-3.5 rounded-xl bg-[var(--color-input-bg)] backdrop-blur-md border border-[var(--color-box-border)] hover:bg-surface-elevated/40 transition-colors shadow-inner">
      <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${isCritical ? "bg-danger/20 text-danger" : "bg-warning/20 text-warning"}`}>
        <AlertCircle size={14} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start mb-0.5">
          <h4 className="text-[14px] font-medium text-[var(--color-box-text)] truncate">{title}</h4>
          <span className="text-[11px] text-[var(--color-box-text-muted)] shrink-0 ml-2">{time}</span>
        </div>
        <div className="flex justify-between items-center">
          <p className="text-[12px] text-[var(--color-box-text-muted)] opacity-90 truncate">{resource}</p>
          <span className={`text-[11px] px-2 py-0.5 rounded border ml-2 shrink-0 ${isCritical ? "bg-danger/10 text-danger border-danger/30" : "bg-warning/10 text-warning border-warning/30"}`}>
            {severity}
          </span>
        </div>
      </div>
    </div>
  );
}

function StatusDot({ status, withLabel }: { status: string; withLabel?: boolean }) {
  const color =
    status === "healthy"
      ? "bg-success"
      : status === "degraded"
      ? "bg-warning"
      : "bg-danger";
  return (
    <div className="flex items-center gap-1.5 mt-0.5">
      <span className={`w-2 h-2 rounded-full ${color}`} />
      {withLabel && <span className={`text-[13px] capitalize font-medium ${status === "healthy" ? "text-success" : status === "degraded" ? "text-warning" : "text-danger"}`}>{status}</span>}
    </div>
  );
}

function LiveBadge() {
  return (
    <div className="flex items-center gap-1.5 text-[11px] text-success font-medium">
      <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
      LIVE
    </div>
  );
}

function Skeleton({ h }: { h: string }) {
  return <div className={`${h} w-full rounded-lg bg-surface-elevated animate-pulse`} />;
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-3 p-4 rounded-lg bg-danger/5 border border-danger/20 text-danger text-[13px]">
      <XCircle size={16} className="shrink-0" />
      <span>
        <b>Backend unreachable:</b> {message} — Ensure the Metrics API is running on port 8004.
      </span>
    </div>
  );
}
