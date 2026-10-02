import React from 'react';
import { cn } from '../../utils/cn';

export type LoadingStateType = 'card' | 'cards' | 'shelf' | 'spinner';

export interface LoadingStateProps {
  type?: LoadingStateType;
  count?: number;
  message?: string;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  type = 'cards',
  count = 4,
  message = 'Consulting the celestial resonance index...',
  className,
}) => {
  if (type === 'spinner') {
    return (
      <div
        role="status"
        aria-live="polite"
        className={cn('w-full py-16 flex flex-col items-center justify-center gap-4 text-center', className)}
      >
        {/* Subtle luminous orbital indicator (restrained celestial pulse, not chaotic spring) */}
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border border-white/10" />
          <div className="absolute inset-0 rounded-full border-t border-luminous-cyan animate-spin [animation-duration:1.5s]" />
          <div className="absolute inset-2 rounded-full border border-luminous-ultraviolet/30 animate-pulse [animation-duration:2s]" />
        </div>
        <span className="text-xs font-sans tracking-wide text-slate-400 font-medium">
          {message}
        </span>
        <span className="sr-only">Loading content, please wait.</span>
      </div>
    );
  }

  const renderCardSkeleton = (key: number) => (
    <div
      key={key}
      className="relative flex flex-col justify-end aspect-[2/3] w-full rounded-xl bg-obsidian-surface border border-white/5 overflow-hidden animate-pulse"
      aria-hidden="true"
    >
      <div className="absolute inset-0 bg-gradient-to-t from-obsidian-void via-obsidian-chamber/40 to-transparent" />
      <div className="relative p-4 flex flex-col gap-2 z-10">
        <div className="h-4 w-3/4 bg-white/10 rounded-sm" />
        <div className="h-3 w-1/2 bg-white/5 rounded-sm" />
      </div>
    </div>
  );

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn('w-full my-6', className)}
    >
      <span className="sr-only">{message}</span>
      {type === 'card' && (
        <div className="max-w-xs">{renderCardSkeleton(0)}</div>
      )}
      {type === 'cards' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
          {Array.from({ length: count }).map((_, i) => renderCardSkeleton(i))}
        </div>
      )}
      {type === 'shelf' && (
        <div className="flex gap-4 md:gap-6 overflow-hidden">
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="min-w-[170px] w-48 shrink-0">
              {renderCardSkeleton(i)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LoadingState;
