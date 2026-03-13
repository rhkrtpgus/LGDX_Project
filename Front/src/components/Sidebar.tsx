import { FocusContext, useFocusable } from '@noriginmedia/norigin-spatial-navigation'
import { motion } from 'motion/react'
import type { SidebarItem } from '../data/home'

type SidebarProps = {
  items: SidebarItem[]
  activeId: string
  onSelect: (itemId: string) => void
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

export function Sidebar({ items, activeId, onSelect }: SidebarProps) {
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
        className="sidebar"
        animate={{ width: hasFocusedChild ? 220 : 108 }}
        transition={{ type: 'spring', stiffness: 180, damping: 24 }}
      >
        <div className="sidebar__brand">
          <span className="sidebar__brand-mark">LGDX</span>
          <span className={`sidebar__brand-copy ${hasFocusedChild ? 'is-visible' : ''}`}>
            리빙 디스플레이 허브
          </span>
        </div>

        <nav className="sidebar__nav" aria-label="주요 탐색">
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
          리모컨: 방향키 / 확인 / 뒤로
        </div>
      </motion.aside>
    </FocusContext.Provider>
  )
}
