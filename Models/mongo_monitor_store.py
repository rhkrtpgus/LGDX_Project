from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

try:
    from pymongo import MongoClient
    from pymongo.collection import Collection
except Exception:  # pragma: no cover - optional runtime dependency
    MongoClient = None
    Collection = Any


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


@dataclass
class MongoMonitorCollections:
    sessions: str = "monitor_sessions"
    telemetry: str = "monitor_telemetry"
    events: str = "monitor_events"


class MongoMonitorStore:
    def __init__(
        self,
        *,
        uri: str,
        database: str,
        enabled: bool = True,
        collections: MongoMonitorCollections | None = None,
    ) -> None:
        self.uri = uri
        self.database_name = database
        self.enabled = enabled and MongoClient is not None
        self.collections = collections or MongoMonitorCollections()
        self.client = None
        self.database = None

        if not self.enabled:
            return

        self.client = MongoClient(uri, serverSelectionTimeoutMS=3000)
        self.database = self.client[database]

    def ping(self) -> bool:
        if not self.enabled or self.client is None:
            return False
        self.client.admin.command("ping")
        return True

    def _sessions(self) -> Collection:
        return self.database[self.collections.sessions]

    def _telemetry(self) -> Collection:
        return self.database[self.collections.telemetry]

    def _events(self) -> Collection:
        return self.database[self.collections.events]

    def upsert_session_start(self, state: Any) -> None:
        if not self.enabled:
            return

        now = utc_now_iso()
        self._sessions().update_one(
            {"session_id": state.session_id},
            {
                "$setOnInsert": {
                    "session_id": state.session_id,
                    "analysis_id": state.analysis_id,
                    "user_id": state.user_id,
                    "child_id": state.child_id,
                    "started_at": now,
                    "created_at": now,
                },
                "$set": {
                    "video": {
                        "input_url": state.youtube_url,
                        "video_id": state.youtube_video_id,
                        "title": state.youtube_title,
                        "category_name_en": state.youtube_category_en,
                        "category_name_ko": state.youtube_category_ko,
                        "duration_seconds": state.youtube_duration_seconds,
                        "is_short_form": state.youtube_is_short_form,
                    },
                    "status": "RUNNING",
                    "updated_at": now,
                },
            },
            upsert=True,
        )

    def insert_telemetry(self, state: Any, snapshot: dict[str, Any], scores: dict[str, float]) -> None:
        if not self.enabled:
            return

        document = {
            "session_id": state.session_id,
            "analysis_id": state.analysis_id,
            "user_id": state.user_id,
            "child_id": state.child_id,
            "captured_at": snapshot["timestamp"],
            "watch_seconds": snapshot["watch_sec"],
            "blink": {
                "ear": snapshot["ear"],
                "bpm": snapshot["blink_bpm"],
                "count_total": snapshot["blink_total"],
            },
            "head_pose": {
                "yaw": snapshot["head_yaw"],
                "pitch": snapshot["head_pitch"],
                "roll": snapshot["head_roll"],
                "is_front": snapshot["head_is_front"],
            },
            "distance": {
                "screen_distance_cm": snapshot["distance_cm"],
                "is_safe": snapshot["distance_ok"],
            },
            "pose": {
                "status": snapshot["pose_status"],
                "still_duration_seconds": snapshot["still_sec"],
            },
            "emotion": {
                "label": snapshot["emotion"],
                "negative_ratio": snapshot["neg_ratio"],
            },
            "content_context": {
                "youtube_title": snapshot["youtube_title"],
                "youtube_category_en": snapshot["youtube_category_en"],
                "youtube_category_ko": snapshot["youtube_category_ko"],
                "youtube_duration_seconds": snapshot["youtube_duration_sec"],
                "youtube_is_short_form": snapshot["youtube_is_short_form"],
                "content_risk_adjustment": snapshot["content_risk_adjustment"],
                "content_risk_reasons": snapshot["content_risk_reasons"],
            },
            "scores": {
                "focus_score": snapshot["focus_score"],
                "risk_score": snapshot["risk_score"],
                "risk_level": snapshot["risk_level"],
                "breakdown": {key: round(value, 2) for key, value in scores.items()},
            },
            "child_messages": snapshot["child_messages"],
            "child_message_card": snapshot.get("child_message_card"),
            "created_at": utc_now_iso(),
        }
        self._telemetry().insert_one(document)

    def insert_event(
        self,
        state: Any,
        *,
        event_type: str,
        event_level: str,
        message: str,
        metrics: dict[str, Any] | None = None,
    ) -> None:
        if not self.enabled:
            return

        self._events().insert_one(
            {
                "session_id": state.session_id,
                "analysis_id": state.analysis_id,
                "user_id": state.user_id,
                "child_id": state.child_id,
                "occurred_at": utc_now_iso(),
                "event_type": event_type,
                "event_level": event_level,
                "message": message,
                "metrics": metrics or {},
                "created_at": utc_now_iso(),
            }
        )

    def finalize_session(self, state: Any) -> None:
        if not self.enabled:
            return

        sample_count = max(state.telemetry_sample_count, 1)
        summary = {
            "average_focus_score": round(state.focus_score_sum / sample_count, 2),
            "max_focus_score": round(state.max_focus_score, 2),
            "min_focus_score": round(state.min_focus_score if state.telemetry_sample_count else 0.0, 2),
            "average_risk_score": round(state.risk_score_sum / sample_count, 2),
            "max_risk_score": round(state.max_risk_score, 2),
            "final_risk_score": round(state.risk_score, 2),
            "final_risk_level": state.risk_level,
            "negative_emotion_ratio": round(state.negative_ratio, 4),
            "front_facing_ratio": round(state.front_facing_count / sample_count, 4),
            "safe_distance_ratio": round(state.safe_distance_count / sample_count, 4),
            "blink_count_total": state.blink_count,
            "warning_count": len(state.warning_log),
        }

        self._sessions().update_one(
            {"session_id": state.session_id},
            {
                "$set": {
                    "analysis_id": state.analysis_id,
                    "user_id": state.user_id,
                    "child_id": state.child_id,
                    "video": {
                        "input_url": state.youtube_url,
                        "video_id": state.youtube_video_id,
                        "title": state.youtube_title,
                        "category_name_en": state.youtube_category_en,
                        "category_name_ko": state.youtube_category_ko,
                        "duration_seconds": state.youtube_duration_seconds,
                        "is_short_form": state.youtube_is_short_form,
                    },
                    "status": "COMPLETED",
                    "watch_seconds": state.watch_time,
                    "summary": summary,
                    "content_risk": {
                        "adjustment": round(state.content_risk_adjustment, 2),
                        "reasons": list(state.content_risk_reasons),
                    },
                    "latest_child_messages": list(state.last_child_messages),
                    "ended_at": utc_now_iso(),
                    "updated_at": utc_now_iso(),
                }
            },
            upsert=True,
        )

    def mark_session_failed(self, state: Any, *, reason: str) -> None:
        if not self.enabled:
            return

        now = utc_now_iso()
        self._sessions().update_one(
            {"session_id": state.session_id},
            {
                "$setOnInsert": {
                    "session_id": state.session_id,
                    "analysis_id": state.analysis_id,
                    "user_id": state.user_id,
                    "child_id": state.child_id,
                    "started_at": now,
                    "created_at": now,
                },
                "$set": {
                    "video": {
                        "input_url": state.youtube_url,
                        "video_id": state.youtube_video_id,
                        "title": state.youtube_title,
                        "category_name_en": state.youtube_category_en,
                        "category_name_ko": state.youtube_category_ko,
                        "duration_seconds": state.youtube_duration_seconds,
                        "is_short_form": state.youtube_is_short_form,
                    },
                    "status": "FAILED",
                    "error_message": reason,
                    "watch_seconds": state.watch_time,
                    "ended_at": now,
                    "updated_at": now,
                },
            },
            upsert=True,
        )
