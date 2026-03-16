# Manual Test Flow

기준 점검일: 2026-03-16

## 1. 기본 상태 확인

먼저 아래 주소가 모두 열리는지 확인한다.

- `http://localhost/`
- `http://localhost/api/settings/runtime`
- `http://localhost/fastapi/system/health`
- `http://localhost:4174/`
- `http://localhost:4175/api/health`

기대 결과:

- 메인 웹 런처가 열린다.
- Spring API가 `200`으로 응답한다.
- FastAPI health가 `backend: UP`, `database: UP`으로 응답한다.
- 모바일 프로토타입 화면이 열린다.
- `UI/ThinQ` 전용 API가 `{"status":"ok"}` 를 반환한다.

## 2. 현재 DB 연동 확인 결과

2026-03-16 기준 실제 확인한 결과는 아래와 같다.

PostgreSQL:

- `users`: 3건
- `children`: 4건
- `viewing_history`: 5건
- `alert_log`: 5건
- `child_watch_policy`: 4건
- `app_runtime_settings`: 1건

MongoDB:

- 컬렉션: `monitor_events`, `monitor_sessions`
- `monitor_sessions`: 2건
- `monitor_events`: 2건

현재 의미:

- 모바일 프로토타입은 PostgreSQL에서 가족, 자녀, 시청 이력, 경고 로그, 보호 설정을 읽어 정상 동작한다.
- MongoDB 연결도 정상이다.
- 다만 현재 MongoDB에는 `monitor_telemetry`, `monitor_landmarks` 컬렉션이 없어서 자세, 눈 깜박임, 거리 같은 수치형 집계는 빈 상태 안내로 표시된다.
- 대신 `monitor_sessions`와 `monitor_events`가 존재하므로, 모니터링 세션 자체가 발생했는지는 확인 가능하다.

## 3. 모바일 프로토타입 데이터 로딩 플로우

대상 화면:

- `http://localhost:4174/`

플로우:

1. 모바일 화면이 열리면 `UI/ThinQ` 프론트가 `/api/mobile-dashboard?familyId=1` 을 호출한다.
2. `UI/ThinQ/server.cjs` 가 PostgreSQL에 접속한다.
3. `users` 에서 가족 목록을 읽는다.
4. `children`, `child_watch_policy` 에서 선택 가족의 자녀와 보호 설정을 읽는다.
5. `viewing_history`, `alert_log` 에서 최근 시청 시간, 또래 비교용 데이터, 경고 내역을 계산한다.
6. `app_runtime_settings` 에서 개인정보 동의와 중독 모니터 활성화 여부를 읽는다.
7. MongoDB에서 `monitor_sessions`, `monitor_telemetry`, `monitor_landmarks` 를 확인한다.
8. `monitor_telemetry` 가 있으면 눈 깜박임, 거리, 자세, 정면 응시, 평소 대비 변화값을 계산한다.
9. `monitor_telemetry` 가 없으면 Mongo 비어 있음 안내 문구를 내려준다.
10. 프론트는 받은 데이터를 홈, 시청, 콘텐츠, 자세, 설정 탭에 맞게 렌더링한다.

기대 결과:

- 홈 탭에 자녀 이름, 주간 시청 시간, 또래 평균 비교, 최근 경고가 표시된다.
- 시청 탭에 7일 시청 차트가 표시된다.
- 콘텐츠 탭에 `video_id` 기반 카테고리 분류와 많이 본 영상이 표시된다.
- 자세 탭은 현재 Mongo telemetry 부재 안내를 보여준다.
- 설정 탭에는 PostgreSQL 기준 보호 정책과 런타임 설정이 표시된다.

## 4. 모바일 프로토타입 수동 테스트

1. `http://localhost:4174/` 에 접속한다.
2. 상단 가족 선택에서 `Kim Family`, `Lee Family`, `Park Family` 를 각각 바꿔본다.
3. 자녀 선택을 바꿔본다.
4. `홈`, `시청`, `콘텐츠`, `자세`, `설정` 탭을 순서대로 눌러본다.

기대 결과:

- 가족 변경 시 자녀 목록이 해당 가족 기준으로 바뀐다.
- 자녀 변경 시 주간 시청 시간, 경고 로그, 차트 데이터가 해당 자녀 기준으로 다시 계산된다.
- `Mina` 선택 시 현재 기준으로 최근 경고 1건과 `youtube-minecraft` 시청 기록이 보인다.
- 자세 탭은 오류 없이 열리고, Mongo telemetry가 아직 없다는 안내를 보여준다.

## 5. Kids 프로필 진입 플로우

1. 홈 런처를 연다.
2. `아이들나라` 로 진입한다.
3. 콘텐츠를 보여주기 전에 자녀 선택 화면이 먼저 뜨는지 확인한다.
4. 자녀를 하나 선택한다.
5. 해당 자녀에 맞는 페이지가 열리는지 확인한다.
6. 프로필 변경 버튼을 눌러 다시 선택 화면으로 돌아간다.

기대 결과:

- 첫 진입 시 무조건 자녀 선택 화면이 먼저 열린다.
- 자녀 선택 후 해당 자녀 전용 화면이 열린다.
- 프로필 변경 버튼으로 다시 선택할 수 있다.

## 6. 전역 자녀 선택 동기화 플로우

1. `설정` 화면으로 이동한다.
2. 가족과 자녀를 변경한다.
3. 다시 `아이들나라` 로 이동한다.
4. 홈으로 돌아와 `유튜브` 또는 `TV앱 > YouTube` 로 이동한다.

기대 결과:

- 설정에서 고른 가족/자녀가 앱 전체의 현재 기준으로 사용된다.
- `아이들나라` 에서 같은 자녀 기준 화면이 열린다.
- 유튜브 분석 화면에서도 같은 자녀가 기본 선택되어 있다.

## 7. 유튜브 보호 분석 플로우

1. 홈 런처에서 `유튜브` 를 누른다.
2. 외부 유튜브로 바로 가지 않고 분석 화면으로 먼저 진입하는지 확인한다.
3. YouTube URL을 입력한다.
4. 분석을 실행한다.
5. 허용 결과가 나오면 재생 URL을 연다.

기대 결과:

- 보호 분석 화면이 먼저 열린다.
- 현재 선택된 자녀가 기본값으로 채워져 있다.
- 분석 결과에 따라 재생 허용 또는 차단이 표시된다.

## 8. addiction.py 실행 조건 플로우

1. `설정` 에서 개인정보 동의를 켠다.
2. 중독 모니터 실행을 켠다.
3. 선택된 자녀의 보호 설정이 활성화되어 있는지 확인한다.
4. 유튜브 분석 흐름으로 이동한다.
5. 재생 허용 가능한 영상을 분석한다.

기대 결과:

- 분석 결과가 반환된다.
- 조건이 모두 맞을 때만 `addiction.py` 실행 시도가 발생한다.
- 현재 Mongo `monitor_sessions` 에는 실제 실행 시도 흔적이 남을 수 있다.

현재 확인된 참고 사항:

- Mongo `monitor_sessions` / `monitor_events` 에는 2026-03-13 기준 실행 실패 이력이 남아 있다.
- 실패 원인 메시지는 MediaPipe 초기화 실패였다.
- 따라서 중독 모니터 플로우 자체는 연결되어 있지만, landmark 수집을 실제로 쓰려면 MediaPipe 환경과 `monitor_telemetry` 저장까지 이어져야 한다.

## 9. 선택값 유지 플로우

1. `설정` 에서 가족과 자녀를 선택한다.
2. 브라우저를 새로고침한다.
3. 같은 가족/자녀가 유지되는지 확인한다.

기대 결과:

- 같은 브라우저에서는 마지막으로 보던 가족/자녀가 유지된다.
- `family_selection_preference` 테이블이 있는 환경이면 서버 저장값도 함께 사용할 수 있다.
- 현재 로컬 DB에는 이 테이블이 없으므로, 모바일 프로토타입은 현재 조회 기준으로 fallback 동작한다.

## 10. 운영 반영 전 체크 포인트

- PostgreSQL 데이터만으로도 모바일 프로토타입은 정상 동작한다.
- MongoDB landmark/telemetry 기반 분석을 실제로 보여주려면 아래 컬렉션이 추가되어야 한다.
  - `monitor_telemetry`
  - `monitor_landmarks`
- 권장 저장 항목 예시:
  - `captured_at`
  - `child_id`
  - `blink.bpm`
  - `distance.screen_distance_cm`
  - `distance.is_safe`
  - `head_pose.is_front`
  - `pose.still_duration_seconds`
  - `pose.status`
  - `scores.focus_score`
  - `scores.risk_score`
  - `child_messages`

이 값들이 5분 단위로 누적되면 모바일 프로토타입의 자세 탭에서 평소 대비 변화, 눈 깜박임 추세, 거리 변화, 정면 응시 비율을 바로 보여줄 수 있다.
