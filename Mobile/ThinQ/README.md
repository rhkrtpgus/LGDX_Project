# 📺 TV 시청 리포트 — 자녀 시청 습관 모니터링 앱

LG 스마트TV + LG SmartCam 연동 기반의 iOS 스타일 자녀 시청 습관 분석 앱입니다.

---

## 주요 기능

| 탭 | 설명 |
|---|---|
| 🏠 홈 | 이번 주 요약 대시보드 (시청시간 · 콘텐츠 · 자세 미니 카드) |
| ⏱ 시청시간 | 일별/주별 시청 시간 + 또래 비교 게이지 + 소셜 퀵 액션 |
| 🎬 콘텐츠 | 콘텐츠 유형 도넛 차트 + TOP 프로그램 + 또래 비교 |
| 🪑 자세관리 | LG SmartCam — 시청 거리 · 자세 점수 · 눈 깜박임 분석 |
| ⚙️ 설정 | 시청 시간 제한 · 콘텐츠 필터 · LG 스마트캠 연결 |

### 핵심 UX 포인트

- **또래 위치 게이지** — 그라데이션 바 위에 마커로 우리 아이 위치를 직관적으로 시각화
- **사회적 증거 버튼** — "부모님 82% 선택", "안과 전문의 권장" 배지 포함 인카드 퀵 액션
- **또래 평균선** — 시청시간 · 자세점수 차트에 참조선으로 표시
- **개인화 메시지** — "민준이는 분당 8회, 또래 평균 12회" 형태의 맥락적 알림

---

## 기술 스택

- **React 18** + **Vite 5**
- **Recharts** — BarChart, PieChart, ReferenceLine
- **Lucide React** — 아이콘
- 375×812px iOS 폰 프레임 (인라인 스타일, Tailwind 불필요)

---

## 로컬 실행

```bash
# 1. 의존성 설치
npm install

# 2. 개발 서버 시작
npm run dev
# → http://localhost:5173 에서 확인
```

## 빌드

```bash
npm run build
# dist/ 폴더에 정적 파일 생성
```

---

## 프로젝트 구조

```
tv-habit-monitor/
├── public/
│   └── favicon.svg
├── src/
│   ├── App.jsx          # 메인 앱 (전체 화면 + 컴포넌트)
│   ├── main.jsx         # React 진입점
│   └── index.css        # 글로벌 스타일 (스크롤바 숨김 등)
├── index.html
├── vite.config.js
├── package.json
├── .gitignore
└── README.md
```

---

## 화면 구성

```
App (screen state: 0~4)
├── StatusBar          — iOS 상태바 시뮬레이션
├── NavBar             — 타이틀 + 뒤로가기/홈/설정 버튼
├── [Screen 0] ScreenHome     — 대시보드
├── [Screen 1] ScreenDaily    — 시청시간 + 또래비교
├── [Screen 2] ScreenContent  — 콘텐츠 분석 + 또래비교
├── [Screen 3] ScreenPosture  — LG SmartCam 자세관리
├── [Screen 4] ScreenSettings — 설정
└── BottomTab          — 하단 탭 네비게이션 (설정 탭 제외)
```

---

## 공통 컴포넌트

| 컴포넌트 | 역할 |
|---|---|
| `PeerGauge` | 또래 대비 위치 그라데이션 게이지 |
| `ScoreRing` | SVG 원형 자세 점수 링 |
| `SocialBtn` | 사회적 증거 배지 포함 CTA 버튼 |
| `Card` | 공통 카드 레이아웃 |
| `Toggle` | iOS 스타일 토글 스위치 |

---

*Built with ❤️ using React + Recharts*
