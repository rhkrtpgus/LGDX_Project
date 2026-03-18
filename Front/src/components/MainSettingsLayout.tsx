import { useMemo, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import type { ChildProfile } from '../data/profiles'
import {
  YOUTUBE_CATEGORY_OPTIONS,
  type YoutubeCategoryId,
  type YoutubeCategorySettings,
} from '../data/youtubeExperience'
import type {
  AnalysisResponse,
  ParentAlertResponse,
  ChildWatchPolicyResponse,
  MonitorGuidanceSettings,
  ParentChildResponse,
  ParentViewingHistoryResponse,
  RuntimeSettingsResponse,
  SystemHealthResponse,
} from '../lib/api'
import { formatMinutes } from '../lib/integration'
import { ProfileSettingsDetail } from './ProfileSettingsDetail'
import { ViewingHistoryPanel } from './ViewingHistoryPanel'

type NavId = 'network' | 'display' | 'family' | 'youtube' | 'history' | 'system' | 'smartcam'

type Props = {
  onBack: () => void
  profiles: ChildProfile[]
  activeProfileId: string
  onUpdateTimeLimit: (id: string, mins: number) => void
  onUpdateWatchPolicy: (childId: number, patch: Partial<ChildWatchPolicyResponse>) => Promise<void> | void
  monitorGuidanceSettings?: MonitorGuidanceSettings
  onUpdateMonitorGuidanceSettings?: (childId: number, patch: Partial<MonitorGuidanceSettings>) => void
  initialSection?: NavId
  familyName: string
  childSummaries: ParentChildResponse[]
  viewingHistory: ParentViewingHistoryResponse[]
  recentAlerts: ParentAlertResponse[]
  analysisHistory: AnalysisResponse[]
  runtimeSettings: RuntimeSettingsResponse | null
  systemHealth: SystemHealthResponse | null
  onUpdateRuntimeSettings: (patch: Partial<RuntimeSettingsResponse>) => Promise<void> | void
  serverError: string | null
  youtubeCategorySettings: YoutubeCategorySettings
  onUpdateYoutubeCategory: (categoryId: YoutubeCategoryId, enabled: boolean) => void
  parentPin: string
  onUpdateParentPin: (nextPin: string) => void
}

const NAV_ITEMS: Array<{ id: NavId; label: string; sub: string }> = [
  { id: 'network', label: '네트워크', sub: '기본 연결 상태' },
  { id: 'display', label: '화면·소리', sub: '기본 TV 설정' },
  { id: 'family', label: '가족 보호', sub: '자녀 보호와 시청 제한' },
  { id: 'youtube', label: '유튜브 필터', sub: '허용 카테고리 관리' },
  { id: 'history', label: '시청 기록', sub: 'TV 시청 리포트' },
  { id: 'system', label: '기기 상태', sub: '연결 상태 확인' },
  { id: 'smartcam', label: '시청 케어', sub: '자세와 시청 상태 확인' },
]

export function MainSettingsLayout({
  onBack,
  profiles,
  activeProfileId,
  onUpdateTimeLimit,
  onUpdateWatchPolicy,
  monitorGuidanceSettings,
  onUpdateMonitorGuidanceSettings,
  initialSection = 'network',
  familyName,
  childSummaries,
  viewingHistory,
  recentAlerts,
  analysisHistory,
  runtimeSettings,
  systemHealth,
  onUpdateRuntimeSettings,
  serverError,
  youtubeCategorySettings,
  onUpdateYoutubeCategory,
  parentPin,
  onUpdateParentPin,
}: Props) {
  const [activeNav, setActiveNav] = useState<NavId>(initialSection)
  const [familyDetailId, setFamilyDetailId] = useState<string | null>(null)

  const selectedProfile = profiles.find((profile) => profile.id === familyDetailId)
  const selectedChildSummary = childSummaries.find((child) => `child-${child.childId}` === familyDetailId)

  return (
    <div className="msl-root">
      <nav className="msl-nav" aria-label="설정 메뉴">
        <div className="msl-nav-title">설정</div>
        {NAV_ITEMS.map((item) => {
          const isActive = activeNav === item.id
          return (
            <button
              key={item.id}
              type="button"
              className={`msl-nav-item${isActive ? ' msl-nav-item--active' : ''}`}
              onClick={() => {
                setActiveNav(item.id)
                setFamilyDetailId(null)
              }}
            >
              <span className="msl-nav-text">
                <span className="msl-nav-label">{item.label}</span>
                <span className="msl-nav-sub">{item.sub}</span>
              </span>
            </button>
          )
        })}
        <button type="button" className="msl-close-btn" onClick={onBack}>
          닫기
        </button>
      </nav>

      <div className="msl-panel">
        <AnimatePresence mode="wait">
          {activeNav === 'family' && selectedProfile ? (
            <motion.div
              key={`detail-${selectedProfile.id}`}
              className="msl-panel-inner"
              initial={{ x: 40, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
            >
              <ProfileSettingsDetail
                profile={selectedProfile}
                childSummary={selectedChildSummary ?? null}
                onUpdateTimeLimit={onUpdateTimeLimit}
                onUpdateWatchPolicy={onUpdateWatchPolicy}
                monitorGuidanceSettings={monitorGuidanceSettings}
                onUpdateMonitorGuidanceSettings={onUpdateMonitorGuidanceSettings}
                onSave={() => setFamilyDetailId(null)}
                onCancel={() => setFamilyDetailId(null)}
              />
            </motion.div>
          ) : (
            <motion.div
              key={activeNav}
              className="msl-panel-inner"
              initial={{ x: 40, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
            >
              {activeNav === 'network' && <NetworkPanel />}
              {activeNav === 'display' && <DisplayPanel activeProfileName={profiles.find((profile) => profile.id === activeProfileId)?.name ?? '기본'} />}
              {activeNav === 'family' && (
                <FamilyPanel
                  profiles={profiles}
                  childSummaries={childSummaries}
                  activeProfileId={activeProfileId}
                  onOpenDetail={setFamilyDetailId}
                  parentPin={parentPin}
                  onUpdateParentPin={onUpdateParentPin}
                />
              )}
              {activeNav === 'youtube' && (
                <YoutubePanel
                  youtubeCategorySettings={youtubeCategorySettings}
                  onUpdateYoutubeCategory={onUpdateYoutubeCategory}
                />
              )}
              {activeNav === 'history' && (
                <HistoryPanel
                  familyName={familyName}
                  viewingHistory={viewingHistory}
                  recentAlerts={recentAlerts}
                  analysisHistory={analysisHistory}
                />
              )}
              {activeNav === 'system' && (
                <SystemPanel
                  systemHealth={systemHealth}
                  runtimeSettings={runtimeSettings}
                  serverError={serverError}
                />
              )}
              {activeNav === 'smartcam' && (
                <CarePanel
                  runtimeSettings={runtimeSettings}
                  systemHealth={systemHealth}
                  onUpdateRuntimeSettings={onUpdateRuntimeSettings}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

function TVToggle({
  value,
  onChange,
  accent = '#7C4DFF',
}: {
  value: boolean
  onChange: (v: boolean) => void
  accent?: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      className={`tv-toggle${value ? ' tv-toggle--on' : ''}`}
      style={value ? { background: accent } : {}}
      onClick={() => onChange(!value)}
    >
      <span className="tv-toggle-knob" />
    </button>
  )
}

function SettingRow({
  label,
  sub,
  children,
}: {
  label: string
  sub?: string
  children?: ReactNode
}) {
  return (
    <div className="msl-row">
      <div className="msl-row-text">
        <p className="msl-row-label">{label}</p>
        {sub && <p className="msl-row-sub">{sub}</p>}
      </div>
      {children && <div className="msl-row-control">{children}</div>}
    </div>
  )
}

function SectionHeader({ title }: { title: string }) {
  return <p className="msl-section-header">{title}</p>
}

function NetworkPanel() {
  return (
    <div className="msl-content">
      <h2 className="msl-panel-title">네트워크</h2>
      <div className="msl-card">
        <SectionHeader title="연결 개요" />
        <SettingRow label="와이파이" sub="프로젝트 네트워크에 정상적으로 연결되어 있습니다.">
          <span className="msl-status-chip msl-status-chip--ok">연결됨</span>
        </SettingRow>
        <SettingRow label="서비스 연결" sub="TV와 보호 기능, 리포트 서비스가 같은 네트워크로 연결되어 있습니다.">
          <span className="msl-status-chip">정상</span>
        </SettingRow>
      </div>
    </div>
  )
}

function DisplayPanel({ activeProfileName }: { activeProfileName: string }) {
  const [eyeCare, setEyeCare] = useState(true)

  return (
    <div className="msl-content">
      <h2 className="msl-panel-title">화면·소리</h2>
      <div className="msl-card">
        <SectionHeader title="기본 TV 설정" />
        <SettingRow label="눈 보호 모드" sub="밝기와 화면 톤을 조금 더 부드럽게 조정합니다.">
          <TVToggle value={eyeCare} onChange={setEyeCare} />
        </SettingRow>
        <SettingRow label="현재 자녀 화면" sub={`${activeProfileName} 기준으로 추천과 보호 설정이 이어집니다.`}>
          <span className="msl-status-chip">사용 중</span>
        </SettingRow>
      </div>
    </div>
  )
}

function FamilyPanel({
  profiles,
  childSummaries,
  activeProfileId,
  onOpenDetail,
  parentPin,
  onUpdateParentPin,
}: {
  profiles: ChildProfile[]
  childSummaries: ParentChildResponse[]
  activeProfileId: string
  onOpenDetail: (id: string) => void
  parentPin: string
  onUpdateParentPin: (nextPin: string) => void
}) {
  const [currentPin, setCurrentPin] = useState('')
  const [nextPin, setNextPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [pinMessage, setPinMessage] = useState<string | null>(null)

  const cards = useMemo(() => profiles.map((profile) => {
    const child = childSummaries.find((item) => `child-${item.childId}` === profile.id)
    const dailyLimit = child?.watchPolicy.dailyLimitMinutes ?? profile.timeLimit
    const today = child?.todayWatchMinutes ?? 0
    const remaining = Math.max(0, dailyLimit - today)
    const percent = dailyLimit > 0 ? Math.min(100, Math.round((today / dailyLimit) * 100)) : 0

    return {
      profile,
      child,
      dailyLimit,
      today,
      remaining,
      percent,
    }
  }), [childSummaries, profiles])

  return (
    <div className="msl-content">
      <h2 className="msl-panel-title">가족 보호</h2>
      <div className="msl-card">
        <SectionHeader title="자녀 프로필" />
        <div className="msl-family-cards">
          {cards.map(({ profile, child, dailyLimit, today, remaining, percent }) => (
            <button
              key={profile.id}
              type="button"
              className={`msl-family-card${activeProfileId === profile.id ? ' msl-family-card--active' : ''}`}
              onClick={() => onOpenDetail(profile.id)}
            >
              <div className="msl-fc-bar" style={{ background: profile.color }} />
              <div className="msl-fc-top">
                <div className="msl-fc-avatar" style={{ background: profile.color }}>{profile.name[0]}</div>
                <div className="msl-fc-info">
                  <span className="msl-fc-name">{profile.name}</span>
                  <span className="msl-fc-age-chip" style={{ background: profile.color }}>{profile.age}세</span>
                </div>
              </div>
              <div className="msl-fc-stats">
                <div className="msl-fc-stat">
                  <p className="msl-fc-stat-label">오늘 시청</p>
                  <p className="msl-fc-stat-val">{formatMinutes(today)}</p>
                </div>
                <div className="msl-fc-divider" />
                <div className="msl-fc-stat">
                  <p className="msl-fc-stat-label">남은 시간</p>
                  <p className="msl-fc-stat-val">{formatMinutes(remaining)}</p>
                </div>
              </div>
              <div className="msl-fc-progress">
                <div className="msl-fc-progress-fill" style={{ width: `${percent}%`, background: profile.color }} />
              </div>
              <p className="msl-fc-progress-label">{today}/{dailyLimit}분</p>
              <div className="msl-fc-badges">
                <span className="msl-fc-badge">{child?.viewingAllowedNow ? '지금 시청 가능' : '지금 보호 시간'}</span>
                <span className="msl-fc-badge msl-fc-badge--on">
                  {child?.watchPolicy.autoBlockEnabled ? '자동 차단 켜짐' : '자동 차단 꺼짐'}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
      <div className="msl-card">
        <SectionHeader title="부모 PIN 설정" />
        <p className="msl-empty-copy">앱과 TV 시청 진입 전 확인하는 부모 PIN입니다.</p>
        <div className="msl-pin-grid">
          <label className="msl-pin-field">
            <span>현재 PIN</span>
            <input value={currentPin} onChange={(event) => setCurrentPin(event.target.value.replace(/\D/g, '').slice(0, 4))} inputMode="numeric" maxLength={4} placeholder="4자리" />
          </label>
          <label className="msl-pin-field">
            <span>새 PIN</span>
            <input value={nextPin} onChange={(event) => setNextPin(event.target.value.replace(/\D/g, '').slice(0, 4))} inputMode="numeric" maxLength={4} placeholder="4자리" />
          </label>
          <label className="msl-pin-field">
            <span>새 PIN 확인</span>
            <input value={confirmPin} onChange={(event) => setConfirmPin(event.target.value.replace(/\D/g, '').slice(0, 4))} inputMode="numeric" maxLength={4} placeholder="4자리" />
          </label>
        </div>
        <div className="msl-pin-row">
          <span className="msl-status-chip">현재 PIN: {'*'.repeat(parentPin.length)}</span>
          <button
            type="button"
            className="msl-pin-save"
            onClick={() => {
              if (currentPin !== parentPin) {
                setPinMessage('현재 PIN이 맞지 않아요.')
                return
              }
              if (!/^\d{4}$/.test(nextPin)) {
                setPinMessage('새 PIN은 숫자 4자리로 입력해 주세요.')
                return
              }
              if (nextPin !== confirmPin) {
                setPinMessage('새 PIN 확인 값이 다릅니다.')
                return
              }

              onUpdateParentPin(nextPin)
              setCurrentPin('')
              setNextPin('')
              setConfirmPin('')
              setPinMessage('부모 PIN을 저장했어요.')
            }}
          >
            PIN 저장
          </button>
        </div>
        {pinMessage && <p className="msl-empty-copy">{pinMessage}</p>}
      </div>
    </div>
  )
}

function YoutubePanel({
  youtubeCategorySettings,
  onUpdateYoutubeCategory,
}: {
  youtubeCategorySettings: YoutubeCategorySettings
  onUpdateYoutubeCategory: (categoryId: YoutubeCategoryId, enabled: boolean) => void
}) {
  const enabledCount = YOUTUBE_CATEGORY_OPTIONS.filter((category) => youtubeCategorySettings[category.id]).length

  return (
    <div className="msl-content">
      <h2 className="msl-panel-title">유튜브 필터</h2>
      <div className="msl-card">
        <SectionHeader title="허용 카테고리" />
        <p className="msl-empty-copy">현재 {enabledCount}개 카테고리가 허용되어 있고, 키즈 화면과 리포트에 같은 기준으로 반영됩니다.</p>
        <div className="msl-youtube-grid">
          {YOUTUBE_CATEGORY_OPTIONS.map((category) => {
            const enabled = youtubeCategorySettings[category.id]
            return (
              <div key={category.id} className={`msl-youtube-card${enabled ? ' msl-youtube-card--active' : ''}`}>
                <div className="msl-youtube-card__head">
                  <div className="msl-youtube-card__swatch" style={{ background: category.accent }} />
                  <div>
                    <p className="msl-youtube-card__title">{category.label}</p>
                    <p className="msl-youtube-card__desc">{category.description}</p>
                  </div>
                </div>
                <TVToggle
                  value={enabled}
                  onChange={(value) => onUpdateYoutubeCategory(category.id, value)}
                  accent={category.accent}
                />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function HistoryPanel({
  familyName,
  viewingHistory,
  recentAlerts,
  analysisHistory,
}: {
  familyName: string
  viewingHistory: ParentViewingHistoryResponse[]
  recentAlerts: ParentAlertResponse[]
  analysisHistory: AnalysisResponse[]
}) {
  const thinqMobileUrl = import.meta.env.VITE_THINQ_UI_URL ?? 'http://localhost:4174/'

  return (
    <div className="msl-content">
      <h2 className="msl-panel-title">시청 기록</h2>
      <div className="msl-card">
        <SectionHeader title="TV 시청 리포트" />
        <button
          type="button"
          className="msl-pin-save"
          style={{ marginBottom: 16, alignSelf: 'flex-start' }}
          onClick={() => window.open(thinqMobileUrl, '_blank', 'noopener,noreferrer')}
        >
          모바일 TV 시청 리포트 열기
        </button>
        <ViewingHistoryPanel
          familyName={familyName}
          viewingHistory={viewingHistory}
          recentAlerts={recentAlerts}
          analysisHistory={analysisHistory}
          compact
        />
      </div>
    </div>
  )
}

function SystemPanel({
  systemHealth,
  runtimeSettings,
  serverError,
}: {
  systemHealth: SystemHealthResponse | null
  runtimeSettings: RuntimeSettingsResponse | null
  serverError: string | null
}) {
  const components = systemHealth
    ? [
        ['TV 서비스', systemHealth.backend.status, systemHealth.backend.message],
        ['기록 저장소', systemHealth.database.status, systemHealth.database.message],
        ['콘텐츠 보호', systemHealth.mainModel.status, systemHealth.mainModel.message],
        ['시청 케어', systemHealth.addictionModel.status, systemHealth.addictionModel.message],
      ]
    : []

  return (
    <div className="msl-content">
      <h2 className="msl-panel-title">기기 상태</h2>
      <div className="msl-card">
        <SectionHeader title="서비스 상태" />
        {components.map(([label, status, message]) => (
          <SettingRow key={label} label={label} sub={message}>
            <span className={`msl-status-chip${status === 'UP' ? ' msl-status-chip--ok' : ' msl-status-chip--off'}`}>
              {status === 'UP' ? '정상' : '확인 필요'}
            </span>
          </SettingRow>
        ))}
        {components.length === 0 && <p className="msl-empty-copy">기기 상태를 불러오고 있습니다.</p>}
      </div>

      <div className="msl-card">
        <SectionHeader title="보호 기능" />
        <SettingRow label="개인정보 동의" sub="시청 케어를 사용하기 위한 동의 상태입니다.">
          <span className="msl-status-chip">{runtimeSettings?.privacyConsent ? '켜짐' : '꺼짐'}</span>
        </SettingRow>
        <SettingRow label="시청 케어" sub="자세와 시청 상태 변화를 함께 살펴봅니다.">
          <span className="msl-status-chip">{runtimeSettings?.addictionMonitorEnabled ? '켜짐' : '꺼짐'}</span>
        </SettingRow>
      </div>

      {serverError && (
        <div className="msl-card msl-card--warning">
          <SectionHeader title="안내" />
          <p className="msl-empty-copy">{serverError}</p>
        </div>
      )}
    </div>
  )
}

function CarePanel({
  runtimeSettings,
  systemHealth,
  onUpdateRuntimeSettings,
}: {
  runtimeSettings: RuntimeSettingsResponse | null
  systemHealth: SystemHealthResponse | null
  onUpdateRuntimeSettings: (patch: Partial<RuntimeSettingsResponse>) => Promise<void> | void
}) {
  const privacyConsent = runtimeSettings?.privacyConsent ?? false
  const addictionMonitorEnabled = runtimeSettings?.addictionMonitorEnabled ?? false
  const careStatus = systemHealth?.addictionModel.status ?? 'UNKNOWN'

  return (
    <div className="msl-content">
      <h2 className="msl-panel-title">시청 케어</h2>

      <div className="msl-card scp-preview-card">
        <SectionHeader title="실행 조건" />
        <SettingRow label="개인정보 동의" sub="동의가 켜져야 카메라 기반 시청 케어를 사용할 수 있습니다.">
          <TVToggle
            value={privacyConsent}
            onChange={(value) => {
              if (!value) {
                onUpdateRuntimeSettings({ privacyConsent: false, addictionMonitorEnabled: false })
                return
              }
              onUpdateRuntimeSettings({ privacyConsent: true })
            }}
            accent="#4CAF50"
          />
        </SettingRow>
        <SettingRow label="시청 케어 사용" sub="자세와 시청 흐름을 함께 살펴봅니다.">
          <TVToggle
            value={addictionMonitorEnabled}
            onChange={(value) => {
              if (value) {
                onUpdateRuntimeSettings({ privacyConsent: true, addictionMonitorEnabled: true })
                return
              }
              onUpdateRuntimeSettings({ addictionMonitorEnabled: false })
            }}
            accent="#FF8C42"
          />
        </SettingRow>
      </div>

      <div className="msl-card">
        <SectionHeader title="기능 상태" />
        <SettingRow label="시청 케어 연결" sub="카메라와 기록 저장소가 연결되면 자세 리포트까지 함께 확인할 수 있습니다.">
          <span className={`msl-status-chip${careStatus === 'UP' ? ' msl-status-chip--ok' : ' msl-status-chip--off'}`}>
            {careStatus === 'UP' ? '정상' : '확인 필요'}
          </span>
        </SettingRow>
        <SettingRow label="사용 준비" sub="동의와 시청 케어가 모두 켜져 있어야 실제로 동작합니다.">
          <span className="msl-status-chip">{privacyConsent && addictionMonitorEnabled ? '준비됨' : '대기 중'}</span>
        </SettingRow>
      </div>
    </div>
  )
}
