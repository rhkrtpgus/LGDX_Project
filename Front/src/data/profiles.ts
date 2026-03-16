// ─── 자녀 프로필 타입 & 유틸 ──────────────────────────────────────────────────

export interface ChildProfile {
  id: string
  name: string
  age: number
  color: string       // 프로필 배경색 (ripple 애니메이션에도 사용)
  bgGradient: string  // 홈 화면 배경 그라디언트
  timeLimit: number
  interests: string[]
}

export interface AgeTheme {
  label: string
  accent: string
  bgColor: string
  textColor: string
  style: 'baby' | 'child' | 'older'
}

// 연령대별 전체 테마
export function getThemeByAge(age: number): AgeTheme {
  if (age <= 5) return {
    label: '율동·동요 중심',
    accent: '#FF8C42',
    bgColor: '#FFF0F5',
    textColor: '#1a1a1a',
    style: 'baby',
  }
  if (age <= 8) return {
    label: '학습·창의력 중심',
    accent: '#5B9BD5',
    bgColor: '#EAF4FF',
    textColor: '#1a2a3a',
    style: 'child',
  }
  return {
    label: '독서·탐구 중심',
    accent: '#7DC67E',
    bgColor: '#EAF7EA',
    textColor: '#1a2a1a',
    style: 'older',
  }
}

// 연령대별 콘텐츠 필터링
export interface ContentItem {
  id: string
  title: string
  sub: string
  color: string
  badge?: string
  ageMin: number
  ageMax: number
  tags: string[]
}

export const ALL_CONTENTS: ContentItem[] = [
  // 유아 콘텐츠 (2~5세)
  { id: 'c1', title: '코코멜론',          sub: '가족 동요',     color: '#8ED6D6', ageMin: 2, ageMax: 5, tags: ['songs', 'habits'], badge: '무료' },
  { id: 'c2', title: '한글용사 아이아',   sub: '무료 인기작',   color: '#F5C842', ageMin: 3, ageMax: 6, tags: ['speech', 'habits'], badge: '무료' },
  { id: 'c3', title: '뽀로로',            sub: '유아 애니',     color: '#6DB8F0', ageMin: 2, ageMax: 5, tags: ['songs', 'habits'] },
  { id: 'c4', title: '핑크퐁',            sub: '율동·동요',     color: '#F0A0C0', ageMin: 2, ageMax: 4, tags: ['songs'],           badge: '인기' },
  // 아동 콘텐츠 (5~8세)
  { id: 'c5', title: '넘버 블록스',       sub: '수학 학습',     color: '#6DB8F0', ageMin: 4, ageMax: 8, tags: ['speech', 'arts'] },
  { id: 'c6', title: '엉뚱발랄 콩순이',   sub: '친구 관계',     color: '#F09090', ageMin: 4, ageMax: 7, tags: ['habits', 'arts'] },
  { id: 'c7', title: '꼬모',              sub: '생활 습관',     color: '#C8C8C8', ageMin: 3, ageMax: 7, tags: ['habits'] },
  { id: 'c8', title: '으랏차차 우리동네', sub: '사회 탐구',     color: '#A0D0A0', ageMin: 5, ageMax: 9, tags: ['habits', 'speech'] },
  // 초등 콘텐츠 (7~12세)
  { id: 'c9',  title: '최강 전사 미니특공대', sub: '액션',      color: '#3A4A6B', ageMin: 6, ageMax: 12, tags: ['arts'] },
  { id: 'c10', title: '탐정 학교',             sub: '추리·독서', color: '#7060A0', ageMin: 7, ageMax: 12, tags: ['speech', 'arts'] },
  { id: 'c11', title: '과학 실험실',           sub: '탐구 학습', color: '#50A090', ageMin: 6, ageMax: 12, tags: ['arts', 'habits'] },
  // 가족·공동시청 콘텐츠 (넓은 연령대)
  { id: 'f1', title: '위대한 자연',        sub: '가족 다큐',    color: '#5B9B7A', ageMin: 3, ageMax: 12, tags: ['arts', 'habits'],  badge: '가족' },
  { id: 'f2', title: '신비아파트',         sub: '어드벤처',     color: '#6A5ACD', ageMin: 5, ageMax: 12, tags: ['arts'],            badge: '가족' },
  { id: 'f3', title: '세계 동물 탐험대',   sub: '자연·탐구',    color: '#70A060', ageMin: 4, ageMax: 12, tags: ['speech', 'habits'] },
  { id: 'f4', title: '우주 대탐험',        sub: '과학 애니',    color: '#4A5080', ageMin: 4, ageMax: 12, tags: ['arts', 'speech'],  badge: '가족' },
  { id: 'f5', title: '요리왕 패밀리',      sub: '함께 보는 요리', color: '#E07050', ageMin: 4, ageMax: 12, tags: ['habits'] },
]

// ─── 공동 시청: 모든 자녀가 함께 볼 수 있는 콘텐츠 ─────────────────────────
export function getCombinedRecommendations(profiles: ChildProfile[]): ContentItem[] {
  if (profiles.length === 0) return []
  const ages = profiles.map(p => p.age)
  const minAge = Math.min(...ages)
  const maxAge = Math.max(...ages)
  // 모든 자녀의 연령 범위를 커버하는 콘텐츠 (교집합)
  const perfect = ALL_CONTENTS.filter(c => c.ageMin <= minAge && c.ageMax >= maxAge)
  if (perfect.length >= 3) return perfect
  // 교집합이 부족하면 최대 겹침 순으로 정렬
  const allInterests = Array.from(new Set(profiles.flatMap(p => p.interests)))
  return ALL_CONTENTS
    .filter(c => c.ageMax >= minAge && c.ageMin <= maxAge)
    .sort((a, b) => {
      const overlapA = Math.min(a.ageMax, maxAge) - Math.max(a.ageMin, minAge)
      const overlapB = Math.min(b.ageMax, maxAge) - Math.max(b.ageMin, minAge)
      const tagA = a.tags.some(t => allInterests.includes(t)) ? 1 : 0
      const tagB = b.tags.some(t => allInterests.includes(t)) ? 1 : 0
      return (overlapB + tagB * 2) - (overlapA + tagA * 2)
    })
}

export function getContentsByAge(age: number, interests?: string[]): ContentItem[] {
  const filtered = ALL_CONTENTS.filter(c => age >= c.ageMin && age <= c.ageMax)
  if (!interests || interests.length === 0) return filtered
  // 관심사 태그 일치 항목 우선 정렬
  return [
    ...filtered.filter(c => c.tags.some(t => interests.includes(t))),
    ...filtered.filter(c => !c.tags.some(t => interests.includes(t))),
  ]
}

export const DEFAULT_PROFILES: ChildProfile[] = [
  {
    id: 'mina',
    name: '미나',
    age: 4,
    color: '#FFB3D1',
    bgGradient: 'linear-gradient(135deg, #FFF0F5 0%, #FFE4B5 100%)',
    timeLimit: 60,
    interests: ['songs', 'habits'],
  },
  {
    id: 'junsu',
    name: '준수',
    age: 7,
    color: '#90C8F0',
    bgGradient: 'linear-gradient(135deg, #EAF4FF 0%, #D0F0E8 100%)',
    timeLimit: 90,
    interests: ['arts', 'speech'],
  },
]
