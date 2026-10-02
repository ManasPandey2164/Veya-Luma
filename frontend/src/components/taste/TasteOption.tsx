import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface TasteOptionProps {
  label: string;
  description?: string;
  selected: boolean;
  onToggle: () => void;
  variant?: 'cyan' | 'violet' | 'amber';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const TasteOption: React.FC<TasteOptionProps> = ({
  label,
  description,
  selected,
  onToggle,
  variant = 'cyan',
  size = 'md',
  className,
}) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onToggle();
    }
  };

  const variantStyles = {
    cyan: {
      activeBorder: 'border-luminous-cyan ring-1 ring-luminous-cyan shadow-cyan-glow bg-luminous-cyan/10 text-white',
      activeIndicator: 'bg-luminous-cyan text-obsidian-void',
    },
    violet: {
      activeBorder: 'border-secondary ring-1 ring-secondary shadow-violet-glow bg-secondary/10 text-white',
      activeIndicator: 'bg-secondary text-white',
    },
    amber: {
      activeBorder: 'border-luminous-amber ring-1 ring-luminous-amber shadow-amber-glow bg-luminous-amber/10 text-white',
      activeIndicator: 'bg-luminous-amber text-obsidian-void',
    },
  }[variant];

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label={`${label}${description ? `: ${description}` : ''}`}
      onClick={onToggle}
      onKeyDown={handleKeyDown}
      className={cn(
        'group relative flex flex-col justify-between rounded-xl border transition-all duration-200 select-none cursor-pointer',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-luminous-cyan/70 focus-visible:ring-offset-2 focus-visible:ring-offset-obsidian-void active:scale-[0.98]',
        size === 'sm' && 'p-3',
        size === 'md' && 'p-4',
        size === 'lg' && 'p-5',
        selected
          ? variantStyles.activeBorder
          : 'bg-obsidian-surface/80 border-white/10 hover:border-white/30 hover:bg-obsidian-chamber text-slate-300 hover:text-white',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3 w-full">
        <div>
          <h3 className="font-sans font-semibold text-sm sm:text-base text-inherit tracking-wide">
            {label}
          </h3>
          {description && (
            <p className="mt-1 text-xs text-slate-400 font-sans leading-relaxed group-hover:text-slate-300 transition-colors">
              {description}
            </p>
          )}
        </div>

        {/* Selection Indicator Circle */}
        <div
          aria-hidden="true"
          className={cn(
            'shrink-0 w-5 h-5 rounded-full border flex items-center justify-center transition-all duration-200 mt-0.5',
            selected
              ? `${variantStyles.activeIndicator} border-transparent scale-105`
              : 'border-white/20 bg-white/5 group-hover:border-white/40'
          )}
        >
          {selected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
        </div>
      </div>
    </div>
  );
};

export default TasteOption;
