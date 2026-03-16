export type YoutubeCategoryId =
  | 'film_animation'
  | 'autos_vehicles'
  | 'music'
  | 'pets_animals'
  | 'sports'
  | 'travel_events'
  | 'gaming'
  | 'people_blogs'
  | 'comedy'
  | 'entertainment'
  | 'news_politics'
  | 'howto_style'
  | 'education'
  | 'science_technology'
  | 'nonprofits_activism'

export type YoutubeCategorySettings = Record<YoutubeCategoryId, boolean>

export interface YoutubeCategoryOption {
  id: YoutubeCategoryId
  label: string
  shortLabel: string
  description: string
  accent: string
  aliases: string[]
}

export interface YoutubeQuickPick {
  id: string
  title: string
  subtitle: string
  description: string
  categoryId: YoutubeCategoryId
  durationLabel: string
  badge: string
  accent: string
  url: string
  tags: string[]
}

export const YOUTUBE_CATEGORY_OPTIONS: YoutubeCategoryOption[] = [
  {
    id: 'film_animation',
    label: '영화·애니메이션',
    shortLabel: '애니',
    description: '애니메이션, 영화, 스토리형 영상',
    accent: '#9b7fe8',
    aliases: ['영화', '애니메이션', 'film', 'animation'],
  },
  {
    id: 'autos_vehicles',
    label: '자동차·이동수단',
    shortLabel: '탈것',
    description: '자동차, 기차, 탈것 관련 영상',
    accent: '#7aa6ff',
    aliases: ['자동차', '차량', 'vehicles', 'autos'],
  },
  {
    id: 'music',
    label: '음악',
    shortLabel: '음악',
    description: '동요, 음악, 연주, 리듬 중심 영상',
    accent: '#f58f5c',
    aliases: ['음악', 'music'],
  },
  {
    id: 'pets_animals',
    label: '반려동물·동물',
    shortLabel: '동물',
    description: '동물 관찰, 반려동물, 자연 속 동물 영상',
    accent: '#62c7b2',
    aliases: ['동물', '반려동물', 'pets', 'animals'],
  },
  {
    id: 'sports',
    label: '스포츠',
    shortLabel: '스포츠',
    description: '운동, 경기, 스포츠 클립 영상',
    accent: '#ff7a7a',
    aliases: ['스포츠', 'sports'],
  },
  {
    id: 'travel_events',
    label: '여행·이벤트',
    shortLabel: '여행',
    description: '여행, 행사, 체험형 브이로그 영상',
    accent: '#f4b860',
    aliases: ['여행', '이벤트', 'travel', 'events'],
  },
  {
    id: 'gaming',
    label: '게임',
    shortLabel: '게임',
    description: '게임 플레이, 게임 해설, 캐릭터 중심 영상',
    accent: '#7d8cff',
    aliases: ['게임', 'gaming'],
  },
  {
    id: 'people_blogs',
    label: '인물·브이로그',
    shortLabel: '일상',
    description: '일상, 가족 브이로그, 사람 이야기 영상',
    accent: '#7dc67e',
    aliases: ['인물', '브이로그', '사람', 'people', 'blogs'],
  },
  {
    id: 'comedy',
    label: '코미디',
    shortLabel: '코미디',
    description: '가벼운 웃음, 상황극, 코미디형 영상',
    accent: '#ff8c6f',
    aliases: ['코미디', 'comedy'],
  },
  {
    id: 'entertainment',
    label: '엔터테인먼트',
    shortLabel: '예능',
    description: '챌린지, 예능, 자극적인 편집이 많은 영상',
    accent: '#f06292',
    aliases: ['엔터테인먼트', '예능', 'entertainment'],
  },
  {
    id: 'news_politics',
    label: '뉴스·정치',
    shortLabel: '뉴스',
    description: '뉴스, 시사, 정치 관련 영상',
    accent: '#9c9fb3',
    aliases: ['뉴스', '정치', 'news', 'politics'],
  },
  {
    id: 'howto_style',
    label: '생활·스타일',
    shortLabel: '생활',
    description: '방법 소개, 만들기, 생활 팁 영상',
    accent: '#d08fdc',
    aliases: ['생활', '스타일', 'howto', 'style'],
  },
  {
    id: 'education',
    label: '교육',
    shortLabel: '교육',
    description: '학습, 언어, 문제 해결 중심 영상',
    accent: '#4aaef5',
    aliases: ['교육', 'education'],
  },
  {
    id: 'science_technology',
    label: '과학·기술',
    shortLabel: '과학',
    description: '과학 원리, 실험, 기술 탐구 영상',
    accent: '#64c96a',
    aliases: ['과학', '기술', 'science', 'technology'],
  },
  {
    id: 'nonprofits_activism',
    label: '비영리·사회활동',
    shortLabel: '사회',
    description: '공익, 캠페인, 사회 활동 소개 영상',
    accent: '#58b7a5',
    aliases: ['비영리', '사회활동', 'activism', 'nonprofits'],
  },
]

export const DEFAULT_YOUTUBE_CATEGORY_SETTINGS: YoutubeCategorySettings = {
  film_animation: true,
  autos_vehicles: true,
  music: true,
  pets_animals: true,
  sports: true,
  travel_events: true,
  gaming: false,
  people_blogs: true,
  comedy: true,
  entertainment: false,
  news_politics: false,
  howto_style: true,
  education: true,
  science_technology: true,
  nonprofits_activism: true,
}

export const YOUTUBE_QUICK_PICKS: YoutubeQuickPick[] = [
  {
    id: 'pick-bunny',
    title: '바다와 숲을 배경으로 보는 애니메이션',
    subtitle: '잔잔한 스토리형 영상',
    description: '시각 자극이 강하지 않은 장면 위주로 먼저 확인해볼 수 있어요.',
    categoryId: 'film_animation',
    durationLabel: '9분',
    badge: '동화형',
    accent: 'linear-gradient(135deg, #5c8dff 0%, #8bc6ff 100%)',
    url: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
    tags: ['home', 'char', 'books'],
  },
  {
    id: 'pick-youtube-dev',
    title: '영상이 어떻게 재생되는지 살펴보기',
    subtitle: '기술과 원리를 알아보는 짧은 영상',
    description: '호기심이 많은 아이가 원리 중심으로 보기 좋은 선택지예요.',
    categoryId: 'education',
    durationLabel: '4분',
    badge: '학습형',
    accent: 'linear-gradient(135deg, #2847d9 0%, #4aaef5 100%)',
    url: 'https://www.youtube.com/watch?v=M7lc1UVf-VE',
    tags: ['home', 'english', 'books'],
  },
  {
    id: 'pick-zoo',
    title: '동물과 일상을 함께 보는 짧은 브이로그',
    subtitle: '가족과 대화하기 좋은 생활형 영상',
    description: '짧게 보고 대화를 이어가기 좋은 일상형 콘텐츠예요.',
    categoryId: 'people_blogs',
    durationLabel: '1분',
    badge: '대화형',
    accent: 'linear-gradient(135deg, #4d8f77 0%, #7dc67e 100%)',
    url: 'https://www.youtube.com/watch?v=jNQXAC9IVRw',
    tags: ['home', 'nuree', 'percent'],
  },
  {
    id: 'pick-demo',
    title: '리듬과 화면 전환이 빠른 데모 영상',
    subtitle: '짧은 영상 흐름을 먼저 확인할 수 있어요',
    description: '짧은 영상의 몰입도를 확인하는 용도로 검증하기 좋은 카드예요.',
    categoryId: 'entertainment',
    durationLabel: '2분',
    badge: '짧은형',
    accent: 'linear-gradient(135deg, #ff6b78 0%, #ff9a62 100%)',
    url: 'https://www.youtube.com/watch?v=ysz5S6PUM-U',
    tags: ['home', 'percent', 'songs'],
  },
  {
    id: 'pick-music',
    title: '편안한 리듬으로 듣는 음악 영상',
    subtitle: '동요나 음악 취향을 확인하기 좋은 카드',
    description: '집중이 필요한 시간보다 쉬는 시간에 먼저 살펴보기 좋아요.',
    categoryId: 'music',
    durationLabel: '3분',
    badge: '음악형',
    accent: 'linear-gradient(135deg, #f8b84d 0%, #ff8b5e 100%)',
    url: 'https://www.youtube.com/watch?v=ScMzIvxBSi4',
    tags: ['home', 'songs', 'char'],
  },
  {
    id: 'pick-science',
    title: '움직임과 화면을 관찰하기 좋은 자연 영상',
    subtitle: '차분하게 보는 탐구형 콘텐츠',
    description: '빠른 편집보다 관찰 중심 영상으로 먼저 확인할 수 있어요.',
    categoryId: 'science_technology',
    durationLabel: '10분',
    badge: '탐구형',
    accent: 'linear-gradient(135deg, #46b870 0%, #90d7a7 100%)',
    url: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
    tags: ['home', 'nuree', 'books'],
  },
]

export function getEnabledYoutubeCategories(settings: YoutubeCategorySettings) {
  return YOUTUBE_CATEGORY_OPTIONS.filter((category) => settings[category.id])
}

export function resolveYoutubeCategory(categoryName: string | null | undefined): YoutubeCategoryId | null {
  if (!categoryName) {
    return null
  }

  const normalized = categoryName.trim().toLowerCase()
  const matched = YOUTUBE_CATEGORY_OPTIONS.find((category) =>
    category.aliases.some((alias) => normalized.includes(alias.toLowerCase())),
  )

  return matched?.id ?? null
}

export function isYoutubeCategoryAllowed(
  categoryName: string | null | undefined,
  settings: YoutubeCategorySettings,
) {
  const resolved = resolveYoutubeCategory(categoryName)
  if (!resolved) {
    return true
  }

  return settings[resolved]
}
