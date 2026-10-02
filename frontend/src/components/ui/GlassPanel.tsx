import React from 'react';
import { cn } from '../../utils/cn';

export type GlassElevation = 'dim' | 'standard' | 'plate' | 'elevated' | 'highlight';
export type GlassPadding = 'none' | 'sm' | 'md' | 'lg' | 'xl';
export type GlassRounded = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';

export interface GlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  elevation?: GlassElevation;
  padding?: GlassPadding;
  rounded?: GlassRounded;
  hoverEffect?: boolean;
  as?: 'div' | 'section' | 'article' | 'aside';
  children: React.ReactNode;
}

export const GlassPanel: React.FC<GlassPanelProps> = ({
  elevation = 'standard',
  padding = 'md',
  rounded = 'lg',
  hoverEffect = false,
  as: Component = 'div',
  className,
  children,
  ...props
}) => {
  const elevationStyles: Record<GlassElevation, string> = {
    dim: 'bg-obsidian-base/60 backdrop-blur-md border border-white/5',
    standard: 'bg-obsidian-surface/75 backdrop-blur-xl border border-white/10',
    plate: 'bg-obsidian-chamber/80 backdrop-blur-xl border border-white/10',
    elevated: 'bg-obsidian-card/90 backdrop-blur-2xl border border-white/15 shadow-2xl',
    highlight: 'bg-obsidian-highlight/40 backdrop-blur-2xl border border-white/20',
  };

  const paddingStyles: Record<GlassPadding, string> = {
    none: 'p-0',
    sm: 'p-3',
    md: 'p-6',
    lg: 'p-8',
    xl: 'p-10',
  };

  const roundedStyles: Record<GlassRounded, string> = {
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    '2xl': 'rounded-2xl',
    full: 'rounded-full',
  };

  return (
    <Component
      className={cn(
        'transition-all duration-300 relative',
        elevationStyles[elevation],
        paddingStyles[padding],
        roundedStyles[rounded],
        hoverEffect &&
          'hover:border-luminous-cyan/40 hover:shadow-cyan-glow hover:translate-y-[-1px]',
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
};

export default GlassPanel;
