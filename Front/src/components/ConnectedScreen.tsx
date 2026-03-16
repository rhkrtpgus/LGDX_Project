// 03_계정 연결 완료 알림 (3초 자동 → content)
import { KidsTopNav } from './KidsTopNav'

export function ConnectedScreen() {
  return (
    <div className="screen screen--kids screen--center">
      <KidsTopNav showBack={false} />
      <div className="check-content">
        <h2 className="kc-title">계정 연결이 완료되었습니다</h2>
        <div className="checkmark-circle">
          <svg viewBox="0 0 24 24" fill="none" stroke="#1a1a1a" strokeWidth={2.8}
            strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      </div>
      <div className="auto-bar running" />
    </div>
  )
}
