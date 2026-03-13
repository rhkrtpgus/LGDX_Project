CREATE TABLE IF NOT EXISTS "User" (
  "user_id" INT PRIMARY KEY,
  "user_name" VARCHAR(100),
  "birth_year" INT
);

CREATE TABLE IF NOT EXISTS "Child" (
  "child_id" INT PRIMARY KEY,
  "user_id" INT,
  "child_name" VARCHAR(100),
  "birth_year" INT,
  CONSTRAINT "fk_child_user"
    FOREIGN KEY ("user_id")
    REFERENCES "User" ("user_id")
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "ViewingHistory" (
  "viewing_id" INT PRIMARY KEY,
  "user_id" INT,
  "video_id" VARCHAR(120),
  "watch_time" TIMESTAMP,
  "watch_duration" INT,
  CONSTRAINT "fk_viewing_user"
    FOREIGN KEY ("user_id")
    REFERENCES "User" ("user_id")
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "AlertLog" (
  "alert_id" INT PRIMARY KEY,
  "viewing_id" INT,
  "alert_type" VARCHAR(80),
  "risk_level" VARCHAR(40),
  "message_text" VARCHAR(500),
  CONSTRAINT "fk_alert_viewing"
    FOREIGN KEY ("viewing_id")
    REFERENCES "ViewingHistory" ("viewing_id")
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "report_daily" (
  "report_id" INT PRIMARY KEY,
  "family_id" INT,
  "compare_time" INT,
  "count_alert_type" INT
);

CREATE TABLE IF NOT EXISTS "report_week" (
  "report_id" INT PRIMARY KEY,
  "family_id" INT,
  "compare_time" INT,
  "count_alert_type" INT
);

CREATE TABLE IF NOT EXISTS "report_month" (
  "report_id" INT PRIMARY KEY,
  "family_id" INT,
  "compare_time" INT,
  "count_alert_type" INT
);

CREATE TABLE IF NOT EXISTS "AnalysisHistory" (
  "analysis_id" BIGSERIAL PRIMARY KEY,
  "input_url" VARCHAR(1000) NOT NULL,
  "video_id" VARCHAR(120),
  "title" VARCHAR(300),
  "category_name_ko" VARCHAR(120),
  "duration_seconds" INT,
  "is_short_form" BOOLEAN NOT NULL DEFAULT FALSE,
  "blocked_by_category" BOOLEAN NOT NULL DEFAULT FALSE,
  "has_violence" BOOLEAN NOT NULL DEFAULT FALSE,
  "violence_score" DOUBLE PRECISION,
  "violence_positive_windows" INT,
  "has_nudity" BOOLEAN NOT NULL DEFAULT FALSE,
  "nudity_match_count" INT,
  "harmful" BOOLEAN NOT NULL DEFAULT FALSE,
  "harmful_reasons_json" TEXT,
  "status" VARCHAR(40) NOT NULL,
  "error_message" TEXT,
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "AppRuntimeSettings" (
  "settings_id" SMALLINT PRIMARY KEY,
  "privacy_consent" BOOLEAN NOT NULL DEFAULT FALSE,
  "addiction_monitor_enabled" BOOLEAN NOT NULL DEFAULT FALSE,
  "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "chk_runtime_settings_singleton"
    CHECK ("settings_id" = 1)
);

CREATE INDEX IF NOT EXISTS "idx_child_user_id"
  ON "Child" ("user_id");

CREATE INDEX IF NOT EXISTS "idx_viewing_user_time"
  ON "ViewingHistory" ("user_id", "watch_time" DESC);

CREATE INDEX IF NOT EXISTS "idx_alert_viewing_id"
  ON "AlertLog" ("viewing_id");

CREATE INDEX IF NOT EXISTS "idx_report_daily_family_id"
  ON "report_daily" ("family_id");

CREATE INDEX IF NOT EXISTS "idx_report_week_family_id"
  ON "report_week" ("family_id");

CREATE INDEX IF NOT EXISTS "idx_report_month_family_id"
  ON "report_month" ("family_id");

CREATE INDEX IF NOT EXISTS "idx_analysis_history_created_at"
  ON "AnalysisHistory" ("created_at" DESC);
