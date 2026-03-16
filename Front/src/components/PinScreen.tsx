import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'

type PinScreenProps = {
  expectedPin: string
  title?: string
  subtitle?: string
  helperText?: string
  onSuccess: () => void
  onCancel: () => void
}

const PAD_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫']

export function PinScreen({
  expectedPin,
  title = '보호자 PIN 확인',
  subtitle = '부모님의 PIN 4자리를 입력해 주세요',
  helperText,
  onSuccess,
  onCancel,
}: PinScreenProps) {
  const [pin, setPin] = useState('')
  const [shake, setShake] = useState(false)
  const [hint, setHint] = useState('')
  const [success, setSuccess] = useState(false)

  function resetWithError(message: string) {
    setShake(true)
    setHint(message)
    window.setTimeout(() => {
      setShake(false)
      setPin('')
      setHint('')
    }, 900)
  }

  function verify(input: string) {
    if (input === expectedPin) {
      setSuccess(true)
      window.setTimeout(onSuccess, 450)
      return
    }

    resetWithError('PIN 번호가 올바르지 않아요.')
  }

  function press(key: string) {
    if (success) {
      return
    }

    if (key === '⌫') {
      setPin((prev) => prev.slice(0, -1))
      return
    }

    if (pin.length >= 4) {
      return
    }

    const next = `${pin}${key}`
    setPin(next)
    if (next.length === 4) {
      verify(next)
    }
  }

  useEffect(() => {
    function handleKeydown(event: KeyboardEvent) {
      if (event.key >= '0' && event.key <= '9') {
        press(event.key)
      }
      if (event.key === 'Backspace') {
        press('⌫')
      }
      if (event.key === 'Escape') {
        onCancel()
      }
    }

    window.addEventListener('keydown', handleKeydown)
    return () => window.removeEventListener('keydown', handleKeydown)
  }, [onCancel, pin, success])

  return (
    <div className="screen pin-screen">
      <button type="button" className="pin-cancel" onClick={onCancel}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={20} height={20}>
          <polyline points="15 18 9 12 15 6" />
        </svg>
        이전 화면으로 돌아가기
      </button>

      <div className="pin-content">
        <motion.div
          className="pin-lock-icon"
          animate={success ? { scale: 1.14, rotate: [0, -8, 8, 0] } : {}}
          transition={{ duration: 0.5 }}
        >
          {success ? '✓' : 'PIN'}
        </motion.div>

        <h2 className="pin-title">{title}</h2>
        <p className="pin-sub">{subtitle}</p>

        <motion.div
          className="pin-dots"
          animate={shake ? { x: [0, -10, 10, -6, 6, 0] } : {}}
          transition={{ duration: 0.35 }}
        >
          {[0, 1, 2, 3].map((index) => (
            <div
              key={index}
              className={`pin-dot${pin.length > index ? ' pin-dot--filled' : ''}${success ? ' pin-dot--success' : ''}`}
            />
          ))}
        </motion.div>

        <AnimatePresence>
          {hint && (
            <motion.p
              className="pin-hint"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              {hint}
            </motion.p>
          )}
        </AnimatePresence>

        <div className="pin-pad">
          {PAD_KEYS.map((key, index) => (
            <button
              key={`${key}-${index}`}
              type="button"
              className={`pin-key${key === '' ? ' pin-key--empty' : ''}${key === '⌫' ? ' pin-key--del' : ''}`}
              onClick={() => key && press(key)}
              disabled={!key || success}
            >
              {key}
            </button>
          ))}
        </div>

        {helperText && (
          <p className="pin-notice">
            {helperText}
          </p>
        )}
      </div>
    </div>
  )
}
