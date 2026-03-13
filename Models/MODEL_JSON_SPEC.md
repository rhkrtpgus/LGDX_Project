# Model JSON Spec

이 문서는 현재 `Models/API.py`, `Models/addiction.py`, `Front/src/lib/api.ts`를 기준으로 정리한 모델 입출력 JSON 스펙이다.

목표는 두 가지다.

1. 현재 Python 모델의 실제 입력/출력 구조를 고정한다.
2. 이후 `FastAPI -> PostgreSQL/MongoDB -> React` 연동 시 사용할 API 계약 초안을 만든다.

## 1. 범위

현재 모델은 크게 두 축이다.

- `API.py`
  - YouTube URL 기반 유해 영상 분석
  - 메타데이터 조회, 카테고리 필터, 폭력성/노출 분석 수행
- `addiction.py`
  - 카메라 기반 시청 행동 모니터링
  - 시선/자세/거리/깜빡임/감정/위험도 계산
  - 로그 JSON, CSV 데이터 생성

## 2. 공통 규칙

- 인코딩: `UTF-8`
- 날짜/시간: ISO-8601 문자열, 예: `"2026-03-13T15:22:31+09:00"`
- boolean: `true | false`
- score 범위
  - 유해성, 집중도, 위험도: `0.0 ~ 100.0`
  - 모델 confidence: `0.0 ~ 1.0`
- 필드명: `camelCase`를 API 표준으로 사용
- Python 내부 dataclass/log key는 `snake_case`여도 허용하되, FastAPI 응답에서 `camelCase`로 변환한다

## 3. Model 1: 콘텐츠 유해성 분석

대상 파일: `Models/API.py`

### 3.1 입력 스펙

현재 모델의 실제 입력은 YouTube URL 하나다.

```json
{
  "videoUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
}
```

### 3.2 FastAPI 요청 스펙

프런트의 현재 호출 형태는 `Front/src/lib/api.ts`의 `analyzeYoutubeVideo(videoUrl, childId?)`를 따른다.

권장 요청 JSON:

```json
{
  "videoUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "childId": 101,
  "requestSource": "front",
  "saveResult": true
}
```

필드 정의:

| 필드 | 타입 | 필수 | 설명 |
|---|---|---:|---|
| `videoUrl` | string | Y | 분석 대상 YouTube URL |
| `childId` | integer \| null | N | 보호 정책/시청 정책 반영용 자녀 ID |
| `requestSource` | string | N | 요청 발생 주체. 기본값 `front` |
| `saveResult` | boolean | N | PostgreSQL 저장 여부. 기본값 `true` |

### 3.3 현재 Python raw 출력 스펙

`API.py`는 최종적으로 `AnalysisResult` dataclass를 JSON으로 출력한다.

중요:

- YouTube 제목은 이미 `API.py`에서 가져오고 있다.
- 실제 수집 위치는 YouTube Data API의 `snippet.title`이다.
- 현재 Python 결과 JSON에도 `title` 필드가 포함된다.

raw JSON shape:

```json
{
  "input_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "video_id": "dQw4w9WgXcQ",
  "title": "Example Title",
  "category_id": "24",
  "category_name_en": "Entertainment",
  "category_name_ko": "엔터테인먼트",
  "duration_seconds": 214,
  "is_short_form": false,
  "category_filter": {
    "category_name_en": "Entertainment",
    "category_name_ko": "엔터테인먼트",
    "is_blocked": true,
    "reason": "Blocked by category pre-filter: 엔터테인먼트 (Entertainment)"
  },
  "source_fps": 29.97,
  "sampled_fps": 24.0,
  "sampled_frames": 480,
  "has_violence": false,
  "violence_score": 0.12,
  "violence_positive_windows": 0,
  "has_nudity": false,
  "nudity_match_count": 0,
  "violence_window_scores": [0.02, 0.04, 0.12],
  "harmful_reasons": [
    "Blocked by category pre-filter: 엔터테인먼트 (Entertainment)"
  ],
  "stream_url": "https://...",
  "nudity_matches": []
}
```

### 3.4 FastAPI 응답 스펙

프런트와 직접 맞물리는 응답은 아래를 기준으로 한다.

이 스펙은 현재 `Front/src/lib/api.ts`의 `AnalysisResult` 타입과 호환되도록 설계한다.

```json
{
  "analysisId": 9001,
  "inputUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "videoId": "dQw4w9WgXcQ",
  "title": "Example Title",
  "categoryNameKo": "엔터테인먼트",
  "durationSeconds": 214,
  "shortForm": false,
  "blockedByCategory": true,
  "hasViolence": false,
  "violenceScore": 0.12,
  "violencePositiveWindows": 0,
  "hasNudity": false,
  "nudityMatchCount": 0,
  "harmful": true,
  "harmfulReasons": [
    "Blocked by category pre-filter: 엔터테인먼트 (Entertainment)"
  ],
  "playback": {
    "allowed": false,
    "message": "카테고리 정책에 의해 재생이 제한되었습니다.",
    "addictionRiskScore": 0,
    "addictionRiskLevel": "NORMAL",
    "behaviorSignals": []
  },
  "addictionMonitor": null,
  "status": "COMPLETED",
  "errorMessage": null,
  "createdAt": "2026-03-13T15:22:31+09:00"
}
```

필드 정의:

| 필드 | 타입 | 필수 | 설명 |
|---|---|---:|---|
| `analysisId` | integer \| null | Y | PostgreSQL 저장 PK |
| `inputUrl` | string | Y | 입력 YouTube URL |
| `videoId` | string \| null | Y | 추출된 YouTube video id |
| `title` | string \| null | Y | 영상 제목 |
| `categoryNameKo` | string \| null | Y | 카테고리 한글명 |
| `durationSeconds` | integer \| null | Y | 길이(초) |
| `shortForm` | boolean | Y | 180초 이하 short-form 여부 |
| `blockedByCategory` | boolean | Y | 카테고리 사전 차단 여부 |
| `hasViolence` | boolean | Y | 폭력성 탐지 여부 |
| `violenceScore` | number \| null | Y | 폭력성 대표 점수 |
| `violencePositiveWindows` | integer \| null | Y | 임계치 초과 window 수 |
| `hasNudity` | boolean | Y | 노출 탐지 여부 |
| `nudityMatchCount` | integer \| null | Y | 노출 매칭 프레임 수 |
| `harmful` | boolean | Y | 최종 유해 여부 |
| `harmfulReasons` | string[] | Y | 유해 판정 이유 |
| `playback` | object | Y | 재생 허용/차단 결정 |
| `addictionMonitor` | object \| null | Y | 행동 모니터링 실행 결과 |
| `status` | string | Y | `COMPLETED`, `FAILED`, `BLOCKED` |
| `errorMessage` | string \| null | Y | 실패 메시지 |
| `createdAt` | string \| null | Y | 저장 시각 |

### 3.5 내부 세부 분석 JSON

폭력/노출의 세부 raw 데이터는 상세 조회 API에서 별도 제공하는 것을 권장한다.

```json
{
  "analysisId": 9001,
  "categoryFilter": {
    "categoryNameEn": "Entertainment",
    "categoryNameKo": "엔터테인먼트",
    "isBlocked": true,
    "reason": "Blocked by category pre-filter: 엔터테인먼트 (Entertainment)"
  },
  "sampling": {
    "sourceFps": 29.97,
    "sampledFps": 24.0,
    "sampledFrames": 480
  },
  "violence": {
    "windowSize": 64,
    "windowStride": 32,
    "minWindowScore": 0.95,
    "positiveWindows": 0,
    "windowScores": [0.02, 0.04, 0.12]
  },
  "nudity": {
    "minScore": 0.75,
    "minMatchCount": 2,
    "maxFrameGap": 12,
    "matches": []
  }
}
```

### 3.6 DB 저장 payload 스펙

`API.py`에는 이제 DB 적재용 payload를 바로 만들 수 있는 보조 함수가 있다.

- 함수명: `build_analysis_history_payload(result, status="COMPLETED", error_message=None)`

권장 저장 payload:

```json
{
  "input_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "video_id": "dQw4w9WgXcQ",
  "title": "Example Title",
  "category_name_ko": "엔터테인먼트",
  "duration_seconds": 214,
  "is_short_form": false,
  "blocked_by_category": true,
  "has_violence": false,
  "violence_score": 0.12,
  "violence_positive_windows": 0,
  "has_nudity": false,
  "nudity_match_count": 0,
  "harmful": true,
  "harmful_reasons_json": "[\"Blocked by category pre-filter: 엔터테인먼트 (Entertainment)\"]",
  "status": "COMPLETED",
  "error_message": null
}
```

이 payload는 현재 백엔드의 `analysis_history` 테이블과 바로 연결할 수 있다.

현재 확인된 컬럼:

| 컬럼 | 설명 |
|---|---|
| `input_url` | 입력 URL |
| `video_id` | 유튜브 video id |
| `title` | 유튜브 제목 |
| `category_name_ko` | 카테고리 한글명 |
| `duration_seconds` | 영상 길이(초) |
| `is_short_form` | 숏폼 여부 |
| `blocked_by_category` | 카테고리 차단 여부 |
| `has_violence` | 폭력성 여부 |
| `violence_score` | 폭력성 점수 |
| `violence_positive_windows` | 양성 window 수 |
| `has_nudity` | 노출 여부 |
| `nudity_match_count` | 노출 프레임 수 |
| `harmful` | 최종 유해 여부 |
| `harmful_reasons_json` | 유해 이유 배열 JSON 문자열 |
| `status` | 처리 상태 |
| `error_message` | 실패 메시지 |

FastAPI 저장 흐름 예시는 아래처럼 잡으면 된다.

1. `run_pipeline(video_url)` 실행
2. `build_analysis_history_payload(result)` 생성
3. PostgreSQL `analysis_history` insert
4. 저장된 `analysis_id`를 응답 JSON의 `analysisId`로 반환

## 4. Model 2: 중독/시청 행동 모니터링

대상 파일: `Models/addiction.py`

현재 이 스크립트는 HTTP JSON 응답을 직접 반환하지 않는다. 대신 다음 값을 메모리에서 계산하고, JSON/CSV 로그 파일로 저장한다.

- 시청 시간
- EAR / blink BPM
- head yaw / pitch / roll
- 정면 응시 여부
- 화면 거리
- 감정, 부정 감정 비율
- focus score
- risk score / risk level
- YouTube 메타데이터 기반 content risk adjustment

### 4.1 권장 입력 스펙

FastAPI가 `addiction.py`를 래핑할 때의 요청 JSON은 아래를 권장한다.

```json
{
  "sessionId": "session-20260313-001",
  "childId": 101,
  "videoUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "sampleIntervalSeconds": 5,
  "logIntervalSeconds": 60,
  "previewEnabled": false,
  "persistTelemetry": true,
  "metadataOnly": false
}
```

필드 정의:

| 필드 | 타입 | 필수 | 설명 |
|---|---|---:|---|
| `sessionId` | string | Y | 시청 세션 ID |
| `childId` | integer | Y | 자녀 ID |
| `videoUrl` | string \| null | N | 현재 시청 중인 YouTube URL |
| `sampleIntervalSeconds` | integer | N | MongoDB 저장 간격. 권장 `1~5` |
| `logIntervalSeconds` | integer | N | 세션 요약 log 저장 간격 |
| `previewEnabled` | boolean | N | OpenCV 미리보기 창 표시 여부 |
| `persistTelemetry` | boolean | N | MongoDB 저장 여부 |
| `metadataOnly` | boolean | N | YouTube 메타데이터만 가져오고 종료할지 여부 |

### 4.2 telemetry event 스펙

MongoDB에는 시계열 원본값을 아래 형식으로 저장하는 것을 권장한다.

이 스키마는 `save_log`, `append_csv_row`, `KidsMonitorState`에 실제 존재하는 값을 기준으로 정리했다.

```json
{
  "sessionId": "session-20260313-001",
  "analysisId": 9001,
  "childId": 101,
  "capturedAt": "2026-03-13T15:30:05+09:00",
  "watchSeconds": 125,
  "blink": {
    "countTotal": 18,
    "bpm": 14,
    "ear": 0.27,
    "status": "normal"
  },
  "headPose": {
    "yaw": 4.5,
    "pitch": -2.1,
    "roll": 1.8,
    "isFront": true
  },
  "distance": {
    "screenDistanceCm": 82.4,
    "isSafe": true
  },
  "pose": {
    "status": "stable",
    "stillDurationSeconds": 18.0
  },
  "emotion": {
    "label": "neutral",
    "negativeRatio": 0.12
  },
  "contentContext": {
    "youtubeTitle": "Example Title",
    "youtubeCategoryEn": "Education",
    "youtubeCategoryKo": "교육",
    "youtubeDurationSeconds": 214,
    "youtubeIsShortForm": false,
    "contentRiskAdjustment": -12.0,
    "contentRiskReasons": [
      "교육 카테고리 감산"
    ]
  },
  "scores": {
    "focusScore": 88.4,
    "riskScore": 23.1,
    "riskLevel": "NORMAL",
    "breakdown": {
      "time": 8.3,
      "blink": 0.0,
      "pose": 2.0,
      "emotion": 12.0,
      "headPose": 0.0,
      "distance": 0.0,
      "content": -12.0
    }
  },
  "warnings": []
}
```

필드 정의:

| 필드 | 타입 | 설명 |
|---|---|---|
| `sessionId` | string | 시청 세션 ID |
| `analysisId` | integer \| null | 콘텐츠 분석 결과와 연결할 때 사용 |
| `childId` | integer | 자녀 ID |
| `capturedAt` | string | 샘플 시각 |
| `watchSeconds` | integer | 세션 누적 시청 시간 |
| `blink` | object | 깜빡임/눈 관련 지표 |
| `headPose` | object | 머리 각도 및 정면 여부 |
| `distance` | object | 화면 시청 거리 |
| `pose` | object | 자세 상태 |
| `emotion` | object | 감정 및 부정 감정 비율 |
| `contentContext` | object | YouTube 메타데이터 기반 문맥 |
| `scores` | object | 집중도/위험도 및 세부 breakdown |
| `warnings` | array | 경고 목록 |

### 4.3 세션 종료 요약 스펙

시청 세션 종료 후 PostgreSQL 또는 별도 summary 컬렉션에 저장할 요약 JSON:

```json
{
  "sessionId": "session-20260313-001",
  "analysisId": 9001,
  "childId": 101,
  "startedAt": "2026-03-13T15:28:00+09:00",
  "endedAt": "2026-03-13T16:03:00+09:00",
  "watchSeconds": 2100,
  "averageFocusScore": 76.3,
  "maxRiskScore": 64.1,
  "finalRiskScore": 58.0,
  "finalRiskLevel": "WARNING",
  "blinkCountTotal": 195,
  "negativeEmotionRatio": 0.21,
  "frontFacingRatio": 0.84,
  "safeDistanceRatio": 0.92,
  "warningCount": 3,
  "warnings": [
    {
      "type": "WATCH_TIME",
      "level": "WARNING",
      "message": "시청 시간이 60분을 초과했습니다."
    }
  ],
  "contentContext": {
    "youtubeTitle": "Example Title",
    "youtubeCategoryKo": "교육",
    "youtubeIsShortForm": false
  },
  "status": "COMPLETED"
}
```

## 5. 에러 응답 스펙

모든 모델 API는 아래 공통 형식을 따른다.

```json
{
  "status": "FAILED",
  "errorCode": "YOUTUBE_METADATA_NOT_FOUND",
  "message": "video_id=dQw4w9WgXcQ 에 대한 메타데이터를 찾을 수 없습니다.",
  "detail": null,
  "createdAt": "2026-03-13T15:22:31+09:00"
}
```

권장 `errorCode`:

- `INVALID_YOUTUBE_URL`
- `YOUTUBE_METADATA_NOT_FOUND`
- `YOUTUBE_API_ERROR`
- `STREAM_URL_RESOLUTION_FAILED`
- `VIDEO_CAPTURE_FAILED`
- `MODEL_RUNTIME_ERROR`
- `MEDIAPIPE_NOT_AVAILABLE`
- `CAMERA_NOT_AVAILABLE`
- `MONGODB_WRITE_FAILED`
- `POSTGRESQL_WRITE_FAILED`

## 6. 저장소별 데이터 분리

### PostgreSQL에 저장

- 분석 요청 이력
- 분석 결과 요약
- 재생 허용/차단 결과
- 자녀별 정책
- 세션 종료 요약

### MongoDB에 저장

- `monitor_sessions`
  - 세션 단위 요약
- `monitor_telemetry`
  - `addiction.py`의 시계열 telemetry
- `monitor_landmarks`
  - 랜드마크 원본값
- `monitor_events`
  - 경고/이벤트 로그
- `monitor_daily_reports`
  - 일 단위 집계 리포트

상세 컬렉션 설계는 [MONGODB_COLLECTION_DESIGN.md](c:/Users/4121/Desktop/DX/LGDX_Project/Models/MONGODB_COLLECTION_DESIGN.md)를 따른다.

## 7. 프런트 연동 기준

현재 프런트는 `Front/src/lib/api.ts` 기준으로 아래 응답을 직접 기대한다.

- `POST /api/analysis/youtube`
  - 본 문서의 `3.4 FastAPI 응답 스펙`
- `GET /api/analysis/history`
  - `3.4` 구조의 배열

즉, FastAPI는 Python raw 결과를 그대로 프런트에 넘기지 말고 아래처럼 매핑해야 한다.

- `input_url` -> `inputUrl`
- `video_id` -> `videoId`
- `category_name_ko` -> `categoryNameKo`
- `is_short_form` -> `shortForm`
- `category_filter.is_blocked` -> `blockedByCategory`
- `harmful_reasons.length > 0` -> `harmful`

## 8. 우선 구현 순서

1. `API.py` 결과를 `3.4` 형식으로 바꾸는 FastAPI 엔드포인트 작성
2. PostgreSQL `analysis_result` 저장
3. `addiction.py` telemetry를 `4.2` 형식으로 MongoDB 저장
4. 세션 종료 시 `4.3` 요약 저장
5. React `analyzeYoutubeVideo()`와 연결

## 9. 결정 사항

- 콘텐츠 분석 결과와 행동 모니터링 결과는 분리한다.
- 즉시 응답은 요약 중심으로 작게 유지한다.
- 시계열 원본값은 MongoDB에 저장한다.
- 프런트 계약은 `Front/src/lib/api.ts`를 우선 기준으로 한다.
- YouTube 제목은 모델 단계에서 바로 수집하고, PostgreSQL `analysis_history.title`에 저장한다.
