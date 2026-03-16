import type { CSSProperties } from 'react'
import { FocusContext, useFocusable } from '@noriginmedia/norigin-spatial-navigation'
import { motion } from 'motion/react'
import type { SidebarItem } from '../data/home'

type SidebarProps = {
  items: SidebarItem[]
  activeId: string
  onSelect: (itemId: string) => void
  onGoHome: () => void
}

type SidebarButtonProps = {
  item: SidebarItem
  expanded: boolean
  isActive: boolean
  onSelect: (itemId: string) => void
}

function SidebarButton({
  item,
  expanded,
  isActive,
  onSelect,
}: SidebarButtonProps) {
  const { ref, focused, focusSelf } = useFocusable({
    focusKey: `NAV-${item.id}`,
    onFocus: () => onSelect(item.id),
    onEnterPress: () => onSelect(item.id),
  })

  return (
    <motion.button
      ref={ref}
      type="button"
      className={`sidebar__item ${focused ? 'is-focused' : ''} ${isActive ? 'is-active' : ''}`}
      style={{ '--sidebar-accent': item.accent ?? '#f1cd46' } as CSSProperties}
      animate={focused ? { x: 8, scale: 1.02 } : { x: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 320, damping: 26 }}
      onMouseEnter={() => focusSelf()}
      onClick={() => onSelect(item.id)}
    >
      <span className="sidebar__item-mark">{item.shortLabel}</span>
      <span className={`sidebar__item-copy ${expanded ? 'is-visible' : ''}`}>
        <strong>{item.label}</strong>
        <small>{item.hint}</small>
      </span>
    </motion.button>
  )
}

function SidebarHomeButton({
  expanded,
  onGoHome,
}: {
  expanded: boolean
  onGoHome: () => void
}) {
  const { ref, focused, focusSelf } = useFocusable({
    focusKey: 'NAV-LOGO',
    onEnterPress: onGoHome,
  })

  return (
    <motion.button
      ref={ref}
      type="button"
      className={`sidebar__brand sidebar__brand-button ${focused ? 'is-focused' : ''}`}
      animate={focused ? { x: 6, scale: 1.02 } : { x: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 320, damping: 26 }}
      onMouseEnter={() => focusSelf()}
      onClick={onGoHome}
    >
      <span className="sidebar__brand-mark">LG</span>
      <span className={`sidebar__brand-copy ${expanded ? 'is-visible' : ''}`}>LG U+ 홈</span>
    </motion.button>
  )
}

export function Sidebar({ items, activeId, onSelect, onGoHome }: SidebarProps) {
  const { ref, focusKey, hasFocusedChild } = useFocusable({
    focusKey: 'SIDEBAR',
    trackChildren: true,
    preferredChildFocusKey: `NAV-${activeId}`,
    isFocusBoundary: true,
    focusBoundaryDirections: ['left'],
  })

  return (
    <FocusContext.Provider value={focusKey}>
      <motion.aside
        ref={ref}
        className={`sidebar sidebar--${activeId} ${hasFocusedChild ? 'is-expanded' : 'is-collapsed'}`}
        animate={{ width: hasFocusedChild ? 256 : 116 }}
        transition={{ type: 'spring', stiffness: 180, damping: 24 }}
      >
        <SidebarHomeButton expanded={hasFocusedChild} onGoHome={onGoHome} />

        <nav className="sidebar__nav" aria-label="주요 메뉴">
          {items.map((item) => (
            <SidebarButton
              key={item.id}
              item={item}
              expanded={hasFocusedChild}
              isActive={activeId === item.id}
              onSelect={onSelect}
            />
          ))}
        </nav>

        <div className={`sidebar__footer ${hasFocusedChild ? 'is-visible' : ''}`}>
          방향키 이동 / 확인 선택 / 뒤로 가기
        </div>
      </motion.aside>
    </FocusContext.Provider>
  )
}
