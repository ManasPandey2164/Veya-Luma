"""Canonical Movie Taxonomy definitions and provider mapping boundaries for Veya Luma.

Derived from research/taxonomy.md and frontend/src/fixtures/taxonomyFixtures.ts.
Provides single-source-of-truth controlled vocabularies and normalization rules.
"""

from typing import Iterable, Optional

# ==============================================================================
# 1. CANONICAL CONTROLLED VOCABULARIES
# ==============================================================================

CANONICAL_GENRES: frozenset[str] = frozenset({
    "Sci-Fi",
    "Thriller",
    "Drama",
    "Mystery",
    "Neo-Noir",
    "Art-House",
    "Crime",
    "Philosophy",
    "Romance",
    "Comedy",
    "Action",
    "Adventure",
    "Animation",
    "Documentary",
    "Fantasy",
    "Horror",
    "War",
    "Western",
    "History",
    "Music",
    "Family",
})

CANONICAL_THEMES: frozenset[str] = frozenset({
    # Primary Onboarding & UI Categories (research/onboarding.md)
    "Artificial Intelligence & Identity",
    "Memory & Determinism",
    "Existentialism & Isolation",
    "Class Conflict & Power",
    "Grief & Transcendence",
    "Morality & Retribution",
    "Human Nature & Desires",
    "Communication & Connection",
    # Extended Granular Canonical Themes (research/taxonomy.md)
    "Artificial Intelligence",
    "Identity",
    "Memory",
    "Time Travel",
    "Existentialism",
    "Isolation",
    "Class Conflict",
    "Grief",
    "Loss",
    "Morality",
    "Revenge",
    "Human Nature",
    "Communication",
    "Surveillance",
    "Dystopia",
    "Cosmic Mystery",
    "Human Limitation",
    "Self-Discovery",
    "Redemption",
    "Power and Corruption",
    "Survival",
})

CANONICAL_MOODS: frozenset[str] = frozenset({
    # Primary Onboarding & UI Categories
    "Atmospheric",
    "Contemplative",
    "Tense",
    "Thought-provoking",
    "Meditative",
    "Melancholic",
    "Visceral",
    "Dark",
    "Mind-bending",
    "Satirical",
    # Extended Granular Canonical Moods (research/taxonomy.md & Fixtures)
    "Nocturnal",
    "Haunting",
    "Philosophical",
    "Hypnotic",
    "Joyful",
    "Warm",
    "Surreal",
    "Suspenseful",
    "Tender",
    "Gritty",
    "Dreamlike",
    "Cozy",
})

CANONICAL_STYLES: frozenset[str] = frozenset({
    "Slow burn",
    "Fast paced",
    "Measured",
    "Non-linear",
    "Linear",
    "Dialogue heavy",
    "Minimalist",
    "Stylized",
    "Atmospheric",
    "Ensemble cast",
    "Visual storytelling",
    "CGI-forward",
    "Practical effects",
    "Monochrome",
})


# ==============================================================================
# 2. TMDB GENRE NORMALIZATION MAP
# ==============================================================================

# Standard numeric TMDB Genre IDs -> Veya Luma Canonical Genre
TMDB_ID_TO_CANONICAL_GENRE: dict[int, str] = {
    878: "Sci-Fi",          # TMDB: Science Fiction
    53: "Thriller",         # TMDB: Thriller
    18: "Drama",            # TMDB: Drama
    9648: "Mystery",        # TMDB: Mystery
    80: "Crime",            # TMDB: Crime
    10749: "Romance",       # TMDB: Romance
    35: "Comedy",           # TMDB: Comedy
    16: "Animation",        # TMDB: Animation
    28: "Action",           # TMDB: Action
    12: "Adventure",        # TMDB: Adventure
    14: "Fantasy",          # TMDB: Fantasy
    27: "Horror",           # TMDB: Horror
    99: "Documentary",      # TMDB: Documentary
    10752: "War",           # TMDB: War
    37: "Western",          # TMDB: Western
    36: "History",          # TMDB: History
    10402: "Music",         # TMDB: Music
    10751: "Family",        # TMDB: Family
}

# String alias normalization (case-insensitive lookup)
GENRE_ALIAS_MAP: dict[str, str] = {
    "science fiction": "Sci-Fi",
    "sci-fi": "Sci-Fi",
    "scifi": "Sci-Fi",
    "thriller": "Thriller",
    "drama": "Drama",
    "mystery": "Mystery",
    "crime": "Crime",
    "romance": "Romance",
    "comedy": "Comedy",
    "black comedy": "Comedy",
    "animation": "Animation",
    "animated": "Animation",
    "action": "Action",
    "adventure": "Adventure",
    "fantasy": "Fantasy",
    "horror": "Horror",
    "documentary": "Documentary",
    "war": "War",
    "western": "Western",
    "history": "History",
    "historical": "History",
    "music": "Music",
    "musical": "Music",
    "family": "Family",
    "neo-noir": "Neo-Noir",
    "film-noir": "Neo-Noir",
    "film noir": "Neo-Noir",
    "noir": "Neo-Noir",
    "art-house": "Art-House",
    "arthouse": "Art-House",
    "art house": "Art-House",
    "philosophy": "Philosophy",
    "psychological": "Thriller",
}

# Mapping raw keyword evidence to candidate themes & moods
KEYWORD_EVIDENCE_MAP: dict[str, tuple[list[str], list[str]]] = {
    "artificial intelligence": (["Artificial Intelligence & Identity", "Artificial Intelligence"], ["Thought-provoking"]),
    "android": (["Artificial Intelligence & Identity"], ["Atmospheric"]),
    "cyberpunk": (["Dystopia", "Artificial Intelligence & Identity"], ["Nocturnal", "Atmospheric"]),
    "memory": (["Memory & Determinism", "Memory"], ["Thought-provoking", "Melancholic"]),
    "time travel": (["Memory & Determinism", "Time Travel"], ["Mind-bending"]),
    "existentialism": (["Existentialism & Isolation", "Existentialism"], ["Contemplative", "Philosophical"]),
    "alien": (["Cosmic Mystery", "Communication & Connection"], ["Atmospheric"]),
    "space exploration": (["Cosmic Mystery", "Human Limitation"], ["Meditative", "Atmospheric"]),
    "slow burn": ([], ["Meditative", "Contemplative"]),
    "neo noir": (["Morality & Retribution"], ["Nocturnal", "Dark", "Atmospheric"]),
    "grief": (["Grief & Transcendence", "Grief"], ["Melancholic"]),
    "revenge": (["Morality & Retribution", "Revenge"], ["Tense", "Visceral"]),
    "surveillance": (["Surveillance", "Power and Corruption"], ["Tense", "Paranoid"]),
    "class struggle": (["Class Conflict & Power", "Class Conflict"], ["Satirical", "Tense"]),
}


# ==============================================================================
# 3. NORMALIZATION FUNCTIONS
# ==============================================================================

def normalize_genre(genre_input: str | int) -> Optional[str]:
    """Normalizes an external genre identifier or string into Veya Luma canonical genre.

    Returns None if no canonical mapping exists.
    """
    if isinstance(genre_input, int):
        return TMDB_ID_TO_CANONICAL_GENRE.get(genre_input)

    cleaned = str(genre_input).strip().lower()
    return GENRE_ALIAS_MAP.get(cleaned)


def normalize_genres(genres_input: Iterable[str | int]) -> list[str]:
    """Maps and deduplicates a collection of external genre inputs into canonical genres."""
    canonical_list: list[str] = []
    seen: set[str] = set()

    for item in genres_input:
        canonical = normalize_genre(item)
        if canonical and canonical in CANONICAL_GENRES and canonical not in seen:
            seen.add(canonical)
            canonical_list.append(canonical)

    return canonical_list


def map_keywords_to_taxonomy(keywords: Iterable[str]) -> tuple[list[str], list[str]]:
    """Derives candidate themes and moods from external keyword evidence.

    Returns a tuple of (themes, moods) filtered against canonical taxonomy sets.
    """
    themes: list[str] = []
    moods: list[str] = []
    seen_themes: set[str] = set()
    seen_moods: set[str] = set()

    for kw in keywords:
        cleaned = str(kw).strip().lower()
        if cleaned in KEYWORD_EVIDENCE_MAP:
            mapped_themes, mapped_moods = KEYWORD_EVIDENCE_MAP[cleaned]
            for t in mapped_themes:
                if t in CANONICAL_THEMES and t not in seen_themes:
                    seen_themes.add(t)
                    themes.append(t)
            for m in mapped_moods:
                if m in CANONICAL_MOODS and m not in seen_moods:
                    seen_moods.add(m)
                    moods.append(m)

    return themes, moods
