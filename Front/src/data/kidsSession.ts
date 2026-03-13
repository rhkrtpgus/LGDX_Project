export type KidsCategory = {
  id: string
  label: string
  icon: string
  accent: string
}

export type KidsPoster = {
  id: string
  title: string
  subtitle: string
  badge?: string
  accent: string
  background: string
}

export type KidsMiniCard = {
  id: string
  title: string
  accent: string
}

export const kidsCategories: KidsCategory[] = [
  { id: 'recommended', label: '추천 홈', icon: '곰', accent: '#ef7a3a' },
  { id: 'membership', label: '월정액 가입', icon: '%', accent: '#f29aac' },
  { id: 'english', label: '신나는 영어', icon: 'AB', accent: '#63a9ff' },
  { id: 'growth', label: '자라는 누리', icon: '학', accent: '#8b85ff' },
  { id: 'reading', label: '꿈꾸는 독서', icon: '책', accent: '#f2a43a' },
  { id: 'songs', label: '즐거운 동요', icon: '음', accent: '#8d8d8d' },
  { id: 'friends', label: '캐릭터 친구', icon: '냥', accent: '#f39cb4' },
]

export const kidsFeaturedPosters: KidsPoster[] = [
  {
    id: 'hero-warrior',
    title: '한글용사 아이야',
    subtitle: '무료 인기작',
    badge: '무료',
    accent: '#ef6e2b',
    background:
      'linear-gradient(180deg, #f6d664 0%, #f6c453 52%, #efb334 100%)',
  },
  {
    id: 'hero-number',
    title: '넘버 블록스',
    subtitle: '한국어',
    accent: '#78b7ff',
    background:
      'linear-gradient(180deg, #90c9ff 0%, #6ab2ff 52%, #5d98ef 100%)',
  },
  {
    id: 'hero-coco',
    title: '코코멜론',
    subtitle: '가족동요',
    accent: '#4fb8ff',
    background:
      'linear-gradient(180deg, #77d5ff 0%, #55c0ff 48%, #29a4f1 100%)',
  },
  {
    id: 'hero-kong',
    title: '엉뚱발랄 콩순이',
    subtitle: '친구들',
    accent: '#f1b28d',
    background:
      'linear-gradient(180deg, #ffd0bd 0%, #f7b494 48%, #ee8c70 100%)',
  },
  {
    id: 'hero-egg',
    title: '꼬모쿡',
    subtitle: '요리 놀이',
    accent: '#9bd0ff',
    background:
      'linear-gradient(180deg, #c3e3ff 0%, #9ad0ff 48%, #72b6ff 100%)',
  },
  {
    id: 'hero-robot',
    title: '최강 전사 미니특공대',
    subtitle: '액션',
    accent: '#2b3d6a',
    background:
      'linear-gradient(180deg, #526da5 0%, #2f477d 50%, #16274d 100%)',
  },
]

export const kidsMiniCards: KidsMiniCard[] = [
  { id: 'mini-1', title: '출동! 안전 구조대', accent: '#f2b268' },
  { id: 'mini-2', title: '춤추는 강아지', accent: '#63c9ff' },
  { id: 'mini-3', title: '바다 탐험대', accent: '#7bc9ff' },
  { id: 'mini-4', title: '하늘 버스', accent: '#8cc4ff' },
  { id: 'mini-5', title: '숲속 친구들', accent: '#7bd9b0' },
]
