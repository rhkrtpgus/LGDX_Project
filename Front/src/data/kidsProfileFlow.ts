export type ScreenId =
  | 'profile-select'
  | 'main'
  | 'youtube-care'
  | 'profile-type'
  | 'login'
  | 'connected'
  | 'content'
  | 'time'
  | 'interest'
  | 'cam-before'
  | 'cam-connecting'
  | 'cam-after'
  | 'thinq'
  | 'done'
  | 'kids-main'
  | 'profile-create'
  | 'settings'
  | 'settings-child'
  | 'settings-family'
  | 'settings-youtube'
  | 'settings-history'
  | 'watch-history'
  | 'pin'

export const AUTO_ADVANCE: Partial<Record<ScreenId, ScreenId>> = {
  login: 'connected',
  connected: 'content',
  'cam-connecting': 'cam-after',
  done: 'kids-main',
}

export const AUTO_ADVANCE_DELAY_MS = 3000

export interface ContentCard {
  id: string
  label: string
  sub: string
}

export const CONTENT_CARDS: ContentCard[] = [
  { id: 'infant', label: '유아 및 미취학 아동', sub: '만 4세 이하' },
  { id: 'lower', label: '초등 저학년 아동', sub: '만 5-8세' },
  { id: 'upper', label: '초등 고학년 아동', sub: '만 9-12세' },
]

export interface TimeCard {
  id: string
  label: string
  recommended?: boolean
}

export const TIME_CARDS: TimeCard[] = [
  { id: '30min', label: '30분' },
  { id: '1hr', label: '1시간', recommended: true },
  { id: '1hr30', label: '1시간 30분' },
  { id: 'custom', label: '직접 설정하기' },
]

export interface InterestCard {
  id: string
  label: string
}

export const INTEREST_CARDS: InterestCard[] = [
  { id: 'songs', label: '동요' },
  { id: 'habits', label: '생활습관' },
  { id: 'arts', label: '예술·창작' },
  { id: 'speech', label: '말하기' },
]

export interface Account {
  id: string
  label: string
  avatarChar: string
  variant: 'purple' | 'yellow' | 'add'
}

export const ACCOUNTS: Account[] = [
  { id: 'user1', label: '보호자', avatarChar: 'L', variant: 'purple' },
  { id: 'kids', label: '아이들', avatarChar: 'K', variant: 'yellow' },
  { id: 'add', label: '추가하기', avatarChar: '+', variant: 'add' },
]

export interface KidsCategory {
  id: string
  label: string
  emoji: string
  color: string
}

export const KIDS_CATEGORIES: KidsCategory[] = [
  { id: 'home', label: '추천 홈', emoji: '🏠', color: '#FF8C42' },
  { id: 'percent', label: '인기순', emoji: '%', color: '#E879A0' },
  { id: 'english', label: '영어 학습', emoji: 'AB', color: '#5B9BD5' },
  { id: 'nuree', label: '자연 탐구', emoji: '🌿', color: '#7DC67E' },
  { id: 'books', label: '꿈꾸는 독서', emoji: '📚', color: '#F5A623' },
  { id: 'songs', label: '즐거운 동요', emoji: '🎵', color: '#9B87D4' },
  { id: 'char', label: '캐릭터 친구', emoji: '🧸', color: '#F06292' },
]

export interface KidsContent {
  id: string
  title: string
  sub: string
  color: string
  badge?: string
}

export const KIDS_CONTENTS: KidsContent[] = [
  { id: 'c1', title: '숲속 친구 이야기', sub: '무료 체험', color: '#F5C842', badge: '무료' },
  { id: 'c2', title: '블록 놀이 연구소', sub: '창의 놀이', color: '#6DB8F0' },
  { id: 'c3', title: '코코멜론', sub: '가족과 함께', color: '#8ED6D6' },
  { id: 'c4', title: '콩순이 놀이교실', sub: '친구와 함께', color: '#F09090' },
  { id: 'c5', title: '그림 동화책', sub: '차분한 독서', color: '#C8C8C8' },
  { id: 'c6', title: '미니 모험 특공대', sub: '액션', color: '#3A4A6B' },
]
