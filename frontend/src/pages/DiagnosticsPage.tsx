import React from 'react';
import { HealthStatus } from '../components/HealthStatus';
import { DiagnosticConsole } from '../components/DiagnosticConsole';
import { ARCHITECTURE_PILLARS } from '../data/architecturePillars';
import { ArrowRight, Terminal } from 'lucide-react';
import { cn } from '../utils/cn';

export const DiagnosticsPage: React.FC = () => {
  return (
    <div className="flex flex-col items-center py-10 px-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="w-full text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-luminous-cyan mb-3">
          <Terminal className="w-3.5 h-3.5" />
          <span>Developer Diagnostics & Infrastructure Probe</span>
        </div>
        <h1 className="font-editorial text-3xl md:text-4xl font-bold text-white">
          System Diagnostics & Health
        </h1>
        <p className="mt-2 text-sm text-slate-400 max-w-xl mx-auto">
          Developer verification console for backend health monitoring, endpoint probing, and architectural milestone tracking.
        </p>
      </div>

      {/* Connectivity & Probing */}
      <div className="w-full max-w-xl space-y-6">
        <HealthStatus />
        <DiagnosticConsole />
      </div>

      {/* Architectural Readiness & Pillars Grid */}
      <section className="w-full mt-16 pt-10 border-t border-white/5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-3">
          <div>
            <h2 className="font-editorial text-2xl font-bold text-white">Architectural Specifications</h2>
            <p className="text-xs text-slate-400 mt-1">Foundation roadmap established per ARCHITECTURE.md and DECISION.md</p>
          </div>
          <span className="self-start sm:self-auto text-xs font-semibold px-3 py-1 rounded-full bg-luminous-teal/10 text-luminous-teal border border-luminous-teal/20">
            Internal Consistency Verified
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {ARCHITECTURE_PILLARS.map((pillar) => (
            <div key={pillar.title} className="glass-card rounded-2xl p-5 flex flex-col justify-between group transition-all duration-300">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-white/5 px-2 py-0.5 rounded">
                    {pillar.tag}
                  </span>
                  <div className={cn('w-2 h-2 rounded-full bg-gradient-to-r', pillar.color)} />
                </div>
                <h3 className="font-editorial text-base font-semibold text-white group-hover:text-luminous-cyan transition-colors">
                  {pillar.title}
                </h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  {pillar.desc}
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-slate-400 group-hover:text-slate-200 transition-colors">
                <span>Phase Milestone</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default DiagnosticsPage;
