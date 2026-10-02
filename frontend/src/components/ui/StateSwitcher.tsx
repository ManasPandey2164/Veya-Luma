import React from 'react';
import { Layers } from 'lucide-react';
import { cn } from '../../utils/cn';
import { type PageViewState } from '../../utils/usePageState';

export type { PageViewState };

export interface StateSwitcherProps {
  state: PageViewState;
  onStateChange: (state: PageViewState) => void;
  className?: string;
}

export const StateSwitcher: React.FC<StateSwitcherProps> = ({
  state,
  onStateChange,
  className,
}) => {
  const states: { id: PageViewState; label: string }[] = [
    { id: 'populated', label: 'Populated' },
    { id: 'loading', label: 'Loading' },
    { id: 'empty', label: 'Empty' },
    { id: 'error', label: 'Error' },
  ];

  return (
    <aside
      aria-label="Simulation state selector"
      className={cn(
        'inline-flex items-center gap-1.5 p-1 rounded-full bg-obsidian-surface/90 border border-white/10 shadow-lg text-xs font-sans select-none',
        className
      )}
    >
      <div className="flex items-center gap-1 px-2 text-slate-400">
        <Layers className="w-3.5 h-3.5 text-luminous-cyan" aria-hidden="true" />
        <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">State:</span>
      </div>
      <div className="flex items-center gap-1">
        {states.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onStateChange(s.id)}
            className={cn(
              'px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-luminous-cyan',
              state === s.id
                ? 'bg-luminous-cyan text-obsidian-void font-semibold shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            )}
            aria-pressed={state === s.id}
          >
            {s.label}
          </button>
        ))}
      </div>
    </aside>
  );
};

export default StateSwitcher;
