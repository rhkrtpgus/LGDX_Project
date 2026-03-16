import { createMediaItem, createSpotlight } from './factory'
import type { MediaRow, PageContent, QuickApp } from './home'

const quickApps: QuickApp[] = [
  {
    id: 'live-news',
    name: '뉴스 센터',
    category: '속보',
    shortcut: 'L1',
    accent: '#ff534f',
    spotlight: createSpotlight('live-news-spotlight', '뉴스 센터', '실시간 속보와 주요 이슈를 빠르게 전면에 띄우는 정보 허브.', '라이브 환경에서 가장 먼저 접근해야 하는 뉴스와 특보를 리모컨 한 번으로 열 수 있게 구성했습니다.', '실시간 허브', ['속보', '라이브', '빠른 전환'], ['헤드라인', '정치', '경제'], '#ff534f', 'radial-gradient(circle at 78% 18%, rgba(255, 83, 79, 0.46), transparent 0 34%), linear-gradient(135deg, #2f0808 0%, #170606 48%, #080405 100%)'),
  },
  {
    id: 'live-sports',
    name: '스포츠 중계',
    category: '라이브',
    shortcut: 'L2',
    accent: '#ff7b4f',
    spotlight: createSpotlight('live-sports-spotlight', '스포츠 중계', '점수와 하이라이트가 빠르게 연결되는 경기 중심 라이브 존.', '현재 진행 중인 경기와 곧 시작할 경기를 한 번에 확인하고 바로 입장할 수 있습니다.', '실시간 허브', ['경기 중', '고화질', '멀티뷰'], ['축구', '야구', '격투'], '#ff7b4f', 'radial-gradient(circle at 72% 20%, rgba(255, 123, 79, 0.44), transparent 0 34%), linear-gradient(135deg, #2e1108 0%, #170706 48%, #080405 100%)'),
  },
  {
    id: 'live-music',
    name: '뮤직 스테이지',
    category: '공연',
    shortcut: 'L3',
    accent: '#cf4d55',
    spotlight: createSpotlight('live-music-spotlight', '뮤직 스테이지', '라이브 공연과 무대 중심의 에너지 있는 실시간 흐름.', '큰 무대 비주얼과 짧은 장르 태그만으로도 바로 진입할 수 있도록 공연형 카드 구조를 사용했습니다.', '실시간 허브', ['라이브 공연', '5.1채널', '고음질'], ['콘서트', '페스티벌', '특집 무대'], '#cf4d55', 'radial-gradient(circle at 74% 18%, rgba(207, 77, 85, 0.42), transparent 0 34%), linear-gradient(135deg, #28090a 0%, #170607 48%, #080405 100%)'),
  },
  {
    id: 'live-game',
    name: '게임 이벤트',
    category: 'e스포츠',
    shortcut: 'L4',
    accent: '#e85f49',
    spotlight: createSpotlight('live-game-spotlight', '게임 이벤트', 'e스포츠와 대회 방송을 빠르게 모아보는 경쟁형 라이브 존.', '경기 정보와 진행 상태를 짧은 메타 정보로 보여줘서, 실시간 화면에 들어가기 전 판단이 빠릅니다.', '실시간 허브', ['대회 중', '멀티 카메라', '채팅 연동'], ['e스포츠', '토너먼트', '결승전'], '#e85f49', 'radial-gradient(circle at 72% 16%, rgba(232, 95, 73, 0.42), transparent 0 34%), linear-gradient(135deg, #290c08 0%, #180706 48%, #080405 100%)'),
  },
  {
    id: 'live-alert',
    name: '긴급 속보',
    category: '알림',
    shortcut: 'L5',
    accent: '#b93b3d',
    spotlight: createSpotlight('live-alert-spotlight', '긴급 속보', '긴급 재난, 공지, 즉시 확인이 필요한 정보를 전면에 띄우는 영역.', 'TV가 백그라운드 상태여도 중요한 안내를 빠르게 확인할 수 있도록 강한 대비로 구성했습니다.', '실시간 허브', ['즉시 확인', '고정 배너', '우선 노출'], ['재난', '교통', '지역 안내'], '#b93b3d', 'radial-gradient(circle at 72% 18%, rgba(185, 59, 61, 0.42), transparent 0 34%), linear-gradient(135deg, #210708 0%, #140607 48%, #080405 100%)'),
  },
]

const rows: MediaRow[] = [
  {
    id: 'live-now',
    title: '지금 방송 중',
    description: '현재 바로 들어갈 수 있는 실시간 채널과 중계를 전면에 배치했습니다.',
    items: [
      createMediaItem('live-breaking-news', '속보 브리핑', '정각 뉴스 특보 진행 중', '긴급 이슈를 실시간으로 다루는 뉴스 블록으로, 첫 진입용 카드 역할을 합니다.', '지금 방송 중', ['뉴스', '생방송', '지금'], ['속보', '헤드라인'], '#e24c54', 'radial-gradient(circle at 76% 18%, rgba(226, 76, 84, 0.4), transparent 0 32%), linear-gradient(135deg, #29090a 0%, #160607 56%, #0c0607 100%)', '바로 시청', '생방송'),
      createMediaItem('live-champions', '챔피언스 매치', '후반전 진행 중', '점수와 흐름이 빠르게 바뀌는 스포츠 중계의 긴장감을 카드 단위로 전달합니다.', '지금 방송 중', ['스포츠', '후반전', '4K'], ['축구', '하이라이트'], '#ff7a4c', 'radial-gradient(circle at 78% 18%, rgba(255, 122, 76, 0.42), transparent 0 32%), linear-gradient(135deg, #2d1109 0%, #170706 56%, #0c0607 100%)', '실시간 인기', '경기 중'),
      createMediaItem('live-festival', '레드 페스티벌', '메인 스테이지 라이브', '공연 무드가 강한 실시간 카드로, 음악 중심 사용자의 빠른 진입을 유도합니다.', '지금 방송 중', ['공연', '라이브', '5.1채널'], ['페스티벌', '메인 무대'], '#d84d57', 'radial-gradient(circle at 74% 18%, rgba(216, 77, 87, 0.42), transparent 0 32%), linear-gradient(135deg, #27090a 0%, #170607 56%, #0c0607 100%)', '무대 추천', '온에어'),
      createMediaItem('live-arena', '아레나 파이널', 'e스포츠 결승 2세트', '게임 대회 특유의 빠른 정보 전달을 위해 짧고 굵은 메타 구조를 사용했습니다.', '지금 방송 중', ['e스포츠', '결승전', '멀티뷰'], ['토너먼트', '실황'], '#bf4444', 'radial-gradient(circle at 72% 18%, rgba(191, 68, 68, 0.42), transparent 0 32%), linear-gradient(135deg, #240807 0%, #150606 56%, #0c0607 100%)', '대회 집중', '결승전'),
    ],
  },
  {
    id: 'live-soon',
    title: '곧 시작',
    description: '입장 대기 화면 없이 다음 라이브를 미리 고를 수 있게 구성했습니다.',
    items: [
      createMediaItem('live-morning-brief', '모닝 브리프', '15분 후 시작', '짧은 뉴스 요약 포맷을 미리 예약해 둘 수 있는 카드입니다.', '곧 시작', ['뉴스', '15분 후', '짧게'], ['예약', '아침 루틴'], '#d75a4f', 'radial-gradient(circle at 75% 18%, rgba(215, 90, 79, 0.4), transparent 0 32%), linear-gradient(135deg, #270c08 0%, #150707 56%, #0c0607 100%)', '예약 추천', '곧 시작'),
      createMediaItem('live-derby', '도심 더비', '30분 후 킥오프', '기다리는 경기의 긴장감을 유지하도록 강한 색 대비와 큰 제목을 사용했습니다.', '곧 시작', ['스포츠', '30분 후', '프리뷰'], ['축구', '분석'], '#ff8a53', 'radial-gradient(circle at 76% 18%, rgba(255, 138, 83, 0.42), transparent 0 32%), linear-gradient(135deg, #301308 0%, #160707 56%, #0c0607 100%)', '경기 예고', '프리뷰'),
      createMediaItem('live-jazz-night', '재즈 나이트', '오늘 밤 9시 라이브', '차분한 공연 계열 실시간 콘텐츠도 메인 구조 안에서 자연스럽게 보이도록 했습니다.', '곧 시작', ['음악', '오늘 9시', '라이브'], ['재즈', '감성 무대'], '#be514d', 'radial-gradient(circle at 74% 18%, rgba(190, 81, 77, 0.4), transparent 0 32%), linear-gradient(135deg, #260b09 0%, #150707 56%, #0c0607 100%)', '오늘 밤 추천', '오늘 밤'),
      createMediaItem('live-world-update', '월드 업데이트', '글로벌 특집 편성', '대형 뉴스 특집을 중심으로 오래 시청할 수 있는 블록형 콘텐츠입니다.', '곧 시작', ['특집', '뉴스', '2시간'], ['세계 이슈', '심층 분석'], '#cb434c', 'radial-gradient(circle at 75% 18%, rgba(203, 67, 76, 0.42), transparent 0 32%), linear-gradient(135deg, #24080a 0%, #140606 56%, #0c0607 100%)', '특집 추천', '특집'),
    ],
  },
]

export const livePageContent: PageContent = {
  id: 'live',
  headerEyebrow: 'LGDX 스마트 허브',
  headerTitle: '실시간',
  headerDescription: '생방송, 경기, 공연, 속보를 지금 바로 들어갈 수 있는 흐름으로 정리한 화면입니다.',
  readyLabel: '실시간 화면 준비 완료',
  primaryActionLabel: '채널 입장',
  secondaryActionLabel: '방송 정보',
  appLaunchLabel: '채널 여는 중',
  itemLaunchLabel: '방송 여는 중',
  detailLabel: '방송 정보 확인',
  dockEyebrow: '실시간 허브',
  dockTitle: '라이브 바로가기',
  insight: {
    label: '라이브 포인트',
    title: '지금 볼 것과 곧 시작할 것을 분리',
    description:
      '실시간 화면은 현재 방송과 곧 시작할 프로그램을 동시에 보여줘서 기다림 없이 다음 선택을 만들도록 구성했습니다.',
    stats: [
      { label: '라이브 존', value: String(quickApps.length) },
      { label: '방송 줄', value: String(rows.length) },
      { label: '핵심 모드', value: '생방송 우선' },
    ],
  },
  spotlight: rows[0].items[0],
  quickApps,
  rows,
}
