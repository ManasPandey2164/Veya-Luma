import React from 'react';
import { cn } from '../../utils/cn';

export interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  align?: 'left' | 'center';
  as?: 'h1' | 'h2' | 'h3';
  className?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  eyebrow,
  title,
  description,
  action,
  align = 'left',
  as: HeadingTag = 'h2',
  className,
}) => {
  const isCenter = align === 'center';

  return (
    <div
      className={cn(
        'w-full flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8',
        isCenter && 'md:flex-col md:items-center text-center',
        className
      )}
    >
      <div className={cn('flex flex-col', isCenter && 'items-center')}>
        {eyebrow && (
          <span className="text-telemetry text-luminous-cyan mb-2 select-none">
            {eyebrow}
          </span>
        )}
        <HeadingTag className="font-editorial text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-white leading-tight">
          {title}
        </HeadingTag>
        {description && (
          <p className="mt-2 text-sm md:text-base text-slate-400 font-sans max-w-2xl leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {action && <div className="shrink-0 self-start md:self-auto">{action}</div>}
    </div>
  );
};

export default SectionHeader;
