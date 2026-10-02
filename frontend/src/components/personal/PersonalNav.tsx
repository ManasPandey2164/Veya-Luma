import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { User, Sparkles, Sliders, Settings } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface PersonalNavProps {
  className?: string;
}

export const PersonalNav: React.FC<PersonalNavProps> = ({ className }) => {
  const location = useLocation();
  const currentPath = location.pathname;

  const tabs = [
    {
      id: 'profile',
      label: 'Profile',
      path: '/profile',
      icon: User,
      active: currentPath === '/profile',
    },
    {
      id: 'taste',
      label: 'Taste Preferences',
      path: '/preferences/taste',
      icon: Sparkles,
      active: currentPath === '/preferences/taste' || currentPath === '/preferences',
    },
    {
      id: 'recommendations',
      label: 'Recommendation Calibration',
      path: '/preferences/recommendations',
      icon: Sliders,
      active: currentPath === '/preferences/recommendations',
    },
    {
      id: 'account',
      label: 'Account & Sanctuary',
      path: '/account',
      icon: Settings,
      active: currentPath === '/account',
    },
  ];

  return (
    <nav
      aria-label="Personal Area Navigation"
      className={cn(
        'flex items-center gap-2 border-b border-black/[0.08] dark:border-white/10 pb-4 mb-8 overflow-x-auto no-scrollbar font-sans',
        className
      )}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <Link
            key={tab.id}
            to={tab.path}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-luminous-cyan',
              tab.active
                ? 'bg-white text-slate-950 font-semibold border border-black/10 shadow-sm dark:bg-white/15 dark:text-luminous-cyan dark:border-luminous-cyan/40 dark:shadow-none'
                : 'text-slate-500 hover:text-slate-900 hover:bg-black/[0.03] dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/5'
            )}
            aria-current={tab.active ? 'page' : undefined}
          >
            <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
};

export default PersonalNav;
