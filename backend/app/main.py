from fastapi import FastAPI

from app.api.router import router as api_router
from app.core.config import get_settings

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Backend foundation for the Ledger transaction management system.",
)

app.include_router(api_router)


@app.get("/health")
def health_check() -> dict[str, str]:
    """Application liveness check.

    This does not claim database connectivity. It only confirms the FastAPI app is
    running and serving requests.
    """
    return {
        "status": "ok",
        "app": settings.app_name,
        "environment": settings.environment,
    }
