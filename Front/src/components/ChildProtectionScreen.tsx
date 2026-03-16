// 키즈 보호 설정 – LG webOS 다크 스타일 + Netflix 자녀 관리 UX
// [리스트 뷰] 자녀 카드 목록  →  클릭  →  [상세 뷰] ProfileSettingsDetail
import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import type { ScreenId } from '../data/kidsProfileFlow'
import type { ChildProfile } from '../data/profiles'
import { getThemeByAge } from '../data/profiles'
import { ProfileSettingsDetail } from './ProfileSettingsDetail'

// ─── 콘텐츠 등급 ──────────────────────────────────────────────────────────────
const RATINGS = [
  {
    id: 'all',
    label: '전체관람가',
    color: '#4CAF50',
    desc: '모든 연령이 시청 가능한 콘텐츠만 노출됩니다.',
  },
  {
    id: '7plus',
    label: '7세 이상',
    color: '#FFC107',
    desc: '만 7세 이상 콘텐츠까지 허용됩니다. (학습·동요 포함)',
  },
  {
    id: '12plus',
    label: '12세 이상',
    color: '#FF5722',
    desc: '만 12세 이상 콘텐츠까지 허용됩니다. (어드벤처·추리 포함)',
  },
]
void RATINGS

// ─── 가상 시청 기록 ────────────────────────────────────────────────────────────
const MOCK_HISTORY: Record<string, { label: string; mins: number; color: string }[]> = {
  mina: [
    { label: '동요', mins: 45, color: '#FF8C42' },
    { label: '생활습관', mins: 30, color: '#5B9BD5' },
    { label: '애니', mins: 20, color: '#7DC67E' },
  ],
  junsu: [
    { label: '학습', mins: 60, color: '#5B9BD5' },
    { label: '놀이예술', mins: 35, color: '#FF8C42' },
    { label: '말배우기', mins: 25, color: '#9B87D4' },
  ],
}

type Props = {
  onNavigate: (screen: ScreenId) => void
  profiles: ChildProfile[]
  activeProfileId: string
  onSwitchProfile: (id: string) => void
  onUpdateTimeLimit: (profileId: string, minutes: number) => void
}

type View = 'list' | 'detail'

export function ChildProtectionScreen({
  onNavigate,
  profiles,
  activeProfileId,
  onSwitchProfile,
  onUpdateTimeLimit,
}: Props) {
  const [view, setView]       = useState<View>('list')
  const [detailId, setDetailId] = useState<string>(activeProfileId)

  // 리스트 → 상세
  function openDetail(id: string) {
    onSwitchProfile(id)
    setDetailId(id)
    setView('detail')
  }

  const slideVariants = {
    enterRight:  { x:  60, opacity: 0 },
    enterLeft:   { x: -60, opacity: 0 },
    center:      { x: 0,   opacity: 1, transition: { type: 'spring' as const, damping: 22, stiffness: 260 } },
    exitLeft:    { x: -60, opacity: 0, transition: { duration: 0.18 } },
    exitRight:   { x:  60, opacity: 0, transition: { duration: 0.18 } },
  }

  return (
    <div className="screen settings-screen">

      {/* ── 좌측 사이드바 ── */}
      <nav className="settings-sidenav">
        <div className="ssn-item">
          <div className="ssn-dot ssn-dot--orange" />
          <div>
            <p className="ssn-label">영화/TV방송</p>
            <p className="ssn-sub">채널과 콘텐츠</p>
          </div>
        </div>
        <div className="ssn-item">
          <div className="ssn-dot ssn-dot--rainbow" />
          <div>
            <p className="ssn-label">키즈</p>
            <p className="ssn-sub">아동 추천 화면</p>
          </div>
        </div>
        <div className="ssn-item">
          <div className="ssn-dot ssn-dot--blue" />
          <div>
            <p className="ssn-label">TV앱</p>
            <p className="ssn-sub">유튜브 보호 기능</p>
          </div>
        </div>
        <div className="ssn-item">
          <div className="ssn-dot ssn-dot--teal" />
          <div>
            <p className="ssn-label">계정 정보</p>
            <p className="ssn-sub">LG ID 연결 상태</p>
          </div>
        </div>

        {/* 가족 설정 – active */}
        <div className="ssn-item ssn-item--family ssn-item--active">
          <div className="ssn-family-icon">
            <svg viewBox="0 0 24 24" fill="none" width={18} height={18}>
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="#FF8C42" strokeWidth={1.8} strokeLinecap="round"/>
              <circle cx={9} cy={7} r={4} stroke="#FF8C42" strokeWidth={1.8}/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke="#5B9BD5" strokeWidth={1.8} strokeLinecap="round"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="#5B9BD5" strokeWidth={1.8} strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <p className="ssn-label">가족 설정</p>
            <p className="ssn-sub">키즈 보호 및 시청 관리</p>
          </div>
        </div>

        <div className="ssn-item ssn-item--bottom">
          <div className="ssn-dot ssn-dot--pink" />
          <div>
            <p className="ssn-label">보안 설정</p>
            <p className="ssn-sub">시스템과 동의 관리</p>
          </div>
        </div>

        {/* 세부 서브메뉴 */}
        <div className="ssn-sub-menu">
          <div
            className={`ssn-sub-item${view === 'list' ? ' ssn-sub-item--active' : ''}`}
            onClick={() => setView('list')}
            style={{ cursor: 'pointer' }}
          >
            자녀 프로필 목록
          </div>
          {view === 'detail' && (
            <div className="ssn-sub-item ssn-sub-item--active">
              {profiles.find(p => p.id === detailId)?.name} 상세 설정
            </div>
          )}
        </div>
      </nav>

      {/* ── 우측 콘텐츠 ── */}
      <div className="settings-content cps-content">
        <AnimatePresence mode="wait">
          {view === 'list' ? (
            <motion.div
              key="list"
              className="cps-list-view"
              initial="enterLeft" animate="center" exit="exitLeft"
              variants={slideVariants}
            >
              <ListView profiles={profiles} onOpenDetail={openDetail} />
            </motion.div>
          ) : (
            <motion.div
              key={`detail-${detailId}`}
              className="cps-detail-view"
              initial="enterRight" animate="center" exit="exitRight"
              variants={slideVariants}
              style={{ height: '100%' }}
            >
              <ProfileSettingsDetail
                profile={profiles.find(p => p.id === detailId) ?? profiles[0]}
                onUpdateTimeLimit={onUpdateTimeLimit}
                onSave={() => setView('list')}
                onCancel={() => setView('list')}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 뒤로 */}
      <button
        type="button"
        className="settings-close"
        onClick={() => onNavigate('settings')}
        aria-label="뒤로"
      >
        ←
      </button>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════════════
   리스트 뷰 – 자녀 카드 목록
   ════════════════════════════════════════════════════════════════════════════ */
function ListView({
  profiles,
  onOpenDetail,
}: {
  profiles: ChildProfile[]
  onOpenDetail: (id: string) => void
}) {
  return (
    <div className="cps-list">
      <div className="cps-list-header">
        <div className="cps-kids-logo">
          <span className="cps-kids-k" style={{ color: '#FF4444' }}>K</span>
          <span className="cps-kids-i" style={{ color: '#FF8C00' }}>i</span>
          <span className="cps-kids-d" style={{ color: '#FFD700' }}>d</span>
          <span className="cps-kids-s" style={{ color: '#4CAF50' }}>s</span>
        </div>
        <div>
          <h1 className="cps-list-title">가족 설정</h1>
          <p className="cps-list-sub">자녀별 시청 시간·콘텐츠 등급·보호 설정</p>
        </div>
      </div>

      <div className="cps-profile-list">
        {profiles.map(p => {
          const t = getThemeByAge(p.age)
          const hist = MOCK_HISTORY[p.id] ?? MOCK_HISTORY['mina']
          const totalMins = hist.reduce((s, h) => s + h.mins, 0)
          const remaining = Math.max(0, p.timeLimit - totalMins)
          return (
            <motion.button
              key={p.id}
              type="button"
              className="cps-profile-card"
              whileHover={{ x: 6 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              onClick={() => onOpenDetail(p.id)}
            >
              {/* 아바타 */}
              <div className="cps-avatar" style={{ background: p.color }}>
                {p.name[0]}
              </div>

              {/* 정보 */}
              <div className="cps-card-info">
                <div className="cps-card-top">
                  <span className="cps-card-name">{p.name}</span>
                  <span className="cps-card-age">{p.age}세</span>
                  <span className="cps-card-theme" style={{ background: t.accent }}>
                    {t.label.split('·')[0]}
                  </span>
                </div>
                <div className="cps-card-stats">
                  <div className="cps-stat-pill">
                    <span className="cps-stat-pill-icon">⏱</span>
                    오늘 남은 시간
                    <strong style={{ color: remaining < 20 ? '#FF5722' : t.accent }}>
                      {remaining}분
                    </strong>
                  </div>
                  <div className="cps-stat-pill">
                    <span className="cps-stat-pill-icon">📺</span>
                    일일 제한
                    <strong>{p.timeLimit}분</strong>
                  </div>
                  <div className="cps-stat-pill">
                    <span className="cps-stat-pill-icon">🔒</span>
                    등급
                    <strong>전체관람가</strong>
                  </div>
                </div>

                {/* 미니 진행 바 */}
                <div className="cps-progress-bar">
                  <div
                    className="cps-progress-fill"
                    style={{
                      width: `${Math.min(100, (totalMins / p.timeLimit) * 100)}%`,
                      background: t.accent,
                    }}
                  />
                </div>
                <p className="cps-progress-label">
                  오늘 {totalMins}분 시청 / {p.timeLimit}분 허용
                </p>
              </div>

              {/* 화살표 */}
              <div className="cps-card-arrow">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                  strokeLinecap="round" strokeLinejoin="round" width={18} height={18}>
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            </motion.button>
          )
        })}
      </div>

      <p className="cps-list-note">
        💡 자녀를 선택하면 시청 시간, 콘텐츠 등급, 시청 기록을 상세히 관리할 수 있습니다.
      </p>
    </div>
  )
}

// DetailView는 ProfileSettingsDetail 컴포넌트로 대체됨
