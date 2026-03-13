import { createMediaItem, createSpotlight } from './factory'
import type { MediaItem, PageContent, QuickApp, Spotlight } from './home'

type ActionMode = 'primary' | 'secondary' | 'app' | 'item'

type BuildActionPageOptions = {
  basePageTitle: string
  mode: ActionMode
  source: Spotlight
}

function buildBackdrop(accent: string) {
  return `radial-gradient(circle at 76% 18%, color-mix(in srgb, ${accent} 42%, transparent), transparent 0 34%), linear-gradient(135deg, #fff6f6 0%, #ffe7e9 48%, #fffdfd 100%)`
}

function buildLabel(mode: ActionMode, title: string) {
  switch (mode) {
    case 'primary':
      return {
        pageTitle: `${title} 재생`,
        pageDescription: '선택한 콘텐츠를 바로 이어보는 흐름에 맞춘 전용 화면입니다.',
        readyLabel: `${title} 재생 화면 준비 완료`,
      }
    case 'secondary':
      return {
        pageTitle: `${title} 상세 정보`,
        pageDescription: '선택한 콘텐츠의 분위기와 핵심 포인트를 더 깊게 확인하는 화면입니다.',
        readyLabel: `${title} 상세 정보 화면 준비 완료`,
      }
    case 'app':
      return {
        pageTitle: `${title} 앱 화면`,
        pageDescription: '선택한 앱으로 들어가기 전에 핵심 동선과 추천 흐름을 먼저 확인하는 화면입니다.',
        readyLabel: `${title} 앱 화면 준비 완료`,
      }
    case 'item':
      return {
        pageTitle: `${title} 전용 화면`,
        pageDescription: '선택한 카드에 맞는 추천과 요약 정보를 한 번에 묶은 전용 화면입니다.',
        readyLabel: `${title} 전용 화면 준비 완료`,
      }
  }
}

function buildQuickApps(source: Spotlight, mode: ActionMode): QuickApp[] {
  const accent = source.accent || '#d9293a'
  const backdrop = buildBackdrop(accent)

  return [
    {
      id: `${source.id}-${mode}-overview`,
      name: '핵심 요약',
      category: '빠른 확인',
      shortcut: 'D1',
      accent,
      spotlight: createSpotlight(`${source.id}-${mode}-overview-spotlight`, `${source.title} 한눈에`, `${source.subtitle}`, `${source.description}`, '요약 보기', source.meta.slice(0, 3), source.chips.slice(0, 3), accent, backdrop, source.progress),
    },
    {
      id: `${source.id}-${mode}-mood`,
      name: '분위기 포인트',
      category: '무드',
      shortcut: 'D2',
      accent: '#d9293a',
      spotlight: createSpotlight(`${source.id}-${mode}-mood-spotlight`, '무드 포인트', '이 장면이 주는 분위기를 중심으로 다시 정리했습니다.', '색감, 장르, 몰입도를 기준으로 선택 흐름을 다시 정리해 다음 행동으로 이어지게 구성했습니다.', '무드 분석', source.chips.slice(0, 3), ['몰입감', '톤앤매너', '추천 흐름'], '#d9293a', buildBackdrop('#d9293a')),
    },
    {
      id: `${source.id}-${mode}-recommend`,
      name: '연관 추천',
      category: '추천',
      shortcut: 'D3',
      accent: '#c91f37',
      spotlight: createSpotlight(`${source.id}-${mode}-recommend-spotlight`, '연관 추천', '지금 선택과 결이 비슷한 흐름을 빠르게 보여줍니다.', '비슷한 속도감과 분위기의 추천을 묶어 다음 선택이 끊기지 않도록 설계했습니다.', '연결 추천', ['비슷한 톤', '빠른 이동', '몰입 유지'], source.chips.slice(0, 3), '#c91f37', buildBackdrop('#c91f37')),
    },
    {
      id: `${source.id}-${mode}-save`,
      name: '보관함',
      category: '저장',
      shortcut: 'D4',
      accent: '#b81b31',
      spotlight: createSpotlight(`${source.id}-${mode}-save-spotlight`, '보관함 정리', '나중에 다시 볼 흐름까지 고려한 저장 중심 화면.', '지금 바로 보지 않더라도 이후에 다시 찾아오기 쉽게 저장과 묶음 구성을 전면에 둡니다.', '보관 흐름', ['내 목록', '북마크', '정리'], ['다시 보기', '이어서 보기', '나중에'], '#b81b31', buildBackdrop('#b81b31')),
    },
    {
      id: `${source.id}-${mode}-back`,
      name: '기본 화면',
      category: '복귀',
      shortcut: 'D5',
      accent: '#e14545',
      spotlight: createSpotlight(`${source.id}-${mode}-back-spotlight`, '기본 화면으로', '원래 페이지 흐름으로 다시 돌아가는 복귀용 진입점.', '상세 화면 안에서도 원래 카테고리 구조로 빠르게 복귀할 수 있도록 복귀 동선을 전면에 둡니다.', '복귀 동선', ['빠른 복귀', '원래 페이지', '사이드바 연동'], ['돌아가기', '기본 허브', '탐색 유지'], '#e14545', buildBackdrop('#e14545')),
    },
  ]
}

function buildRows(source: Spotlight, mode: ActionMode): MediaItem[][] {
  const accent = source.accent || '#d9293a'
  const backdrop = buildBackdrop(accent)

  return [
    [
      createMediaItem(`${source.id}-${mode}-summary`, '핵심 포인트', source.subtitle, source.description, '상세 요약', source.meta.slice(0, 3), source.chips.slice(0, 2), accent, backdrop, '요약 보기', '핵심'),
      createMediaItem(`${source.id}-${mode}-tone`, '톤 앤 무드', '선택한 콘텐츠의 분위기 분석', '현재 선택이 주는 색감과 몰입도를 중심으로 다시 정리한 카드입니다.', '상세 요약', ['감정선', '분위기', '집중도'], ['다크 레드', '긴장감'], '#d9293a', buildBackdrop('#d9293a'), '무드 분석', '무드'),
      createMediaItem(`${source.id}-${mode}-flow`, '이어서 갈 흐름', '지금 선택과 이어지는 다음 단계', '현재 화면 이후에 어떤 행동을 이어갈지 한 번에 정리한 카드입니다.', '상세 요약', ['연결 동선', '다음 선택', '빠른 이동'], ['계속 보기', '관련 정보'], '#c61f34', buildBackdrop('#c61f34'), '동선 추천', '다음'),
      createMediaItem(`${source.id}-${mode}-save-card`, '보관 포인트', '나중에 다시 보기 위한 정리', '선택을 저장하고 나중에 다시 돌아오기 쉽게 묶은 카드입니다.', '상세 요약', ['보관', '북마크', '정리'], ['내 목록', '다시 보기'], '#b81b31', buildBackdrop('#b81b31'), '보관 추천', '저장'),
    ],
    [
      createMediaItem(`${source.id}-${mode}-related-1`, `${source.title}와 비슷한 흐름`, '분위기가 비슷한 추천', '현재 선택과 속도감과 톤이 유사한 흐름으로 다음 선택을 이어줍니다.', '연관 추천', source.meta.slice(0, 2), source.chips.slice(0, 2), '#d9293a', buildBackdrop('#d9293a'), '연결 추천', '추천'),
      createMediaItem(`${source.id}-${mode}-related-2`, '몰입형 추천', '지금 기분을 이어가는 선택', '이미 형성된 몰입도를 끊지 않도록 비슷한 결의 추천만 압축했습니다.', '연관 추천', ['몰입감', '빠른 전환', '연속 시청'], ['계속 보기', '지금 추천'], '#c91f37', buildBackdrop('#c91f37'), '몰입 추천', '몰입'),
      createMediaItem(`${source.id}-${mode}-related-3`, '가볍게 확장', '조금 다른 결로 넓혀보기', '완전히 다른 방향이 아니라 살짝 확장된 선택지를 보여주는 카드입니다.', '연관 추천', ['가벼운 확장', '비슷한 결', '선택 폭'], ['새로운 흐름', '균형 추천'], '#b81b31', buildBackdrop('#b81b31'), '확장 추천', '확장'),
      createMediaItem(`${source.id}-${mode}-related-4`, '다시 기본 허브로', '원래 카테고리 화면으로 복귀', '상세 화면 안에서 복잡해지지 않도록 언제든 기본 구조로 돌아갈 수 있게 했습니다.', '연관 추천', ['복귀', '기본 허브', '안정적'], ['홈 복귀', '원래 흐름'], '#e14545', buildBackdrop('#e14545'), '복귀 추천', '복귀'),
    ],
  ]
}

export function buildActionPage({
  basePageTitle,
  mode,
  source,
}: BuildActionPageOptions): PageContent {
  const { pageTitle, pageDescription, readyLabel } = buildLabel(mode, source.title)
  const rowsData = buildRows(source, mode)
  const quickApps = buildQuickApps(source, mode)

  return {
    id: `detail-${mode}-${source.id}`,
    headerEyebrow: `${basePageTitle} 상세 흐름`,
    headerTitle: pageTitle,
    headerDescription: pageDescription,
    readyLabel,
    primaryActionLabel: '한 번 더 보기',
    secondaryActionLabel: '기본 화면',
    appLaunchLabel: '여는 중',
    itemLaunchLabel: '여는 중',
    detailLabel: '기본 화면 복귀',
    dockEyebrow: '빠른 이동',
    dockTitle: `${source.title} 바로가기`,
    insight: {
      label: '선택한 버튼 화면',
      title: '버튼에 맞는 전용 페이지로 전환',
      description:
        '상태 문구만 바꾸지 않고, 실제로 선택한 버튼에 맞는 정보와 추천 흐름을 가진 화면으로 연결되도록 구성했습니다.',
      stats: [
        { label: '출발 화면', value: basePageTitle },
        { label: '선택 타입', value: mode === 'primary' ? '주요 액션' : mode === 'secondary' ? '상세 액션' : mode === 'app' ? '앱 진입' : '콘텐츠 진입' },
        { label: '핵심 톤', value: '레드 포인트' },
      ],
    },
    spotlight: quickApps[0].spotlight,
    quickApps,
    rows: [
      {
        id: `detail-${mode}-${source.id}-summary`,
        title: '선택한 항목 요약',
        description: '현재 선택의 핵심 포인트를 다시 정리해 한 화면에서 바로 확인할 수 있게 했습니다.',
        items: rowsData[0],
      },
      {
        id: `detail-${mode}-${source.id}-related`,
        title: '이어서 볼 흐름',
        description: '비슷한 결의 추천과 복귀 동선을 함께 배치해 다음 선택이 끊기지 않게 했습니다.',
        items: rowsData[1],
      },
    ],
  }
}
