/**
 * DEVELOPMENT FIXTURE LAYER — VEYA LUMA PHASE 1
 *
 * NOTE: This is development-only mock fixture data for UI testing and visual verification.
 * It is NOT the production movie data system.
 * It does NOT originate from TMDB, external APIs, or PostgreSQL persistence.
 * Do not connect external movie APIs or recommendation algorithms here.
 */

export interface MovieExplanation {
  whyRecommended?: string;
  divergenceNote?: string;
}

/**
 * ARCHITECTURAL CONTRACT SEPARATION (Phase 2 — Movie Data Foundation)
 *
 * A. CANONICAL MOVIE DATA:
 *    Attributes belonging intrinsically to the movie catalog entity (derived from TMDB/canonical pipeline).
 *
 * B. PRESENTATION & RECOMMENDATION DATA:
 *    Algorithmic affinity scores, dynamic natural language rationales, and user-specific first-party state.
 *    These are NOT part of the permanent movie domain model.
 */
export interface MovieFixture {
  // --- A. CANONICAL MOVIE DATA ---
  /** Internal / slug identity (maps to canonical UUID in backend) */
  id: string;
  /** Primary display title */
  title: string;
  /** Release calendar year */
  year: number;
  /** Duration in minutes */
  runtime: number;
  /** Poster artwork path or URL */
  poster: string;
  /** Backdrop artwork path or URL */
  backdrop: string;
  /** Narrative synopsis / overview */
  synopsis: string;
  /** Canonical genres strictly conforming to Veya Luma taxonomy */
  genres: string[];
  /** Canonical themes strictly conforming to Veya Luma taxonomy */
  themes: string[];
  /** Canonical moods strictly conforming to Veya Luma taxonomy */
  moods: string[];
  /** Primary language name or ISO code */
  language: string;
  /** Principal director */
  director: string;
  /** Principal billed cast */
  cast: string[];
  /** Descriptive stylistic or subject tags */
  tags: string[];
  /** Upstream source rating fact (e.g. TMDB vote average) */
  rating?: number;

  // --- B. PRESENTATION / RECOMMENDATION DATA (Ephemeral & User-Scoped) ---
  /** Algorithmic match affinity percentage [0-100] (calculated by recommender, not intrinsic to movie) */
  matchScore?: number;
  /** Dynamic natural language justification produced by explainability framework */
  explanation?: MovieExplanation;
  /** First-party user library state simulation */
  isWatchlisted?: boolean;
  /** First-party user favourite state simulation */
  isFavorite?: boolean;
  /** User watch timestamp */
  watchedDate?: string;
  /** Graph / neighborhood related recommendations */
  relatedIds?: string[];
}


export const MOVIE_FIXTURES: MovieFixture[] = [
  {
    id: 'blade-runner-2049',
    title: 'Blade Runner 2049',
    year: 2017,
    runtime: 164,
    poster: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80',
    backdrop: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1200&auto=format&fit=crop&q=80',
    synopsis: 'Thirty years after the events of the first film, a new blade runner unearths a long-buried secret that has the potential to plunge what is left of society into chaos.',
    genres: ['Sci-Fi', 'Neo-Noir', 'Mystery'],
    themes: ['Artificial Intelligence', 'Identity', 'Memory', 'Existentialism'],
    moods: ['Atmospheric', 'Nocturnal', 'Melancholic', 'Contemplative'],
    language: 'English',
    director: 'Denis Villeneuve',
    cast: ['Ryan Gosling', 'Harrison Ford', 'Ana de Armas', 'Sylvia Hoeks', 'Robin Wright'],
    tags: ['cyberpunk', 'slow-burn', 'visual-masterpiece', 'dystopian'],
    rating: 8.0,
    matchScore: 98,
    explanation: {
      whyRecommended: 'High affinity for atmospheric neo-noir worldbuilding, contemplative pacing, and synthesized soundscapes.',
      divergenceNote: 'Slightly longer runtime than your median preference (164m vs 120m).',
    },
    isWatchlisted: true,
    isFavorite: true,
    watchedDate: '2026-09-14',
    relatedIds: ['arrival-2016', 'solaris-1972', 'drive-2011'],
  },
  {
    id: 'solaris-1972',
    title: 'Solaris',
    year: 1972,
    runtime: 167,
    poster: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
    backdrop: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&auto=format&fit=crop&q=80',
    synopsis: 'A psychologist is sent to a space station orbiting a mysterious ocean planet to investigate the emotional breakdown of the crew.',
    genres: ['Sci-Fi', 'Mystery', 'Psychological'],
    themes: ['Grief', 'Memory', 'Human Limitation', 'Cosmic Mystery'],
    moods: ['Meditative', 'Haunting', 'Philosophical', 'Hypnotic'],
    language: 'Russian',
    director: 'Andrei Tarkovsky',
    cast: ['Donatas Banionis', 'Natalya Bondarchuk', 'Jüri Järvet', 'Vladislav Dvorzhetsky'],
    tags: ['philosophical', 'slow-burn', 'classic', 'art-house'],
    rating: 8.1,
    matchScore: 96,
    explanation: {
      whyRecommended: 'Philosophical inquiry, meditative tempo, and deep psychological resonance.',
      divergenceNote: 'Slow-burn pacing with prolonged dialogue-free sequences.',
    },
    isWatchlisted: true,
    isFavorite: false,
    watchedDate: '2026-08-28',
    relatedIds: ['stalker-1979', 'blade-runner-2049', 'arrival-2016'],
  },
  {
    id: 'arrival-2016',
    title: 'Arrival',
    year: 2016,
    runtime: 116,
    poster: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=600&auto=format&fit=crop&q=80',
    backdrop: 'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=1200&auto=format&fit=crop&q=80',
    synopsis: 'A linguist works with the military to communicate with alien lifeforms after twelve mysterious spacecraft appear around the world.',
    genres: ['Sci-Fi', 'Drama', 'Mystery'],
    themes: ['Communication', 'Determinism', 'Time', 'Grief'],
    moods: ['Intellectual', 'Emotional', 'Tense', 'Wonder'],
    language: 'English',
    director: 'Denis Villeneuve',
    cast: ['Amy Adams', 'Jeremy Renner', 'Forest Whitaker', 'Michael Stuhlbarg'],
    tags: ['non-linear', 'linguistics', 'mind-bending', 'emotional-depth'],
    rating: 7.9,
    matchScore: 95,
    explanation: {
      whyRecommended: 'Matches your interest in non-linear temporal structure and intellectual curiosity.',
    },
    isWatchlisted: false,
    isFavorite: true,
    watchedDate: '2026-09-02',
    relatedIds: ['blade-runner-2049', 'solaris-1972', 'memento-2000'],
  },
  {
    id: 'stalker-1979',
    title: 'Stalker',
    year: 1979,
    runtime: 162,
    poster: 'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=600&auto=format&fit=crop&q=80',
    backdrop: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&auto=format&fit=crop&q=80',
    synopsis: 'A guide leads two men through a hazardous, surreal area known as the Zone to find a mythical room that grants deepest desires.',
    genres: ['Sci-Fi', 'Art-House', 'Philosophy'],
    themes: ['Faith', 'Desire', 'Desolation', 'Human Nature'],
    moods: ['Meditative', 'Dissonant', 'Mystical', 'Bleak'],
    language: 'Russian',
    director: 'Andrei Tarkovsky',
    cast: ['Aleksandr Kaidanovsky', 'Anatoly Solonitsyn', 'Nikolai Grinko', 'Alisa Freindlich'],
    tags: ['poetic-cinema', 'existential', 'masterpiece', 'slow-burn'],
    rating: 8.1,
    matchScore: 93,
    explanation: {
      whyRecommended: 'Uncompromising philosophical depth and visual poetics.',
    },
    isWatchlisted: true,
    isFavorite: true,
    watchedDate: '2026-07-19',
    relatedIds: ['solaris-1972', 'blade-runner-2049', 'in-the-mood-for-love-2000'],
  },
  {
    id: 'drive-2011',
    title: 'Drive',
    year: 2011,
    runtime: 100,
    poster: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80',
    backdrop: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1200&auto=format&fit=crop&q=80',
    synopsis: 'A Hollywood stunt driver moonlighting as a getaway driver finds himself in trouble when he helps out his neighbor.',
    genres: ['Crime', 'Neo-Noir', 'Drama'],
    themes: ['Morality', 'Isolation', 'Violence', 'Chivalry'],
    moods: ['Nocturnal', 'Visceral', 'Stylized', 'Tense'],
    language: 'English',
    director: 'Nicolas Winding Refn',
    cast: ['Ryan Gosling', 'Carey Mulligan', 'Bryan Cranston', 'Albert Brooks', 'Oscar Isaac'],
    tags: ['synth-wave', 'minimalist-dialogue', 'stylish', 'cult-classic'],
    rating: 7.8,
    matchScore: 91,
    explanation: {
      whyRecommended: 'Electrifying nocturnal aesthetic with synth-wave resonance and minimalist dialogue.',
    },
    isWatchlisted: false,
    isFavorite: false,
    watchedDate: '2026-06-11',
    relatedIds: ['blade-runner-2049', 'memento-2000', 'parasite-2019'],
  },
  {
    id: 'memento-2000',
    title: 'Memento',
    year: 2000,
    runtime: 113,
    poster: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=600&auto=format&fit=crop&q=80',
    backdrop: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=1200&auto=format&fit=crop&q=80',
    synopsis: 'A man with short-term memory loss attempts to track down his wife’s murderer using notes and tattoos to guide himself.',
    genres: ['Mystery', 'Thriller', 'Non-Linear'],
    themes: ['Memory', 'Deception', 'Grief', 'Vengeance'],
    moods: ['Puzzling', 'Tense', 'Cerebral', 'Disorienting'],
    language: 'English',
    director: 'Christopher Nolan',
    cast: ['Guy Pearce', 'Carrie-Anne Moss', 'Joe Pantoliano', 'Mark Boone Junior'],
    tags: ['reverse-chronology', 'puzzle-plot', 'neo-noir', 'psychological'],
    rating: 8.4,
    matchScore: 89,
    explanation: {
      whyRecommended: 'Pioneering reverse-chronological structure matching your interest in temporal puzzle narratives.',
    },
    isWatchlisted: false,
    isFavorite: true,
    watchedDate: '2026-05-20',
    relatedIds: ['arrival-2016', 'drive-2011', 'parasite-2019'],
  },
  {
    id: 'in-the-mood-for-love-2000',
    title: 'In the Mood for Love',
    year: 2000,
    runtime: 98,
    poster: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
    backdrop: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1200&auto=format&fit=crop&q=80',
    synopsis: 'Two neighbors form a delicate bond after discovering their respective spouses are having an affair together.',
    genres: ['Drama', 'Romance', 'Art-House'],
    themes: ['Longing', 'Restraint', 'Memory', 'Time'],
    moods: ['Melancholic', 'Sensual', 'Intimate', 'Lyrical'],
    language: 'Cantonese',
    director: 'Wong Kar-wai',
    cast: ['Tony Leung Chiu-wai', 'Maggie Cheung', 'Rebecca Pan', 'Kelly Lai Chen'],
    tags: ['visual-poetry', 'waltz', 'step-printing', 'auteur-cinema'],
    rating: 8.1,
    matchScore: 92,
    explanation: {
      whyRecommended: 'Peerless visual elegance, exquisite color palette, and delicate emotional restraint.',
    },
    isWatchlisted: true,
    isFavorite: false,
    relatedIds: ['solaris-1972', 'drive-2011', 'stalker-1979'],
  },
  {
    id: 'parasite-2019',
    title: 'Parasite',
    year: 2019,
    runtime: 132,
    poster: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80',
    backdrop: 'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=1200&auto=format&fit=crop&q=80',
    synopsis: 'Greed and class discrimination threaten the newly formed symbiotic relationship between the wealthy Park family and the destitute Kim clan.',
    genres: ['Thriller', 'Drama', 'Black Comedy'],
    themes: ['Class Warfare', 'Deception', 'Family', 'Symbiosis'],
    moods: ['Suspenseful', 'Satirical', 'Dynamic', 'Visceral'],
    language: 'Korean',
    director: 'Bong Joon-ho',
    cast: ['Song Kang-ho', 'Lee Sun-kyun', 'Cho Yeo-jeong', 'Choi Woo-shik', 'Park So-dam'],
    tags: ['masterpiece', 'social-satire', 'palme-d-or', 'sharp-wit'],
    rating: 8.5,
    matchScore: 94,
    explanation: {
      whyRecommended: 'Masterful tonal transitions, meticulous framing, and biting social commentary.',
    },
    isWatchlisted: false,
    isFavorite: true,
    relatedIds: ['memento-2000', 'drive-2011', 'blade-runner-2049'],
  },
];

/**
 * Accessor utilities to avoid scattering ad-hoc filtering across components.
 */
export function getMovieFixtureById(id: string): MovieFixture | undefined {
  return MOVIE_FIXTURES.find((movie) => movie.id === id);
}

export function getAllMovieFixtures(): MovieFixture[] {
  return [...MOVIE_FIXTURES];
}

export function getWatchlistFixtures(): MovieFixture[] {
  return MOVIE_FIXTURES.filter((movie) => movie.isWatchlisted);
}

export function getFavouritesFixtures(): MovieFixture[] {
  return MOVIE_FIXTURES.filter((movie) => movie.isFavorite);
}

export function getHistoryFixtures(): MovieFixture[] {
  return MOVIE_FIXTURES.filter((movie) => movie.watchedDate);
}

export function getRelatedMovieFixtures(movieId: string): MovieFixture[] {
  const current = getMovieFixtureById(movieId);
  if (!current) return [];
  if (current.relatedIds && current.relatedIds.length > 0) {
    const list = current.relatedIds
      .map((id) => getMovieFixtureById(id))
      .filter((m): m is MovieFixture => m !== undefined);
    if (list.length > 0) return list;
  }
  return MOVIE_FIXTURES.filter((m) => m.id !== movieId).slice(0, 3);
}

export interface SearchMoviesOptions {
  genre?: string | null;
}

/**
 * Client-side search helper for local development movie fixtures.
 * Searches across title, year, genres, themes, moods, language, director, cast, and tags.
 * Normalizes query and orders results by:
 * 1. Title matches (exact > prefix > substring)
 * 2. Director & Cast matches
 * 3. Taxonomy metadata matches (genres, themes, moods, tags, language, year)
 * 4. Deterministic tie-breaker by title
 */
export function searchMovies(query: string, options?: SearchMoviesOptions): MovieFixture[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return [];
  }

  const queryTokens = normalizedQuery.split(/\s+/).filter(Boolean);
  const scoredMovies: { movie: MovieFixture; score: number }[] = [];

  for (const movie of MOVIE_FIXTURES) {
    if (options?.genre && !movie.genres.some((g) => g.toLowerCase() === options.genre!.toLowerCase())) {
      continue;
    }

    const titleLower = movie.title.toLowerCase();
    const directorLower = movie.director.toLowerCase();
    const languageLower = movie.language.toLowerCase();
    const yearStr = String(movie.year);
    const genresLower = movie.genres.map((g) => g.toLowerCase());
    const themesLower = movie.themes.map((t) => t.toLowerCase());
    const moodsLower = movie.moods.map((m) => m.toLowerCase());
    const castLower = movie.cast.map((c) => c.toLowerCase());
    const tagsLower = movie.tags.map((t) => t.toLowerCase());

    let score = 0;

    // 1. Direct whole-query matching (Highest priority for title)
    if (titleLower === normalizedQuery) {
      score += 1000;
    } else if (titleLower.startsWith(normalizedQuery)) {
      score += 800;
    } else if (titleLower.includes(normalizedQuery)) {
      score += 500;
    }

    // 2. Direct whole-query matching for Director and Cast
    if (directorLower === normalizedQuery) {
      score += 400;
    } else if (directorLower.includes(normalizedQuery)) {
      score += 300;
    }

    if (castLower.some((c) => c === normalizedQuery)) {
      score += 250;
    } else if (castLower.some((c) => c.includes(normalizedQuery))) {
      score += 200;
    }

    // 3. Taxonomy & metadata matches
    if (genresLower.some((g) => g === normalizedQuery)) {
      score += 180;
    } else if (genresLower.some((g) => g.includes(normalizedQuery))) {
      score += 150;
    }

    if (themesLower.some((t) => t.includes(normalizedQuery))) {
      score += 120;
    }

    if (tagsLower.some((tag) => tag.includes(normalizedQuery))) {
      score += 100;
    }

    if (moodsLower.some((m) => m.includes(normalizedQuery))) {
      score += 80;
    }

    if (languageLower === normalizedQuery || languageLower.includes(normalizedQuery)) {
      score += 60;
    }

    if (yearStr === normalizedQuery || yearStr.includes(normalizedQuery)) {
      score += 50;
    }

    // 4. Token-level matching for multi-word queries (e.g. "Nolan 2000" or "Denis Sci-Fi")
    if (queryTokens.length > 1) {
      let tokensMatched = 0;
      for (const token of queryTokens) {
        const matchesToken =
          titleLower.includes(token) ||
          directorLower.includes(token) ||
          castLower.some((c) => c.includes(token)) ||
          genresLower.some((g) => g.includes(token)) ||
          themesLower.some((t) => t.includes(token)) ||
          moodsLower.some((m) => m.includes(token)) ||
          tagsLower.some((tg) => tg.includes(token)) ||
          languageLower.includes(token) ||
          yearStr.includes(token);

        if (matchesToken) {
          tokensMatched++;
        }
      }

      if (tokensMatched === queryTokens.length) {
        score += 140 + tokensMatched * 20;
      }
    }

    if (score > 0) {
      scoredMovies.push({ movie, score });
    }
  }

  // Sort by score descending, then deterministic tie-breaker by title ascending
  scoredMovies.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return a.movie.title.localeCompare(b.movie.title);
  });

  return scoredMovies.map((item) => item.movie);
}

/**
 * Suggested discovery search terms that are strictly present in the centralized fixture dataset.
 */
export interface SuggestedSearchTerm {
  label: string;
  category: 'genre' | 'director' | 'mood' | 'theme' | 'tag' | 'actor';
}

export const SUGGESTED_SEARCHES: SuggestedSearchTerm[] = [
  { label: 'Sci-Fi', category: 'genre' },
  { label: 'Christopher Nolan', category: 'director' },
  { label: 'Denis Villeneuve', category: 'director' },
  { label: 'Psychological', category: 'genre' },
  { label: 'Neo-Noir', category: 'genre' },
  { label: 'Atmospheric', category: 'mood' },
  { label: 'Mystery', category: 'genre' },
  { label: 'Andrei Tarkovsky', category: 'director' },
  { label: 'Black Comedy', category: 'genre' },
  { label: 'Non-Linear', category: 'tag' },
];

/**
 * Curated selection of fixture movies for the initial empty-query discovery state.
 */
export function getCuratedFeaturedFixtures(): MovieFixture[] {
  return MOVIE_FIXTURES.slice(0, 4);
}

/**
 * Curated selection of high-recognition, diverse fixture movies for Taste Discovery onboarding.
 */
export function getTasteDiscoverySeedMovies(): MovieFixture[] {
  const seedIds = [
    'blade-runner-2049',
    'parasite-2019',
    'arrival-2016',
    'memento-2000',
    'drive-2011',
    'in-the-mood-for-love-2000',
  ];
  return seedIds
    .map((id) => getMovieFixtureById(id))
    .filter((m): m is MovieFixture => m !== undefined);
}


