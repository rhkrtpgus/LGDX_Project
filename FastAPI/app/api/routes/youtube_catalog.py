from fastapi import APIRouter, HTTPException, Query, status

from app.schemas.youtube_catalog import YoutubeVideoListResponse
from app.services.youtube_catalog import (
    YoutubeCatalogError,
    fetch_related_youtube_videos,
    search_youtube_videos,
)


router = APIRouter(prefix="/youtube", tags=["youtube"])


@router.get("/search", response_model=YoutubeVideoListResponse)
def search_videos(
    q: str = Query(min_length=1, description="사용자 검색어"),
    limit: int = Query(default=10, ge=1, le=10),
) -> YoutubeVideoListResponse:
    try:
        return YoutubeVideoListResponse(items=search_youtube_videos(q, limit))
    except YoutubeCatalogError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc


@router.get("/related", response_model=YoutubeVideoListResponse)
def related_videos(
    video_id: str = Query(alias="videoId", min_length=1),
    limit: int = Query(default=10, ge=1, le=10),
) -> YoutubeVideoListResponse:
    try:
        return YoutubeVideoListResponse(items=fetch_related_youtube_videos(video_id, limit))
    except YoutubeCatalogError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc
