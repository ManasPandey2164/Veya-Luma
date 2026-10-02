import React, { useState } from 'react';
import { Bookmark, Heart, Film, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../../utils/cn';
import { Badge } from './Badge';
import { type MovieFixture } from '../../fixtures/movieFixtures';

export type MovieCardData = MovieFixture | {
  id: string;
  title: string;
  poster?: string;
  posterUrl?: string;
  backdrop?: string;
  backdropUrl?: string;
  year?: number | string;
  releaseYear?: number | string;
  runtime?: number;
  runtimeMinutes?: number;
  genres?: string[];
  matchScore?: number;
  director?: string;
  rating?: number;
};

export interface MovieCardProps {
  movie: MovieCardData;
  aspectRatio?: 'poster' | 'backdrop'; // 'poster' = 2:3, 'backdrop' = 16:9
  isSelected?: boolean;
  isWatchlisted?: boolean;
  isFavorite?: boolean;
  onWatchlistToggle?: (movieId: string) => void;
  onFavoriteToggle?: (movieId: string) => void;
  onClick?: (movieId: string) => void;
  to?: string;
  actionSlot?: React.ReactNode;
  className?: string;
}

export const MovieCard: React.FC<MovieCardProps> = ({
  movie,
  aspectRatio = 'poster',
  isSelected,
  isWatchlisted = false,
  isFavorite = false,
  onWatchlistToggle,
  onFavoriteToggle,
  onClick,
  to,
  actionSlot,
  className,
}) => {
  const [imgFailed, setImgFailed] = useState(false);

  const posterImg = 'poster' in movie ? movie.poster : 'posterUrl' in movie ? movie.posterUrl : undefined;
  const backdropImg = 'backdrop' in movie ? movie.backdrop : 'backdropUrl' in movie ? movie.backdropUrl : undefined;
  const imageUrl = aspectRatio === 'backdrop' ? backdropImg || posterImg : posterImg || backdropImg;

  const year = 'year' in movie ? movie.year : 'releaseYear' in movie ? movie.releaseYear : undefined;
  const runtime = 'runtime' in movie ? movie.runtime : 'runtimeMinutes' in movie ? movie.runtimeMinutes : undefined;

  const handleCardClick = () => {
    if (onClick) {
      onClick(movie.id);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (onClick) {
        onClick(movie.id);
      }
    }
  };

  const cardClasses = cn(
    'group relative flex flex-col justify-end overflow-hidden rounded-xl bg-obsidian-surface border transition-all duration-300 ease-card select-none cursor-pointer preserve-dark shadow-[0_4px_16px_rgba(20,23,31,0.06)] dark:shadow-none',
    isSelected
      ? 'border-luminous-cyan ring-2 ring-luminous-cyan/80 shadow-cyan-glow scale-[1.02]'
      : 'border-black/[0.08] dark:border-white/10 hover:scale-[1.02] hover:border-luminous-cyan/40 hover:shadow-cyan-glow',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-luminous-cyan/70 focus-visible:ring-offset-2 focus-visible:ring-offset-obsidian-void',
    aspectRatio === 'poster' ? 'aspect-[2/3] w-full min-w-[170px]' : 'aspect-video w-full min-w-[280px]',
    className
  );

  const cardInner = (
    <>
      {/* Background artwork or elegant abstract fallback */}
      {imageUrl && !imgFailed ? (
        <img
          src={imageUrl}
          alt={movie.title}
          onError={() => setImgFailed(true)}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 ease-card group-hover:scale-105"
          loading="lazy"
        />
      ) : (
        <div
          aria-hidden="true"
          className="absolute inset-0 w-full h-full bg-gradient-to-b from-obsidian-plate to-obsidian-surface flex flex-col items-center justify-center p-4 text-center pointer-events-none"
        >
          <Film className="w-10 h-10 text-white/20 mb-2 group-hover:text-luminous-cyan/40 transition-colors" />
        </div>
      )}

      {/* Cinematic vignette gradient overlay (DESIGN.md 5.3) */}
      <div className="absolute inset-0 bg-gradient-to-t from-obsidian-void via-obsidian-surface/60 to-transparent pointer-events-none" />

      {/* Top Floating Match Badge & Quick Actions */}
      <div className="absolute top-3 inset-x-3 flex items-center justify-between z-10">
        {isSelected ? (
          <Badge variant="cyan" size="sm" className="font-semibold shadow-cyan-glow bg-luminous-cyan/30 border-luminous-cyan">
            <Check className="w-3 h-3 mr-1" />
            Selected
          </Badge>
        ) : movie.matchScore ? (
          <Badge variant="cyan" size="sm" dot>
            {movie.matchScore}% Match
          </Badge>
        ) : (
          <div />
        )}

        <div className="flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
          {onWatchlistToggle && (
            <button
              type="button"
              aria-label={isWatchlisted ? `Remove ${movie.title} from watchlist` : `Add ${movie.title} to watchlist`}
              aria-pressed={isWatchlisted}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onWatchlistToggle(movie.id);
              }}
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md border transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-luminous-cyan',
                isWatchlisted
                  ? 'bg-luminous-cyan/20 border-luminous-cyan text-luminous-cyan'
                  : 'bg-obsidian-surface/80 border-white/10 text-slate-300 hover:text-white hover:border-white/30'
              )}
            >
              <Bookmark className="w-3.5 h-3.5" fill={isWatchlisted ? 'currentColor' : 'none'} />
            </button>
          )}

          {onFavoriteToggle && (
            <button
              type="button"
              aria-label={isFavorite ? `Remove ${movie.title} from favourites` : `Add ${movie.title} to favourites`}
              aria-pressed={isFavorite}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onFavoriteToggle(movie.id);
              }}
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md border transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-luminous-amber',
                isFavorite
                  ? 'bg-luminous-amber/20 border-luminous-amber text-luminous-amber'
                  : 'bg-obsidian-surface/80 border-white/10 text-slate-300 hover:text-white hover:border-white/30'
              )}
            >
              <Heart className="w-3.5 h-3.5" fill={isFavorite ? 'currentColor' : 'none'} />
            </button>
          )}
        </div>
      </div>

      {/* Bottom Content Metadata */}
      <div className="relative z-10 p-4 flex flex-col gap-1">
        <h3 className="font-editorial text-base md:text-lg font-bold text-white tracking-wide line-clamp-1 group-hover:text-luminous-cyan transition-colors">
          {movie.title}
        </h3>

        <div className="flex items-center gap-2 text-xs text-slate-400 font-sans">
          {year && <span>{year}</span>}
          {year && (runtime || (movie.genres && movie.genres.length > 0)) && (
            <span className="opacity-40">•</span>
          )}
          {runtime && <span>{runtime}m</span>}
          {runtime && movie.genres && movie.genres.length > 0 && (
            <span className="opacity-40">•</span>
          )}
          {movie.genres && movie.genres.length > 0 && (
            <span className="line-clamp-1">{movie.genres[0]}</span>
          )}
        </div>

        {movie.director && (
          <span className="text-[11px] text-slate-400 font-sans line-clamp-1 opacity-80">
            Dir. {movie.director}
          </span>
        )}

        {actionSlot && <div className="mt-2 pt-2 border-t border-white/10">{actionSlot}</div>}
      </div>
    </>
  );

  if (to) {
    return (
      <Link
        to={to}
        aria-label={`${movie.title}${year ? ` (${year})` : ''}`}
        onClick={handleCardClick}
        className={cardClasses}
      >
        {cardInner}
      </Link>
    );
  }

  return (
    <div
      role={onClick ? 'button' : 'article'}
      tabIndex={onClick ? 0 : undefined}
      aria-label={`${movie.title}${year ? ` (${year})` : ''}`}
      aria-pressed={isSelected !== undefined ? isSelected : undefined}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      className={cardClasses}
    >
      {cardInner}
    </div>
  );
};

export default MovieCard;
