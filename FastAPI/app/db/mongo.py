from __future__ import annotations

from typing import Any

from pymongo import MongoClient

from app.core.config import get_settings


def get_mongo_client() -> MongoClient:
    settings = get_settings()
    return MongoClient(settings.mongodb_url, serverSelectionTimeoutMS=3000)


def ping_mongo() -> bool:
    client = get_mongo_client()
    try:
        client.admin.command("ping")
        return True
    finally:
        client.close()


def get_monitor_session_by_analysis_id(analysis_id: int) -> dict[str, Any] | None:
    settings = get_settings()
    client = get_mongo_client()
    try:
        collection = client[settings.mongodb_database]["monitor_sessions"]
        return collection.find_one(
            {"analysis_id": analysis_id},
            sort=[("updated_at", -1), ("created_at", -1)],
        )
    finally:
        client.close()


def get_monitor_session_by_session_id(session_id: str) -> dict[str, Any] | None:
    settings = get_settings()
    client = get_mongo_client()
    try:
        collection = client[settings.mongodb_database]["monitor_sessions"]
        return collection.find_one({"session_id": session_id})
    finally:
        client.close()


def get_latest_monitor_session_by_child_id(child_id: int) -> dict[str, Any] | None:
    settings = get_settings()
    client = get_mongo_client()
    try:
        collection = client[settings.mongodb_database]["monitor_sessions"]
        return collection.find_one(
            {"child_id": child_id},
            sort=[("updated_at", -1), ("started_at", -1), ("created_at", -1)],
        )
    finally:
        client.close()


def count_monitor_telemetry(session_id: str) -> int:
    settings = get_settings()
    client = get_mongo_client()
    try:
        collection = client[settings.mongodb_database]["monitor_telemetry"]
        return int(collection.count_documents({"session_id": session_id}))
    finally:
        client.close()


# ── 음성 알림 ─────────────────────────────────────────────────────────────────

def list_voice_recordings(family_id: int) -> list[dict[str, Any]]:
    """오디오 데이터 제외한 메타데이터 목록 반환"""
    settings = get_settings()
    client = get_mongo_client()
    try:
        col = client[settings.mongodb_database]["voice_recordings"]
        return list(col.find(
            {"family_id": family_id},
            {"_id": 0, "audio_data": 0},
            sort=[("created_at", 1)],
        ))
    finally:
        client.close()


def get_voice_recording(family_id: int, speaker_id: str, alert_type: str) -> dict[str, Any] | None:
    """오디오 데이터 포함 단일 녹음 반환"""
    settings = get_settings()
    client = get_mongo_client()
    try:
        col = client[settings.mongodb_database]["voice_recordings"]
        return col.find_one({"family_id": family_id, "speaker_id": speaker_id, "alert_type": alert_type}, {"_id": 0})
    finally:
        client.close()


def list_voice_recordings_by_alert(family_id: int, alert_type: str) -> list[dict[str, Any]]:
    """특정 알림 유형의 모든 녹음 (오디오 포함) 반환"""
    settings = get_settings()
    client = get_mongo_client()
    try:
        col = client[settings.mongodb_database]["voice_recordings"]
        return list(col.find({"family_id": family_id, "alert_type": alert_type}, {"_id": 0}))
    finally:
        client.close()


def upsert_voice_recording(doc: dict[str, Any]) -> None:
    settings = get_settings()
    client = get_mongo_client()
    try:
        col = client[settings.mongodb_database]["voice_recordings"]
        col.update_one(
            {"family_id": doc["family_id"], "speaker_id": doc["speaker_id"], "alert_type": doc["alert_type"]},
            {"$set": doc},
            upsert=True,
        )
    finally:
        client.close()


def delete_voice_recording(family_id: int, speaker_id: str, alert_type: str) -> int:
    settings = get_settings()
    client = get_mongo_client()
    try:
        col = client[settings.mongodb_database]["voice_recordings"]
        result = col.delete_one({"family_id": family_id, "speaker_id": speaker_id, "alert_type": alert_type})
        return result.deleted_count
    finally:
        client.close()


def toggle_voice_recording(family_id: int, speaker_id: str, alert_type: str, enabled: bool) -> int:
    settings = get_settings()
    client = get_mongo_client()
    try:
        col = client[settings.mongodb_database]["voice_recordings"]
        result = col.update_one(
            {"family_id": family_id, "speaker_id": speaker_id, "alert_type": alert_type},
            {"$set": {"enabled": enabled}},
        )
        return result.matched_count
    finally:
        client.close()


def get_voice_alert_settings(family_id: int) -> dict[str, Any]:
    settings = get_settings()
    client = get_mongo_client()
    try:
        col = client[settings.mongodb_database]["voice_alert_settings"]
        doc = col.find_one({"family_id": family_id}, {"_id": 0})
        return doc or {
            "family_id": family_id,
            "distance_enabled": True,
            "blink_enabled": True,
            "stretch_enabled": True,
            "distance_active_speaker_id": None,
            "blink_active_speaker_id": None,
            "stretch_active_speaker_id": None,
        }
    finally:
        client.close()


def upsert_voice_alert_settings(doc: dict[str, Any]) -> None:
    settings = get_settings()
    client = get_mongo_client()
    try:
        col = client[settings.mongodb_database]["voice_alert_settings"]
        col.update_one({"family_id": doc["family_id"]}, {"$set": doc}, upsert=True)
    finally:
        client.close()


# ── monitor telemetry ─────────────────────────────────────────────────────────

def get_latest_monitor_telemetry(session_id: str) -> dict[str, Any] | None:
    settings = get_settings()
    client = get_mongo_client()
    try:
        collection = client[settings.mongodb_database]["monitor_telemetry"]
        return collection.find_one(
            {"session_id": session_id},
            sort=[("captured_at", -1), ("created_at", -1)],
        )
    finally:
        client.close()
