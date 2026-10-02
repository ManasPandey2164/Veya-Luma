import React from 'react';
import { cn } from '../../utils/cn';

export type PageMaxWidth = 'standard' | 'wide' | 'narrow' | 'full';
export type PagePaddingY = 'none' | 'sm' | 'md' | 'lg' | 'hero';

export interface PageContainerProps {
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
        'w-full mx-auto relative',
        maxWidthStyles[maxWidth],
        paddingYStyles[paddingY],
        gutters && 'px-6 sm:px-8 md:px-12 lg:px-16',
        className
      )}
    >
      {withAtmosphere && (
        <>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-cosmic-glow pointer-events-none -z-10" />
          <div className="absolute top-1/4 right-0 w-[400px] h-[400px] bg-solar-flare pointer-events-none -z-10" />
        </>
      )}
      {children}
    </div>
  );
};

export default PageContainer;
