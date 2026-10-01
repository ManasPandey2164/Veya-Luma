import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchHealth } from '../services/api';
import { CheckCircle2, AlertTriangle, RefreshCw, Database, Server } from 'lucide-react';

export const HealthStatus: React.FC = () => {
  const { data, error, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['systemHealth'],
    queryFn: fetchHealth,
    refetchInterval: 15000,
  });

  return (
    <div className="glass-card rounded-2xl p-6 w-full max-w-xl mx-auto border border-white/10 shadow-xl transition-all">
      <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
        <div className="flex items-center gap-2.5">
          <Server className="w-5 h-5 text-luminous-cyan" />
          <h3 className="font-editorial text-lg font-semibold text-white">System Connectivity & Health</h3>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all disabled:opacity-50"
          title="Refresh Health Status"
        >
          <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin text-luminous-cyan' : ''}`} />
        </button>
      </div>

      {isLoading && (
        <div className="py-6 flex items-center justify-center gap-3 text-slate-400">
          <RefreshCw className="w-5 h-5 animate-spin text-luminous-cyan" />
          <span className="text-sm">Connecting to Veya Luma Backend (port 8000)...</span>
        </div>
      )}

      {isError && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/30 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-200">Backend Connection Unreachable</p>
            <p className="text-xs text-red-300/80 mt-1">
              {error instanceof Error ? error.message : 'Unable to connect to http://localhost:8000'}
            </p>
            <p className="text-xs text-slate-400 mt-2">
              Ensure FastAPI backend is running via <code className="bg-black/40 px-1.5 py-0.5 rounded text-luminous-cyan">uvicorn app.main:app --port 8000</code>
            </p>
          </div>
        </div>
      )}

      {data && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {/* Service Status */}
            <div className="p-3 rounded-xl bg-obsidian-void/60 border border-white/5">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                API Service
              </span>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-luminous-teal" />
                <span className="text-sm font-semibold capitalize text-white">{data.status}</span>
                <span className="text-xs text-slate-400">v{data.version}</span>
              </div>
            </div>

            {/* Database Status */}
            <div className="p-3 rounded-xl bg-obsidian-void/60 border border-white/5">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                PostgreSQL
              </span>
              <div className="flex items-center gap-2">
                <Database className={`w-4 h-4 ${data.database === 'connected' ? 'text-luminous-teal' : 'text-amber-400'}`} />
                <span className="text-sm font-semibold capitalize text-white">{data.database}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400 px-1 pt-1">
            <span>Environment: <strong className="text-slate-200 capitalize">{data.environment}</strong></span>
            <span>Verified: <strong className="text-slate-200">{new Date(data.timestamp).toLocaleTimeString()}</strong></span>
          </div>
        </div>
      )}
    </div>
  );
};
