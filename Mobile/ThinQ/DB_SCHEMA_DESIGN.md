# Mobile UI DB Design

기준일: 2026-03-16

## 1. 목적

`UI/ThinQ`의 원본 모바일 UI는 단순 요약 대시보드가 아니라 아래 화면을 포함합니다.

- 홈
- 시청시간
- 콘텐츠
- 자세관리
- 설정

이번 설계 문서는 "원래 있던 조회 UI를 유지하면서 어떤 데이터는 기존 DB에서 바로 읽고, 어떤 데이터는 추가 스키마가 필요한지"를 정리합니다.

## 2. 기존 DB로 바로 연결되는 영역

### PostgreSQL

- `users`
  - 가족 목록
  - 보호자/가족 단위 기준

- `children`
  - 자녀 목록
  - 자녀 이름, 출생년도

- `child_watch_policy`
  - 일일 시청 제한 시간
  - 평일/주말 허용 시간
  - 알림 기준 시간
  - 자동 차단 여부

- `viewing_history`
  - 주간 시청 시간
  - 일별 시청 차트
  - 많이 본 영상
  - 콘텐츠 유형 분류의 원본 데이터

- `alert_log`
  - 최근 경고
  - 위험 콘텐츠 이력

- `app_runtime_settings`
  - 개인정보 동의
  - 중독 모니터 활성화 여부

### MongoDB

- `monitor_sessions`
  - 스마트캠 세션 발생 여부
  - 최근 세션 상태

- `monitor_events`
  - 최근 오류/이벤트 메시지
  - MediaPipe 실패 같은 운영 상태

## 3. 현재 UI에서 추가 설계가 필요한 영역

원본 UI에 있던 아래 기능은 현재 DB에 전용 스키마가 없습니다.

- 취침 시간 알림 on/off
- 자녀별 허용 콘텐츠 유형 토글
- 스마트캠 기기 바인딩 상태
- 자세/거리/눈 깜박임의 정량 telemetry 저장

## 4. 추가 PostgreSQL 테이블 제안

### 4.1 `child_content_preference`

자녀별 허용 콘텐츠 유형 관리용

```sql
create table child_content_preference (
  child_id int not null,
  category_key varchar(50) not null,
  is_allowed boolean not null default true,
  source varchar(30) not null default 'parent',
  updated_at timestamp not null default current_timestamp,
  primary key (child_id, category_key)
);
```

예상 category:

- `Animation`
- `Education`
- `Gaming`
- `Music`
- `Sports`
- `General`

### 4.2 `child_notification_preference`

취침 알림, 초과 알림, 눈 운동 알림 관리용

```sql
create table child_notification_preference (
  child_id int primary key,
  overuse_alert_enabled boolean not null default true,
  bedtime_alert_enabled boolean not null default true,
  eye_exercise_alert_enabled boolean not null default false,
  eye_exercise_interval_minutes int not null default 30,
  updated_at timestamp not null default current_timestamp
);
```

### 4.3 `smartcam_device_binding`

LG 스마트캠 연결 상태 저장용

```sql
create table smartcam_device_binding (
  child_id int primary key,
  device_id varchar(100),
  device_name varchar(100),
  device_ip varchar(100),
  binding_status varchar(30) not null default 'unbound',
  last_connected_at timestamp,
  updated_at timestamp not null default current_timestamp
);
```

## 5. 추가 Mongo 컬렉션 제안

### 5.1 `monitor_telemetry`

5분 단위 행동 분석 집계용

```json
{
  "child_id": 1,
  "captured_at": "2026-03-16T12:00:00Z",
  "blink": { "bpm": 12 },
  "distance": {
    "screen_distance_cm": 182,
    "is_safe": false
  },
  "head_pose": {
    "is_front": true
  },
  "pose": {
    "status": "lean_forward",
    "still_duration_seconds": 41
  },
  "emotion": {
    "negative_ratio": 0.18
  },
  "scores": {
    "focus_score": 63,
    "risk_score": 48
  },
  "child_messages": [
    "평소보다 화면을 더 가까이 보고 있어요."
  ]
}
```

### 5.2 `monitor_landmarks`

원본 좌표 저장용

```json
{
  "child_id": 1,
  "captured_at": "2026-03-16T12:00:00Z",
  "face_landmarks": [{ "x": 0.45, "y": 0.33, "z": -0.01 }],
  "pose_landmarks": [{ "x": 0.51, "y": 0.62, "z": 0.02 }],
  "left_eye_ratio": 0.19,
  "right_eye_ratio": 0.21,
  "distance_estimate_cm": 182
}
```

## 6. 화면별 데이터 연결 기준

### 홈

- 프로필 카드: `children`
- 이번 주 총 시청: `viewing_history`
- 또래 대비 배지: 같은 가족 내 다른 자녀 기준 집계

### 시청시간

- 주간/일간 차트: `viewing_history`
- 권장 초과 여부: `child_watch_policy.daily_limit_minutes`
- 빠른 액션: 현재는 UI용, 실제 저장은 `child_watch_policy` 또는 `child_notification_preference`

### 콘텐츠

- 도넛 차트: `viewing_history.video_id` 기반 분류
- 허용 콘텐츠 정책: `child_content_preference` 필요

### 자세관리

- 세션 상태: `monitor_sessions`
- 오류/이벤트: `monitor_events`
- 자세/거리/깜박임 수치: `monitor_telemetry`
- 랜드마크 원본: `monitor_landmarks`

### 설정

- 일일 제한: `child_watch_policy`
- 런타임 동의: `app_runtime_settings`
- 취침 알림/눈 운동 알림: `child_notification_preference`
- 카테고리 허용 토글: `child_content_preference`
- 스마트캠 연결 상태: `smartcam_device_binding`

## 7. 현재 UI/ThinQ 반영 상태

현재 `UI/ThinQ`는 아래 원칙으로 동작합니다.

- 있는 데이터는 실제 DB에서 읽어 보여준다.
- 아직 스키마가 없는 항목은 화면에서 "추가 설계 필요" 배지로 표시한다.
- Mongo에 `monitor_sessions`, `monitor_events`만 있어도 스마트캠 연결/운영 상태는 보여준다.
- `monitor_telemetry`, `monitor_landmarks`가 생기면 자세 수치 섹션이 자동으로 채워지도록 API를 준비한다.
