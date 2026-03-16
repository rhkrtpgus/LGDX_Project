// KidsContentCard – 키즈 홈 범용 콘텐츠 카드
// 모든 모드(개인/공동)에서 동일한 DOM 구조 사용 → CSS 변수로 색상만 교체
import { motion } from 'motion/react'

export interface KidsContentCardProps {
  title: string
  sub: string
  color: string          // 썸네일 배경색
  badge?: string
  size?: 'normal' | 'large'   // large = 공동시청 or 아기 모드 히어로 카드
  onClick?: () => void
}

export function KidsContentCard({
  title,
  sub,
  color,
  badge,
  size = 'normal',
  onClick,
}: KidsContentCardProps) {
  return (
    <motion.div
      className={`kcc-card kcc-card--${size}`}
      whileHover={{ scale: 1.04, y: -4 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 340, damping: 26 }}
      onClick={onClick}
    >
      {/* 썸네일 */}
      <div className="kcc-thumb" style={{ background: color }}>
        {badge && <span className="kcc-badge">{badge}</span>}
        {/* 타이틀 이니셜 */}
        <span className="kcc-initial" aria-hidden>
          {title.charAt(0)}
        </span>
      </div>

      {/* 메타 */}
      <div className="kcc-meta">
        <p className="kcc-title">{title}</p>
        <p className="kcc-sub">{sub}</p>
      </div>
    </motion.div>
  )
}
