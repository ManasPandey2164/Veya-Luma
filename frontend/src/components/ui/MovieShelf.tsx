import React, { useRef, useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../utils/cn';
import { SectionHeader } from './SectionHeader';

export interface MovieShelfProps {
  title?: string;
  eyebrow?: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  layout?: 'shelf' | 'grid';
  allowScrollControls?: boolean;
  className?: string;
}

export const MovieShelf: React.FC<MovieShelfProps> = ({
  title,
  eyebrow,
  description,
  action,
  children,
  layout = 'shelf',
  allowScrollControls = true,
  className,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 10);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  }, []);

  useEffect(() => {
    if (layout === 'shelf') {
      checkScroll();
      window.addEventListener('resize', checkScroll);
      return () => window.removeEventListener('resize', checkScroll);
    }
  }, [layout, checkScroll, children]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const offset = scrollContainerRef.current.clientWidth * 0.75;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -offset : offset,
        behavior: 'smooth',
      });
      setTimeout(checkScroll, 350);
    }
  };

  return (
    <section className={cn('w-full my-8 md:my-12', className)}>
      {(title || eyebrow || action) && (
        <div className="flex items-end justify-between mb-4">
          <SectionHeader
            title={title || ''}
            eyebrow={eyebrow}
            description={description}
            action={
              <div className="flex items-center gap-3">
                {action}
                {layout === 'shelf' && allowScrollControls && (
                  <div className="hidden sm:flex items-center gap-1.5 ml-2">
                    <button
                      type="button"
                      aria-label="Scroll left"
                      onClick={() => scroll('left')}
                      disabled={!canScrollLeft}
                      className="w-8 h-8 rounded-full flex items-center justify-center bg-obsidian-surface border border-white/10 text-slate-300 hover:text-white hover:border-white/30 disabled:opacity-30 disabled:pointer-events-none transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-luminous-cyan"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      aria-label="Scroll right"
                      onClick={() => scroll('right')}
                      disabled={!canScrollRight}
                      className="w-8 h-8 rounded-full flex items-center justify-center bg-obsidian-surface border border-white/10 text-slate-300 hover:text-white hover:border-white/30 disabled:opacity-30 disabled:pointer-events-none transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-luminous-cyan"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            }
            className="mb-0"
          />
        </div>
      )}

      {layout === 'shelf' ? (
        <div
          ref={scrollContainerRef}
          onScroll={checkScroll}
          className="flex gap-4 md:gap-6 overflow-x-auto no-scrollbar scroll-smooth pb-4 pt-1 px-1 -mx-1"
        >
          {children}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6 pt-1">
          {children}
        </div>
      )}
    </section>
  );
};

export default MovieShelf;
