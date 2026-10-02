import React from 'react';
import { cn } from '../../utils/cn';

export type PageMaxWidth = 'standard' | 'wide' | 'narrow' | 'full';
export type PagePaddingY = 'none' | 'sm' | 'md' | 'lg' | 'hero';

export interface PageContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  maxWidth?: PageMaxWidth;
  paddingY?: PagePaddingY;
  gutters?: boolean;
  withAtmosphere?: boolean;
  className?: string;
  children: React.ReactNode;
}

export const PageContainer: React.FC<PageContainerProps> = ({
  maxWidth = 'standard',
  paddingY = 'md',
  gutters = true,
  withAtmosphere = false,
  className,
  children,
  ...props
}) => {
  const maxWidthStyles: Record<PageMaxWidth, string> = {
    standard: 'max-w-[1320px]',
    wide: 'max-w-[1440px]',
    narrow: 'max-w-4xl',
    full: 'w-full',
  };

  const paddingYStyles: Record<PagePaddingY, string> = {
    none: 'py-0',
    sm: 'py-6 md:py-8',
    md: 'py-10 md:py-16',
    lg: 'py-16 md:py-24',
    hero: 'pt-16 pb-20 md:pt-24 md:pb-28',
  };

  return (
    <div
      className={cn(
        'w-full mx-auto relative isolate',
        maxWidthStyles[maxWidth],
        paddingYStyles[paddingY],
        gutters && 'px-6 sm:px-8 md:px-12 lg:px-16',
        className
      )}
      {...props}
    >
      {withAtmosphere && (
        <div
          data-testid="page-container-atmosphere"
          className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-[360px] pointer-events-none z-0 transition-all duration-700 opacity-25 dark:opacity-75 blur-3xl"
          style={{
            background: 'var(--vl-atmosphere-gradient)',
          }}
          aria-hidden="true"
        />
      )}
      {children}
    </div>
  );
};

export default PageContainer;
