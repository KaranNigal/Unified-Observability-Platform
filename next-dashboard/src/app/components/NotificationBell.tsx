"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Bell, AlertTriangle, CheckCircle2, XCircle, Info, X, ExternalLink } from "lucide-react";
import { metricsApi, PrometheusAlert } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import RcaButton from "./RcaButton";

interface NotificationBellProps {
  onViewAll?: () => void;
}

function timeAgo(isoString: string): string {
  try {
    const diff = Date.now() - new Date(isoString).getTime();
    const s = Math.floor(diff / 1000);
    if (s < 60) return `${s}s ago`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  } catch {
    return "—";
  }
}

function severityStyle(severity: string | undefined) {
  switch (severity?.toLowerCase()) {
    case "critical": return { dot: "bg-red-500", badge: "bg-red-500/10 text-red-400 border-red-500/20" };
    case "warning":  return { dot: "bg-amber-400", badge: "bg-amber-400/10 text-amber-300 border-amber-400/20" };
    case "info":     return { dot: "bg-blue-400",  badge: "bg-blue-400/10 text-blue-300 border-blue-400/20" };
    default:         return { dot: "bg-amber-400", badge: "bg-amber-400/10 text-amber-300 border-amber-400/20" };
  }
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ onViewAll }) => {
  const [open, setOpen] = useState(false);
  const [alerts, setAlerts] = useState<PrometheusAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const { activeTenantId } = useAuth();

  useEffect(() => {
    setAlerts([]);
    fetchAlerts();
  }, [activeTenantId]);

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await metricsApi.getAlerts();
      const firing = (data.active_alerts || []).filter((a) => a.state === "firing");
      setAlerts(firing);
      setLastFetched(new Date());
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const id = setInterval(fetchAlerts, 30_000);
    return () => clearInterval(id);
  }, [fetchAlerts]);

  useEffect(() => {
    if (open) fetchAlerts();
  }, [open, fetchAlerts]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const firingCount = alerts.length;

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={`relative w-10 h-10 rounded-xl backdrop-blur-md border transition-all flex items-center justify-center shadow-inner group ${
          open
            ? "bg-primary/10 border-primary/40"
            : "bg-[var(--color-input-bg)] border-[var(--color-box-border)] hover:border-border"
        }`}
        aria-label="Open notifications"
      >
        <Bell
          size={18}
          className={`transition-colors ${open ? "text-primary" : "text-text-secondary group-hover:text-text-primary"}`}
        />
        {firingCount > 0 ? (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold shadow-lg shadow-red-500/40 border border-background animate-pulse">
            {firingCount > 9 ? "9+" : firingCount}
          </span>
        ) : (
          <span className="absolute top-2 right-2.5 w-2 h-2 rounded-full bg-emerald-500" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+10px)] w-[360px] z-[200] rounded-2xl bg-[var(--color-box-bg)] border border-[var(--color-box-border)] shadow-2xl backdrop-blur-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-box-border)]">
            <div>
              <p className="text-[14px] font-bold text-[var(--color-box-text)]">Notifications</p>
              <p className="text-[11px] text-[var(--color-box-text-muted)] mt-0.5">
                {loading ? "Refreshing…" : lastFetched ? `Updated ${timeAgo(lastFetched.toISOString())}` : "—"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {firingCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 text-[11px] font-semibold border border-red-500/20">
                  {firingCount} firing
                </span>
              )}
              <button
                onClick={() => setOpen(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--color-box-text-muted)] hover:text-[var(--color-box-text)] hover:bg-white/5 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          <div className="max-h-[360px] overflow-y-auto">
            {loading && alerts.length === 0 ? (
              <div className="flex flex-col gap-3 p-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 rounded-xl bg-white/5 animate-pulse" />
                ))}
              </div>
            ) : alerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-[var(--color-box-text-muted)]">
                <CheckCircle2 size={32} className="text-emerald-400/60" />
                <p className="text-[13px] font-semibold text-[var(--color-box-text)]">All clear!</p>
                <p className="text-[12px]">No firing alerts for this tenant.</p>
              </div>
            ) : (
              <div className="p-3 flex flex-col gap-2">
                {alerts.map((alert, i) => {
                  const sev = alert.labels?.severity;
                  const style = severityStyle(sev);
                  const name = alert.labels?.alertname || "Alert";
                  const summary = alert.annotations?.summary || alert.labels?.job || "—";
                  const since = timeAgo(alert.activeAt);
                  return (
                    <div
                      key={i}
                      className="flex items-start gap-3 p-3.5 rounded-xl border border-white/6 hover:bg-white/5 transition-colors"
                      style={{ background: "rgba(255,255,255,0.03)" }}
                    >
                      <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${style.dot}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[13px] font-semibold text-[var(--color-box-text)] truncate">{name}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-md border font-mono uppercase shrink-0 ${style.badge}`}>
                            {sev || "warn"}
                          </span>
                        </div>
                        <p className="text-[12px] text-[var(--color-box-text-muted)] truncate">{summary}</p>
                        {alert.labels?.job && (
                          <p className="text-[11px] text-[var(--color-box-text-muted)]/60 font-mono mt-0.5 truncate">
                            job: {alert.labels.job}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className="text-[11px] text-[var(--color-box-text-muted)] shrink-0 mt-0.5 whitespace-nowrap">{since}</span>
                        <div onClick={(e) => e.stopPropagation()}>
                          <RcaButton incidentType="alert" identifier={name} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="px-4 py-3 border-t border-[var(--color-box-border)] flex items-center justify-between">
            <button
              onClick={() => fetchAlerts()}
              className="text-[12px] text-[var(--color-box-text-muted)] hover:text-[var(--color-box-text)] transition-colors"
            >
              ↻ Refresh
            </button>
            <button
              onClick={() => { setOpen(false); onViewAll?.(); }}
              className="flex items-center gap-1.5 text-[12px] font-semibold text-primary hover:text-primary/80 transition-colors"
            >
              View all alerts <ExternalLink size={12} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
