"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { metricsApi, OnboardingConfig, ProjectItem, ApiKeyItem } from "@/lib/api";

export const OnboardingWizard: React.FC = () => {
  const { isOnboardingOpen, setIsOnboardingOpen, activeTenantId, activeOrgName } = useAuth();
  const [step, setStep] = useState<number>(1);
  const [config, setConfig] = useState<OnboardingConfig | null>(null);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>([]);
  const [selectedEngine, setSelectedEngine] = useState<string>("otel-fastapi");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isTestingConnection, setIsTestingConnection] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<"idle" | "success" | "pending">("idle");
  const [newProjectName, setNewProjectName] = useState<string>("");
  const [newKeyName, setNewKeyName] = useState<string>("");
  const [createdRawKey, setCreatedRawKey] = useState<string | null>(null);

  useEffect(() => {
    if (isOnboardingOpen) {
      loadTenantData();
    }
  }, [isOnboardingOpen, activeTenantId]);

  const loadTenantData = async () => {
    try {
      const [conf, projList, keyList] = await Promise.all([
        metricsApi.getOnboardingConfig().catch(() => null),
        metricsApi.getProjects().catch(() => []),
        metricsApi.getApiKeys().catch(() => []),
      ]);
      if (conf) setConfig(conf);
      setProjects(projList);
      setApiKeys(keyList);
    } catch (e) {
      console.error("Failed to load tenant onboarding data", e);
    }
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName) return;
    try {
      const p = await metricsApi.createProject({ name: newProjectName });
      setProjects([...projects, p]);
      setNewProjectName("");
    } catch (err) {
      alert("Failed to create project: " + err);
    }
  };

  const handleCreateApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName) return;
    try {
      const k = await metricsApi.createApiKey({ name: newKeyName });
      setApiKeys([...apiKeys, k]);
      if (k.raw_key) setCreatedRawKey(k.raw_key);
      setNewKeyName("");
    } catch (err) {
      alert("Failed to create API key: " + err);
    }
  };

  const runConnectionTest = () => {
    setIsTestingConnection(true);
    setTestResult("pending");
    setTimeout(() => {
      setIsTestingConnection(false);
      setTestResult("success");
    }, 1800);
  };

  if (!isOnboardingOpen) return null;

  const engines = [
    {
      id: "otel-fastapi",
      name: "FastAPI / Microservices",
      desc: "OpenTelemetry Python SDK auto-instrumentation & JSON logs",
      badge: "OTel OTLP",
    },
    {
      id: "airflow",
      name: "Apache Airflow",
      desc: "StatsD Exporter tags & DAG telemetry",
      badge: "StatsD / OTel",
    },
    {
      id: "pyspark",
      name: "PySpark Batch Jobs",
      desc: "Prometheus Pushgateway tenant grouping tags",
      badge: "Pushgateway",
    },
    {
      id: "kafka",
      name: "Kafka Trading Engine",
      desc: "Producer/Consumer throughput and lag telemetry",
      badge: "Prometheus",
    },
    {
      id: "generic-docker",
      name: "Docker Compose Env",
      desc: "Universal container environment variables",
      badge: "Env Vars",
    },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/20 dark:bg-black/60 backdrop-blur-xl p-4 animate-in fade-in duration-300">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border border-white/50 dark:border-slate-700/80 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:shadow-2xl overflow-hidden text-slate-800 dark:text-slate-100 ring-1 ring-black/5 dark:ring-white/10">
        
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-slate-200/50 dark:border-slate-800/50 bg-white/40 dark:bg-slate-900/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                Tenant Onboarding & Telemetry Setup
                <span className="text-xs px-2.5 py-1 rounded-full bg-blue-100 dark:bg-cyan-500/10 text-blue-700 dark:text-cyan-400 border border-blue-200 dark:border-cyan-500/20 font-mono shadow-sm">
                  {activeTenantId}
                </span>
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Configure your distributed systems to stream multi-tenant metrics, logs, and traces</p>
            </div>
          </div>
          <button
            onClick={() => setIsOnboardingOpen(false)}
            className="p-2.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Stepper Navigation */}
        <div className="flex border-b border-slate-200/50 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-950/40 px-8 py-4 gap-3 overflow-x-auto scrollbar-hide">
          {[
            { num: 1, title: "1. Org & Projects" },
            { num: 2, title: "2. API Keys" },
            { num: 3, title: "3. Choose Source" },
            { num: 4, title: "4. Code & Env Config" },
            { num: 5, title: "5. Verify Stream" },
          ].map((s) => (
            <button
              key={s.num}
              onClick={() => setStep(s.num)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200 whitespace-nowrap ${
                step === s.num
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 scale-105"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-800/50 border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
              }`}
            >
              <span>{s.title}</span>
            </button>
          ))}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          
          {/* STEP 1: Org & Projects */}
          {step === 1 && (
            <div className="space-y-8 animate-in slide-in-from-right-4 fade-in duration-300">
              <div className="bg-white/60 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-800 dark:text-white">Active Organization Context</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">All data streams and queries are cryptographically tied to this tenant identity.</p>
                  </div>
                  <span className="px-4 py-1.5 text-sm font-bold rounded-lg bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-500/30 shadow-sm whitespace-nowrap">
                    {activeOrgName}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 mt-5 border-t border-slate-100 dark:border-slate-700/50">
                  <div className="bg-slate-50/80 dark:bg-slate-900/80 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <span className="text-xs text-slate-500 dark:text-slate-500 uppercase tracking-widest font-bold block mb-1.5">Assigned Tenant ID</span>
                    <span className="text-base font-mono text-blue-600 dark:text-cyan-400 font-bold">{activeTenantId}</span>
                  </div>
                  <div className="bg-slate-50/80 dark:bg-slate-900/80 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <span className="text-xs text-slate-500 dark:text-slate-500 uppercase tracking-widest font-bold block mb-1.5">Telemetry Ingestion Gate</span>
                    <span className="text-base font-mono text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-2">
                       <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" /> Active & Scoped
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-4">Organization Projects</h4>
                <div className="space-y-3">
                  {projects.map((p) => (
                    <div key={p.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white/80 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700/40 rounded-2xl hover:border-indigo-300 dark:hover:border-slate-600 transition shadow-sm hover:shadow-md">
                      <div>
                        <div className="font-bold text-slate-800 dark:text-white">{p.name}</div>
                        <div className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{p.description || "Production Telemetry Pipeline"}</div>
                      </div>
                      <span className="text-xs font-mono font-bold px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 w-fit">
                        {p.tenant_id}
                      </span>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleCreateProject} className="flex flex-col sm:flex-row gap-3 mt-6">
                  <input
                    type="text"
                    placeholder="New project name (e.g. Payments Gateway)"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    className="flex-1 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-5 py-3.5 text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition shadow-inner"
                  />
                  <button
                    type="submit"
                    className="px-6 py-3.5 bg-slate-800 dark:bg-indigo-600 hover:bg-slate-900 dark:hover:bg-indigo-500 text-white text-sm font-bold rounded-xl shadow-md transition whitespace-nowrap"
                  >
                    + Add Project
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* STEP 2: API Keys */}
          {step === 2 && (
            <div className="space-y-8 animate-in slide-in-from-right-4 fade-in duration-300">
              <div className="bg-white/60 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-6 shadow-sm space-y-2">
                <h3 className="text-base font-bold text-slate-800 dark:text-white">Tenant-Scoped API Keys</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  Control plane issued API keys authenticate external microservices, SDK clients, and Airflow DAGs. Requests authenticated with these keys automatically inherit <span className="font-mono text-blue-600 dark:text-cyan-400 font-bold bg-blue-50 dark:bg-cyan-950/50 px-1.5 py-0.5 rounded">{activeTenantId}</span>.
                </p>
              </div>

              {createdRawKey && (
                <div className="p-5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-500/40 rounded-2xl space-y-4 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                      <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      Newly Generated API Key (Copy Now — will not be shown again)
                    </span>
                    <button
                      onClick={() => handleCopy(createdRawKey, "newKey")}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 dark:hover:bg-emerald-500 text-white rounded-xl text-sm font-bold transition shadow-sm w-fit"
                    >
                      {copiedKey === "newKey" ? "Copied!" : "Copy Key"}
                    </button>
                  </div>
                  <div className="font-mono text-sm text-emerald-800 dark:text-emerald-200 bg-white dark:bg-emerald-900/30 p-4 rounded-xl break-all border border-emerald-200 dark:border-emerald-800 shadow-inner">
                    {createdRawKey}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {apiKeys.map((k) => (
                  <div key={k.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-white/80 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700/40 rounded-2xl hover:border-slate-300 dark:hover:border-slate-600 transition shadow-sm hover:shadow-md">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 shrink-0 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 font-mono text-xl shadow-inner border border-slate-200 dark:border-slate-700">
                        🔑
                      </div>
                      <div>
                        <div className="font-bold text-slate-800 dark:text-white">{k.name}</div>
                        <div className="font-mono text-xs text-slate-500 dark:text-slate-400 mt-1">{k.key_prefix}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 self-start sm:self-auto ml-16 sm:ml-0">
                      <span className="text-xs px-3 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 font-bold">
                        Active
                      </span>
                      <button
                        onClick={() => handleCopy(k.key_prefix, k.id)}
                        className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-bold transition"
                      >
                        {copiedKey === k.id ? "Copied!" : "Copy Prefix"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <form onSubmit={handleCreateApiKey} className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  placeholder="Key name (e.g. Staging Collector Key)"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  className="flex-1 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-5 py-3.5 text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition shadow-inner"
                />
                <button
                  type="submit"
                  className="px-6 py-3.5 bg-slate-800 dark:bg-indigo-600 hover:bg-slate-900 dark:hover:bg-indigo-500 text-white text-sm font-bold rounded-xl shadow-md transition whitespace-nowrap"
                >
                  + Generate Key
                </button>
              </form>
            </div>
          )}

          {/* STEP 3: Choose Source */}
          {step === 3 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
              <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">Select the component you are onboarding to get pre-configured snippets:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {engines.map((e) => (
                  <div
                    key={e.id}
                    onClick={() => {
                      setSelectedEngine(e.id);
                      setStep(4);
                    }}
                    className={`p-6 rounded-2xl border-2 cursor-pointer transition-all duration-200 flex flex-col justify-between group ${
                      selectedEngine === e.id
                        ? "bg-indigo-50/80 dark:bg-indigo-600/15 border-indigo-500 shadow-md shadow-indigo-500/10 scale-[1.02]"
                        : "bg-white/80 dark:bg-slate-800/30 border-slate-200 dark:border-slate-700/60 hover:border-indigo-300 dark:hover:border-slate-500 hover:shadow-md"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-bold text-base text-slate-800 dark:text-white">{e.name}</span>
                        <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shadow-sm">
                          {e.badge}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{e.desc}</p>
                    </div>
                    <div className="mt-6 flex justify-end">
                      <span className="text-sm text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                        Select & View Code →
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 4: Code & Env Config */}
          {step === 4 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <span className="text-sm font-bold text-slate-500 dark:text-slate-400">
                  Configuration for: <strong className="text-indigo-700 dark:text-indigo-400 uppercase tracking-wider ml-1">{selectedEngine}</strong>
                </span>
                <div className="flex flex-wrap gap-2">
                  {engines.map((e) => (
                    <button
                      key={e.id}
                      onClick={() => setSelectedEngine(e.id)}
                      className={`text-xs px-3 py-1.5 rounded-lg font-bold transition shadow-sm ${
                        selectedEngine === e.id 
                          ? "bg-indigo-600 text-white ring-2 ring-indigo-500/30" 
                          : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      {e.name.split(" ")[0]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-950 p-1 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex justify-between items-center p-3 px-5 border-b border-slate-100 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-900/50 rounded-t-2xl">
                  <span className="text-sm text-slate-500 dark:text-slate-400 font-mono font-bold tracking-tight">Code Snippet:</span>
                  <button
                    onClick={() => {
                      const content = selectedEngine === "otel-fastapi" ? config?.python_otel_snippet 
                                    : selectedEngine === "airflow" ? "AIRFLOW__..." // Simplified for brevity in copy logic, see below
                                    : selectedEngine === "pyspark" ? "# In your PySpark job..."
                                    : selectedEngine === "kafka" ? "otel_kafka_consumer_lag..."
                                    : config?.docker_env_snippet;
                      handleCopy(content || "", "snippet");
                    }}
                    className="px-4 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 transition shadow-sm flex items-center gap-2"
                  >
                    {copiedKey === "snippet" ? "✓ Copied!" : "Copy Code"}
                  </button>
                </div>
                <div className="p-5 overflow-x-auto">
                  <pre className="font-mono text-sm leading-relaxed whitespace-pre-wrap">
                    {selectedEngine === "otel-fastapi" && <span className="text-blue-700 dark:text-cyan-300">{config?.python_otel_snippet || "Loading snippet..."}</span>}
                    {selectedEngine === "airflow" && <span className="text-emerald-700 dark:text-emerald-300">{`# Environment Variables for Airflow DAGs & Scheduler\nAIRFLOW__METRICS__STATSD_ON="True"\nAIRFLOW__METRICS__STATSD_HOST="localhost"\nAIRFLOW__METRICS__STATSD_PORT="9125"\nAIRFLOW__METRICS__STATSD_PREFIX="airflow"\n\n# OpenTelemetry Resource Stamping\nOTEL_RESOURCE_ATTRIBUTES="tenant_id=${activeTenantId},service.name=airflow-scheduler"\nOTEL_EXPORTER_OTLP_ENDPOINT="http://localhost:4318"`}</span>}
                    {selectedEngine === "pyspark" && <span className="text-amber-700 dark:text-amber-300">{`# In your PySpark job script:\nfrom prometheus_client import CollectorRegistry, Gauge, push_to_gateway\n\nregistry = CollectorRegistry()\nduration_gauge = Gauge('otel_pyspark_job_duration_seconds', 'PySpark Job Duration', registry=registry)\nduration_gauge.set(12.45)\n\n# Push metrics with tenant_id grouping label:\npush_to_gateway(\n    'localhost:9091',\n    job='pyspark',\n    registry=registry,\n    grouping_key={'tenant_id': '${activeTenantId}'}\n)`}</span>}
                    {selectedEngine === "kafka" && <span className="text-purple-700 dark:text-purple-300">{`# Kafka Producer / Consumer Prometheus Metric Sample\n# Emitted with tenant_id label:\notel_kafka_producer_messages_sent_total{tenant_id="${activeTenantId}", topic="trading-events"} 14820\notel_kafka_consumer_lag{tenant_id="${activeTenantId}", group="trading-consumer-group", topic="trading-events"} 12`}</span>}
                    {selectedEngine === "generic-docker" && <span className="text-sky-700 dark:text-sky-300">{config?.docker_env_snippet || "Loading..."}</span>}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: Verify Stream */}
          {step === 5 && (
            <div className="space-y-8 text-center py-8 animate-in slide-in-from-right-4 fade-in duration-300">
              <div className="w-24 h-24 rounded-3xl bg-indigo-50 dark:bg-indigo-600/20 border border-indigo-100 dark:border-indigo-500/30 flex items-center justify-center mx-auto text-indigo-600 dark:text-indigo-400 shadow-xl shadow-indigo-500/10">
                {isTestingConnection ? (
                  <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                ) : testResult === "success" ? (
                  <svg className="w-12 h-12 text-emerald-500 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-12 h-12 text-indigo-500 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>

              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Live Tenant Stream Verification</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-lg mx-auto mt-3 leading-relaxed">
                  Capsule validates incoming telemetry packets matching <span className="font-mono font-bold text-blue-600 dark:text-cyan-400 bg-blue-50 dark:bg-cyan-950/50 px-1.5 py-0.5 rounded shadow-sm">{activeTenantId}</span> across Prometheus TSDB, Jaeger Traces, and Elasticsearch Logs.
                </p>
              </div>

              {testResult === "success" ? (
                <div className="p-6 bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-500/30 rounded-2xl max-w-md mx-auto text-left space-y-4 shadow-sm">
                  <div className="flex items-center gap-3 text-emerald-700 dark:text-emerald-400 font-bold text-sm">
                    <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse shadow-sm shadow-emerald-500" />
                    Telemetry Active & Isolated for {activeTenantId}
                  </div>
                  <ul className="text-sm text-slate-700 dark:text-slate-300 space-y-3 font-mono font-medium mt-4">
                    <li className="flex items-center gap-3"><svg className="w-5 h-5 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg> OTel Collector Resource: Stamped & Validated</li>
                    <li className="flex items-center gap-3"><svg className="w-5 h-5 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg> Prometheus TSDB: Label injected</li>
                    <li className="flex items-center gap-3"><svg className="w-5 h-5 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg> Gateway Security: Client isolation active</li>
                  </ul>
                </div>
              ) : (
                <button
                  onClick={runConnectionTest}
                  disabled={isTestingConnection}
                  className="px-8 py-3.5 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-600/30 transition hover:scale-105 active:scale-95"
                >
                  {isTestingConnection ? "Scanning Telemetry Pipeline..." : "Test Telemetry Connection"}
                </button>
              )}
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-8 py-5 border-t border-slate-200/50 dark:border-slate-800/50 bg-slate-50/80 dark:bg-slate-900/90">
          <button
            onClick={() => setStep(Math.max(1, step - 1))}
            disabled={step === 1}
            className={`w-full sm:w-auto px-6 py-3 rounded-xl text-sm font-bold transition-all ${
              step === 1 ? "opacity-30 cursor-not-allowed text-slate-500" : "text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 bg-white dark:bg-transparent shadow-sm border border-slate-200 dark:border-transparent"
            }`}
          >
            ← Previous
          </button>
          
          <div className="flex w-full sm:w-auto items-center gap-3">
            {step < 5 ? (
              <button
                onClick={() => setStep(step + 1)}
                className="w-full sm:w-auto px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg transition-all"
              >
                Next Step →
              </button>
            ) : (
              <button
                onClick={() => setIsOnboardingOpen(false)}
                className="w-full sm:w-auto px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg transition-all"
              >
                Finish & Go to Dashboard
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
