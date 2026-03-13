INSERT INTO "User" ("user_id", "user_name", "birth_year") VALUES
  (1, 'Kim Family', 1987),
  (2, 'Lee Family', 1990),
  (3, 'Park Family', 1985)
ON CONFLICT ("user_id") DO NOTHING;

INSERT INTO "Child" ("child_id", "user_id", "child_name", "birth_year") VALUES
  (1, 1, 'Minseo', 2014),
  (2, 1, 'Jiwon', 2017),
  (3, 2, 'Yejun', 2013),
  (4, 3, 'Seoa', 2016)
ON CONFLICT ("child_id") DO NOTHING;

INSERT INTO "ViewingHistory" ("viewing_id", "user_id", "video_id", "watch_time", "watch_duration") VALUES
  (1, 1, 'stream-front-gate', TIMESTAMP '2026-03-12 14:05:00', 1800),
  (2, 1, 'stream-lobby', TIMESTAMP '2026-03-12 14:42:00', 1200),
  (3, 2, 'stream-parking', TIMESTAMP '2026-03-12 15:10:00', 2400),
  (4, 3, 'stream-warehouse', TIMESTAMP '2026-03-12 15:26:00', 900),
  (5, 2, 'stream-playroom', TIMESTAMP '2026-03-12 15:41:00', 1500)
ON CONFLICT ("viewing_id") DO NOTHING;

INSERT INTO "AlertLog" ("alert_id", "viewing_id", "alert_type", "risk_level", "message_text") VALUES
  (1, 1, 'violence', 'high', 'Potential violent motion pattern detected near front gate'),
  (2, 2, 'nudity', 'medium', 'Sensitive content candidate detected in lobby feed'),
  (3, 3, 'intrusion', 'high', 'Unauthorized movement detected in parking zone'),
  (4, 4, 'fall', 'medium', 'Possible fall event detected in warehouse'),
  (5, 5, 'language', 'low', 'Flagged audio pattern detected in playroom clip')
ON CONFLICT ("alert_id") DO NOTHING;

INSERT INTO "report_daily" ("report_id", "family_id", "compare_time", "count_alert_type") VALUES
  (1, 1, 1, 2),
  (2, 2, 1, 2),
  (3, 3, 1, 1)
ON CONFLICT ("report_id") DO NOTHING;

INSERT INTO "report_week" ("report_id", "family_id", "compare_time", "count_alert_type") VALUES
  (1, 1, 7, 5),
  (2, 2, 7, 4),
  (3, 3, 7, 2)
ON CONFLICT ("report_id") DO NOTHING;

INSERT INTO "report_month" ("report_id", "family_id", "compare_time", "count_alert_type") VALUES
  (1, 1, 30, 12),
  (2, 2, 30, 9),
  (3, 3, 30, 6)
ON CONFLICT ("report_id") DO NOTHING;

INSERT INTO "AppRuntimeSettings" (
  "settings_id",
  "privacy_consent",
  "addiction_monitor_enabled",
  "updated_at"
) VALUES (
  1,
  FALSE,
  FALSE,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("settings_id") DO NOTHING;
