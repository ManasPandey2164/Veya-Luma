"""Data access and repository layer for Veya Luma."""

from app.repositories.favourite import FavouriteRepository
from app.repositories.movie import MovieRepository
from app.repositories.movie_rating import MovieRatingRepository
from app.repositories.session import SessionRepository
from app.repositories.user import UserRepository
from app.repositories.user_movie_event import UserMovieEventRepository
from app.repositories.user_preference import UserPreferenceRepository
from app.repositories.watchlist import WatchlistRepository

__all__ = [
    "FavouriteRepository",
    "MovieRatingRepository",
    "MovieRepository",
    "SessionRepository",
    "UserMovieEventRepository",
    "UserPreferenceRepository",
    "UserRepository",
    "WatchlistRepository",
]
