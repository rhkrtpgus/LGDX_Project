import { useEffect, useState, type CSSProperties } from 'react'
import { FocusContext, useFocusable } from '@noriginmedia/norigin-spatial-navigation'
import { motion } from 'motion/react'
import {
  movieTvFeaturedTile,
  movieTvShelves,
  movieTvSideTiles,
  movieTvTabs,
  type MovieTvTile,
} from '../data/movieTvSession'

type MovieTvShowcasePanelProps = {
  clockLabel: string
  statusLabel: string
  onStatusChange: (label: string) => void
}

type TabButtonProps = {
  id: string
  label: string
  active: boolean
  onFocusTab: (id: string, label: string) => void
}

type TileButtonProps = {
  tile: MovieTvTile
  focusKey: string
  variant: 'hero' | 'poster' | 'shelf'
  onFocusTile: (tile: MovieTvTile) => void
  onActivateTile: (tile: MovieTvTile) => void
}

function TabButton({ id, label, active, onFocusTab }: TabButtonProps) {
  const { ref, focused, focusSelf } = useFocusable({
    focusKey: `MOVIE_TV_TAB-${id}`,
    onFocus: () => onFocusTab(id, label),
    onEnterPress: () => onFocusTab(id, label),
  })

  return (
    <motion.button
      ref={ref}
      type="button"
      className={`movie-tv-tab ${active ? 'is-active' : ''} ${focused ? 'is-focused' : ''}`}
      animate={focused ? { y: -2 } : { y: 0 }}
      transition={{ type: 'spring', stiffness: 320, damping: 24 }}
      onMouseEnter={() => focusSelf()}
      onClick={() => onFocusTab(id, label)}
    >
      {label}
    </motion.button>
  )
}

function TileButton({
  tile,
  focusKey,
  variant,
  onFocusTile,
  onActivateTile,
}: TileButtonProps) {
  const { ref, focused, focusSelf } = useFocusable({
    focusKey,
    onFocus: () => onFocusTile(tile),
    onEnterPress: () => onActivateTile(tile),
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

  const shouldAnimate = variant === 'shelf'

  return (
    <motion.button
      ref={ref}
      type="button"
      className={`movie-tv-card movie-tv-card--${variant} ${focused ? 'is-focused' : ''}`}
      style={{ '--movie-tv-accent': tile.accent } as CSSProperties}
      animate={shouldAnimate && focused ? { scale: 1.02, y: -4 } : { scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 24 }}
      onMouseEnter={() => focusSelf()}
      onClick={() => onActivateTile(tile)}
    >
      <img className="movie-tv-card__image" src={tile.image} alt="" aria-hidden="true" />
      <div className="movie-tv-card__overlay" />

      <div className="movie-tv-card__copy">
        <span className="movie-tv-card__badge">{tile.badge}</span>
        <strong>{tile.title}</strong>
        <small>{tile.subtitle}</small>
      </div>
    </motion.button>
  )
}

export function MovieTvShowcasePanel({
  clockLabel,
  statusLabel,
  onStatusChange,
}: MovieTvShowcasePanelProps) {
  const [activeTab, setActiveTab] = useState(movieTvTabs[0].id)
  const [selectedTile, setSelectedTile] = useState<MovieTvTile>(movieTvFeaturedTile)

  const { ref, focusKey } = useFocusable({
    focusKey: 'MOVIE_TV_SESSION',
    trackChildren: true,
    preferredChildFocusKey: `MOVIE_TV_TAB-${movieTvTabs[0].id}`,
  })

  const handleFocusTab = (id: string, label: string) => {
    setActiveTab(id)
    onStatusChange(`${label} 탭 선택`)
  }

  const handleFocusTile = (tile: MovieTvTile) => {
    setSelectedTile(tile)
    onStatusChange(`${tile.title} 미리보기`)
  }

  const handleActivateTile = (tile: MovieTvTile) => {
    setSelectedTile(tile)
    onStatusChange(`${tile.title} 선택`)
  }

  return (
    <FocusContext.Provider value={focusKey}>
      <section ref={ref} className="movie-tv-session">
        <div className="movie-tv-session__topbar">
          <div>
            <span className="movie-tv-session__eyebrow">영화 / TV</span>
            <h1>영화 & TV 홈</h1>
            <p>`movieTvSession.ts`에서 이미지와 문구만 바꾸면 같은 레이아웃으로 교체할 수 있습니다.</p>
          </div>

          <div className="movie-tv-session__status">
            <span>{statusLabel}</span>
            <strong>{clockLabel}</strong>
          </div>
        </div>

        <div className="movie-tv-session__tabs">
          {movieTvTabs.map((tab) => (
            <TabButton
              key={tab.id}
              id={tab.id}
              label={tab.label}
              active={tab.id === activeTab}
              onFocusTab={handleFocusTab}
            />
          ))}
        </div>

        <div className="movie-tv-session__hero">
          <TileButton
            tile={movieTvFeaturedTile}
            focusKey="MOVIE_TV_FEATURED"
            variant="hero"
            onFocusTile={handleFocusTile}
            onActivateTile={handleActivateTile}
          />

          <div className="movie-tv-session__hero-side">
            {movieTvSideTiles.map((tile) => (
              <TileButton
                key={tile.id}
                tile={tile}
                focusKey={`MOVIE_TV_SIDE-${tile.id}`}
                variant="poster"
                onFocusTile={handleFocusTile}
                onActivateTile={handleActivateTile}
              />
            ))}
          </div>
        </div>

        <div className="movie-tv-session__info">
          <div className="movie-tv-session__selected">
            <span>현재 미리보기</span>
            <strong>{selectedTile.title}</strong>
            <p>{selectedTile.subtitle}</p>
          </div>
          <div className="movie-tv-session__help">
            <span>이미지 교체</span>
            <strong>이미지 import만 바꾸면 됩니다</strong>
            <p>placeholder 파일 대신 실제 썸네일을 넣어도 레이아웃은 그대로 유지됩니다.</p>
          </div>
        </div>

        {movieTvShelves.map((shelf) => (
          <section key={shelf.id} className="movie-tv-shelf">
            <div className="movie-tv-shelf__heading">
              <h2>{shelf.title}</h2>
            </div>

            <div className="movie-tv-shelf__track">
              {shelf.items.map((tile) => (
                <TileButton
                  key={tile.id}
                  tile={tile}
                  focusKey={`MOVIE_TV_SHELF-${shelf.id}-${tile.id}`}
                  variant="shelf"
                  onFocusTile={handleFocusTile}
                  onActivateTile={handleActivateTile}
                />
              ))}
            </div>
          </section>
        ))}
      </section>
    </FocusContext.Provider>
  )
}
