import { useEffect, useEffectEvent, useRef, useState, type CSSProperties } from 'react'
import { FocusContext, useFocusable } from '@noriginmedia/norigin-spatial-navigation'
import { motion } from 'motion/react'
import { analyzeYoutubeVideo, type AnalysisResult } from '../lib/api'
import { movieTvTabs, movieTvTiles, type MovieTvTile } from '../data/movieTvSession'

type MovieTvShowcasePanelProps = {
  clockLabel: string
  statusLabel: string
  onStatusChange: (label: string) => void
}

type VerificationStatus = 'idle' | 'verifying' | 'verified' | 'blocked' | 'failed'

type VerificationRuntime = {
  status: VerificationStatus
  analysis: AnalysisResult | null
  error: string | null
  checkedAt: string | null
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
  verification: VerificationRuntime
  prioritized: boolean
  onFocusTile: (tile: MovieTvTile) => void
  onActivateTile: (tile: MovieTvTile) => void
}

const defaultRuntime: VerificationRuntime = {
  status: 'idle',
  analysis: null,
  error: null,
  checkedAt: null,
}

const movieTileById = Object.fromEntries(
  movieTvTiles.map((tile) => [tile.id, tile] satisfies [string, MovieTvTile]),
) as Record<string, MovieTvTile>

function buildRuntimeRecord() {
  return movieTvTiles.reduce<Record<string, VerificationRuntime>>((accumulator, tile) => {
    accumulator[tile.id] = defaultRuntime
    return accumulator
  }, {})
}

function isBlockedResult(result: AnalysisResult) {
  return result.hasViolence || result.harmful || result.blockedByCategory
}

function getVerificationLabel(status: VerificationStatus, prioritized: boolean) {
  if (prioritized && status !== 'verified') {
    return 'Priority'
  }

  switch (status) {
    case 'verifying':
      return 'Checking'
    case 'verified':
      return 'Verified'
    case 'blocked':
      return 'Removed'
    case 'failed':
      return 'Retry'
    default:
      return 'Queued'
  }
}

function getVerificationTone(status: VerificationStatus, prioritized: boolean) {
  if (prioritized && status !== 'verified') {
    return 'priority'
  }

  switch (status) {
    case 'verified':
      return 'verified'
    case 'blocked':
      return 'blocked'
    case 'failed':
      return 'failed'
    case 'verifying':
      return 'checking'
    default:
      return 'idle'
  }
}

function extractErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  return 'Unknown verification error'
}

function openVideo(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer')
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
  verification,
  prioritized,
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

  const stateLabel = getVerificationLabel(verification.status, prioritized)
  const stateTone = getVerificationTone(verification.status, prioritized)
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
        <span className={`movie-tv-card__state movie-tv-card__state--${stateTone}`}>
          {stateLabel}
        </span>
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
  const [runtimeByTileId, setRuntimeByTileId] = useState<Record<string, VerificationRuntime>>(
    () => buildRuntimeRecord(),
  )
  const [selectedTileId, setSelectedTileId] = useState(movieTvTiles[0]?.id ?? '')
  const [priorityTileId, setPriorityTileId] = useState<string | null>(null)

  const requestControllerRef = useRef<AbortController | null>(null)
  const currentTileIdRef = useRef<string | null>(null)
  const priorityTileIdRef = useRef<string | null>(null)

  const categoryTiles = movieTvTiles.filter((tile) => tile.categoryId === activeTab)
  const visibleTiles = categoryTiles.filter(
    (tile) => runtimeByTileId[tile.id]?.status !== 'blocked',
  )
  const verifiedTiles = visibleTiles.filter(
    (tile) => runtimeByTileId[tile.id]?.status === 'verified',
  )
  const pendingTiles = visibleTiles.filter((tile) => {
    const status = runtimeByTileId[tile.id]?.status
    return status === 'idle' || status === 'verifying' || status === 'failed'
  })
  const blockedCount = categoryTiles.filter(
    (tile) => runtimeByTileId[tile.id]?.status === 'blocked',
  ).length
  const selectedTile =
    visibleTiles.find((tile) => tile.id === selectedTileId) ?? visibleTiles[0] ?? categoryTiles[0]
  const selectedRuntime = selectedTile ? runtimeByTileId[selectedTile.id] ?? defaultRuntime : null
  const heroTile = selectedTile
  const sideTiles = heroTile
    ? visibleTiles.filter((tile) => tile.id !== heroTile.id).slice(0, 3)
    : []
  const queueProgress = `${verifiedTiles.length}/${categoryTiles.length}`

  const { ref, focusKey } = useFocusable({
    focusKey: 'MOVIE_TV_SESSION',
    trackChildren: true,
    preferredChildFocusKey: `MOVIE_TV_TAB-${movieTvTabs[0].id}`,
  })

  useEffect(() => {
    priorityTileIdRef.current = priorityTileId
  }, [priorityTileId])

  useEffect(() => {
    if (!selectedTile && categoryTiles.length === 0) {
      return
    }

    if (!selectedTile && categoryTiles.length > 0) {
      setSelectedTileId(categoryTiles[0].id)
      return
    }

    if (selectedTile && runtimeByTileId[selectedTile.id]?.status === 'blocked') {
      setSelectedTileId(visibleTiles[0]?.id ?? categoryTiles[0]?.id ?? '')
    }
  }, [categoryTiles, selectedTile, runtimeByTileId, visibleTiles])

  useEffect(() => {
    return () => {
      requestControllerRef.current?.abort()
    }
  }, [])

  const runVerification = useEffectEvent(
    async (tile: MovieTvTile, reason: 'background' | 'priority') => {
      const controller = new AbortController()
      requestControllerRef.current = controller
      currentTileIdRef.current = tile.id

      setRuntimeByTileId((current) => ({
        ...current,
        [tile.id]: {
          ...current[tile.id],
          status: 'verifying',
          error: null,
        },
      }))

      onStatusChange(
        reason === 'priority'
          ? `Checking ${tile.title} first.`
          : `Scanning ${movieTvTabs.find((tab) => tab.id === activeTab)?.label ?? activeTab} recommendations in order.`,
      )

      try {
        const result = await analyzeYoutubeVideo(tile.videoUrl, null, controller.signal)
        const blocked = isBlockedResult(result)
        const shouldAutoplay = priorityTileIdRef.current === tile.id

        setRuntimeByTileId((current) => ({
          ...current,
          [tile.id]: {
            status: blocked ? 'blocked' : 'verified',
            analysis: result,
            error: null,
            checkedAt: new Date().toISOString(),
          },
        }))

        if (blocked) {
          if (shouldAutoplay) {
            setPriorityTileId(null)
          }

          onStatusChange(`${tile.title} was removed after violence or harmful-content detection.`)
          return
        }

        if (shouldAutoplay) {
          setPriorityTileId(null)
          openVideo(tile.videoUrl)
          onStatusChange(`${tile.title} passed verification and is now playing.`)
          return
        }

        onStatusChange(`${tile.title} passed verification.`)
      } catch (error) {
        if (controller.signal.aborted) {
          setRuntimeByTileId((current) => ({
            ...current,
            [tile.id]: {
              ...current[tile.id],
              status: 'idle',
            },
          }))
          return
        }

        const message = extractErrorMessage(error)

        setRuntimeByTileId((current) => ({
          ...current,
          [tile.id]: {
            ...current[tile.id],
            status: 'failed',
            error: message,
          },
        }))

        if (priorityTileIdRef.current === tile.id) {
          setPriorityTileId(null)
        }

        onStatusChange(`${tile.title} failed verification. Select it again to retry.`)
      } finally {
        if (currentTileIdRef.current === tile.id) {
          currentTileIdRef.current = null
        }

        if (requestControllerRef.current === controller) {
          requestControllerRef.current = null
        }
      }
    },
  )

  useEffect(() => {
    const currentTileId = currentTileIdRef.current
    const currentTile = currentTileId ? movieTileById[currentTileId] : null

    if (
      currentTile &&
      currentTile.categoryId !== activeTab &&
      priorityTileIdRef.current === null &&
      requestControllerRef.current
    ) {
      requestControllerRef.current.abort()
      return
    }

    if (
      currentTileId &&
      priorityTileIdRef.current &&
      currentTileId !== priorityTileIdRef.current &&
      requestControllerRef.current
    ) {
      requestControllerRef.current.abort()
      return
    }

    if (currentTileId) {
      return
    }

    const priorityTile = priorityTileId ? movieTileById[priorityTileId] : null
    const priorityRuntime = priorityTile ? runtimeByTileId[priorityTile.id] : null
    const nextPriority =
      priorityTile &&
      priorityRuntime &&
      priorityRuntime.status !== 'verified' &&
      priorityRuntime.status !== 'blocked'
        ? priorityTile
        : null

    const nextBackground = categoryTiles.find(
      (tile) => runtimeByTileId[tile.id]?.status === 'idle',
    )

    const nextTile = nextPriority ?? nextBackground

    if (!nextTile) {
      return
    }

    void runVerification(nextTile, nextPriority ? 'priority' : 'background')
  }, [activeTab, categoryTiles, priorityTileId, runtimeByTileId, runVerification])

  const handleFocusTab = (id: string, label: string) => {
    setPriorityTileId(null)
    requestControllerRef.current?.abort()
    setActiveTab(id)
    const firstTile = movieTvTiles.find((tile) => tile.categoryId === id)
    if (firstTile) {
      setSelectedTileId(firstTile.id)
    }
    onStatusChange(`Showing only ${label} recommendations.`)
  }

  const handleFocusTile = (tile: MovieTvTile) => {
    setSelectedTileId(tile.id)
    const runtime = runtimeByTileId[tile.id] ?? defaultRuntime
    onStatusChange(`Preview ${tile.title} - ${getVerificationLabel(runtime.status, false)}`)
  }

  const handleActivateTile = (tile: MovieTvTile) => {
    const runtime = runtimeByTileId[tile.id] ?? defaultRuntime
    setSelectedTileId(tile.id)

    if (runtime.status === 'verified') {
      openVideo(tile.videoUrl)
      onStatusChange(`${tile.title} is already verified and opens immediately.`)
      return
    }

    if (runtime.status === 'blocked') {
      onStatusChange(`${tile.title} was removed by the safety filter.`)
      return
    }

    if (runtime.status === 'failed') {
      setRuntimeByTileId((current) => ({
        ...current,
        [tile.id]: {
          ...current[tile.id],
          status: 'idle',
          error: null,
        },
      }))
    }

    setPriorityTileId(tile.id)
    onStatusChange(`Verifying ${tile.title} first, then returning to the queue.`)

    if (currentTileIdRef.current && currentTileIdRef.current !== tile.id) {
      requestControllerRef.current?.abort()
    }
  }

  return (
    <FocusContext.Provider value={focusKey}>
      <section ref={ref} className="movie-tv-session">
        <div className="movie-tv-session__topbar">
          <div>
            <span className="movie-tv-session__eyebrow">Movie / TV</span>
            <h1>Verified Category Recommendations</h1>
            <p>
              Only the selected category stays visible. Recommended videos are checked in
              sequence, and violent or harmful matches are removed automatically.
            </p>
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

        {heroTile ? (
          <div className="movie-tv-session__hero">
            <TileButton
              tile={heroTile}
              focusKey="MOVIE_TV_FEATURED"
              variant="hero"
              verification={runtimeByTileId[heroTile.id] ?? defaultRuntime}
              prioritized={priorityTileId === heroTile.id}
              onFocusTile={handleFocusTile}
              onActivateTile={handleActivateTile}
            />

            <div className="movie-tv-session__hero-side">
              {sideTiles.map((tile) => (
                <TileButton
                  key={tile.id}
                  tile={tile}
                  focusKey={`MOVIE_TV_SIDE-${tile.id}`}
                  variant="poster"
                  verification={runtimeByTileId[tile.id] ?? defaultRuntime}
                  prioritized={priorityTileId === tile.id}
                  onFocusTile={handleFocusTile}
                  onActivateTile={handleActivateTile}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="movie-tv-session__empty">
            <strong>No recommendations remain in this category.</strong>
            <p>Everything was filtered out or no safe card is ready to display yet.</p>
          </div>
        )}

        <div className="movie-tv-session__info">
          <div className="movie-tv-session__selected">
            <span>Selected title</span>
            <strong>{selectedTile?.title ?? 'No available title'}</strong>
            <p>
              {selectedTile?.description ??
                'Try another category to continue the recommendation flow.'}
            </p>
            {selectedRuntime ? (
              <div className="movie-tv-session__chips">
                <span>
                  {getVerificationLabel(
                    selectedRuntime.status,
                    priorityTileId === selectedTile?.id,
                  )}
                </span>
                <span>Verified {queueProgress}</span>
                <span>Removed {blockedCount}</span>
              </div>
            ) : null}
          </div>

          <div className="movie-tv-session__help">
            <span>Queue status</span>
            <strong>
              {priorityTileId
                ? 'A clicked title is being verified first.'
                : pendingTiles.length > 0
                  ? 'Recommendations are being checked in sequence.'
                  : 'This category is fully verified.'}
            </strong>
            <p>
              Verified titles open immediately. If a user clicks an unchecked title, that title is
              verified first and the original queue resumes afterwards.
            </p>
            {selectedRuntime?.analysis?.harmfulReasons?.length ? (
              <div className="movie-tv-session__reasons">
                {selectedRuntime.analysis.harmfulReasons.slice(0, 3).map((reason) => (
                  <span key={reason}>{reason}</span>
                ))}
              </div>
            ) : selectedRuntime?.error ? (
              <div className="movie-tv-session__reasons">
                <span>{selectedRuntime.error}</span>
              </div>
            ) : null}
          </div>
        </div>

        {verifiedTiles.length > 0 ? (
          <section className="movie-tv-shelf">
            <div className="movie-tv-shelf__heading">
              <h2>Ready To Play</h2>
            </div>

            <div className="movie-tv-shelf__track">
              {verifiedTiles.map((tile) => (
                <TileButton
                  key={tile.id}
                  tile={tile}
                  focusKey={`MOVIE_TV_VERIFIED-${tile.id}`}
                  variant="shelf"
                  verification={runtimeByTileId[tile.id] ?? defaultRuntime}
                  prioritized={priorityTileId === tile.id}
                  onFocusTile={handleFocusTile}
                  onActivateTile={handleActivateTile}
                />
              ))}
            </div>
          </section>
        ) : null}

        {pendingTiles.length > 0 ? (
          <section className="movie-tv-shelf">
            <div className="movie-tv-shelf__heading">
              <h2>Queued Or Checking</h2>
            </div>

            <div className="movie-tv-shelf__track">
              {pendingTiles.map((tile) => (
                <TileButton
                  key={tile.id}
                  tile={tile}
                  focusKey={`MOVIE_TV_PENDING-${tile.id}`}
                  variant="shelf"
                  verification={runtimeByTileId[tile.id] ?? defaultRuntime}
                  prioritized={priorityTileId === tile.id}
                  onFocusTile={handleFocusTile}
                  onActivateTile={handleActivateTile}
                />
              ))}
            </div>
          </section>
        ) : null}
      </section>
    </FocusContext.Provider>
  )
}
