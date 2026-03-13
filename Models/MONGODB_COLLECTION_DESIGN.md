# MongoDB Collection Design

이 문서는 `Models/addiction.py`를 기준으로 MongoDB 컬렉션 구조를 정의한다.

목적은 두 가지다.

1. `addiction.py`에서 나오는 랜드마크/시계열 값을 저장한다.
2. 리포트 작성 시 과거 데이터와 비교할 수 있는 구조를 만든다.

## 1. 설계 원칙

- MongoDB는 `원본 telemetry`와 `집계 summary`를 분리한다.
- PostgreSQL에는 서비스 화면용 요약 결과를 둔다.
- MongoDB에는 고빈도 시계열과 과거 비교용 누적 데이터를 둔다.
- 사용자 이름, 자녀 이름 같은 마스터 데이터는 MongoDB에 중복 저장하지 않는다.
- MongoDB 문서에는 `user_id`, `child_id`, `analysis_id`, `session_id` 같은 참조 키만 둔다.

## 2. addiction.py 기준 저장 대상

현재 코드 기준으로 저장 가치가 높은 값은 아래다.

- 시청 시간 `watch_time`
- EAR / blink BPM / blink count
- head yaw / pitch / roll / head_is_front
- screen_distance_cm / distance_ok
- pose_status / still_duration
- emotion_label / negative_ratio
- focus_score
- risk_score / risk_level
- content_risk_adjustment / content_risk_reasons
- youtube_title / youtube_category / duration / short-form 여부
- child_messages

추가로, 앞으로 랜드마크 값 자체를 저장하려면 아래도 분리 저장하는 게 맞다.

- face landmarks
- pose landmarks

## 3. 권장 컬렉션 구조

권장 컬렉션은 5개다.

1. `monitor_sessions`
2. `monitor_telemetry`
3. `monitor_landmarks`
4. `monitor_events`
5. `monitor_daily_reports`

필요 시 6번째로 `child_baselines`를 추가한다.

## 4. monitor_sessions

역할:

- 시청 세션 1건의 시작/종료/최종 요약 저장
- 리포트 작성 시 가장 먼저 읽는 컬렉션
- PostgreSQL `analysis_history`와 연결되는 핵심 summary

문서 예시:

```json
{
  "_id": { "$oid": "67d28c1f16a4f6a0af001111" },
  "session_id": "session-20260313-001",
  "analysis_id": 9001,
  "user_id": 1,
  "child_id": 101,
  "video": {
    "input_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "video_id": "dQw4w9WgXcQ",
    "title": "Example Title",
    "category_name_en": "Education",
    "category_name_ko": "교육",
    "duration_seconds": 214,
    "is_short_form": false
  },
  "started_at": "2026-03-13T15:28:00+09:00",
  "ended_at": "2026-03-13T16:03:00+09:00",
  "status": "COMPLETED",
  "watch_seconds": 2100,
  "summary": {
    "average_focus_score": 76.3,
    "max_focus_score": 92.0,
    "min_focus_score": 41.2,
    "average_risk_score": 38.4,
    "max_risk_score": 64.1,
    "final_risk_score": 58.0,
    "final_risk_level": "WARNING",
    "negative_emotion_ratio": 0.21,
    "front_facing_ratio": 0.84,
    "safe_distance_ratio": 0.92,
    "blink_count_total": 195,
    "warning_count": 3
  },
  "content_risk": {
    "adjustment": -12.0,
    "reasons": ["교육 카테고리 감산"]
  },
  "latest_child_messages": [
    "TV를 오래 보고 있어요. 조금 쉬어볼까요?"
  ],
  "created_at": "2026-03-13T16:03:01+09:00",
  "updated_at": "2026-03-13T16:03:01+09:00"
}
```

주요 인덱스:

```javascript
db.monitor_sessions.createIndex({ session_id: 1 }, { unique: true })
db.monitor_sessions.createIndex({ child_id: 1, started_at: -1 })
db.monitor_sessions.createIndex({ user_id: 1, started_at: -1 })
db.monitor_sessions.createIndex({ analysis_id: 1 })
db.monitor_sessions.createIndex({ "summary.final_risk_level": 1, started_at: -1 })
```

## 5. monitor_telemetry

역할:

- 1초, 3초, 5초 등 짧은 주기로 저장하는 시계열 값
- 그래프, 추세 비교, 최근 1주/1달 평균 계산의 원본
- 랜드마크 전체는 넣지 않고, 수치화된 주요 신호만 저장

문서 예시:

```json
{
  "_id": { "$oid": "67d28c1f16a4f6a0af002222" },
  "session_id": "session-20260313-001",
  "analysis_id": 9001,
  "user_id": 1,
  "child_id": 101,
  "captured_at": "2026-03-13T15:30:05+09:00",
  "watch_seconds": 125,
  "blink": {
    "ear": 0.27,
    "bpm": 14,
    "count_total": 18,
    "status": "normal"
  },
  "head_pose": {
    "yaw": 4.5,
    "pitch": -2.1,
    "roll": 1.8,
    "is_front": true
  },
  "distance": {
    "screen_distance_cm": 82.4,
    "is_safe": true
  },
  "pose": {
    "status": "stable",
    "still_duration_seconds": 18.0
  },
  "emotion": {
    "label": "neutral",
    "negative_ratio": 0.12
  },
  "scores": {
    "focus_score": 88.4,
    "risk_score": 23.1,
    "risk_level": "NORMAL",
    "breakdown": {
      "time": 8.3,
      "blink": 0.0,
      "pose": 2.0,
      "emotion": 12.0,
      "head_pose": 0.0,
      "distance": 0.0,
      "content": -12.0
    }
  },
  "content_context": {
    "youtube_title": "Example Title",
    "youtube_category_en": "Education",
    "youtube_category_ko": "교육",
    "youtube_is_short_form": false,
    "content_risk_adjustment": -12.0
  },
  "created_at": "2026-03-13T15:30:05+09:00"
}
```

주요 인덱스:

```javascript
db.monitor_telemetry.createIndex({ session_id: 1, captured_at: 1 })
db.monitor_telemetry.createIndex({ child_id: 1, captured_at: -1 })
db.monitor_telemetry.createIndex({ analysis_id: 1, captured_at: 1 })
db.monitor_telemetry.createIndex({ "scores.risk_level": 1, captured_at: -1 })
```

권장 저장 주기:

- 기본: `3초` 또는 `5초`
- 매우 촘촘한 실험 단계가 아니면 `1초 저장`은 비권장

## 6. monitor_landmarks

역할:

- face landmark, pose landmark 같은 고용량 원본 저장
- 모델 디버깅, 재학습 데이터 생성, 자세 품질 검증용
- 리포트 생성의 1차 조회 대상은 아니고 필요 시만 조회

문서 예시:

```json
{
  "_id": { "$oid": "67d28c1f16a4f6a0af003333" },
  "session_id": "session-20260313-001",
  "child_id": 101,
  "captured_at": "2026-03-13T15:30:05+09:00",
  "frame_seq": 245,
  "face_landmarks": [
    { "idx": 0, "x": 0.5123, "y": 0.3121, "z": -0.0311 },
    { "idx": 1, "x": 0.5171, "y": 0.3202, "z": -0.0292 }
  ],
  "pose_landmarks": [
    { "idx": 11, "x": 0.4321, "y": 0.5212, "z": -0.1021, "visibility": 0.98 },
    { "idx": 12, "x": 0.5981, "y": 0.5233, "z": -0.0995, "visibility": 0.97 }
  ],
  "created_at": "2026-03-13T15:30:05+09:00"
}
```

주요 인덱스:

```javascript
db.monitor_landmarks.createIndex({ session_id: 1, captured_at: 1 })
db.monitor_landmarks.createIndex({ child_id: 1, captured_at: -1 })
```

운영 기준:

- 이 컬렉션은 데이터가 급격히 커진다.
- 리포트용 비교는 `monitor_telemetry`, `monitor_sessions`, `monitor_daily_reports`로 처리한다.
- `monitor_landmarks`는 실험/재학습/원인 분석용으로 제한한다.

권장 옵션:

- 초기 개발 중: TTL 없음
- 운영 전환 후: `30일` 또는 `90일` TTL 검토

예시:

```javascript
db.monitor_landmarks.createIndex(
  { created_at: 1 },
  { expireAfterSeconds: 60 * 60 * 24 * 90 }
)
```

## 7. monitor_events

역할:

- 경고, 차단 직전, 위험 급상승 같은 이벤트 기록
- 리포트에서 “언제 왜 위험해졌는지” 보여줄 때 사용

문서 예시:

```json
{
  "_id": { "$oid": "67d28c1f16a4f6a0af004444" },
  "session_id": "session-20260313-001",
  "analysis_id": 9001,
  "user_id": 1,
  "child_id": 101,
  "occurred_at": "2026-03-13T15:48:10+09:00",
  "event_type": "RISK_THRESHOLD_REACHED",
  "event_level": "WARNING",
  "message": "시청 시간이 60분을 초과했습니다.",
  "metrics": {
    "risk_score": 58.2,
    "focus_score": 63.1,
    "blink_bpm": 8,
    "still_duration_seconds": 940.0
  },
  "created_at": "2026-03-13T15:48:10+09:00"
}
```

주요 인덱스:

```javascript
db.monitor_events.createIndex({ session_id: 1, occurred_at: 1 })
db.monitor_events.createIndex({ child_id: 1, occurred_at: -1 })
db.monitor_events.createIndex({ event_type: 1, occurred_at: -1 })
```

권장 `event_type`:

- `WATCH_TIME_WARNING`
- `STILLNESS_WARNING`
- `LOW_BLINK_WARNING`
- `HIGH_BLINK_WARNING`
- `HEAD_POSE_WARNING`
- `DISTANCE_WARNING`
- `RISK_THRESHOLD_REACHED`
- `SESSION_STARTED`
- `SESSION_ENDED`

## 8. monitor_daily_reports

역할:

- 일 단위 집계 결과 저장
- “오늘 vs 어제”, “이번 주 vs 지난 주” 비교 시 사용
- 리포트 화면 응답 속도를 빠르게 만든다

문서 예시:

```json
{
  "_id": { "$oid": "67d28c1f16a4f6a0af005555" },
  "report_date": "2026-03-13",
  "user_id": 1,
  "child_id": 101,
  "period_type": "DAILY",
  "period_start": "2026-03-13T00:00:00+09:00",
  "period_end": "2026-03-13T23:59:59+09:00",
  "aggregates": {
    "session_count": 3,
    "total_watch_seconds": 5400,
    "average_focus_score": 73.2,
    "average_risk_score": 36.7,
    "max_risk_score": 68.1,
    "warning_count": 5,
    "front_facing_ratio": 0.86,
    "safe_distance_ratio": 0.91,
    "negative_emotion_ratio": 0.18
  },
  "comparison": {
    "previous_day_watch_seconds": 4800,
    "watch_seconds_diff": 600,
    "previous_day_average_risk_score": 31.2,
    "average_risk_score_diff": 5.5
  },
  "source_session_ids": [
    "session-20260313-001",
    "session-20260313-002"
  ],
  "created_at": "2026-03-14T00:05:00+09:00",
  "updated_at": "2026-03-14T00:05:00+09:00"
}
```

주요 인덱스:

```javascript
db.monitor_daily_reports.createIndex(
  { child_id: 1, period_type: 1, report_date: -1 },
  { unique: true }
)
db.monitor_daily_reports.createIndex({ user_id: 1, period_type: 1, report_date: -1 })
```

## 9. child_baselines

이 컬렉션은 선택 사항이지만, 과거 데이터와 비교하는 리포트를 자주 만들 계획이면 있으면 좋다.

역할:

- 자녀별 평상시 기준선 저장
- “원래보다 위험도가 얼마나 높아졌는지” 계산

문서 예시:

```json
{
  "_id": { "$oid": "67d28c1f16a4f6a0af006666" },
  "child_id": 101,
  "baseline_window_days": 28,
  "baseline": {
    "average_watch_seconds": 4200,
    "average_focus_score": 79.5,
    "average_risk_score": 28.4,
    "average_blink_bpm": 14.3,
    "average_safe_distance_cm": 88.1,
    "front_facing_ratio": 0.91,
    "negative_emotion_ratio": 0.11
  },
  "source_period": {
    "start": "2026-02-14T00:00:00+09:00",
    "end": "2026-03-13T23:59:59+09:00"
  },
  "updated_at": "2026-03-14T00:10:00+09:00"
}
```

주요 인덱스:

```javascript
db.child_baselines.createIndex({ child_id: 1 }, { unique: true })
```

## 10. 컬렉션 간 관계

관계는 아래처럼 잡는다.

- `monitor_sessions.session_id`
  - 세션 기준 부모 키
- `monitor_telemetry.session_id`
  - `monitor_sessions.session_id` 참조
- `monitor_landmarks.session_id`
  - `monitor_sessions.session_id` 참조
- `monitor_events.session_id`
  - `monitor_sessions.session_id` 참조
- `monitor_sessions.analysis_id`
  - PostgreSQL `analysis_history.analysis_id` 참조

즉:

- PostgreSQL `analysis_history`
  - 콘텐츠 분석 요약
- MongoDB `monitor_sessions`
  - 시청 행동 세션 요약
- MongoDB `monitor_telemetry`
  - 시간축 수치 신호
- MongoDB `monitor_landmarks`
  - 원본 landmark

## 11. 보고서 생성 추천 흐름

### 실시간 화면

- `monitor_sessions` 최신 1건
- `monitor_telemetry` 최근 5분
- `monitor_events` 최근 10건

### 일일 리포트

- 원본: `monitor_sessions`, `monitor_telemetry`, `monitor_events`
- 결과 저장: `monitor_daily_reports`

### 과거 비교

- `monitor_daily_reports`끼리 비교
- 필요 시 `child_baselines`와 비교

## 12. 저장 주기 추천

### monitor_sessions

- 세션 시작 시 1건 생성
- 세션 종료 시 summary 업데이트

### monitor_telemetry

- 3초 또는 5초마다 insert

### monitor_landmarks

- 5초마다 또는 위험 구간에서만 저장

### monitor_events

- 이벤트 발생 시마다 insert

### monitor_daily_reports

- 하루 종료 시 upsert

## 13. 최종 추천안

처음 구현은 아래까지만 해도 충분하다.

1. `monitor_sessions`
2. `monitor_telemetry`
3. `monitor_events`

그 다음 필요해질 때 추가:

4. `monitor_landmarks`
5. `monitor_daily_reports`
6. `child_baselines`

이유는 명확하다.

- 처음부터 랜드마크를 전량 저장하면 데이터가 너무 커진다.
- 리포트는 대부분 `session + telemetry + events`만으로도 충분하다.
- 랜드마크는 디버깅/연구 목적일 때만 켜는 편이 운영상 안전하다.
