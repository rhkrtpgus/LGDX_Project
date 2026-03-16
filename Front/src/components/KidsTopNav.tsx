// 키즈 플로우 화면 공통 상단 네비게이션 (← 뒤로 / × 닫기)

type KidsTopNavProps = {
  showBack?: boolean
  onBack?: () => void
  onClose?: () => void
}

export function KidsTopNav({ showBack = true, onBack, onClose }: KidsTopNavProps) {
  return (
    <div className="kids-topnav">
      {showBack ? (
        <button type="button" className="ktn-btn" onClick={onBack} aria-label="뒤로">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}
            strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      ) : (
        <div className="ktn-spacer" />
      )}

      <button type="button" className="ktn-btn" onClick={onClose} aria-label="닫기">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}
          strokeLinecap="round">
          <line x1={18} y1={6} x2={6} y2={18} />
          <line x1={6} y1={6} x2={18} y2={18} />
        </svg>
      </button>
    </div>
  )
}
