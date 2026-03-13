from contextlib import contextmanager
from typing import Iterator

import psycopg
from psycopg.rows import dict_row

from app.core.config import get_settings


@contextmanager
def get_postgres_connection() -> Iterator[psycopg.Connection]:
    settings = get_settings()
    with psycopg.connect(settings.postgres_url, row_factory=dict_row) as connection:
        yield connection


def ping_postgres() -> bool:
    with get_postgres_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute("select 1")
            row = cursor.fetchone()
    return bool(row)


def insert_analysis_history(payload: dict) -> dict:
    query = """
        insert into analysis_history (
          input_url,
          video_id,
          title,
          category_name_ko,
          duration_seconds,
          is_short_form,
          blocked_by_category,
          has_violence,
          violence_score,
          violence_positive_windows,
          has_nudity,
          nudity_match_count,
          harmful,
          harmful_reasons_json,
          status,
          error_message
        )
        values (
          %(input_url)s,
          %(video_id)s,
          %(title)s,
          %(category_name_ko)s,
          %(duration_seconds)s,
          %(is_short_form)s,
          %(blocked_by_category)s,
          %(has_violence)s,
          %(violence_score)s,
          %(violence_positive_windows)s,
          %(has_nudity)s,
          %(nudity_match_count)s,
          %(harmful)s,
          %(harmful_reasons_json)s,
          %(status)s,
          %(error_message)s
        )
        returning analysis_id, created_at
    """

    with get_postgres_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(query, payload)
            row = cursor.fetchone()
        connection.commit()

    if not row:
        raise RuntimeError("PostgreSQL insert returned no row.")

    return row


def list_analysis_history(limit: int = 10) -> list[dict]:
    query = """
        select
          analysis_id,
          input_url,
          video_id,
          title,
          category_name_ko,
          duration_seconds,
          is_short_form,
          blocked_by_category,
          has_violence,
          violence_score,
          violence_positive_windows,
          has_nudity,
          nudity_match_count,
          harmful,
          harmful_reasons_json,
          status,
          error_message,
          created_at
        from analysis_history
        order by created_at desc, analysis_id desc
        limit %(limit)s
    """

    with get_postgres_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(query, {"limit": max(limit, 1)})
            rows = cursor.fetchall()

    return list(rows)


def get_analysis_history_by_id(analysis_id: int) -> dict | None:
    query = """
        select
          analysis_id,
          input_url,
          video_id,
          title,
          category_name_ko,
          duration_seconds,
          is_short_form,
          blocked_by_category,
          has_violence,
          violence_score,
          violence_positive_windows,
          has_nudity,
          nudity_match_count,
          harmful,
          harmful_reasons_json,
          status,
          error_message,
          created_at
        from analysis_history
        where analysis_id = %(analysis_id)s
    """

    with get_postgres_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(query, {"analysis_id": analysis_id})
            row = cursor.fetchone()

    return row


def get_runtime_settings() -> dict:
    query = """
        select
          privacy_consent,
          addiction_monitor_enabled,
          updated_at
        from app_runtime_settings
        where settings_id = 1
    """

    with get_postgres_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(query)
            row = cursor.fetchone()

    if row:
        return row

    return {
        "privacy_consent": False,
        "addiction_monitor_enabled": False,
        "updated_at": None,
    }


def upsert_runtime_settings(payload: dict) -> dict:
    query = """
        insert into app_runtime_settings (
          settings_id,
          privacy_consent,
          addiction_monitor_enabled,
          updated_at
        )
        values (
          1,
          %(privacy_consent)s,
          %(addiction_monitor_enabled)s,
          current_timestamp
        )
        on conflict (settings_id) do update set
          privacy_consent = excluded.privacy_consent,
          addiction_monitor_enabled = excluded.addiction_monitor_enabled,
          updated_at = current_timestamp
        returning
          privacy_consent,
          addiction_monitor_enabled,
          updated_at
    """

    with get_postgres_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(query, payload)
            row = cursor.fetchone()
        connection.commit()

    if not row:
        raise RuntimeError("PostgreSQL runtime settings upsert returned no row.")

    return row
