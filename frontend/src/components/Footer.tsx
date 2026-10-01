import React from 'react';
import { ShieldCheck } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full border-t border-white/5 bg-obsidian-void/90 py-10 px-6 mt-20">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <span className="font-editorial text-sm font-semibold text-white">Veya Luma</span>
          <span>— Phase 0 Foundation Baseline</span>
        </div>

        <div className="flex items-center gap-6">
          <span className="flex items-center gap-1.5 text-slate-300">
            <ShieldCheck className="w-4 h-4 text-luminous-teal" />
            <span>Strict Discovery Engine — Non-Streaming</span>
          </span>
          <span className="hidden sm:inline text-slate-600">|</span>
          <span className="text-slate-400">
            Visual Reference: Stitch <code className="text-luminous-cyan">6658946113334506031</code>
          </span>
        </div>
      </div>
    </footer>
  );
};
