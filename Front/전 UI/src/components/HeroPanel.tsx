import { FocusContext, useFocusable } from '@noriginmedia/norigin-spatial-navigation'
import { AnimatePresence, motion } from 'motion/react'
import type { Spotlight } from '../data/home'
import { FocusButton } from './FocusButton'

type HeroPanelProps = {
  spotlight: Spotlight
  primaryLabel: string
  secondaryLabel: string
  onPrimaryAction: () => void
  onSecondaryAction: () => void
}

export function HeroPanel({
  spotlight,
  primaryLabel,
  secondaryLabel,
  onPrimaryAction,
  onSecondaryAction,
}: HeroPanelProps) {
  const { ref, focusKey } = useFocusable({
    focusKey: 'HERO_SECTION',
    trackChildren: true,
    preferredChildFocusKey: 'HERO_PRIMARY',
  })

  return (
    <FocusContext.Provider value={focusKey}>
      <section ref={ref} className="hero-panel">
        <AnimatePresence mode="wait">
          <motion.div
            key={spotlight.id}
            className="hero-panel__backdrop"
            style={{ backgroundImage: spotlight.backdrop }}
            initial={{ opacity: 0, scale: 1.03 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.985 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          />
        </AnimatePresence>

        <div className="hero-panel__scrim" />

        <div className="hero-panel__content">
          <span className="hero-panel__eyebrow">{spotlight.eyebrow}</span>
          <h2 className="hero-panel__title">{spotlight.title}</h2>
          <p className="hero-panel__subtitle">{spotlight.subtitle}</p>

          <div className="hero-panel__meta">
            {spotlight.meta.map((value) => (
              <span key={value}>{value}</span>
            ))}
          </div>

          <p className="hero-panel__description">{spotlight.description}</p>

          <div className="hero-panel__chips">
            {spotlight.chips.map((chip) => (
              <span key={chip}>{chip}</span>
            ))}
          </div>

          {spotlight.progress !== undefined ? (
            <div className="hero-panel__progress">
              <div
                className="hero-panel__progress-value"
                style={{ width: `${spotlight.progress}%` }}
              />
            </div>
          ) : null}

          <div className="hero-panel__actions">
            <FocusButton focusKey="HERO_PRIMARY" label={primaryLabel} onActivate={onPrimaryAction} />
            <FocusButton
              focusKey="HERO_SECONDARY"
              label={secondaryLabel}
              variant="secondary"
              onActivate={onSecondaryAction}
            />
          </div>
        </div>
      </section>
    </FocusContext.Provider>
  )
}
