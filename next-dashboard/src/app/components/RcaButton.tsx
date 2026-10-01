"use client";

import React, { useState } from "react";

interface RcaButtonProps {
  incidentType: string;
  identifier: string;
}

export default function RcaButton({ incidentType, identifier }: RcaButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rcaData, setRcaData] = useState<{
    explanation: string;
    root_cause: string;
    troubleshooting_steps: string[];
  } | null>(null);

  const handleAnalyze = async () => {
    setIsOpen(true);
    setLoading(true);
    setRcaData(null);

    try {
      const token = localStorage.getItem("capsule_auth_token");
      const res = await fetch("http://localhost:8004/api/v1/rca/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          incident_type: incidentType,
          identifier,
          time_window: "15m",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setRcaData(data);
      } else {
        setRcaData({
          explanation: "Failed to generate RCA due to an API error.",
          root_cause: "Could not reach the RCA engine.",
          troubleshooting_steps: ["Check network connectivity.", "Verify API is running."],
        });
      }
    } catch (err) {
      setRcaData({
        explanation: "Failed to generate RCA due to a network error.",
        root_cause: "Network timeout or CORS issue.",
        troubleshooting_steps: ["Check browser console for errors."],
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={handleAnalyze}
        className="inline-flex items-center justify-center space-x-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-300 text-sm font-medium px-3 py-1.5 rounded-md shadow-sm transition-all duration-200"
      >
        <span>✨ Auto-Analyze</span>
      </button>

      {/* Slide-over Panel */}
      {isOpen && (
        <div className="fixed inset-0 z-[999] overflow-hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={() => setIsOpen(false)} />
          <div className="fixed inset-y-0 right-0 max-w-md w-full flex bg-gray-900 border-l border-gray-800 shadow-2xl transition-transform transform translate-x-0">
            <div className="h-full flex flex-col flex-1 p-6 overflow-y-auto">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                    ✨ AI Root Cause Analysis
                  </h2>
                  <p className="text-sm text-gray-400 mt-1 break-all font-mono">
                    Target: {identifier}
                  </p>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center flex-1 space-y-4">
                  <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
                  <p className="text-gray-400 text-sm animate-pulse">Correlating telemetry logs & traces...</p>
                </div>
              ) : rcaData ? (
                <div className="space-y-6">
                  <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700/50">
                    <h3 className="text-sm font-medium text-gray-300 uppercase tracking-wider mb-2">What Happened</h3>
                    <p className="text-gray-100 text-sm leading-relaxed">{rcaData.explanation}</p>
                  </div>
                  
                  <div className="bg-red-900/20 p-4 rounded-lg border border-red-500/20">
                    <h3 className="text-sm font-medium text-red-400 uppercase tracking-wider mb-2">Root Cause</h3>
                    <p className="text-gray-100 text-sm leading-relaxed">{rcaData.root_cause}</p>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-indigo-400 uppercase tracking-wider mb-3">Recommended Actions</h3>
                    <ul className="space-y-3">
                      {rcaData.troubleshooting_steps.map((step, idx) => (
                        <li key={idx} className="flex gap-3 text-sm text-gray-300 bg-gray-800/50 p-3 rounded-lg border border-gray-700/50">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs">
                            {idx + 1}
                          </span>
                          <span className="mt-0.5">{step}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
