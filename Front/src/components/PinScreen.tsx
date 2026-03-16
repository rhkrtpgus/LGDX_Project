// PIN 입력 화면 – 키즈 → 어른 모드 전환 시 비밀번호 확인
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import type { ScreenId } from '../data/kidsProfileFlow'

type PinScreenProps = {
  onSuccess: () => void          // 올바른 PIN → 어른 홈으로
  onCancel: () => void           // 취소 → 키즈 홈으로
  onNavigate: (s: ScreenId) => void
}

const CORRECT_PIN = '1234'       // 프로토타입 기본 PIN
const PAD = ['1','2','3','4','5','6','7','8','9','','0','⌫']

export function PinScreen({ onSuccess, onCancel }: PinScreenProps) {
  const [pin, setPin]         = useState('')
  const [shake, setShake]     = useState(false)
  const [hint, setHint]       = useState('')
  const [success, setSuccess] = useState(false)

  function press(key: string) {
    if (success) return
    if (key === '⌫') { setPin(p => p.slice(0, -1)); return }
    if (pin.length >= 4) return
    const next = pin + key
    setPin(next)
    if (next.length === 4) verify(next)
  }

  function verify(input: string) {
    if (input === CORRECT_PIN) {
      setSuccess(true)
      setTimeout(onSuccess, 600)
    } else {
      setShake(true)
      setHint('잘못된 비밀번호입니다')
      setTimeout(() => { setShake(false); setPin(''); setHint('') }, 800)
    }
  }

  // 키보드 지원
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key >= '0' && e.key <= '9') press(e.key)
      else if (e.key === 'Backspace') press('⌫')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pin, success])

  return (
    <div className="screen pin-screen">
      {/* 뒤로 */}
      <button type="button" className="pin-cancel" onClick={onCancel}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
          strokeLinecap="round" strokeLinejoin="round" width={20} height={20}>
          <polyline points="15 18 9 12 15 6" />
        </svg>
        키즈 화면으로 돌아가기
      </button>

      <div className="pin-content">
        {/* 자물쇠 아이콘 */}
        <motion.div
          className="pin-lock-icon"
          animate={success ? { scale: 1.2, rotate: [0, -10, 10, 0] } : {}}
        >
          {success ? '🔓' : '🔒'}
        </motion.div>

        <h2 className="pin-title">어른 모드로 전환</h2>
        <p className="pin-sub">부모 비밀번호 4자리를 입력해 주세요</p>

        {/* PIN 도트 */}
        <motion.div
          className="pin-dots"
          animate={shake ? { x: [0, -10, 10, -8, 8, 0] } : {}}
          transition={{ duration: 0.4 }}
        >
          {[0,1,2,3].map(i => (
            <div
              key={i}
              className={`pin-dot${pin.length > i ? ' pin-dot--filled' : ''}${success ? ' pin-dot--success' : ''}`}
            />
          ))}
        </motion.div>

        {/* 에러/힌트 메시지 */}
        <AnimatePresence>
          {hint && (
            <motion.p className="pin-hint"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}>
              {hint}
            </motion.p>
          )}
        </AnimatePresence>

        {/* 숫자 패드 */}
        <div className="pin-pad">
          {PAD.map((key, i) => (
            <button
              key={i}
              type="button"
              className={`pin-key${key === '' ? ' pin-key--empty' : ''}${key === '⌫' ? ' pin-key--del' : ''}`}
              onClick={() => key && press(key)}
              disabled={!key || success}
            >
              {key}
            </button>
          ))}
        </div>

        <p className="pin-notice">
          💡 프로토타입 기본 PIN: <strong>1234</strong>
        </p>
      </div>
    </div>
  )
}
