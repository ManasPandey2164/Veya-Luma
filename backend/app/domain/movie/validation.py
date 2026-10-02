"""Domain validation rules and data quality invariants for Veya Luma movies.

Enforces strict data quality:
- Validates canonical taxonomy adherence
- Prevents placeholder fabrication ('N/A', 'Unknown')
- Enforces runtime and temporal bounds
- Validates credit structure and provider identity rules
"""


from app.domain.movie.taxonomy import (
    CANONICAL_GENRES,
    CANONICAL_MOODS,
    CANONICAL_THEMES,
)
from app.schemas.movie import CanonicalMovie

FORBIDDEN_PLACEHOLDER_STRINGS: frozenset[str] = frozenset({
    "n/a",
    "na",
    "unknown",
    "unknown director",
    "none",
    "tbd",
    "tba",
    "null",
    "no synopsis available",
    "undefined",
})


class MovieValidationError(ValueError):
    """Domain exception raised when a movie fails canonical quality invariants."""
    def __init__(self, errors: list[str]) -> None:
        self.errors = errors
        super().__init__(f"Canonical movie validation failed with {len(errors)} error(s): {'; '.join(errors)}")


def validate_canonical_movie(movie: CanonicalMovie, is_externally_sourced: bool = True) -> list[str]:
    """Inspects a CanonicalMovie against all business and data quality invariants.

    Returns a list of validation error messages. An empty list signifies complete validity.
    """
    errors: list[str] = []

    # 1. Title Invariants
    if not movie.title or not movie.title.strip():
        errors.append("Title is required and cannot be empty or whitespace.")
    elif movie.title.strip().lower() in FORBIDDEN_PLACEHOLDER_STRINGS:
        errors.append(f"Title contains forbidden placeholder: '{movie.title}'.")

    # 2. Synopsis Invariants
    if movie.synopsis is not None:
        syn_clean = movie.synopsis.strip().lower()
        if syn_clean in FORBIDDEN_PLACEHOLDER_STRINGS:
            errors.append(f"Synopsis contains forbidden placeholder: '{movie.synopsis}'. Missing data must remain None.")

    # 3. Release Temporal Invariants
    if movie.release_date is not None:
        if movie.release_year is not None and movie.release_year != movie.release_date.year:
            errors.append(
                f"Release year ({movie.release_year}) contradicts release date year ({movie.release_date.year})."
            )
    if movie.release_year is not None:
        if movie.release_year < 1880 or movie.release_year > 2100:
            errors.append(f"Release year {movie.release_year} is outside valid cinema era bounds (1880-2100).")

    # 4. Runtime Invariants
    if movie.runtime_minutes is not None:
        if movie.runtime_minutes <= 0:
            errors.append(f"Runtime minutes must be positive, got {movie.runtime_minutes}.")
        elif movie.runtime_minutes > 1440:
            errors.append(f"Runtime minutes ({movie.runtime_minutes}) exceeds reasonable cinematic threshold (1440m).")

    # 5. Language Invariants
    if not movie.original_language or len(movie.original_language.strip()) < 2:
        errors.append(f"Original language '{movie.original_language}' is invalid. Must be valid language code.")

    # 6. Taxonomy Boundaries
    for genre in movie.genres:
        if genre not in CANONICAL_GENRES:
            errors.append(f"Genre '{genre}' does not belong to Veya Luma canonical genres.")

    for theme in movie.themes:
        if theme not in CANONICAL_THEMES:
            errors.append(f"Theme '{theme}' does not belong to Veya Luma canonical themes.")

    for mood in movie.moods:
        if mood not in CANONICAL_MOODS:
            errors.append(f"Mood '{mood}' does not belong to Veya Luma canonical moods.")

    # 7. Credits Quality
    if movie.credits.director is not None:
        dir_clean = movie.credits.director.strip().lower()
        if dir_clean in FORBIDDEN_PLACEHOLDER_STRINGS:
            errors.append(
                f"Director name contains forbidden placeholder: '{movie.credits.director}'. Missing director must be None."
            )

    for cast_member in movie.credits.cast:
        if not cast_member.name or not cast_member.name.strip():
            errors.append("Cast member name cannot be empty.")
        if cast_member.name.strip().lower() in FORBIDDEN_PLACEHOLDER_STRINGS:
            errors.append(f"Cast member name contains forbidden placeholder: '{cast_member.name}'.")
        if cast_member.billing_order is not None and cast_member.billing_order < 0:
            errors.append(f"Cast member billing order cannot be negative, got {cast_member.billing_order}.")

    # 8. External Sourcing & Provider Identity
    if is_externally_sourced:
        if not movie.provider_identities:
            errors.append("Externally sourced records require at least one provider identity.")
        else:
            for ident in movie.provider_identities:
                if not ident.source or not ident.source.strip():
                    errors.append("ProviderIdentity source cannot be empty.")
                if not ident.external_id or not str(ident.external_id).strip():
                    errors.append("ProviderIdentity external_id cannot be empty.")

    return errors


def assert_valid_canonical_movie(movie: CanonicalMovie, is_externally_sourced: bool = True) -> None:
    """Raises MovieValidationError if canonical movie violates any invariants."""
    errors = validate_canonical_movie(movie, is_externally_sourced=is_externally_sourced)
    if errors:
        raise MovieValidationError(errors)
