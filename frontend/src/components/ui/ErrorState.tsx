import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { cn } from '../../utils/cn';
import { Button } from './Button';

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Signal Interrupted',
  message,
  onRetry,
  retryLabel = 'Re-establish Signal',
  className,
}) => {
  return (
    <div
      role="alert"
      className={cn(
        'w-full py-12 px-6 flex flex-col items-center justify-center text-center glass-card rounded-2xl border border-luminous-crimson/20 relative overflow-hidden',
        className
      )}
    >
      {/* Subtle crimson atmospheric glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-luminous-crimson/5 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="w-12 h-12 rounded-2xl bg-luminous-crimson/10 border border-luminous-crimson/30 flex items-center justify-center text-luminous-crimson mb-4">
        <AlertCircle className="w-6 h-6" aria-hidden="true" />
      </div>

      <h3 className="font-editorial text-xl font-bold text-white mb-2 max-w-md">
        {title}
      </h3>

      <p className="text-sm text-slate-300 max-w-md font-sans leading-relaxed mb-6">
        {message}
      </p>

      {onRetry && (
        <Button
          variant="secondary"
          size="sm"
          onClick={onRetry}
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
        >
          {retryLabel}
        </Button>
      )}
    </div>
  );
};

export default ErrorState;
