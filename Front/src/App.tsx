import { useEffect, useState, startTransition, useDeferredValue } from 'react'
import { FocusContext, useFocusable } from '@noriginmedia/norigin-spatial-navigation'
import { AnimatePresence, motion } from 'motion/react'
import './App.css'
import { AppDock } from './components/AppDock'
import { ContentRow } from './components/ContentRow'
import { HeroPanel } from './components/HeroPanel'
import { HomeLauncherPanel } from './components/HomeLauncherPanel'
import { KidsWorldShowcasePanel } from './components/KidsWorldShowcasePanel'
import { MovieTvShowcasePanel } from './components/MovieTvShowcasePanel'
import { SettingsControlPanel } from './components/SettingsControlPanel'
import { Sidebar } from './components/Sidebar'
import { TvAppsShowcasePanel } from './components/TvAppsShowcasePanel'
import {
  initialSpotlight,
  type MediaItem,
  type PageContent,
  type QuickApp,
  type SidebarItem,
  type Spotlight,
} from './data/home'
import { buildActionPage } from './data/actionPage'
import { pageContentById } from './data/pages'

function formatClock(date: Date) {
  return new Intl.DateTimeFormat('ko-KR', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

type ContentRootProps = {
  activeAppId: string
  apps: QuickApp[]
  dockEyebrow: string
  dockTitle: string
  pageId: string
  rows: PageContent['rows']
  onFocusApp: (app: QuickApp) => void
  onLaunchApp: (app: QuickApp) => void
  onPreviewTitle: (item: MediaItem) => void
  onLaunchTitle: (item: MediaItem) => void
}

function ContentRoot({
  activeAppId,
  apps,
  dockEyebrow,
  dockTitle,
  pageId,
  rows,
  onFocusApp,
  onLaunchApp,
  onPreviewTitle,
  onLaunchTitle,
}: ContentRootProps) {
  const { ref, focusKey } = useFocusable({
    focusKey: `CONTENT_ROOT-${pageId}`,
    trackChildren: true,
    preferredChildFocusKey: 'APP_DOCK',
  })

  return (
    <FocusContext.Provider value={focusKey}>
      <div ref={ref} className="content-stack">
        <AppDock
          activeAppId={activeAppId}
          apps={apps}
          eyebrow={dockEyebrow}
          title={dockTitle}
          onFocusApp={onFocusApp}
          onLaunchApp={onLaunchApp}
        />

        {rows.map((row) => (
          <ContentRow
            key={row.id}
            row={row}
            onActivate={onLaunchTitle}
            onPreview={onPreviewTitle}
          />
        ))}
      </div>
    </FocusContext.Provider>
  )
}

const navigationItems: SidebarItem[] = [
  { id: 'search', label: '영화/TV방송', shortLabel: 'TV', hint: '채널과 콘텐츠', accent: '#e6b329' },
  { id: 'live', label: '아이들나라', shortLabel: '키즈', hint: '아동 추천 화면', accent: '#f08b3c' },
  { id: 'apps', label: 'TV앱', shortLabel: '앱', hint: '유튜브 보호 기능', accent: '#2d6cff' },
  { id: 'settings', label: '설정', shortLabel: '설정', hint: '시스템과 동의 관리', accent: '#ce5da6' },
]

function App() {
  const [activeNav, setActiveNav] = useState<SidebarItem['id']>('home')
  const [activeAppId, setActiveAppId] = useState(pageContentById.home.quickApps[0].id)
  const [detailPage, setDetailPage] = useState<PageContent | null>(null)
  const [spotlight, setSpotlight] = useState<Spotlight>(initialSpotlight)
  const [statusLabel, setStatusLabel] = useState(pageContentById.home.readyLabel)
  const [clock, setClock] = useState(() => new Date())

  const basePage = pageContentById[activeNav] ?? pageContentById.home
  const currentPage = detailPage ?? basePage
  const showHomeLauncher = !detailPage && activeNav === 'home'
  const showMovieTvSession = !detailPage && activeNav === 'search'
  const showKidsWorldSession = !detailPage && activeNav === 'live'
  const showTvAppsSession = !detailPage && activeNav === 'apps'
  const showSettingsPanel = !detailPage && activeNav === 'settings'
  const deferredSpotlight = useDeferredValue(spotlight)

  const { ref, focusKey, focusSelf } = useFocusable({
    focusKey: 'PAGE',
    trackChildren: true,
    isFocusBoundary: true,
    preferredChildFocusKey: showHomeLauncher
      ? 'HOME_LAUNCHER'
      : showMovieTvSession
        ? 'MOVIE_TV_SESSION'
        : showKidsWorldSession
          ? 'KIDS_WORLD_SESSION'
        : showTvAppsSession
          ? 'TV_APPS_SESSION'
          : 'HERO_SECTION',
  })

  useEffect(() => {
    focusSelf()
  }, [focusSelf])

  useEffect(() => {
    const interval = window.setInterval(() => setClock(new Date()), 30_000)
    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    setDetailPage(null)
  }, [activeNav])

  useEffect(() => {
    setActiveAppId(currentPage.quickApps[0]?.id ?? '')
    setStatusLabel(currentPage.readyLabel)
    startTransition(() => {
      setSpotlight(currentPage.spotlight)
    })
  }, [currentPage])

  const previewSpotlight = (nextSpotlight: Spotlight) => {
    startTransition(() => {
      setSpotlight(nextSpotlight)
    })
  }

  const openExternalUrl = (url: string, message: string) => {
    window.open(url, '_blank', 'noopener,noreferrer')
    setStatusLabel(message)
  }

  const openActionPage = (
    mode: 'primary' | 'secondary' | 'app' | 'item',
    source: Spotlight,
  ) => {
    setDetailPage(
      buildActionPage({
        basePageTitle: basePage.headerTitle,
        mode,
        source,
      }),
    )
  }

  const launchApp = (app: QuickApp) => {
    if (detailPage && app.id.endsWith('-back')) {
      setDetailPage(null)
      return
    }

    if (app.spotlight.externalUrl) {
      setActiveAppId(app.id)
      previewSpotlight(app.spotlight)
      openExternalUrl(app.spotlight.externalUrl, `${app.name} ?붾㈃?쇰줈 ?대룞?덉뒿?덈떎.`)
      return
    }

    setActiveAppId(app.id)
    previewSpotlight(app.spotlight)
    openActionPage('app', app.spotlight)
  }

  const launchTitle = (item: MediaItem) => {
    if (detailPage && (item.id.includes('-back') || item.badge === '蹂듦?')) {
      setDetailPage(null)
      return
    }

    previewSpotlight(item)
    openActionPage('item', item)
  }

  return (
    <FocusContext.Provider value={focusKey}>
      <div
        ref={ref}
        className={`tv-shell ${showHomeLauncher ? 'tv-shell--launcher' : ''} ${showKidsWorldSession ? 'tv-shell--kids' : ''}`}
      >
        <div className="tv-shell__glow" />
        <div className="tv-shell__noise" />

        {!showHomeLauncher ? (
          <Sidebar
            items={navigationItems}
            activeId={activeNav}
            onSelect={setActiveNav}
            onGoHome={() => setActiveNav('home')}
          />
        ) : null}

        <main className={`main-stage ${showHomeLauncher ? 'main-stage--launcher' : ''}`}>
          {showHomeLauncher ? (
            <section className="launcher-scene">
              <div className="launcher-scene__logo" aria-label="LG U+">
                LG U+
              </div>
              <HomeLauncherPanel
                onOpenMoviesTv={() => setActiveNav('search')}
                onOpenKidsWorld={() => setActiveNav('live')}
                onOpenSmartHome={() => setActiveNav('settings')}
                onOpenYoutube={() =>
                  openExternalUrl('https://www.youtube.com', '유튜브 화면으로 이동했습니다.')
                }
                onOpenTvApps={() => setActiveNav('apps')}
                onOpenSettings={() => setActiveNav('settings')}
              />
            </section>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={currentPage.id}
                className="page-stage"
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.24, ease: 'easeOut' }}
              >
                {showMovieTvSession ? (
                  <MovieTvShowcasePanel
                    clockLabel={formatClock(clock)}
                    statusLabel={statusLabel}
                    onStatusChange={setStatusLabel}
                  />
                ) : showKidsWorldSession ? (
                  <KidsWorldShowcasePanel onStatusChange={setStatusLabel} />
                ) : showTvAppsSession ? (
                  <TvAppsShowcasePanel onStatusChange={setStatusLabel} />
                ) : (
                  <>
                    <header className="top-bar">
                      <div className="top-bar__copy">
                        <span className="top-bar__eyebrow">{currentPage.headerEyebrow}</span>
                        <h1>{currentPage.headerTitle}</h1>
                        <p className="top-bar__description">{currentPage.headerDescription}</p>
                      </div>

                      <div className="top-bar__status">
                        <span>{statusLabel}</span>
                        <strong>{formatClock(clock)}</strong>
                      </div>
                    </header>

                    <section className="hero-grid">
                      <HeroPanel
                        primaryLabel={currentPage.primaryActionLabel}
                        secondaryLabel={currentPage.secondaryActionLabel}
                        spotlight={deferredSpotlight}
                        onPrimaryAction={() => openActionPage('primary', deferredSpotlight)}
                        onSecondaryAction={() => {
                          if (detailPage) {
                            setDetailPage(null)
                            return
                          }
                          openActionPage('secondary', deferredSpotlight)
                        }}
                      />

                      <div className="hero-grid__side-panel">
                        <span className="hero-grid__label">{currentPage.insight.label}</span>
                        <strong>{currentPage.insight.title}</strong>
                        <p>{currentPage.insight.description}</p>

                        <div className="hero-grid__stats">
                          {currentPage.insight.stats.map((stat) => (
                            <div key={`${currentPage.id}-${stat.label}`}>
                              <span>{stat.label}</span>
                              <strong>{stat.value}</strong>
                            </div>
                          ))}
                          <div>
                            <span>?꾩옱 ?좏깮</span>
                            <strong>{deferredSpotlight.title}</strong>
                          </div>
                        </div>
                      </div>
                    </section>

                    {showSettingsPanel ? (
                      <SettingsControlPanel onStatusChange={setStatusLabel} />
                    ) : null}

                    {!showSettingsPanel ? (
                      <div className="content-root">
                        <ContentRoot
                          activeAppId={activeAppId}
                          apps={currentPage.quickApps}
                          dockEyebrow={currentPage.dockEyebrow}
                          dockTitle={currentPage.dockTitle}
                          pageId={currentPage.id}
                          rows={currentPage.rows}
                          onFocusApp={(app) => {
                            setActiveAppId(app.id)
                            previewSpotlight(app.spotlight)
                          }}
                          onLaunchApp={launchApp}
                          onPreviewTitle={previewSpotlight}
                          onLaunchTitle={launchTitle}
                        />
                      </div>
                    ) : null}
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </main>
      </div>
    </FocusContext.Provider>
  )
}

export default App

