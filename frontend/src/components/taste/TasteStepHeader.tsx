import React from 'react';
import { cn } from '../../utils/cn';

export interface TasteStepHeaderProps {
  eyebrow?: string;
  title: string;
  description: string;
  className?: string;
}

export const TasteStepHeader: React.FC<TasteStepHeaderProps> = ({
  eyebrow,
  title,
  description,
  className,
}) => {
  return (
    <div className={cn('text-center max-w-2xl mx-auto mb-8 sm:mb-10', className)}>
      {eyebrow && (
        <span className="text-telemetry text-luminous-cyan uppercase tracking-wider text-xs font-semibold mb-2 block">
          {eyebrow}
        </span>
      )}
      <h2 className="font-editorial text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white leading-tight">
        {title}
      </h2>
      <p className="mt-2.5 text-xs sm:text-sm text-slate-400 font-sans leading-relaxed">
        {description}
      </p>
    </div>
  );
};

export default TasteStepHeader;
