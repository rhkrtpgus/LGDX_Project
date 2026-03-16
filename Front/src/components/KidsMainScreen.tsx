import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import type { ScreenId } from '../data/kidsProfileFlow'
import { KIDS_CATEGORIES } from '../data/kidsProfileFlow'
import { getCombinedRecommendations, getContentsByAge, getThemeByAge, type ChildProfile } from '../data/profiles'
import {
  getEnabledYoutubeCategories,
  isYoutubeCategoryAllowed,
  YOUTUBE_CATEGORY_OPTIONS,
  YOUTUBE_QUICK_PICKS,
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
} from '../lib/api'
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

type Props = {
  onNavigate: (screen: ScreenId) => void
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
  onAnalyzeYoutube: (videoUrl: string) => Promise<void> | void
  analysisPending: boolean
  youtubeCategorySettings: YoutubeCategorySettings
  activeMonitor: MonitorControlResponse | null
  monitorLive: MonitorLiveResponse | null
  monitorPending: boolean
  onStopAddictionMonitor: () => Promise<void> | void
}

export function KidsMainScreen({
  onNavigate,
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
}: Props) {
  const [activeCategory, setActiveCategory] = useState('home')
  const [panelOpen, setPanelOpen] = useState(false)
  const [slideDir, setSlideDir] = useState(1)
  const [selectedYoutubeId, setSelectedYoutubeId] = useState(YOUTUBE_QUICK_PICKS[0]?.id ?? '')
  const [submittedUrl, setSubmittedUrl] = useState(YOUTUBE_QUICK_PICKS[0]?.url ?? '')

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

  const allowedCategories = useMemo(
    () => getEnabledYoutubeCategories(youtubeCategorySettings),
    [youtubeCategorySettings],
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
    const filtered = YOUTUBE_QUICK_PICKS.filter((pick) => youtubeCategorySettings[pick.categoryId])

    return filtered
      .filter((pick) => preferredCategoryIds.includes(pick.categoryId))
      .concat(filtered.filter((pick) => !preferredCategoryIds.includes(pick.categoryId)))
      .slice(0, 6)
  }, [activeCategory, youtubeCategorySettings])

  const selectedYoutubePick = quickPicks.find((pick) => pick.id === selectedYoutubeId) ?? quickPicks[0] ?? null
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

  useEffect(() => {
    if (quickPicks.length === 0) {
      setSelectedYoutubeId('')
      setSubmittedUrl('')
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

  function handleQuickPickClick(videoId: string) {
    const nextPick = quickPicks.find((pick) => pick.id === videoId)
    if (!nextPick) {
      return
    }

    setSelectedYoutubeId(nextPick.id)
    setSubmittedUrl(nextPick.url)
    void onAnalyzeYoutube(nextPick.url)
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

      <button type="button" className="kids-char-btn bounce-on-click" style={{ background: accent }}>
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

            <div className={`kcc-grid${isBaby && !sharedMode ? ' kcc-grid--baby' : ' kcc-grid--row'}`}>
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

            <section className="kids-youtube-library">
              <div className="kids-youtube-library__head">
                <div>
                  <h3 className="kids-analysis-title">안심 유튜브 고르기</h3>
                  <p className="kids-analysis-sub">링크를 붙여 넣지 않아도 카드만 누르면 영상 URL을 가져와 먼저 확인해 줍니다.</p>
                </div>
                <span className="kids-analysis-chip">{activeChild?.childName ?? activeProfile.name}</span>
              </div>

              <div className="kids-youtube-library__filters">
                {allowedCategories.map((category) => (
                  <span key={category.id} className="kids-youtube-filter" style={{ background: `${category.accent}22`, color: category.accent }}>
                    {category.shortLabel}
                  </span>
                ))}
              </div>

              <div className="kids-youtube-grid">
                {quickPicks.map((pick) => {
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
                {quickPicks.length === 0 && (
                  <div className="kids-youtube-empty">
                    허용된 유튜브 카테고리가 없어 확인 가능한 영상 카드가 없어요. 설정에서 카테고리를 켜 주세요.
                  </div>
                )}
              </div>
            </section>

            <section className="kids-analysis-shell">
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

                {latestAnalysis ? (
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
                    유튜브 카드 하나를 누르면 주소를 가져와 먼저 확인해 드릴게요.
                  </div>
                )}
              </div>

              <div className="kids-analysis-aside">
                <div className="kids-aside-card">
                  <h4>최근 시청</h4>
                  {viewingHistory.slice(0, 3).map((item) => (
                    <p key={item.viewingId}>{summarizeHistoryItem(item)}</p>
                  ))}
                  {viewingHistory.length === 0 && <p>아직 시청 기록이 없어요.</p>}
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
                  <h4>보호 상태</h4>
                  <p>최근 알림: <span style={{ color: getRiskTone(recentAlerts[0]?.riskLevel) }}>{recentAlerts[0]?.riskLevel ?? '안정'}</span></p>
                  <p>{summarizeAlert(recentAlerts[0])}</p>
                  <p>허용 시간: {formatMinutes(activeChild?.watchPolicy.dailyLimitMinutes)}</p>
                  <button type="button" className="kids-mini-link" onClick={() => onNavigate('settings-youtube')}>
                    유튜브 필터와 보호 설정 보기
                  </button>
                </div>
              </div>
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
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
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
