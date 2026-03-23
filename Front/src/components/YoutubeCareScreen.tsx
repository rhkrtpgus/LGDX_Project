import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import type { ScreenId } from '../data/kidsProfileFlow'
import {
  getEnabledYoutubeCategories,
  isYoutubeCategoryAllowed,
  type YoutubeCategorySettings,
} from '../data/youtubeExperience'
import {
  analyzeYoutube,
  getRelatedYoutubeVideos,
  searchYoutubeVideos,
  type AnalysisResponse,
  type MonitorControlResponse,
  type MonitorLiveResponse,
  type ParentAlertResponse,
  type ParentChildResponse,
  type ParentViewingHistoryResponse,
  type RuntimeSettingsResponse,
  type SystemHealthResponse,
  type YoutubeVideoCatalogItem,
} from '../lib/api'
import { formatMinutes, getRiskTone, summarizeAlert, summarizeHistoryItem } from '../lib/integration'

type Props = {
  onBack: () => void
  onNavigate: (screen: ScreenId) => void
  activeChild: ParentChildResponse | null
  latestAnalysis: AnalysisResponse | null
  analysisHistory: AnalysisResponse[]
  viewingHistory: ParentViewingHistoryResponse[]
  recentAlerts: ParentAlertResponse[]
  runtimeSettings: RuntimeSettingsResponse | null
  systemHealth: SystemHealthResponse | null
  serverLoading: boolean
  youtubeCategorySettings: YoutubeCategorySettings
  onAnalyzeYoutube: (videoId: string) => Promise<void> | void
  analysisPending: boolean
  activeMonitor: MonitorControlResponse | null
  monitorLive: MonitorLiveResponse | null
  monitorPending: boolean
  onStopAddictionMonitor: () => Promise<void> | void
}

type ModeratedVideo = {
  item: YoutubeVideoCatalogItem
  analysis: AnalysisResponse
  reasons: string[]
}

type ModerationSummary = {
  total: number
  passed: number
  blocked: number
  pending: number
}

const DEFAULT_QUERY = '공룡'
const MAX_CATALOG_ITEMS = 10

export function YoutubeCareScreen({
  onBack,
  onNavigate,
  activeChild,
  latestAnalysis,
  analysisHistory,
  viewingHistory,
  recentAlerts,
  runtimeSettings,
  systemHealth,
  serverLoading,
  youtubeCategorySettings,
  onAnalyzeYoutube,
  analysisPending,
  activeMonitor,
  monitorLive,
  monitorPending,
  onStopAddictionMonitor,
}: Props) {
  const [searchQuery, setSearchQuery] = useState(DEFAULT_QUERY)
  const [submittedQuery, setSubmittedQuery] = useState(DEFAULT_QUERY)
  const [searchCatalog, setSearchCatalog] = useState<YoutubeVideoCatalogItem[]>([])
  const [searchModeration, setSearchModeration] = useState<Record<string, AnalysisResponse>>({})
  const [searchPending, setSearchPending] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [selectedVideo, setSelectedVideo] = useState<YoutubeVideoCatalogItem | null>(null)
  const [relatedCatalog, setRelatedCatalog] = useState<YoutubeVideoCatalogItem[]>([])
  const [relatedModeration, setRelatedModeration] = useState<Record<string, AnalysisResponse>>({})
  const [relatedPending, setRelatedPending] = useState(false)
  const [relatedError, setRelatedError] = useState<string | null>(null)
  const searchRunIdRef = useRef(0)
  const relatedRunIdRef = useRef(0)
  const autoSearchDoneRef = useRef<number | null>(null)
  const playerSectionRef = useRef<HTMLElement | null>(null)

  const allowedCategories = useMemo(
    () => getEnabledYoutubeCategories(youtubeCategorySettings),
    [youtubeCategorySettings],
  )

  const evaluateCatalog = useCallback((
    items: YoutubeVideoCatalogItem[],
    moderationMap: Record<string, AnalysisResponse>,
  ) => {
    const visible: ModeratedVideo[] = []
    const hidden: ModeratedVideo[] = []

    items.forEach((item) => {
      const analysis = moderationMap[item.videoId]
      if (!analysis) {
        return
      }

      const reasons = buildBlockedReasons(analysis, youtubeCategorySettings, activeChild)
      const video = { item, analysis, reasons }
      if (reasons.length === 0) {
        visible.push(video)
        return
      }

      hidden.push(video)
    })

    const summary: ModerationSummary = {
      total: items.length,
      passed: visible.length,
      blocked: hidden.length,
      pending: Math.max(items.length - visible.length - hidden.length, 0),
    }

    return {
      visible,
      hidden,
      summary,
    }
  }, [activeChild, youtubeCategorySettings])

  const searchEvaluation = useMemo(
    () => evaluateCatalog(searchCatalog, searchModeration),
    [evaluateCatalog, searchCatalog, searchModeration],
  )

  const relatedEvaluation = useMemo(
    () => evaluateCatalog(relatedCatalog, relatedModeration),
    [evaluateCatalog, relatedCatalog, relatedModeration],
  )

  const selectedModeration = useMemo(() => {
    if (!selectedVideo) {
      return null
    }

    if (latestAnalysis?.videoId === selectedVideo.videoId) {
      return latestAnalysis
    }

    return searchModeration[selectedVideo.videoId] ?? relatedModeration[selectedVideo.videoId] ?? null
  }, [latestAnalysis, relatedModeration, searchModeration, selectedVideo])

  const selectedBlockedReasons = useMemo(
    () => selectedModeration ? buildBlockedReasons(selectedModeration, youtubeCategorySettings, activeChild) : [],
    [activeChild, selectedModeration, youtubeCategorySettings],
  )

  const hasSelectedVideo = Boolean(selectedVideo)
  const canPlaySelectedVideo = Boolean(selectedVideo && selectedBlockedReasons.length === 0)
  const playerEmbedUrl = selectedVideo
    ? `https://www.youtube.com/embed/${selectedVideo.videoId}?autoplay=1&rel=0&modestbranding=1`
    : null

  const healthStatus = useMemo(() => {
    if (!systemHealth) {
      return '검색과 검열 상태를 불러오고 있어요.'
    }

    const allUp = [
      systemHealth.backend.status,
      systemHealth.database.status,
      systemHealth.mainModel.status,
      systemHealth.addictionModel.status,
    ].every((status) => status === 'UP')

    return allUp ? '검색 API와 인공지능 검열이 모두 준비되었습니다.' : '일부 연결 상태를 다시 확인해 주세요.'
  }, [systemHealth])

  const runCatalogModeration = useCallback(async (
    items: YoutubeVideoCatalogItem[],
    runId: number,
    mode: 'search' | 'related',
  ) => {
    if (!activeChild?.childId) {
      return
    }

    for (const item of items.slice(0, MAX_CATALOG_ITEMS)) {
      const analysis = await analyzeYoutube(item.videoId, activeChild.childId, {
        saveResult: false,
        requestSource: mode === 'search' ? 'youtube-search' : 'youtube-related',
      })

      if ((mode === 'search' && runId !== searchRunIdRef.current) || (mode === 'related' && runId !== relatedRunIdRef.current)) {
        return
      }

      if (mode === 'search') {
        setSearchModeration((prev) => ({
          ...prev,
          [item.videoId]: analysis,
        }))
      } else {
        setRelatedModeration((prev) => ({
          ...prev,
          [item.videoId]: analysis,
        }))
      }
    }
  }, [activeChild?.childId])

  const runSearch = useCallback(async (query: string) => {
    if (!activeChild?.childId) {
      setSearchError('먼저 자녀 프로필을 선택해 주세요.')
      return
    }

    const trimmed = query.trim()
    if (!trimmed) {
      setSearchCatalog([])
      setSearchModeration({})
      setSearchError('검색어를 입력해 주세요.')
      return
    }

    const runId = searchRunIdRef.current + 1
    searchRunIdRef.current = runId
    setSubmittedQuery(trimmed)
    setSearchPending(true)
    setSearchError(null)
    setSearchCatalog([])
    setSearchModeration({})
    setSelectedVideo(null)
    setRelatedCatalog([])
    setRelatedModeration({})
    setRelatedError(null)

    try {
      const response = await searchYoutubeVideos(trimmed, MAX_CATALOG_ITEMS)
      if (runId !== searchRunIdRef.current) {
        return
      }

      setSearchCatalog(response.items)
      await runCatalogModeration(response.items, runId, 'search')
    } catch (error) {
      if (runId !== searchRunIdRef.current) {
        return
      }
      setSearchError(error instanceof Error ? error.message : '유튜브 검색을 불러오지 못했습니다.')
    } finally {
      if (runId === searchRunIdRef.current) {
        setSearchPending(false)
      }
    }
  }, [activeChild?.childId, runCatalogModeration])

  const runRelated = useCallback(async (video: YoutubeVideoCatalogItem) => {
    if (!activeChild?.childId) {
      return
    }

    const runId = relatedRunIdRef.current + 1
    relatedRunIdRef.current = runId
    setRelatedPending(true)
    setRelatedError(null)
    setRelatedCatalog([])
    setRelatedModeration({})

    try {
      const response = await getRelatedYoutubeVideos(video.videoId, MAX_CATALOG_ITEMS)
      if (runId !== relatedRunIdRef.current) {
        return
      }

      const nextItems = response.items.filter((item) => item.videoId !== video.videoId)
      setRelatedCatalog(nextItems)
      await runCatalogModeration(nextItems, runId, 'related')
    } catch (error) {
      if (runId !== relatedRunIdRef.current) {
        return
      }
      setRelatedError(error instanceof Error ? error.message : '관련 영상을 불러오지 못했습니다.')
    } finally {
      if (runId === relatedRunIdRef.current) {
        setRelatedPending(false)
      }
    }
  }, [activeChild?.childId, runCatalogModeration])

  useEffect(() => {
    autoSearchDoneRef.current = null
    setSearchCatalog([])
    setSearchModeration({})
    setSelectedVideo(null)
    setRelatedCatalog([])
    setRelatedModeration({})
  }, [activeChild?.childId])

  useEffect(() => {
    if (!activeChild?.childId) {
      return
    }

    if (autoSearchDoneRef.current === activeChild.childId) {
      return
    }

    autoSearchDoneRef.current = activeChild.childId
    void runSearch(DEFAULT_QUERY)
  }, [activeChild?.childId, runSearch])

  useEffect(() => {
    if (!selectedVideo) {
      return
    }

    void runRelated(selectedVideo)
  }, [runRelated, selectedVideo])

  useEffect(() => {
    if (!selectedVideo) {
      return
    }

    playerSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [selectedVideo])

  const handleSearchSubmit = useCallback((event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault()
    void runSearch(searchQuery)
  }, [runSearch, searchQuery])

  const handleVideoSelect = useCallback((video: YoutubeVideoCatalogItem) => {
    setSelectedVideo(video)
    void onAnalyzeYoutube(video.videoId)
  }, [onAnalyzeYoutube])

  return (
    <div className="screen youtube-care-screen">
      <div className="youtube-care-page youtube-care-page--search">
        <section className="youtube-care-hero youtube-care-hero--search">
          <div>
            <span className="youtube-care-kicker">유튜브 시청 전 검색 검열</span>
            <h2>검색 결과와 관련 영상을 먼저 걸러서 안전한 영상만 보여드릴게요.</h2>
            <p>
              검색 결과를 가져온 뒤 카테고리 필터와 인공지능 유해성 분석을 순서대로 적용하고,
              통과한 영상만 재생 화면과 추천 목록에 남깁니다.
            </p>
          </div>
          <div className="youtube-care-hero__actions">
            <button type="button" className="youtube-care-ghost" onClick={onBack}>
              메인으로
            </button>
            <button type="button" className="youtube-care-ghost" onClick={() => onNavigate('settings-youtube')}>
              유튜브 필터 보기
            </button>
          </div>
        </section>

        <section className="youtube-care-search">
          <form className="youtube-care-search__form" onSubmit={handleSearchSubmit}>
            <label className="youtube-care-search__label" htmlFor="youtube-search-input">검색어</label>
            <div className="youtube-care-search__bar">
              <input
                id="youtube-search-input"
                className="youtube-care-search__input"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="공룡, 동화, 교육 영상처럼 검색해 보세요"
              />
              <button type="submit" className="youtube-care-search__button" disabled={searchPending}>
                {searchPending ? '검열 중' : '검색'}
              </button>
            </div>
          </form>

          <div className="youtube-care-summary">
            <div className="youtube-care-summary__card">
              <span>현재 자녀</span>
              <strong>{activeChild?.childName ?? '선택 필요'}</strong>
              <p>일일 시청 제한 {formatMinutes(activeChild?.watchPolicy?.dailyLimitMinutes)}</p>
            </div>
            <div className="youtube-care-summary__card">
              <span>허용 카테고리</span>
              <strong>{allowedCategories.length}개</strong>
              <p>{allowedCategories.map((category) => category.shortLabel).join(' · ') || '아직 허용된 카테고리가 없어요.'}</p>
            </div>
            <div className="youtube-care-summary__card">
              <span>검열 상태</span>
              <strong>{searchPending || relatedPending || analysisPending ? '검열 진행 중' : serverLoading ? '불러오는 중' : healthStatus}</strong>
              <p>
                검색 결과 → 인공지능 검열 → 재생창 재생 → 관련 영상 재검열 흐름으로 동작합니다.
                시청 케어는 {runtimeSettings?.addictionMonitorEnabled ? '켜짐' : '꺼짐'} 상태예요.
              </p>
            </div>
          </div>
        </section>

        <section className="youtube-care-status-board">
          <article className="youtube-care-status-card youtube-care-status-card--pending">
            <span>검색 결과</span>
            <strong>{searchEvaluation.summary.total}개</strong>
            <p>{submittedQuery} 검색어로 가져온 후보 영상</p>
          </article>
          <article className="youtube-care-status-card youtube-care-status-card--ok">
            <span>통과</span>
            <strong>{searchEvaluation.summary.passed}개</strong>
            <p>안전하다고 판단되어 화면에 남은 영상</p>
          </article>
          <article className="youtube-care-status-card youtube-care-status-card--blocked">
            <span>숨김</span>
            <strong>{searchEvaluation.summary.blocked}개</strong>
            <p>유해성 또는 카테고리 기준으로 제거된 영상</p>
          </article>
          <article className="youtube-care-status-card youtube-care-status-card--pending">
            <span>대기</span>
            <strong>{searchEvaluation.summary.pending}개</strong>
            <p>아직 인공지능 검열이 끝나지 않은 결과</p>
          </article>
        </section>

        <div className="youtube-care-layout">
          <section className="youtube-care-results">
            <div className="youtube-care-section-head">
              <div>
                <h3>안전한 검색 결과</h3>
                <p>유튜브 검색 결과를 먼저 검열해서 안전한 영상만 목록에 남깁니다.</p>
              </div>
              <span className="youtube-care-pill">{submittedQuery}</span>
            </div>

            <div className="youtube-care-video-list">
              {searchEvaluation.visible.map(({ item, analysis }) => (
                <button
                  key={item.videoId}
                  type="button"
                  className={`youtube-care-video-card${selectedVideo?.videoId === item.videoId ? ' youtube-care-video-card--active' : ''}`}
                  onClick={() => handleVideoSelect(item)}
                >
                  <div className="youtube-care-video-card__thumb">
                    {item.thumbnailUrl ? <img src={item.thumbnailUrl} alt={item.title} /> : <span>썸네일</span>}
                  </div>
                  <div className="youtube-care-video-card__body">
                    <strong>{item.title}</strong>
                    <p>{item.channelTitle ?? '채널 정보가 없어요'}</p>
                    <span>{analysis.categoryNameKo ?? '분류 중'} · 안전 통과</span>
                  </div>
                </button>
              ))}
              {searchPending && searchEvaluation.visible.length === 0 && (
                <div className="youtube-care-empty">검색 결과를 가져와 인공지능 검열을 진행하고 있어요.</div>
              )}
              {!searchPending && searchEvaluation.summary.total === 0 && !searchError && (
                <div className="youtube-care-empty">검색 결과가 없어요. 다른 검색어로 다시 찾아볼까요?</div>
              )}
              {searchError && <div className="youtube-care-empty youtube-care-empty--error">{searchError}</div>}
            </div>

            {searchEvaluation.hidden.length > 0 && (
              <section className="youtube-care-hidden">
                <div className="youtube-care-hidden__head">
                  <h3>숨겨진 검색 결과</h3>
                  <p>유해성 탐지, 카테고리 차단, 재생 정책 때문에 제외된 영상입니다.</p>
                </div>
                <div className="youtube-care-hidden__list">
                  {searchEvaluation.hidden.map(({ item, reasons }) => (
                    <article key={item.videoId} className="youtube-care-hidden__item">
                      <div>
                        <strong>{item.title}</strong>
                        <p>{item.channelTitle ?? '채널 정보가 없어요'}</p>
                      </div>
                      <div className="youtube-care-hidden__reasons">
                        {reasons.map((reason) => (
                          <span key={reason}>{reason}</span>
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}
          </section>

          <section className="youtube-care-player" ref={playerSectionRef}>
            <div className="youtube-care-section-head">
              <div>
                <h3>안전 재생 화면</h3>
                <p>선택한 안전 영상을 재생창에서 보여주고, 아래에서 관련 영상을 다시 검열합니다.</p>
              </div>
              <span className="youtube-care-pill">{hasSelectedVideo ? '재생 중' : '선택 대기'}</span>
            </div>

            <div className="youtube-care-player__frame">
              {playerEmbedUrl ? (
                <iframe
                  title={selectedVideo?.title ?? '유튜브 재생기'}
                  src={playerEmbedUrl}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-presentation"
                  allowFullScreen
                />
              ) : (
                <div className="youtube-care-player__placeholder">
                  <strong>{selectedVideo ? '영상을 준비하고 있어요.' : '재생할 영상을 선택해 주세요.'}</strong>
                  <p>
                    {selectedVideo && selectedBlockedReasons.length > 0
                      ? selectedBlockedReasons.join(' · ')
                      : '안전 통과된 검색 결과나 관련 추천을 누르면 이 영역에서 바로 재생됩니다.'}
                  </p>
                </div>
              )}
            </div>

            <div className="kids-analysis-shell youtube-care-analysis">
              <div className="kids-analysis-card">
                <div className="kids-analysis-head">
                  <div>
                    <h3 className="kids-analysis-title">현재 영상 검열 결과</h3>
                    <p className="kids-analysis-sub">
                      {selectedVideo
                        ? `${selectedVideo.title} 영상에 대한 메타데이터 필터와 인공지능 분석 결과입니다.`
                        : '안전 결과를 먼저 누르면 이 영역에 현재 영상 결과가 표시됩니다.'}
                    </p>
                  </div>
                  <span className="kids-analysis-chip">
                    {analysisPending ? '저장 및 시청 케어 연결 중' : hasSelectedVideo ? '재생 중' : '대기 중'}
                  </span>
                </div>

                {selectedModeration ? (
                  <div className={`kids-analysis-result${canPlaySelectedVideo ? ' kids-analysis-result--ok' : ' kids-analysis-result--blocked'}`}>
                    <div>
                      <strong>{canPlaySelectedVideo ? '현재 영상은 안전하게 재생할 수 있어요.' : '현재 영상은 재생할 수 없어요.'}</strong>
                      <p>{selectedModeration.playback.message}</p>
                      {selectedModeration.categoryNameKo && (
                        <p className="kids-analysis-risk">분류된 카테고리: {selectedModeration.categoryNameKo}</p>
                      )}
                      {selectedModeration.harmfulReasons.length > 0 && (
                        <p className="kids-analysis-risk">감지 사유: {selectedModeration.harmfulReasons.join(' · ')}</p>
                      )}
                      {activeMonitor && (
                        <p className="kids-analysis-risk">
                          시청 케어 상태: {activeMonitor.active ? '실행 중' : activeMonitor.status} · {activeMonitor.message}
                        </p>
                      )}
                    </div>
                    <div className="kids-analysis-actions">
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
                ) : (
                  <div className="kids-analysis-placeholder">
                    아직 선택한 영상이 없어요. 안전 검색 결과에서 영상을 고르면 검열 결과와 재생 화면이 같이 열립니다.
                  </div>
                )}
              </div>

              <div className="kids-analysis-aside">
                <div className="kids-aside-card">
                  <h4>실시간 시청 케어</h4>
                  <p>상태: {monitorLive?.active ? '실행 중' : monitorLive?.status ?? '대기'}</p>
                  <p>눈 깜박임: {monitorLive?.blinkBpm != null ? `${Math.round(monitorLive.blinkBpm)}회/분` : '아직 없음'}</p>
                  <p>자세: {monitorLive?.poseStatus ?? '아직 없음'}</p>
                  <p>거리: {monitorLive?.screenDistanceCm != null ? `${Math.round(monitorLive.screenDistanceCm)}cm` : '아직 없음'}</p>
                  <p>정면 응시: {monitorLive?.frontFacing == null ? '아직 없음' : monitorLive.frontFacing ? '정면' : '다른 방향'}</p>
                  <p>집중도: {monitorLive?.focusScore != null ? `${Math.round(monitorLive.focusScore)}점` : '아직 없음'}</p>
                </div>

                <div className="kids-aside-card">
                  <h4>최근 확인 내역</h4>
                  {analysisHistory.slice(0, 3).map((item) => (
                    <p key={`${item.analysisId}-${item.inputUrl}`}>
                      {item.title ?? item.inputUrl} · {item.playback.allowed ? '시청 가능' : '주의 필요'}
                    </p>
                  ))}
                  {analysisHistory.length === 0 && <p>아직 확인한 영상이 없어요.</p>}
                </div>

                <div className="kids-aside-card">
                  <h4>최근 시청 및 알림</h4>
                  {viewingHistory.slice(0, 2).map((item) => (
                    <p key={item.viewingId}>{summarizeHistoryItem(item)}</p>
                  ))}
                  {viewingHistory.length === 0 && <p>아직 시청 기록이 없어요.</p>}
                  <p>최근 알림: <span style={{ color: getRiskTone(recentAlerts[0]?.riskLevel) }}>{recentAlerts[0]?.riskLevel ?? '안정'}</span></p>
                  <p>{summarizeAlert(recentAlerts[0])}</p>
                </div>
              </div>
            </div>

            {selectedVideo && (
              <section className="youtube-care-related">
                <div className="youtube-care-section-head">
                  <div>
                    <h3>관련 영상 추천</h3>
                    <p>현재 영상과 연결된 추천 결과도 다시 검열해서 안전한 추천만 남깁니다.</p>
                  </div>
                  <span className="youtube-care-pill">{relatedEvaluation.summary.passed}개 안전 통과</span>
                </div>

                <div className="youtube-care-video-list youtube-care-video-list--related">
                  {relatedEvaluation.visible.map(({ item, analysis }) => (
                    <button
                      key={item.videoId}
                      type="button"
                      className={`youtube-care-video-card${selectedVideo.videoId === item.videoId ? ' youtube-care-video-card--active' : ''}`}
                      onClick={() => handleVideoSelect(item)}
                    >
                      <div className="youtube-care-video-card__thumb">
                        {item.thumbnailUrl ? <img src={item.thumbnailUrl} alt={item.title} /> : <span>썸네일</span>}
                      </div>
                      <div className="youtube-care-video-card__body">
                        <strong>{item.title}</strong>
                        <p>{item.channelTitle ?? '채널 정보가 없어요'}</p>
                        <span>{analysis.categoryNameKo ?? '분류 중'} · 안전 통과</span>
                      </div>
                    </button>
                  ))}
                  {relatedPending && relatedEvaluation.visible.length === 0 && (
                    <div className="youtube-care-empty">관련 영상을 불러와 다시 검열하고 있어요.</div>
                  )}
                  {!relatedPending && relatedEvaluation.summary.total === 0 && !relatedError && (
                    <div className="youtube-care-empty">현재 영상과 연결된 안전 추천 영상이 아직 없어요.</div>
                  )}
                  {relatedError && <div className="youtube-care-empty youtube-care-empty--error">{relatedError}</div>}
                </div>

                {relatedEvaluation.hidden.length > 0 && (
                  <section className="youtube-care-hidden">
                    <div className="youtube-care-hidden__head">
                      <h3>숨겨진 관련 영상</h3>
                      <p>현재 영상 아래 추천되었지만 검열에서 걸러진 영상입니다.</p>
                    </div>
                    <div className="youtube-care-hidden__list">
                      {relatedEvaluation.hidden.map(({ item, reasons }) => (
                        <article key={item.videoId} className="youtube-care-hidden__item">
                          <div>
                            <strong>{item.title}</strong>
                            <p>{item.channelTitle ?? '채널 정보가 없어요'}</p>
                          </div>
                          <div className="youtube-care-hidden__reasons">
                            {reasons.map((reason) => (
                              <span key={reason}>{reason}</span>
                            ))}
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                )}
              </section>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

function buildBlockedReasons(
  analysis: AnalysisResponse,
  youtubeCategorySettings: YoutubeCategorySettings,
  activeChild: ParentChildResponse | null,
) {
  const reasons: string[] = []

  if (activeChild?.watchPolicy?.autoBlockEnabled) {
    const reachedDailyLimit = activeChild.todayWatchMinutes >= (activeChild.watchPolicy?.dailyLimitMinutes ?? 0)
    const bedtimeLocked = activeChild.watchPolicy.bedtimeLockEnabled && !activeChild.viewingAllowedNow

    if (!activeChild.viewingAllowedNow) {
      reasons.push(bedtimeLocked ? '부모 설정 취침 잠금' : '부모 설정 시청 시간 제한')
    } else if (reachedDailyLimit) {
      reasons.push('부모 설정 일일 시청 제한')
    }
  }

  if (analysis.categoryNameKo && !isYoutubeCategoryAllowed(analysis.categoryNameKo, youtubeCategorySettings)) {
    reasons.push('카테고리 필터 차단')
  }
  if (analysis.blockedByCategory) {
    reasons.push('기본 카테고리 차단')
  }
  if (analysis.hasViolence) {
    reasons.push('폭력 감지')
  }
  if (analysis.hasNudity) {
    reasons.push('노출 감지')
  }
  if (!analysis.playback.allowed) {
    reasons.push('재생 불가')
  }

  return reasons
}
