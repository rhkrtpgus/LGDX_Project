import { useState, type CSSProperties } from 'react'
import { FocusContext, useFocusable } from '@noriginmedia/norigin-spatial-navigation'
import { motion } from 'motion/react'
import {
  kidsCategories,
  kidsFeaturedPosters,
  kidsMiniCards,
  type KidsCategory,
  type KidsPoster,
} from '../data/kidsSession'

type KidsWorldShowcasePanelProps = {
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

export function KidsWorldShowcasePanel({ onStatusChange }: KidsWorldShowcasePanelProps) {
  const [activeCategory, setActiveCategory] = useState<KidsCategory>(kidsCategories[0])
  const [selectedPoster, setSelectedPoster] = useState<KidsPoster>(kidsFeaturedPosters[0])

  const { ref, focusKey } = useFocusable({
    focusKey: 'KIDS_WORLD_SESSION',
    trackChildren: true,
    preferredChildFocusKey: `KIDS_CATEGORY-${kidsCategories[0].id}`,
  })

  const handleFocusCategory = (category: KidsCategory) => {
    setActiveCategory(category)
    onStatusChange(`${category.label} 메뉴`)
  }

  const handleFocusPoster = (poster: KidsPoster) => {
    setSelectedPoster(poster)
    onStatusChange(`${poster.title} 미리보기`)
  }

  const handleActivatePoster = (poster: KidsPoster) => {
    setSelectedPoster(poster)
    onStatusChange(`${poster.title} 선택`)
  }

  return (
    <FocusContext.Provider value={focusKey}>
      <section ref={ref} className="kids-world-session">
        <div className="kids-world-session__rail">
          <div className="kids-world-session__quick">
            <span className="kids-world-session__quick-item">시계</span>
            <span className="kids-world-session__quick-item">곰</span>
            <span className="kids-world-session__quick-item">돋</span>
          </div>

          <div className="kids-world-session__categories">
            {kidsCategories.map((category) => (
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
          <strong>오늘 23시간 47분 이용</strong>
        </div>

        <section className="kids-world-session__featured">
          <div className="kids-world-session__section-head">
            <span className="kids-world-session__free">무료</span>
            <h1>아이들나라 인기 추천작</h1>
          </div>

          <div className="kids-world-session__poster-row">
            {kidsFeaturedPosters.map((poster) => (
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
          <div className="kids-world-session__notice-icon">시력</div>
          <div>
            <strong>시력 보호 모드 켜짐</strong>
            <p>영상에 블루라이트 차단 기능이 적용됩니다.</p>
          </div>
        </div>

        <div className="kids-world-session__bottom">
          <div className="kids-world-session__mini-row">
            {kidsMiniCards.map((card) => (
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
            <div className="kids-world-session__mascot">리리</div>
            <button type="button" className="kids-world-session__call-button">
              리리 부르기
            </button>
          </div>
        </div>

        <div className="kids-world-session__selected">
          <span>현재 선택</span>
          <strong>{selectedPoster.title}</strong>
        </div>
      </section>
    </FocusContext.Provider>
  )
}
