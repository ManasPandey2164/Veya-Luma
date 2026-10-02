import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { CelestialPrism } from './ui/CelestialPrism';


export const Footer: React.FC = () => {
  return (
    <footer className="w-full border-t border-white/5 bg-obsidian-void/90 py-12 px-6 mt-24">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8 text-xs text-slate-400 font-sans">
        {/* Brand identity */}
        <div className="flex flex-col items-center md:items-start gap-2">
          <div className="flex items-center gap-2.5">
            <CelestialPrism size={16} />
            <span className="font-editorial text-base font-bold text-white tracking-wide">
              Veya Luma
            </span>
          </div>
          <p className="text-xs text-slate-400 max-w-sm text-center md:text-left leading-relaxed">
            A personalized movie discovery platform engineered to reveal cinema of true emotional and cognitive resonance.
          </p>
        </div>

        {/* Quick Nav Links */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-slate-300">
          <Link to="/discover" className="hover:text-luminous-cyan transition-colors">
            Discover
          </Link>
          <Link to="/search" className="hover:text-luminous-cyan transition-colors">
            Search
          </Link>
          <Link to="/taste-discovery" className="hover:text-luminous-cyan transition-colors">
            Taste Discovery
          </Link>
          <Link to="/recommendations" className="hover:text-luminous-cyan transition-colors">
            Recommendations
          </Link>
          <Link to="/library" className="hover:text-luminous-cyan transition-colors">
            My Library
          </Link>
          <Link to="/preferences" className="hover:text-luminous-cyan transition-colors">
            Preferences
          </Link>
          <Link to="/profile" className="hover:text-luminous-cyan transition-colors">
            Profile
          </Link>
          <Link to="/account" className="hover:text-luminous-cyan transition-colors">
            Account
          </Link>
        </div>

        {/* Curatorial Badge */}
        <div className="flex items-center gap-4 text-slate-400">
          <span className="flex items-center gap-1.5 text-slate-300">
            <ShieldCheck className="w-4 h-4 text-luminous-teal" aria-hidden="true" />
            <span>Curatorial Sanctuary • Non-Streaming</span>
          </span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
