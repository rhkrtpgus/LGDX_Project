import { useState, type CSSProperties } from 'react'
import { FocusContext, useFocusable } from '@noriginmedia/norigin-spatial-navigation'
import { motion } from 'motion/react'
import type { MediaItem, MediaRow } from '../data/home'

type ContentRowProps = {
  row: MediaRow
  onPreview: (item: MediaItem) => void
  onActivate: (item: MediaItem) => void
}

type MediaCardProps = {
  item: MediaItem
  rowId: string
  index: number
  onPreview: (item: MediaItem, index: number) => void
  onActivate: (item: MediaItem) => void
}

function MediaCard({
  item,
  rowId,
  index,
  onPreview,
  onActivate,
}: MediaCardProps) {
  const { ref, focused, focusSelf } = useFocusable({
    focusKey: `CARD-${rowId}-${item.id}`,
    onFocus: () => onPreview(item, index),
    onEnterPress: () => onActivate(item),
  })

  return (
    <motion.button
      ref={ref}
      type="button"
      className={`media-card ${focused ? 'is-focused' : ''}`}
      style={{ '--card-accent': item.accent } as CSSProperties}
      animate={focused ? { scale: 1.05, y: -10 } : { scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 250, damping: 24 }}
      onMouseEnter={() => focusSelf()}
      onClick={() => onActivate(item)}
    >
      <div className="media-card__art" style={{ backgroundImage: item.backdrop }}>
        {item.badge ? <span className="media-card__badge">{item.badge}</span> : null}
      </div>

      <div className="media-card__content">
        <span className="media-card__match">{item.match}</span>
        <strong>{item.title}</strong>
        <span className="media-card__subtitle">{item.subtitle}</span>

        <div className="media-card__meta">
          {item.meta.slice(0, 2).map((value) => (
            <span key={value}>{value}</span>
          ))}
        </div>

        {item.progress !== undefined ? (
          <div className="media-card__progress">
            <div className="media-card__progress-value" style={{ width: `${item.progress}%` }} />
          </div>
        ) : null}
      </div>
    </motion.button>
  )
}

export function ContentRow({ row, onPreview, onActivate }: ContentRowProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const { ref, focusKey, hasFocusedChild } = useFocusable({
    focusKey: `ROW-${row.id}`,
    trackChildren: true,
    preferredChildFocusKey: `CARD-${row.id}-${row.items[0].id}`,
  })

  const translateX = Math.max(0, activeIndex - 2) * 248

  return (
    <FocusContext.Provider value={focusKey}>
      <section ref={ref} className={`content-row ${hasFocusedChild ? 'has-focused-child' : ''}`}>
        <div className="section-heading">
          <span className="section-heading__eyebrow">추천 라인</span>
          <h2>{row.title}</h2>
          <p>{row.description}</p>
        </div>

        <div className="content-row__viewport">
          <motion.div
            className="content-row__track"
            animate={{ x: -translateX }}
            transition={{ type: 'spring', stiffness: 130, damping: 24 }}
          >
            {row.items.map((item, index) => (
              <MediaCard
                key={item.id}
                item={item}
                rowId={row.id}
                index={index}
                onPreview={(previewItem, previewIndex) => {
                  setActiveIndex(previewIndex)
                  onPreview(previewItem)
                }}
                onActivate={onActivate}
              />
            ))}
          </motion.div>
        </div>
      </section>
    </FocusContext.Provider>
  )
}
