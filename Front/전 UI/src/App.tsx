import { useEffect, useMemo, useState, startTransition, useDeferredValue } from 'react'
import { FocusContext, useFocusable } from '@noriginmedia/norigin-spatial-navigation'
import { AnimatePresence, motion } from 'motion/react'
import './App.css'
import { AppDock } from './components/AppDock'
import { ContentRow } from './components/ContentRow'
import { HeroPanel } from './components/HeroPanel'
import { HomeLauncherPanel } from './components/HomeLauncherPanel'
import { KidsProfileSelectionPanel } from './components/KidsProfileSelectionPanel'
import { KidsWorldShowcasePanel } from './components/KidsWorldShowcasePanel'
import { MovieTvShowcasePanel } from './components/MovieTvShowcasePanel'
import { SettingsControlPanel } from './components/SettingsControlPanel'
import { Sidebar } from './components/Sidebar'
import { TvAppsShowcasePanel } from './components/TvAppsShowcasePanel'
import { buildActionPage } from './data/actionPage'
import {
  initialSpotlight,
  type MediaItem,
  type PageContent,
  type QuickApp,
  type SidebarItem,
  type Spotlight,
} from './data/home'
import { buildKidsProfiles, defaultKidsProfile, type KidsProfile } from './data/kidsSession'
import { pageContentById } from './data/pages'
import {
  fetchFamilySelectionPreference,
  fetchParentChildren,
  updateFamilySelectionPreference,
  type ParentChild,
} from './lib/api'

const DEFAULT_FAMILY_ID = 1
const FAMILY_STORAGE_KEY = 'lgdx:selected-family-id'
const CHILD_STORAGE_KEY = 'lgdx:selected-child-id'

function readStoredNumber(key: string) {
  if (typeof window === 'undefined') {
    return null
  }

  const rawValue = window.localStorage.getItem(key)

  if (!rawValue) {
    return null
  }

  const parsedValue = Number(rawValue)
  return Number.isFinite(parsedValue) ? parsedValue : null
}

function writeStoredNumber(key: string, value: number | null) {
  if (typeof window === 'undefined') {
    return
  }

  if (value == null) {
    window.localStorage.removeItem(key)
    return
  }

  window.localStorage.setItem(key, String(value))
}

function formatClock(date: Date) {
  return new Intl.DateTimeFormat('ko-KR', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

function toAgeLabel(birthYear: number) {
  const age = Math.max(1, new Date().getFullYear() - birthYear)
  return `${age}세`
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
  const [selectedFamilyId, setSelectedFamilyId] = useState<number | null>(
    () => readStoredNumber(FAMILY_STORAGE_KEY) ?? DEFAULT_FAMILY_ID,
  )
  const [backendChildren, setBackendChildren] = useState<ParentChild[]>([])
  const [selectedChildId, setSelectedChildId] = useState<number | null>(() =>
    readStoredNumber(CHILD_STORAGE_KEY),
  )
  const [serverSelectionLoaded, setServerSelectionLoaded] = useState(false)
  const [selectedKidsProfileId, setSelectedKidsProfileId] = useState<string | null>(null)
  const [openYoutubeGuardFromLauncher, setOpenYoutubeGuardFromLauncher] = useState(false)
  const [detailPage, setDetailPage] = useState<PageContent | null>(null)
  const [spotlight, setSpotlight] = useState<Spotlight>(initialSpotlight)
  const [statusLabel, setStatusLabel] = useState(pageContentById.home.readyLabel)
  const [clock, setClock] = useState(() => new Date())

  const kidsProfiles = useMemo(
    () =>
      buildKidsProfiles(
        backendChildren.map((child) => ({
          childId: child.childId,
          childName: child.childName,
          ageLabel: toAgeLabel(child.birthYear),
        })),
      ),
    [backendChildren],
  )

  const selectedKidsProfile =
    kidsProfiles.find((profile) => profile.id === selectedKidsProfileId) ?? null
  const basePage = pageContentById[activeNav] ?? pageContentById.home
  const currentPage = detailPage ?? basePage
  const showHomeLauncher = !detailPage && activeNav === 'home'
  const showMovieTvSession = !detailPage && activeNav === 'search'
  const showKidsProfileSelection = !detailPage && activeNav === 'live' && !selectedKidsProfile
  const showKidsWorldSession = !detailPage && activeNav === 'live' && !!selectedKidsProfile
  const showKidsFlow = !detailPage && activeNav === 'live'
  const showTvAppsSession = !detailPage && activeNav === 'apps'
  const showSettingsPanel = !detailPage && activeNav === 'settings'
  const deferredSpotlight = useDeferredValue(spotlight)
  const pageStageKey =
    detailPage?.id ??
    (activeNav === 'live'
      ? `live-${selectedKidsProfileId ?? 'pick'}`
      : activeNav === 'apps' && openYoutubeGuardFromLauncher
        ? 'apps-youtube-guard'
        : currentPage.id)

  const { ref, focusKey, focusSelf } = useFocusable({
    focusKey: 'PAGE',
    trackChildren: true,
    isFocusBoundary: true,
    preferredChildFocusKey: showHomeLauncher
      ? 'HOME_LAUNCHER'
      : showMovieTvSession
        ? 'MOVIE_TV_SESSION'
        : showKidsProfileSelection
          ? 'KIDS_PROFILE_SELECTION'
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
    writeStoredNumber(FAMILY_STORAGE_KEY, selectedFamilyId)
  }, [selectedFamilyId])

  useEffect(() => {
    writeStoredNumber(CHILD_STORAGE_KEY, selectedChildId)
  }, [selectedChildId])

  useEffect(() => {
    if (!selectedFamilyId) {
      setServerSelectionLoaded(true)
      return
    }

    let cancelled = false
    setServerSelectionLoaded(false)

    void fetchFamilySelectionPreference(selectedFamilyId)
      .then((preference) => {
        if (cancelled) {
          return
        }

        setSelectedChildId((current) => preference.selectedChildId ?? current)
      })
      .catch(() => {
        if (cancelled) {
          return
        }
      })
      .finally(() => {
        if (!cancelled) {
          setServerSelectionLoaded(true)
        }
      })

    return () => {
      cancelled = true
    }
  }, [selectedFamilyId])

  useEffect(() => {
    if (!selectedFamilyId) {
      setBackendChildren([])
      setSelectedChildId(null)
      return
    }

    void fetchParentChildren(selectedFamilyId)
      .then((children) => {
        setBackendChildren(children)
        setSelectedChildId((current) => {
          if (current != null && children.some((child) => child.childId === current)) {
            return current
          }

          return children[0]?.childId ?? null
        })
      })
      .catch(() => {
        setBackendChildren([])
        setSelectedChildId(null)
      })
  }, [selectedFamilyId])

  useEffect(() => {
    if (!selectedFamilyId || !serverSelectionLoaded) {
      return
    }

    void updateFamilySelectionPreference({
      familyId: selectedFamilyId,
      selectedChildId,
    }).catch(() => {})
  }, [selectedChildId, selectedFamilyId, serverSelectionLoaded])

  useEffect(() => {
    if (selectedChildId == null) {
      setSelectedKidsProfileId(null)
      return
    }

    const matchedProfile =
      kidsProfiles.find((profile) => profile.backendChildId === selectedChildId) ?? null

    setSelectedKidsProfileId((current) => {
      if (!matchedProfile) {
        return null
      }

      return current === matchedProfile.id ? current : matchedProfile.id
    })
  }, [kidsProfiles, selectedChildId])

  useEffect(() => {
    setDetailPage(null)

    if (activeNav === 'live' && selectedChildId == null) {
      setStatusLabel('시청할 자녀를 선택하세요.')
    }

    if (activeNav !== 'apps') {
      setOpenYoutubeGuardFromLauncher(false)
    }
  }, [activeNav, selectedChildId])

  useEffect(() => {
    setActiveAppId(currentPage.quickApps[0]?.id ?? '')

    if (!(activeNav === 'live' && !detailPage)) {
      setStatusLabel(currentPage.readyLabel)
    }

    startTransition(() => {
      setSpotlight(currentPage.spotlight)
    })
  }, [activeNav, currentPage, detailPage])

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
      openExternalUrl(app.spotlight.externalUrl, `${app.name} 화면으로 이동했습니다.`)
      return
    }

    setActiveAppId(app.id)
    previewSpotlight(app.spotlight)
    openActionPage('app', app.spotlight)
  }

  const launchTitle = (item: MediaItem) => {
    if (detailPage && (item.id.includes('-back') || item.badge === '복귀')) {
      setDetailPage(null)
      return
    }

    previewSpotlight(item)
    openActionPage('item', item)
  }

  const handleSelectKidsProfile = (profile: KidsProfile) => {
    setSelectedKidsProfileId(profile.id)
    setSelectedChildId(profile.backendChildId ?? null)
    setStatusLabel(`${profile.name} 맞춤 아이들나라를 준비했습니다.`)
  }

  const handleResetKidsProfile = () => {
    setSelectedChildId(null)
    setSelectedKidsProfileId(null)
    setStatusLabel('시청할 자녀를 다시 선택하세요.')
  }

  const handleOpenYoutubeEntry = () => {
    setOpenYoutubeGuardFromLauncher(true)
    setActiveNav('apps')
    setStatusLabel('유튜브 실행 전 안전 분석 화면으로 이동했습니다.')
  }

  return (
    <FocusContext.Provider value={focusKey}>
      <div
        ref={ref}
        className={`tv-shell ${showHomeLauncher ? 'tv-shell--launcher' : ''} ${showKidsFlow ? 'tv-shell--kids' : ''}`}
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
                onOpenYoutube={handleOpenYoutubeEntry}
                onOpenTvApps={() => setActiveNav('apps')}
                onOpenSettings={() => setActiveNav('settings')}
              />
            </section>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={pageStageKey}
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
                ) : showKidsProfileSelection ? (
                  <KidsProfileSelectionPanel
                    profiles={kidsProfiles.length > 0 ? kidsProfiles : [defaultKidsProfile]}
                    onSelectProfile={handleSelectKidsProfile}
                    onStatusChange={setStatusLabel}
                  />
                ) : showKidsWorldSession ? (
                  <KidsWorldShowcasePanel
                    profile={selectedKidsProfile ?? kidsProfiles[0] ?? defaultKidsProfile}
                    onResetProfile={handleResetKidsProfile}
                    onStatusChange={setStatusLabel}
                  />
                ) : showTvAppsSession ? (
                  <TvAppsShowcasePanel
                    familyId={selectedFamilyId ?? DEFAULT_FAMILY_ID}
                    preferredChildId={selectedChildId}
                    onSelectChildId={setSelectedChildId}
                    startInYoutubeGuard={openYoutubeGuardFromLauncher}
                    onExitYoutubeGuard={() => setOpenYoutubeGuardFromLauncher(false)}
                    onOpenYoutubeUrl={openExternalUrl}
                    onStatusChange={setStatusLabel}
                  />
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
                            <span>현재 선택</span>
                            <strong>{deferredSpotlight.title}</strong>
                          </div>
                        </div>
                      </div>
                    </section>

                    {showSettingsPanel ? (
                      <SettingsControlPanel
                        onStatusChange={setStatusLabel}
                        selectedFamilyId={selectedFamilyId}
                        selectedChildId={selectedChildId}
                        onSelectFamilyId={setSelectedFamilyId}
                        onSelectChildId={setSelectedChildId}
                      />
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
