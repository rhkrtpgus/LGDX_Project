insert into users (user_id, user_name, birth_year) values
  (1, 'Kim Family', 1987),
  (2, 'Lee Family', 1990),
  (3, 'Park Family', 1985),
  (4, 'Choi Family', 1992),
  (5, 'Jung Family', 1991),
  (6, 'Han Family', 1988)
on conflict (user_id) do update set
  user_name = excluded.user_name,
  birth_year = excluded.birth_year;

insert into children (child_id, user_id, child_name, birth_year) values
  (1, 1, 'Mina', 2014),
  (2, 1, 'Joon', 2017),
  (3, 2, 'Sia', 2013),
  (4, 3, 'Doyun', 2016),
  (5, 1, 'Hayeon', 2020),
  (6, 2, 'Yul', 2018),
  (7, 3, 'Seojin', 2011),
  (8, 4, 'Minjae', 2015),
  (9, 5, 'Ara', 2019),
  (10, 6, 'Ian', 2012),
  (11, 6, 'Noah', 2012)
on conflict (child_id) do update set
  user_id = excluded.user_id,
  child_name = excluded.child_name,
  birth_year = excluded.birth_year;

insert into family_selection_preference (
  family_id,
  selected_child_id,
  updated_at
) values
  (1, 5, current_timestamp),
  (2, 3, current_timestamp),
  (3, 7, current_timestamp),
  (4, 8, current_timestamp),
  (5, 9, current_timestamp),
  (6, 10, current_timestamp)
on conflict (family_id) do update set
  selected_child_id = excluded.selected_child_id,
  updated_at = excluded.updated_at;

insert into viewing_history (
  viewing_id,
  user_id,
  child_id,
  video_id,
  watch_time,
  watch_duration
) values
  (1, 1, 1, 'science-experiment-lab', timestamp '2026-03-16 15:05:00', 1800),
  (2, 1, 2, 'cartoon-speed-run', timestamp '2026-03-16 16:10:00', 2100),
  (3, 2, 3, 'soccer-skills-clinic', timestamp '2026-03-16 17:20:00', 2700),
  (4, 3, 4, 'dance-practice-junior', timestamp '2026-03-16 18:05:00', 1200),
  (5, 1, 5, 'alphabet-animals-song', timestamp '2026-03-16 10:15:00', 900),
  (6, 2, 6, 'lego-building-time', timestamp '2026-03-16 11:30:00', 1500),
  (7, 3, 7, 'mystery-story-recap', timestamp '2026-03-16 21:15:00', 2400),
  (8, 4, 8, 'shortform-gaming-loop', timestamp '2026-03-16 19:25:00', 3200),
  (9, 5, 9, 'nursery-rhyme-playtime', timestamp '2026-03-16 09:45:00', 800),
  (10, 6, 10, 'basketball-analysis-kids', timestamp '2026-03-16 20:10:00', 2200),
  (11, 6, 11, 'history-animation-heroes', timestamp '2026-03-16 20:40:00', 1900),
  (12, 1, 1, 'coding-for-kids-blocks', timestamp '2026-03-15 19:00:00', 1600),
  (13, 1, 2, 'funny-prank-compilation', timestamp '2026-03-15 20:05:00', 2600),
  (14, 2, 3, 'piano-practice-session', timestamp '2026-03-15 18:00:00', 1400),
  (15, 4, 8, 'arcade-highlight-marathon', timestamp '2026-03-15 22:10:00', 3600),
  (16, 5, 9, 'bedtime-story-rainbow', timestamp '2026-03-15 19:35:00', 1100),
  (17, 6, 10, 'space-documentary-youth', timestamp '2026-03-14 17:50:00', 2500),
  (18, 6, 11, 'drawing-class-creatures', timestamp '2026-03-14 18:20:00', 1700)
on conflict (viewing_id) do update set
  user_id = excluded.user_id,
  child_id = excluded.child_id,
  video_id = excluded.video_id,
  watch_time = excluded.watch_time,
  watch_duration = excluded.watch_duration;

insert into alert_log (alert_id, viewing_id, alert_type, risk_level, message_text) values
  (1, 1, 'guardian-notice', 'low', 'A learning-focused summary was sent to the guardian.'),
  (2, 2, 'screen-time-warning', 'medium', 'Joon is close to today''s viewing limit.'),
  (3, 3, 'focus-drop', 'low', 'Focus was lower than usual during a long sports clip.'),
  (4, 4, 'posture-warning', 'medium', 'Extended fixed-posture viewing was detected.'),
  (5, 5, 'safe-content', 'low', 'Age-appropriate content was watched within the daily limit.'),
  (6, 7, 'bedtime-warning', 'high', 'Viewing continued into the late evening window.'),
  (7, 8, 'addiction-risk', 'high', 'Repeated short-form viewing pattern was detected.'),
  (8, 10, 'screen-time-warning', 'medium', 'Ian reached 85 percent of the weekday limit.'),
  (9, 11, 'guardian-notice', 'low', 'A weekly learning summary was shared with the guardian.'),
  (10, 13, 'content-warning', 'high', 'Fast-paced prank content requires guardian review.'),
  (11, 15, 'late-night-binge', 'high', 'Late-night marathon viewing exceeded the preferred schedule.'),
  (12, 16, 'bedtime-routine', 'low', 'Ara finished a bedtime story within the allowed schedule.')
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
  bedtime_lock_enabled,
  bedtime_hour,
  monday_limit_minutes,
  tuesday_limit_minutes,
  wednesday_limit_minutes,
  thursday_limit_minutes,
  friday_limit_minutes,
  saturday_limit_minutes,
  sunday_limit_minutes,
  notification_threshold,
  auto_block_enabled,
  updated_at
) values
  (1, 100, 7, 21, 8, 22, true, 21, 100, 100, 100, 100, 100, 120, 120, 75, true, current_timestamp),
  (2, 70, 8, 20, 8, 21, true, 21, 70, 70, 70, 70, 70, 90, 90, 70, true, current_timestamp),
  (3, 120, 7, 21, 8, 22, false, 22, 120, 120, 120, 120, 120, 140, 140, 80, true, current_timestamp),
  (4, 90, 8, 20, 8, 21, true, 20, 90, 90, 90, 90, 90, 110, 110, 72, true, current_timestamp),
  (5, 45, 8, 19, 9, 20, true, 20, 40, 45, 45, 45, 45, 60, 60, 60, true, current_timestamp),
  (6, 80, 8, 20, 8, 21, false, 21, 80, 80, 80, 80, 80, 100, 100, 68, true, current_timestamp),
  (7, 110, 7, 22, 8, 23, true, 22, 110, 110, 110, 110, 110, 130, 130, 85, false, current_timestamp),
  (8, 60, 9, 19, 9, 20, true, 19, 60, 60, 60, 60, 60, 80, 80, 65, true, current_timestamp),
  (9, 40, 8, 18, 9, 19, true, 19, 40, 40, 40, 40, 40, 50, 50, 55, true, current_timestamp),
  (10, 95, 7, 21, 8, 22, false, 21, 95, 95, 95, 95, 95, 115, 115, 78, true, current_timestamp),
  (11, 95, 7, 21, 8, 22, true, 22, 95, 95, 95, 95, 95, 115, 115, 78, true, current_timestamp)
on conflict (child_id) do update set
  daily_limit_minutes = excluded.daily_limit_minutes,
  weekday_start_hour = excluded.weekday_start_hour,
  weekday_end_hour = excluded.weekday_end_hour,
  weekend_start_hour = excluded.weekend_start_hour,
  weekend_end_hour = excluded.weekend_end_hour,
  bedtime_lock_enabled = excluded.bedtime_lock_enabled,
  bedtime_hour = excluded.bedtime_hour,
  monday_limit_minutes = excluded.monday_limit_minutes,
  tuesday_limit_minutes = excluded.tuesday_limit_minutes,
  wednesday_limit_minutes = excluded.wednesday_limit_minutes,
  thursday_limit_minutes = excluded.thursday_limit_minutes,
  friday_limit_minutes = excluded.friday_limit_minutes,
  saturday_limit_minutes = excluded.saturday_limit_minutes,
  sunday_limit_minutes = excluded.sunday_limit_minutes,
  notification_threshold = excluded.notification_threshold,
  auto_block_enabled = excluded.auto_block_enabled,
  updated_at = excluded.updated_at;

insert into child_youtube_category_filter (
  child_id,
  category_id,
  enabled,
  updated_at
)
select
  c.child_id,
  settings.category_id,
  settings.enabled,
  current_timestamp
from children c
cross join (
  values
    ('film_animation', true),
    ('autos_vehicles', true),
    ('music', true),
    ('pets_animals', true),
    ('sports', true),
    ('travel_events', true),
    ('gaming', false),
    ('people_blogs', true),
    ('comedy', true),
    ('entertainment', false),
    ('news_politics', false),
    ('howto_style', true),
    ('education', true),
    ('science_technology', true),
    ('nonprofits_activism', true)
) as settings(category_id, enabled)
on conflict (child_id, category_id) do update set
  enabled = excluded.enabled,
  updated_at = excluded.updated_at;

insert into report_daily (report_id, family_id, compare_time, count_alert_type) values
  (1, 1, 1, 3),
  (2, 2, 1, 1),
  (3, 3, 1, 2),
  (4, 4, 1, 2),
  (5, 5, 1, 1),
  (6, 6, 1, 1)
on conflict (report_id) do update set
  family_id = excluded.family_id,
  compare_time = excluded.compare_time,
  count_alert_type = excluded.count_alert_type;

insert into report_week (report_id, family_id, compare_time, count_alert_type) values
  (1, 1, 7, 6),
  (2, 2, 7, 3),
  (3, 3, 7, 4),
  (4, 4, 7, 5),
  (5, 5, 7, 2),
  (6, 6, 7, 3)
on conflict (report_id) do update set
  family_id = excluded.family_id,
  compare_time = excluded.compare_time,
  count_alert_type = excluded.count_alert_type;

insert into report_month (report_id, family_id, compare_time, count_alert_type) values
  (1, 1, 30, 14),
  (2, 2, 30, 8),
  (3, 3, 30, 11),
  (4, 4, 30, 16),
  (5, 5, 30, 5),
  (6, 6, 30, 9)
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
    'Creative Science for Kids',
    '교육',
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
    timestamp '2026-03-16 16:10:00'
  ),
  (
    2,
    'https://youtu.be/sample-risk-video',
    'sample-risk-video',
    'Hyper Prank Shorts Compilation',
    '엔터테인먼트',
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
    timestamp '2026-03-16 16:18:00'
  ),
  (
    3,
    'https://youtu.be/sample-music-video',
    'sample-music-video',
    'Piano Basics for Children',
    '음악',
    580,
    false,
    false,
    false,
    0.08,
    0,
    false,
    0,
    false,
    '[]',
    'completed',
    null,
    timestamp '2026-03-16 16:24:00'
  ),
  (
    4,
    'https://youtu.be/sample-gaming-loop',
    'sample-gaming-loop',
    'Arcade Highlights Loop',
    '게임',
    220,
    true,
    false,
    false,
    0.22,
    1,
    false,
    0,
    false,
    '[\"short-form\"]',
    'completed',
    null,
    timestamp '2026-03-16 16:31:00'
  ),
  (
    5,
    'https://youtu.be/sample-bedtime-story',
    'sample-bedtime-story',
    'Rainbow Bedtime Story',
    '동화',
    720,
    false,
    false,
    false,
    0.02,
    0,
    false,
    0,
    false,
    '[]',
    'completed',
    null,
    timestamp '2026-03-16 16:38:00'
  ),
  (
    6,
    'https://youtu.be/sample-unavailable',
    'sample-unavailable',
    'Video Metadata Pending',
    '기타',
    0,
    false,
    false,
    false,
    null,
    null,
    false,
    null,
    false,
    '[]',
    'error',
    'Metadata could not be fetched from the remote provider.',
    timestamp '2026-03-16 16:45:00'
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
  true,
  true,
  current_timestamp
)
on conflict (settings_id) do update set
  privacy_consent = excluded.privacy_consent,
  addiction_monitor_enabled = excluded.addiction_monitor_enabled,
  updated_at = excluded.updated_at;
