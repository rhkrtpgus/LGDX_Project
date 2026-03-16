// KidsLayout – 키즈 화면 공통 래퍼
// ┌─────────────────────────────────────────┐
// │  sidebar (64px)  │  topbar (72px)        │
// │                  ├───────────────────────│
// │                  │  content (scroll)     │
// │                  ├───────────────────────│
// │                  │  footer (80px)        │
// └─────────────────────────────────────────┘
import type { ReactNode } from 'react'

interface KidsLayoutProps {
  /** 왼쪽 사이드바 아이콘 버튼들 */
  sidebar: ReactNode
  /** 상단 바 (탭, 공동시청 버튼 등) */
  topbar: ReactNode
  /** 스크롤 가능한 메인 콘텐츠 */
  children: ReactNode
  /** 하단 고정 바 (vision bar + Liri) */
  footer: ReactNode
  /** 배경 그라디언트 or 색상 */
  background?: string
  /** kids data-profile-mode / theme class */
  themeClass?: string
}

export function KidsLayout({
  sidebar,
  topbar,
  children,
  footer,
  background = 'var(--theme-bg, #EAF4FF)',
  themeClass = '',
}: KidsLayoutProps) {
  return (
    <div
      className={`kl-root${themeClass ? ` ${themeClass}` : ''}`}
      style={{ background }}
    >
      {/* Left sidebar */}
      <aside className="kl-sidebar">
        {sidebar}
      </aside>

      {/* Right column */}
      <div className="kl-body">
        <header className="kl-topbar">
          {topbar}
        </header>

        <main className="kl-content">
          {children}
        </main>

        <footer className="kl-footer">
          {footer}
        </footer>
      </div>
    </div>
  )
}
