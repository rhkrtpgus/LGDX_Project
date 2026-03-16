import { useFocusable } from '@noriginmedia/norigin-spatial-navigation'
import { motion } from 'motion/react'

type FocusButtonProps = {
  focusKey: string
  label: string
  variant?: 'primary' | 'secondary'
  onActivate: () => void
}

export function FocusButton({
  focusKey,
  label,
  variant = 'primary',
  onActivate,
}: FocusButtonProps) {
  const { ref, focused, focusSelf } = useFocusable({
    focusKey,
    onEnterPress: onActivate,
  })

  return (
    <motion.button
      ref={ref}
      type="button"
      className={`focus-button focus-button--${variant} ${focused ? 'is-focused' : ''}`}
      animate={focused ? { scale: 1.04, y: -4 } : { scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 280, damping: 24 }}
      onMouseEnter={() => focusSelf()}
      onClick={onActivate}
    >
      {label}
    </motion.button>
  )
}
