import argparse
import json
import logging
import os
import re
import sys
import time
from dataclasses import asdict, dataclass, field
from typing import Optional
from urllib.parse import parse_qs, urlparse

import cv2
import requests
import yt_dlp

from Model.nudenet_video.detector import DEFAULT_NUDITY_CLASSES, VideoNudeDetector
from Model.violent_video.detector import VideoViolenceDetector


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)


YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY", "AIzaSyBpPCj5mvYYdxOxKrGwm7Pdxp3cI8_uPbA")
YOUTUBE_REGION_CODE = "KR"
TARGET_FPS = 24.0
MAX_SAMPLED_FRAMES = 480
NUDENET_STOP_ON_FIRST_MATCH = False
NUDITY_MIN_SCORE = 0.75
NUDITY_MIN_MATCH_COUNT = 2
NUDITY_MAX_FRAME_GAP = 12
VIOLENCE_WINDOW_SIZE = 64
VIOLENCE_WINDOW_STRIDE = 32
VIOLENCE_MIN_WINDOW_SCORE = 0.95
VIOLENCE_MIN_POSITIVE_WINDOWS = 4

BLOCKED_CATEGORIES = {
    "Film & Animation",
    "Entertainment",
}

CATEGORY_ID_TO_NAME = {
    "1": "Film & Animation",
    "2": "Autos & Vehicles",
    "10": "Music",
    "15": "Pets & Animals",
    "17": "Sports",
    "19": "Travel & Events",
    "20": "Gaming",
    "22": "People & Blogs",
    "23": "Comedy",
    "24": "Entertainment",
    "25": "News & Politics",
    "26": "Howto & Style",
    "27": "Education",
    "28": "Science & Technology",
    "29": "Nonprofits & Activism",
}

CATEGORY_TRANSLATIONS = {
    "Film & Animation": "영화/애니메이션",
    "Autos & Vehicles": "자동차",
    "Music": "음악",
    "Pets & Animals": "반려동물/동물",
    "Sports": "스포츠",
    "Travel & Events": "여행/이벤트",
    "Gaming": "게임",
    "People & Blogs": "인물/블로그",
    "Comedy": "코미디",
    "Entertainment": "엔터테인먼트",
    "News & Politics": "뉴스/정치",
    "Howto & Style": "노하우/스타일",
    "Education": "교육",
    "Science & Technology": "과학/기술",
    "Nonprofits & Activism": "비영리/사회운동",
}


@dataclass
class CategoryFilterResult:
    category_name_en: str
    category_name_ko: str
    is_blocked: bool
    reason: Optional[str] = None


@dataclass
class YouTubeVideoContext:
    input_url: str
    video_id: str
    title: str
    category_id: str
    category_name_en: str
    category_name_ko: str
    duration_seconds: int
    is_short_form: bool


@dataclass
class AnalysisResult:
    input_url: str
    video_id: str
    title: str
    category_id: str
    category_name_en: str
    category_name_ko: str
    duration_seconds: int
    is_short_form: bool
    category_filter: CategoryFilterResult
    source_fps: float
    sampled_fps: float
    sampled_frames: int
    has_violence: bool
    violence_score: float
    violence_positive_windows: int
    has_nudity: bool
    nudity_match_count: int
    violence_window_scores: list[float] = field(default_factory=list)
    harmful_reasons: list[str] = field(default_factory=list)
    stream_url: Optional[str] = None
    nudity_matches: list[dict] = field(default_factory=list)


def _normalize_json_value(value):
    if isinstance(value, dict):
        return {str(key): _normalize_json_value(item) for key, item in value.items()}

    if isinstance(value, (list, tuple)):
        return [_normalize_json_value(item) for item in value]

    if isinstance(value, (str, int, float, bool)) or value is None:
        return value

    if hasattr(value, "item") and callable(value.item):
        try:
            return _normalize_json_value(value.item())
        except Exception:
            pass

    if hasattr(value, "tolist") and callable(value.tolist):
        try:
            return _normalize_json_value(value.tolist())
        except Exception:
            pass

    return str(value)


def serialize_analysis_result(result: AnalysisResult) -> dict:
    return _normalize_json_value(asdict(result))


def build_analysis_history_payload(
    result: AnalysisResult,
    *,
    status: str = "COMPLETED",
    error_message: Optional[str] = None,
) -> dict:
    """Build a DB-friendly payload for analysis_history-like storage."""
    return {
        "input_url": result.input_url,
        "video_id": result.video_id,
        "title": result.title,
        "category_name_ko": result.category_name_ko,
        "duration_seconds": int(result.duration_seconds),
        "is_short_form": result.is_short_form,
        "blocked_by_category": result.category_filter.is_blocked,
        "has_violence": result.has_violence,
        "violence_score": float(result.violence_score),
        "violence_positive_windows": int(result.violence_positive_windows),
        "has_nudity": result.has_nudity,
        "nudity_match_count": int(result.nudity_match_count),
        "harmful": bool(result.harmful_reasons),
        "harmful_reasons_json": json.dumps(result.harmful_reasons, ensure_ascii=False),
        "status": status,
        "error_message": error_message,
    }


def build_youtube_client():
    if not YOUTUBE_API_KEY:
        raise ValueError("YouTube API key is not set. Configure YOUTUBE_API_KEY.")
    return {"api_key": YOUTUBE_API_KEY}


def parse_iso8601_duration(duration_text: str) -> int:
    pattern = re.compile(
        r"^P"
        r"(?:(?P<days>\d+)D)?"
        r"(?:T"
        r"(?:(?P<hours>\d+)H)?"
        r"(?:(?P<minutes>\d+)M)?"
        r"(?:(?P<seconds>\d+)S)?"
        r")?$"
    )
    match = pattern.match(duration_text or "")
    if not match:
        return 0

    parts = {key: int(value or 0) for key, value in match.groupdict().items()}
    return (
        parts["days"] * 86400
        + parts["hours"] * 3600
        + parts["minutes"] * 60
        + parts["seconds"]
    )


def extract_video_id(url: str) -> str:
    parsed = urlparse(url)
    hostname = (parsed.hostname or "").lower()

    if hostname == "youtu.be":
        video_id = parsed.path.strip("/").split("/")[0]
    elif hostname in {"www.youtube.com", "youtube.com", "m.youtube.com"}:
        if parsed.path == "/watch":
            params = parse_qs(parsed.query)
            video_id = params.get("v", [None])[0]
        elif parsed.path.startswith("/shorts/"):
            video_id = parsed.path.split("/shorts/", 1)[1].split("/")[0]
        elif parsed.path.startswith("/live/"):
            video_id = parsed.path.split("/live/", 1)[1].split("/")[0]
        elif parsed.path.startswith("/embed/"):
            video_id = parsed.path.split("/embed/", 1)[1].split("/")[0]
        else:
            video_id = None
    else:
        raise ValueError(f"Unsupported YouTube URL format: {url}")

    if not video_id:
        raise ValueError(f"Could not extract video_id from URL: {url}")

    logger.info("Extracted video_id: %s", video_id)
    return video_id


def get_video_metadata(youtube_client, video_id: str) -> tuple[str, str, int]:
    response = requests.get(
        "https://www.googleapis.com/youtube/v3/videos",
        params={
            "part": "snippet,contentDetails",
            "id": video_id,
            "key": youtube_client["api_key"],
        },
        timeout=30,
    )
    response.raise_for_status()
    payload = json.loads(response.content.decode("utf-8"))
    items = payload.get("items", [])
    if not items:
        raise ValueError(f"No video found for video_id={video_id}")

    snippet = items[0]["snippet"]
    content_details = items[0].get("contentDetails", {})
    title = snippet.get("title", "Unknown title")
    category_id = snippet.get("categoryId", "0")
    duration_seconds = parse_iso8601_duration(content_details.get("duration", "PT0S"))
    logger.info(
        "Fetched metadata: title=%s, category_id=%s, duration_seconds=%s",
        title,
        category_id,
        duration_seconds,
    )
    return title, category_id, duration_seconds


def get_category_name(
    youtube_client,
    category_id: str,
    region_code: str = YOUTUBE_REGION_CODE,
) -> str:
    static_name = CATEGORY_ID_TO_NAME.get(str(category_id))
    if static_name:
        return static_name

    candidate_regions = [region_code]
    if region_code != "US":
        candidate_regions.append("US")
    candidate_regions.append(None)

    for candidate_region in candidate_regions:
        params = {
            "part": "snippet",
            "id": category_id,
            "key": youtube_client["api_key"],
        }
        if candidate_region:
            params["regionCode"] = candidate_region

        try:
            response = requests.get(
                "https://www.googleapis.com/youtube/v3/videoCategories",
                params=params,
                timeout=30,
            )
            response.raise_for_status()
            payload = json.loads(response.content.decode("utf-8"))
        except requests.RequestException as exc:
            logger.warning(
                "YouTube API category request failed for region=%s: %s",
                candidate_region,
                exc,
            )
            continue

        items = payload.get("items", [])
        if items:
            return items[0]["snippet"]["title"]

    logger.error("YouTube API category request failed for all fallback regions")
    return "Unknown"


def translate_category_name(category_name_en: str) -> str:
    return CATEGORY_TRANSLATIONS.get(category_name_en, category_name_en)


def filter_category(category_name_en: str, category_name_ko: str) -> CategoryFilterResult:
    is_blocked = category_name_en in BLOCKED_CATEGORIES
    reason = None
    if is_blocked:
        reason = f"Blocked by category pre-filter: {category_name_ko} ({category_name_en})"
        logger.warning(reason)

    return CategoryFilterResult(
        category_name_en=category_name_en,
        category_name_ko=category_name_ko,
        is_blocked=is_blocked,
        reason=reason,
    )


def get_stream_url(video_url: str) -> str:
    ydl_opts = {
        "quiet": True,
        "no_warnings": True,
        "noplaylist": True,
        "format": "best[protocol*=http][ext=mp4]/best[ext=mp4]/best",
    }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(video_url, download=False)
        stream_url = info.get("url")
        if not stream_url:
            raise ValueError("Failed to extract streaming URL from yt-dlp result")
        logger.info("Resolved streaming URL from yt-dlp")
        return stream_url


def sample_stream_frames(
    stream_url: str,
    target_fps: float = TARGET_FPS,
    max_sampled_frames: int = MAX_SAMPLED_FRAMES,
) -> tuple[list, float, float]:
    cap = cv2.VideoCapture(stream_url)
    if not cap.isOpened():
        raise RuntimeError("OpenCV could not open the streaming URL")

    source_fps = float(cap.get(cv2.CAP_PROP_FPS) or 0.0)
    if source_fps <= 0:
        source_fps = target_fps

    frame_interval = max(source_fps / target_fps, 1.0) if target_fps > 0 else 1.0
    sampled_fps = min(source_fps, target_fps) if target_fps > 0 else source_fps

    frames = []
    frame_index = 0
    next_sample_frame = 0.0

    try:
        while len(frames) < max_sampled_frames:
            ok, frame = cap.read()
            if not ok:
                break

            if frame_index + 1e-9 >= next_sample_frame:
                frames.append(frame)
                next_sample_frame += frame_interval

            frame_index += 1
    finally:
        cap.release()

    if not frames:
        raise RuntimeError("No frames were sampled from the stream")

    logger.info(
        "Sampled %s frames from stream (source_fps=%.2f, sampled_fps=%.2f)",
        len(frames),
        source_fps,
        sampled_fps,
    )
    return frames, source_fps, sampled_fps


def load_detectors() -> tuple[VideoNudeDetector, VideoViolenceDetector]:
    logger.info("Loading NudeNet and Violent detectors")
    nude_detector = VideoNudeDetector(detection_threshold=0.3)
    violence_detector = VideoViolenceDetector(threshold=VIOLENCE_MIN_WINDOW_SCORE)
    return nude_detector, violence_detector


def analyze_violence_windows(
    frames: list,
    sampled_fps: float,
    violence_detector: VideoViolenceDetector,
) -> dict:
    if not frames:
        raise ValueError("No frames provided for violence analysis")

    if len(frames) <= VIOLENCE_WINDOW_SIZE:
        windows = [frames]
    else:
        windows = []
        for start in range(0, len(frames) - VIOLENCE_WINDOW_SIZE + 1, VIOLENCE_WINDOW_STRIDE):
            windows.append(frames[start : start + VIOLENCE_WINDOW_SIZE])
        if not windows or len(windows[-1]) < VIOLENCE_WINDOW_SIZE:
            windows.append(frames[-VIOLENCE_WINDOW_SIZE:])

    window_scores = []
    for window in windows:
        window_result = violence_detector.analyze_frames(
            frames=window,
            source_fps=sampled_fps,
            target_fps=sampled_fps,
        )
        window_scores.append(float(window_result["violence_score"]))

    positive_window_count = sum(
        score >= VIOLENCE_MIN_WINDOW_SCORE for score in window_scores
    )
    max_score = max(window_scores) if window_scores else 0.0
    has_violence = positive_window_count >= VIOLENCE_MIN_POSITIVE_WINDOWS

    return {
        "source_fps": sampled_fps,
        "target_fps": sampled_fps,
        "sampled_frames_before_fit": len(frames),
        "sequence_length": violence_detector.sequence_length,
        "violence_score": max_score,
        "threshold": VIOLENCE_MIN_WINDOW_SCORE,
        "positive_window_count": positive_window_count,
        "window_scores": window_scores,
        "has_violence": has_violence,
    }


def refine_nudity_result(nudity_result: dict) -> dict:
    matches = nudity_result.get("matches", [])
    if len(matches) < NUDITY_MIN_MATCH_COUNT:
        nudity_result["has_nudity"] = False
        nudity_result["match_count"] = 0
        nudity_result["matches"] = []
        nudity_result["decision_reason"] = (
            f"Below minimum matched frames ({len(matches)} < {NUDITY_MIN_MATCH_COUNT})"
        )
        return nudity_result

    consecutive_pairs = 0
    for previous, current in zip(matches, matches[1:]):
        if current["frame_index"] - previous["frame_index"] <= NUDITY_MAX_FRAME_GAP:
            consecutive_pairs += 1

    if consecutive_pairs == 0:
        nudity_result["has_nudity"] = False
        nudity_result["match_count"] = 0
        nudity_result["matches"] = []
        nudity_result["decision_reason"] = (
            "Matched frames were too sparse to count as confirmed nudity"
        )
        return nudity_result

    nudity_result["match_count"] = len(matches)
    nudity_result["decision_reason"] = (
        f"Confirmed by {len(matches)} matched frames with frame gap <= {NUDITY_MAX_FRAME_GAP}"
    )
    return nudity_result


def analyze_models(
    frames: list,
    sampled_fps: float,
    nude_detector: VideoNudeDetector,
    violence_detector: VideoViolenceDetector,
) -> tuple[dict, dict]:
    nudity_result = nude_detector.analyze_frames(
        frames=frames,
        source_fps=sampled_fps,
        stop_on_first_match=NUDENET_STOP_ON_FIRST_MATCH,
        positive_classes=DEFAULT_NUDITY_CLASSES,
        min_positive_score=NUDITY_MIN_SCORE,
    )
    nudity_result = refine_nudity_result(nudity_result)
    violence_result = analyze_violence_windows(
        frames=frames,
        sampled_fps=sampled_fps,
        violence_detector=violence_detector,
    )
    return nudity_result, violence_result


def fetch_youtube_video_context(video_url: str) -> YouTubeVideoContext:
    youtube_client = build_youtube_client()
    video_id = extract_video_id(video_url)
    title, category_id, duration_seconds = get_video_metadata(youtube_client, video_id)
    category_name_en = get_category_name(youtube_client, category_id)
    category_name_ko = translate_category_name(category_name_en)
    is_short_form = duration_seconds > 0 and duration_seconds <= 180

    return YouTubeVideoContext(
        input_url=video_url,
        video_id=video_id,
        title=title,
        category_id=category_id,
        category_name_en=category_name_en,
        category_name_ko=category_name_ko,
        duration_seconds=duration_seconds,
        is_short_form=is_short_form,
    )


def run_pipeline(video_url: str) -> AnalysisResult:
    start_time = time.time()
    logger.info("Pipeline started: %s", video_url)

    video_context = fetch_youtube_video_context(video_url)
    category_filter = filter_category(
        video_context.category_name_en,
        video_context.category_name_ko,
    )

    stream_url = get_stream_url(video_url)
    frames, source_fps, sampled_fps = sample_stream_frames(stream_url)

    nude_detector, violence_detector = load_detectors()
    nudity_result, violence_result = analyze_models(
        frames=frames,
        sampled_fps=sampled_fps,
        nude_detector=nude_detector,
        violence_detector=violence_detector,
    )

    harmful_reasons = []
    if category_filter.is_blocked:
        harmful_reasons.append(category_filter.reason)
    if violence_result["has_violence"]:
        harmful_reasons.append(
            f"Violence detected (score={violence_result['violence_score']:.3f})"
        )
    if nudity_result["has_nudity"]:
        harmful_reasons.append(
            f"Nudity detected ({nudity_result['match_count']} matched frame(s))"
        )

    elapsed = time.time() - start_time
    logger.info("Pipeline finished in %.2f seconds", elapsed)

    return AnalysisResult(
        input_url=video_url,
        video_id=video_context.video_id,
        title=video_context.title,
        category_id=video_context.category_id,
        category_name_en=video_context.category_name_en,
        category_name_ko=video_context.category_name_ko,
        duration_seconds=video_context.duration_seconds,
        is_short_form=video_context.is_short_form,
        category_filter=category_filter,
        source_fps=source_fps,
        sampled_fps=sampled_fps,
        sampled_frames=len(frames),
        has_violence=violence_result["has_violence"],
        violence_score=violence_result["violence_score"],
        violence_positive_windows=violence_result["positive_window_count"],
        violence_window_scores=violence_result["window_scores"],
        has_nudity=nudity_result["has_nudity"],
        nudity_match_count=nudity_result["match_count"],
        harmful_reasons=harmful_reasons,
        stream_url=stream_url,
        nudity_matches=nudity_result["matches"],
    )


def build_parser():
    parser = argparse.ArgumentParser(
        description=(
            "YouTube URL -> metadata/category filter -> yt-dlp stream URL -> "
            "OpenCV frames -> violence/nudity models"
        )
    )
    parser.add_argument("video_url", help="YouTube video URL to analyze")
    return parser


def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")

    parser = build_parser()
    args = parser.parse_args()
    result = run_pipeline(args.video_url)
    print(json.dumps(asdict(result), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
