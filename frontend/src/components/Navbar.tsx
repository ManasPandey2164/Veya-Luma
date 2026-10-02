import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Search, Sliders, User, Compass, Sparkles, Film, Bookmark, Settings, Activity } from 'lucide-react';
import { cn } from '../utils/cn';
import { CelestialPrism } from './ui/CelestialPrism';

export const Navbar: React.FC = () => {
  const location = useLocation();

  const primaryNav = [
    { name: 'Discover', path: '/discover', icon: Compass },
    { name: 'Search', path: '/search', icon: Search },
    { name: 'Taste Discovery', path: '/taste-discovery', icon: Sparkles },
    { name: 'Recommendations', path: '/recommendations', icon: Film },
    { name: 'My Library', path: '/library', icon: Bookmark },
  ];

  const secondaryNav = [
    { name: 'Preferences', path: '/preferences', icon: Sliders },
    { name: 'Profile', path: '/profile', icon: User },
    { name: 'Account', path: '/account', icon: Settings },
  ];

  const isPrimaryActive = (path: string) => {
    if (path === '/discover') {
      return location.pathname === '/' || location.pathname === '/discover';
    }
    return location.pathname.startsWith(path);
  };

  const isSecondaryActive = (path: string) => {
    return location.pathname.startsWith(path);
  };

  return (
    <header className="sticky top-0 z-50 w-full px-4 sm:px-6 py-3.5">
      <div className="max-w-[1360px] mx-auto flex items-center justify-between glass-chrome rounded-full px-5 py-2.5 border border-white/10 shadow-2xl backdrop-blur-2xl">
        {/* Brand Mark & Clear Platform Identity */}
        <Link
          to="/discover"
          className="flex items-center gap-3 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-luminous-cyan rounded-full p-1"
          aria-label="Veya Luma — Personalized Movie Discovery Platform"
        >
          <div className="w-8 h-8 rounded-full bg-obsidian-surface border border-luminous-cyan/30 flex items-center justify-center p-1 group-hover:border-luminous-cyan group-hover:shadow-cyan-glow transition-all duration-300">
            <CelestialPrism size={18} />
          </div>
          <div className="flex flex-col">
            <span className="font-editorial text-lg md:text-xl font-bold tracking-tight text-white group-hover:text-luminous-cyan transition-colors leading-none">
              Veya Luma
            </span>
            <span className="text-[10px] text-slate-400 font-sans tracking-wide uppercase font-semibold leading-tight mt-0.5">
              Movie Discovery
            </span>
          </div>
        </Link>

        {/* Primary Desktop Navigation */}
        <nav
          aria-label="Primary Navigation"
          className="hidden lg:flex items-center gap-1 bg-obsidian-surface/60 rounded-full px-2 py-1 border border-white/5"
        >
          {primaryNav.map((item) => {
            const active = isPrimaryActive(item.path);
            return (
              <Link
                key={item.name}
                to={item.path}
                className={cn(
                  'px-3.5 py-1.5 rounded-full text-xs font-medium font-sans transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-luminous-cyan',
                  active
                    ? 'bg-luminous-cyan text-obsidian-void font-semibold shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                )}
                aria-current={active ? 'page' : undefined}
              >
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Secondary Navigation & Utilities */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Tablet/Mobile Search Quick Link */}
          <Link
            to="/search"
            className="lg:hidden p-2 rounded-full text-slate-300 hover:text-white hover:bg-white/5 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-luminous-cyan"
            aria-label="Search movies"
          >
            <Search className="w-4 h-4" />
          </Link>

          {/* Secondary Nav Cluster */}
          <nav aria-label="Secondary Navigation" className="flex items-center gap-1">
            {secondaryNav.map((item) => {
              const Icon = item.icon;
              const active = isSecondaryActive(item.path);
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  aria-label={item.name}
                  title={item.name}
                  className={cn(
                    'p-2 rounded-full text-xs font-medium font-sans transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-luminous-cyan',
                    active
                      ? 'bg-white/15 text-luminous-cyan shadow-sm border border-luminous-cyan/40'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  )}
                  aria-current={active ? 'page' : undefined}
                >
                  <Icon className="w-4 h-4" />
                </Link>
              );
            })}
          </nav>

          {/* Discreet Diagnostics Link */}
          <div className="hidden xl:flex items-center pl-2 border-l border-white/10">
            <Link
              to="/diagnostics"
              className={cn(
                'flex items-center gap-1 text-[11px] font-sans transition-colors',
                location.pathname === '/diagnostics' ? 'text-luminous-cyan font-semibold' : 'text-slate-500 hover:text-slate-300'
              )}
              title="System Diagnostics"
            >
              <Activity className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
