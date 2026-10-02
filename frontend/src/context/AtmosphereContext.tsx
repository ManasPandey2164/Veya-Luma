import React, { createContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  AtmosphereTokens,
  resolveCinematicAtmosphere,
  getAtmosphereCssVariables,
  DEFAULT_ATMOSPHERE_PROFILE,
} from '../theme/atmosphere';
import { usePreferences } from './usePreferences';

export interface AtmosphereContextValue {
  activeGenre: string | null;
  tokens: AtmosphereTokens;
  cssVariables: Record<string, string>;
  setAtmosphereGenre: (genre: string | null) => void;
  resetAtmosphere: () => void;
}

const defaultTokens = DEFAULT_ATMOSPHERE_PROFILE.dark;

export const AtmosphereContext = createContext<AtmosphereContextValue>({
  activeGenre: null,
  tokens: defaultTokens,
  cssVariables: getAtmosphereCssVariables(defaultTokens),
  setAtmosphereGenre: () => {},
  resetAtmosphere: () => {},
});

export interface AtmosphereProviderProps {
  children: React.ReactNode;
  initialGenre?: string | null;
}

export const AtmosphereProvider: React.FC<AtmosphereProviderProps> = ({
  children,
  initialGenre = null,
}) => {
  const { accountPreferences } = usePreferences();
  const baseTheme = accountPreferences?.baseTheme || 'dark';

  const [activeGenre, setActiveGenre] = useState<string | null>(initialGenre);

  const tokens = useMemo(() => {
    return resolveCinematicAtmosphere({
      genre: activeGenre,
      baseTheme,
    });
  }, [activeGenre, baseTheme]);

  const cssVariables = useMemo(() => {
    return getAtmosphereCssVariables(tokens);
  }, [tokens]);

  const setAtmosphereGenre = useCallback((genre: string | null) => {
    setActiveGenre(genre);
  }, []);

  const resetAtmosphere = useCallback(() => {
    setActiveGenre(null);
  }, []);

  // Synchronize CSS custom properties to documentElement
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      Object.entries(cssVariables).forEach(([key, value]) => {
        root.style.setProperty(key, value);
      });
    }
  }, [cssVariables]);

  const value = useMemo(
    () => ({
      activeGenre,
      tokens,
      cssVariables,
      setAtmosphereGenre,
      resetAtmosphere,
    }),
    [activeGenre, tokens, cssVariables, setAtmosphereGenre, resetAtmosphere]
  );

  return (
    <AtmosphereContext.Provider value={value}>
      {children}
    </AtmosphereContext.Provider>
  );
};

/**
 * Isolated Atmosphere Scope for sub-trees that need their own local atmospheric palette
 * (e.g. previewing a specific genre or movie card without changing the global atmosphere).
 */
export interface AtmosphereScopeProps {
  genre: string | null;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}

export const AtmosphereScope: React.FC<AtmosphereScopeProps> = ({
  genre,
  className,
  style,
  children,
}) => {
  const { accountPreferences } = usePreferences();
  const baseTheme = accountPreferences?.baseTheme || 'dark';

  const tokens = useMemo(() => {
    return resolveCinematicAtmosphere({ genre, baseTheme });
  }, [genre, baseTheme]);

  const scopeVars = useMemo(() => {
    return getAtmosphereCssVariables(tokens);
  }, [tokens]);

  return (
    <div
      className={className}
      style={{ ...scopeVars, ...style } as React.CSSProperties}
    >
      {children}
    </div>
  );
};

export default AtmosphereProvider;
