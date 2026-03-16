import { useEffect, useState, type CSSProperties } from 'react'
import { FocusContext, useFocusable } from '@noriginmedia/norigin-spatial-navigation'
import { motion } from 'motion/react'
import { type KidsCategory, type KidsPoster, type KidsProfile } from '../data/kidsSession'

type KidsWorldShowcasePanelProps = {
  profile: KidsProfile
  onResetProfile: () => void
  onStatusChange: (label: string) => void
}

function KidsCategoryButton({
  category,
  active,
  onFocusCategory,
}: {
  category: KidsCategory
  active: boolean
  onFocusCategory: (category: KidsCategory) => void
}) {
  const { ref, focused, focusSelf } = useFocusable({
    focusKey: `KIDS_CATEGORY-${category.id}`,
    onFocus: () => onFocusCategory(category),
    onEnterPress: () => onFocusCategory(category),
  })

  return (
    <motion.button
      ref={ref}
      type="button"
      className={`kids-category ${active ? 'is-active' : ''} ${focused ? 'is-focused' : ''}`}
      style={{ '--kids-category-accent': category.accent } as CSSProperties}
      animate={focused ? { y: -3 } : { y: 0 }}
      transition={{ type: 'spring', stiffness: 280, damping: 24 }}
      onMouseEnter={() => focusSelf()}
      onClick={() => onFocusCategory(category)}
    >
      <span className="kids-category__icon">{category.icon}</span>
      <strong>{category.label}</strong>
    </motion.button>
  )
}

function KidsPosterButton({
  poster,
  focusKey,
  onFocusPoster,
  onActivatePoster,
}: {
  poster: KidsPoster
  focusKey: string
  onFocusPoster: (poster: KidsPoster) => void
  onActivatePoster: (poster: KidsPoster) => void
}) {
  const { ref, focused, focusSelf } = useFocusable({
    focusKey,
    onFocus: () => onFocusPoster(poster),
    onEnterPress: () => onActivatePoster(poster),
  })

  return (
    <motion.button
      ref={ref}
      type="button"
      className={`kids-poster ${focused ? 'is-focused' : ''}`}
      style={
        {
          '--kids-poster-accent': poster.accent,
          '--kids-poster-background': poster.background,
        } as CSSProperties
      }
      animate={focused ? { y: -5, scale: 1.02 } : { y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 240, damping: 22 }}
      onMouseEnter={() => focusSelf()}
      onClick={() => onActivatePoster(poster)}
    >
      <div className="kids-poster__art">
        <div className="kids-poster__graphic">
          <span />
          <span />
          <span />
        </div>
        {poster.badge ? <span className="kids-poster__badge">{poster.badge}</span> : null}
      </div>
      <div className="kids-poster__copy">
        <strong>{poster.title}</strong>
        <small>{poster.subtitle}</small>
      </div>
    </motion.button>
  )
}

function KidsProfileSwitchButton({
  profileName,
  onActivate,
}: {
  profileName: string
  onActivate: () => void
}) {
  const { ref, focused, focusSelf } = useFocusable({
    focusKey: 'KIDS_PROFILE_SWITCH',
    onEnterPress: onActivate,
  })

  return (
    <motion.button
      ref={ref}
      type="button"
      className={`kids-world-session__profile-switch ${focused ? 'is-focused' : ''}`}
      animate={focused ? { y: -2 } : { y: 0 }}
      transition={{ type: 'spring', stiffness: 280, damping: 24 }}
      onMouseEnter={() => focusSelf()}
      onClick={onActivate}
    >
      {profileName} 변경
    </motion.button>
  )
}

export function KidsWorldShowcasePanel({
  profile,
  onResetProfile,
  onStatusChange,
}: KidsWorldShowcasePanelProps) {
  const [activeCategory, setActiveCategory] = useState<KidsCategory>(profile.categories[0])
  const [selectedPoster, setSelectedPoster] = useState<KidsPoster>(profile.featuredPosters[0])
  const { ref, focusKey, focusSelf } = useFocusable({
    focusKey: 'KIDS_WORLD_SESSION',
    trackChildren: true,
    preferredChildFocusKey: 'KIDS_PROFILE_SWITCH',
  })

  useEffect(() => {
    setActiveCategory(profile.categories[0])
    setSelectedPoster(profile.featuredPosters[0])
    onStatusChange(`${profile.name} 맞춤 아이들나라를 불러왔습니다.`)
    focusSelf()
  }, [focusSelf, onStatusChange, profile])

  const handleFocusCategory = (category: KidsCategory) => {
    setActiveCategory(category)
    onStatusChange(`${profile.name} · ${category.label}`)
  }

  const handleFocusPoster = (poster: KidsPoster) => {
    setSelectedPoster(poster)
    onStatusChange(`${poster.title} 미리보기`)
  }

  const handleActivatePoster = (poster: KidsPoster) => {
    setSelectedPoster(poster)
    onStatusChange(`${profile.name} · ${poster.title} 선택`)
  }

  return (
    <FocusContext.Provider value={focusKey}>
      <section ref={ref} className="kids-world-session">
        <div className="kids-world-session__profile-bar">
          <div
            className="kids-world-session__profile-card"
            style={{ '--kids-profile-accent': profile.accent } as CSSProperties}
          >
            <div className="kids-world-session__profile-mark">{profile.avatarLabel}</div>
            <div className="kids-world-session__profile-copy">
              <span>{profile.headerBadge}</span>
              <strong>{profile.name}</strong>
              <small>
                {profile.ageLabel} · {profile.summary}
              </small>
            </div>
          </div>

          <KidsProfileSwitchButton profileName={profile.name} onActivate={onResetProfile} />
        </div>

        <div className="kids-world-session__rail">
          <div className="kids-world-session__quick">
            {profile.quickLabels.map((label) => (
              <span key={`${profile.id}-${label}`} className="kids-world-session__quick-item">
                {label}
              </span>
            ))}
          </div>

          <div className="kids-world-session__categories">
            {profile.categories.map((category) => (
              <KidsCategoryButton
                key={category.id}
                category={category}
                active={category.id === activeCategory.id}
                onFocusCategory={handleFocusCategory}
              />
            ))}
          </div>
        </div>

        <div className="kids-world-session__usage">
          <span className="kids-world-session__usage-badge">TV</span>
          <strong>{profile.usageLabel}</strong>
        </div>

        <section className="kids-world-session__featured">
          <div className="kids-world-session__section-head">
            <span className="kids-world-session__free">{profile.headerBadge}</span>
            <h1>{profile.sectionTitle}</h1>
          </div>

          <div className="kids-world-session__poster-row">
            {profile.featuredPosters.map((poster) => (
              <KidsPosterButton
                key={poster.id}
                poster={poster}
                focusKey={`KIDS_POSTER-${poster.id}`}
                onFocusPoster={handleFocusPoster}
                onActivatePoster={handleActivatePoster}
              />
            ))}
          </div>
        </section>

        <div className="kids-world-session__notice">
          <div className="kids-world-session__notice-icon">{profile.notice.icon}</div>
          <div>
            <strong>{profile.notice.title}</strong>
            <p>{profile.notice.description}</p>
          </div>
        </div>

        <div className="kids-world-session__bottom">
          <div className="kids-world-session__mini-row">
            {profile.miniCards.map((card) => (
              <div
                key={card.id}
                className="kids-world-session__mini-card"
                style={{ '--kids-mini-accent': card.accent } as CSSProperties}
              >
                <span>{card.title}</span>
              </div>
            ))}
          </div>

          <div className="kids-world-session__callout">
            <div className="kids-world-session__mascot">{profile.assistantName}</div>
            <button type="button" className="kids-world-session__call-button">
              {profile.assistantActionLabel}
            </button>
          </div>
        </div>

        <div className="kids-world-session__selected">
          <span>{profile.name} 현재 선택</span>
          <strong>{selectedPoster.title}</strong>
        </div>
      </section>
    </FocusContext.Provider>
  )
}
