"""Domain to persistence and persistence to domain mappers for Veya Luma canonical movies.

Provides explicit, decoupled conversion between the Pydantic domain contract (CanonicalMovie)
and SQLAlchemy 2.0 ORM persistence models.
"""

from typing import Optional

from app.domain.movie.taxonomy import generate_taxonomy_key
from app.models.movie import (
    Movie,
    MovieArtwork,
    MovieCollection,
    MovieCredit,
    MovieProvenance,
    MovieTag,
    SourceIdentity,
    TaxonomyNode,
)
from app.schemas.movie import (
    ArtworkReference,
    CanonicalMovie,
    CastMember,
    CollectionReference,
    CrewMember,
    MovieCredits,
    ProvenanceRecord,
    ProviderIdentity,
)


def canonical_movie_to_orm(
    canonical: CanonicalMovie,
    taxonomy_node_lookup: Optional[dict[tuple[str, str], TaxonomyNode]] = None,
) -> Movie:
    """Maps a validated CanonicalMovie domain entity to SQLAlchemy ORM models."""
    movie = Movie(
        id=canonical.id,
        title=canonical.title,
        original_title=canonical.original_title,
        original_language=canonical.original_language,
        spoken_languages=list(canonical.spoken_languages),
        release_date=canonical.release_date,
        release_year=canonical.release_year,
        runtime_minutes=canonical.runtime_minutes,
        synopsis=canonical.synopsis,
        tags=list(canonical.tags),
        popularity=canonical.popularity,
        vote_average=canonical.vote_average,
        vote_count=canonical.vote_count,
    )

    # 1. Collection
    if canonical.collection and (
        canonical.collection.collection_id or canonical.collection.name
    ):
        movie.collection = MovieCollection(
            external_id=canonical.collection.collection_id,
            name=canonical.collection.name or "Collection",
            poster_path=canonical.collection.poster_path,
        )

    # 2. Artwork Reference
    if canonical.artwork and (
        canonical.artwork.poster_path
        or canonical.artwork.backdrop_path
        or canonical.artwork.poster_url
        or canonical.artwork.backdrop_url
    ):
        movie.artwork = MovieArtwork(
            poster_path=canonical.artwork.poster_path,
            backdrop_path=canonical.artwork.backdrop_path,
            poster_url=canonical.artwork.poster_url,
            backdrop_url=canonical.artwork.backdrop_url,
        )

    # 3. Provider Identities
    movie.provider_identities = [
        SourceIdentity(
            source=pi.source.strip().lower(),
            external_id=str(pi.external_id).strip(),
            confidence=pi.confidence,
            is_primary=pi.is_primary,
        )
        for pi in canonical.provider_identities
    ]

    # 4. Provenance
    if canonical.provenance:
        movie.provenance = MovieProvenance(
            source=canonical.provenance.source,
            source_id=canonical.provenance.source_id,
            endpoint_or_product=canonical.provenance.endpoint_or_product,
            retrieved_at=canonical.provenance.retrieved_at,
            license_profile=canonical.provenance.license_profile,
            raw_sha256=canonical.provenance.raw_sha256,
            field_sources=dict(canonical.provenance.field_sources),
        )

    # 5. Credits
    credits_list: list[MovieCredit] = []
    # Cast members
    for cast in canonical.credits.cast:
        credits_list.append(
            MovieCredit(
                credit_type="cast",
                name=cast.name,
                role_or_character=cast.character,
                department="Acting",
                job="Actor",
                billing_order=cast.billing_order,
                person_external_id=cast.person_external_id,
            )
        )
    # Directors
    added_crew_keys: set[tuple[str, str]] = set()
    for director in canonical.credits.directors:
        key = (
            director.name.strip().lower(),
            (director.job or "Director").strip().lower(),
        )
        added_crew_keys.add(key)
        credits_list.append(
            MovieCredit(
                credit_type="crew",
                name=director.name,
                role_or_character=None,
                department=director.department or "Directing",
                job=director.job or "Director",
                billing_order=None,
                person_external_id=director.person_external_id,
            )
        )
    # Crew members (avoid duplicating already added directors)
    for crew in canonical.credits.crew:
        key = (crew.name.strip().lower(), (crew.job or "").strip().lower())
        if key in added_crew_keys:
            continue
        added_crew_keys.add(key)
        credits_list.append(
            MovieCredit(
                credit_type="crew",
                name=crew.name,
                role_or_character=None,
                department=crew.department,
                job=crew.job,
                billing_order=None,
                person_external_id=crew.person_external_id,
            )
        )
    movie.credits = credits_list

    # 6. Taxonomy: genres, themes, moods, styles
    tags_list: list[MovieTag] = []
    taxonomy_axes: list[tuple[str, list[str]]] = [
        ("genre", canonical.genres),
        ("theme", canonical.themes),
        ("mood", canonical.moods),
        ("style", canonical.styles),
    ]

    for axis, labels in taxonomy_axes:
        for label in labels:
            node: Optional[TaxonomyNode] = None
            if taxonomy_node_lookup:
                node = taxonomy_node_lookup.get((axis, label))
            if node is None:
                node = TaxonomyNode(
                    axis=axis,
                    label=label,
                    key=generate_taxonomy_key(axis, label),
                    definition=f"Canonical {axis}: {label}",
                )
            tags_list.append(
                MovieTag(
                    node=node,
                    assertion="present",
                    strength=1.0,
                    confidence=1.0,
                    evidence_count=1,
                )
            )
    movie.taxonomy_tags = tags_list

    return movie


def orm_to_canonical_movie(orm_movie: Movie) -> CanonicalMovie:
    """Maps a SQLAlchemy ORM Movie instance back into a validated CanonicalMovie domain model."""
    # 1. Collection
    collection_ref: Optional[CollectionReference] = None
    if orm_movie.collection:
        collection_ref = CollectionReference(
            collection_id=orm_movie.collection.external_id
            or str(orm_movie.collection.id),
            name=orm_movie.collection.name,
            poster_path=orm_movie.collection.poster_path,
        )

    # 2. Artwork
    artwork_ref = ArtworkReference(
        poster_path=orm_movie.artwork.poster_path if orm_movie.artwork else None,
        backdrop_path=orm_movie.artwork.backdrop_path if orm_movie.artwork else None,
        poster_url=orm_movie.artwork.poster_url if orm_movie.artwork else None,
        backdrop_url=orm_movie.artwork.backdrop_url if orm_movie.artwork else None,
    )

    # 3. Provider Identities
    provider_identities = [
        ProviderIdentity(
            source=si.source,
            external_id=si.external_id,
            confidence=si.confidence,
            is_primary=si.is_primary,
        )
        for si in (orm_movie.provider_identities or [])
    ]

    # 4. Provenance
    provenance_record: Optional[ProvenanceRecord] = None
    if orm_movie.provenance:
        p = orm_movie.provenance
        provenance_record = ProvenanceRecord(
            source=p.source,
            source_id=p.source_id,
            endpoint_or_product=p.endpoint_or_product,
            retrieved_at=p.retrieved_at,
            license_profile=p.license_profile,
            raw_sha256=p.raw_sha256,
            field_sources=dict(p.field_sources or {}),
        )

    # 5. Credits
    cast_members: list[CastMember] = []
    crew_members: list[CrewMember] = []
    directors: list[CrewMember] = []

    # Sort credits: cast by billing_order, crew as is
    raw_credits = orm_movie.credits or []
    for c in raw_credits:
        if c.credit_type == "cast":
            cast_members.append(
                CastMember(
                    name=c.name,
                    character=c.role_or_character,
                    billing_order=c.billing_order,
                    person_external_id=c.person_external_id,
                )
            )
        elif c.credit_type == "crew":
            member = CrewMember(
                name=c.name,
                department=c.department or "Directing",
                job=c.job or "Director",
                person_external_id=c.person_external_id,
            )
            crew_members.append(member)
            if (c.job and c.job.strip().lower() == "director") or (
                c.department and c.department.strip().lower() == "directing"
            ):
                directors.append(member)

    # Sort cast members deterministically by billing order
    cast_members.sort(key=lambda x: (x.billing_order is None, x.billing_order))

    director_str: Optional[str] = directors[0].name if directors else None
    credits_container = MovieCredits(
        director=director_str,
        directors=directors,
        cast=cast_members,
        crew=crew_members,
    )

    # 6. Taxonomy: extract genres, themes, moods, styles from taxonomy_tags
    genres: list[str] = []
    themes: list[str] = []
    moods: list[str] = []
    styles: list[str] = []

    for tag in orm_movie.taxonomy_tags or []:
        if not tag.node:
            continue
        axis = tag.node.axis
        label = tag.node.label
        if axis == "genre" and label not in genres:
            genres.append(label)
        elif axis == "theme" and label not in themes:
            themes.append(label)
        elif axis == "mood" and label not in moods:
            moods.append(label)
        elif axis == "style" and label not in styles:
            styles.append(label)

    return CanonicalMovie(
        id=orm_movie.id,
        title=orm_movie.title,
        original_title=orm_movie.original_title,
        original_language=orm_movie.original_language,
        spoken_languages=list(orm_movie.spoken_languages or []),
        release_date=orm_movie.release_date,
        release_year=orm_movie.release_year,
        runtime_minutes=orm_movie.runtime_minutes,
        synopsis=orm_movie.synopsis,
        genres=genres,
        themes=themes,
        moods=moods,
        styles=styles,
        credits=credits_container,
        artwork=artwork_ref,
        collection=collection_ref,
        provider_identities=provider_identities,
        provenance=provenance_record,
        tags=list(orm_movie.tags or []),
        popularity=orm_movie.popularity,
        vote_average=orm_movie.vote_average,
        vote_count=orm_movie.vote_count,
    )
