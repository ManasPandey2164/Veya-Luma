import React, { createContext, useState, useEffect } from 'react';

export interface TastePreferencesState {
  isTasteDiscovered: boolean;
  selectedMovieIds: string[];
  selectedGenres: string[];
  selectedMoods: string[];
  selectedThemes: string[];
  selectedLanguage: string;
  preferredRuntime: string;
  pacingPreference: string;
}

export interface RecommendationPreferencesState {
  adventurousness: 'familiar' | 'balanced' | 'adventurous';
  unfamiliarGenres: 'stick-to-favorites' | 'occasional' | 'wide-open';
  preferredEra: 'all' | 'contemporary' | 'modern-classics' | 'golden-age';
  preferredRuntime: 'any' | 'concise' | 'extended';
  pacingPreference: 'contemplative' | 'dynamic' | 'flexible';
  languagePerspective: 'world' | 'english' | 'original-audio';
  diversityAppetite: 'focused' | 'moderate' | 'high';
  // Quantitative calibration settings (percentages for fine-tuning)
  noveltyAppetite: number;     // e.g. 70
  diversityDispersion: number; // e.g. 85
  indieTolerance: number;      // e.g. 60
}

export interface UserProfileState {
  displayName: string;
  curatorialTier: string;
  archetype: string;
  bio: string;
  avatarIcon: 'user' | 'prism' | 'sparkles' | 'compass';
}

export interface AccountPreferencesState {
  baseTheme: 'dark' | 'light';
  motionPreference: 'standard' | 'reduced';
  compactMode: boolean;
  analyticsConsent: boolean;
}

export interface PreferencesContextValue {
  tasteState: TastePreferencesState;
  recommendationPreferences: RecommendationPreferencesState;
  profileState: UserProfileState;
  accountPreferences: AccountPreferencesState;

  // State Updaters
  updateTastePreferences: (
    updater: Partial<TastePreferencesState> | ((prev: TastePreferencesState) => Partial<TastePreferencesState>)
  ) => void;
  updateRecommendationPreferences: (
    updater: Partial<RecommendationPreferencesState> | ((prev: RecommendationPreferencesState) => Partial<RecommendationPreferencesState>)
  ) => void;
  updateProfileState: (
    updater: Partial<UserProfileState> | ((prev: UserProfileState) => Partial<UserProfileState>)
  ) => void;
  updateAccountPreferences: (
    updater: Partial<AccountPreferencesState> | ((prev: AccountPreferencesState) => Partial<AccountPreferencesState>)
  ) => void;

  // Ergonomic helper actions
  toggleGenre: (genre: string) => void;
  toggleMood: (mood: string) => void;
  toggleTheme: (theme: string) => void;
  toggleAnchorMovie: (movieId: string) => void;
  setLanguage: (lang: string) => void;
  completeTasteDiscovery: (data: Partial<TastePreferencesState>) => void;
  resetTastePreferences: () => void;
  resetRecommendationPreferences: () => void;
  resetAccountPreferences: () => void;
  resetAll: () => void;
}

const DEFAULT_TASTE_PREFERENCES: TastePreferencesState = {
  isTasteDiscovered: true,
  selectedMovieIds: ['blade-runner-2049', 'arrival', 'stalker'],
  selectedGenres: ['Sci-Fi', 'Neo-Noir', 'Psychological', 'Mystery'],
  selectedMoods: ['Atmospheric', 'Contemplative', 'Thought-provoking'],
  selectedThemes: ['Artificial Intelligence & Identity', 'Memory & Determinism', 'Existentialism & Isolation'],
  selectedLanguage: 'world',
  preferredRuntime: 'any',
  pacingPreference: 'contemplative',
};

const DEFAULT_RECOMMENDATION_PREFERENCES: RecommendationPreferencesState = {
  adventurousness: 'balanced',
  unfamiliarGenres: 'occasional',
  preferredEra: 'all',
  preferredRuntime: 'any',
  pacingPreference: 'contemplative',
  languagePerspective: 'world',
  diversityAppetite: 'high',
  noveltyAppetite: 70,
  diversityDispersion: 85,
  indieTolerance: 60,
};

const DEFAULT_PROFILE_STATE: UserProfileState = {
  displayName: 'Curator 0x2A9F',
  curatorialTier: 'Curatorial Level I',
  archetype: 'Atmospheric Speculative Explorer',
  bio: 'Drawn to contemplative science fiction, atmospheric neo-noir, and non-linear existential narratives.',
  avatarIcon: 'user',
};

const DEFAULT_ACCOUNT_PREFERENCES: AccountPreferencesState = {
  baseTheme: 'dark',
  motionPreference: 'standard',
  compactMode: false,
  analyticsConsent: false,
};

const fallbackPreferencesContextValue: PreferencesContextValue = {
  tasteState: DEFAULT_TASTE_PREFERENCES,
  recommendationPreferences: DEFAULT_RECOMMENDATION_PREFERENCES,
  profileState: DEFAULT_PROFILE_STATE,
  accountPreferences: DEFAULT_ACCOUNT_PREFERENCES,
  updateTastePreferences: () => {},
  updateRecommendationPreferences: () => {},
  updateProfileState: () => {},
  updateAccountPreferences: () => {},
  toggleGenre: () => {},
  toggleMood: () => {},
  toggleTheme: () => {},
  toggleAnchorMovie: () => {},
  setLanguage: () => {},
  completeTasteDiscovery: () => {},
  resetTastePreferences: () => {},
  resetRecommendationPreferences: () => {},
  resetAccountPreferences: () => {},
  resetAll: () => {},
};

export const PreferencesContext = createContext<PreferencesContextValue>(fallbackPreferencesContextValue);

export interface PreferencesProviderProps {
  children: React.ReactNode;
  initialTasteState?: Partial<TastePreferencesState>;
  initialRecommendationPreferences?: Partial<RecommendationPreferencesState>;
  initialProfileState?: Partial<UserProfileState>;
  initialAccountPreferences?: Partial<AccountPreferencesState>;
}

export const PreferencesProvider: React.FC<PreferencesProviderProps> = ({
  children,
  initialTasteState,
  initialRecommendationPreferences,
  initialProfileState,
  initialAccountPreferences,
}) => {
  const [tasteState, setTasteState] = useState<TastePreferencesState>(() => ({
    ...DEFAULT_TASTE_PREFERENCES,
    ...initialTasteState,
  }));

  const [recommendationPreferences, setRecommendationPreferences] = useState<RecommendationPreferencesState>(() => ({
    ...DEFAULT_RECOMMENDATION_PREFERENCES,
    ...initialRecommendationPreferences,
  }));

  const [profileState, setProfileState] = useState<UserProfileState>(() => ({
    ...DEFAULT_PROFILE_STATE,
    ...initialProfileState,
  }));

  const [accountPreferences, setAccountPreferences] = useState<AccountPreferencesState>(() => {
    let themeFromEnv: 'dark' | 'light' | undefined;
    if (typeof window !== 'undefined') {
      const urlTheme = new URLSearchParams(window.location.search).get('theme');
      if (urlTheme === 'light' || urlTheme === 'dark') {
        themeFromEnv = urlTheme;
      } else if (!initialAccountPreferences?.baseTheme) {
        try {
          const saved = window.localStorage?.getItem('veya_theme');
          if (saved === 'light' || saved === 'dark') {
            themeFromEnv = saved;
          }
        } catch {
          // ignore
        }
      }
    }
    return {
      ...DEFAULT_ACCOUNT_PREFERENCES,
      ...(themeFromEnv ? { baseTheme: themeFromEnv } : {}),
      ...initialAccountPreferences,
    };
  });

  // Synchronize document attributes for theme, reduced motion, and compact mode
  useEffect(() => {
    if (typeof document !== 'undefined') {
      if (accountPreferences.baseTheme === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
        document.documentElement.classList.add('theme-light');
      } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        document.documentElement.classList.remove('theme-light');
      }
      document.documentElement.setAttribute(
        'data-reduced-motion',
        accountPreferences.motionPreference === 'reduced' ? 'true' : 'false'
      );
      document.documentElement.setAttribute(
        'data-compact-mode',
        accountPreferences.compactMode ? 'true' : 'false'
      );
      try {
        window.localStorage?.setItem('veya_theme', accountPreferences.baseTheme);
      } catch {
        // ignore
      }
    }
  }, [accountPreferences.baseTheme, accountPreferences.motionPreference, accountPreferences.compactMode]);

  const updateTastePreferences = (
    updater: Partial<TastePreferencesState> | ((prev: TastePreferencesState) => Partial<TastePreferencesState>)
  ) => {
    setTasteState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      return { ...prev, ...next };
    });
  };

  const updateRecommendationPreferences = (
    updater: Partial<RecommendationPreferencesState> | ((prev: RecommendationPreferencesState) => Partial<RecommendationPreferencesState>)
  ) => {
    setRecommendationPreferences((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      return { ...prev, ...next };
    });
  };

  const updateProfileState = (
    updater: Partial<UserProfileState> | ((prev: UserProfileState) => Partial<UserProfileState>)
  ) => {
    setProfileState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      return { ...prev, ...next };
    });
  };

  const updateAccountPreferences = (
    updater: Partial<AccountPreferencesState> | ((prev: AccountPreferencesState) => Partial<AccountPreferencesState>)
  ) => {
    setAccountPreferences((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      return { ...prev, ...next };
    });
  };

  const toggleGenre = (genre: string) => {
    setTasteState((prev) => ({
      ...prev,
      selectedGenres: prev.selectedGenres.includes(genre)
        ? prev.selectedGenres.filter((g) => g !== genre)
        : [...prev.selectedGenres, genre],
    }));
  };

  const toggleMood = (mood: string) => {
    setTasteState((prev) => ({
      ...prev,
      selectedMoods: prev.selectedMoods.includes(mood)
        ? prev.selectedMoods.filter((m) => m !== mood)
        : [...prev.selectedMoods, mood],
    }));
  };

  const toggleTheme = (theme: string) => {
    setTasteState((prev) => ({
      ...prev,
      selectedThemes: prev.selectedThemes.includes(theme)
        ? prev.selectedThemes.filter((t) => t !== theme)
        : [...prev.selectedThemes, theme],
    }));
  };

  const toggleAnchorMovie = (movieId: string) => {
    setTasteState((prev) => ({
      ...prev,
      selectedMovieIds: prev.selectedMovieIds.includes(movieId)
        ? prev.selectedMovieIds.filter((id) => id !== movieId)
        : [...prev.selectedMovieIds, movieId],
    }));
  };

  const setLanguage = (lang: string) => {
    setTasteState((prev) => ({
      ...prev,
      selectedLanguage: lang,
    }));
  };

  const completeTasteDiscovery = (data: Partial<TastePreferencesState>) => {
    setTasteState((prev) => ({
      ...prev,
      ...data,
      isTasteDiscovered: true,
    }));
  };

  const resetTastePreferences = () => {
    setTasteState(DEFAULT_TASTE_PREFERENCES);
  };

  const resetRecommendationPreferences = () => {
    setRecommendationPreferences(DEFAULT_RECOMMENDATION_PREFERENCES);
  };

  const resetAccountPreferences = () => {
    setAccountPreferences(DEFAULT_ACCOUNT_PREFERENCES);
  };

  const resetAll = () => {
    setTasteState(DEFAULT_TASTE_PREFERENCES);
    setRecommendationPreferences(DEFAULT_RECOMMENDATION_PREFERENCES);
    setProfileState(DEFAULT_PROFILE_STATE);
    setAccountPreferences(DEFAULT_ACCOUNT_PREFERENCES);
  };

  return (
    <PreferencesContext.Provider
      value={{
        tasteState,
        recommendationPreferences,
        profileState,
        accountPreferences,
        updateTastePreferences,
        updateRecommendationPreferences,
        updateProfileState,
        updateAccountPreferences,
        toggleGenre,
        toggleMood,
        toggleTheme,
        toggleAnchorMovie,
        setLanguage,
        completeTasteDiscovery,
        resetTastePreferences,
        resetRecommendationPreferences,
        resetAccountPreferences,
        resetAll,
      }}
    >
      {children}
    </PreferencesContext.Provider>
  );
};
