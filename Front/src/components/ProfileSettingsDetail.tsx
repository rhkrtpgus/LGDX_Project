// ProfileSettingsDetail – LG webOS 자녀 프로필 상세 설정 (전면 개편)
// ┌─────────────────────────────────────────────────────────────────────┐
// │  Header bar: ← 뒤로  |  [이름] 설정                                │
// ├──────────────┬──────────────────────────────────────────────────────┤
// │  Left 30%    │  Right 70% – 설정 카드                               │
// │  대형 아바타 │  시청시간 (0-240, 10분) / 등급 배지+툴팁 / 기타      │
// └──────────────┴──────────────────────────────────────────────────────┘
import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import type { ChildProfile } from '../data/profiles'
import { getThemeByAge } from '../data/profiles'
import type { ChildWatchPolicyResponse, MonitorGuidanceSettings, ParentChildResponse } from '../lib/api'

// ─── 등급 데이터 ──────────────────────────────────────────────────────────────
const RATINGS = [
  {
    key: 'all',
    badge: '전체관람가',
    color: '#4CAF50',
    emoji: '🟢',
    tooltip: '모든 연령이 시청할 수 있는 콘텐츠만 허용됩니다. 폭력·선정성이 전혀 없는 콘텐츠입니다.',
    blockedLabel: '제한 없음',
  },
  {
    key: '7',
    badge: '7세 이상',
    color: '#8BC34A',
    emoji: '🟡',
    tooltip: '만 7세 미만 어린이가 시청하기에 부적절할 수 있는 콘텐츠가 포함될 수 있습니다. 약한 판타지 폭력·놀라움 요소가 포함됩니다.',
    blockedLabel: '12세·15세·19세 차단',
  },
  {
    key: '12',
    badge: '12세 이상',
    color: '#FFC107',
    emoji: '🟠',
    tooltip: '만 12세 미만 어린이에게 부적절할 수 있습니다. 중간 수준의 폭력·공포·언어 자극이 포함될 수 있습니다.',
    blockedLabel: '15세·19세 차단',
  },
  {
    key: '15',
    badge: '15세 이상',
    color: '#FF5722',
    emoji: '🔴',
    tooltip: '만 15세 미만 청소년에게 부적절합니다. 성인 주제·묘사·언어가 포함됩니다. 부모와 함께 시청을 권장합니다.',
    blockedLabel: '19세 차단',
  },
]

const DAYS = ['월', '화', '수', '목', '금', '토', '일']

function buildDayLimits(policy: ParentChildResponse['watchPolicy'] | null, fallback: number) {
  if (!policy) {
    return Object.fromEntries(
      DAYS.map((day) => [day, day === '토' || day === '일' ? Math.min(fallback + 20, 240) : fallback]),
    ) as Record<string, number>
  }

  return {
    월: policy.mondayLimitMinutes,
    화: policy.tuesdayLimitMinutes,
    수: policy.wednesdayLimitMinutes,
    목: policy.thursdayLimitMinutes,
    금: policy.fridayLimitMinutes,
    토: policy.saturdayLimitMinutes,
    일: policy.sundayLimitMinutes,
  }
}

function areDayLimitsEqual(left: Record<string, number>, right: Record<string, number>) {
  return DAYS.every((day) => left[day] === right[day])
}

// ─── 스마트캠 기능 데이터 ─────────────────────────────────────────────────────
const CAM_FEATURES = [
  {
    key: 'posture' as const,
    label: '인공지능 자세 교정',
    sub_on:  '구부정한 자세 감지 시 화면 알림을 보냅니다',
    sub_off: '자세가 나빠지면 알림으로 바른 자세를 유도합니다',
    emoji: '🦴',
    accent: '#7C4DFF',
  },
  {
    key: 'blink' as const,
    label: '눈 깜박임 감지',
    sub_on:  '눈 깜박임이 줄면 안구 피로 알림을 보냅니다',
    sub_off: '장시간 집중 시청의 안구 건조를 예방합니다',
    emoji: '👁',
    accent: '#5B9BD5',
  },
  {
    key: 'distance' as const,
    label: '시청 거리 감지',
    sub_on:  '권장 거리(1.5m~3m)보다 가까우면 알림을 보냅니다',
    sub_off: 'TV와 너무 가까운 시청 거리를 감지합니다',
    emoji: '📐',
    accent: '#FF8C42',
  },
] as const

type CamKey = typeof CAM_FEATURES[number]['key']

// ─── Props ────────────────────────────────────────────────────────────────────
type Props = {
  profile: ChildProfile
  childSummary?: ParentChildResponse | null
  onSave:   (updated: Partial<ChildProfile>) => void
  onCancel: () => void
  onUpdateTimeLimit: (id: string, mins: number) => void
  onUpdateWatchPolicy?: (childId: number, patch: Partial<ChildWatchPolicyResponse>) => Promise<void> | void
  monitorGuidanceSettings?: MonitorGuidanceSettings
  onUpdateMonitorGuidanceSettings?: (childId: number, patch: Partial<MonitorGuidanceSettings>) => void
}

// ─── 컴포넌트 ─────────────────────────────────────────────────────────────────
export function ProfileSettingsDetail({
  profile,
  childSummary,
  onSave,
  onCancel,
  onUpdateTimeLimit,
  onUpdateWatchPolicy,
  monitorGuidanceSettings,
  onUpdateMonitorGuidanceSettings,
}: Props) {
  const theme = getThemeByAge(profile.age)
  const policy = childSummary?.watchPolicy ?? null

  // 로컬 설정 상태
  const [timeLimit,   setTimeLimit]  = useState(policy?.dailyLimitMinutes ?? profile.timeLimit)
  const [dayLimits,   setDayLimits]  = useState<Record<string, number>>(
    buildDayLimits(policy, profile.timeLimit)
  )
  const [ratingIdx,   setRatingIdx]  = useState(0)
  const [tooltipIdx,  setTooltipIdx] = useState<number | null>(null)
  const [dayOpen,     setDayOpen]    = useState(false)
  const [bedtimeOn,   setBedtime]    = useState(policy?.bedtimeLockEnabled ?? false)
  const [bedtimeHour, setBedHour]    = useState(policy?.bedtimeHour ?? 21)
  const [protectOn,   setProtect]    = useState(policy?.autoBlockEnabled ?? true)
  const [isDirty,     setIsDirty]    = useState(false)
  const [camFeatures, setCamFeatures] = useState<Record<CamKey, boolean>>({
    posture: monitorGuidanceSettings?.posture ?? true,
    blink: monitorGuidanceSettings?.blink ?? true,
    distance: monitorGuidanceSettings?.distance ?? true,
  })
  const tooltipRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const camChanged =
      camFeatures.posture !== (monitorGuidanceSettings?.posture ?? true) ||
      camFeatures.blink !== (monitorGuidanceSettings?.blink ?? true) ||
      camFeatures.distance !== (monitorGuidanceSettings?.distance ?? true)
    setIsDirty(
      timeLimit !== (policy?.dailyLimitMinutes ?? profile.timeLimit) ||
      !areDayLimitsEqual(dayLimits, buildDayLimits(policy, profile.timeLimit)) ||
      ratingIdx !== 0 ||
      bedtimeOn !== (policy?.bedtimeLockEnabled ?? false) ||
      bedtimeHour !== (policy?.bedtimeHour ?? 21) ||
      protectOn !== (policy?.autoBlockEnabled ?? true) ||
      camChanged
    )
  }, [bedtimeHour, bedtimeOn, camFeatures, dayLimits, monitorGuidanceSettings?.blink, monitorGuidanceSettings?.distance, monitorGuidanceSettings?.posture, policy, profile.timeLimit, protectOn, ratingIdx, timeLimit])

  useEffect(() => {
    setTimeLimit(policy?.dailyLimitMinutes ?? profile.timeLimit)
    setDayLimits(buildDayLimits(policy, profile.timeLimit))
    setBedtime(policy?.bedtimeLockEnabled ?? false)
    setBedHour(policy?.bedtimeHour ?? 21)
    setProtect(policy?.autoBlockEnabled ?? true)
    setCamFeatures({
      posture: monitorGuidanceSettings?.posture ?? true,
      blink: monitorGuidanceSettings?.blink ?? true,
      distance: monitorGuidanceSettings?.distance ?? true,
    })
    setIsDirty(false)
  }, [monitorGuidanceSettings?.blink, monitorGuidanceSettings?.distance, monitorGuidanceSettings?.posture, policy, profile.timeLimit])

  // 외부 클릭 시 툴팁 닫기
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target as Node)) {
        setTooltipIdx(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleSave = useCallback(async () => {
    const childId = childSummary?.childId
    if (childId != null && onUpdateWatchPolicy) {
      await onUpdateWatchPolicy(childId, {
        dailyLimitMinutes: timeLimit,
        autoBlockEnabled: protectOn,
        bedtimeLockEnabled: bedtimeOn,
        bedtimeHour,
        mondayLimitMinutes: dayLimits['월'],
        tuesdayLimitMinutes: dayLimits['화'],
        wednesdayLimitMinutes: dayLimits['수'],
        thursdayLimitMinutes: dayLimits['목'],
        fridayLimitMinutes: dayLimits['금'],
        saturdayLimitMinutes: dayLimits['토'],
        sundayLimitMinutes: dayLimits['일'],
      })
    } else {
      onUpdateTimeLimit(profile.id, timeLimit)
    }
    if (childId != null && onUpdateMonitorGuidanceSettings) {
      onUpdateMonitorGuidanceSettings(childId, camFeatures)
    }
    onSave({ timeLimit })
    setIsDirty(false)
  }, [bedtimeHour, bedtimeOn, camFeatures, childSummary?.childId, dayLimits, onSave, onUpdateMonitorGuidanceSettings, onUpdateTimeLimit, onUpdateWatchPolicy, profile.id, protectOn, timeLimit])

  const ratingInfo = RATINGS[ratingIdx]

  return (
    <div className="psd-root">

      {/* ── 헤더 바 ─────────────────────────────────────────────────────── */}
      <div className="psd-header-bar">
        <button type="button" className="psd-header-back" onClick={onCancel}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
            strokeLinecap="round" strokeLinejoin="round" width={18} height={18}>
            <polyline points="15 18 9 12 15 6" />
          </svg>
          뒤로가기
        </button>

        <h1 className="psd-header-title">
          <span style={{ color: theme.accent }}>{profile.name}</span> 설정
        </h1>

        {isDirty && (
          <motion.span
            className="psd-header-dirty"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            ✏️ 미저장
          </motion.span>
        )}
      </div>

      {/* ── 2단 영역 ────────────────────────────────────────────────────── */}
      <div className="psd-body">

        {/* 왼쪽: 아바타 + 이름/나이 + 버튼 */}
        <div className="psd-left"
          style={{ background: `linear-gradient(160deg, ${profile.color}44 0%, #0d0d1a 100%)` }}>

          {/* 대형 아바타 */}
          <div className="psd-avatar-wrap">
            <div className="psd-avatar-large" style={{ background: profile.color }}>
              {profile.name[0]}
            </div>
            <AnimatePresence>
              {isDirty && (
                <motion.div className="psd-dirty-badge"
                  initial={{ opacity: 0, scale: 0.7, y: 4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.7 }}
                  transition={{ type: 'spring', stiffness: 360, damping: 24 }}>
                  ✏️ 변경됨
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* 이름 + 테마 */}
          <div className="psd-left-info">
            <h2 className="psd-profile-name">{profile.name}</h2>
            <span className="psd-profile-theme" style={{ background: theme.accent }}>
              {profile.age}세 · {theme.label}
            </span>
          </div>

          {/* 아바타 변경 / 이름 변경 버튼 */}
          <div className="psd-left-actions">
            <button type="button" className="psd-action-btn" tabIndex={0}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
                strokeLinecap="round" strokeLinejoin="round" width={15} height={15}>
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx={12} cy={13} r={4}/>
              </svg>
              아바타 변경
            </button>
            <button type="button" className="psd-action-btn" tabIndex={0}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
                strokeLinecap="round" strokeLinejoin="round" width={15} height={15}>
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              이름 변경
            </button>
          </div>

          {/* 보호 토글 */}
          <button
            type="button"
            className={`psd-protect-toggle${protectOn ? ' psd-protect-toggle--on' : ''}`}
            style={protectOn ? { background: theme.accent, borderColor: theme.accent } : {}}
            onClick={() => { setProtect(v => !v); setIsDirty(true) }}
          >
            {protectOn ? '🛡 보호 켜짐' : '⚠ 보호 꺼짐'}
          </button>

          {/* 요약 통계 */}
          <div className="psd-left-stats">
            <div className="psd-left-stat">
              <span className="psd-left-stat-label">일일 제한</span>
              <span className="psd-left-stat-val" style={{ color: theme.accent }}>{timeLimit}분</span>
            </div>
            <div className="psd-left-stat">
              <span className="psd-left-stat-label">허용 등급</span>
              <span className="psd-left-stat-val" style={{ color: ratingInfo.color }}>{ratingInfo.badge}</span>
            </div>
            <div className="psd-left-stat">
              <span className="psd-left-stat-label">취침 잠금</span>
              <span className="psd-left-stat-val">{bedtimeOn ? `${bedtimeHour}시` : '꺼짐'}</span>
            </div>
          </div>
        </div>

        {/* 오른쪽: 설정 카드들 */}
        <div className="psd-right">

          {/* ── 1. 시청 시간 관리 ── */}
          <div className="psd-card" tabIndex={0}>
            <div className="psd-card-header">
              <span className="psd-card-icon">⏱</span>
              <div>
                <p className="psd-card-title">시청 시간 관리</p>
                <p className="psd-card-sub">하루 최대 시청 시간 · 0~240분 · 10분 단위</p>
              </div>
            </div>

            {/* 큰 숫자 */}
            <div className="psd-time-display">
              <motion.span className="psd-time-number" style={{ color: theme.accent }}
                key={timeLimit} initial={{ scale: 1.15 }} animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}>
                {timeLimit}
              </motion.span>
              <span className="psd-time-unit">분 / 일</span>
              {timeLimit === 0 && (
                <span className="psd-time-badge psd-time-badge--off">제한 없음</span>
              )}
            </div>

            {/* 슬라이더 0-240, 10분 단위 */}
            <input
              type="range"
              className="psd-slider"
              min={0} max={240} step={10}
              value={timeLimit}
              style={{ '--psd-accent': theme.accent } as React.CSSProperties}
              onKeyDown={e => {
                if (e.key === 'ArrowLeft')  { e.preventDefault(); setTimeLimit(v => Math.max(0, v - 10));   setIsDirty(true) }
                if (e.key === 'ArrowRight') { e.preventDefault(); setTimeLimit(v => Math.min(240, v + 10)); setIsDirty(true) }
              }}
              onChange={e => { setTimeLimit(Number(e.target.value)); setIsDirty(true) }}
              tabIndex={0}
            />

            {/* 눈금 */}
            <div className="psd-slider-ticks">
              {[0, 30, 60, 90, 120, 150, 180, 210, 240].map(v => (
                <span key={v}
                  className={`psd-tick${timeLimit === v ? ' psd-tick--active' : ''}`}
                  style={timeLimit === v ? { color: theme.accent } : {}}>
                  {v === 0 ? '∞' : v >= 60 && v % 60 === 0 ? `${v / 60}h` : `${v}m`}
                </span>
              ))}
            </div>

            {/* 취침 시간 행 */}
            <div className="psd-row psd-bedtime-row">
              <span className="psd-row-icon">🌙</span>
              <div className="psd-row-text">
                <p className="psd-row-label">취침 시간 잠금</p>
                <p className="psd-row-sub">설정 시간 이후 TV가 자동으로 잠깁니다</p>
              </div>
              <div className="psd-row-controls">
                {bedtimeOn && (
                  <div className="psd-bedtime-time-ctrl">
                    <button type="button" onClick={() => setBedHour(h => Math.max(18, h - 1))}>−</button>
                    <span>{bedtimeHour}:00</span>
                    <button type="button" onClick={() => setBedHour(h => Math.min(23, h + 1))}>+</button>
                  </div>
                )}
                <button type="button"
                  className={`psd-pill-toggle${bedtimeOn ? ' psd-pill-toggle--on' : ''}`}
                  style={bedtimeOn ? { background: theme.accent } : {}}
                  onClick={() => { setBedtime(v => !v); setIsDirty(true) }}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setBedtime(v => !v); setIsDirty(true) } }}
                  tabIndex={0}>
                  {bedtimeOn ? '켜짐' : '꺼짐'}
                </button>
              </div>
            </div>

            {/* 요일별 아코디언 */}
            <button type="button"
              className={`psd-accordion-header${dayOpen ? ' psd-accordion-header--open' : ''}`}
              onClick={() => setDayOpen(v => !v)}
              onKeyDown={e => { if (e.key === 'Enter') setDayOpen(v => !v) }}
              tabIndex={0}>
              <span className="psd-accordion-icon">📅</span>
              <span>요일별 시간 제한</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                strokeLinecap="round" strokeLinejoin="round" width={16} height={16}
                style={{ marginLeft: 'auto', transform: dayOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.22s' }}>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            <AnimatePresence>
              {dayOpen && (
                <motion.div className="psd-accordion-body"
                  initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.26 }}>
                  {DAYS.map(day => (
                    <div key={day} className="psd-day-row">
                      <span className="psd-day-label">{day}</span>
                      <input type="range" className="psd-slider psd-slider--sm"
                        min={0} max={240} step={10} value={dayLimits[day]}
                        style={{ '--psd-accent': theme.accent } as React.CSSProperties}
                        onKeyDown={e => {
                          if (e.key === 'ArrowLeft')  { e.preventDefault(); setDayLimits(p => ({ ...p, [day]: Math.max(0, p[day] - 10) })); setIsDirty(true) }
                          if (e.key === 'ArrowRight') { e.preventDefault(); setDayLimits(p => ({ ...p, [day]: Math.min(240, p[day] + 10) })); setIsDirty(true) }
                        }}
                        onChange={e => { setDayLimits(prev => ({ ...prev, [day]: Number(e.target.value) })); setIsDirty(true) }}
                        tabIndex={0}
                      />
                      <span className="psd-day-val" style={{ color: theme.accent }}>
                        {dayLimits[day] === 0 ? '∞' : `${dayLimits[day]}분`}
                      </span>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── 2. 콘텐츠 등급 – 배지 클릭 → 툴팁 ── */}
          <div className="psd-card" tabIndex={0} ref={tooltipRef}>
            <div className="psd-card-header">
              <span className="psd-card-icon">🎬</span>
              <div>
                <p className="psd-card-title">콘텐츠 등급 제어</p>
                <p className="psd-card-sub">배지를 클릭하면 등급 설명을 확인할 수 있습니다</p>
              </div>
            </div>

            {/* 등급 배지 행 */}
            <div className="psd-rating-badges">
              {RATINGS.map((r, i) => (
                <div key={r.key} className="psd-badge-wrap">
                  <button
                    type="button"
                    className={`psd-rating-badge${ratingIdx === i ? ' psd-rating-badge--selected' : ''}`}
                    style={ratingIdx === i ? { background: r.color, borderColor: r.color } : { borderColor: r.color + '66' }}
                    onClick={() => {
                      setRatingIdx(i)
                      setTooltipIdx(tooltipIdx === i ? null : i)
                      setIsDirty(true)
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setRatingIdx(i)
                        setTooltipIdx(tooltipIdx === i ? null : i)
                        setIsDirty(true)
                      }
                    }}
                    tabIndex={0}
                    aria-pressed={ratingIdx === i}
                  >
                    <span className="psd-badge-emoji">{r.emoji}</span>
                    <span className="psd-badge-label">{r.badge}</span>
                    {ratingIdx === i && (
                      <motion.span className="psd-badge-check"
                        initial={{ scale: 0 }} animate={{ scale: 1 }}>✓</motion.span>
                    )}
                  </button>

                  {/* 툴팁 */}
                  <AnimatePresence>
                    {tooltipIdx === i && (
                      <motion.div
                        className="psd-rating-tooltip"
                        style={{ borderColor: r.color + '66' }}
                        initial={{ opacity: 0, y: -6, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.95 }}
                        transition={{ type: 'spring', stiffness: 380, damping: 26 }}
                      >
                        <div className="psd-tooltip-header" style={{ color: r.color }}>
                          {r.emoji} {r.badge}
                        </div>
                        <p className="psd-tooltip-body">{r.tooltip}</p>
                        <div className="psd-tooltip-blocked">
                          <span>🚫</span>
                          <span>{r.blockedLabel}</span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>

            {/* 현재 선택 등급 설명 바 */}
            <div className="psd-rating-desc" style={{ borderLeftColor: ratingInfo.color }}>
              <strong style={{ color: ratingInfo.color }}>{ratingInfo.badge}</strong> — {ratingInfo.tooltip}
            </div>
          </div>

          {/* ── 3. 스마트캠 케어 ── */}
          <div className="psd-card" tabIndex={0}>
            <div className="psd-card-header">
              <span className="psd-card-icon">📷</span>
              <div>
                <p className="psd-card-title">스마트캠 케어</p>
                <p className="psd-card-sub">인공지능 자세·눈·거리 감지 — 카메라가 연결된 경우 작동</p>
              </div>
            </div>

            <div className="psd-cam-features">
              {CAM_FEATURES.map(f => {
                const on = camFeatures[f.key]
                return (
                  <div key={f.key} className={`psd-cam-row${on ? ' psd-cam-row--on' : ''}`}
                    style={on ? { borderColor: f.accent + '55' } : {}}>
                    <span className="psd-cam-emoji">{f.emoji}</span>
                    <div className="psd-cam-text">
                      <p className="psd-cam-label" style={on ? { color: f.accent } : {}}>
                        {f.label}
                      </p>
                      <p className="psd-cam-sub">{on ? f.sub_on : f.sub_off}</p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={on}
                      className={`psd-cam-toggle${on ? ' psd-cam-toggle--on' : ''}`}
                      style={on ? { background: f.accent } : {}}
                      onClick={() => {
                        setCamFeatures(prev => ({ ...prev, [f.key]: !prev[f.key] }))
                        setIsDirty(true)
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          setCamFeatures(prev => ({ ...prev, [f.key]: !prev[f.key] }))
                          setIsDirty(true)
                        }
                      }}
                      tabIndex={0}
                    >
                      <span className="psd-cam-knob" />
                    </button>
                  </div>
                )
              })}
            </div>

            {/* 활성 기능 요약 */}
            {Object.values(camFeatures).some(v => v) && (
              <motion.div className="psd-cam-summary"
                initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}>
                {CAM_FEATURES.filter(f => camFeatures[f.key]).map(f => (
                  <span key={f.key} className="psd-cam-chip"
                    style={{ color: f.accent, borderColor: f.accent + '55', background: f.accent + '15' }}>
                    {f.emoji} {f.label}
                  </span>
                ))}
              </motion.div>
            )}
          </div>

          {/* 플로팅 바 공간 확보 */}
          <div style={{ height: 80 }} />
        </div>
      </div>

      {/* ── 하단 플로팅 저장/취소 바 ── */}
      <AnimatePresence>
        {isDirty && (
          <motion.div className="psd-float-bar"
            initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}>
            <span className="psd-float-hint">저장되지 않은 변경사항이 있습니다</span>
            <div className="psd-float-btns">
              <button type="button" className="psd-btn psd-btn--cancel"
                onClick={() => { onCancel(); setIsDirty(false) }}>
                취소
              </button>
              <button type="button" className="psd-btn psd-btn--save"
                style={{ background: theme.accent }} onClick={handleSave}>
                변경사항 저장
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!isDirty && (
        <div className="psd-float-bar psd-float-bar--idle">
          <button type="button" className="psd-btn psd-btn--cancel" onClick={onCancel}>
            ← 목록으로
          </button>
        </div>
      )}
    </div>
  )
}
