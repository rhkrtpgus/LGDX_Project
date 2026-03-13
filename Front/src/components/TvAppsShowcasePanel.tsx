import { useState, type CSSProperties } from 'react'
import { FocusContext, useFocusable } from '@noriginmedia/norigin-spatial-navigation'
import { motion } from 'motion/react'
import { tvAppsTabs, tvAppsTiles, type TvAppsTile } from '../data/tvAppsSession'

type TvAppsShowcasePanelProps = {
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

export function TvAppsShowcasePanel({ onStatusChange }: TvAppsShowcasePanelProps) {
  const [activeTab, setActiveTab] = useState('apps')
  const [selectedTile, setSelectedTile] = useState<TvAppsTile>(tvAppsTiles[0])

  const { ref, focusKey } = useFocusable({
    focusKey: 'TV_APPS_SESSION',
    trackChildren: true,
    preferredChildFocusKey: 'TV_APPS_TAB-apps',
  })

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
    onStatusChange(`${tile.name} 앱 선택`)
  }

  return (
    <FocusContext.Provider value={focusKey}>
      <section ref={ref} className="tv-apps-session">
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
            <p>TV화면용 유튜브, 뮤직, 키즈 앱을 한곳에 모은 화면입니다.</p>
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
      </section>
    </FocusContext.Provider>
  )
}
