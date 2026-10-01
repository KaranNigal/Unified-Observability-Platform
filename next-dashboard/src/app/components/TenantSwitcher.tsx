"use client";

import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";

export const TenantSwitcher: React.FC = () => {
  const {
    user,
    activeTenantId,
    activeOrgName,
    activeOrgId,
    currentRole,
    isViewer,
    canManageSettings,
    organizations,
    isAuthenticated,
    logout,
    switchTenant,
    setIsOnboardingOpen,
    setIsAuthModalOpen,
    setAuthModalMode,
  } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="flex items-center gap-3 relative" ref={dropdownRef}>
      {/* Role Badge / Onboarding Wizard Action Button */}
      {canManageSettings ? (
        <button
          onClick={() => setIsOnboardingOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-500/10 to-cyan-500/10 hover:from-indigo-500/20 hover:to-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-semibold shadow-sm transition"
        >
          <span className="text-cyan-400">⚡</span>
          <span>Onboarding Wizard</span>
        </button>
      ) : (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] font-medium">
          <span>👁️</span>
          <span>Viewer (Read Only)</span>
        </div>
      )}

      {/* Tenant Selector Button */}
      <div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700/80 text-xs font-medium transition shadow-sm"
        >
          <div className="w-5 h-5 rounded-md bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-[10px] text-indigo-300 font-bold">
            🏢
          </div>
          <div className="text-left">
            <div className="font-semibold text-xs text-white leading-tight flex items-center gap-1.5">
              <span>{activeOrgName}</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                {activeTenantId}
              </span>
            </div>
          </div>
          <svg
            className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute right-0 top-full mt-2 w-72 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-2 z-50 text-slate-200 space-y-2 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-3 py-2 border-b border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">
                Organizations & Tenancy
              </span>
              <p className="text-xs text-slate-400 mt-0.5">
                Switch tenant context to isolate telemetry queries & pipelines.
              </p>
            </div>

            <div className="space-y-1 max-h-48 overflow-y-auto">
              {organizations.map((org) => {
                const isActive = org.id === activeOrgId || org.tenant_id === activeTenantId;
                return (
                  <button
                    key={org.id}
                    onClick={async () => {
                      if (!isActive) {
                        await switchTenant(org.id);
                      }
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-left transition ${
                      isActive
                        ? "bg-indigo-600/20 border border-indigo-500/40 text-white font-semibold"
                        : "hover:bg-slate-800/60 text-slate-300"
                    }`}
                  >
                    <div>
                      <div className="text-xs font-semibold text-white">{org.name}</div>
                      <div className="text-[11px] font-mono text-cyan-400">{org.tenant_id}</div>
                    </div>
                    {isActive && (
                      <span className="text-xs text-indigo-400">✓ Active</span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="pt-2 border-t border-slate-800 space-y-1">
              <button
                onClick={() => {
                  setIsOpen(false);
                  setAuthModalMode("signup");
                  setIsAuthModalOpen(true);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-indigo-300 hover:bg-indigo-950/40 transition font-medium"
              >
                <span>+</span> Create New Organization
              </button>
              
              {isAuthenticated ? (
                <div className="pt-1 flex items-center justify-between px-3 py-1.5 text-xs text-slate-400 bg-slate-950/40 rounded-lg border border-slate-800/60">
                  <span className="truncate max-w-[130px]">{user?.email}</span>
                  <button
                    onClick={() => {
                      logout();
                      setIsOpen(false);
                      setAuthModalMode("login");
                      setIsAuthModalOpen(true);
                    }}
                    className="text-red-400 hover:text-red-300 font-semibold text-[11px]"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setIsOpen(false);
                    setAuthModalMode("login");
                    setIsAuthModalOpen(true);
                  }}
                  className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow transition text-center block"
                >
                  Sign In / Switch Account
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* User Login/Profile Pill */}
      {!isAuthenticated ? (
        <button
          onClick={() => {
            setAuthModalMode("login");
            setIsAuthModalOpen(true);
          }}
          className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition"
        >
          Sign In
        </button>
      ) : (
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-md">
          {user?.name?.[0]?.toUpperCase() || "U"}
        </div>
      )}
    </div>
  );
};
