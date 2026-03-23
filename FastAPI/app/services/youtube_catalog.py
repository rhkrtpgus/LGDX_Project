from __future__ import annotations

import os
import random
import re
from typing import Any

import requests

from app.schemas.youtube_catalog import YoutubeVideoItem


YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3/search"
YOUTUBE_VIDEOS_API_BASE = "https://www.googleapis.com/youtube/v3/videos"
YOUTUBE_REGION_CODE = "KR"
YOUTUBE_RELEVANCE_LANGUAGE = "ko"
MAX_YOUTUBE_RESULTS = 10
YOUTUBE_ORDER_OPTIONS = ["relevance", "date", "rating", "viewCount"]


class YoutubeCatalogError(RuntimeError):
    """Raised when YouTube catalog APIs cannot be fetched."""


def _get_youtube_api_keys() -> list[str]:
    keys = []
    for env_var in ("YOUTUBE_API_KEY", "YOUTUBE_API_KEY_2", "YOUTUBE_API_KEY_3", "YOUTUBE_API_KEY_4"):
        key = os.getenv(env_var, "").strip()
        if key:
            keys.append(key)
    return keys


def _is_quota_exceeded(response: requests.Response) -> bool:
    if response.status_code != 403:
        return False
    try:
        errors = response.json().get("error", {}).get("errors", [])
        return any(e.get("reason") == "quotaExceeded" for e in errors)
    except Exception:
        return False


def _normalize_limit(limit: int) -> int:
    return max(1, min(limit, MAX_YOUTUBE_RESULTS))


def _extract_thumbnail_url(thumbnails: dict[str, Any]) -> str | None:
    return (
        (thumbnails.get("high") or {}).get("url")
        or (thumbnails.get("medium") or {}).get("url")
        or (thumbnails.get("default") or {}).get("url")
    )


def _build_video_item(
    *,
    video_id: str,
    title: str,
    channel_title: str | None,
    description: str | None,
    thumbnail_url: str | None,
    published_at: str | None,
) -> YoutubeVideoItem:
    return YoutubeVideoItem(
        video_id=video_id,
        title=title or "No title",
        channel_title=channel_title,
        description=description,
        thumbnail_url=thumbnail_url,
        published_at=published_at,
    )


def search_youtube_videos(query: str, limit: int = 10) -> list[YoutubeVideoItem]:
    normalized_query = query.strip()
    if not normalized_query:
        return []

    extra: dict[str, str] = {
        "q": normalized_query,
        "order": random.choice(YOUTUBE_ORDER_OPTIONS),
        "safeSearch": "strict",
    }

    return _fetch_catalog_items(extra, limit=limit)


def fetch_related_youtube_videos(video_id: str, limit: int = 10) -> list[YoutubeVideoItem]:
    """
    Return videos similar to the current one.

    Note:
    - This is not the legacy YouTube "related videos" API behavior.
    - We fetch the current video's title, tags, and channel metadata first.
    - Then we build a similarity query and run a normal `search.list`.
    """
    normalized_video_id = video_id.strip()
    if not normalized_video_id:
        return []

    similarity_query = _build_related_search_query(normalized_video_id)
    if not similarity_query:
        return []

    return [
        item
        for item in _fetch_catalog_items(
            {
                "q": similarity_query,
                "order": random.choice(YOUTUBE_ORDER_OPTIONS),
            },
            limit=limit + 1,
        )
        if item.video_id != normalized_video_id
    ][: _normalize_limit(limit)]


def _fetch_catalog_items(extra_params: dict[str, str], limit: int) -> list[YoutubeVideoItem]:
    api_keys = _get_youtube_api_keys()
    if not api_keys:
        raise YoutubeCatalogError("YouTube API key is not configured.")

    last_exc: Exception | None = None
    response: requests.Response | None = None

    for api_key in api_keys:
        params = {
            "part": "snippet",
            "type": "video",
            "maxResults": _normalize_limit(limit),
            "regionCode": YOUTUBE_REGION_CODE,
            "relevanceLanguage": YOUTUBE_RELEVANCE_LANGUAGE,
            "safeSearch": "strict",
            "fields": "items(id/videoId,snippet(title,channelTitle,description,publishedAt,thumbnails/default/url,thumbnails/medium/url,thumbnails/high/url))",
            "key": api_key,
            **extra_params,
        }
        params["videoEmbeddable"] = "true"

        try:
            response = requests.get(YOUTUBE_API_BASE, params=params, timeout=30)
            if _is_quota_exceeded(response):
                last_exc = YoutubeCatalogError(f"YouTube API quota exceeded for key ending ...{api_key[-6:]}")
                continue
            response.raise_for_status()
            break
        except requests.RequestException as exc:
            last_exc = exc
            response = None

    if response is None or not response.ok:
        raise YoutubeCatalogError(f"YouTube catalog request failed: {last_exc}") from last_exc

    payload = response.json()
    items = payload.get("items", [])
    results: list[YoutubeVideoItem] = []

    for item in items:
        video_id = (item.get("id") or {}).get("videoId")
        if not video_id:
            continue

        snippet = item.get("snippet") or {}
        thumbnail_url = _extract_thumbnail_url(snippet.get("thumbnails") or {})

        results.append(
            _build_video_item(
                video_id=video_id,
                title=snippet.get("title") or "No title",
                channel_title=snippet.get("channelTitle"),
                description=snippet.get("description"),
                thumbnail_url=thumbnail_url,
                published_at=snippet.get("publishedAt"),
            )
        )

    return results


def _build_related_search_query(video_id: str) -> str:
    api_keys = _get_youtube_api_keys()
    if not api_keys:
        raise YoutubeCatalogError("YouTube API key is not configured.")

    last_exc: Exception | None = None
    response: requests.Response | None = None

    for api_key in api_keys:
        params = {
            "part": "snippet",
            "id": video_id,
            "fields": "items(snippet(title,channelTitle,tags))",
            "key": api_key,
        }
        try:
            response = requests.get(YOUTUBE_VIDEOS_API_BASE, params=params, timeout=30)
            if _is_quota_exceeded(response):
                last_exc = YoutubeCatalogError(f"YouTube API quota exceeded for key ending ...{api_key[-6:]}")
                continue
            response.raise_for_status()
            break
        except requests.RequestException as exc:
            last_exc = exc
            response = None

    if response is None or not response.ok:
        raise YoutubeCatalogError(f"YouTube video context request failed: {last_exc}") from last_exc

    items = response.json().get("items", [])
    if not items:
        return ""

    snippet = items[0].get("snippet") or {}
    title = snippet.get("title") or ""
    channel_title = snippet.get("channelTitle") or ""
    tags = snippet.get("tags") or []

    tokens = _tokenize_query_parts([title, *tags[:3], channel_title])
    return " ".join(tokens[:6])


def _tokenize_query_parts(values: list[str]) -> list[str]:
    tokens: list[str] = []

    for value in values:
        for part in re.split(r"[^0-9A-Za-z가-힣]+", value):
            cleaned = part.strip()
            if len(cleaned) < 2:
                continue
            if cleaned not in tokens:
                tokens.append(cleaned)

    return tokens
