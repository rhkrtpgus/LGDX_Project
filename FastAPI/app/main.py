from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse

from app.api.router import api_router
from app.core.config import get_settings


settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    docs_url=f"{settings.api_prefix}/docs",
    redoc_url=f"{settings.api_prefix}/redoc",
    openapi_url=f"{settings.api_prefix}/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.cors_allow_all else settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.get("/docs", include_in_schema=False)
def redirect_docs() -> RedirectResponse:
    return RedirectResponse(url=app.docs_url, status_code=308)


@app.get("/redoc", include_in_schema=False)
def redirect_redoc() -> RedirectResponse:
    return RedirectResponse(url=app.redoc_url, status_code=308)


@app.get("/openapi.json", include_in_schema=False)
def redirect_openapi() -> RedirectResponse:
    return RedirectResponse(url=app.openapi_url, status_code=308)


@app.get("/", tags=["root"])
def read_root() -> dict:
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "status": "ok",
    }
