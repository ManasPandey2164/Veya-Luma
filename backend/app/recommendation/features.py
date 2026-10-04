"""Movie feature representation and extraction for Veya Luma Recommendation Engine (Step 18).

Normalizes catalog metadata into Core Taste Features, Supporting Features, and Discovery Features.
Guarantees zero fabricated data and strictly bounded normalized feature signals.
"""

import math
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Set
from uuid import UUID

from app.models.movie import Movie, MovieCredit, MovieTag


def calculate_release_era(release_year: Optional[int]) -> str:
    """Classifies a movie's release year into standard curatorial eras."""
    if release_year is None:
        return "unknown"
    if release_year < 1980:
        return "classic"
    if release_year < 2000:
        return "golden_modern"
    if release_year < 2016:
        return "contemporary"
    return "recent"


def normalize_popularity(
    popularity: Optional[float], max_log_floor: float = 6.5
) -> float:
    """Normalizes raw catalog popularity score using smooth logarithmic scaling.

    Prevents ultra-popular blockbusters from dominating candidate scores
    while preserving relative popularity gradients.
    """
    if popularity is None or popularity <= 0.0:
        return 0.0
    # log1p(565) ~ 6.34; normalizes roughly within [0.0, 1.0]
    scaled = math.log1p(popularity) / max_log_floor
    return min(1.0, max(0.0, scaled))


def calculate_vote_quality(
    vote_average: Optional[float],
    vote_count: Optional[int],
    min_credible_votes: int = 50,
) -> float:
    """Computes a Bayesian-damped vote quality score.

    Ensures movies with high vote averages but single-digit vote counts
    are gently damped until sufficient critical consensus is reached.
    """
    if vote_average is None or vote_count is None or vote_count <= 0:
        return 0.0
    # Normalize rating 0-10 -> 0-1
    base_rating = max(0.0, min(10.0, vote_average)) / 10.0
    # Reliability damping factor based on vote count
    confidence = min(1.0, vote_count / min_credible_votes)
    # Bayesian shrinkage toward median catalog rating (0.65)
    return float(confidence * base_rating + (1.0 - confidence) * 0.65)


def calculate_language_novelty(
    original_language: str,
    dominant_languages: Optional[Set[str]] = None,
) -> float:
    """Calculates novelty score for international cinema discovery.

    Gives higher novelty to non-English international productions.
    """
    if dominant_languages is None:
        dominant_languages = {"en"}
    lang = original_language.lower().strip()
    return 1.0 if lang not in dominant_languages else 0.15


@dataclass(frozen=True)
class MovieFeatures:
    """Normalized recommendation feature representation of a canonical movie."""

    movie_id: UUID
    title: str
    original_title: Optional[str]

    # --- Core Taste Features ---
    genres: Set[str] = field(default_factory=set)
    themes: Set[str] = field(default_factory=set)
    moods: Set[str] = field(default_factory=set)
    styles: Set[str] = field(default_factory=set)
    keywords: Set[str] = field(default_factory=set)
    original_language: str = "en"
    spoken_languages: List[str] = field(default_factory=list)
    directors: Set[str] = field(default_factory=set)

    # --- Supporting Features ---
    release_year: Optional[int] = None
    release_era: str = "unknown"
    runtime_minutes: Optional[int] = None
    collection_id: Optional[UUID] = None
    cast: List[str] = field(default_factory=list)  # Top billed cast names
    poster_path: Optional[str] = None
    backdrop_path: Optional[str] = None

    # --- Discovery Features ---
    popularity: Optional[float] = None
    vote_average: Optional[float] = None
    vote_count: Optional[int] = None
    popularity_signal: float = 0.0
    vote_quality_signal: float = 0.0
    novelty_signal: float = 0.0

    # Taxonomy node strengths (key -> strength)
    tag_strengths: Dict[str, float] = field(default_factory=dict)
    tag_labels: Dict[str, str] = field(default_factory=dict)

    def has_taxonomy(self, node_key: str) -> bool:
        """Checks if movie asserts a given taxonomy node key."""
        clean_key = node_key.strip().lower()
        return (
            clean_key in self.genres
            or clean_key in self.themes
            or clean_key in self.moods
            or clean_key in self.styles
        )


def extract_movie_features_from_orm(
    movie: Movie,
    directors: Optional[List[str]] = None,
    top_cast: Optional[List[str]] = None,
    tags_data: Optional[List[Dict[str, Any]]] = None,
) -> MovieFeatures:
    """Extracts a MovieFeatures record from ORM entity and pre-loaded relationships."""
    genres: Set[str] = set()
    themes: Set[str] = set()
    moods: Set[str] = set()
    styles: Set[str] = set()
    tag_strengths: Dict[str, float] = {}
    tag_labels: Dict[str, str] = {}

    # 1. Process taxonomy tags (either passed explicitly or from relationship)
    if tags_data is not None:
        for tag in tags_data:
            axis = tag.get("axis", "").lower()
            key = tag.get("key", "").lower()
            label = tag.get("label", "")
            strength = float(tag.get("strength", 1.0))
            tag_strengths[key] = strength
            tag_labels[key] = label
            if axis == "genre":
                genres.add(key)
            elif axis == "theme":
                themes.add(key)
            elif axis == "mood":
                moods.add(key)
            elif axis == "style":
                styles.add(key)
    elif hasattr(movie, "taxonomy_tags") and movie.taxonomy_tags:
        for tag_rel in movie.taxonomy_tags:
            if isinstance(tag_rel, MovieTag) and tag_rel.node:
                node = tag_rel.node
                axis = node.axis.lower()
                key = node.key.lower()
                tag_strengths[key] = float(tag_rel.strength)
                tag_labels[key] = node.label
                if axis == "genre":
                    genres.add(key)
                elif axis == "theme":
                    themes.add(key)
                elif axis == "mood":
                    moods.add(key)
                elif axis == "style":
                    styles.add(key)

    # 2. Keywords from movie.tags (raw TMDB keywords)
    raw_tags = movie.tags if isinstance(movie.tags, list) else []
    keywords = {str(k).lower().strip() for k in raw_tags if k}

    # 3. Credits: directors and cast
    director_set: Set[str] = set()
    if directors is not None:
        director_set = {d.strip() for d in directors if d}
    elif hasattr(movie, "credits") and movie.credits:
        for credit in movie.credits:
            if (
                isinstance(credit, MovieCredit)
                and credit.job == "Director"
                and credit.name
            ):
                director_set.add(credit.name.strip())

    cast_list: List[str] = []
    if top_cast is not None:
        cast_list = [c.strip() for c in top_cast if c]
    elif hasattr(movie, "credits") and movie.credits:
        # Sort cast by billing order if available
        cast_credits = [
            c
            for c in movie.credits
            if isinstance(c, MovieCredit) and c.credit_type == "cast" and c.name
        ]
        cast_credits.sort(
            key=lambda c: c.billing_order if c.billing_order is not None else 999
        )
        cast_list = [c.name.strip() for c in cast_credits[:5]]

    # 4. Spoken languages
    spoken = movie.spoken_languages if isinstance(movie.spoken_languages, list) else []
    clean_spoken = [str(lang).lower().strip() for lang in spoken if lang]

    # 5. Artwork
    poster = None
    backdrop = None
    if movie.artwork:
        poster = movie.artwork.poster_path
        backdrop = movie.artwork.backdrop_path

    # 6. Signals
    pop_signal = normalize_popularity(movie.popularity)
    vote_qual_signal = calculate_vote_quality(movie.vote_average, movie.vote_count)
    novelty = calculate_language_novelty(movie.original_language)

    return MovieFeatures(
        movie_id=movie.id,
        title=movie.title,
        original_title=movie.original_title,
        genres=genres,
        themes=themes,
        moods=moods,
        styles=styles,
        keywords=keywords,
        original_language=movie.original_language.lower().strip(),
        spoken_languages=clean_spoken,
        directors=director_set,
        release_year=movie.release_year,
        release_era=calculate_release_era(movie.release_year),
        runtime_minutes=movie.runtime_minutes,
        collection_id=movie.collection_id,
        cast=cast_list,
        poster_path=poster,
        backdrop_path=backdrop,
        popularity=movie.popularity,
        vote_average=movie.vote_average,
        vote_count=movie.vote_count,
        popularity_signal=pop_signal,
        vote_quality_signal=vote_qual_signal,
        novelty_signal=novelty,
        tag_strengths=tag_strengths,
        tag_labels=tag_labels,
    )
