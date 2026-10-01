import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Sparkles, Film, Database } from 'lucide-react';

export const Navbar: React.FC = () => {
  const location = useLocation();

  const navLinks = [
    { name: 'Discover', path: '/' },
    { name: 'Taste Discovery', path: '/taste-discovery' },
    { name: 'Architecture', path: '/#architecture' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between glass-chrome rounded-full px-6 py-3">
        {/* Brand Mark */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-luminous-cyan to-luminous-ultraviolet flex items-center justify-center p-0.5 shadow-cyan-glow group-hover:scale-105 transition-transform duration-300">
            <div className="w-full h-full bg-obsidian-void rounded-full flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-luminous-cyan" />
            </div>
          </div>
          <span className="font-editorial text-xl font-bold tracking-tight text-white group-hover:text-luminous-cyan transition-colors">
            Veya Luma
          </span>
        </Link>

        {/* Vertical Selector Badge */}
        <div className="hidden md:flex items-center gap-1 bg-obsidian-surface/80 rounded-full p-1 border border-white/5">
          <button className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-luminous-cyan text-obsidian-void transition-all">
            <Film className="w-3.5 h-3.5" />
            <span>Cinema</span>
          </button>
          <span className="px-3 py-1 rounded-full text-xs font-medium text-slate-400 opacity-60 cursor-not-allowed">
            Games (Preview)
          </span>
          <span className="px-3 py-1 rounded-full text-xs font-medium text-slate-400 opacity-60 cursor-not-allowed">
            Anime (Preview)
          </span>
        </div>

        {/* Primary Navigation */}
        <nav className="flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              to={link.path}
              className={`text-sm font-medium transition-colors hover:text-luminous-cyan ${
                location.pathname === link.path ? 'text-luminous-cyan font-semibold' : 'text-slate-300'
              }`}
            >
              {link.name}
            </Link>
          ))}
          <a
            href="http://localhost:8000/docs"
            target="_blank"
            rel="noreferrer"
            className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 hover:text-luminous-teal transition-colors"
          >
            <Database className="w-3.5 h-3.5" />
            <span>API Docs</span>
          </a>
        </nav>
      </div>
    </header>
  );
};
