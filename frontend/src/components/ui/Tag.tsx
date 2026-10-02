import React from 'react';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';

export type TagVariant = 'default' | 'cyan' | 'violet' | 'teal' | 'amber';

export interface TagProps {
  label: string;
  selected?: boolean;
  interactive?: boolean;
  count?: number;
  variant?: TagVariant;
  onToggle?: (selected: boolean) => void;
  onRemove?: () => void;
  className?: string;
  disabled?: boolean;
}

export const Tag: React.FC<TagProps> = ({
  label,
  selected = false,
  interactive = true,
  count,
  variant = 'default',
  onToggle,
  onRemove,
  className,
  disabled = false,
}) => {
  const handleClick = () => {
    if (interactive && onToggle && !disabled) {
      onToggle(!selected);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && interactive && onToggle && !disabled) {
      e.preventDefault();
      onToggle(!selected);
    }
  };

  const variantActiveStyles: Record<TagVariant, string> = {
    default: 'bg-white/20 text-white border-white/40 shadow-sm',
    cyan: 'bg-luminous-cyan/20 text-luminous-cyan border-luminous-cyan/60 shadow-cyan-glow',
    violet: 'bg-luminous-ultraviolet/20 text-luminous-ultraviolet border-luminous-ultraviolet/60 shadow-violet-glow',
    teal: 'bg-luminous-teal/20 text-luminous-teal border-luminous-teal/60 shadow-teal-glow',
    amber: 'bg-luminous-amber/20 text-luminous-amber border-luminous-amber/60 shadow-amber-glow',
  };

  const variantInactiveStyles =
    'bg-obsidian-surface/80 text-slate-300 border-white/10 hover:bg-obsidian-chamber hover:text-white hover:border-white/20';

  if (!interactive) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border font-sans select-none',
          selected ? variantActiveStyles[variant] : variantInactiveStyles,
          className
        )}
      >
        <span>{label}</span>
        {count !== undefined && <span className="text-[10px] opacity-70">({count})</span>}
      </span>
    );
  }

  return (
    <button
      type="button"
      role="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border font-sans select-none transition-all duration-200 cursor-pointer',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-luminous-cyan/70 focus-visible:ring-offset-2 focus-visible:ring-offset-obsidian-void active:scale-95',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        selected ? variantActiveStyles[variant] : variantInactiveStyles,
        className
      )}
    >
      <span>{label}</span>
      {count !== undefined && (
        <span className="text-[10px] opacity-70">({count})</span>
      )}
      {onRemove && (
        <span
          role="button"
          tabIndex={0}
          aria-label={`Remove tag ${label}`}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.stopPropagation();
              onRemove();
            }
          }}
          className="ml-0.5 p-0.5 rounded-full hover:bg-white/20 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-3 h-3" />
        </span>
      )}
    </button>
  );
};

export default Tag;
