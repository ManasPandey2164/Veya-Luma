import React from 'react';
import { Search, X, ArrowRight } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface SearchInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSearch?: (query: string) => void;
  onClear?: () => void;
  placeholder?: string;
  shortcutKey?: string;
  ctaText?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  className?: string;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  onSearch,
  onClear,
  placeholder = 'Describe a feeling, mood, visual aesthetic, or auteur...',
  shortcutKey,
  ctaText = 'Discover',
  autoFocus = false,
  disabled = false,
  className,
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(value);
    }
  };

  const handleClear = () => {
    if (onClear) {
      onClear();
    }
  };

  return (
    <form
      role="search"
      aria-label="Movie search"
      onSubmit={handleSubmit}
      className={cn(
        'relative flex items-center w-full glass-card rounded-xl p-1.5 border border-white/10 shadow-2xl transition-all duration-300',
        'focus-within:border-luminous-cyan/50 focus-within:shadow-cyan-glow',
        disabled && 'opacity-50 pointer-events-none',
        className
      )}
    >
      <Search
        className="w-5 h-5 text-slate-400 ml-3 mr-2 shrink-0 transition-colors group-focus-within:text-luminous-cyan"
        aria-hidden="true"
      />

      <input
        type="text"
        role="searchbox"
        aria-label="Search movies by keyword, emotion, or auteur"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoFocus={autoFocus}
        disabled={disabled}
        className="w-full bg-transparent text-sm text-white placeholder-slate-400 focus:outline-none px-2 py-2.5 font-sans"
      />

      <div className="flex items-center gap-2 pr-1.5 shrink-0">
        {value && onClear && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Clear search input"
            className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-luminous-cyan"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {shortcutKey && !value && (
          <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-[10px] font-semibold text-slate-400 bg-white/5 border border-white/10 rounded-sm">
            {shortcutKey}
          </kbd>
        )}

        {onSearch && (
          <button
            type="submit"
            aria-label={`${ctaText} movies`}
            className="shrink-0 px-4 py-2 rounded-lg bg-luminous-cyan text-obsidian-void font-semibold text-xs hover:bg-luminous-cyan/90 transition-all flex items-center gap-1.5 shadow-sm active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-luminous-cyan/70"
          >
            <span>{ctaText}</span>
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        )}
      </div>
    </form>
  );
};

export default SearchInput;
