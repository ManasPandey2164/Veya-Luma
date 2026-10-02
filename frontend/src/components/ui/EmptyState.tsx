import React from 'react';
import { Film } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  action,
  className,
}) => {
  return (
    <div
      role="region"
      aria-label={title}
      className={cn(
        'w-full py-16 px-6 flex flex-col items-center justify-center text-center glass-card rounded-2xl border border-white/5 relative overflow-hidden',
        className
      )}
    >
      {/* Ambient background aura */}
      <div className="absolute inset-0 bg-cosmic-glow opacity-30 pointer-events-none" />

      <div className="w-14 h-14 rounded-2xl bg-obsidian-card border border-white/10 flex items-center justify-center text-slate-400 mb-5 shadow-inner">
        {icon || <Film className="w-7 h-7 text-slate-500" aria-hidden="true" />}
      </div>

      <h3 className="font-editorial text-xl md:text-2xl font-bold text-white mb-2 max-w-md">
        {title}
      </h3>

      <p className="text-sm text-slate-400 max-w-md font-sans leading-relaxed mb-6">
        {description}
      </p>

      {action && <div className="relative z-10">{action}</div>}
    </div>
  );
};

export default EmptyState;
