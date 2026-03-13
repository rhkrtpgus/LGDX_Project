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


def count_monitor_telemetry(session_id: str) -> int:
    settings = get_settings()
    client = get_mongo_client()
    try:
        collection = client[settings.mongodb_database]["monitor_telemetry"]
        return int(collection.count_documents({"session_id": session_id}))
    finally:
        client.close()
