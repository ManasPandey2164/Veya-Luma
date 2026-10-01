import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Terminal, Send, CheckCircle2, AlertCircle, Clock, Globe } from 'lucide-react';

const probeSchema = z.object({
  endpoint: z
    .string()
    .min(1, 'Endpoint is required')
    .regex(/^\//, 'Endpoint must start with a leading slash (e.g. /health)'),
  method: z.enum(['GET', 'HEAD']),
  timeoutMs: z
    .number({ invalid_type_error: 'Timeout must be a number' })
    .min(500, 'Minimum timeout is 500ms')
    .max(10000, 'Maximum timeout is 10000ms'),
});

type ProbeFormData = z.infer<typeof probeSchema>;

interface ProbeResult {
  status: number;
  statusText: string;
  durationMs: number;
  data: unknown;
  timestamp: string;
}

export const DiagnosticConsole: React.FC = () => {
  const [probeResult, setProbeResult] = useState<ProbeResult | null>(null);
  const [probeError, setProbeError] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ProbeFormData>({
    resolver: zodResolver(probeSchema),
    defaultValues: {
      endpoint: '/health',
      method: 'GET',
      timeoutMs: 3000,
    },
  });

  const onSubmit = async (values: ProbeFormData) => {
    setIsExecuting(true);
    setProbeError(null);
    setProbeResult(null);

    const startTime = performance.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), values.timeoutMs);

    try {
      // Direct origin or fallback to standard API base
      const baseUrl = import.meta.env.VITE_API_BASE_URL
        ? new URL(import.meta.env.VITE_API_BASE_URL).origin
        : 'http://localhost:8000';

      const targetUrl = `${baseUrl}${values.endpoint}`;
      const response = await fetch(targetUrl, {
        method: values.method,
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const endTime = performance.now();

      let payload: unknown = null;
      if (values.method !== 'HEAD') {
        const text = await response.text();
        try {
          payload = JSON.parse(text);
        } catch {
          payload = text;
        }
      }

      setProbeResult({
        status: response.status,
        statusText: response.statusText || (response.ok ? 'OK' : 'Error'),
        durationMs: Math.round(endTime - startTime),
        data: payload,
        timestamp: new Date().toISOString(),
      });
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      if (err instanceof Error && err.name === 'AbortError') {
        setProbeError(`Request timed out after ${values.timeoutMs}ms`);
      } else if (err instanceof Error) {
        setProbeError(err.message);
      } else {
        setProbeError('Failed to execute diagnostic probe');
      }
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="glass-card rounded-2xl p-6 w-full max-w-xl mx-auto border border-white/10 shadow-xl mt-6">
      <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
        <div className="flex items-center gap-2.5">
          <Terminal className="w-5 h-5 text-luminous-ultraviolet" />
          <h3 className="font-editorial text-lg font-semibold text-white">
            API Diagnostic Probe Console
          </h3>
        </div>
        <span className="text-[11px] font-mono text-slate-400 bg-white/5 px-2 py-0.5 rounded">
          Zod + React Hook Form
        </span>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Quick select buttons */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Quick Probe:</span>
          <button
            type="button"
            onClick={() => setValue('endpoint', '/health')}
            className="text-xs px-2.5 py-1 rounded-md bg-white/5 hover:bg-white/10 text-luminous-cyan transition-colors"
          >
            /health
          </button>
          <button
            type="button"
            onClick={() => setValue('endpoint', '/api/v1/health')}
            className="text-xs px-2.5 py-1 rounded-md bg-white/5 hover:bg-white/10 text-luminous-teal transition-colors"
          >
            /api/v1/health
          </button>
          <button
            type="button"
            onClick={() => setValue('endpoint', '/')}
            className="text-xs px-2.5 py-1 rounded-md bg-white/5 hover:bg-white/10 text-luminous-amber transition-colors"
          >
            / (Metadata)
          </button>
        </div>

        {/* Endpoint Input */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            Endpoint Path
          </label>
          <div className="relative">
            <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              {...register('endpoint')}
              placeholder="/health"
              className="w-full pl-9 pr-3 py-2 bg-obsidian-void/80 border border-white/10 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-luminous-cyan transition-colors font-mono"
            />
          </div>
          {errors.endpoint && (
            <p className="text-xs text-red-400 mt-1">{errors.endpoint.message}</p>
          )}
        </div>

        {/* Method & Timeout */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Method
            </label>
            <select
              {...register('method')}
              className="w-full px-3 py-2 bg-obsidian-void/80 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-luminous-cyan transition-colors font-mono"
            >
              <option value="GET">GET</option>
              <option value="HEAD">HEAD</option>
            </select>
            {errors.method && (
              <p className="text-xs text-red-400 mt-1">{errors.method.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Timeout (ms)
            </label>
            <input
              type="number"
              {...register('timeoutMs', { valueAsNumber: true })}
              placeholder="3000"
              className="w-full px-3 py-2 bg-obsidian-void/80 border border-white/10 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-luminous-cyan transition-colors font-mono"
            />
            {errors.timeoutMs && (
              <p className="text-xs text-red-400 mt-1">{errors.timeoutMs.message}</p>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isExecuting}
          className="w-full py-2.5 px-4 rounded-lg bg-gradient-to-r from-luminous-cyan/20 to-luminous-ultraviolet/20 hover:from-luminous-cyan/30 hover:to-luminous-ultraviolet/30 text-white font-medium text-sm border border-luminous-cyan/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
        >
          <Send className={`w-4 h-4 ${isExecuting ? 'animate-pulse' : ''}`} />
          <span>{isExecuting ? 'Transmitting Probe...' : 'Execute Endpoint Probe'}</span>
        </button>
      </form>

      {/* Error Output */}
      {probeError && (
        <div className="mt-4 p-3 rounded-lg bg-red-950/40 border border-red-500/30 flex items-center gap-2 text-xs text-red-300">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{probeError}</span>
        </div>
      )}

      {/* Result Output */}
      {probeResult && (
        <div className="mt-4 p-4 rounded-xl bg-obsidian-void/90 border border-white/10 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-luminous-teal font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              <span>
                HTTP {probeResult.status} {probeResult.statusText}
              </span>
            </div>
            <div className="flex items-center gap-1 text-slate-400">
              <Clock className="w-3.5 h-3.5" />
              <span>{probeResult.durationMs}ms</span>
            </div>
          </div>

          <pre className="p-2.5 rounded bg-black/50 text-[11px] font-mono text-slate-300 overflow-x-auto max-h-48">
            {JSON.stringify(probeResult.data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};
