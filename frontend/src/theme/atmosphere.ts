/**
 * CINEMATIC ATMOSPHERE FOUNDATION — VEYA LUMA
 *
 * Visual Architecture:
 *   Base Theme (Dark / Light)
 *          +
 *   Cinematic Atmosphere (Genre / Movie / Context)
 *          ↓
 *   Theme Resolver (resolveCinematicAtmosphere)
 *          ↓
 *   Shared Cinematic UI Tokens
 *
 * Grounded in design/DESIGN.md & research/taxonomy.md.
 * Atmosphere provides subtle contextual resonance without recoloring the entire application.
 */

export type BaseTheme = 'dark' | 'light';

export interface AtmosphereGradient {
  radial: string;
  border: string;
}

export interface AtmosphereTokens {
  accent: string;              // Primary accent color (hex or rgba)
  secondaryAccent: string;     // Secondary atmospheric accent
  glowIntensity: 'low' | 'medium' | 'high';
  glowColor: string;           // rgba glow value
  surfaceTint: string;         // Subtle overlay tint for ambient bleed
  gradient: AtmosphereGradient;
  badgeVariant: 'cyan' | 'violet' | 'amber' | 'teal' | 'crimson' | 'default';
  accentClass: string;         // Tailwind text class
  borderClass: string;         // Tailwind border class
  glowClass: string;           // Tailwind box-shadow class
}

export interface AtmosphereProfile {
  id: string;
  name: string;
  dark: AtmosphereTokens;
  light: AtmosphereTokens;
}

/**
 * Default core Cinematic Luminary atmosphere (Deep space obsidian + Luminous Cyan)
 */
export const DEFAULT_ATMOSPHERE_PROFILE: AtmosphereProfile = {
  id: 'default',
  name: 'Cinematic Luminary',
  dark: {
    accent: '#00F0FF',
    secondaryAccent: '#8A5CFF',
    glowIntensity: 'medium',
    glowColor: 'rgba(0, 240, 255, 0.25)',
    surfaceTint: 'rgba(0, 240, 255, 0.04)',
    gradient: {
      radial: 'radial-gradient(circle at 50% 20%, rgba(0, 240, 255, 0.08), rgba(138, 92, 255, 0.04) 60%, transparent 80%)',
      border: 'linear-gradient(135deg, rgba(0, 240, 255, 0.4) 0%, rgba(138, 92, 255, 0.15) 50%, rgba(255, 255, 255, 0.05) 100%)',
    },
    badgeVariant: 'cyan',
    accentClass: 'text-luminous-cyan',
    borderClass: 'border-luminous-cyan/40',
    glowClass: 'shadow-cyan-glow',
  },
  light: {
    accent: '#0097A7',
    secondaryAccent: '#6A1B9A',
    glowIntensity: 'low',
    glowColor: 'rgba(0, 151, 167, 0.2)',
    surfaceTint: 'rgba(0, 151, 167, 0.03)',
    gradient: {
      radial: 'radial-gradient(circle at 50% 20%, rgba(0, 151, 167, 0.06), rgba(106, 27, 154, 0.03) 60%, transparent 80%)',
      border: 'linear-gradient(135deg, rgba(0, 151, 167, 0.3) 0%, rgba(106, 27, 154, 0.12) 50%, rgba(0, 0, 0, 0.05) 100%)',
    },
    badgeVariant: 'cyan',
    accentClass: 'text-teal-700',
    borderClass: 'border-teal-600/30',
    glowClass: 'shadow-cyan-glow',
  },
};

/**
 * Genre-specific atmospheric profiles mapped from canonical project taxonomy.
 * Colors are restrained and tailored for ambient bleed rather than global page recoloring.
 */
export const GENRE_ATMOSPHERE_PROFILES: Record<string, AtmosphereProfile> = {
  'sci-fi': {
    id: 'sci-fi',
    name: 'Sci-Fi',
    dark: {
      accent: '#00F0FF',
      secondaryAccent: '#7038FF',
      glowIntensity: 'high',
      glowColor: 'rgba(0, 240, 255, 0.3)',
      surfaceTint: 'rgba(0, 240, 255, 0.05)',
      gradient: {
        radial: 'radial-gradient(circle at 50% 20%, rgba(0, 240, 255, 0.10), rgba(112, 56, 255, 0.05) 60%, transparent 80%)',
        border: 'linear-gradient(135deg, rgba(0, 240, 255, 0.45) 0%, rgba(112, 56, 255, 0.2) 50%, rgba(255, 255, 255, 0.05) 100%)',
      },
      badgeVariant: 'cyan',
      accentClass: 'text-luminous-cyan',
      borderClass: 'border-luminous-cyan/40',
      glowClass: 'shadow-cyan-glow',
    },
    light: {
      accent: '#00838F',
      secondaryAccent: '#4A148C',
      glowIntensity: 'low',
      glowColor: 'rgba(0, 131, 143, 0.2)',
      surfaceTint: 'rgba(0, 131, 143, 0.03)',
      gradient: {
        radial: 'radial-gradient(circle at 50% 20%, rgba(0, 131, 143, 0.07), rgba(74, 20, 140, 0.04) 60%, transparent 80%)',
        border: 'linear-gradient(135deg, rgba(0, 131, 143, 0.35) 0%, rgba(74, 20, 140, 0.15) 50%, rgba(0, 0, 0, 0.05) 100%)',
      },
      badgeVariant: 'cyan',
      accentClass: 'text-cyan-800',
      borderClass: 'border-cyan-700/30',
      glowClass: 'shadow-cyan-glow',
    },
  },

  drama: {
    id: 'drama',
    name: 'Drama',
    dark: {
      accent: '#FFB443',
      secondaryAccent: '#E87A30',
      glowIntensity: 'medium',
      glowColor: 'rgba(255, 180, 67, 0.25)',
      surfaceTint: 'rgba(255, 180, 67, 0.04)',
      gradient: {
        radial: 'radial-gradient(circle at 50% 20%, rgba(255, 180, 67, 0.09), rgba(232, 122, 48, 0.04) 60%, transparent 80%)',
        border: 'linear-gradient(135deg, rgba(255, 180, 67, 0.4) 0%, rgba(232, 122, 48, 0.15) 50%, rgba(255, 255, 255, 0.05) 100%)',
      },
      badgeVariant: 'amber',
      accentClass: 'text-luminous-amber',
      borderClass: 'border-luminous-amber/40',
      glowClass: 'shadow-amber-glow',
    },
    light: {
      accent: '#B26A00',
      secondaryAccent: '#BF360C',
      glowIntensity: 'low',
      glowColor: 'rgba(178, 106, 0, 0.18)',
      surfaceTint: 'rgba(178, 106, 0, 0.03)',
      gradient: {
        radial: 'radial-gradient(circle at 50% 20%, rgba(178, 106, 0, 0.06), rgba(191, 54, 12, 0.03) 60%, transparent 80%)',
        border: 'linear-gradient(135deg, rgba(178, 106, 0, 0.3) 0%, rgba(191, 54, 12, 0.12) 50%, rgba(0, 0, 0, 0.05) 100%)',
      },
      badgeVariant: 'amber',
      accentClass: 'text-amber-800',
      borderClass: 'border-amber-700/30',
      glowClass: 'shadow-amber-glow',
    },
  },

  thriller: {
    id: 'thriller',
    name: 'Thriller',
    dark: {
      accent: '#FF4D6D',
      secondaryAccent: '#D82855',
      glowIntensity: 'high',
      glowColor: 'rgba(255, 77, 109, 0.28)',
      surfaceTint: 'rgba(255, 77, 109, 0.04)',
      gradient: {
        radial: 'radial-gradient(circle at 50% 20%, rgba(255, 77, 109, 0.09), rgba(216, 40, 85, 0.04) 60%, transparent 80%)',
        border: 'linear-gradient(135deg, rgba(255, 77, 109, 0.42) 0%, rgba(216, 40, 85, 0.16) 50%, rgba(255, 255, 255, 0.05) 100%)',
      },
      badgeVariant: 'crimson',
      accentClass: 'text-luminous-crimson',
      borderClass: 'border-luminous-crimson/40',
      glowClass: 'shadow-crimson-glow',
    },
    light: {
      accent: '#C2185B',
      secondaryAccent: '#880E4F',
      glowIntensity: 'low',
      glowColor: 'rgba(194, 24, 91, 0.18)',
      surfaceTint: 'rgba(194, 24, 91, 0.03)',
      gradient: {
        radial: 'radial-gradient(circle at 50% 20%, rgba(194, 24, 91, 0.06), rgba(136, 14, 79, 0.03) 60%, transparent 80%)',
        border: 'linear-gradient(135deg, rgba(194, 24, 91, 0.3) 0%, rgba(136, 14, 79, 0.12) 50%, rgba(0, 0, 0, 0.05) 100%)',
      },
      badgeVariant: 'crimson',
      accentClass: 'text-rose-800',
      borderClass: 'border-rose-700/30',
      glowClass: 'shadow-crimson-glow',
    },
  },

  mystery: {
    id: 'mystery',
    name: 'Mystery',
    dark: {
      accent: '#7038FF',
      secondaryAccent: '#00F0FF',
      glowIntensity: 'medium',
      glowColor: 'rgba(112, 56, 255, 0.25)',
      surfaceTint: 'rgba(112, 56, 255, 0.04)',
      gradient: {
        radial: 'radial-gradient(circle at 50% 20%, rgba(112, 56, 255, 0.09), rgba(0, 240, 255, 0.04) 60%, transparent 80%)',
        border: 'linear-gradient(135deg, rgba(112, 56, 255, 0.4) 0%, rgba(0, 240, 255, 0.15) 50%, rgba(255, 255, 255, 0.05) 100%)',
      },
      badgeVariant: 'violet',
      accentClass: 'text-secondary',
      borderClass: 'border-secondary/40',
      glowClass: 'shadow-violet-glow',
    },
    light: {
      accent: '#4527A0',
      secondaryAccent: '#00838F',
      glowIntensity: 'low',
      glowColor: 'rgba(69, 39, 160, 0.18)',
      surfaceTint: 'rgba(69, 39, 160, 0.03)',
      gradient: {
        radial: 'radial-gradient(circle at 50% 20%, rgba(69, 39, 160, 0.06), rgba(0, 131, 143, 0.03) 60%, transparent 80%)',
        border: 'linear-gradient(135deg, rgba(69, 39, 160, 0.3) 0%, rgba(0, 131, 143, 0.12) 50%, rgba(0, 0, 0, 0.05) 100%)',
      },
      badgeVariant: 'violet',
      accentClass: 'text-indigo-800',
      borderClass: 'border-indigo-700/30',
      glowClass: 'shadow-violet-glow',
    },
  },

  'neo-noir': {
    id: 'neo-noir',
    name: 'Neo-Noir',
    dark: {
      accent: '#00F0FF',
      secondaryAccent: '#FFB443',
      glowIntensity: 'medium',
      glowColor: 'rgba(0, 240, 255, 0.25)',
      surfaceTint: 'rgba(0, 240, 255, 0.03)',
      gradient: {
        radial: 'radial-gradient(circle at 50% 20%, rgba(0, 240, 255, 0.08), rgba(255, 180, 67, 0.03) 60%, transparent 80%)',
        border: 'linear-gradient(135deg, rgba(0, 240, 255, 0.4) 0%, rgba(255, 180, 67, 0.15) 50%, rgba(255, 255, 255, 0.05) 100%)',
      },
      badgeVariant: 'cyan',
      accentClass: 'text-luminous-cyan',
      borderClass: 'border-luminous-cyan/40',
      glowClass: 'shadow-cyan-glow',
    },
    light: {
      accent: '#006064',
      secondaryAccent: '#E65100',
      glowIntensity: 'low',
      glowColor: 'rgba(0, 96, 100, 0.18)',
      surfaceTint: 'rgba(0, 96, 100, 0.03)',
      gradient: {
        radial: 'radial-gradient(circle at 50% 20%, rgba(0, 96, 100, 0.06), rgba(230, 81, 0, 0.03) 60%, transparent 80%)',
        border: 'linear-gradient(135deg, rgba(0, 96, 100, 0.3) 0%, rgba(230, 81, 0, 0.12) 50%, rgba(0, 0, 0, 0.05) 100%)',
      },
      badgeVariant: 'cyan',
      accentClass: 'text-cyan-900',
      borderClass: 'border-cyan-800/30',
      glowClass: 'shadow-cyan-glow',
    },
  },

  romance: {
    id: 'romance',
    name: 'Romance',
    dark: {
      accent: '#FF5E8E',
      secondaryAccent: '#D82855',
      glowIntensity: 'medium',
      glowColor: 'rgba(255, 94, 142, 0.25)',
      surfaceTint: 'rgba(255, 94, 142, 0.04)',
      gradient: {
        radial: 'radial-gradient(circle at 50% 20%, rgba(255, 94, 142, 0.08), rgba(216, 40, 85, 0.04) 60%, transparent 80%)',
        border: 'linear-gradient(135deg, rgba(255, 94, 142, 0.4) 0%, rgba(216, 40, 85, 0.15) 50%, rgba(255, 255, 255, 0.05) 100%)',
      },
      badgeVariant: 'crimson',
      accentClass: 'text-rose-400',
      borderClass: 'border-rose-400/40',
      glowClass: 'shadow-crimson-glow',
    },
    light: {
      accent: '#AD1457',
      secondaryAccent: '#880E4F',
      glowIntensity: 'low',
      glowColor: 'rgba(173, 20, 87, 0.18)',
      surfaceTint: 'rgba(173, 20, 87, 0.03)',
      gradient: {
        radial: 'radial-gradient(circle at 50% 20%, rgba(173, 20, 87, 0.06), rgba(136, 14, 79, 0.03) 60%, transparent 80%)',
        border: 'linear-gradient(135deg, rgba(173, 20, 87, 0.3) 0%, rgba(136, 14, 79, 0.12) 50%, rgba(0, 0, 0, 0.05) 100%)',
      },
      badgeVariant: 'crimson',
      accentClass: 'text-rose-900',
      borderClass: 'border-rose-800/30',
      glowClass: 'shadow-crimson-glow',
    },
  },

  adventure: {
    id: 'adventure',
    name: 'Adventure',
    dark: {
      accent: '#14F195',
      secondaryAccent: '#00D2B4',
      glowIntensity: 'medium',
      glowColor: 'rgba(20, 241, 149, 0.25)',
      surfaceTint: 'rgba(20, 241, 149, 0.04)',
      gradient: {
        radial: 'radial-gradient(circle at 50% 20%, rgba(20, 241, 149, 0.08), rgba(0, 210, 180, 0.04) 60%, transparent 80%)',
        border: 'linear-gradient(135deg, rgba(20, 241, 149, 0.4) 0%, rgba(0, 210, 180, 0.15) 50%, rgba(255, 255, 255, 0.05) 100%)',
      },
      badgeVariant: 'teal',
      accentClass: 'text-accent-teal',
      borderClass: 'border-accent-teal/40',
      glowClass: 'shadow-teal-glow',
    },
    light: {
      accent: '#00796B',
      secondaryAccent: '#004D40',
      glowIntensity: 'low',
      glowColor: 'rgba(0, 121, 107, 0.18)',
      surfaceTint: 'rgba(0, 121, 107, 0.03)',
      gradient: {
        radial: 'radial-gradient(circle at 50% 20%, rgba(0, 121, 107, 0.06), rgba(0, 77, 64, 0.03) 60%, transparent 80%)',
        border: 'linear-gradient(135deg, rgba(0, 121, 107, 0.3) 0%, rgba(0, 77, 64, 0.12) 50%, rgba(0, 0, 0, 0.05) 100%)',
      },
      badgeVariant: 'teal',
      accentClass: 'text-teal-900',
      borderClass: 'border-teal-800/30',
      glowClass: 'shadow-teal-glow',
    },
  },

  horror: {
    id: 'horror',
    name: 'Horror',
    dark: {
      accent: '#8A5CFF',
      secondaryAccent: '#FF4D6D',
      glowIntensity: 'high',
      glowColor: 'rgba(138, 92, 255, 0.28)',
      surfaceTint: 'rgba(138, 92, 255, 0.04)',
      gradient: {
        radial: 'radial-gradient(circle at 50% 20%, rgba(138, 92, 255, 0.09), rgba(255, 77, 109, 0.05) 60%, transparent 80%)',
        border: 'linear-gradient(135deg, rgba(138, 92, 255, 0.42) 0%, rgba(255, 77, 109, 0.18) 50%, rgba(255, 255, 255, 0.05) 100%)',
      },
      badgeVariant: 'violet',
      accentClass: 'text-secondary',
      borderClass: 'border-secondary/40',
      glowClass: 'shadow-violet-glow',
    },
    light: {
      accent: '#512DA8',
      secondaryAccent: '#B71C1C',
      glowIntensity: 'low',
      glowColor: 'rgba(81, 45, 168, 0.18)',
      surfaceTint: 'rgba(81, 45, 168, 0.03)',
      gradient: {
        radial: 'radial-gradient(circle at 50% 20%, rgba(81, 45, 168, 0.06), rgba(183, 28, 28, 0.03) 60%, transparent 80%)',
        border: 'linear-gradient(135deg, rgba(81, 45, 168, 0.3) 0%, rgba(183, 28, 28, 0.12) 50%, rgba(0, 0, 0, 0.05) 100%)',
      },
      badgeVariant: 'violet',
      accentClass: 'text-purple-900',
      borderClass: 'border-purple-800/30',
      glowClass: 'shadow-violet-glow',
    },
  },

  comedy: {
    id: 'comedy',
    name: 'Comedy',
    dark: {
      accent: '#FFB443',
      secondaryAccent: '#FF7A00',
      glowIntensity: 'medium',
      glowColor: 'rgba(255, 180, 67, 0.25)',
      surfaceTint: 'rgba(255, 180, 67, 0.04)',
      gradient: {
        radial: 'radial-gradient(circle at 50% 20%, rgba(255, 180, 67, 0.08), rgba(255, 122, 0, 0.04) 60%, transparent 80%)',
        border: 'linear-gradient(135deg, rgba(255, 180, 67, 0.4) 0%, rgba(255, 122, 0, 0.15) 50%, rgba(255, 255, 255, 0.05) 100%)',
      },
      badgeVariant: 'amber',
      accentClass: 'text-luminous-amber',
      borderClass: 'border-luminous-amber/40',
      glowClass: 'shadow-amber-glow',
    },
    light: {
      accent: '#D84315',
      secondaryAccent: '#E65100',
      glowIntensity: 'low',
      glowColor: 'rgba(216, 67, 21, 0.18)',
      surfaceTint: 'rgba(216, 67, 21, 0.03)',
      gradient: {
        radial: 'radial-gradient(circle at 50% 20%, rgba(216, 67, 21, 0.06), rgba(230, 81, 0, 0.03) 60%, transparent 80%)',
        border: 'linear-gradient(135deg, rgba(216, 67, 21, 0.3) 0%, rgba(230, 81, 0, 0.12) 50%, rgba(0, 0, 0, 0.05) 100%)',
      },
      badgeVariant: 'amber',
      accentClass: 'text-orange-900',
      borderClass: 'border-orange-800/30',
      glowClass: 'shadow-amber-glow',
    },
  },
};

/**
 * Genre canonical key aliases for robust matching.
 */
const GENRE_KEY_ALIASES: Record<string, string> = {
  'sci-fi': 'sci-fi',
  'science fiction': 'sci-fi',
  scifi: 'sci-fi',
  drama: 'drama',
  thriller: 'thriller',
  mystery: 'mystery',
  'neo-noir': 'neo-noir',
  noir: 'neo-noir',
  romance: 'romance',
  adventure: 'adventure',
  horror: 'horror',
  comedy: 'comedy',
  'black comedy': 'comedy',
  'dark comedy': 'comedy',
  'art-house': 'mystery', // shares contemplative deep spectrum
  arthouse: 'mystery',
  philosophy: 'mystery',
  crime: 'thriller',
  psychological: 'thriller',
  suspense: 'thriller',
  action: 'adventure',
  animation: 'adventure',
  animated: 'adventure',
  anime: 'sci-fi',
  fantasy: 'sci-fi',
  documentary: 'drama',
  biopic: 'drama',
  historical: 'drama',
  history: 'drama',
  war: 'drama',
  music: 'romance',
  musical: 'romance',
  western: 'adventure',
};

export interface ResolveAtmosphereOptions {
  genre?: string | null;
  baseTheme?: BaseTheme;
}

/**
 * Resolves the cinematic atmosphere tokens based on the current context (genre) and base theme (dark/light).
 * Defaults to the Cinematic Luminary dark atmosphere when no genre is specified or if an unknown genre is supplied.
 */
export function resolveCinematicAtmosphere(options?: ResolveAtmosphereOptions): AtmosphereTokens {
  const baseTheme = options?.baseTheme || 'dark';

  if (!options?.genre) {
    return DEFAULT_ATMOSPHERE_PROFILE[baseTheme];
  }

  const normalized = options.genre.trim().toLowerCase();
  const canonicalKey = GENRE_KEY_ALIASES[normalized] || (GENRE_ATMOSPHERE_PROFILES[normalized] ? normalized : undefined);

  if (!canonicalKey || !GENRE_ATMOSPHERE_PROFILES[canonicalKey]) {
    return DEFAULT_ATMOSPHERE_PROFILE[baseTheme];
  }

  const profile = GENRE_ATMOSPHERE_PROFILES[canonicalKey];
  return profile[baseTheme];
}

/**
 * Maps resolved atmospheric tokens to standardized CSS custom properties.
 * Exposes core accents, glows, surface tints, radial gradients, and borders.
 */
export function getAtmosphereCssVariables(tokens: AtmosphereTokens): Record<string, string> {
  return {
    '--vl-accent': tokens.accent,
    '--vl-accent-secondary': tokens.secondaryAccent,
    '--vl-atmosphere-glow': tokens.glowColor,
    '--vl-atmosphere-surface': tokens.surfaceTint,
    '--vl-atmosphere-gradient': tokens.gradient.radial,
    '--vl-atmosphere-border': tokens.gradient.border,
  };
}
