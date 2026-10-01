import React from 'react';
import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
      <span className="text-sm font-semibold uppercase tracking-widest text-luminous-cyan mb-2">404</span>
      <h1 className="font-editorial text-4xl font-bold text-white mb-4">Frame Not Found</h1>
      <p className="text-slate-400 text-sm max-w-md mb-8">
        The cinematic sequence you are seeking does not exist in this catalog.
      </p>
      <Link
        to="/"
        className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-luminous-cyan text-obsidian-void font-semibold text-sm hover:scale-105 transition-transform"
      >
        <Home className="w-4 h-4" />
        <span>Return to Discovery</span>
      </Link>
    </div>
  );
};
