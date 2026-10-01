import React from 'react';
import { HealthStatus } from '../components/HealthStatus';
import { DiagnosticConsole } from '../components/DiagnosticConsole';
import { Sparkles, ArrowRight } from 'lucide-react';

export const HomePage: React.FC = () => {
  const pillars = [
    {
      title: 'Taste Discovery Engine',
      desc: 'Adaptive two-stage preference elicitation with seen picker and pairwise movie duels.',
      tag: 'Phase 6',
      color: 'from-luminous-cyan to-blue-500',
    },
    {
      title: 'Content-Based Scorer',
      desc: 'Sparse TF-IDF and scaled structured metadata feature vectors with popularity fallback.',
      tag: 'Phase 7',
      color: 'from-luminous-ultraviolet to-purple-600',
    },
    {
      title: 'MMR & Diversity Caps',
      desc: 'Deterministic Maximal Marginal Relevance preventing franchise and tonal monotony.',
      tag: 'Phase 9',
      color: 'from-luminous-teal to-emerald-600',
    },
    {
      title: 'Radical Honesty & DNA',
      desc: 'Topological node map and radar telemetry explaining algorithmic resonance.',
      tag: 'Phase 8',
      color: 'from-luminous-amber to-orange-500',
    },
  ];

  return (
    <div className="flex flex-col items-center">
      {/* Hero Section */}
      <section className="relative w-full max-w-6xl mx-auto pt-16 pb-12 px-6 text-center">
        {/* Ambient atmospheric glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-luminous-cyan/10 rounded-full blur-3xl pointer-events-none -z-10" />
        <div className="absolute top-1/3 left-1/3 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-luminous-ultraviolet/10 rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-luminous-cyan mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Phase 0 — Foundation & Infrastructure Active</span>
        </div>

        <h1 className="font-editorial text-5xl md:text-6xl font-bold tracking-tight text-white max-w-4xl mx-auto leading-tight">
          Where Cinema Meets Personal Resonance
        </h1>

        <p className="mt-5 text-base md:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed font-sans">
          A personalized movie discovery engine engineered to overcome decision fatigue through
          intuitive taste learning rather than exhaustive questionnaires.
        </p>

        {/* Live System Connectivity & Diagnostic Probe */}
        <div className="mt-10 space-y-6">
          <HealthStatus />
          <DiagnosticConsole />
        </div>
      </section>

      {/* Architectural Readiness & Pillars Grid */}
      <section id="architecture" className="w-full max-w-6xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="font-editorial text-2xl font-bold text-white">Phase 0 Architectural Pillars</h2>
            <p className="text-xs text-slate-400 mt-1">Foundations established per ARCHITECTURE.md and DECISION.md</p>
          </div>
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-luminous-teal/10 text-luminous-teal border border-luminous-teal/20">
            Internal Consistency Verified
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {pillars.map((pillar) => (
            <div key={pillar.title} className="glass-card rounded-2xl p-5 flex flex-col justify-between group transition-all duration-300">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-white/5 px-2 py-0.5 rounded">
                    {pillar.tag}
                  </span>
                  <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${pillar.color}`} />
                </div>
                <h3 className="font-editorial text-base font-semibold text-white group-hover:text-luminous-cyan transition-colors">
                  {pillar.title}
                </h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  {pillar.desc}
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-slate-400 group-hover:text-slate-200 transition-colors">
                <span>View Specification</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
