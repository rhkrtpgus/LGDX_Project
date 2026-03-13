import { createMediaItem, createSpotlight } from './factory'
import type { MediaRow, PageContent, QuickApp } from './home'

const quickApps: QuickApp[] = [
  {
    id: 'apps-stream',
    name: 'OTT 모음',
    category: '스트리밍',
    shortcut: 'A1',
    accent: '#ff574f',
    spotlight: createSpotlight('apps-stream-spotlight', 'OTT 모음', '가장 많이 쓰는 영상 서비스를 한 번에 모아두는 실행 존.', '앱 화면에서는 콘텐츠보다 실행성이 먼저 보여야 하므로, 앱 성격과 즉시 실행 흐름을 전면에 둡니다.', '앱 허브', ['빠른 실행', '고정 배치', '개인화'], ['스트리밍', '영화', '시리즈'], '#ff574f', 'radial-gradient(circle at 78% 18%, rgba(255, 87, 79, 0.44), transparent 0 34%), linear-gradient(135deg, #2f0908 0%, #170606 48%, #080405 100%)'),
  },
  {
    id: 'apps-music',
    name: '음악 앱',
    category: '오디오',
    shortcut: 'A2',
    accent: '#ff8656',
    spotlight: createSpotlight('apps-music-spotlight', '음악 앱', '배경 음악과 라이브 공연 감상에 맞춘 오디오 중심 앱 컬렉션.', '집 안 분위기를 바꾸는 용도로 자주 쓰는 앱을 앞단에 배치해 접근성을 높였습니다.', '앱 허브', ['음악', '백그라운드 재생', '빠른 이동'], ['플레이리스트', '라이브', '라디오'], '#ff8656', 'radial-gradient(circle at 76% 18%, rgba(255, 134, 86, 0.42), transparent 0 34%), linear-gradient(135deg, #2d1208 0%, #160706 48%, #080405 100%)'),
  },
  {
    id: 'apps-game',
    name: '게임 존',
    category: '인터랙션',
    shortcut: 'A3',
    accent: '#d54a52',
    spotlight: createSpotlight('apps-game-spotlight', '게임 존', '게임 스트리밍과 캐주얼 플레이를 함께 다루는 인터랙션 존.', '리모컨 사용자를 고려해 빠른 진입이 가능한 게임과 e스포츠 연동 앱 위주로 묶었습니다.', '앱 허브', ['게임', 'e스포츠', '즉시 실행'], ['캐주얼', '대회', '친구와 함께'], '#d54a52', 'radial-gradient(circle at 74% 18%, rgba(213, 74, 82, 0.42), transparent 0 34%), linear-gradient(135deg, #28090a 0%, #160607 48%, #080405 100%)'),
  },
  {
    id: 'apps-photo',
    name: '사진과 클라우드',
    category: '보관함',
    shortcut: 'A4',
    accent: '#cb6147',
    spotlight: createSpotlight('apps-photo-spotlight', '사진과 클라우드', '가족 앨범과 클라우드 저장소를 큰 화면에서 다루는 공간.', '단순 실행뿐 아니라 최근 업로드와 공유 상태까지 빠르게 확인할 수 있게 구성했습니다.', '앱 허브', ['사진', '공유', '클라우드'], ['가족 앨범', '백업', '스크린세이버'], '#cb6147', 'radial-gradient(circle at 74% 18%, rgba(203, 97, 71, 0.42), transparent 0 34%), linear-gradient(135deg, #281009 0%, #160706 48%, #080405 100%)'),
  },
  {
    id: 'apps-tools',
    name: '도구 앱',
    category: '유틸리티',
    shortcut: 'A5',
    accent: '#a9433d',
    spotlight: createSpotlight('apps-tools-spotlight', '도구 앱', '브라우저, 캘린더, 미러링 같은 생활형 기능을 모아둔 보조 존.', '콘텐츠 소비 외에도 TV를 거실 정보 패널처럼 쓰는 흐름을 고려해 배치했습니다.', '앱 허브', ['유틸리티', '거실 생산성', '연결'], ['브라우저', '미러링', '캘린더'], '#a9433d', 'radial-gradient(circle at 72% 18%, rgba(169, 67, 61, 0.42), transparent 0 34%), linear-gradient(135deg, #220909 0%, #140606 48%, #080405 100%)'),
  },
]

const rows: MediaRow[] = [
  {
    id: 'apps-popular',
    title: '자주 쓰는 앱',
    description: '실제로 TV에서 빠르게 켜는 빈도가 높은 서비스 위주로 묶었습니다.',
    items: [
      createMediaItem('apps-youtube-card', '유튜브', '가장 자주 실행하는 동영상 앱', '짧은 영상부터 긴 콘텐츠까지 모두 소화할 수 있어 홈에서 가장 먼저 호출되는 앱입니다.', '인기 앱', ['동영상', '라이브', '4K'], ['구독', '쇼츠'], '#ff5a54', 'radial-gradient(circle at 78% 18%, rgba(255, 90, 84, 0.42), transparent 0 32%), linear-gradient(135deg, #2a0b0c 0%, #160707 56%, #0c0607 100%)', '실행 빈도 높음', '핫앱'),
      createMediaItem('apps-netflix-card', '넷플릭스', '시리즈 중심 시청 앱', '이어보기와 개인화 추천이 강해 메인 시청 앱으로 자주 사용됩니다.', '인기 앱', ['시리즈', '프로필', '4K'], ['이어보기', '랭킹'], '#d81f35', 'radial-gradient(circle at 75% 18%, rgba(216, 31, 53, 0.42), transparent 0 32%), linear-gradient(135deg, #24080a 0%, #140606 56%, #0c0607 100%)', '실행 빈도 높음', '대표 앱'),
      createMediaItem('apps-music-card', '뮤직 허브', '플레이리스트와 배경 재생 중심', '거실 전체 분위기를 바꿔주는 음악 앱은 빠른 접근이 중요합니다.', '인기 앱', ['음악', '백그라운드', '추천'], ['플레이리스트', '가수'], '#d2604f', 'radial-gradient(circle at 76% 18%, rgba(210, 96, 79, 0.4), transparent 0 32%), linear-gradient(135deg, #290f0a 0%, #160706 56%, #0c0607 100%)', '자주 실행', '음악 앱'),
      createMediaItem('apps-gallery-card', '갤러리', '앨범과 공유 사진 모음', '스크린세이버와 대기 화면 구성에 자주 쓰이는 로컬/클라우드형 앱입니다.', '인기 앱', ['사진', '공유', '로컬'], ['앨범', '하이라이트'], '#c45342', 'radial-gradient(circle at 74% 18%, rgba(196, 83, 66, 0.4), transparent 0 32%), linear-gradient(135deg, #260f0a 0%, #150706 56%, #0c0607 100%)', '자주 실행', '사진 앱'),
    ],
  },
  {
    id: 'apps-lifestyle',
    title: '생활형 도구',
    description: '콘텐츠 소비 외에 거실에서 자주 쓰는 실용 기능을 묶었습니다.',
    items: [
      createMediaItem('apps-browser-card', '브라우저', '큰 화면용 웹 탐색', '간단한 검색이나 로그인 확인 같은 생활형 작업을 처리하는 기본 도구입니다.', '생활 앱', ['웹', '북마크', '동기화'], ['검색', '로그인'], '#a9483f', 'radial-gradient(circle at 74% 18%, rgba(169, 72, 63, 0.38), transparent 0 32%), linear-gradient(135deg, #220a09 0%, #140606 56%, #0c0607 100%)', '도구 추천', '유틸리티'),
      createMediaItem('apps-cast-card', '화면 미러링', '모바일 화면을 TV로 바로 전송', '가장 자주 쓰는 연결 기능을 빠르게 실행할 수 있도록 별도 카드로 분리했습니다.', '생활 앱', ['연결', '모바일', '즉시 공유'], ['미러링', '캐스트'], '#d05c52', 'radial-gradient(circle at 76% 18%, rgba(208, 92, 82, 0.4), transparent 0 32%), linear-gradient(135deg, #28100a 0%, #150706 56%, #0c0607 100%)', '연결 추천', '연결 기능'),
      createMediaItem('apps-calendar-card', '거실 캘린더', '일정과 가족 이벤트 확인', 'TV를 정보 보드처럼 쓰는 흐름을 고려한 생활형 앱 카드입니다.', '생활 앱', ['일정', '가족 공유', '동기화'], ['캘린더', '알림'], '#be5645', 'radial-gradient(circle at 75% 18%, rgba(190, 86, 69, 0.4), transparent 0 32%), linear-gradient(135deg, #250e09 0%, #150706 56%, #0c0607 100%)', '가정용 추천', '공유 일정'),
      createMediaItem('apps-party-card', '파티 게임', '함께 하는 거실용 게임', '짧게 즐길 수 있는 인터랙션 앱은 가족 모임에서 사용성이 높습니다.', '생활 앱', ['게임', '멀티', '간단한 조작'], ['거실 놀이', '주말'], '#d85f4c', 'radial-gradient(circle at 74% 18%, rgba(216, 95, 76, 0.4), transparent 0 32%), linear-gradient(135deg, #280f0a 0%, #160707 56%, #0c0607 100%)', '가족 추천', '주말용'),
    ],
  },
]

export const appsPageContent: PageContent = {
  id: 'apps',
  headerEyebrow: 'LGDX 스마트 허브',
  headerTitle: '앱',
  headerDescription: '스트리밍, 음악, 도구, 사진, 게임을 목적별로 묶어 빠르게 실행할 수 있는 화면입니다.',
  readyLabel: '앱 화면 준비 완료',
  primaryActionLabel: '앱 실행',
  secondaryActionLabel: '앱 정보',
  appLaunchLabel: '앱 실행 중',
  itemLaunchLabel: '앱 정보 여는 중',
  detailLabel: '앱 정보 확인',
  dockEyebrow: '앱 허브',
  dockTitle: '카테고리 바로가기',
  insight: {
    label: '앱 구성 포인트',
    title: '콘텐츠보다 실행 속도를 먼저 보여주는 구조',
    description:
      '앱 화면은 무엇을 볼지보다 어떤 서비스를 열지 먼저 판단하는 흐름이 중요해 실행 중심 카드와 카테고리형 배치를 사용했습니다.',
    stats: [
      { label: '카테고리', value: String(quickApps.length) },
      { label: '앱 줄', value: String(rows.length) },
      { label: '주요 목표', value: '빠른 실행' },
    ],
  },
  spotlight: quickApps[0].spotlight,
  quickApps,
  rows,
}
