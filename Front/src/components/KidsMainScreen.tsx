import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import type { ScreenId } from '../data/kidsProfileFlow'
import { KIDS_CATEGORIES } from '../data/kidsProfileFlow'
import { getCombinedRecommendations, getContentsByAge, getThemeByAge, type ChildProfile } from '../data/profiles'
import {
  DEFAULT_YOUTUBE_CATEGORY_SETTINGS,
  getEnabledYoutubeCategories,
  isYoutubeCategoryAllowed,
  YOUTUBE_QUICK_PICKS,
  type YoutubeCategoryId,
  type YoutubeCategorySettings,
} from '../data/youtubeExperience'
import type {
  AnalysisResponse,
  MonitorControlResponse,
  MonitorLiveResponse,
  ParentAlertResponse,
  ParentChildResponse,
  ParentViewingHistoryResponse,
  RuntimeSettingsResponse,
  SystemHealthResponse,
  YoutubeVideoCatalogItem,
} from '../lib/api'
import { analyzeYoutube, getRelatedYoutubeVideos, searchYoutubeVideos } from '../lib/api'
import { formatMinutes, getRiskTone, summarizeAlert, summarizeHistoryItem } from '../lib/integration'
import { KidsContentCard } from './KidsContentCard'
import { KidsLayout } from './KidsLayout'

const backdropV = { hidden: { opacity: 0 }, visible: { opacity: 1 } }
const panelV = {
  hidden: { x: -440, opacity: 0 },
  visible: { x: 0, opacity: 1, transition: { type: 'spring' as const, damping: 24, stiffness: 220 } },
  exit: { x: -440, opacity: 0, transition: { duration: 0.22, ease: 'easeIn' as const } },
}
const contentV = {
  enter: (dir: number) => ({ x: dir * 48, opacity: 0 }),
  center: { x: 0, opacity: 1, transition: { type: 'spring' as const, damping: 22, stiffness: 260 } },
  exit: (dir: number) => ({ x: dir * -48, opacity: 0, transition: { duration: 0.18 } }),
}

const THINQ_MOBILE_UI_URL = import.meta.env.VITE_THINQ_UI_URL ?? 'http://localhost:4174/'

function buildFallbackCatalogItems() {
  return YOUTUBE_QUICK_PICKS.map((pick) => ({
    videoId: pick.videoId,
    title: pick.title,
    channelTitle: '추천 영상',
    description: pick.description,
    thumbnailUrl: buildYoutubeThumbnailUrl(pick.videoId),
    publishedAt: null,
  }))
}

function mergeUniqueYoutubeItems(...collections: YoutubeVideoCatalogItem[][]) {
  const dedupedItems = new Map<string, YoutubeVideoCatalogItem>()

  for (const collection of collections) {
    for (const item of collection) {
      if (!dedupedItems.has(item.videoId)) {
        dedupedItems.set(item.videoId, item)
      }
    }
  }

  return Array.from(dedupedItems.values())
}

function diversifyYoutubeItems(items: YoutubeVideoCatalogItem[], limit = 10) {
  const results: YoutubeVideoCatalogItem[] = []
  const seenVideoIds = new Set<string>()
  const seenChannels = new Set<string>()
  const seenTitleTokens = new Set<string>()

  for (const item of items) {
    if (seenVideoIds.has(item.videoId)) {
      continue
    }

    const normalizedChannel = (item.channelTitle ?? "").toLowerCase().trim()
    const normalizedTitle = (item.title ?? "").toLowerCase().trim()
    const titleKey = normalizedTitle.split(/\s+/).filter(Boolean).slice(0, 3).join(" ")

    const sameChannelPenalty = normalizedChannel && seenChannels.has(normalizedChannel)
    const sameTitlePenalty = titleKey && seenTitleTokens.has(titleKey)

    if (sameChannelPenalty && sameTitlePenalty) {
      continue
    }

    seenVideoIds.add(item.videoId)
    if (normalizedChannel) {
      seenChannels.add(normalizedChannel)
    }
    if (titleKey) {
      seenTitleTokens.add(titleKey)
    }

    results.push(item)
    if (results.length >= limit) {
      break
    }
  }

  return results
}

const YOUTUBE_PAGE_LABELS: Record<YoutubeCategoryId, string> = {
  film_animation: '애니',
  autos_vehicles: '탈것',
  music: '음악',
  pets_animals: '동물',
  sports: '스포츠',
  travel_events: '여행',
  gaming: '게임',
  people_blogs: '일상',
  comedy: '코미디',
  entertainment: '예능',
  news_politics: '뉴스',
  howto_style: '생활',
  education: '학습',
  science_technology: '과학',
  nonprofits_activism: '사회',
}

const YOUTUBE_CATEGORY_QUERY_SEEDS: Record<YoutubeCategoryId, string> = {
  film_animation: '아이 애니메이션 동화',
  autos_vehicles: '아이 자동차 탈것',
  music: '아이 음악 동요',
  pets_animals: '아이 동물 자연',
  sports: '아이 스포츠 체육',
  travel_events: '아이 여행 체험',
  gaming: '아이 게임 만들기',
  people_blogs: '아이 일상 브이로그',
  comedy: '아이 코미디 웃긴 영상',
  entertainment: '아이 예능 챌린지',
  news_politics: '아이 뉴스 시사',
  howto_style: '아이 만들기 생활',
  education: '아이 학습 교육',
  science_technology: '아이 과학 탐구',
  nonprofits_activism: '아이 사회 캠페인',
}

type Props = {
  onNavigate: (screen: ScreenId) => void
  onRequestProtectedUrl: (url: string) => void
  profiles: ChildProfile[]
  activeProfileId: string
  onSwitchProfile: (id: string) => void
  sharedMode: boolean
  onToggleSharedMode: () => void
  onUpdateTimeLimit: (profileId: string, minutes: number) => void
  activeChild: ParentChildResponse | null
  recentAlerts: ParentAlertResponse[]
  viewingHistory: ParentViewingHistoryResponse[]
  analysisHistory: AnalysisResponse[]
  latestAnalysis: AnalysisResponse | null
  runtimeSettings: RuntimeSettingsResponse | null
  systemHealth: SystemHealthResponse | null
  serverLoading: boolean
  onAnalyzeYoutube: (videoId: string) => Promise<void> | void
  analysisPending: boolean
  youtubeCategorySettings: YoutubeCategorySettings
  activeMonitor: MonitorControlResponse | null
  monitorLive: MonitorLiveResponse | null
  monitorPending: boolean
  onStopAddictionMonitor: () => Promise<void> | void
  initialPlaybackVideoId?: string | null
  onInitialPlaybackConsumed?: () => void
}

export function KidsMainScreen({
  onNavigate,
  onRequestProtectedUrl,
  profiles,
  activeProfileId,
  onSwitchProfile,
  sharedMode,
  onToggleSharedMode,
  activeChild,
  recentAlerts,
  viewingHistory,
  analysisHistory,
  latestAnalysis,
  runtimeSettings,
  systemHealth,
  serverLoading,
  onAnalyzeYoutube,
  analysisPending,
  youtubeCategorySettings,
  activeMonitor,
  monitorLive,
  monitorPending,
  onStopAddictionMonitor,
  initialPlaybackVideoId,
  onInitialPlaybackConsumed,
}: Props) {
  const [activeCategory, setActiveCategory] = useState('home')
  const [panelOpen, setPanelOpen] = useState(false)
  const [slideDir, setSlideDir] = useState(1)
  const [selectedYoutubeId, setSelectedYoutubeId] = useState(YOUTUBE_QUICK_PICKS[0]?.id ?? '')
  const [submittedVideoId, setSubmittedVideoId] = useState(YOUTUBE_QUICK_PICKS[0]?.videoId ?? '')
  const [playbackVideoId, setPlaybackVideoId] = useState('')
  const [selectedPlaybackItem, setSelectedPlaybackItem] = useState<YoutubeVideoCatalogItem | null>(null)
  const [dismissedVideoIds, setDismissedVideoIds] = useState<string[]>([])
  const [activeYoutubeCategoryId, setActiveYoutubeCategoryId] = useState<YoutubeCategoryId | 'all'>('all')
  const [youtubeSearchQuery, setYoutubeSearchQuery] = useState('')
  const [youtubeExamples, setYoutubeExamples] = useState<YoutubeVideoCatalogItem[]>(buildFallbackCatalogItems)
  const [youtubeSearchResults, setYoutubeSearchResults] = useState<YoutubeVideoCatalogItem[]>([])
  const [youtubeRelatedResults, setYoutubeRelatedResults] = useState<YoutubeVideoCatalogItem[]>([])
  const [youtubeSearchPending, setYoutubeSearchPending] = useState(false)
  const [youtubeSearchError, setYoutubeSearchError] = useState<string | null>(null)
  const [youtubeRelatedPending, setYoutubeRelatedPending] = useState(false)
  const [youtubeRelatedError, setYoutubeRelatedError] = useState<string | null>(null)
  const [lastManualSearchQuery, setLastManualSearchQuery] = useState('')
  // 추천 영상 사전 검열 결과 (videoId → AnalysisResponse)
  const [catalogModeration, setCatalogModeration] = useState<Record<string, AnalysisResponse>>({})
  const catalogPendingRef = useRef<Set<string>>(new Set())
  const playerSectionRef = useRef<HTMLDivElement | null>(null)
  const RECOMMENDATION_TARGET_COUNT = 24

  const activeProfile = profiles.find((profile) => profile.id === activeProfileId) ?? profiles[0]
  const theme = getThemeByAge(activeProfile.age)
  const isBaby = theme.style === 'baby'

  const contents = sharedMode
    ? getCombinedRecommendations(profiles)
    : getContentsByAge(activeProfile.age, activeProfile.interests)

  const bg = sharedMode && profiles.length >= 2
    ? `linear-gradient(135deg, ${profiles[0].color}66 0%, ${profiles[1].color}66 100%)`
    : (activeProfile.bgGradient || activeProfile.color)

  const accent = sharedMode && profiles.length >= 2
    ? `linear-gradient(90deg, ${profiles[0].color} 0%, ${profiles[1].color} 100%)`
    : theme.accent

  const allowedCategories = useMemo(() => {
    const enabled = getEnabledYoutubeCategories(youtubeCategorySettings)
    if (enabled.length > 0) {
      return enabled
    }

    return getEnabledYoutubeCategories(DEFAULT_YOUTUBE_CATEGORY_SETTINGS)
  }, [youtubeCategorySettings])
  const selectedYoutubeCategory = useMemo(
    () => activeYoutubeCategoryId === 'all'
      ? null
      : allowedCategories.find((category) => category.id === activeYoutubeCategoryId) ?? null,
    [activeYoutubeCategoryId, allowedCategories],
  )

  const quickPicks = useMemo(() => {
    const pickMapByCategory: Record<string, string[]> = {
      home: ['education', 'science_technology', 'film_animation', 'music', 'people_blogs', 'entertainment'],
      percent: ['entertainment', 'people_blogs'],
      english: ['education'],
      nuree: ['science_technology', 'people_blogs', 'pets_animals'],
      books: ['education', 'film_animation'],
      songs: ['music'],
      char: ['film_animation', 'entertainment'],
    }

    const preferredCategoryIds = pickMapByCategory[activeCategory] ?? pickMapByCategory.home
    const allowedCategoryIds = new Set(allowedCategories.map((category) => category.id))
    const filtered = YOUTUBE_QUICK_PICKS.filter((pick) => allowedCategoryIds.has(pick.categoryId))

    return filtered
      .filter((pick) => preferredCategoryIds.includes(pick.categoryId))
      .concat(filtered.filter((pick) => !preferredCategoryIds.includes(pick.categoryId)))
      .slice(0, 6)
  }, [activeCategory, allowedCategories])

  const recommendationPages = useMemo(() => allowedCategories.map((category) => ({
    id: category.id,
    label: YOUTUBE_PAGE_LABELS[category.id] ?? category.shortLabel,
    querySeed: YOUTUBE_CATEGORY_QUERY_SEEDS[category.id] ?? category.shortLabel,
    accent: category.accent,
  })), [allowedCategories])

  const localFallbackExamples = useMemo(
    () => {
      const source = activeYoutubeCategoryId !== 'all'
        ? YOUTUBE_QUICK_PICKS.filter((pick) => pick.categoryId === activeYoutubeCategoryId)
        : quickPicks
      const fallbackSource = source.length > 0 ? source : quickPicks.length > 0 ? quickPicks : YOUTUBE_QUICK_PICKS

      return fallbackSource.map((pick) => ({
      videoId: pick.videoId,
      title: pick.title,
      channelTitle: '추천 영상',
      description: pick.description,
      thumbnailUrl: buildYoutubeThumbnailUrl(pick.videoId),
      publishedAt: null,
      }))
    },
    [activeYoutubeCategoryId, quickPicks],
  )

  const suggestionQueryByCategory = useMemo<Record<string, string>>(() => ({
    home: '공룡 교육',
    percent: '어린이 브이로그',
    english: '영어 동요',
    nuree: '동물 자연 다큐',
    books: '어린이 동화 읽기',
    songs: '어린이 동요',
    char: '어린이 애니메이션',
  }), [])

  const activeSuggestionQuery = suggestionQueryByCategory[activeCategory] ?? suggestionQueryByCategory.home
  const recommendationPageQuery = recommendationPages.find((page) => page.id === activeYoutubeCategoryId)?.querySeed ?? ''
  const youtubeCategoryQuery = recommendationPageQuery || selectedYoutubeCategory?.aliases?.[0] || selectedYoutubeCategory?.shortLabel || ''
  const effectiveSuggestionQuery = [activeSuggestionQuery, youtubeCategoryQuery].filter(Boolean).join(' ')
  const recommendationQuery = lastManualSearchQuery || effectiveSuggestionQuery
  const recommendationHeadline = youtubeSearchResults.length > 0 && lastManualSearchQuery
    ? `검색 결과 추천 · ${lastManualSearchQuery}`
    : recommendationQuery
  const dbWatchedVideoIds = useMemo(() => new Set([
    ...viewingHistory.map((item) => item.videoId),
    ...analysisHistory.map((item) => item.videoId ?? ''),
  ].filter(Boolean)), [analysisHistory, viewingHistory])
  const hiddenRecommendationVideoIds = useMemo(() => new Set([
    playbackVideoId,
    ...dismissedVideoIds,
    ...dbWatchedVideoIds,
  ].filter(Boolean)), [dbWatchedVideoIds, dismissedVideoIds, playbackVideoId])
  const mergedRecommendationItems = useMemo(() => {
    const mergedItems = lastManualSearchQuery
      ? mergeUniqueYoutubeItems(youtubeSearchResults, youtubeExamples, youtubeRelatedResults, localFallbackExamples)
      : mergeUniqueYoutubeItems(youtubeExamples, youtubeRelatedResults, localFallbackExamples)

    return diversifyYoutubeItems(mergedItems, RECOMMENDATION_TARGET_COUNT)
  }, [lastManualSearchQuery, localFallbackExamples, youtubeExamples, youtubeRelatedResults, youtubeSearchResults, RECOMMENDATION_TARGET_COUNT])

  // 하나라도 차단 사유 있으면 true (Fail-Fast)
  function isBlockedByModeration(analysis: AnalysisResponse): boolean {
    if (analysis.harmful) return true
    if (analysis.hasViolence) return true
    if (analysis.hasNudity) return true
    if (analysis.blockedByCategory) return true
    if (!analysis.playback.allowed) return true
    if (analysis.categoryNameKo && !isYoutubeCategoryAllowed(analysis.categoryNameKo, youtubeCategorySettings)) return true
    return false
  }

  // 검열 완료된 차단 영상을 제거한 추천 목록
  const filteredRecommendationItems = useMemo(() => {
    return mergedRecommendationItems.filter((item) => {
      const moderation = catalogModeration[item.videoId]
      if (!moderation) return true // 아직 분석 전 → 일단 표시
      return !isBlockedByModeration(moderation)
    })
    // isBlockedByModeration이 youtubeCategorySettings를 클로저로 사용하므로 deps 포함
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mergedRecommendationItems, catalogModeration, youtubeCategorySettings])

  const blockedRecommendationCount = useMemo(() => {
    return mergedRecommendationItems.reduce((count, item) => {
      const moderation = catalogModeration[item.videoId]
      return count + (moderation && isBlockedByModeration(moderation) ? 1 : 0)
    }, 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mergedRecommendationItems, catalogModeration, youtubeCategorySettings])
  const derivedPlaybackItem = useMemo(() => {
    const sources = [
      ...youtubeExamples,
      ...youtubeSearchResults,
      ...youtubeRelatedResults,
      ...localFallbackExamples,
    ]

    return sources.find((item) => item.videoId === playbackVideoId) ?? null
  }, [localFallbackExamples, playbackVideoId, youtubeExamples, youtubeRelatedResults, youtubeSearchResults])
  const playbackItem = selectedPlaybackItem ?? derivedPlaybackItem
  const watchedSearchResults = useMemo(() => {
    const query = youtubeSearchQuery.trim().toLowerCase()
    if (!query) {
      return []
    }

    const byVideoId = new Map<string, YoutubeVideoCatalogItem>()
    for (const item of analysisHistory) {
      if (!item.videoId) {
        continue
      }

      const haystack = [
        item.title ?? '',
        item.categoryNameKo ?? '',
        item.inputUrl ?? '',
      ].join(' ').toLowerCase()

      if (!haystack.includes(query)) {
        continue
      }

      if (!byVideoId.has(item.videoId)) {
        byVideoId.set(item.videoId, {
          videoId: item.videoId,
          title: item.title ?? `유튜브 영상 ${item.videoId}`,
          channelTitle: '예전에 본 영상',
          description: item.inputUrl,
          thumbnailUrl: buildYoutubeThumbnailUrl(item.videoId),
          publishedAt: item.createdAt ?? null,
        })
      }
    }

    return Array.from(byVideoId.values()).filter((item) => item.videoId !== playbackVideoId)
  }, [analysisHistory, playbackVideoId, youtubeSearchQuery])

  const selectedYoutubePick = quickPicks.find((pick) => pick.id === selectedYoutubeId) ?? quickPicks[0] ?? null

  // 현재 재생 중인 영상의 분석 결과 (catalogModeration 우선, 없으면 latestAnalysis 사용)
  const currentVideoAnalysis = catalogModeration[playbackVideoId]
    ?? (latestAnalysis?.videoId === playbackVideoId ? latestAnalysis : null)

  const blockedByUserCategory = currentVideoAnalysis?.categoryNameKo
    ? !isYoutubeCategoryAllowed(currentVideoAnalysis.categoryNameKo, youtubeCategorySettings)
    : false

  // 어떤 사유든 하나라도 차단 사유 있으면 iframe 제거
  const currentVideoBlocked = currentVideoAnalysis !== null && isBlockedByModeration(currentVideoAnalysis)
  const recentReplayItems = useMemo(() => {
    const items = new Map<string, {
      key: string
      videoId: string
      title: string
      subtitle: string
      badge: string
      catalogItem: YoutubeVideoCatalogItem
    }>()

    const registerItem = (
      videoId: string | null | undefined,
      title: string | null | undefined,
      subtitle: string,
      badge: string,
      catalogItem?: YoutubeVideoCatalogItem | null,
    ) => {
      if (!videoId || items.has(videoId)) {
        return
      }

      items.set(videoId, {
        key: `${badge}-${videoId}`,
        videoId,
        title: title?.trim() || `유튜브 영상 ${videoId}`,
        subtitle,
        badge,
        catalogItem: catalogItem ?? {
          videoId,
          title: title?.trim() || `유튜브 영상 ${videoId}`,
          channelTitle: badge,
          description: subtitle,
          thumbnailUrl: buildYoutubeThumbnailUrl(videoId),
          publishedAt: null,
        },
      })
    }

    registerItem(
      playbackVideoId,
      playbackItem?.title ?? latestAnalysis?.title,
      monitorLive?.active ? `시청 케어 ${monitorLive.status ?? '실행 중'}` : '지금 보고 있는 영상',
      '실시간 시청 케어',
      playbackItem,
    )

    analysisHistory.forEach((item) => {
      registerItem(
        item.videoId,
        item.title,
        item.playback.allowed ? '사전 확인을 통과한 영상' : '주의가 필요했던 영상',
        '최근 확인 내역',
      )
    })

    viewingHistory.forEach((item) => {
      registerItem(
        item.videoId,
        summarizeHistoryItem(item),
        item.watchTime || '최근 시청 기록',
        '최근 시청',
      )
    })

    return Array.from(items.values()).slice(0, 8)
  }, [analysisHistory, latestAnalysis?.title, monitorLive?.active, monitorLive?.status, playbackItem, playbackVideoId, viewingHistory])

  const canOpenAnalyzedVideo = Boolean(playbackVideoId.length > 0 && !currentVideoBlocked)
  const playerEmbedUrl = canOpenAnalyzedVideo
    ? `https://www.youtube.com/embed/${playbackVideoId}?autoplay=1&rel=0&modestbranding=1`
    : null

  const guidanceLabel = latestAnalysis
    ? latestAnalysis.playback.addictionRiskLevel === 'HIGH'
      ? '짧게 보고 쉬는 시간을 먼저 가져가요.'
      : latestAnalysis.playback.addictionRiskLevel === 'MEDIUM'
        ? '보호자와 함께 보는 흐름을 권장해요.'
        : '현재 설정 기준으로 편안하게 볼 수 있어요.'
    : null

  const healthStatus = useMemo(() => {
    if (!systemHealth) {
      return '상태를 확인하고 있어요'
    }

    return [
      systemHealth.backend.status,
      systemHealth.database.status,
      systemHealth.mainModel.status,
      systemHealth.addictionModel.status,
    ].every((status) => status === 'UP')
      ? '보호 기능이 정상 연결되어 있어요'
      : '일부 보호 기능을 다시 확인해 주세요'
  }, [systemHealth])

  const summaryCards = [
    {
      label: '오늘 시청',
      value: formatMinutes(activeChild?.todayWatchMinutes),
      description: activeChild?.viewingAllowedNow ? '현재 시청 가능 시간이에요.' : '현재는 보호 시간대예요.',
    },
    {
      label: '허용 카테고리',
      value: `${allowedCategories.length}개`,
      description: allowedCategories.map((category) => category.shortLabel).join(' · ') || '아직 선택된 카테고리가 없어요.',
    },
    {
      label: '최근 기록',
      value: viewingHistory[0] ? summarizeHistoryItem(viewingHistory[0]) : '아직 시청 기록이 없어요.',
      description: recentAlerts[0] ? summarizeAlert(recentAlerts[0]) : '최근 알림 없이 안정적으로 보고 있어요.',
    },
  ]

  // 시청 기록 화면에서 "아이들TV 재생" 클릭 시 해당 영상을 자동 로드
  useEffect(() => {
    if (!initialPlaybackVideoId) return
    setPlaybackVideoId(initialPlaybackVideoId)
    setSubmittedVideoId(initialPlaybackVideoId)
    onInitialPlaybackConsumed?.()
    // onInitialPlaybackConsumed 레퍼런스 변경에 반응할 필요 없으므로 deps에서 제외
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPlaybackVideoId])

  // 추천 영상 로드 시 백그라운드 사전 분석 (Fail-Fast Pre-screening)
  // 새 영상이 들어올 때마다 미분석 항목을 순차 분석, 차단 판정 즉시 filteredRecommendationItems에서 제거
  useEffect(() => {
    if (!activeChild?.childId) return
    const childId = activeChild.childId

    const MAX_PRESCREENING = 15
    const candidates = mergedRecommendationItems
      .slice(0, MAX_PRESCREENING)
      .filter((item) => !catalogPendingRef.current.has(item.videoId) && !catalogModeration[item.videoId])

    for (const item of candidates) {
      catalogPendingRef.current.add(item.videoId)
      void analyzeYoutube(item.videoId, childId, { saveResult: false, requestSource: 'kids-prescreening' })
        .then((analysis) => {
          setCatalogModeration((prev) => ({ ...prev, [item.videoId]: analysis }))
        })
        .catch(() => {
          // 분석 실패 시 표시 유지 (차단하지 않음)
        })
        .finally(() => {
          catalogPendingRef.current.delete(item.videoId)
        })
    }
    // catalogModeration을 deps에서 제외 — 결과가 올 때마다 재실행하면 루프 발생
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mergedRecommendationItems, activeChild?.childId])

  useEffect(() => {
    if (recommendationPages.length === 0) {
      setActiveYoutubeCategoryId('all')
      return
    }

    // 'all'은 유효한 선택 — 강제 리셋하지 않음
    if (activeYoutubeCategoryId === 'all') {
      return
    }

    if (!recommendationPages.some((page) => page.id === activeYoutubeCategoryId)) {
      setActiveYoutubeCategoryId(recommendationPages[0].id)
    }
  }, [activeYoutubeCategoryId, recommendationPages])

  useEffect(() => {
    if (quickPicks.length === 0) {
      setSelectedYoutubeId('')
      setSubmittedVideoId('')
      return
    }

    const current = quickPicks.find((pick) => pick.id === selectedYoutubeId) ?? quickPicks[0]
    if (!current) {
      return
    }

    // selectedYoutubeId가 유효한 quickPick과 맞지 않을 때만 두 값을 같이 동기화
    // (카테고리 변경 등으로 quickPicks 목록이 바뀐 경우)
    // submittedVideoId를 deps에서 제외해 카드 클릭 시 덮어쓰지 않도록 함
    if (current.id !== selectedYoutubeId) {
      setSelectedYoutubeId(current.id)
      setSubmittedVideoId(current.videoId)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quickPicks, selectedYoutubeId])

  useEffect(() => {
    if (!playbackVideoId) {
      return
    }

    playerSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [playbackVideoId])

  useEffect(() => {
    let cancelled = false
    setYoutubeSearchPending(true)
    setYoutubeSearchError(null)

    void searchYoutubeVideos(recommendationQuery, 10)
      .then((response) => {
        if (cancelled) {
          return
        }
        setYoutubeExamples(response.items.length > 0 ? response.items : localFallbackExamples)
      })
      .catch((error) => {
        if (cancelled) {
          return
        }
        setYoutubeExamples(localFallbackExamples)
        setYoutubeSearchError(error instanceof Error ? error.message : '추천 영상을 불러오지 못했어요.')
      })
      .finally(() => {
        if (!cancelled) {
          setYoutubeSearchPending(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [localFallbackExamples, recommendationQuery, activeYoutubeCategoryId])

  function handleYoutubeSearchSubmit() {
    const trimmed = youtubeSearchQuery.trim()
    if (!trimmed) {
      setYoutubeSearchResults([])
      setLastManualSearchQuery('')
      return
    }

    setYoutubeSearchPending(true)
    setYoutubeSearchError(null)
    setLastManualSearchQuery(trimmed)

    void searchYoutubeVideos(trimmed, 10)
      .then((response) => {
        setYoutubeSearchResults(response.items)
      })
      .catch((error) => {
        setYoutubeSearchResults([])
        setYoutubeSearchError(error instanceof Error ? error.message : '검색 결과를 불러오지 못했어요.')
      })
      .finally(() => {
        setYoutubeSearchPending(false)
      })
  }

  function handleYoutubeVideoCardClick(item: YoutubeVideoCatalogItem) {
    setSubmittedVideoId(item.videoId)
    setPlaybackVideoId(item.videoId)
    setSelectedPlaybackItem(item)
    setDismissedVideoIds((previous) => (
      previous.includes(item.videoId)
        ? previous
        : [...previous, item.videoId]
    ))
    void onAnalyzeYoutube(item.videoId)
  }

  useEffect(() => {
    if (!submittedVideoId) {
      setYoutubeRelatedResults([])
      return
    }

    let cancelled = false
    setYoutubeRelatedPending(true)
    setYoutubeRelatedError(null)

    void getRelatedYoutubeVideos(submittedVideoId, 10)
      .then((response) => {
        if (cancelled) {
          return
        }
        setYoutubeRelatedResults(response.items.filter((item) => item.videoId !== submittedVideoId))
      })
      .catch((error) => {
        if (cancelled) {
          return
        }
        setYoutubeRelatedResults([])
        setYoutubeRelatedError(error instanceof Error ? error.message : '관련 영상을 불러오지 못했어요.')
      })
      .finally(() => {
        if (!cancelled) {
          setYoutubeRelatedPending(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [submittedVideoId])

  function switchTab(id: string) {
    const currentIndex = profiles.findIndex((profile) => profile.id === activeProfileId)
    const nextIndex = profiles.findIndex((profile) => profile.id === id)
    setSlideDir(nextIndex >= currentIndex ? 1 : -1)
    if (sharedMode) {
      onToggleSharedMode()
    }
    onSwitchProfile(id)
  }

  function toggleShared() {
    setSlideDir(sharedMode ? -1 : 1)
    onToggleSharedMode()
  }

  const sidebar = (
    <>
      <button
        type="button"
        className={`wos-profile-btn${panelOpen ? ' wos-profile-btn--active' : ''}`}
        style={{
          background: sharedMode && profiles.length >= 2
            ? `linear-gradient(135deg, ${profiles[0].color} 0%, ${profiles[1].color} 100%)`
            : activeProfile.color,
        }}
        onClick={() => setPanelOpen((value) => !value)}
        aria-label="프로필 메뉴"
      >
        {sharedMode ? '함께' : activeProfile.name[0]}
      </button>

      <SideBtn label="알림">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </SideBtn>
      <SideBtn label="설정" onClick={() => onNavigate('settings')}>
        <circle cx={12} cy={12} r={3} />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </SideBtn>
      <SideBtn label="리포트" onClick={() => onNavigate('thinq')}>
        <path d="M12 2v20" />
        <path d="m6 8 6-6 6 6" />
        <circle cx={12} cy={18} r={3} />
      </SideBtn>
    </>
  )

  const topbar = (
    <>
      <div className="kids-tabs">
        {profiles.map((profile) => {
          const isActive = !sharedMode && profile.id === activeProfileId
          const profileTheme = getThemeByAge(profile.age)
          return (
            <button
              key={profile.id}
              type="button"
              className={`kids-tab${isActive ? ' kids-tab--active' : ''}`}
              style={isActive ? { background: profile.color, borderColor: profile.color, color: '#fff' } : {}}
              onClick={() => switchTab(profile.id)}
            >
              <div className="kids-tab-dot" style={{ background: profile.color }} />
              <span>{profile.name}</span>
              <span className="kids-tab-age">{profile.age}세</span>
              {isActive && (
                <span className="kids-tab-theme-chip" style={{ background: profileTheme.accent }}>
                  {profileTheme.label}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <motion.button
        type="button"
        className={`kids-shared-btn${sharedMode ? ' kids-shared-btn--on' : ''}`}
        style={sharedMode ? {
          background: `linear-gradient(90deg, ${profiles[0]?.color ?? '#ccc'} 0%, ${profiles[1]?.color ?? profiles[0]?.color ?? '#ccc'} 100%)`,
          color: '#fff',
          borderColor: 'transparent',
        } : {}}
        onClick={toggleShared}
        whileTap={{ scale: 0.95 }}
      >
        <span>{sharedMode ? '함께 보기' : '개별 보기'}</span>
        <span>{sharedMode ? '가족이 함께 보는 추천으로 전환돼요.' : '현재 자녀 기준 화면이에요.'}</span>
      </motion.button>
    </>
  )

  const footer = (
    <>
      <div className="kids-vision-bar">
        <div className="kids-vision-icon" style={{ background: accent }}>안심</div>
        <div>
          <p className="kids-vision-title">보호 설정과 시청 흐름이 함께 반영돼요</p>
          <p className="kids-vision-sub">시청 기록, 알림, 유튜브 확인 결과가 같은 기준으로 이어집니다.</p>
        </div>
      </div>

      <button
        type="button"
        className="kids-char-btn bounce-on-click"
        style={{ background: accent }}
        onClick={() => window.open(THINQ_MOBILE_UI_URL, '_blank', 'noopener,noreferrer')}
      >
        <span className="kids-char-name">키즈 리포트 보기</span>
        <div className="kids-char-sub">
          {latestAnalysis?.title ? `최근 확인: ${latestAnalysis.title}` : '최근 확인 결과와 추천 흐름을 한 번에 이어서 볼 수 있어요.'}
        </div>
      </button>
    </>
  )

  return (
    <>
      <AnimatePresence>
        {sharedMode && (
          <motion.div
            className="kids-shared-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            style={{
              background: `linear-gradient(120deg, ${profiles[0]?.color ?? '#FFB3D1'}44 0%, ${profiles[1]?.color ?? '#90C8F0'}44 50%, ${profiles[0]?.color ?? '#FFB3D1'}22 100%)`,
            }}
          />
        )}
      </AnimatePresence>

      <KidsLayout sidebar={sidebar} topbar={topbar} footer={footer} background={bg} themeClass="wos-sidenav--kids">
        <AnimatePresence mode="wait">
          <motion.div
            key={sharedMode ? 'shared-content' : activeProfileId}
            className="kids-content-panel"
            custom={slideDir}
            variants={contentV}
            initial="enter"
            animate="center"
            exit="exit"
          >
            <div className="kids-theme-badge" style={{ background: accent }}>
              {sharedMode ? `${profiles.map((profile) => profile.name).join(' · ')} 함께 보기 추천` : `${activeProfile.name} 맞춤 키즈 홈`}
            </div>

            <section className="kids-server-board">
              {summaryCards.map((card) => (
                <article key={card.label} className="kids-server-card">
                  <span className="kids-server-kicker">{card.label}</span>
                  <strong className="kids-server-value">{card.value}</strong>
                  <p className="kids-server-copy">{card.description}</p>
                </article>
              ))}
            </section>

            {!sharedMode && (
              <div className="kids-category-bar">
                {KIDS_CATEGORIES.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    className={`kids-cat-chip${category.id === activeCategory ? ' kids-cat-chip--active' : ''}`}
                    style={category.id === activeCategory ? { background: theme.accent } : {}}
                    onClick={() => setActiveCategory(category.id)}
                  >
                    <span className="kids-cat-emoji">{category.emoji}</span>
                    {category.id === activeCategory && <span className="kids-cat-label">{category.label}</span>}
                  </button>
                ))}
              </div>
            )}

            <div className="kids-section-header">
              <span className="kids-section-badge" style={{ background: accent }}>
                {sharedMode ? '함께 추천' : '맞춤 추천'}
              </span>
              <span className="kids-section-title">
                {sharedMode ? '가족이 같이 보기 좋은 콘텐츠' : `${activeProfile.name}에게 맞는 홈 콘텐츠`}
              </span>
            </div>

            <div className="kcc-grid kcc-grid--row">
              {contents.map((item) => (
                <KidsContentCard
                  key={item.id}
                  title={item.title}
                  sub={item.sub}
                  color={item.color}
                  badge={item.badge}
                  size={isBaby && !sharedMode ? 'large' : 'normal'}
                />
              ))}
            </div>

            <section className="kids-analysis-shell" ref={playerSectionRef}>
              <div className="kids-analysis-card">
                <div className="kids-analysis-head">
                  <div>
                    <h3 className="kids-analysis-title">시청 전 확인 결과</h3>
                    <p className="kids-analysis-sub">
                      {selectedYoutubePick
                        ? `${selectedYoutubePick.title} 카드를 기준으로 확인해요.`
                        : '확인할 영상을 먼저 골라 주세요.'}
                    </p>
                  </div>
                  <span className="kids-analysis-chip">
                    {analysisPending ? '확인 중' : serverLoading ? '동기화 중' : healthStatus}
                  </span>
                </div>

                <div className="kids-analysis-meta">
                  <span>최근 확인 {analysisHistory.length}건</span>
                  <span>시청 케어 {runtimeSettings?.addictionMonitorEnabled ? '켜짐' : '꺼짐'}</span>
                  <span>개인정보 동의 {runtimeSettings?.privacyConsent ? '켜짐' : '꺼짐'}</span>
                </div>

                <div className="kids-analysis-player">
                  {playerEmbedUrl ? (
                    <iframe
                      title={latestAnalysis?.title ?? playbackItem?.title ?? '키즈 유튜브 재생기'}
                      src={playerEmbedUrl}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                      sandbox="allow-scripts allow-same-origin allow-forms allow-presentation"
                      allowFullScreen
                    />
                  ) : (
                    <div className="kids-analysis-player__placeholder">
                      <strong>안전하게 볼 영상을 고르면 바로 재생돼요.</strong>
                      <p>추천 영상이나 검색 결과를 누르면 이 자리에서 바로 시청할 수 있어요.</p>
                    </div>
                  )}
                </div>

                {latestAnalysis ? (
                  <>
                  <div className={`kids-analysis-result${canOpenAnalyzedVideo ? ' kids-analysis-result--ok' : ' kids-analysis-result--blocked'}`}>
                    <div>
                      <strong>
                        {blockedByUserCategory
                          ? '현재 설정에서 허용하지 않은 카테고리예요'
                          : latestAnalysis.playback.allowed
                            ? '이 영상은 지금 볼 수 있어요'
                            : '다른 영상을 추천할게요'}
                      </strong>
                      <p>
                        {blockedByUserCategory
                          ? `${latestAnalysis.categoryNameKo ?? '이 카테고리'}는 사용자 설정에서 꺼져 있어요.`
                          : latestAnalysis.playback.message}
                      </p>
                      {guidanceLabel && <p className="kids-analysis-risk">시청 안내: {guidanceLabel}</p>}
                      {latestAnalysis.categoryNameKo && (
                        <p className="kids-analysis-risk">
                          분류된 카테고리: {latestAnalysis.categoryNameKo}
                        </p>
                      )}
                      {activeMonitor && (
                        <p className="kids-analysis-risk">
                          카메라 상태: {activeMonitor.active ? '실행 중' : activeMonitor.status} · {activeMonitor.message}
                        </p>
                      )}
                    </div>
                    <div className="kids-analysis-actions">
                      {canOpenAnalyzedVideo && (
                        <button
                          type="button"
                          className="kids-analysis-open"
                          onClick={() => onRequestProtectedUrl(`https://www.youtube.com/watch?v=${playbackVideoId}`)}
                        >
                          영상 열기
                        </button>
                      )}
                      {activeMonitor?.active && (
                        <button
                          type="button"
                          className="kids-analysis-stop"
                          onClick={() => void onStopAddictionMonitor()}
                          disabled={monitorPending}
                        >
                          {monitorPending ? '카메라 종료 중' : '카메라 종료'}
                        </button>
                      )}
                    </div>
                  </div>
                  </>
                ) : (
                  <div className="kids-analysis-placeholder">
                    {playbackVideoId
                      ? '영상 재생은 시작됐고, 안전 분석 결과를 정리하고 있어요.'
                      : '추천 영상이나 검색 결과를 누르면 이 자리에서 바로 재생돼요.'}
                  </div>
                )}
              </div>

              <div className="kids-analysis-aside">
                <div className="kids-aside-card kids-aside-card--history">
                  <div className="kids-aside-card__head">
                    <h4>시청한 영상 리스트</h4>
                    <span>{recentReplayItems.length}개</span>
                  </div>
                  <p className="kids-aside-card__copy">최근 시청, 최근 확인, 실시간 시청 케어 기록을 한 곳에서 다시 볼 수 있어요.</p>
                  <div className="kids-aside-video-list">
                    {recentReplayItems.map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        className={`kids-aside-video-item${playbackVideoId === item.videoId ? ' kids-aside-video-item--active' : ''}`}
                        onClick={() => handleYoutubeVideoCardClick(item.catalogItem)}
                      >
                        <img src={item.catalogItem.thumbnailUrl ?? buildYoutubeThumbnailUrl(item.videoId)} alt={item.title} />
                        <div className="kids-aside-video-item__body">
                          <span className="kids-aside-video-item__badge">{item.badge}</span>
                          <strong>{item.title}</strong>
                          <p>{item.subtitle}</p>
                        </div>
                      </button>
                    ))}
                    {recentReplayItems.length === 0 && (
                      <p className="kids-aside-video-list__empty">아직 다시 볼 영상이 없어요.</p>
                    )}
                  </div>
                </div>
                <div className="kids-aside-card">
                  <h4>보호 상태</h4>
                  <p>최근 위험도: <span style={{ color: getRiskTone(recentAlerts[0]?.riskLevel) }}>{recentAlerts[0]?.riskLevel ?? '안정'}</span></p>
                  <p>{summarizeAlert(recentAlerts[0])}</p>
                  <p>오늘 제한: {formatMinutes(activeChild?.watchPolicy?.dailyLimitMinutes)}</p>
                  <button type="button" className="kids-mini-link" onClick={() => onNavigate('settings-youtube')}>
                    유튜브 필터와 보호 설정 보기
                  </button>
                </div>
              </div>
            </section>

            <section className="kids-youtube-library">
              <div className="kids-youtube-library__head">
                <div>
                  <h3 className="kids-analysis-title">유튜브 추천 둘러보기</h3>
                  <p className="kids-analysis-sub">부모가 허용한 카테고리 안에서 추천 영상과 검색 결과를 골라 볼 수 있어요.</p>
                </div>
                <span className="kids-analysis-chip">{activeChild?.childName ?? activeProfile.name}</span>
              </div>

              <div className="kids-youtube-search">
                <label className="kids-youtube-search__label" htmlFor="kids-youtube-search-input">유튜브 영상 검색</label>
                <div className="kids-youtube-search__bar">
                  <input
                    id="kids-youtube-search-input"
                    className="kids-youtube-search__input"
                    value={youtubeSearchQuery}
                    onChange={(event) => setYoutubeSearchQuery(event.target.value)}
                    placeholder="공룡, 동물, 학습 영상처럼 검색해 보세요"
                  />
                  <button
                    type="button"
                    className="kids-youtube-search__button"
                    onClick={handleYoutubeSearchSubmit}
                    disabled={youtubeSearchPending}
                  >
                    {youtubeSearchPending ? '검색 중' : '검색'}
                  </button>
                </div>
              </div>

              <div className="kids-youtube-library__filters">
                <button
                  type="button"
                  className={`kids-youtube-filter${activeYoutubeCategoryId === 'all' ? ' kids-youtube-filter--active' : ''}`}
                  onClick={() => setActiveYoutubeCategoryId('all')}
                >
                  전체
                </button>
                {allowedCategories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    className={`kids-youtube-filter${activeYoutubeCategoryId === category.id ? ' kids-youtube-filter--active' : ''}`}
                    style={{ background: `${category.accent}22`, color: category.accent }}
                    onClick={() => setActiveYoutubeCategoryId(category.id)}
                  >
                    {category.shortLabel}
                  </button>
                ))}
              </div>

              {(youtubeRelatedResults.filter((item) => !hiddenRecommendationVideoIds.has(item.videoId)).length > 0 || youtubeRelatedPending || youtubeRelatedError) && (
                <>
                  <div className="kids-youtube-section-head">
                    <strong>지금 보는 영상과 비슷한 추천</strong>
                    <span>{playbackItem?.title ?? (submittedVideoId ? '현재 영상 기준' : '선택 대기')}</span>
                  </div>
                  <div className="kids-youtube-thumb-grid">
                    {youtubeRelatedResults.filter((item) => !hiddenRecommendationVideoIds.has(item.videoId)).map((item) => (
                      <button
                        key={`related-${item.videoId}`}
                        type="button"
                        className="kids-youtube-thumb-card"
                        onClick={() => handleYoutubeVideoCardClick(item)}
                      >
                        <div className="kids-youtube-thumb-card__image">
                          <img src={item.thumbnailUrl ?? buildYoutubeThumbnailUrl(item.videoId)} alt={item.title} />
                        </div>
                        <div className="kids-youtube-thumb-card__body">
                          <strong>{item.title}</strong>
                          <p>{item.channelTitle ?? '유튜브 채널'}</p>
                        </div>
                      </button>
                    ))}
                    {youtubeRelatedPending && (
                      <div className="kids-youtube-empty">현재 고른 영상 기준으로 비슷한 추천을 찾고 있어요.</div>
                    )}
                    {youtubeRelatedError && (
                      <div className="kids-youtube-empty">{youtubeRelatedError}</div>
                    )}
                  </div>
                </>
              )}

              <div className="kids-youtube-section-head">
                <strong>추천 영상</strong>
                <span>
                  {recommendationHeadline}
                  {blockedRecommendationCount > 0 && (
                    <span className="kids-rec-blocked-badge" title={`카테고리·유해 콘텐츠 필터로 ${blockedRecommendationCount}개 제거됨`}>
                      {` · ${blockedRecommendationCount}개 필터됨`}
                    </span>
                  )}
                </span>
              </div>

              <div className="kids-youtube-thumb-grid">
                {filteredRecommendationItems.filter((item) => !hiddenRecommendationVideoIds.has(item.videoId)).map((item) => (
                  <button
                    key={`example-${item.videoId}`}
                    type="button"
                    className="kids-youtube-thumb-card"
                    onClick={() => handleYoutubeVideoCardClick(item)}
                  >
                    <div className="kids-youtube-thumb-card__image">
                      <img src={item.thumbnailUrl ?? buildYoutubeThumbnailUrl(item.videoId)} alt={item.title} />
                    </div>
                    <div className="kids-youtube-thumb-card__body">
                      <strong>{item.title}</strong>
                      <p>{item.channelTitle ?? '유튜브 채널'}</p>
                    </div>
                  </button>
                ))}
                {!youtubeSearchPending && filteredRecommendationItems.filter((item) => !hiddenRecommendationVideoIds.has(item.videoId)).length === 0 && (
                  <div className="kids-youtube-empty">
                    {youtubeSearchResults.length > 0 ? '검색한 조건에 맞는 추천 영상을 아직 불러오지 못했어요.' : '추천 영상을 아직 불러오지 못했어요.'}
                  </div>
                )}
              </div>

              {watchedSearchResults.length > 0 && (
                <>
                  <div className="kids-youtube-section-head">
                    <strong>예전에 본 영상 다시 찾기</strong>
                    <span>{watchedSearchResults.length}개</span>
                  </div>
                  <div className="kids-youtube-thumb-grid">
                    {watchedSearchResults.map((item) => (
                      <button
                        key={`watched-${item.videoId}`}
                        type="button"
                        className="kids-youtube-thumb-card"
                        onClick={() => handleYoutubeVideoCardClick(item)}
                      >
                        <div className="kids-youtube-thumb-card__image">
                          <img src={item.thumbnailUrl ?? buildYoutubeThumbnailUrl(item.videoId)} alt={item.title} />
                        </div>
                        <div className="kids-youtube-thumb-card__body">
                          <strong>{item.title}</strong>
                          <p>{item.channelTitle ?? '시청 기록'}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {(youtubeSearchError && youtubeSearchResults.length === 0) && (
                <>
                  <div className="kids-youtube-section-head">
                    <strong>검색 결과</strong>
                    <span>{youtubeSearchResults.length}개</span>
                  </div>
                  <div className="kids-youtube-thumb-grid">
                    {youtubeSearchResults.map((item) => (
                      <button
                        key={`search-${item.videoId}`}
                        type="button"
                        className="kids-youtube-thumb-card"
                        onClick={() => handleYoutubeVideoCardClick(item)}
                      >
                        <div className="kids-youtube-thumb-card__image">
                          <img src={item.thumbnailUrl ?? buildYoutubeThumbnailUrl(item.videoId)} alt={item.title} />
                        </div>
                        <div className="kids-youtube-thumb-card__body">
                          <strong>{item.title}</strong>
                          <p>{item.channelTitle ?? '유튜브 채널'}</p>
                        </div>
                      </button>
                    ))}
                    {youtubeSearchError && (
                      <div className="kids-youtube-empty">{youtubeSearchError}</div>
                    )}
                  </div>
                </>
              )}
            </section>

          </motion.div>
        </AnimatePresence>
      </KidsLayout>

      <AnimatePresence>
        {panelOpen && (
          <>
            <motion.div
              className="wos-backdrop"
              variants={backdropV}
              initial="hidden"
              animate="visible"
              exit="hidden"
              transition={{ duration: 0.22 }}
              onClick={() => setPanelOpen(false)}
            />
            <motion.aside className="wos-account-panel kids-account-panel" variants={panelV} initial="hidden" animate="visible" exit="exit">
              <div className="wap-header">
                <span className="wap-title">프로필 전환</span>
              </div>

              <button
                type="button"
                className="wap-account-row wap-account-row--btn"
                onClick={() => {
                  setPanelOpen(false)
                  onNavigate('pin')
                }}
              >
                <div className="wap-avatar wap-avatar--purple">L</div>
                <span className="wap-name">보호자</span>
                <span className="wap-kids-chip" style={{ background: '#7B4FC8' }}>관리</span>
              </button>

              {profiles.map((profile) => (
                <button
                  key={profile.id}
                  type="button"
                  className="wap-account-row wap-account-row--btn"
                  onClick={() => {
                    setPanelOpen(false)
                    onSwitchProfile(profile.id)
                  }}
                >
                  <div className="wap-avatar" style={{ background: profile.color }}>{profile.name[0]}</div>
                  <span className="wap-name">{profile.name}</span>
                </button>
              ))}

              <button
                type="button"
                className="wap-account-row wap-account-row--btn wap-account-row--add"
                onClick={() => { setPanelOpen(false); onNavigate('profile-select') }}
              >
                <div className="wap-avatar wap-avatar--add">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.4} strokeLinecap="round" width={20} height={20}>
                    <line x1={12} y1={5} x2={12} y2={19} />
                    <line x1={5} y1={12} x2={19} y2={12} />
                  </svg>
                </div>
                <span className="wap-name">프로필 추가</span>
              </button>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

function buildYoutubeThumbnailUrl(videoId: string) {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
}

function SideBtn({
  label,
  onClick,
  children,
}: { label: string; onClick?: () => void; children: ReactNode }) {
  return (
    <button type="button" className="wos-nav-icon wos-nav-icon--kids" title={label} onClick={onClick}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" width={22} height={22}>
        {children}
      </svg>
    </button>
  )
}
