"use client";

import React, { useState, useEffect } from "react";
import { Activity, Server, RefreshCw, ExternalLink, Code2, Database, Zap } from "lucide-react";
import { metricsApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export function MetricsPage() {
  const { activeTenantId } = useAuth();
  const [activeView, setActiveView] = useState<"raw" | "prometheus">("raw");
  const [activeTab, setActiveTab] = useState<"airflow" | "pyspark" | "microservice" | "kafka-trading">("microservice");
  const [metricsData, setMetricsData] = useState<any>(null);
  const [isConfigured, setIsConfigured] = useState(true);
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMetricsData(null); // Clear old tenant's data
    // Demo tenant is always configured
    if (activeTenantId?.includes("demo") || activeTenantId?.includes("acme")) {
      setIsConfigured(true);
    } else {
      const configured = localStorage.getItem(`prom_configured_${activeTenantId}`);
      setIsConfigured(configured === "true");
    }
  }, [activeTenantId]);

  const handleConfigure = () => {
    setIsConfiguring(true);
    setTimeout(() => {
      localStorage.setItem(`prom_configured_${activeTenantId}`, "true");
      setIsConfigured(true);
      setIsConfiguring(false);
      fetchMetrics(activeTab); // fetch immediately after config
    }, 1500);
  };

  const fetchMetrics = async (component: string) => {
    if (!isConfigured) return;
    setLoading(true);
    setError(null);
    try {
      const data = await metricsApi.getRawMetrics(component);
      setMetricsData(data);
    } catch (err: any) {
      setError(err.message || "Failed to load metrics");
      setMetricsData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeView === "raw" && isConfigured) {
      fetchMetrics(activeTab);
      const interval = setInterval(() => fetchMetrics(activeTab), 15000);
      return () => clearInterval(interval);
    }
  }, [activeTab, activeTenantId, activeView, isConfigured]);

  const tabs = [
    { id: "microservice", label: "Microservices", icon: <Server size={16} /> },
    { id: "airflow", label: "Airflow DAGs", icon: <Database size={16} /> },
    { id: "pyspark", label: "PySpark Jobs", icon: <Zap size={16} /> },
    { id: "kafka-trading", label: "Kafka Streaming", icon: <Activity size={16} /> },
  ];

  const promUrl = `http://localhost:9090/graph?g0.expr=${encodeURIComponent(`{tenant_id="${activeTenantId}"}`)}&g0.tab=0&g0.stacked=0&g0.show_exemplars=0&g0.range_input=1h`;

  if (!isConfigured) {
    return (
      <div className="px-8 pb-12 pt-6 flex flex-col min-h-screen">
        <div className="flex-1 mt-12 bg-surface relative rounded-xl overflow-hidden border border-border flex flex-col items-center justify-center p-12 text-center shadow-xl max-w-2xl mx-auto w-full">
          <div className="w-16 h-16 rounded-2xl bg-[#E6522C]/10 flex items-center justify-center mb-5 border border-[#E6522C]/20">
            <Activity size={32} className="text-[#E6522C]" />
          </div>
          <h2 className="text-xl font-bold text-text-primary mb-2">Configure Prometheus Metrics</h2>
          <p className="text-text-secondary text-sm max-w-md mx-auto leading-relaxed mb-8">
            Prometheus ingestion rules and recording rules have not been provisioned for the <span className="font-mono text-[#E6522C] bg-[#E6522C]/10 px-1.5 py-0.5 rounded mx-1">{activeTenantId}</span> tenant yet.
          </p>
          <button
            onClick={handleConfigure}
            disabled={isConfiguring}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white font-semibold transition-all shadow-lg shadow-primary/20 disabled:opacity-70"
          >
            {isConfiguring ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                Provisioning Rules...
              </>
            ) : (
              <>
                <Database size={16} />
                Configure Tenant Rules
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-8 pb-12 pt-6 flex flex-col min-h-screen space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-[22px] font-bold text-text-primary tracking-tight">
                Live Telemetry Metrics
              </h1>
              <p className="text-[13px] text-text-muted mt-0.5">
                Raw structured Prometheus metrics streams, filtered by your organization's tenant context.
              </p>
            </div>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center p-1 bg-[var(--color-input-bg)] border border-[var(--color-box-border)] rounded-xl">
          <button
            onClick={() => setActiveView("raw")}
            className={`px-4 py-1.5 text-[13px] font-medium rounded-lg transition-all ${
              activeView === "raw"
                ? "bg-primary text-white shadow-md"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            Raw Streams
          </button>
          <button
            onClick={() => setActiveView("prometheus")}
            className={`px-4 py-1.5 text-[13px] font-medium rounded-lg transition-all ${
              activeView === "prometheus"
                ? "bg-primary text-white shadow-md"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            Prometheus Console
          </button>
        </div>
      </div>

      {activeView === "raw" ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="lg:col-span-1 flex flex-col gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-[13px] text-left border ${
                  activeTab === tab.id
                    ? "bg-primary/10 border-primary/30 text-primary"
                    : "bg-surface border-border/50 text-text-secondary hover:text-text-primary hover:bg-surface-elevated hover:border-border"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
            
            <div className="mt-4 p-4 rounded-xl bg-surface border border-border/50">
              <h3 className="text-[12px] font-semibold text-text-primary mb-2 flex items-center gap-2">
                <Code2 size={14} className="text-primary" /> PromQL Context
              </h3>
              <p className="text-[11px] text-text-muted mb-3 leading-relaxed">
                All metrics shown are automatically scoped to your tenant via the backend API.
              </p>
              <div className="px-3 py-2 rounded-lg bg-black/40 border border-white/5 font-mono text-[10px] text-emerald-400/90 break-all overflow-hidden">
                tenant_id="{activeTenantId}"
              </div>
            </div>
          </div>

          <div className="lg:col-span-3 bg-[var(--color-box-bg)] backdrop-blur-xl border border-[var(--color-box-border)] rounded-2xl shadow-xl overflow-hidden min-h-[500px] flex flex-col relative">
            <div className="px-5 py-3 border-b border-[var(--color-box-border)] bg-black/20 flex items-center justify-between">
              <h2 className="text-[14px] font-semibold text-[var(--color-box-text)] flex items-center gap-2">
                Raw Metric Streams: <span className="text-primary">{activeTab}</span>
              </h2>
              <div className="flex items-center gap-2">
                {loading && <span className="text-[11px] text-primary animate-pulse font-medium mr-2">Fetching live data...</span>}
                <button
                  onClick={() => fetchMetrics(activeTab)}
                  disabled={loading}
                  className="w-7 h-7 flex items-center justify-center rounded-lg bg-surface-elevated hover:bg-surface border border-border text-text-muted hover:text-text-primary transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-primary" : ""}`} />
                </button>
              </div>
            </div>

            <div className="flex-1 p-0 overflow-hidden relative">
              {error ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-red-500/5">
                  <p className="text-red-400 font-semibold mb-2">Failed to fetch metrics</p>
                  <p className="text-red-400/70 text-[13px]">{error}</p>
                </div>
              ) : !metricsData ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <RefreshCw className="w-8 h-8 text-primary/30 animate-spin" />
                </div>
              ) : Object.keys(metricsData).length === 0 ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
                  <p className="text-text-muted font-medium mb-1">No metrics available</p>
                  <p className="text-text-muted/60 text-[12px]">The Prometheus query returned empty results for this tenant.</p>
                </div>
              ) : (
                <div className="absolute inset-0 overflow-auto bg-[#0d1117] p-5">
                  <pre className="text-[12px] font-mono leading-relaxed">
                    {Object.entries(metricsData).map(([metricName, metricData]: [string, any]) => (
                      <div key={metricName} className="mb-6">
                        <div className="text-emerald-400 font-bold mb-2 pb-1 border-b border-white/10 select-none">
                          # TYPE {metricName} untyped
                        </div>
                        {(!metricData || metricData.length === 0) ? (
                          <div className="text-white/30 italic pl-4">No data series</div>
                        ) : (
                          metricData.map((series: any, idx: number) => {
                            // Format labels string
                            const labelsObj = series.metric || {};
                            const labels = Object.entries(labelsObj)
                              .map(([k, v]) => `${k}="${v}"`)
                              .join(", ");
                            
                            // Format value string
                            const val = Array.isArray(series.value) ? series.value[1] : series.value;
                            const ts = Array.isArray(series.value) ? series.value[0] : "";
                            
                            return (
                              <div key={idx} className="pl-4 hover:bg-white/5 transition-colors py-0.5 rounded">
                                <span className="text-blue-300">{metricName}</span>
                                {labels && <span className="text-purple-300">{`{${labels}}`}</span>}
                                <span className="text-yellow-300 ml-3">{val}</span>
                                {ts && <span className="text-white/40 ml-3 text-[10px]">{Math.floor(ts * 1000)}</span>}
                              </div>
                            );
                          })
                        )}
                      </div>
                    ))}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 bg-[var(--color-box-bg)] backdrop-blur-xl border border-[var(--color-box-border)] rounded-2xl shadow-xl overflow-hidden flex flex-col min-h-[600px] animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="px-5 py-3 border-b border-[var(--color-box-border)] flex items-center justify-between bg-black/20">
            <div className="flex items-center gap-2">
              <Activity size={16} className="text-[#E6522C]" />
              <h2 className="text-[14px] font-semibold text-[var(--color-box-text)]">Native Prometheus UI</h2>
            </div>
            <a
              href={promUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-[12px] font-semibold text-[#E6522C] hover:text-[#E6522C]/80 transition-colors"
            >
              Open in new tab <ExternalLink size={14} />
            </a>
          </div>
          <iframe 
            src={promUrl} 
            className="flex-1 w-full bg-white" 
            title="Prometheus Console"
          />
        </div>
      )}
    </div>
  );
}
