export type TvAppsTab = {
  id: string
  label: string
}

export type TvAppsTile = {
  id: string
  name: string
  subtitle: string
  accent: string
  badge?: string
}

export const tvAppsTabs: TvAppsTab[] = [
  { id: 'movies', label: '영화' },
  { id: 'replay', label: 'TV다시보기' },
  { id: 'animation', label: '애니메이션' },
  { id: 'docu', label: '다큐/교양' },
  { id: 'apps', label: 'TV앱' },
  { id: 'kids', label: '아이들나라' },
]

export const tvAppsTiles: TvAppsTile[] = [
  {
    id: 'youtube',
    name: 'YouTube',
    subtitle: '동영상',
    accent: '#d91f26',
  },
  {
    id: 'vlive',
    name: 'V LIVE',
    subtitle: '라이브',
    accent: '#39b6e5',
  },
  {
    id: 'genie',
    name: 'genie',
    subtitle: '뮤직',
    accent: '#3b84d9',
  },
  {
    id: 'mnet',
    name: 'Mnet',
    subtitle: '음악 방송',
    accent: '#cf2b97',
  },
  {
    id: 'tving',
    name: 'TVING',
    subtitle: '방송/영화',
    accent: '#ef6a2f',
  },
  {
    id: 'utv',
    name: 'U+tv',
    subtitle: '실시간 채널',
    accent: '#d0912f',
    badge: '추천',
  },
  {
    id: 'uplus-box',
    name: 'U+Box',
    subtitle: '클라우드',
    accent: '#ef8ea1',
  },
  {
    id: 'kids-play',
    name: 'Kids Play',
    subtitle: '키즈 앱',
    accent: '#6f6dff',
  },
]
