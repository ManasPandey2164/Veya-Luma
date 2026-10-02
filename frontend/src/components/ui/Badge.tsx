import React from 'react';
import { cn } from '../../utils/cn';

export type BadgeVariant = 'cyan' | 'violet' | 'teal' | 'amber' | 'crimson' | 'neutral';
export type BadgeSize = 'sm' | 'md';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'cyan',
  size = 'sm',
  dot = false,
  className,
  children,
  ...props
}) => {
  const variantStyles: Record<BadgeVariant, { container: string; dot: string }> = {
    cyan: {
      container: 'bg-luminous-cyan/10 text-luminous-cyan border-luminous-cyan/30',
      dot: 'bg-luminous-cyan',
    },
    violet: {
      container: 'bg-luminous-ultraviolet/10 text-luminous-ultraviolet border-luminous-ultraviolet/30',
      dot: 'bg-luminous-ultraviolet',
    },
    teal: {
      container: 'bg-luminous-teal/10 text-luminous-teal border-luminous-teal/30',
      dot: 'bg-luminous-teal',
    },
    amber: {
      container: 'bg-luminous-amber/10 text-luminous-amber border-luminous-amber/30',
      dot: 'bg-luminous-amber',
    },
    crimson: {
      container: 'bg-luminous-crimson/10 text-luminous-crimson border-luminous-crimson/30',
      dot: 'bg-luminous-crimson',
    },
    neutral: {
      container: 'bg-white/5 text-slate-300 border-white/10',
      dot: 'bg-slate-400',
    },
  };

  const sizeStyles: Record<BadgeSize, string> = {
    sm: 'text-[11px] px-2 py-0.5 rounded-sm gap-1.5',
    md: 'text-xs px-2.5 py-1 rounded-sm gap-2',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium border font-sans tracking-wide uppercase',
        variantStyles[variant].container,
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn('w-1.5 h-1.5 rounded-full shrink-0', variantStyles[variant].dot)}
          aria-hidden="true"
        />
      )}
      <span>{children}</span>
    </span>
  );
};

export default Badge;
