import { useEffect, type CSSProperties } from 'react'
import { FocusContext, useFocusable } from '@noriginmedia/norigin-spatial-navigation'
import { motion } from 'motion/react'
import launcherStageFloral from '../assets/launcher-stage-floral.jpg'

type LauncherItem = {
  id: string
  title: string
  subtitle: string
  accent: string
  onOpen: () => void
}

type HomeLauncherPanelProps = {
  onOpenMoviesTv: () => void
  onOpenKidsWorld: () => void
  onOpenSmartHome: () => void
  onOpenYoutube: () => void
  onOpenTvApps: () => void
  onOpenSettings: () => void
}

function LauncherButton({ item }: { item: LauncherItem }) {
  const { ref, focused, focusSelf } = useFocusable({
    focusKey: `LAUNCHER-${item.id}`,
    onEnterPress: item.onOpen,
  })

  useEffect(() => {
    if (!focused || !ref.current) {
      return
    }

    ;(ref.current as HTMLElement).scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center',
    })
  }, [focused, ref])

  return (
    <motion.button
      ref={ref}
      type="button"
      className={`launcher-tile ${focused ? 'is-focused' : ''}`}
      style={{ '--launcher-accent': item.accent } as CSSProperties}
      animate={focused ? { scale: 1.05, y: -6 } : { scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 240, damping: 20 }}
      onMouseEnter={() => focusSelf()}
      onClick={item.onOpen}
    >
      <strong>{item.title}</strong>
      <small>{item.subtitle}</small>
    </motion.button>
  )
}

export function HomeLauncherPanel({
  onOpenMoviesTv,
  onOpenKidsWorld,
  onOpenSmartHome,
  onOpenYoutube,
  onOpenTvApps,
  onOpenSettings,
}: HomeLauncherPanelProps) {
  const items: LauncherItem[] = [
    {
      id: 'movies-tv',
      title: '영화/TV방송',
      subtitle: '채널 및 VOD',
      accent: '#e6b329',
      onOpen: onOpenMoviesTv,
    },
    {
      id: 'kids-world',
      title: '아이들나라',
      subtitle: '키즈 추천',
      accent: '#f08b3c',
      onOpen: onOpenKidsWorld,
    },
    {
      id: 'smart-home',
      title: '스마트홈',
      subtitle: '생활 연결',
      accent: '#ce5da6',
      onOpen: onOpenSmartHome,
    },
    {
      id: 'youtube',
      title: '유튜브',
      subtitle: '바로 열기',
      accent: '#cc2335',
      onOpen: onOpenYoutube,
    },
    {
      id: 'tv-apps',
      title: 'TV앱',
      subtitle: '앱 모아보기',
      accent: '#5f63ff',
      onOpen: onOpenTvApps,
    },
    {
      id: 'settings',
      title: '설정',
      subtitle: '시스템 관리',
      accent: '#8e949f',
      onOpen: onOpenSettings,
    },
  ]

  const { ref, focusKey } = useFocusable({
    focusKey: 'HOME_LAUNCHER',
    trackChildren: true,
    preferredChildFocusKey: 'LAUNCHER-movies-tv',
  })

  return (
    <FocusContext.Provider value={focusKey}>
      <section ref={ref} className="launcher-panel">
        <div className="launcher-panel__stage">
          <img
            className="launcher-panel__artwork"
            src={launcherStageFloral}
            alt=""
            aria-hidden="true"
          />
        </div>

        <div className="launcher-panel__dock">
          <div className="launcher-grid">
            {items.map((item) => (
              <LauncherButton key={item.id} item={item} />
            ))}
          </div>
        </div>
      </section>
    </FocusContext.Provider>
  )
}
