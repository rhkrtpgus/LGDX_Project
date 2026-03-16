export type Spotlight = {
  id: string
  title: string
  subtitle: string
  description: string
  eyebrow: string
  meta: string[]
  chips: string[]
  progress?: number
  accent: string
  backdrop: string
  externalUrl?: string
}

export type SidebarItem = {
  id: string
  label: string
  shortLabel: string
  hint: string
  accent?: string
}

export type QuickApp = {
  id: string
  name: string
  category: string
  shortcut: string
  accent: string
  spotlight: Spotlight
}

export type MediaItem = Spotlight & {
  badge?: string
  match: string
}

export type MediaRow = {
  id: string
  title: string
  description: string
  items: MediaItem[]
}

export type InsightStat = {
  label: string
  value: string
}

export type InsightPanel = {
  label: string
  title: string
  description: string
  stats: InsightStat[]
}

export type PageContent = {
  id: string
  headerEyebrow: string
  headerTitle: string
  headerDescription: string
  readyLabel: string
  primaryActionLabel: string
  secondaryActionLabel: string
  appLaunchLabel: string
  itemLaunchLabel: string
  detailLabel: string
  dockEyebrow: string
  dockTitle: string
  insight: InsightPanel
  spotlight: Spotlight
  quickApps: QuickApp[]
  rows: MediaRow[]
}

export const sidebarItems: SidebarItem[] = [
  { id: 'home', label: '홈', shortLabel: '홈', hint: '메인 허브' },
  { id: 'search', label: '탐색', shortLabel: '탐', hint: '콘텐츠 찾기' },
  { id: 'live', label: '실시간', shortLabel: '라', hint: '채널과 이벤트' },
  { id: 'apps', label: '앱', shortLabel: '앱', hint: '고정 서비스' },
  { id: 'settings', label: '설정', shortLabel: '설', hint: '프로필과 사운드' },
]

export const quickApps: QuickApp[] = [
  {
    id: 'youtube',
    name: '유튜브',
    category: '동영상',
    shortcut: 'YT',
    accent: '#ff5a54',
    spotlight: {
      id: 'app-youtube',
      title: '유튜브',
      subtitle: '라이브, 쇼츠, 장편 영상을 한 자리에서 보는 크리에이터 허브.',
      description:
        '거실 홈에서 인기 피드를 열고, 구독 채널로 바로 이동하거나, 마지막 재생목록을 자연스럽게 이어볼 수 있습니다.',
      eyebrow: '고정 앱',
      meta: ['지금 라이브', '4K', '맞춤 추천'],
      chips: ['구독 채널', '게이밍', '음악'],
      accent: '#ff5a54',
      externalUrl: 'https://www.youtube.com',
      backdrop:
        'radial-gradient(circle at 78% 18%, rgba(255, 90, 84, 0.46), transparent 0 34%), linear-gradient(135deg, #2d0b10 0%, #17080b 44%, #080405 100%)',
    },
  },
  {
    id: 'netflix',
    name: '넷플릭스',
    category: '시리즈',
    shortcut: 'NF',
    accent: '#d81f35',
    spotlight: {
      id: 'app-netflix',
      title: '넷플릭스',
      subtitle: '이어보기, TOP 10, 프로필 기반 추천을 빠르게 이어주는 메인 존.',
      description:
        '강한 포스터 중심의 배치와 부드러운 전환으로, 거실에서 바로 이어보는 흐름이 끊기지 않도록 구성했습니다.',
      eyebrow: '고정 앱',
      meta: ['TOP 10', '돌비 비전', '프로필'],
      chips: ['이어보기', '신작', '내 목록'],
      accent: '#d81f35',
      backdrop:
        'radial-gradient(circle at 72% 22%, rgba(216, 31, 53, 0.5), transparent 0 34%), linear-gradient(135deg, #28070d 0%, #17070a 52%, #080405 100%)',
    },
  },
  {
    id: 'disney',
    name: '디즈니+',
    category: '패밀리',
    shortcut: 'DS',
    accent: '#ff785c',
    spotlight: {
      id: 'app-disney',
      title: '디즈니+',
      subtitle: '가족용 작품, 프랜차이즈 허브, 밝은 키비주얼을 한 번에 묶은 공간.',
      description:
        '브랜드 존으로 바로 진입하고, 대표 프랜차이즈와 키즈 전용 동선까지 한 화면에서 정리해 보여줍니다.',
      eyebrow: '고정 앱',
      meta: ['가족', '아이맥스', '키즈'],
      chips: ['픽사', '마블', '스타워즈'],
      accent: '#ff785c',
      backdrop:
        'radial-gradient(circle at 76% 16%, rgba(255, 120, 92, 0.42), transparent 0 32%), linear-gradient(135deg, #2a0f11 0%, #19090c 50%, #080405 100%)',
    },
  },
  {
    id: 'prime',
    name: '프라임 비디오',
    category: '영화',
    shortcut: 'PV',
    accent: '#ff8f4b',
    spotlight: {
      id: 'app-prime',
      title: '프라임 비디오',
      subtitle: '대형 히어로 배너와 채널형 구성이 돋보이는 영화 중심 공간.',
      description:
        '대담한 메인 프로모션과 함께 대여, 채널, 다음 시청으로 빠르게 이어지는 스토어형 구조에 잘 맞습니다.',
      eyebrow: '고정 앱',
      meta: ['대여', '채널', '스포츠'],
      chips: ['채널', '스토어', '다음 시청'],
      accent: '#ff8f4b',
      backdrop:
        'radial-gradient(circle at 70% 20%, rgba(255, 143, 75, 0.44), transparent 0 32%), linear-gradient(135deg, #2a130c 0%, #190b08 48%, #080405 100%)',
    },
  },
  {
    id: 'gallery',
    name: '갤러리',
    category: '로컬',
    shortcut: 'GL',
    accent: '#c24d3f',
    spotlight: {
      id: 'app-gallery',
      title: '갤러리',
      subtitle: '스크린세이버, 공유 앨범, 로컬 미디어를 감성적으로 묶어주는 공간.',
      description:
        '가족 사진, 무드 배경, 대기 화면 루프를 한곳에 모아 런처가 켜진 상태에서도 자연스럽게 분위기를 유지합니다.',
      eyebrow: '고정 앱',
      meta: ['무드', '공유', '로컬'],
      chips: ['앨범', '하이라이트', '스크린세이버'],
      accent: '#c24d3f',
      backdrop:
        'radial-gradient(circle at 72% 18%, rgba(194, 77, 63, 0.45), transparent 0 32%), linear-gradient(135deg, #28110d 0%, #180908 48%, #080405 100%)',
    },
  },
]

export const mediaRows: MediaRow[] = [
  {
    id: 'continue',
    title: '이어보기',
    description: '마지막으로 보던 지점과 진행률을 그대로 살려서 바로 이어볼 수 있습니다.',
    items: [
      {
        id: 'night-agent',
        title: '나이트 에이전트',
        subtitle: '6화 대기 중',
        description: '빠른 전개가 살아 있는 정치 스릴러로, 넓은 히어로 패널에 잘 어울리는 작품입니다.',
        eyebrow: '이어보기',
        meta: ['시즌 2', '42분', '4K HDR'],
        chips: ['스릴러', '즉시 이어보기'],
        progress: 64,
        accent: '#e34b56',
        backdrop:
          'radial-gradient(circle at 75% 22%, rgba(227, 75, 86, 0.36), transparent 0 30%), linear-gradient(135deg, #2a0d12 0%, #17080b 58%, #0c0607 100%)',
        badge: '이어보기',
        match: '96% 취향 일치',
      },
      {
        id: 'blue-planet',
        title: '블루 플래닛',
        subtitle: '잔잔한 자연 다큐',
        description: '깊이감 있는 장면과 느긋한 리듬을 강조해 편안한 프리미엄 무드를 보여줍니다.',
        eyebrow: '이어보기',
        meta: ['다큐 시리즈', '49분', '돌비 애트모스'],
        chips: ['자연', '슬로우 TV'],
        progress: 28,
        accent: '#b74249',
        backdrop:
          'radial-gradient(circle at 80% 16%, rgba(183, 66, 73, 0.36), transparent 0 30%), linear-gradient(135deg, #240b10 0%, #16080b 56%, #0c0607 100%)',
        badge: '신규 에피소드',
        match: '94% 취향 일치',
      },
      {
        id: 'arcade-rush',
        title: '아케이드 러시',
        subtitle: '에너지 넘치는 경쟁 예능',
        description: '강한 포인트 컬러와 빠른 모션감이 서비스 런처의 속도감을 잘 살려줍니다.',
        eyebrow: '이어보기',
        meta: ['리얼리티', '38분', '5.1채널'],
        chips: ['경쟁', '파티'],
        progress: 82,
        accent: '#ff8f43',
        backdrop:
          'radial-gradient(circle at 76% 20%, rgba(255, 143, 67, 0.4), transparent 0 30%), linear-gradient(135deg, #301208 0%, #1a0907 56%, #0c0607 100%)',
        badge: '곧 종료',
        match: '91% 취향 일치',
      },
      {
        id: 'last-frontier',
        title: '라스트 프런티어',
        subtitle: '영화 같은 SF 어드벤처',
        description: '스케일이 큰 우주 서사에 짙은 와인 톤을 입혀 메인 배너 존재감을 높였습니다.',
        eyebrow: '이어보기',
        meta: ['SF', '55분', '아이맥스'],
        chips: ['대서사', '우주'],
        progress: 12,
        accent: '#8d303d',
        backdrop:
          'radial-gradient(circle at 74% 18%, rgba(141, 48, 61, 0.38), transparent 0 30%), linear-gradient(135deg, #220a11 0%, #16080b 56%, #0c0607 100%)',
        badge: '다음 추천',
        match: '89% 취향 일치',
      },
      {
        id: 'chef-table',
        title: '셰프 테이블',
        subtitle: '따뜻한 감도의 푸드 스토리',
        description: '농도 있는 웜톤과 정제된 메타 칩으로 차분한 다이닝 무드를 만들어 줍니다.',
        eyebrow: '이어보기',
        meta: ['푸드', '31분', '4K'],
        chips: ['다큐', '미식'],
        progress: 46,
        accent: '#cc6a34',
        backdrop:
          'radial-gradient(circle at 78% 20%, rgba(204, 106, 52, 0.42), transparent 0 30%), linear-gradient(135deg, #2a1209 0%, #180908 56%, #0c0607 100%)',
        badge: '추천작',
        match: '88% 취향 일치',
      },
    ],
  },
  {
    id: 'trending',
    title: '지금 뜨는 작품',
    description: '강한 키비주얼과 빠른 미리보기로 인기 콘텐츠를 전면에 배치했습니다.',
    items: [
      {
        id: 'deep-city',
        title: '딥 시티',
        subtitle: '짙은 누아르 범죄 앤솔로지',
        description: '깊은 적색과 레이어드 그라디언트가 어우러진 묵직한 프리미엄 드라마 톤입니다.',
        eyebrow: '인기 급상승',
        meta: ['범죄', '8부작', '4K HDR'],
        chips: ['앤솔로지', '누아르'],
        accent: '#db5064',
        backdrop:
          'radial-gradient(circle at 74% 18%, rgba(219, 80, 100, 0.42), transparent 0 32%), linear-gradient(135deg, #260913 0%, #17080c 56%, #0c0607 100%)',
        badge: 'TOP 10',
        match: '98% 취향 일치',
      },
      {
        id: 'race-day',
        title: '레이스 데이',
        subtitle: '모터 스포츠 하이라이트',
        description: '직선적인 타이포와 속도감 있는 레이아웃으로 스포츠 라인의 긴장을 살립니다.',
        eyebrow: '인기 급상승',
        meta: ['스포츠', '실시간', '5.1채널'],
        chips: ['하이라이트', '모터 스포츠'],
        accent: '#f06743',
        backdrop:
          'radial-gradient(circle at 72% 18%, rgba(240, 103, 67, 0.4), transparent 0 32%), linear-gradient(135deg, #2a100a 0%, #180907 56%, #0c0607 100%)',
        badge: '실시간',
        match: '93% 취향 일치',
      },
      {
        id: 'golden-hour',
        title: '골든 아워',
        subtitle: '따뜻한 성장 드라마',
        description: '부드러운 앰버 조명과 감정선 중심의 분위기로 여운이 긴 작품 느낌을 줍니다.',
        eyebrow: '인기 급상승',
        meta: ['드라마', '영화', '돌비 비전'],
        chips: ['화제작', '감성'],
        accent: '#ffb057',
        backdrop:
          'radial-gradient(circle at 76% 18%, rgba(255, 176, 87, 0.4), transparent 0 32%), linear-gradient(135deg, #301409 0%, #1a0a07 56%, #0c0607 100%)',
        badge: '평단 추천',
        match: '90% 취향 일치',
      },
      {
        id: 'zero-signal',
        title: '제로 시그널',
        subtitle: '긴장감 높은 테크 스릴러',
        description: '차갑기보다 날카로운 다크 레드 톤으로, 사이버 서스펜스의 밀도를 강조했습니다.',
        eyebrow: '인기 급상승',
        meta: ['스릴러', '영화', '돌비 애트모스'],
        chips: ['사이버', '미스터리'],
        accent: '#9f3348',
        backdrop:
          'radial-gradient(circle at 72% 18%, rgba(159, 51, 72, 0.42), transparent 0 32%), linear-gradient(135deg, #220a13 0%, #15070b 56%, #0c0607 100%)',
        badge: '인기작',
        match: '92% 취향 일치',
      },
      {
        id: 'the-rally',
        title: '더 랠리',
        subtitle: '언더독 스포츠 다큐',
        description: '팀의 서사와 회복 탄성을 강조하는 구조로, 차분하지만 단단한 인상을 만듭니다.',
        eyebrow: '인기 급상승',
        meta: ['스포츠 다큐', '6부작', '4K'],
        chips: ['영감', '팀워크'],
        accent: '#c85640',
        backdrop:
          'radial-gradient(circle at 76% 18%, rgba(200, 86, 64, 0.38), transparent 0 32%), linear-gradient(135deg, #2a100c 0%, #160807 56%, #0c0607 100%)',
        badge: '신규',
        match: '87% 취향 일치',
      },
    ],
  },
  {
    id: 'family',
    title: '함께 보기 추천',
    description: '가족이 함께 볼 때 부담 없도록 밝고 단순한 카드 구성을 사용했습니다.',
    items: [
      {
        id: 'starlight-labs',
        title: '스타라이트 랩스',
        subtitle: '가족형 SF 어드벤처',
        description: '탐험의 재미와 안정적인 호흡을 동시에 담아 공유 시청에 잘 어울립니다.',
        eyebrow: '패밀리',
        meta: ['패밀리', '24분', '4K'],
        chips: ['모험', '키즈'],
        accent: '#d85f6d',
        backdrop:
          'radial-gradient(circle at 76% 18%, rgba(216, 95, 109, 0.38), transparent 0 32%), linear-gradient(135deg, #260b12 0%, #15070b 56%, #0c0607 100%)',
        badge: '전 연령',
        match: '95% 취향 일치',
      },
      {
        id: 'camp-cosmos',
        title: '캠프 코스모스',
        subtitle: '우주 배경의 애니메이션 캠프',
        description: '경쾌한 호흡과 선명한 카드 정보로 어린 시청자도 쉽게 고를 수 있습니다.',
        eyebrow: '패밀리',
        meta: ['애니메이션', '22분', '5.1채널'],
        chips: ['코미디', '키즈'],
        accent: '#ff7f8d',
        backdrop:
          'radial-gradient(circle at 76% 18%, rgba(255, 127, 141, 0.4), transparent 0 32%), linear-gradient(135deg, #2a0c14 0%, #17070b 56%, #0c0607 100%)',
        badge: '신나는 작품',
        match: '90% 취향 일치',
      },
      {
        id: 'maker-junior',
        title: '메이커 주니어',
        subtitle: '만들기와 발명 챌린지',
        description: '배우는 재미가 느껴지는 구조로, 교육 콘텐츠도 지루하지 않게 담았습니다.',
        eyebrow: '패밀리',
        meta: ['교육', '18분', 'HD'],
        chips: ['DIY', '학습'],
        accent: '#f3a94c',
        backdrop:
          'radial-gradient(circle at 78% 18%, rgba(243, 169, 76, 0.4), transparent 0 32%), linear-gradient(135deg, #30170a 0%, #190907 56%, #0c0607 100%)',
        badge: '똑똑 추천',
        match: '88% 취향 일치',
      },
      {
        id: 'pixel-pets',
        title: '픽셀 펫츠',
        subtitle: '짧고 귀여운 애니메이션 이야기',
        description: '짧은 러닝타임과 빠른 미리보기로 홈 화면 체류 시간이 길어지지 않게 설계했습니다.',
        eyebrow: '패밀리',
        meta: ['애니메이션', '11분', '4K'],
        chips: ['숏폼', '경쾌함'],
        accent: '#ea6f59',
        backdrop:
          'radial-gradient(circle at 74% 18%, rgba(234, 111, 89, 0.4), transparent 0 32%), linear-gradient(135deg, #2b100d 0%, #180807 56%, #0c0607 100%)',
        badge: '숏폼',
        match: '91% 취향 일치',
      },
      {
        id: 'junior-chefs',
        title: '주니어 셰프',
        subtitle: '주방에서 벌어지는 모험',
        description: '포근한 주말 무드가 살아 있어 가족이 함께 보기 좋은 따뜻한 라인입니다.',
        eyebrow: '패밀리',
        meta: ['푸드', '20분', 'HD'],
        chips: ['요리', '경쟁'],
        accent: '#ff8c60',
        backdrop:
          'radial-gradient(circle at 78% 18%, rgba(255, 140, 96, 0.4), transparent 0 32%), linear-gradient(135deg, #30130b 0%, #190907 56%, #0c0607 100%)',
        badge: '주말 추천',
        match: '86% 취향 일치',
      },
    ],
  },
]

export const initialSpotlight = mediaRows[0].items[0]

export const homePageContent: PageContent = {
  id: 'home',
  headerEyebrow: 'LGDX 스마트 허브',
  headerTitle: '홈',
  headerDescription: '가장 자주 보는 콘텐츠와 앱을 빠르게 이어보는 메인 허브입니다.',
  readyLabel: '홈 화면 준비 완료',
  primaryActionLabel: '바로 재생',
  secondaryActionLabel: '상세 정보',
  appLaunchLabel: '여는 중',
  itemLaunchLabel: '재생 준비 중',
  detailLabel: '상세 정보 확인',
  dockEyebrow: '즉시 실행',
  dockTitle: '즐겨찾는 앱',
  insight: {
    label: '집중 탐색 노트',
    title: '리모컨 중심으로 빠르게 이동',
    description:
      '홈 화면은 TV 리모컨에 맞춰 설계했습니다. 왼쪽 탐색 바, 빠른 실행 도크, 그리고 가로로 흐르는 콘텐츠 라인으로 직관적인 이동감을 만듭니다.',
    stats: [
      { label: '앱', value: String(quickApps.length) },
      { label: '콘텐츠 줄', value: String(mediaRows.length) },
      { label: '추천 흐름', value: '이어보기 중심' },
    ],
  },
  spotlight: initialSpotlight,
  quickApps,
  rows: mediaRows,
}
