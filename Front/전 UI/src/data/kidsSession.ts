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

export type KidsNotice = {
  icon: string
  title: string
  description: string
}

export type KidsProfileSeed = {
  childId: number
  childName: string
  ageLabel: string
}

export type KidsProfile = {
  id: string
  backendChildId: number | null
  name: string
  ageLabel: string
  avatarLabel: string
  accent: string
  surface: string
  summary: string
  selectionDescription: string
  selectionTags: string[]
  quickLabels: [string, string, string]
  usageLabel: string
  headerBadge: string
  sectionTitle: string
  notice: KidsNotice
  assistantName: string
  assistantActionLabel: string
  categories: KidsCategory[]
  featuredPosters: KidsPoster[]
  miniCards: KidsMiniCard[]
}

type KidsProfileTemplate = Omit<KidsProfile, 'backendChildId' | 'name' | 'ageLabel'> & {
  fallbackName: string
  fallbackAgeLabel: string
}

const kidsProfileTemplates: KidsProfileTemplate[] = [
  {
    id: 'minseo',
    fallbackName: '민서',
    fallbackAgeLabel: '6세',
    avatarLabel: 'MS',
    accent: '#ff8a4c',
    surface: 'linear-gradient(135deg, #ffdfb8 0%, #ffd3a8 45%, #ffc39e 100%)',
    summary: '한글, 동요, 생활 습관 중심',
    selectionDescription:
      '처음 읽기와 따라 부르기를 좋아하는 아이를 위해 쉬운 한글과 말놀이 중심으로 화면을 구성했습니다.',
    selectionTags: ['한글 시작', '동요 반복', '저녁 30분'],
    quickLabels: ['시계', '곰', '책'],
    usageLabel: '오늘 38분 이용',
    headerBadge: '맞춤 추천',
    sectionTitle: '오늘의 아이들나라 추천',
    notice: {
      icon: '시력',
      title: '시력 보호 모드 켜짐',
      description: '화면 밝기를 낮추고 블루라이트를 줄여 저녁 시청에 맞췄습니다.',
    },
    assistantName: '리리',
    assistantActionLabel: '리리 부르기',
    categories: [
      { id: 'recommended', label: '추천 홈', icon: '곰', accent: '#ef7a3a' },
      { id: 'hangul', label: '한글 놀이', icon: '가', accent: '#ff9661' },
      { id: 'songs', label: '즐거운 동요', icon: '음', accent: '#ffb347' },
      { id: 'habits', label: '생활 습관', icon: '해', accent: '#7bb8ff' },
      { id: 'friends', label: '캐릭터 친구', icon: '냥', accent: '#f39cb4' },
    ],
    featuredPosters: [
      {
        id: 'minseo-hangul-warrior',
        title: '한글용사 아이야',
        subtitle: '무료 인기작',
        badge: '무료',
        accent: '#ef6e2b',
        background: 'linear-gradient(180deg, #f6d664 0%, #f6c453 52%, #efb334 100%)',
      },
      {
        id: 'minseo-coco',
        title: '코코멜론',
        subtitle: '가족 동요',
        accent: '#4fb8ff',
        background: 'linear-gradient(180deg, #77d5ff 0%, #55c0ff 48%, #29a4f1 100%)',
      },
      {
        id: 'minseo-kongsuni',
        title: '엉뚱발랄 콩순이',
        subtitle: '친구와 배워요',
        accent: '#f1b28d',
        background: 'linear-gradient(180deg, #ffd0bd 0%, #f7b494 48%, #ee8c70 100%)',
      },
      {
        id: 'minseo-cook',
        title: '꼬모쿡',
        subtitle: '요리 놀이',
        accent: '#9bd0ff',
        background: 'linear-gradient(180deg, #c3e3ff 0%, #9ad0ff 48%, #72b6ff 100%)',
      },
      {
        id: 'minseo-bath',
        title: '출동! 안전 구조대',
        subtitle: '생활 안전',
        accent: '#f2b268',
        background: 'linear-gradient(180deg, #ffd49f 0%, #f5b55c 48%, #ea9344 100%)',
      },
    ],
    miniCards: [
      { id: 'minseo-mini-1', title: '양치송 따라 하기', accent: '#f2b268' },
      { id: 'minseo-mini-2', title: '숫자 블록 놀이', accent: '#63c9ff' },
      { id: 'minseo-mini-3', title: '잠자리 동화', accent: '#7bc9ff' },
      { id: 'minseo-mini-4', title: '색깔 찾기', accent: '#8cc4ff' },
      { id: 'minseo-mini-5', title: '곰돌이 체조', accent: '#7bd9b0' },
    ],
  },
  {
    id: 'jihoo',
    fallbackName: '지후',
    fallbackAgeLabel: '9세',
    avatarLabel: 'JH',
    accent: '#4f8cff',
    surface: 'linear-gradient(135deg, #cfe0ff 0%, #c0d4ff 45%, #a7c2ff 100%)',
    summary: '영어, 과학, 모험 콘텐츠 중심',
    selectionDescription:
      '호기심이 많은 아이에게는 영어 학습과 탐험형 콘텐츠를 먼저 보여주도록 맞춤 구성을 적용했습니다.',
    selectionTags: ['영어 20분', '과학 탐험', '주말 확대'],
    quickLabels: ['영어', '탐험', '별'],
    usageLabel: '오늘 1시간 12분 이용',
    headerBadge: '학습 우선 추천',
    sectionTitle: '좋아할 오늘의 추천',
    notice: {
      icon: '학습',
      title: '학습 우선 모드 적용',
      description: '평일에는 영어와 과학 카테고리를 먼저 보여주도록 정렬했습니다.',
    },
    assistantName: '코디',
    assistantActionLabel: '코디 부르기',
    categories: [
      { id: 'recommended', label: '추천 홈', icon: '별', accent: '#4f8cff' },
      { id: 'english', label: '신나는 영어', icon: 'AB', accent: '#63a9ff' },
      { id: 'science', label: '과학 탐험', icon: '탐', accent: '#6dcf99' },
      { id: 'history', label: '역사 이야기', icon: '성', accent: '#f29aac' },
      { id: 'sports', label: '활동 시간', icon: '공', accent: '#f2a43a' },
    ],
    featuredPosters: [
      {
        id: 'jihoo-numberblocks',
        title: '넘버블록스',
        subtitle: '한국어/영어',
        badge: '추천',
        accent: '#78b7ff',
        background: 'linear-gradient(180deg, #90c9ff 0%, #6ab2ff 52%, #5d98ef 100%)',
      },
      {
        id: 'jihoo-space',
        title: '우주 탐험대',
        subtitle: '과학 모험',
        accent: '#445fd4',
        background: 'linear-gradient(180deg, #8396ff 0%, #5e72f2 48%, #3949bc 100%)',
      },
      {
        id: 'jihoo-dino',
        title: '다이노 구조대',
        subtitle: '탐험 친구',
        accent: '#4bbf7a',
        background: 'linear-gradient(180deg, #93e7b1 0%, #67d48f 48%, #37b26a 100%)',
      },
      {
        id: 'jihoo-world',
        title: '세계 문화 여행',
        subtitle: '오늘의 학습',
        accent: '#ffab5c',
        background: 'linear-gradient(180deg, #ffd7a0 0%, #ffba73 48%, #ef9342 100%)',
      },
      {
        id: 'jihoo-maker',
        title: '꼬마 메이커 랩',
        subtitle: '실험과 만들기',
        accent: '#2b3d6a',
        background: 'linear-gradient(180deg, #526da5 0%, #2f477d 50%, #16274d 100%)',
      },
    ],
    miniCards: [
      { id: 'jihoo-mini-1', title: '오늘의 영어 챌린지', accent: '#63c9ff' },
      { id: 'jihoo-mini-2', title: '공룡 백과 5분', accent: '#7bd9b0' },
      { id: 'jihoo-mini-3', title: '태양계 퀴즈', accent: '#8cc4ff' },
      { id: 'jihoo-mini-4', title: '축구 드릴 따라 하기', accent: '#f2b268' },
      { id: 'jihoo-mini-5', title: '박물관 스토리', accent: '#f39cb4' },
    ],
  },
  {
    id: 'seoyoon',
    fallbackName: '서윤',
    fallbackAgeLabel: '12세',
    avatarLabel: 'SY',
    accent: '#8b6dff',
    surface: 'linear-gradient(135deg, #e0d7ff 0%, #d4c8ff 45%, #c5b6ff 100%)',
    summary: '다큐, 코딩, 창작형 콘텐츠 중심',
    selectionDescription:
      '조금 더 깊이 있는 시청을 좋아하는 아이에게는 다큐와 창작형 콘텐츠를 우선 노출하도록 맞춤화했습니다.',
    selectionTags: ['코딩 15분', '역사 다큐', '주말 자유'],
    quickLabels: ['코딩', '다큐', '메모'],
    usageLabel: '오늘 54분 이용',
    headerBadge: '집중 콘텐츠 추천',
    sectionTitle: '집중해서 볼 콘텐츠',
    notice: {
      icon: '집중',
      title: '집중 시청 모드 활성화',
      description: '짧은 자극형 영상보다 시리즈와 학습형 콘텐츠를 우선 배치했습니다.',
    },
    assistantName: '루미',
    assistantActionLabel: '루미 부르기',
    categories: [
      { id: 'recommended', label: '추천 홈', icon: '별', accent: '#8b6dff' },
      { id: 'coding', label: '코딩 스텝', icon: '</>', accent: '#5f9bff' },
      { id: 'documentary', label: '다큐 픽', icon: '큐', accent: '#64748b' },
      { id: 'reading', label: '독서 토론', icon: '책', accent: '#f2a43a' },
      { id: 'creative', label: '창작 스튜디오', icon: '빛', accent: '#ff8aa0' },
    ],
    featuredPosters: [
      {
        id: 'seoyoon-coding',
        title: '코드 스타트',
        subtitle: '블록 코딩 입문',
        badge: '신규',
        accent: '#5f9bff',
        background: 'linear-gradient(180deg, #9dc1ff 0%, #6ea2ff 48%, #4579db 100%)',
      },
      {
        id: 'seoyoon-history',
        title: '역사 타임라인',
        subtitle: '인물과 사건',
        accent: '#ffab5c',
        background: 'linear-gradient(180deg, #ffd7a0 0%, #ffba73 48%, #ef9342 100%)',
      },
      {
        id: 'seoyoon-science',
        title: '사이언스 크루',
        subtitle: '실험실 브이로그',
        accent: '#5dc7b2',
        background: 'linear-gradient(180deg, #9be8db 0%, #69d3c0 48%, #2db3a0 100%)',
      },
      {
        id: 'seoyoon-studio',
        title: '크리에이터 스튜디오',
        subtitle: '영상 만들기',
        accent: '#f39cb4',
        background: 'linear-gradient(180deg, #ffc9d7 0%, #f7a8bf 48%, #eb7ea1 100%)',
      },
      {
        id: 'seoyoon-book',
        title: '질문이 있는 독서',
        subtitle: '생각 확장',
        accent: '#2b3d6a',
        background: 'linear-gradient(180deg, #526da5 0%, #2f477d 50%, #16274d 100%)',
      },
    ],
    miniCards: [
      { id: 'seoyoon-mini-1', title: '오늘의 코딩 미션', accent: '#63c9ff' },
      { id: 'seoyoon-mini-2', title: '짧은 다큐 브리프', accent: '#8cc4ff' },
      { id: 'seoyoon-mini-3', title: '독서 질문 카드', accent: '#f2b268' },
      { id: 'seoyoon-mini-4', title: '창작 아이디어 노트', accent: '#f39cb4' },
      { id: 'seoyoon-mini-5', title: '주말 프로젝트', accent: '#7bd9b0' },
    ],
  },
]

export function buildKidsProfiles(children: KidsProfileSeed[] = []): KidsProfile[] {
  return kidsProfileTemplates.map((template, index) => {
    const linkedChild = children[index]

    return {
      ...template,
      backendChildId: linkedChild?.childId ?? null,
      name: linkedChild?.childName ?? template.fallbackName,
      ageLabel: linkedChild?.ageLabel ?? template.fallbackAgeLabel,
      headerBadge: linkedChild ? `${linkedChild.childName} 맞춤 추천` : template.headerBadge,
      sectionTitle: linkedChild
        ? `${linkedChild.childName}에게 맞춘 아이들나라 추천`
        : template.sectionTitle,
      assistantActionLabel: linkedChild
        ? `${linkedChild.childName}와 ${template.assistantName} 부르기`
        : template.assistantActionLabel,
    }
  })
}

export const fallbackKidsProfiles = buildKidsProfiles()
export const defaultKidsProfile = fallbackKidsProfiles[0]
