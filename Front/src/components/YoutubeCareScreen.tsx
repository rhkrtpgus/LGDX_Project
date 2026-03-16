import { useEffect, useMemo, useRef, useState } from 'react'
import type { ScreenId } from '../data/kidsProfileFlow'
import {
  getEnabledYoutubeCategories,
  isYoutubeCategoryAllowed,
  YOUTUBE_CATEGORY_OPTIONS,
  YOUTUBE_QUICK_PICKS,
  type YoutubeCategorySettings,
} from '../data/youtubeExperience'
import {
  analyzeYoutube,
  type AnalysisResponse,
  type MonitorControlResponse,
  type MonitorLiveResponse,
  type ParentAlertResponse,
  type ParentChildResponse,
  type ParentViewingHistoryResponse,
  type RuntimeSettingsResponse,
  type SystemHealthResponse,
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
  onAnalyzeYoutube: (videoUrl: string) => Promise<void> | void
  analysisPending: boolean
  activeMonitor: MonitorControlResponse | null
  monitorLive: MonitorLiveResponse | null
  monitorPending: boolean
  onStopAddictionMonitor: () => Promise<void> | void
}

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
  const [activeCategoryId, setActiveCategoryId] = useState<string>('all')
  const [selectedYoutubeId, setSelectedYoutubeId] = useState(YOUTUBE_QUICK_PICKS[0]?.id ?? '')
  const [submittedUrl, setSubmittedUrl] = useState(YOUTUBE_QUICK_PICKS[0]?.url ?? '')
  const [validatedResults, setValidatedResults] = useState<Record<string, AnalysisResponse>>({})
  const [validationPending, setValidationPending] = useState(false)
  const autoTriggeredUrlRef = useRef<string | null>(null)

  const allowedCategories = useMemo(
    () => getEnabledYoutubeCategories(youtubeCategorySettings),
    [youtubeCategorySettings],
  )

  const quickPicks = useMemo(() => {
    const allowed = YOUTUBE_QUICK_PICKS.filter((pick) => youtubeCategorySettings[pick.categoryId])

    if (activeCategoryId === 'all') {
      return allowed.slice(0, 6)
    }

    return allowed
      .filter((pick) => pick.categoryId === activeCategoryId)
      .slice(0, 6)
  }, [activeCategoryId, youtubeCategorySettings])

  useEffect(() => {
    setValidatedResults({})
    setSelectedYoutubeId('')
    setSubmittedUrl('')
    autoTriggeredUrlRef.current = null
  }, [activeChild?.childId])

  useEffect(() => {
    if (allowedCategories.length === 0) {
      setActiveCategoryId('all')
      return
    }

    if (activeCategoryId === 'all') {
      return
    }

    const hasActiveCategory = allowedCategories.some((category) => category.id === activeCategoryId)
    if (!hasActiveCategory) {
      setActiveCategoryId(allowedCategories[0].id)
    }
  }, [activeCategoryId, allowedCategories])

  useEffect(() => {
    if (quickPicks.length === 0) {
      autoTriggeredUrlRef.current = null
      return
    }

    const current = quickPicks.find((pick) => pick.id === selectedYoutubeId) ?? quickPicks[0]
    if (!current) {
      return
    }

    if (current.id !== selectedYoutubeId) {
      setSelectedYoutubeId(current.id)
    }

    if (submittedUrl !== current.url) {
      setSubmittedUrl(current.url)
    }
  }, [quickPicks, selectedYoutubeId, submittedUrl])

  useEffect(() => {
    let cancelled = false

    async function validateRecommendedPicks() {
      if (!activeChild?.childId || quickPicks.length === 0) {
        return
      }

      const targets = quickPicks.filter((pick) => !validatedResults[pick.url])
      if (targets.length === 0) {
        return
      }

      setValidationPending(true)

      try {
        for (const pick of targets) {
          if (cancelled) {
            return
          }

          const result = await analyzeYoutube(pick.url, activeChild.childId)
          if (cancelled) {
            return
          }

          setValidatedResults((prev) => ({
            ...prev,
            [pick.url]: result,
          }))
        }
      } finally {
        if (!cancelled) {
          setValidationPending(false)
        }
      }
    }

    void validateRecommendedPicks()

    return () => {
      cancelled = true
    }
  }, [activeChild?.childId, quickPicks, validatedResults])

  const visibleQuickPicks = useMemo(
    () => quickPicks.filter((pick) => {
      const result = validatedResults[pick.url]
      if (!result) {
        return false
      }

      return result.playback.allowed && !result.harmful && !result.blockedByCategory
    }),
    [quickPicks, validatedResults],
  )

  const hiddenQuickPicks = useMemo(
    () => quickPicks
      .map((pick) => ({
        pick,
        result: validatedResults[pick.url],
      }))
      .filter(({ result }) => Boolean(result) && (!result!.playback.allowed || result!.harmful || result!.blockedByCategory)),
    [quickPicks, validatedResults],
  )

  const validationSummary = useMemo(() => ({
    total: quickPicks.length,
    passed: visibleQuickPicks.length,
    blocked: hiddenQuickPicks.length,
    pending: Math.max(quickPicks.length - visibleQuickPicks.length - hiddenQuickPicks.length, 0),
  }), [hiddenQuickPicks.length, quickPicks.length, visibleQuickPicks.length])

  const selectedYoutubePick = visibleQuickPicks.find((pick) => pick.id === selectedYoutubeId) ?? visibleQuickPicks[0] ?? null

  const blockedByUserCategory = latestAnalysis?.categoryNameKo
    ? !isYoutubeCategoryAllowed(latestAnalysis.categoryNameKo, youtubeCategorySettings)
    : false

  const canOpenAnalyzedVideo = Boolean(
    latestAnalysis?.playback.allowed
    && !blockedByUserCategory
    && submittedUrl.length > 0,
  )

  const guidanceLabel = latestAnalysis
    ? latestAnalysis.playback.addictionRiskLevel === 'HIGH'
      ? '오래 시청했을 수 있어 잠깐 쉬는 시간을 권장해요.'
      : latestAnalysis.playback.addictionRiskLevel === 'MEDIUM'
        ? '보호자와 함께 보는 흐름으로 이어가면 좋아요.'
        : '현재 설정 기준으로는 안정적으로 시청할 수 있어요.'
    : null

  const healthStatus = useMemo(() => {
    if (!systemHealth) {
      return '상태를 확인하고 있어요.'
    }

    return [
      systemHealth.backend.status,
      systemHealth.database.status,
      systemHealth.mainModel.status,
      systemHealth.addictionModel.status,
    ].every((status) => status === 'UP')
      ? '시청 케어 연결이 준비됐어요.'
      : '일부 연결 상태를 다시 확인해 주세요.'
  }, [systemHealth])

  useEffect(() => {
    if (!activeChild?.childId || analysisPending || visibleQuickPicks.length === 0) {
      return
    }

    const current = visibleQuickPicks.find((pick) => pick.id === selectedYoutubeId) ?? visibleQuickPicks[0]
    if (!current) {
      return
    }

    if (autoTriggeredUrlRef.current === current.url) {
      return
    }

    autoTriggeredUrlRef.current = current.url
    setSelectedYoutubeId(current.id)
    setSubmittedUrl(current.url)
    void onAnalyzeYoutube(current.url)
  }, [activeChild?.childId, analysisPending, onAnalyzeYoutube, selectedYoutubeId, visibleQuickPicks])

  function handleQuickPickClick(videoId: string) {
    const nextPick = visibleQuickPicks.find((pick) => pick.id === videoId)
    if (!nextPick) {
      return
    }

    setSelectedYoutubeId(nextPick.id)
    setSubmittedUrl(nextPick.url)
    void onAnalyzeYoutube(nextPick.url)
  }

  return (
    <div className="screen youtube-care-screen">
      <div className="youtube-care-page">
        <div className="youtube-care-hero">
          <div>
            <span className="youtube-care-kicker">유튜브 시청 전 확인</span>
            <h2>유튜브에 들어가기 전에 먼저 걸러드릴게요.</h2>
            <p>
              {activeChild
                ? `${activeChild.childName} 기준으로 추천 영상 링크를 먼저 검사하고, 통과한 영상만 보여드리고 있어요.`
                : '자녀 프로필이 선택되면 유튜브 확인과 시청 케어를 바로 시작할 수 있어요.'}
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
        </div>

        <div className="youtube-care-summary">
          <div className="youtube-care-summary__card">
            <span>현재 자녀</span>
            <strong>{activeChild?.childName ?? '선택 필요'}</strong>
            <p>하루 제한 {formatMinutes(activeChild?.watchPolicy.dailyLimitMinutes)}</p>
          </div>
          <div className="youtube-care-summary__card">
            <span>허용 카테고리</span>
            <strong>{allowedCategories.length}개</strong>
            <p>{allowedCategories.map((category) => category.shortLabel).join(' · ') || '아직 선택된 카테고리가 없어요.'}</p>
          </div>
          <div className="youtube-care-summary__card">
            <span>검사 상태</span>
            <strong>{analysisPending || validationPending ? '확인 중' : serverLoading ? '불러오는 중' : healthStatus}</strong>
            <p>NudeNet, Violent, 카테고리 필터를 통과한 영상만 남겨두고 있어요.</p>
          </div>
        </div>

        <section className="youtube-care-status-board">
          <article className="youtube-care-status-card youtube-care-status-card--pending">
            <span>검사 대상</span>
            <strong>{validationSummary.total}개</strong>
            <p>현재 카테고리에서 가져온 추천 링크</p>
          </article>
          <article className="youtube-care-status-card youtube-care-status-card--ok">
            <span>통과</span>
            <strong>{validationSummary.passed}개</strong>
            <p>바로 볼 수 있는 추천 영상</p>
          </article>
          <article className="youtube-care-status-card youtube-care-status-card--blocked">
            <span>숨김</span>
            <strong>{validationSummary.blocked}개</strong>
            <p>유해성 또는 카테고리 기준으로 제외된 영상</p>
          </article>
          <article className="youtube-care-status-card youtube-care-status-card--pending">
            <span>대기</span>
            <strong>{validationSummary.pending}개</strong>
            <p>아직 검증 중인 추천 링크</p>
          </article>
        </section>

        <section className="kids-youtube-library youtube-care-library">
          <div className="kids-youtube-library__head">
            <div>
              <h3 className="kids-analysis-title">통과한 추천 영상</h3>
              <p className="kids-analysis-sub">추천 카드 URL을 먼저 검증해서 통과한 영상만 보여드리고, 선택하면 시청 케어를 시작합니다.</p>
            </div>
            <span className="kids-analysis-chip">{activeChild?.childName ?? '자녀 선택'}</span>
          </div>

          <div className="kids-youtube-library__filters">
            <button
              type="button"
              className={`youtube-care-filter-tab${activeCategoryId === 'all' ? ' youtube-care-filter-tab--active' : ''}`}
              onClick={() => setActiveCategoryId('all')}
            >
              전체 허용
            </button>
            {allowedCategories.map((category) => (
              <button
                key={category.id}
                type="button"
                className={`youtube-care-filter-tab${activeCategoryId === category.id ? ' youtube-care-filter-tab--active' : ''}`}
                style={{
                  background: activeCategoryId === category.id ? `${category.accent}22` : 'rgba(255,255,255,0.04)',
                  color: category.accent,
                  borderColor: activeCategoryId === category.id ? `${category.accent}88` : 'rgba(255,255,255,0.08)',
                }}
                onClick={() => setActiveCategoryId(category.id)}
              >
                {category.shortLabel}
              </button>
            ))}
          </div>

          <p className="youtube-care-filter-caption">
            {activeCategoryId === 'all'
              ? '설정에서 켜 둔 카테고리만 모아서 보여드리고 있어요.'
              : `${allowedCategories.find((category) => category.id === activeCategoryId)?.label ?? '선택한 카테고리'}만 보여드리고 있어요.`}
          </p>

          <div className="kids-youtube-grid">
            {visibleQuickPicks.map((pick) => {
              const option = YOUTUBE_CATEGORY_OPTIONS.find((category) => category.id === pick.categoryId)
              return (
                <button
                  key={pick.id}
                  type="button"
                  className={`kids-youtube-card${selectedYoutubeId === pick.id ? ' kids-youtube-card--active' : ''}`}
                  onClick={() => handleQuickPickClick(pick.id)}
                >
                  <div className="kids-youtube-card__visual" style={{ background: pick.accent }}>
                    <span className="kids-youtube-card__badge">{pick.badge}</span>
                    <strong>{pick.title}</strong>
                    <span>{pick.durationLabel}</span>
                  </div>
                  <div className="kids-youtube-card__body">
                    <div>
                      <p className="kids-youtube-card__title">{pick.subtitle}</p>
                      <p className="kids-youtube-card__copy">{pick.description}</p>
                    </div>
                    <span className="kids-youtube-card__category" style={{ color: option?.accent ?? '#5b3fd6' }}>
                      {option?.label ?? pick.categoryId}
                    </span>
                  </div>
                </button>
              )
            })}
            {validationPending && visibleQuickPicks.length === 0 && (
              <div className="kids-youtube-empty">
                추천 영상 링크를 검증하고 있어요. NudeNet, Violent, 카테고리 필터를 순서대로 확인 중입니다.
              </div>
            )}
            {!validationPending && visibleQuickPicks.length === 0 && (
              <div className="kids-youtube-empty">
                통과한 추천 영상이 없어 보여드릴 카드가 없어요. 유튜브 필터를 바꾸거나 다른 카테고리를 선택해 주세요.
              </div>
            )}
          </div>
        </section>

        {hiddenQuickPicks.length > 0 && (
          <section className="youtube-care-hidden">
            <div className="youtube-care-hidden__head">
              <h3>숨겨진 추천 영상</h3>
              <p>NudeNet, Violent, 카테고리 필터에 걸린 영상은 여기서 이유를 보여주고 추천 목록에서는 숨깁니다.</p>
            </div>
            <div className="youtube-care-hidden__list">
              {hiddenQuickPicks.map(({ pick, result }) => {
                const reasons = [
                  result?.blockedByCategory ? '카테고리 필터 차단' : null,
                  result?.hasViolence ? 'Violence 감지' : null,
                  result?.hasNudity ? 'NudeNet 감지' : null,
                  !result?.playback.allowed ? '재생 불가' : null,
                ].filter(Boolean)

                return (
                  <article key={pick.id} className="youtube-care-hidden__item">
                    <div>
                      <strong>{pick.title}</strong>
                      <p>{pick.subtitle}</p>
                    </div>
                    <div className="youtube-care-hidden__reasons">
                      {reasons.map((reason) => (
                        <span key={reason}>{reason}</span>
                      ))}
                    </div>
                  </article>
                )
              })}
            </div>
          </section>
        )}

        <section className="kids-analysis-shell youtube-care-analysis">
          <div className="kids-analysis-card">
            <div className="kids-analysis-head">
              <div>
                <h3 className="kids-analysis-title">유튜브 확인 결과</h3>
                <p className="kids-analysis-sub">
                  {selectedYoutubePick
                    ? `${selectedYoutubePick.title} 카드를 기준으로 확인해요.`
                    : '통과한 영상을 먼저 골라 주세요.'}
                </p>
              </div>
              <span className="kids-analysis-chip">
                {analysisPending || validationPending ? '확인 중' : serverLoading ? '동기화 중' : healthStatus}
              </span>
            </div>

            <div className="kids-analysis-meta">
              <span>최근 확인 {analysisHistory.length}건</span>
              <span>시청 케어 {runtimeSettings?.addictionMonitorEnabled ? '켜짐' : '꺼짐'}</span>
              <span>개인정보 동의 {runtimeSettings?.privacyConsent ? '켜짐' : '꺼짐'}</span>
            </div>

            {latestAnalysis ? (
              <div className={`kids-analysis-result${canOpenAnalyzedVideo ? ' kids-analysis-result--ok' : ' kids-analysis-result--blocked'}`}>
                <div>
                  <strong>
                    {blockedByUserCategory
                      ? '현재 설정에서 허용되지 않은 카테고리예요.'
                      : latestAnalysis.playback.allowed
                        ? '지금은 시청해도 괜찮아요.'
                        : '다른 영상을 선택해 주세요.'}
                  </strong>
                  <p>
                    {blockedByUserCategory
                      ? `${latestAnalysis.categoryNameKo ?? '해당 카테고리'}는 현재 필터에서 꺼져 있어요.`
                      : latestAnalysis.playback.message}
                  </p>
                  {guidanceLabel && <p className="kids-analysis-risk">시청 안내: {guidanceLabel}</p>}
                  {latestAnalysis.categoryNameKo && (
                    <p className="kids-analysis-risk">분류된 카테고리: {latestAnalysis.categoryNameKo}</p>
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
                      onClick={() => window.open(submittedUrl, '_blank', 'noopener,noreferrer')}
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
            ) : (
              <div className="kids-analysis-placeholder">
                통과한 추천 영상을 찾는 중이에요. 검증이 끝나면 바로 볼 수 있는 영상만 남겨둘게요.
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
              {monitorLive?.errorMessage && <p>{monitorLive.errorMessage}</p>}
              {monitorLive?.childMessages?.slice(0, 1).map((message) => (
                <p key={message}>{message}</p>
              ))}
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
        </section>
      </div>
    </div>
  )
}
