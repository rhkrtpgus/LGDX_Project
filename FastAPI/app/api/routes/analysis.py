from fastapi import APIRouter, HTTPException, status
from fastapi import Query

from app.schemas.analysis import AnalysisRequest, AnalysisResponse
from app.services.model_analysis import (
    AnalysisNotFoundError,
    ModelAnalysisError,
    ModelPersistenceError,
    analyze_youtube_video,
    fetch_analysis_by_id,
    fetch_analysis_history,
)


router = APIRouter(prefix="/analysis", tags=["analysis"])


def _run_analysis(payload: AnalysisRequest) -> AnalysisResponse:
    try:
        return analyze_youtube_video(payload)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except ModelPersistenceError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc
    except ModelAnalysisError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc


@router.post("", response_model=AnalysisResponse)
def analyze(payload: AnalysisRequest) -> AnalysisResponse:
    return _run_analysis(payload)


@router.post("/youtube", response_model=AnalysisResponse)
def analyze_youtube(payload: AnalysisRequest) -> AnalysisResponse:
    return _run_analysis(payload)


@router.get("/history", response_model=list[AnalysisResponse])
def get_analysis_history(limit: int = Query(default=10, ge=1, le=100)) -> list[AnalysisResponse]:
    try:
        return fetch_analysis_history(limit)
    except ModelPersistenceError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc


@router.get("/{analysis_id}", response_model=AnalysisResponse)
def get_analysis(analysis_id: int) -> AnalysisResponse:
    try:
        return fetch_analysis_by_id(analysis_id)
    except AnalysisNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
    except ModelPersistenceError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc
