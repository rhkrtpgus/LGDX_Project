import { useEffect, useState, startTransition, useDeferredValue } from 'react'
import { FocusContext, useFocusable } from '@noriginmedia/norigin-spatial-navigation'
import { AnimatePresence, motion } from 'motion/react'
import './App.css'
import { AnalysisPanel } from './components/AnalysisPanel'
import { AppDock } from './components/AppDock'
import { ContentRow } from './components/ContentRow'
import { DashboardPanel } from './components/DashboardPanel'
import { HeroPanel } from './components/HeroPanel'
import { SettingsControlPanel } from './components/SettingsControlPanel'
import { SystemHealthPanel } from './components/SystemHealthPanel'
import { Sidebar } from './components/Sidebar'
import { initialSpotlight, sidebarItems, type MediaItem, type PageContent, type QuickApp, type Spotlight } from './data/home'
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

function App() {
  const [activeNav, setActiveNav] = useState(sidebarItems[0].id)
  const [activeAppId, setActiveAppId] = useState(pageContentById.home.quickApps[0].id)
  const [detailPage, setDetailPage] = useState<PageContent | null>(null)
  const [spotlight, setSpotlight] = useState<Spotlight>(initialSpotlight)
  const [statusLabel, setStatusLabel] = useState(pageContentById.home.readyLabel)
  const [clock, setClock] = useState(() => new Date())
  const deferredSpotlight = useDeferredValue(spotlight)
  const basePage = pageContentById[activeNav] ?? pageContentById.home
  const currentPage = detailPage ?? basePage

  const { ref, focusKey, focusSelf } = useFocusable({
    focusKey: 'PAGE',
    trackChildren: true,
    isFocusBoundary: true,
    preferredChildFocusKey: `CONTENT_ROOT-${currentPage.id}`,
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
    if (detailPage && app.category === '복귀') {
      setDetailPage(null)
      return
    }

    if (app.spotlight.externalUrl) {
      setActiveAppId(app.id)
      previewSpotlight(app.spotlight)
      openExternalUrl(app.spotlight.externalUrl, `${app.name}를 새 탭에서 열었습니다.`)
      return
    }

    setActiveAppId(app.id)
    previewSpotlight(app.spotlight)
    openActionPage('app', app.spotlight)
  }

  const launchTitle = (item: MediaItem) => {
    if (detailPage && item.badge === '복귀') {
      setDetailPage(null)
      return
    }

    previewSpotlight(item)
    openActionPage('item', item)
  }

  return (
    <FocusContext.Provider value={focusKey}>
      <div ref={ref} className="tv-shell">
        <div className="tv-shell__glow" />
        <div className="tv-shell__noise" />

        <Sidebar items={sidebarItems} activeId={activeNav} onSelect={setActiveNav} />

        <main className="main-stage">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage.id}
              className="page-stage"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.24, ease: 'easeOut' }}
            >
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
                      <span>현재 선택</span>
                      <strong>{deferredSpotlight.title}</strong>
                    </div>
                  </div>
                </div>
              </section>

              {!detailPage && activeNav === 'home' ? (
                <DashboardPanel onStatusChange={setStatusLabel} />
              ) : null}

              {!detailPage && activeNav === 'search' ? (
                <AnalysisPanel onStatusChange={setStatusLabel} />
              ) : null}

              {!detailPage && activeNav === 'settings' ? (
                <>
                  <SystemHealthPanel onStatusChange={setStatusLabel} />
                  <SettingsControlPanel onStatusChange={setStatusLabel} />
                </>
              ) : null}

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
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </FocusContext.Provider>
  )
}

export default App
