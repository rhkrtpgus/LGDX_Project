import { useEffect, useState, type CSSProperties } from 'react'
import { FocusContext, useFocusable } from '@noriginmedia/norigin-spatial-navigation'
import { motion } from 'motion/react'
import { defaultKidsProfile, type KidsProfile } from '../data/kidsSession'

type KidsProfileSelectionPanelProps = {
  profiles: KidsProfile[]
  onSelectProfile: (profile: KidsProfile) => void
  onStatusChange: (label: string) => void
}

function KidsProfileCard({
  profile,
  active,
  onFocusProfile,
  onSelectProfile,
}: {
  profile: KidsProfile
  active: boolean
  onFocusProfile: (profile: KidsProfile) => void
  onSelectProfile: (profile: KidsProfile) => void
}) {
  const { ref, focused, focusSelf } = useFocusable({
    focusKey: `KIDS_PROFILE-${profile.id}`,
    onFocus: () => onFocusProfile(profile),
    onEnterPress: () => onSelectProfile(profile),
  })

  return (
    <motion.button
      ref={ref}
      type="button"
      className={`kids-profile-card ${active ? 'is-active' : ''} ${focused ? 'is-focused' : ''}`}
      style={
        {
          '--kids-profile-accent': profile.accent,
          '--kids-profile-surface': profile.surface,
        } as CSSProperties
      }
      animate={focused ? { y: -6, scale: 1.02 } : { y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 240, damping: 20 }}
      onMouseEnter={() => focusSelf()}
      onClick={() => onSelectProfile(profile)}
    >
      <div className="kids-profile-card__avatar">{profile.avatarLabel}</div>
      <div className="kids-profile-card__copy">
        <strong>{profile.name}</strong>
        <small>{profile.ageLabel}</small>
        <p>{profile.summary}</p>
      </div>
      <div className="kids-profile-card__tags">
        {profile.selectionTags.map((tag) => (
          <span key={`${profile.id}-${tag}`}>{tag}</span>
        ))}
      </div>
    </motion.button>
  )
}

export function KidsProfileSelectionPanel({
  profiles,
  onSelectProfile,
  onStatusChange,
}: KidsProfileSelectionPanelProps) {
  const firstProfile = profiles[0] ?? defaultKidsProfile
  const [previewProfile, setPreviewProfile] = useState<KidsProfile>(firstProfile)
  const { ref, focusKey, focusSelf } = useFocusable({
    focusKey: 'KIDS_PROFILE_SELECTION',
    trackChildren: true,
    preferredChildFocusKey: `KIDS_PROFILE-${firstProfile.id}`,
  })

  useEffect(() => {
    setPreviewProfile(firstProfile)
  }, [firstProfile])

  useEffect(() => {
    focusSelf()
    onStatusChange('시청할 자녀를 선택하세요.')
  }, [focusSelf, onStatusChange])

  const handleFocusProfile = (profile: KidsProfile) => {
    setPreviewProfile(profile)
    onStatusChange(`${profile.name} 프로필 미리보기`)
  }

  const handleSelectProfile = (profile: KidsProfile) => {
    setPreviewProfile(profile)
    onStatusChange(`${profile.name} 맞춤 화면을 준비합니다.`)
    onSelectProfile(profile)
  }

  return (
    <FocusContext.Provider value={focusKey}>
      <section ref={ref} className="kids-profile-selection">
        <header className="kids-profile-selection__header">
          <span className="kids-profile-selection__eyebrow">아이들나라 입장</span>
          <h1>어떤 자녀에게 맞춰 보여드릴까요?</h1>
          <p>자녀를 먼저 선택하면 연령과 취향에 맞는 아이들 TV 화면을 바로 불러옵니다.</p>
        </header>

        <div className="kids-profile-selection__layout">
          <div className="kids-profile-selection__grid">
            {profiles.map((profile) => (
              <KidsProfileCard
                key={profile.id}
                profile={profile}
                active={profile.id === previewProfile.id}
                onFocusProfile={handleFocusProfile}
                onSelectProfile={handleSelectProfile}
              />
            ))}
          </div>

          <aside
            className="kids-profile-preview"
            style={
              {
                '--kids-profile-accent': previewProfile.accent,
                '--kids-profile-surface': previewProfile.surface,
              } as CSSProperties
            }
          >
            <div className="kids-profile-preview__badge">{previewProfile.headerBadge}</div>
            <div className="kids-profile-preview__hero">
              <div className="kids-profile-preview__avatar">{previewProfile.avatarLabel}</div>
              <div>
                <strong>{previewProfile.name}</strong>
                <span>{previewProfile.ageLabel}</span>
              </div>
            </div>

            <p className="kids-profile-preview__description">
              {previewProfile.selectionDescription}
            </p>

            <div className="kids-profile-preview__stats">
              <div>
                <span>이용 시간</span>
                <strong>{previewProfile.usageLabel}</strong>
              </div>
              <div>
                <span>보호 상태</span>
                <strong>{previewProfile.notice.title}</strong>
              </div>
            </div>

            <div className="kids-profile-preview__chips">
              {previewProfile.selectionTags.map((tag) => (
                <span key={`preview-${previewProfile.id}-${tag}`}>{tag}</span>
              ))}
            </div>
          </aside>
        </div>
      </section>
    </FocusContext.Provider>
  )
}
