import type { CSSProperties } from 'react'
import { FocusContext, useFocusable } from '@noriginmedia/norigin-spatial-navigation'
import { motion } from 'motion/react'
import type { QuickApp } from '../data/home'

type AppDockProps = {
  apps: QuickApp[]
  activeAppId: string
  eyebrow: string
  title: string
  onFocusApp: (app: QuickApp) => void
  onLaunchApp: (app: QuickApp) => void
}

type AppTileProps = {
  app: QuickApp
  isActive: boolean
  onFocusApp: (app: QuickApp) => void
  onLaunchApp: (app: QuickApp) => void
}

function AppTile({ app, isActive, onFocusApp, onLaunchApp }: AppTileProps) {
  const { ref, focused, focusSelf } = useFocusable({
    focusKey: `APP-${app.id}`,
    onFocus: () => onFocusApp(app),
    onEnterPress: () => onLaunchApp(app),
  })

  return (
    <motion.button
      ref={ref}
      type="button"
      className={`app-tile ${focused ? 'is-focused' : ''} ${isActive ? 'is-active' : ''}`}
      style={{ '--tile-accent': app.accent } as CSSProperties}
      animate={focused ? { scale: 1.06, y: -6 } : { scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 22 }}
      onMouseEnter={() => focusSelf()}
      onClick={() => onLaunchApp(app)}
    >
      <span className="app-tile__shortcut">{app.shortcut}</span>
      <span className="app-tile__text">
        <strong>{app.name}</strong>
        <small>{app.category}</small>
      </span>
    </motion.button>
  )
}

export function AppDock({
  apps,
  activeAppId,
  eyebrow,
  title,
  onFocusApp,
  onLaunchApp,
}: AppDockProps) {
  const { ref, focusKey, hasFocusedChild } = useFocusable({
    focusKey: 'APP_DOCK',
    trackChildren: true,
    preferredChildFocusKey: `APP-${activeAppId}`,
  })

  return (
    <FocusContext.Provider value={focusKey}>
      <section ref={ref} className={`dock-panel ${hasFocusedChild ? 'has-focused-child' : ''}`}>
        <div className="section-heading">
          <span className="section-heading__eyebrow">{eyebrow}</span>
          <h2>{title}</h2>
        </div>

        <div className="app-dock">
          {apps.map((app) => (
            <AppTile
              key={app.id}
              app={app}
              isActive={activeAppId === app.id}
              onFocusApp={onFocusApp}
              onLaunchApp={onLaunchApp}
            />
          ))}
        </div>
      </section>
    </FocusContext.Provider>
  )
}
