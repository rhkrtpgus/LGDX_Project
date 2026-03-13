insert into users (user_id, user_name, birth_year) values
  (1, 'Kim Family', 1987),
  (2, 'Lee Family', 1990),
  (3, 'Park Family', 1985)
on conflict (user_id) do update set
  user_name = excluded.user_name,
  birth_year = excluded.birth_year;

insert into children (child_id, user_id, child_name, birth_year) values
  (1, 1, 'Mina', 2014),
  (2, 1, 'Joon', 2017),
  (3, 2, 'Sia', 2013),
  (4, 3, 'Doyun', 2016)
on conflict (child_id) do update set
  user_id = excluded.user_id,
  child_name = excluded.child_name,
  birth_year = excluded.birth_year;

insert into viewing_history (
  viewing_id,
  user_id,
  child_id,
  video_id,
  watch_time,
  watch_duration
) values
  (1, 1, 1, 'youtube-minecraft', timestamp '2026-03-12 14:05:00', 1800),
  (2, 1, 2, 'youtube-cartoon-live', timestamp '2026-03-12 14:42:00', 1200),
  (3, 2, 3, 'youtube-racing-clips', timestamp '2026-03-12 15:10:00', 2400),
  (4, 3, 4, 'youtube-dance-stage', timestamp '2026-03-12 15:26:00', 900),
  (5, 2, 3, 'youtube-game-highlights', timestamp '2026-03-12 15:41:00', 1500)
on conflict (viewing_id) do update set
  user_id = excluded.user_id,
  child_id = excluded.child_id,
  video_id = excluded.video_id,
  watch_time = excluded.watch_time,
  watch_duration = excluded.watch_duration;

insert into alert_log (alert_id, viewing_id, alert_type, risk_level, message_text) values
  (1, 1, 'violent-scene', 'high', 'Violent scene detected. Guardian review is recommended.'),
  (2, 2, 'screen-time-warning', 'medium', 'Daily viewing time has reached 80 percent of the limit.'),
  (3, 3, 'addiction-risk', 'high', 'Continuous high-engagement viewing pattern detected.'),
  (4, 4, 'posture-warning', 'medium', 'Extended fixed-posture viewing detected.'),
  (5, 5, 'guardian-notice', 'low', 'A summary notice was sent to the guardian.')
on conflict (alert_id) do update set
  viewing_id = excluded.viewing_id,
  alert_type = excluded.alert_type,
  risk_level = excluded.risk_level,
  message_text = excluded.message_text;

insert into child_watch_policy (
  child_id,
  daily_limit_minutes,
  weekday_start_hour,
  weekday_end_hour,
  weekend_start_hour,
  weekend_end_hour,
  notification_threshold,
  auto_block_enabled,
  updated_at
) values
  (1, 90, 7, 20, 8, 21, 70, true, current_timestamp),
  (2, 60, 8, 19, 8, 20, 65, true, current_timestamp),
  (3, 100, 7, 21, 8, 22, 72, true, current_timestamp),
  (4, 80, 8, 20, 8, 21, 68, true, current_timestamp)
on conflict (child_id) do update set
  daily_limit_minutes = excluded.daily_limit_minutes,
  weekday_start_hour = excluded.weekday_start_hour,
  weekday_end_hour = excluded.weekday_end_hour,
  weekend_start_hour = excluded.weekend_start_hour,
  weekend_end_hour = excluded.weekend_end_hour,
  notification_threshold = excluded.notification_threshold,
  auto_block_enabled = excluded.auto_block_enabled,
  updated_at = excluded.updated_at;

insert into report_daily (report_id, family_id, compare_time, count_alert_type) values
  (1, 1, 1, 2),
  (2, 2, 1, 2),
  (3, 3, 1, 1)
on conflict (report_id) do update set
  family_id = excluded.family_id,
  compare_time = excluded.compare_time,
  count_alert_type = excluded.count_alert_type;

insert into report_week (report_id, family_id, compare_time, count_alert_type) values
  (1, 1, 7, 5),
  (2, 2, 7, 4),
  (3, 3, 7, 2)
on conflict (report_id) do update set
  family_id = excluded.family_id,
  compare_time = excluded.compare_time,
  count_alert_type = excluded.count_alert_type;

insert into report_month (report_id, family_id, compare_time, count_alert_type) values
  (1, 1, 30, 12),
  (2, 2, 30, 9),
  (3, 3, 30, 6)
on conflict (report_id) do update set
  family_id = excluded.family_id,
  compare_time = excluded.compare_time,
  count_alert_type = excluded.count_alert_type;

insert into analysis_history (
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
) values
  (
    1,
    'https://youtu.be/sample-safe-video',
    'sample-safe-video',
    'Sample Safe Video',
    'education',
    420,
    false,
    false,
    false,
    0.03,
    0,
    false,
    0,
    false,
    '[]',
    'completed',
    null,
    timestamp '2026-03-12 16:10:00'
  ),
  (
    2,
    'https://youtu.be/sample-risk-video',
    'sample-risk-video',
    'Sample Risk Video',
    'entertainment',
    360,
    true,
    true,
    true,
    0.91,
    8,
    false,
    0,
    true,
    '[\"violence\", \"short-form\"]',
    'completed',
    null,
    timestamp '2026-03-12 16:18:00'
  )
on conflict (analysis_id) do update set
  input_url = excluded.input_url,
  video_id = excluded.video_id,
  title = excluded.title,
  category_name_ko = excluded.category_name_ko,
  duration_seconds = excluded.duration_seconds,
  is_short_form = excluded.is_short_form,
  blocked_by_category = excluded.blocked_by_category,
  has_violence = excluded.has_violence,
  violence_score = excluded.violence_score,
  violence_positive_windows = excluded.violence_positive_windows,
  has_nudity = excluded.has_nudity,
  nudity_match_count = excluded.nudity_match_count,
  harmful = excluded.harmful,
  harmful_reasons_json = excluded.harmful_reasons_json,
  status = excluded.status,
  error_message = excluded.error_message,
  created_at = excluded.created_at;

select setval(
  pg_get_serial_sequence('analysis_history', 'analysis_id'),
  coalesce((select max(analysis_id) from analysis_history), 1),
  true
);

insert into app_runtime_settings (
  settings_id,
  privacy_consent,
  addiction_monitor_enabled,
  updated_at
) values (
  1,
  false,
  false,
  current_timestamp
)
on conflict (settings_id) do update set
  privacy_consent = excluded.privacy_consent,
  addiction_monitor_enabled = excluded.addiction_monitor_enabled,
  updated_at = excluded.updated_at;
