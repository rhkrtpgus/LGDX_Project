import { useEffect, useState, startTransition, useDeferredValue } from 'react'
import { FocusContext, useFocusable } from '@noriginmedia/norigin-spatial-navigation'
import './App.css'
import { AppDock } from './components/AppDock'
import { ContentRow } from './components/ContentRow'
import { HeroPanel } from './components/HeroPanel'
import { Sidebar } from './components/Sidebar'
import {
  initialSpotlight,
  mediaRows,
  quickApps,
  sidebarItems,
  type MediaItem,
  type QuickApp,
  type Spotlight,
} from './data/home'

function formatClock(date: Date) {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

type ContentRootProps = {
  activeAppId: string
  onFocusApp: (app: QuickApp) => void
  onLaunchApp: (app: QuickApp) => void
  onPreviewTitle: (item: MediaItem) => void
  onLaunchTitle: (item: MediaItem) => void
}

function ContentRoot({
  activeAppId,
  onFocusApp,
  onLaunchApp,
  onPreviewTitle,
  onLaunchTitle,
}: ContentRootProps) {
  const { ref, focusKey } = useFocusable({
    focusKey: 'CONTENT_ROOT',
    trackChildren: true,
    preferredChildFocusKey: 'HERO_SECTION',
  })

  return (
    <FocusContext.Provider value={focusKey}>
      <div ref={ref} className="content-stack">
        <AppDock
          apps={quickApps}
          activeAppId={activeAppId}
          onFocusApp={onFocusApp}
          onLaunchApp={onLaunchApp}
        />

        {mediaRows.map((row) => (
          <ContentRow
            key={row.id}
            row={row}
            onPreview={onPreviewTitle}
            onActivate={onLaunchTitle}
          />
        ))}
      </div>
    </FocusContext.Provider>
  )
}

function App() {
  const [activeNav, setActiveNav] = useState(sidebarItems[0].id)
  const [activeAppId, setActiveAppId] = useState(quickApps[0].id)
  const [spotlight, setSpotlight] = useState<Spotlight>(initialSpotlight)
  const [statusLabel, setStatusLabel] = useState('Launcher ready')
  const [clock, setClock] = useState(() => new Date())
  const deferredSpotlight = useDeferredValue(spotlight)

  const { ref, focusKey, focusSelf } = useFocusable({
    focusKey: 'PAGE',
    trackChildren: true,
    isFocusBoundary: true,
    preferredChildFocusKey: 'CONTENT_ROOT',
  })

  useEffect(() => {
    focusSelf()
  }, [focusSelf])

  useEffect(() => {
    const interval = window.setInterval(() => setClock(new Date()), 30_000)
    return () => window.clearInterval(interval)
  }, [])

  const previewSpotlight = (nextSpotlight: Spotlight) => {
    startTransition(() => {
      setSpotlight(nextSpotlight)
    })
  }

  const launchApp = (app: QuickApp) => {
    setActiveAppId(app.id)
    previewSpotlight(app.spotlight)
    setStatusLabel(`Opening ${app.name}`)
  }

  const launchTitle = (item: MediaItem) => {
    previewSpotlight(item)
    setStatusLabel(`Opening ${item.title}`)
  }

  return (
    <FocusContext.Provider value={focusKey}>
      <div ref={ref} className="tv-shell">
        <div className="tv-shell__glow" />
        <div className="tv-shell__noise" />

        <Sidebar items={sidebarItems} activeId={activeNav} onSelect={setActiveNav} />

        <main className="main-stage">
          <header className="top-bar">
            <div>
              <span className="top-bar__eyebrow">Living Room UI</span>
              <h1>{sidebarItems.find((item) => item.id === activeNav)?.label ?? 'Home'}</h1>
            </div>

            <div className="top-bar__status">
              <span>{statusLabel}</span>
              <strong>{formatClock(clock)}</strong>
            </div>
          </header>

          <section className="hero-grid">
            <HeroPanel
              spotlight={deferredSpotlight}
              onPrimaryAction={() => setStatusLabel(`Play ${deferredSpotlight.title}`)}
              onSecondaryAction={() => setStatusLabel(`Details for ${deferredSpotlight.title}`)}
            />

            <div className="hero-grid__side-panel">
              <span className="hero-grid__label">Interaction Notes</span>
              <strong>Directional focus first</strong>
              <p>
                The home view is structured for TV remotes: left rail navigation, a
                quick-launch dock, and horizontally scrolling content rows.
              </p>

              <div className="hero-grid__stats">
                <div>
                  <span>Apps</span>
                  <strong>{quickApps.length}</strong>
                </div>
                <div>
                  <span>Rails</span>
                  <strong>{mediaRows.length}</strong>
                </div>
                <div>
                  <span>Now Focused</span>
                  <strong>{deferredSpotlight.title}</strong>
                </div>
              </div>
            </div>
          </section>

          <div className="content-root">
            <ContentRoot
              activeAppId={activeAppId}
              onFocusApp={(app) => {
                setActiveAppId(app.id)
                previewSpotlight(app.spotlight)
              }}
              onLaunchApp={launchApp}
              onPreviewTitle={previewSpotlight}
              onLaunchTitle={launchTitle}
            />
          </div>
        </main>
      </div>
    </FocusContext.Provider>
  )
}

export default App
