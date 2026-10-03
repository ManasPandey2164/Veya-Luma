from fastapi import APIRouter

from app.api.v1.endpoints import auth, feedback, health, library, movies, preferences

api_router = APIRouter()
api_router.include_router(health.router, tags=["Health"])
api_router.include_router(auth.router)
api_router.include_router(movies.router)
api_router.include_router(feedback.router)
api_router.include_router(library.router)
api_router.include_router(preferences.router)
