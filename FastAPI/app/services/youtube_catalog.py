from __future__ import annotations

import os
import re

import requests

from app.schemas.youtube_catalog import YoutubeVideoItem


YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3/search"
YOUTUBE_VIDEOS_API_BASE = "https://www.googleapis.com/youtube/v3/videos"
YOUTUBE_REGION_CODE = "KR"

FALLBACK_VIDEO_ITEMS = [
    {
        "videoId": "aqz-KE-bpKQ",
        "title": "Big Buck Bunny trailer",
        "channelTitle": "Kids Sample",
        "description": "Animation and nature sample video",
        "thumbnailUrl": "https://i.ytimg.com/vi/aqz-KE-bpKQ/hqdefault.jpg",
        "publishedAt": None,
        "keywords": ["animation", "nature", "animal", "dinosaur", "애니", "동화", "자연", "동물", "공룡"],
    },
    {
        "videoId": "M7lc1UVf-VE",
        "title": "YouTube player demo",
        "channelTitle": "Kids Sample",
        "description": "Safe player demo video",
        "thumbnailUrl": "https://i.ytimg.com/vi/M7lc1UVf-VE/hqdefault.jpg",
        "publishedAt": None,
        "keywords": ["education", "learning", "science", "교육", "학습", "공부", "과학"],
    },
    {
        "videoId": "jNQXAC9IVRw",
        "title": "Zoo vlog sample",
        "channelTitle": "Kids Sample",
        "description": "Animals and daily life sample",
        "thumbnailUrl": "https://i.ytimg.com/vi/jNQXAC9IVRw/hqdefault.jpg",
        "publishedAt": None,
        "keywords": ["animal", "daily", "vlog", "동물", "일상", "브이로그", "동물원"],
    },
    {
        "videoId": "ScMzIvxBSi4",
        "title": "Music sample",
        "channelTitle": "Kids Sample",
        "description": "Music and rhythm sample",
        "thumbnailUrl": "https://i.ytimg.com/vi/ScMzIvxBSi4/hqdefault.jpg",
        "publishedAt": None,
        "keywords": ["music", "song", "rhythm", "음악", "노래", "동요", "리듬"],
    },
    {
        "videoId": "ysz5S6PUM-U",
        "title": "Screen motion sample",
        "channelTitle": "Kids Sample",
        "description": "Visual entertainment sample",
        "thumbnailUrl": "https://i.ytimg.com/vi/ysz5S6PUM-U/hqdefault.jpg",
        "publishedAt": None,
        "keywords": ["entertainment", "visual", "fun", "엔터테인먼트", "재미", "화면", "시각"],
    },
    {
        "videoId": "9bZkp7q19f0",
        "title": "Dance music sample",
        "channelTitle": "Kids Sample",
        "description": "Music and dance sample",
        "thumbnailUrl": "https://i.ytimg.com/vi/9bZkp7q19f0/hqdefault.jpg",
        "publishedAt": None,
        "keywords": ["music", "dance", "entertainment", "음악", "댄스", "춤", "노래"],
    },
    {
        "videoId": "L_jWHffIx5E",
        "title": "Movement song sample",
        "channelTitle": "Kids Sample",
        "description": "Energetic song sample",
        "thumbnailUrl": "https://i.ytimg.com/vi/L_jWHffIx5E/hqdefault.jpg",
        "publishedAt": None,
        "keywords": ["music", "movement", "song", "음악", "동작", "율동", "노래"],
    },
    {
        "videoId": "3JZ_D3ELwOQ",
        "title": "Travel view sample",
        "channelTitle": "Kids Sample",
        "description": "Travel and event sample",
        "thumbnailUrl": "https://i.ytimg.com/vi/3JZ_D3ELwOQ/hqdefault.jpg",
        "publishedAt": None,
        "keywords": ["travel", "event", "view", "여행", "탐험", "풍경", "체험"],
    },
    {
        "videoId": "2Vv-BfVoq4g",
        "title": "Calm visual sample",
        "channelTitle": "Kids Sample",
        "description": "Soft mood visual sample",
        "thumbnailUrl": "https://i.ytimg.com/vi/2Vv-BfVoq4g/hqdefault.jpg",
        "publishedAt": None,
        "keywords": ["calm", "visual", "nature", "차분한", "자연", "풍경", "힐링"],
    },
    {
        "videoId": "fRh_vgS2dFE",
        "title": "Rhythm play sample",
        "channelTitle": "Kids Sample",
        "description": "Rhythm and activity sample",
        "thumbnailUrl": "https://i.ytimg.com/vi/fRh_vgS2dFE/hqdefault.jpg",
        "publishedAt": None,
        "keywords": ["rhythm", "play", "activity", "리듬", "놀이", "활동", "체조"],
    },
]


class YoutubeCatalogError(RuntimeError):
    """Raised when YouTube catalog APIs cannot be fetched."""


def _get_youtube_api_key() -> str:
    return os.getenv("YOUTUBE_API_KEY", "").strip()


def search_youtube_videos(query: str, limit: int = 10) -> list[YoutubeVideoItem]:
    if not query.strip():
        return []

    try:
        return _fetch_catalog_items(
            {
                "q": query.strip(),
                "order": "relevance",
                "safeSearch": "strict",
            },
            limit=limit,
        )
    except YoutubeCatalogError as exc:
        if _should_use_fallback(exc):
            return _fallback_catalog_items(query.strip(), limit)
        raise


def fetch_related_youtube_videos(video_id: str, limit: int = 10) -> list[YoutubeVideoItem]:
    if not video_id.strip():
        return []

    normalized_video_id = video_id.strip()

    try:
        query = _build_related_search_query(normalized_video_id)
        if not query:
            return _fallback_catalog_items(normalized_video_id, limit, exclude_video_id=normalized_video_id)

        return [
            item
            for item in _fetch_catalog_items(
                {
                    "q": query,
                    "order": "relevance",
                },
                limit=limit + 1,
            )
            if item.video_id != normalized_video_id
        ][:limit]
    except YoutubeCatalogError as exc:
        if _should_use_fallback(exc):
            return _fallback_catalog_items(normalized_video_id, limit, exclude_video_id=normalized_video_id)
        raise


def _fetch_catalog_items(extra_params: dict[str, str], limit: int) -> list[YoutubeVideoItem]:
    youtube_api_key = _get_youtube_api_key()

    if not youtube_api_key:
        raise YoutubeCatalogError("YouTube API key is not configured.")

    params = {
        "part": "snippet",
        "type": "video",
        "maxResults": max(1, min(limit, 10)),
        "regionCode": YOUTUBE_REGION_CODE,
        "safeSearch": "strict",
        "fields": "items(id/videoId,snippet(title,channelTitle,description,publishedAt,thumbnails/default/url,thumbnails/medium/url,thumbnails/high/url))",
        "key": youtube_api_key,
        **extra_params,
    }

    params["videoEmbeddable"] = "true"

    try:
        response = requests.get(YOUTUBE_API_BASE, params=params, timeout=30)
        response.raise_for_status()
    except requests.RequestException as exc:
        raise YoutubeCatalogError(f"YouTube catalog request failed: {exc}") from exc

    payload = response.json()
    items = payload.get("items", [])
    results: list[YoutubeVideoItem] = []

    for item in items:
        video_id = (item.get("id") or {}).get("videoId")
        snippet = item.get("snippet") or {}
        if not video_id:
            continue

        thumbnails = snippet.get("thumbnails") or {}
        thumbnail_url = (
            (thumbnails.get("high") or {}).get("url")
            or (thumbnails.get("medium") or {}).get("url")
            or (thumbnails.get("default") or {}).get("url")
        )

        results.append(
            YoutubeVideoItem(
                videoId=video_id,
                title=snippet.get("title") or "No title",
                channelTitle=snippet.get("channelTitle"),
                description=snippet.get("description"),
                thumbnailUrl=thumbnail_url,
                publishedAt=snippet.get("publishedAt"),
            )
        )

    return results


def _build_related_search_query(video_id: str) -> str:
    youtube_api_key = _get_youtube_api_key()
    if not youtube_api_key:
        raise YoutubeCatalogError("YouTube API key is not configured.")

    params = {
        "part": "snippet",
        "id": video_id,
        "fields": "items(snippet(title,channelTitle,tags))",
        "key": youtube_api_key,
    }

    try:
        response = requests.get(YOUTUBE_VIDEOS_API_BASE, params=params, timeout=30)
        response.raise_for_status()
    except requests.RequestException as exc:
        raise YoutubeCatalogError(f"YouTube video context request failed: {exc}") from exc

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


def _should_use_fallback(error: YoutubeCatalogError) -> bool:
    message = str(error).lower()
    return "403" in message or "forbidden" in message or "quota" in message


def _fallback_catalog_items(query: str, limit: int, exclude_video_id: str | None = None) -> list[YoutubeVideoItem]:
    lowered = query.lower()
    query_tokens = [token for token in re.split(r"\s+", lowered) if token]

    def match_score(item: dict[str, object]) -> int:
        haystack = " ".join(
            [
                str(item.get("title", "")),
                str(item.get("description", "")),
                " ".join(str(keyword) for keyword in item.get("keywords", [])),
            ]
        ).lower()

        score = 0
        for token in query_tokens:
          if token and token in haystack:
              score += 3
        for keyword in item["keywords"]:
            keyword_lower = str(keyword).lower()
            if keyword_lower in lowered:
                score += 5
        return score

    ranked = sorted(
        enumerate(FALLBACK_VIDEO_ITEMS),
        key=lambda pair: (-match_score(pair[1]), pair[0]),
    )
    ordered_items = [item for _, item in ranked]

    if ordered_items and all(match_score(item) == 0 for item in ordered_items):
        rotation = sum(ord(char) for char in lowered) % len(ordered_items)
        ordered_items = ordered_items[rotation:] + ordered_items[:rotation]

    filtered_items = [
        item for item in ordered_items
        if item["videoId"] != exclude_video_id
    ]

    return [
        YoutubeVideoItem(
            videoId=item["videoId"],
            title=item["title"],
            channelTitle=item["channelTitle"],
            description=item["description"],
            thumbnailUrl=item["thumbnailUrl"],
            publishedAt=item["publishedAt"],
        )
        for item in filtered_items[: max(1, min(limit, 10))]
    ]
