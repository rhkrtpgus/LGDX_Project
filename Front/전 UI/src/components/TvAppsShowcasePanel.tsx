import { useEffect, useState, type CSSProperties } from 'react'
import { FocusContext, useFocusable } from '@noriginmedia/norigin-spatial-navigation'
import { motion } from 'motion/react'
import { tvAppsTabs, tvAppsTiles, type TvAppsTile } from '../data/tvAppsSession'
import { AnalysisPanel } from './AnalysisPanel'

type TvAppsShowcasePanelProps = {
  familyId?: number
  preferredChildId?: number | null
  onSelectChildId?: (childId: number | null) => void
  startInYoutubeGuard?: boolean
  onExitYoutubeGuard?: () => void
  onOpenYoutubeUrl: (url: string, statusMessage: string) => void
  onStatusChange: (label: string) => void
}

type TabButtonProps = {
  id: string
  label: string
  active: boolean
  onFocusTab: (id: string, label: string) => void
}

type AppTileProps = {
  tile: TvAppsTile
  onFocusTile: (tile: TvAppsTile) => void
  onActivateTile: (tile: TvAppsTile) => void
}

function TabButton({ id, label, active, onFocusTab }: TabButtonProps) {
  const { ref, focused, focusSelf } = useFocusable({
    focusKey: `TV_APPS_TAB-${id}`,
    onFocus: () => onFocusTab(id, label),
    onEnterPress: () => onFocusTab(id, label),
  })

  return (
    <motion.button
      ref={ref}
      type="button"
      className={`tv-apps-tab ${active ? 'is-active' : ''} ${focused ? 'is-focused' : ''}`}
      animate={focused ? { y: -2 } : { y: 0 }}
      transition={{ type: 'spring', stiffness: 320, damping: 24 }}
      onMouseEnter={() => focusSelf()}
      onClick={() => onFocusTab(id, label)}
    >
      {label}
    </motion.button>
  )
}

function AppTile({ tile, onFocusTile, onActivateTile }: AppTileProps) {
  const { ref, focused, focusSelf } = useFocusable({
    focusKey: `TV_APPS_TILE-${tile.id}`,
    onFocus: () => onFocusTile(tile),
    onEnterPress: () => onActivateTile(tile),
  })

  return (
    <motion.button
      ref={ref}
      type="button"
      className={`tv-apps-tile ${focused ? 'is-focused' : ''}`}
      style={{ '--tv-apps-accent': tile.accent } as CSSProperties}
      animate={focused ? { scale: 1.03, y: -3 } : { scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 24 }}
      onMouseEnter={() => focusSelf()}
      onClick={() => onActivateTile(tile)}
    >
      {tile.badge ? <span className="tv-apps-tile__badge">{tile.badge}</span> : null}
      <strong>{tile.name}</strong>
      <small>{tile.subtitle}</small>
    </motion.button>
  )
}

export function TvAppsShowcasePanel({
  familyId = 1,
  preferredChildId = null,
  onSelectChildId,
  startInYoutubeGuard = false,
  onExitYoutubeGuard,
  onOpenYoutubeUrl,
  onStatusChange,
}: TvAppsShowcasePanelProps) {
  const [activeTab, setActiveTab] = useState('apps')
  const [selectedTile, setSelectedTile] = useState<TvAppsTile>(tvAppsTiles[0])
  const [showYoutubeGuard, setShowYoutubeGuard] = useState(startInYoutubeGuard)

  const { ref, focusKey } = useFocusable({
    focusKey: 'TV_APPS_SESSION',
    trackChildren: true,
    preferredChildFocusKey: 'TV_APPS_TAB-apps',
  })

  useEffect(() => {
    setShowYoutubeGuard(startInYoutubeGuard)
  }, [startInYoutubeGuard])

  const handleFocusTab = (id: string, label: string) => {
    setActiveTab(id)
    onStatusChange(`${label} 메뉴 선택`)
  }

  const handleFocusTile = (tile: TvAppsTile) => {
    setSelectedTile(tile)
    onStatusChange(`${tile.name} 앱 미리보기`)
  }

  const handleActivateTile = (tile: TvAppsTile) => {
    setSelectedTile(tile)

    if (tile.id === 'youtube') {
      setShowYoutubeGuard(true)
      onStatusChange('유튜브 재생 전 안전 분석 화면을 열었습니다.')
      return
    }

    onStatusChange(`${tile.name} 앱 선택`)
  }

  const handleCloseYoutubeGuard = () => {
    setShowYoutubeGuard(false)
    onExitYoutubeGuard?.()
    onStatusChange('TV앱 목록으로 돌아왔습니다.')
  }

  return (
    <FocusContext.Provider value={focusKey}>
      <section ref={ref} className="tv-apps-session">
        {showYoutubeGuard ? (
          <div className="tv-apps-session__analysis">
            <AnalysisPanel
              familyId={familyId}
              preferredChildId={preferredChildId}
              onSelectChildId={onSelectChildId}
              hideHistory
              launchButtonLabel="분석 통과 URL 열기"
              onBack={handleCloseYoutubeGuard}
              onOpenUrl={onOpenYoutubeUrl}
              onStatusChange={onStatusChange}
            />
          </div>
        ) : (
          <div className="tv-apps-session__inner">
            <div className="tv-apps-tabs">
              {tvAppsTabs.map((tab) => (
                <TabButton
                  key={tab.id}
                  id={tab.id}
                  label={tab.label}
                  active={activeTab === tab.id}
                  onFocusTab={handleFocusTab}
                />
              ))}
            </div>

            <div className="tv-apps-session__intro">
              <strong>TV앱</strong>
              <p>유튜브는 선택 후 바로 열지 않고, 자녀 기준 사전 분석을 거친 뒤 열도록 연결했습니다.</p>
            </div>

            <div className="tv-apps-grid">
              {tvAppsTiles.map((tile) => (
                <AppTile
                  key={tile.id}
                  tile={tile}
                  onFocusTile={handleFocusTile}
                  onActivateTile={handleActivateTile}
                />
              ))}
            </div>

            <div className="tv-apps-session__footer">
              <span>현재 선택</span>
              <strong>{selectedTile.name}</strong>
            </div>
          </div>
        )}
      </section>
    </FocusContext.Provider>
  )
}
