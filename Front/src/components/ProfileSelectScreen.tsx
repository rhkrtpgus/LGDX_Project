// 00_프로필 선택 화면 – ripple 전환 애니메이션
import { useState } from 'react'
import type { ScreenId } from '../data/kidsProfileFlow'
import type { ChildProfile } from '../data/profiles'
import { getThemeByAge } from '../data/profiles'

type ProfileSelectScreenProps = {
  profiles: ChildProfile[]
  onSelectProfile: (profileId: string) => void
  onNavigate: (screen: ScreenId) => void
}

interface RippleState {
  x: number
  y: number
  color: string
  active: boolean
}

export function ProfileSelectScreen({
  profiles,
  onSelectProfile,
  onNavigate,
}: ProfileSelectScreenProps) {
  const [ripple, setRipple] = useState<RippleState | null>(null)

  function handleSelect(profile: ChildProfile, e: React.MouseEvent) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const x = rect.left + rect.width / 2
    const y = rect.top + rect.height / 2

    setRipple({ x, y, color: profile.color, active: true })

    setTimeout(() => {
      onSelectProfile(profile.id)
      onNavigate('kids-main')
      setRipple(null)
    }, 600)
  }

  function handleParent(e: React.MouseEvent) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const x = rect.left + rect.width / 2
    const y = rect.top + rect.height / 2

    setRipple({ x, y, color: '#1a1a2e', active: true })
    setTimeout(() => {
      onNavigate('main')
      setRipple(null)
    }, 600)
  }

  return (
    <div className="screen pss-screen">
      {/* 배경 그라데이션 */}
      <div className="pss-bg" />

      <div className="pss-content">
        <h1 className="pss-title">누가 보고 있나요?</h1>
        <p className="pss-sub">프로필을 선택하면 맞춤 콘텐츠가 시작돼요</p>

        <div className="pss-cards">
          {/* 자녀 프로필 카드들 */}
          {profiles.map((profile) => {
            const theme = getThemeByAge(profile.age)
            return (
              <button
                key={profile.id}
                type="button"
                className="pss-card"
                onClick={(e) => handleSelect(profile, e)}
              >
                {/* 아바타 */}
                <div
                  className="pss-avatar"
                  style={{ background: profile.color, boxShadow: `0 8px 32px ${profile.color}88` }}
                >
                  <span className="pss-avatar-char">{profile.name[0]}</span>
                  <div
                    className="pss-avatar-ring"
                    style={{ borderColor: theme.accent }}
                  />
                </div>
                <p className="pss-name">{profile.name}</p>
                <p className="pss-age">{profile.age}세</p>
                <div className="pss-theme-chip" style={{ background: theme.accent }}>
                  {theme.label}
                </div>
              </button>
            )
          })}

          {/* 새 프로필 추가 */}
          <button
            type="button"
            className="pss-card pss-card--add"
            onClick={() => onNavigate('profile-create')}
          >
            <div className="pss-avatar pss-avatar--add">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
                <line x1={12} y1={5} x2={12} y2={19} />
                <line x1={5} y1={12} x2={19} y2={12} />
              </svg>
            </div>
            <p className="pss-name">프로필 추가</p>
            <p className="pss-age">새 아이 등록</p>
          </button>

          {/* 부모 모드 */}
          <button
            type="button"
            className="pss-card pss-card--parent"
            onClick={handleParent}
          >
            <div className="pss-avatar pss-avatar--parent">
              <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={1.8} strokeLinecap="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx={12} cy={7} r={4} />
              </svg>
            </div>
            <p className="pss-name">부모 모드</p>
            <p className="pss-age">관리자 화면</p>
          </button>
        </div>
      </div>

      {/* Ripple 오버레이 */}
      {ripple && (
        <div
          className="pss-ripple"
          style={{
            left: ripple.x,
            top: ripple.y,
            background: ripple.color,
          }}
        />
      )}
    </div>
  )
}
