import { useMemo, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import type { ScreenId } from '../data/kidsProfileFlow'
import type { ChildProfile } from '../data/profiles'
import type { ParentAlertResponse, ParentViewingHistoryResponse } from '../lib/api'
import { summarizeAlert, summarizeHistoryItem } from '../lib/integration'

type MainScreenProps = {
  onNavigate: (screen: ScreenId) => void
  onOpenYoutubeCare: () => void
  profiles: ChildProfile[]
  activeProfileId: string
  onSelectKidsProfile: (profileId: string) => void
  familyName: string
  todayViewingCount: number
  alertCount: number
  recentAlerts: ParentAlertResponse[]
  recentHistory: ParentViewingHistoryResponse[]
  serverLoading: boolean
  serverError: string | null
}

type SearchResult = {
  id: string
  title: string
  subtitle: string
  type: string
  onSelect: () => void
}

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
}

const panelVariants = {
  hidden: { x: -440, opacity: 0 },
  visible: { x: 0, opacity: 1, transition: { type: 'spring' as const, damping: 24, stiffness: 220 } },
  exit: { x: -440, opacity: 0, transition: { duration: 0.22, ease: 'easeIn' as const } },
}

const modalVariants = {
  hidden: { scale: 0.88, opacity: 0, y: 20 },
  visible: { scale: 1, opacity: 1, y: 0, transition: { type: 'spring' as const, damping: 22, stiffness: 260 } },
  exit: { scale: 0.92, opacity: 0, y: 8, transition: { duration: 0.18 } },
}

const APP_LINKS = [
  { id: 'netflix', sub: '넷플릭스', href: 'https://www.netflix.com/kr/', image: '/img/app_netflix.svg' },
  { id: 'watcha', sub: '왓챠', href: 'https://watcha.com/browse/all', image: '/img/app_watcha.svg' },
  { id: 'wavve', sub: '웨이브', href: 'https://www.wavve.com/', image: '/img/app_wavve.svg' },
  { id: 'tving', sub: '티빙', href: 'https://www.tving.com/onboarding', image: '/img/app_tving.svg' },
  { id: 'youtube', sub: '유튜브', href: 'https://www.youtube.com/', image: '/img/app_youtube.svg' },
  { id: 'coupang-play', sub: '쿠팡플레이', href: 'https://www.coupangplay.com/home', image: '/img/app_coupangplay.svg' },
] as const

export function MainScreen({
  onNavigate,
  onOpenYoutubeCare,
  profiles,
  activeProfileId,
  onSelectKidsProfile,
  familyName,
  todayViewingCount,
  alertCount,
  recentAlerts,
  recentHistory,
  serverLoading,
  serverError,
}: MainScreenProps) {
  const [panelOpen, setPanelOpen] = useState(false)
  const [alertPanelOpen, setAlertPanelOpen] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const closeAll = () => {
    setPanelOpen(false)
    setAlertPanelOpen(false)
    setShowAddModal(false)
    setSearchOpen(false)
    setSearchTerm('')
  }

  function openAppLink(href: string) {
    window.open(href, '_blank', 'noopener,noreferrer')
  }

  function openThinQDashboard() {
    closeAll()
    onNavigate('thinq')
  }

  function openYoutubeCare() {
    closeAll()
    onOpenYoutubeCare()
  }

  function handleKidsSelect(profileId: string) {
    closeAll()
    onSelectKidsProfile(profileId)
    onNavigate('kids-main')
  }

  function openSearch() {
    setPanelOpen(false)
    setAlertPanelOpen(false)
    setShowAddModal(false)
    setSearchOpen(true)
  }

  function openAlertPanel() {
    setPanelOpen(false)
    setShowAddModal(false)
    setSearchOpen(false)
    setAlertPanelOpen(true)
  }

  function openProfilePanel() {
    setAlertPanelOpen(false)
    setSearchOpen(false)
    setShowAddModal(false)
    setPanelOpen((value) => !value)
  }

  const historyCards = recentHistory.length > 0
    ? recentHistory.slice(0, 4).map((item, index) => ({
        label: summarizeHistoryItem(item),
        file: `img_thumbnail_small_0${(index % 4) + 1}.png`,
      }))
    : [
        { label: '최근 시청 데이터가 아직 없어요.', file: 'img_thumbnail_small_01.png' },
        { label: '자녀 프로필을 선택하면 보호 흐름이 이어져요.', file: 'img_thumbnail_small_02.png' },
        { label: '시청 확인과 보호 알림을 한 화면에서 볼 수 있어요.', file: 'img_thumbnail_small_03.png' },
        { label: '설정에서 보호 기준을 바꾸면 바로 반영돼요.', file: 'img_thumbnail_small_04.png' },
      ]

  const chipActions = [
    { id: 'tv', label: 'TV 시청', color: '#3ECFBF', onClick: () => undefined },
    { id: 'family', label: '가족 보호', color: '#E07D5C', onClick: () => onNavigate('settings-family') },
    { id: 'kids', label: '키즈 추천', color: '#B57BE8', onClick: () => handleKidsSelect(activeProfileId || profiles[0]?.id || 'child-1') },
    { id: 'report', label: 'ThinQ 보기', color: '#4AAEF5', onClick: openThinQDashboard },
    { id: 'history', label: '시청 기록', color: '#8B8FA8', onClick: () => onNavigate('watch-history') },
  ] as const

  const notificationItems = useMemo(() => {
    const alertItems = recentAlerts.slice(0, 4).map((alert) => ({
      id: `alert-${alert.alertId}`,
      label: alert.childName,
      title: alert.messageText,
      meta: `${formatRiskLabel(alert.riskLevel)} · 지금 확인 가능`,
      tone: (alert.riskLevel ?? 'safe').toLowerCase(),
    }))

    const historyItems = recentHistory.slice(0, 3).map((item) => ({
      id: `history-${item.viewingId}`,
      label: item.childName,
      title: `${item.videoId} 시청이 기록되었어요.`,
      meta: item.watchTime,
      tone: 'info',
    }))

    if (alertItems.length + historyItems.length > 0) {
      return [...alertItems, ...historyItems].slice(0, 6)
    }

    return [
      {
        id: 'n1',
        label: '가족 보호',
        title: '오늘은 바로 확인이 필요한 알림이 없어요.',
        meta: '보호 흐름이 안정적으로 유지되고 있어요.',
        tone: 'safe',
      },
      {
        id: 'n2',
        label: 'TV 시청',
        title: '새 시청 기록이 생기면 이곳에서 먼저 보여드릴게요.',
        meta: '최근 활동을 빠르게 확인할 수 있어요.',
        tone: 'info',
      },
    ]
  }, [recentAlerts, recentHistory])

  const searchResults = useMemo<SearchResult[]>(() => {
    const profileResults = profiles.map((profile) => ({
      id: `profile-${profile.id}`,
      title: `${profile.name} 아이들TV`,
      subtitle: `${profile.age}세 맞춤 키즈 화면으로 이동`,
      type: '프로필',
      onSelect: () => handleKidsSelect(profile.id),
    }))

    const appResults = APP_LINKS.map((app) => ({
      id: `app-${app.id}`,
      title: app.sub,
      subtitle: app.id === 'youtube' ? '시청 전 확인 화면 열기' : '앱 바로 열기',
      type: '앱',
      onSelect: () => {
        if (app.id === 'youtube') {
          openYoutubeCare()
          return
        }

        closeAll()
        openAppLink(app.href)
      },
    }))

    const menuResults = [
      {
        id: 'menu-family',
        title: '가족 보호',
        subtitle: '설정의 가족 보호 페이지 열기',
        type: '메뉴',
        onSelect: () => {
          closeAll()
          onNavigate('settings-family')
        },
      },
      {
        id: 'menu-youtube',
        title: '유튜브 필터',
        subtitle: '설정의 유튜브 카테고리 필터 열기',
        type: '메뉴',
        onSelect: () => {
          closeAll()
          onNavigate('settings-youtube')
        },
      },
      {
        id: 'menu-history',
        title: '시청 기록',
        subtitle: 'TV 시청 리포트 화면 열기',
        type: '메뉴',
        onSelect: () => {
          closeAll()
          onNavigate('watch-history')
        },
      },
      {
        id: 'menu-report',
        title: 'ThinQ 보기',
        subtitle: '보호 리포트 대시보드 열기',
        type: '메뉴',
        onSelect: () => {
          openThinQDashboard()
        },
      },
    ]

    const query = searchTerm.trim().toLowerCase()
    const pool = [...menuResults, ...profileResults, ...appResults]

    if (!query) {
      return pool.slice(0, 8)
    }

    return pool.filter((item) =>
      `${item.title} ${item.subtitle} ${item.type}`.toLowerCase().includes(query),
    )
  }, [onNavigate, onOpenYoutubeCare, profiles, searchTerm])

  const overlayOpen = panelOpen || alertPanelOpen || showAddModal || searchOpen

  const heroCards = [
    {
      id: 'kids-hero',
      title: '아이들TV 바로가기',
      description: '예전에 보던 콘텐츠와 시청 흐름을 이어서 확인할 수 있어요.',
      image: '/img/img_thumbnail_big_01.png',
      onClick: () => onNavigate('watch-history'),
    },
    {
      id: 'report-hero',
      title: '리포트 보기',
      description: '최근 시청 변화와 보호 상태를 한 번에 확인할 수 있어요.',
      image: '/img/img_thumbnail_big_02.png',
      onClick: openThinQDashboard,
    },
  ] as const

  return (
    <div className="screen wos-screen" data-theme="adult">
      <nav className="wos-sidenav">
        <button
          type="button"
          className={`wos-profile-btn${panelOpen ? ' wos-profile-btn--active' : ''}`}
          onClick={openProfilePanel}
          aria-label="계정 메뉴"
        >
          L
        </button>

        <NavIcon title="알림" onClick={openAlertPanel}>
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </NavIcon>
        <NavIcon title="설정" onClick={() => onNavigate('settings')}>
          <circle cx={12} cy={12} r={3} />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </NavIcon>
        <NavIcon title="검색" onClick={openSearch}>
          <circle cx={11} cy={11} r={8} />
          <line x1={21} y1={21} x2={16.65} y2={16.65} />
        </NavIcon>
      </nav>

      <main className={`wos-main${overlayOpen ? ' wos-main--dimmed' : ''}`}>
        <section className="wos-hero">
          {heroCards.map((card) => (
            <button
              key={card.id}
              type="button"
              className="wos-hero-card"
              onClick={card.onClick}
              aria-label={card.title}
            >
              <img className="wos-hero-img" src={card.image} alt={card.title} />
              <span className="wos-hero-overlay">
                <strong>{card.title}</strong>
                <span>{card.description}</span>
              </span>
            </button>
          ))}
        </section>

        <section className="wos-server-strip">
          <div className="wos-server-card">
            <span className="wos-server-kicker">{familyName}</span>
            <strong className="wos-server-value">{todayViewingCount}건 시청</strong>
            <p className="wos-server-copy">오늘 가족 전체 시청 흐름을 TV 안에서 바로 확인할 수 있어요.</p>
          </div>
          <div className="wos-server-card">
            <span className="wos-server-kicker">최근 알림</span>
            <strong className="wos-server-value">{alertCount}건</strong>
            <p className="wos-server-copy">{summarizeAlert(recentAlerts[0])}</p>
          </div>
          <div className="wos-server-card">
            <span className="wos-server-kicker">보호 상태</span>
            <strong className="wos-server-value">
              {serverLoading ? '불러오는 중' : serverError ? '확인 필요' : '연결 완료'}
            </strong>
            <p className="wos-server-copy">{serverError ?? '자녀 선택, 시청 확인 결과, 보호 설정이 하나의 흐름으로 이어져요.'}</p>
          </div>
        </section>

        <div className="wos-cat-row">
          {chipActions.map((category) => (
            <button
              key={category.id}
              type="button"
              className="wos-cat-chip"
              style={{ background: category.color }}
              onClick={category.onClick}
            >
              {category.label}
            </button>
          ))}
        </div>

        <div className="wos-app-row">
          {APP_LINKS.map((app) => (
            app.id === 'youtube' ? (
              <button
                key={app.id}
                type="button"
                className="wos-app-icon wos-app-link wos-app-link--button"
                aria-label={`${app.sub} 열기`}
                onClick={openYoutubeCare}
              >
                <img src={app.image} alt={app.sub} />
                <span className="wos-app-caption">{app.sub}</span>
              </button>
            ) : (
              <a
                key={app.id}
                className="wos-app-icon wos-app-link"
                href={app.href}
                target="_blank"
                rel="noreferrer noopener"
                aria-label={`${app.sub} 열기`}
              >
                <img src={app.image} alt={app.sub} />
                <span className="wos-app-caption">{app.sub}</span>
              </a>
            )
          ))}
        </div>

        <div className="wos-content-grid">
          {historyCards.map((item) => (
            <div key={`${item.file}-${item.label}`} className="wos-content-card">
              <p className="wos-content-label">{item.label}</p>
              <img className="wos-content-thumb" src={`/img/${item.file}`} alt={item.label} />
            </div>
          ))}
        </div>
      </main>

      <AnimatePresence>
        {overlayOpen && (
          <motion.div
            className="wos-backdrop"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={{ duration: 0.25 }}
            onClick={closeAll}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {panelOpen && (
          <motion.aside
            className="wos-account-panel"
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <div className="wap-header">
              <span className="wap-title">LG 사용자 계정</span>
              <button type="button" className="wap-more" aria-label="더보기">
                <svg viewBox="0 0 4 18" fill="currentColor" width={4} height={18}>
                  <circle cx={2} cy={2} r={1.6} />
                  <circle cx={2} cy={9} r={1.6} />
                  <circle cx={2} cy={16} r={1.6} />
                </svg>
              </button>
            </div>

            <div className="wap-account-row wap-account-row--active">
              <div className="wap-avatar wap-avatar--purple">L</div>
              <span className="wap-name">보호자</span>
              <div className="wap-vline" />
              <button type="button" className="wap-settings-btn" aria-label="설정" onClick={() => { closeAll(); onNavigate('settings') }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" width={17} height={17}>
                  <circle cx={12} cy={12} r={3} />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </button>
            </div>

            {profiles.length > 0 && (
              <button
                type="button"
                className="wap-account-row wap-account-row--btn wap-account-row--kids-group"
                onClick={() => handleKidsSelect(activeProfileId || profiles[0].id)}
              >
                <div className="wap-kids-avatars">
                  {profiles.slice(0, 2).map((profile, index) => (
                    <div
                      key={profile.id}
                      className="wap-avatar wap-avatar--sm"
                      style={{ background: profile.color, zIndex: 2 - index, marginLeft: index > 0 ? -10 : 0 }}
                    >
                      {profile.name[0]}
                    </div>
                  ))}
                </div>
                <span className="wap-name">아이들TV</span>
                <span className="wap-kids-chip" style={{ background: 'linear-gradient(90deg, #FF8C42 0%, #5B9BD5 100%)' }}>
                  {profiles.length}명
                </span>
              </button>
            )}

            <button
              type="button"
              className="wap-account-row wap-account-row--btn wap-account-row--add"
              onClick={() => setShowAddModal(true)}
            >
              <div className="wap-avatar wap-avatar--add">
                <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.4} strokeLinecap="round" width={20} height={20}>
                  <line x1={12} y1={5} x2={12} y2={19} />
                  <line x1={5} y1={12} x2={19} y2={12} />
                </svg>
              </div>
              <span className="wap-name">추가하기</span>
            </button>
          </motion.aside>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {alertPanelOpen && (
          <motion.aside
            className="wos-account-panel wos-alert-panel"
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <div className="wap-header">
              <span className="wap-title">알림</span>
              <button type="button" className="wap-more" aria-label="알림 닫기" onClick={closeAll}>
                닫기
              </button>
            </div>

            <div className="wos-alert-summary">
              <strong>{alertCount}개의 보호 알림</strong>
              <p>중요한 시청 변화와 최근 기록을 먼저 확인할 수 있어요.</p>
            </div>

            <div className="wos-alert-list">
              {notificationItems.map((item) => (
                <article key={item.id} className="wos-alert-item">
                  <div className={`wos-alert-dot wos-alert-dot--${item.tone}`} />
                  <div className="wos-alert-copy">
                    <span className="wos-alert-label">{item.label}</span>
                    <strong>{item.title}</strong>
                    <p>{item.meta}</p>
                  </div>
                </article>
              ))}
            </div>

            <button type="button" className="wos-alert-cta" onClick={() => { closeAll(); onNavigate('watch-history') }}>
              시청 기록 전체 보기
            </button>
          </motion.aside>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAddModal && (
          <motion.div
            className="wos-modal-wrap"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={{ duration: 0.2 }}
          >
            <motion.div className="wos-modal" variants={modalVariants} initial="hidden" animate="visible" exit="exit">
              <h3 className="wos-modal-title">프로필 유형 선택</h3>
              <p className="wos-modal-sub">어떤 프로필을 추가할까요?</p>
              <div className="wos-modal-cards">
                <button type="button" className="wos-modal-card" onClick={() => { closeAll(); onNavigate('profile-type') }}>
                  <div className="wos-modal-card-icon wos-modal-card-icon--adult">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" width={32} height={32}>
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx={12} cy={7} r={4} />
                    </svg>
                  </div>
                  <p className="wos-modal-card-title">일반 프로필</p>
                  <p className="wos-modal-card-desc">보호자 계정으로 TV 전체를 사용할 수 있어요.</p>
                </button>
                <button type="button" className="wos-modal-card wos-modal-card--kids" onClick={() => { closeAll(); onNavigate('profile-create') }}>
                  <div className="wos-modal-card-icon wos-modal-card-icon--kids">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" width={32} height={32}>
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx={9} cy={7} r={4} />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                  </div>
                  <p className="wos-modal-card-title">키즈 프로필</p>
                  <p className="wos-modal-card-desc">자녀 보호, 시청 기록, 사전 확인 기능까지 함께 연결됩니다.</p>
                  <span className="wos-modal-card-badge">추천</span>
                </button>
              </div>
              <button type="button" className="wos-modal-cancel" onClick={() => setShowAddModal(false)}>
                취소
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {searchOpen && (
          <motion.div
            className="wos-modal-wrap"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={{ duration: 0.2 }}
          >
            <motion.div className="wos-modal wos-search-modal" variants={modalVariants} initial="hidden" animate="visible" exit="exit">
              <div className="wos-search-head">
                <div>
                  <h3 className="wos-modal-title">검색</h3>
                  <p className="wos-modal-sub">앱, 설정, 아이들TV 화면을 바로 찾을 수 있어요.</p>
                </div>
                <button type="button" className="wos-modal-cancel wos-search-close" onClick={closeAll}>
                  닫기
                </button>
              </div>

              <label className="wos-search-field">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" width={20} height={20}>
                  <circle cx={11} cy={11} r={8} />
                  <line x1={21} y1={21} x2={16.65} y2={16.65} />
                </svg>
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="예: 가족 보호, 유튜브 필터, 넷플릭스, 민아"
                  autoFocus
                />
              </label>

              <div className="wos-search-results">
                {searchResults.map((result) => (
                  <button key={result.id} type="button" className="wos-search-item" onClick={result.onSelect}>
                    <div>
                      <strong>{result.title}</strong>
                      <p>{result.subtitle}</p>
                    </div>
                    <span>{result.type}</span>
                  </button>
                ))}
                {searchResults.length === 0 && (
                  <div className="wos-search-empty">
                    <strong>검색 결과가 없어요.</strong>
                    <p>앱 이름이나 설정 메뉴, 자녀 이름으로 다시 찾아보세요.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function NavIcon({ title, children, onClick }: { title: string; children: ReactNode; onClick?: () => void }) {
  return (
    <button type="button" className={`wos-nav-icon${onClick ? ' wos-nav-icon--active' : ''}`} title={title} onClick={onClick}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" width={22} height={22}>
        {children}
      </svg>
    </button>
  )
}

function formatRiskLabel(riskLevel?: string | null) {
  switch ((riskLevel ?? '').toUpperCase()) {
    case 'HIGH':
      return '높음'
    case 'MEDIUM':
      return '보통'
    case 'LOW':
      return '낮음'
    default:
      return '안정'
  }
}
