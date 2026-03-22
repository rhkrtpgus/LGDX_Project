import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  Bell,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Home,
  LoaderCircle,
  Mic,
  Settings,
  Shield,
  Star,
  Trash2,
  TrendingUp,
  Tv,
  Users,
  Wifi,
} from 'lucide-react'

import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  deleteVoiceRecording,
  fetchMobileDashboard,
  getVoiceRecordings,
  getVoiceSettings,
  saveVoiceRecording,
  saveVoiceSettings,
  toggleVoiceRecordingEnabled,
  updateWatchPolicy,
  updateYoutubeCategoryFilter,
} from './apiClient'

const S = {
  bg: '#f4f6fa',
  white: '#ffffff',
  primary: '#5b6cf6',
  red: '#ff6b6b',
  green: '#00b894',
  yellow: '#ffb946',
  purple: '#7b68ee',
  text: '#1a1a1a',
  sub: '#7b8794',
  muted: '#b5bec9',
  border: '#edf0f5',
}

const tabs = [
  { id: 0, label: '홈', Icon: Home },
  { id: 1, label: '시청시간', Icon: Clock },
  { id: 2, label: '콘텐츠', Icon: TrendingUp },
  { id: 3, label: '자세관리', Icon: Activity },
]

const screenTitles = {
  0: '시청 리포트', 1: '일별 시청 시간', 2: '콘텐츠 유형 분석', 3: '자세 관리', 4: '설정', 5: '자녀 프로필 설정',
  6: '시청 거리 음성 알림', 7: '눈 깜박임 음성 알림', 8: '자세 점수 음성 알림',
}

const VOICE_GROUP_INFO = {
  distance: {
    label: '시청 거리', icon: '📏', screen: 6,
    subTypes: [
      { type: 'distance_near', label: '너무 가까움' },
      { type: 'distance_far', label: '너무 멂' },
    ],
  },
  blink: {
    label: '눈 깜박임', icon: '👁️', screen: 7,
    subTypes: [
      { type: 'blink_high', label: '너무 많이 깜박임' },
      { type: 'blink_low', label: '너무 적게 깜박임' },
    ],
  },
  stretch: {
    label: '자세 점수', icon: '🧘', screen: 8,
    subTypes: [
      { type: 'stretch', label: '한 자세로 너무 오래 앉아있음' },
    ],
  },
}

const screenBodyStyle = {
  flex: 1,
  minHeight: 0,
  overflowY: 'auto',
  padding: '16px 18px',
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
}

const iconButtonStyle = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  color: S.text,
  padding: 4,
}

const selectStyle = {
  width: '100%',
  border: `1px solid ${S.border}`,
  borderRadius: 10,
  padding: '10px 12px',
  fontSize: 12,
  color: S.text,
  background: '#f8fafc',
}

const primaryButtonStyle = {
  width: '100%',
  marginTop: 16,
  padding: '12px 14px',
  borderRadius: 12,
  border: 'none',
  background: S.primary,
  color: '#fff',
  fontSize: 13,
  fontWeight: 800,
  cursor: 'pointer',
}

const sectionTitleStyle = {
  margin: '2px 2px 6px',
  fontSize: 11,
  fontWeight: 700,
  color: S.sub,
  textTransform: 'uppercase',
  letterSpacing: '0.6px',
}

function formatMinutes(mins) {
  const value = Math.round(Number(mins || 0))
  if (value < 60) return `${value}분`
  const hours = Math.floor(value / 60)
  const remain = value % 60
  return remain ? `${hours}시간 ${remain}분` : `${hours}시간`
}

function formatDateTime(value) {
  if (!value) return '기록 없음'
  return new Date(value).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function categoryColor(name) {
  const map = { 애니메이션: '#ff6b6b', 교육: '#5b6cf6', 게임: '#ffb946', 음악: '#7b68ee', 스포츠: '#00b894', 일반: '#94a3b8' }
  return map[name] || '#94a3b8'
}

function metricColor(value, good, warn) {
  if (value == null) return S.muted
  if (value >= good) return S.green
  if (value >= warn) return S.yellow
  return S.red
}

function miniIconWrap(bg, size = 28) {
  return { width: size, height: size, borderRadius: 8, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }
}

function StatusBar() {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px 6px', fontSize: 12, fontWeight: 700, color: S.text }}>
      <span>9:41</span>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <Wifi size={14} />
        <Bell size={14} />
      </div>
    </div>
  )
}

function NavBar({ title, onBack, onRight }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px 12px', background: S.white }}>
      {onBack ? <button onClick={onBack} style={iconButtonStyle}><ChevronLeft size={22} /></button> : <div style={{ width: 30 }} />}
      <span style={{ fontSize: 17, fontWeight: 800, color: S.text }}>{title}</span>
      {onRight ? <button onClick={onRight.action} style={iconButtonStyle}>{onRight.icon}</button> : <div style={{ width: 30 }} />}
    </div>
  )
}

function Card({ children, style }) {
  return <div style={{ background: S.white, borderRadius: 16, padding: 18, boxShadow: '0 2px 12px rgba(0,0,0,0.07)', ...style }}>{children}</div>
}

function Toggle({ on, onToggle }) {
  return (
    <button onClick={onToggle} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
      <div style={{ width: 46, height: 26, borderRadius: 13, background: on ? S.primary : '#ddd', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 3, left: on ? 23 : 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }} />
      </div>
    </button>
  )
}

function SourceBadge({ kind = 'db' }) {
  const style = kind === 'db' ? { background: '#eef4ff', color: S.primary, label: '데이터 연동' } : { background: '#fff7e6', color: '#b8620a', label: '추가 설계 필요' }
  return <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 20, background: style.background, color: style.color }}>{style.label}</span>
}

function PeerGauge({ pct, leftLabel, rightLabel, markerLabel, goodIsLow = false }) {
  const markerColor = goodIsLow ? (pct > 60 ? S.red : pct > 35 ? S.yellow : S.green) : pct < 30 ? S.red : pct < 55 ? S.yellow : S.green
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ position: 'relative', height: 22 }}>
        <div style={{ position: 'absolute', top: 7, left: 0, right: 0, height: 8, borderRadius: 4, background: goodIsLow ? 'linear-gradient(to right, #00B894, #FFB946, #FF6B6B)' : 'linear-gradient(to right, #FF6B6B, #FFB946, #00B894)' }} />
        <div style={{ position: 'absolute', top: '50%', left: `${pct}%`, transform: 'translate(-50%,-50%)', width: 16, height: 16, borderRadius: '50%', background: '#fff', border: `2.5px solid ${markerColor}`, boxShadow: '0 2px 6px rgba(0,0,0,0.18)' }} />
        <div style={{ position: 'absolute', top: 4, left: '50%', transform: 'translateX(-50%)', width: 1.5, height: 14, background: 'rgba(0,0,0,0.18)' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
        <span style={{ fontSize: 9, color: S.muted }}>{leftLabel}</span>
        <span style={{ fontSize: 9, color: '#999' }}>평균 기준</span>
        <span style={{ fontSize: 9, color: S.muted }}>{rightLabel}</span>
      </div>
      <p style={{ margin: '6px 0 0', fontSize: 12, fontWeight: 700, color: markerColor, textAlign: 'center' }}>{markerLabel}</p>
    </div>
  )
}

function ScoreRing({ score, size = 80, label = '점' }) {
  if (score == null) {
    return <div style={{ width: size, height: size, borderRadius: '50%', border: '8px solid #f0f0f0', display: 'grid', placeItems: 'center', color: S.muted, fontSize: 12, fontWeight: 700 }}>대기</div>
  }
  const r = (size - 14) / 2
  const circ = 2 * Math.PI * r
  const color = score >= 75 ? S.green : score >= 50 ? S.yellow : S.red
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f0f0f0" strokeWidth={8} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={8} strokeDasharray={`${circ * (score / 100)} ${circ}`} strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x="50%" y="45%" textAnchor="middle" dominantBaseline="central" fontSize={size / 4.5} fontWeight="800" fill={color}>{Math.round(score)}</text>
      <text x="50%" y="68%" textAnchor="middle" dominantBaseline="central" fontSize={size / 8} fill="#aaa">{label}</text>
    </svg>
  )
}

function SocialBtn({ onClick, icon, label, badge, color = 'primary', applied, appliedLabel }) {
  const bg = color === 'red' ? 'linear-gradient(135deg,#FF6B6B,#FF4757)' : color === 'yellow' ? 'linear-gradient(135deg,#FFB946,#FF9A00)' : color === 'purple' ? 'linear-gradient(135deg,#7B68EE,#9B59B6)' : 'linear-gradient(135deg,#5B6CF6,#7B68EE)'
  if (applied) {
    return <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 14px', borderRadius: 10, background: '#f0fff8', border: '1px solid #b8edd6' }}><Check size={16} color={S.green} strokeWidth={3} /><span style={{ fontSize: 13, fontWeight: 700, color: S.green }}>{appliedLabel}</span></div>
  }
  return <button onClick={onClick} style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', background: bg, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>{icon}<span style={{ fontSize: 13, fontWeight: 700 }}>{label}</span>{badge ? <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 20, background: 'rgba(255,255,255,0.25)' }}>{badge}</span> : null}</button>
}

function SelectorStrip({ snapshot, selectedFamilyId, selectedChildId, onFamilyChange, onChildChange }) {
  return (
    <div style={{ padding: '8px 16px 12px', background: S.white, borderBottom: `1px solid ${S.border}` }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <select value={selectedFamilyId} onChange={(event) => onFamilyChange(Number(event.target.value))} style={selectStyle}>
          {snapshot.families.map((family) => <option key={family.familyId} value={family.familyId}>{family.familyName}</option>)}
        </select>
        <select value={selectedChildId || ''} onChange={(event) => onChildChange(Number(event.target.value))} style={selectStyle}>
          {snapshot.children.map((child) => <option key={child.childId} value={child.childId}>{child.childName}</option>)}
        </select>
      </div>
    </div>
  )
}

function LoadingScreen() {
  return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#E8EAF0' }}><div style={{ textAlign: 'center' }}><LoaderCircle size={34} color={S.primary} /><p style={{ marginTop: 14, color: S.sub, fontSize: 13 }}>모바일 프로토타입 데이터를 불러오는 중입니다.</p></div></div>
}

function ErrorScreen({ message, onRetry }) {
  return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#E8EAF0', padding: 20 }}><Card style={{ maxWidth: 340 }}><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><AlertTriangle size={20} color={S.red} /><p style={{ margin: 0, fontSize: 16, fontWeight: 900, color: S.text }}>데이터 연결 오류</p></div><p style={{ marginTop: 12, fontSize: 13, color: S.sub, lineHeight: 1.6 }}>{message}</p><button onClick={onRetry} style={primaryButtonStyle}>다시 시도</button></Card></div>
}

function HomeMiniCard({ title, badge, icon, onClick, children }) {
  return (
    <button onClick={onClick} style={{ background: S.white, border: 'none', borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.07)', padding: '16px 18px', textAlign: 'left', cursor: 'pointer', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{icon}<span style={{ fontSize: 13, fontWeight: 700, color: S.text }}>{title}</span></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{badge}<ChevronRight size={14} color={S.muted} /></div>
      </div>
      {children}
    </button>
  )
}

function ChildProfileCard({ child, selected, onClick }) {
  const accent = selected ? '#f9b3d1' : '#c8d4ff'
  const progressColor = child.autoBlockEnabled ? '#7bd389' : '#a6b0c3'

  return (
    <button
      onClick={onClick}
      style={{
        minWidth: 268,
        flex: '0 0 268px',
        borderRadius: 22,
        border: selected ? '2px solid #f3b1cf' : `1px solid ${S.border}`,
        background: S.white,
        boxShadow: selected ? '0 14px 28px rgba(91,108,246,0.14)' : '0 8px 20px rgba(15,23,42,0.08)',
        padding: 18,
        color: S.text,
        textAlign: 'left',
        cursor: 'pointer',
        scrollSnapAlign: 'start',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div style={{ width: 42, height: 42, borderRadius: '50%', background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 20, fontWeight: 800, flexShrink: 0 }}>
          {child.avatarLetter}
        </div>
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: S.text }}>{child.childName}</p>
          <div style={{ display: 'inline-flex', marginTop: 5, padding: '3px 8px', borderRadius: 999, background: `${accent}33`, color: selected ? '#d86ea0' : '#6f8ae8', fontSize: 10, fontWeight: 800 }}>
            {child.age}세
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        <div>
          <p style={{ margin: 0, fontSize: 11, color: S.sub }}>오늘 시청</p>
          <p style={{ margin: '5px 0 0', fontSize: 20, fontWeight: 800, color: S.text }}>{formatMinutes(child.todayMinutes)}</p>
        </div>
        <div>
          <p style={{ margin: 0, fontSize: 11, color: S.sub }}>남은 시간</p>
          <p style={{ margin: '5px 0 0', fontSize: 20, fontWeight: 800, color: S.text }}>{formatMinutes(child.remainingMinutes)}</p>
        </div>
      </div>

      <div style={{ height: 4, borderRadius: 999, background: '#edf1f7', overflow: 'hidden', marginBottom: 6 }}>
        <div style={{ width: `${child.progressPercent}%`, height: '100%', borderRadius: 999, background: accent }} />
      </div>
      <p style={{ margin: '0 0 12px', fontSize: 10, color: S.sub }}>{Math.round(child.todayMinutes)}/{Math.round(child.dailyLimitMinutes)}분</p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <span style={{ padding: '5px 10px', borderRadius: 999, background: '#f3f6fb', color: '#556070', fontSize: 11, fontWeight: 700 }}>
          {child.viewingAllowedNow ? '지금 시청 가능' : '현재 제한 중'}
        </span>
        <span style={{ padding: '5px 10px', borderRadius: 999, background: `${progressColor}22`, color: progressColor, fontSize: 11, fontWeight: 700 }}>
          {child.autoBlockEnabled ? '자동 차단 켜짐' : '자동 차단 꺼짐'}
        </span>
      </div>
    </button>
  )
}

function HomeProtectionPanel({ snapshot, onNavigate }) {
  const profile = snapshot.childProfiles.find((item) => item.childId === snapshot.selectedChildId) || snapshot.childProfiles[0]
  const settings = snapshot.settings

  if (!profile) {
    return null
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ borderRadius: 22, background: S.white, color: S.text, padding: 20, boxShadow: '0 10px 24px rgba(15,23,42,0.08)', border: `1px solid ${S.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
          <div style={{ width: 58, height: 58, borderRadius: '50%', background: '#f9b3d1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 800 }}>
            {profile.avatarLetter}
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 24, fontWeight: 800, color: S.text }}>{profile.childName}</p>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: S.sub }}>{profile.age}세 · {profile.schoolLabel}</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          <div style={{ padding: '12px 14px', borderRadius: 14, background: '#f7f9fc' }}>
            <p style={{ margin: 0, fontSize: 10, color: S.sub }}>일일 제한</p>
            <p style={{ margin: '6px 0 0', fontSize: 18, fontWeight: 800, color: S.text }}>{Math.round(profile.dailyLimitMinutes)}분</p>
          </div>
          <div style={{ padding: '12px 14px', borderRadius: 14, background: '#f7f9fc' }}>
            <p style={{ margin: 0, fontSize: 10, color: S.sub }}>취침 잠금</p>
            <p style={{ margin: '6px 0 0', fontSize: 18, fontWeight: 800, color: S.text }}>{profile.bedtimeLockEnabled ? `${profile.bedtimeHour}시` : '꺼짐'}</p>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: 14, background: 'rgba(255,255,255,0.05)' }}>
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>콘텐츠 등급</p>
              <p style={{ margin: '4px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.62)' }}>현재 자녀 기준 허용 등급</p>
            </div>
            <span style={{ padding: '6px 12px', borderRadius: 999, background: 'rgba(123,211,137,0.2)', color: '#8ee39d', fontSize: 12, fontWeight: 800 }}>
              {profile.contentRatingLabel}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: 14, background: 'rgba(255,255,255,0.05)' }}>
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>스마트캠 케어</p>
              <p style={{ margin: '4px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.62)' }}>자세, 눈 깜박임, 거리 감지 상태</p>
            </div>
            <span style={{ padding: '6px 12px', borderRadius: 999, background: settings.smartCam.linked ? 'rgba(123,211,137,0.2)' : 'rgba(255,255,255,0.08)', color: settings.smartCam.linked ? '#8ee39d' : 'rgba(255,255,255,0.72)', fontSize: 12, fontWeight: 800 }}>
              {settings.smartCam.linked ? '연결됨' : '대기 중'}
            </span>
          </div>
        </div>

        <button onClick={() => onNavigate(4)} style={{ width: '100%', marginTop: 14, padding: '12px 14px', borderRadius: 12, border: 'none', background: '#7bd389', color: '#103221', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>
          보호 설정 자세히 보기
        </button>
      </div>
    </div>
  )
}

function HomeFamilyProtectionPanel({ snapshot, onNavigate }) {
  const profile = snapshot.childProfiles.find((item) => item.childId === snapshot.selectedChildId) || snapshot.childProfiles[0]
  const settings = snapshot.settings
  const dayLimitPreview = (settings.dayLimits || []).slice(0, 3)

  if (!profile) {
    return null
  }

  return (
    <section style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', margin: '0 2px' }}>
        <div>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: S.sub }}>가족 보호</p>
          <p style={{ margin: '4px 0 0', fontSize: 11, color: S.muted }}>홈에서 시청 시간과 보호 정책을 바로 확인할 수 있어요.</p>
        </div>
        <span style={{ padding: '4px 10px', borderRadius: 999, background: '#eef4ff', color: S.primary, fontSize: 10, fontWeight: 800 }}>
          홈 바로보기
        </span>
      </div>

      <div style={{ borderRadius: 22, background: S.white, color: S.text, padding: 20, boxShadow: '0 10px 24px rgba(15,23,42,0.08)', border: `1px solid ${S.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
          <div style={{ width: 58, height: 58, borderRadius: '50%', background: '#f9b3d1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 800 }}>
            {profile.avatarLetter}
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 24, fontWeight: 800, color: S.text }}>{profile.childName}</p>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: S.sub }}>{profile.age}세 · {profile.schoolLabel}</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          <div style={{ padding: '12px 14px', borderRadius: 14, background: '#f7f9fc' }}>
            <p style={{ margin: 0, fontSize: 10, color: S.sub }}>일일 제한</p>
            <p style={{ margin: '6px 0 0', fontSize: 18, fontWeight: 800, color: S.text }}>{Math.round(profile.dailyLimitMinutes)}분</p>
          </div>
          <div style={{ padding: '12px 14px', borderRadius: 14, background: '#f7f9fc' }}>
            <p style={{ margin: 0, fontSize: 10, color: S.sub }}>취침 잠금</p>
            <p style={{ margin: '6px 0 0', fontSize: 18, fontWeight: 800, color: S.text }}>{profile.bedtimeLockEnabled ? `${profile.bedtimeHour}시` : '꺼짐'}</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          <div style={{ padding: '12px 14px', borderRadius: 14, background: '#f7f9fc' }}>
            <p style={{ margin: 0, fontSize: 10, color: S.sub }}>자동 차단</p>
            <p style={{ margin: '6px 0 0', fontSize: 18, fontWeight: 800, color: profile.autoBlockEnabled ? '#31b36b' : S.text }}>
              {profile.autoBlockEnabled ? '켜짐' : '꺼짐'}
            </p>
          </div>
          <div style={{ padding: '12px 14px', borderRadius: 14, background: '#f7f9fc' }}>
            <p style={{ margin: 0, fontSize: 10, color: S.sub }}>보호자 알림</p>
            <p style={{ margin: '6px 0 0', fontSize: 18, fontWeight: 800, color: S.text }}>{settings.notificationThreshold}분 기준</p>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: 14, background: '#f7f9fc' }}>
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: S.text }}>콘텐츠 등급</p>
              <p style={{ margin: '4px 0 0', fontSize: 11, color: S.sub }}>현재 자녀 기준 허용 콘텐츠 등급</p>
            </div>
            <span style={{ padding: '6px 12px', borderRadius: 999, background: 'rgba(123,211,137,0.18)', color: '#31b36b', fontSize: 12, fontWeight: 800 }}>
              {profile.contentRatingLabel}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: 14, background: '#f7f9fc' }}>
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: S.text }}>스마트캠 케어</p>
              <p style={{ margin: '4px 0 0', fontSize: 11, color: S.sub }}>자세, 눈 깜박임, 거리 감지 상태</p>
            </div>
            <span style={{ padding: '6px 12px', borderRadius: 999, background: settings.smartCam.linked ? 'rgba(123,211,137,0.18)' : '#eef2f7', color: settings.smartCam.linked ? '#31b36b' : '#6b7280', fontSize: 12, fontWeight: 800 }}>
              {settings.smartCam.linked ? '연결됨' : '대기 중'}
            </span>
          </div>
        </div>

        <div style={{ marginTop: 12, padding: 14, borderRadius: 16, background: '#f7f9fc' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: S.text }}>요일별 시청 제한</p>
            <span style={{ fontSize: 10, color: S.sub }}>미리보기</span>
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            {dayLimitPreview.map((item) => (
              <div key={item.day} style={{ display: 'grid', gridTemplateColumns: '32px 1fr auto', gap: 10, alignItems: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: S.sub }}>{item.day}</span>
                <div style={{ height: 6, borderRadius: 999, background: '#e8edf5', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${Math.max(8, Math.min(100, Math.round((item.limitMinutes / Math.max(profile.dailyLimitMinutes || 1, 1)) * 100)))}%`,
                      height: '100%',
                      borderRadius: 999,
                      background: 'linear-gradient(90deg, #7bd389 0%, #93e5ff 100%)',
                    }}
                  />
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: S.text }}>{item.limitMinutes}분</span>
              </div>
            ))}
          </div>
        </div>

        <button onClick={() => onNavigate(4)} style={{ width: '100%', marginTop: 14, padding: '12px 14px', borderRadius: 12, border: 'none', background: '#7bd389', color: '#103221', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>
          가족 보호 설정 자세히 보기
        </button>
      </div>
    </section>
  )
}

function ScreenHome({ snapshot, onNavigate, onSelectChild }) {
  const summary = snapshot.summary
  const content = snapshot.content
  const posture = snapshot.posture
  const diffMore = summary.differenceFromPeers > 0

  return (
    <div style={screenBodyStyle}>
      <Card style={{ background: 'linear-gradient(135deg,#5B6CF6,#A29BFE)', color: '#fff', padding: '18px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 50, height: 50, borderRadius: '50%', background: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>TV</div>
          <div>
            <p style={{ margin: 0, fontSize: 12, opacity: 0.8 }}>우리 아이</p>
            <p style={{ margin: 0, fontSize: 19, fontWeight: 800 }}>{snapshot.profile.childName}</p>
            <p style={{ margin: 0, fontSize: 11, opacity: 0.75, marginTop: 1 }}>{snapshot.profile.age}세 · {snapshot.profile.schoolLabel}</p>
          </div>
          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
            <p style={{ margin: 0, fontSize: 11, opacity: 0.8 }}>이번 주 총 시청</p>
            <p style={{ margin: 0, fontSize: 21, fontWeight: 800 }}>{formatMinutes(summary.weeklyMinutes)}</p>
            <p style={{ margin: 0, fontSize: 10, opacity: 0.7, marginTop: 2 }}>일 평균 {formatMinutes(summary.averageDailyMinutes)}</p>
          </div>
        </div>
      </Card>

      <p style={{ margin: '2px 2px 0', fontSize: 12, fontWeight: 700, color: S.sub, letterSpacing: '0.3px' }}>한눈에 보기</p>

      <HomeMiniCard
        title="일별 시청 시간"
        onClick={() => onNavigate(1)}
        icon={<div style={miniIconWrap('#FFF0F0')}><Clock size={14} color={S.red} /></div>}
        badge={<span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: diffMore ? '#FFF0F0' : '#F0FFF8', color: diffMore ? S.red : S.green }}>또래 {diffMore ? `▲${formatMinutes(Math.abs(summary.differenceFromPeers))}` : `▼${formatMinutes(Math.abs(summary.differenceFromPeers))}`}</span>}
      >
        <ResponsiveContainer width="100%" height={60}>
          <BarChart data={snapshot.daily.series} barSize={16} margin={{ top: 0, right: 2, bottom: 0, left: -32 }}>
            <XAxis dataKey="day" tick={{ fontSize: 9, fill: S.muted }} axisLine={false} tickLine={false} />
            <ReferenceLine y={summary.peerAverageDailyMinutes} stroke="#00B894" strokeDasharray="3 3" strokeWidth={1} />
            <Bar dataKey="mine" radius={[3, 3, 0, 0]}>{snapshot.daily.series.map((item, index) => <Cell key={item.date} fill={index === snapshot.daily.series.length - 1 ? S.red : '#FFD5CC'} />)}</Bar>
          </BarChart>
        </ResponsiveContainer>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
          <span style={{ fontSize: 10, color: S.muted }}>— 평균 비교선</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: snapshot.daily.ctaRecommended ? S.red : S.green }}>{snapshot.daily.ctaRecommended ? '⚠ 권장 초과' : '✓ 권장 이내'}</span>
        </div>
      </HomeMiniCard>

      <HomeMiniCard
        title="콘텐츠 비율"
        onClick={() => onNavigate(2)}
        icon={<div style={miniIconWrap('#F0F4FF')}><TrendingUp size={14} color={S.primary} /></div>}
        badge={content.dominantCategory ? <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: '#EEF4FF', color: S.primary }}>{content.dominantCategory.name} {content.dominantCategory.share}%</span> : null}
      >
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ flexShrink: 0, width: 72, height: 72 }}>
            <ResponsiveContainer width={72} height={72}>
              <PieChart>
                <Pie data={content.breakdown.slice(0, 5)} dataKey="share" innerRadius={20} outerRadius={34} paddingAngle={2}>
                  {content.breakdown.slice(0, 5).map((item) => <Cell key={item.key} fill={categoryColor(item.name)} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
            {content.breakdown.slice(0, 3).map((item) => (
              <div key={item.key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 7, height: 7, borderRadius: 2, background: categoryColor(item.name), flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 11, color: S.text, fontWeight: 500 }}>{item.name}</span>
                <div style={{ width: 56, height: 5, background: '#F5F5F5', borderRadius: 3, overflow: 'hidden' }}><div style={{ width: `${item.share}%`, height: '100%', background: categoryColor(item.name), borderRadius: 3 }} /></div>
                <span style={{ fontSize: 11, fontWeight: 700, color: categoryColor(item.name), width: 32, textAlign: 'right' }}>{item.share}%</span>
              </div>
            ))}
          </div>
        </div>
      </HomeMiniCard>

      <div style={{ background: S.white, borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.07)', padding: '16px 18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={miniIconWrap('#F0F0FF')}><Activity size={14} color={S.purple} /></div>
            <span style={{ fontSize: 13, fontWeight: 700, color: S.text }}>자세 관리</span>
          </div>
          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: '#FFF4E0', color: '#B8620A' }}>{posture.available ? '수치 확인' : '데이터 대기'}</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { group: 'stretch', label: '자세 점수', value: posture.postureScore == null ? '대기' : `${Math.round(posture.postureScore)}점`, ref: '기준 75점', color: metricColor(posture.postureScore, 75, 50), screen: 8 },
            { group: 'distance', label: '시청 거리', value: posture.averageDistanceCm == null ? '대기' : `${Math.round(posture.averageDistanceCm)}cm`, ref: '권장 200cm+', color: metricColor(posture.averageDistanceCm, 200, 150), screen: 6 },
            { group: 'blink', label: '눈 깜박임', value: posture.averageBlinkBpm == null ? '대기' : `${Math.round(posture.averageBlinkBpm)}회/분`, ref: '권장 15+', color: metricColor(posture.averageBlinkBpm, 15, 10), screen: 7 },
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => onNavigate(item.screen)}
              style={{ flex: 1, textAlign: 'center', padding: '10px 4px 8px', background: '#F8F9FC', borderRadius: 12, border: '1px solid #EDF0F5', cursor: 'pointer' }}
            >
              <p style={{ margin: 0, fontSize: 9, color: S.sub, marginBottom: 3 }}>{item.label}</p>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: item.color }}>{item.value}</p>
              <p style={{ margin: '4px 0 0', fontSize: 8, color: S.muted }}>{item.ref}</p>
              <p style={{ margin: '5px 0 0', fontSize: 8, color: S.primary, fontWeight: 700 }}>음성 설정 →</p>
            </button>
          ))}
        </div>
      </div>

      <HomeFamilyProtectionPanel snapshot={snapshot} onNavigate={onNavigate} />

      <div>
        <p style={{ margin: '0 2px 10px', fontSize: 12, fontWeight: 800, color: S.sub }}>자녀 프로필</p>
        <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 6, scrollSnapType: 'x proximity', WebkitOverflowScrolling: 'touch' }}>
          {snapshot.childProfiles.map((child) => (
            <ChildProfileCard
              key={child.childId}
              child={child}
              selected={child.childId === snapshot.selectedChildId}
              onClick={() => { onSelectChild(child.childId); onNavigate(5) }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function ScreenDaily({ snapshot, state, onApply }) {
  const daily = snapshot.daily
  const summary = snapshot.summary
  const todayIndex = daily.series.length - 1
  const maxMins = Math.max(...daily.series.map((item) => item.mine), 1)
  const diffMore = summary.differenceFromPeers > 0

  return (
    <div style={screenBodyStyle}>
      <Card style={{ background: 'linear-gradient(135deg,#FF6B6B,#FF8E53)', color: '#fff', padding: '18px 20px' }}>
        <p style={{ margin: 0, fontSize: 13, opacity: 0.85 }}>이번 주 총 시청 시간</p>
        <p style={{ margin: '4px 0 12px', fontSize: 32, fontWeight: 800 }}>{formatMinutes(summary.weeklyMinutes)}</p>
        <div style={{ display: 'flex', gap: 16 }}>
          <div><p style={{ margin: 0, fontSize: 11, opacity: 0.8 }}>일 평균</p><p style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{formatMinutes(summary.averageDailyMinutes)}</p></div>
          <div><p style={{ margin: 0, fontSize: 11, opacity: 0.8 }}>최다 시청일</p><p style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{daily.topDay ? `${daily.topDay.day}요일 (${formatMinutes(daily.topDay.mine)})` : '기록 없음'}</p></div>
        </div>
      </Card>

      <Card style={{ padding: '16px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}><Users size={14} color={S.green} /><span style={{ fontSize: 13, fontWeight: 700, color: S.text }}>또래 대비 시청 위치</span></div>
          <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 20, background: diffMore ? '#FFF0F0' : '#F0FFF8', color: diffMore ? S.red : S.green }}>{daily.gaugeLabel}</span>
        </div>
        <PeerGauge pct={daily.gaugePct} leftLabel="적게 시청" rightLabel="많이 시청" markerLabel={`${snapshot.profile.childName} 시청량 위치`} goodIsLow />
      </Card>

      <Card>
        <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 700, color: S.text }}>요일별 시청 시간</p>
        <p style={{ margin: '0 0 14px', fontSize: 11, color: S.sub }}>점선 기준선은 또래 평균 기준입니다.</p>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={daily.series} barSize={28} margin={{ top: 8, right: 4, bottom: 0, left: -32 }}>
            <XAxis dataKey="day" tick={{ fontSize: 12, fill: S.muted }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#ccc' }} axisLine={false} tickLine={false} tickFormatter={(value) => (value >= 60 ? `${Math.floor(value / 60)}h` : `${value}m`)} />
            <Tooltip formatter={(value) => formatMinutes(value)} />
            <ReferenceLine y={summary.peerAverageDailyMinutes} stroke="#00B894" strokeDasharray="5 3" strokeWidth={1.5} />
            <Bar dataKey="mine" radius={[6, 6, 0, 0]}>{daily.series.map((item, index) => <Cell key={item.date} fill={index === todayIndex ? '#FF6B6B' : '#FFD5CC'} />)}</Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card style={{ padding: '16px 18px' }}>
        <p style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: S.text }}>요일별 또래 비교</p>
        <ResponsiveContainer width="100%" height={150}>
          <BarChart data={daily.series} barGap={3} barCategoryGap="25%" margin={{ top: 4, right: 4, bottom: 0, left: -32 }}>
            <XAxis dataKey="day" tick={{ fontSize: 11, fill: S.muted }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 9, fill: '#ccc' }} axisLine={false} tickLine={false} tickFormatter={(value) => (value >= 60 ? `${Math.floor(value / 60)}h` : `${value}m`)} />
            <Tooltip formatter={(value) => formatMinutes(value)} />
            <Bar dataKey="mine" name={snapshot.profile.childName} fill="#5B6CF6" radius={[4, 4, 0, 0]} />
            <Bar dataKey="peer" name="또래 평균" fill="#D0D3E8" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card>
        <p style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: S.text }}>요일별 상세</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {daily.series.map((item, index) => <div key={item.date} style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span style={{ width: 24, fontSize: 13, color: index === todayIndex ? S.red : S.sub, fontWeight: index === todayIndex ? 700 : 500 }}>{item.day}</span><div style={{ flex: 1, height: 8, background: '#F5F5F5', borderRadius: 4, overflow: 'hidden' }}><div style={{ width: `${(item.mine / maxMins) * 100}%`, height: '100%', background: index === todayIndex ? '#FF6B6B' : '#FFD5CC', borderRadius: 4 }} /></div><span style={{ width: 68, textAlign: 'right', fontSize: 13, color: index === todayIndex ? S.red : S.text, fontWeight: index === todayIndex ? 700 : 500 }}>{formatMinutes(item.mine)}</span></div>)}
        </div>
      </Card>

      {(daily.ctaRecommended || state.dailyApplied) ? <Card style={{ background: 'linear-gradient(135deg,#FFF5F5,#FFE9E9)', border: '1px solid #FFD6D6' }}><div style={{ display: 'flex', gap: 10, marginBottom: state.dailyApplied ? 0 : 14 }}><span style={{ fontSize: 20 }}>⏰</span><div style={{ flex: 1 }}><p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: S.red }}>시청 시간이 권장 시간보다 길어요</p><p style={{ margin: '5px 0 0', fontSize: 12, color: '#777', lineHeight: 1.55 }}>현재 하루 권장 시간은 {formatMinutes(daily.recommendedMinutes)}입니다. 자동 제한이나 알림 정책을 더 강하게 설계할 수 있어요.</p></div></div><SocialBtn onClick={onApply} icon={<Clock size={15} strokeWidth={2.5} />} label="하루 제한 정책 확인하기" badge="부모님 82% 선택" color="red" applied={state.dailyApplied} appliedLabel="권장 시청 정책 확인 완료" /></Card> : null}
    </div>
  )
}

function ScreenContent({ snapshot, state, onApply }) {
  const [selected, setSelected] = useState(null)
  const content = snapshot.content

  return (
    <div style={screenBodyStyle}>
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div><p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: S.text }}>콘텐츠 유형 비율</p><p style={{ margin: '4px 0 0', fontSize: 12, color: S.sub }}>이번 주 기준</p></div>
          <SourceBadge kind="db" />
        </div>
        <div style={{ position: 'relative' }}>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={content.breakdown} cx="50%" cy="50%" innerRadius={55} outerRadius={88} paddingAngle={2} dataKey="share" onClick={(_, index) => setSelected(selected === index ? null : index)}>
                {content.breakdown.map((item, index) => <Cell key={item.key} fill={categoryColor(item.name)} opacity={selected == null || selected === index ? 1 : 0.35} stroke={selected === index ? '#fff' : 'none'} strokeWidth={3} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center', pointerEvents: 'none' }}>
            {selected != null ? <><p style={{ margin: 0, fontSize: 11, color: S.sub }}>{content.breakdown[selected]?.name}</p><p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: categoryColor(content.breakdown[selected]?.name) }}>{content.breakdown[selected]?.share}%</p></> : <><p style={{ margin: 0, fontSize: 11, color: S.sub }}>이번 주</p><p style={{ margin: 0, fontSize: 17, fontWeight: 800, color: S.text }}>{formatMinutes(snapshot.summary.weeklyMinutes)}</p></>}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
          {content.breakdown.map((item, index) => <button key={item.key} onClick={() => setSelected(selected === index ? null : index)} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', opacity: selected == null || selected === index ? 1 : 0.4 }}><div style={{ width: 12, height: 12, borderRadius: 3, background: categoryColor(item.name), flexShrink: 0 }} /><span style={{ flex: 1, fontSize: 13, color: S.text, textAlign: 'left', fontWeight: 500 }}>{item.name}</span><div style={{ flex: 2, height: 6, background: '#F5F5F5', borderRadius: 3, overflow: 'hidden' }}><div style={{ width: `${item.share}%`, height: '100%', background: categoryColor(item.name), borderRadius: 3 }} /></div><span style={{ fontSize: 13, fontWeight: 700, color: categoryColor(item.name), width: 36, textAlign: 'right' }}>{item.share}%</span></button>)}
        </div>
      </Card>

      <Card>
        <p style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: S.text }}>🏆 이번 주 TOP 프로그램</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {content.topShows.length === 0 ? <p style={{ margin: 0, fontSize: 12, color: S.sub }}>시청 기록이 아직 없습니다.</p> : content.topShows.map((show, index) => <div key={show.videoId} style={{ display: 'flex', alignItems: 'center', gap: 12 }}><span style={{ fontSize: 16, fontWeight: 800, color: '#ccc', width: 20 }}>{index + 1}</span><div style={{ width: 40, height: 40, borderRadius: 10, background: `${categoryColor(show.category)}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Tv size={18} color={categoryColor(show.category)} /></div><div style={{ flex: 1 }}><p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: S.text }}>{show.title}</p><div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}><div style={{ width: 6, height: 6, borderRadius: '50%', background: categoryColor(show.category) }} /><span style={{ fontSize: 11, color: S.sub }}>{show.category}</span></div></div><span style={{ fontSize: 13, fontWeight: 600, color: '#555' }}>{formatMinutes(show.minutes)}</span></div>)}
        </div>
      </Card>

      <Card style={{ padding: '16px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Users size={14} color={S.green} /><p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: S.text }}>또래 콘텐츠 비교</p></div>
          <SourceBadge kind="db" />
        </div>
        <p style={{ margin: '0 0 14px', fontSize: 11, color: S.sub }}>현재는 가족 내 다른 자녀 데이터를 기준으로 비교합니다.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {content.compare.map((item) => {
            const myMore = item.mine > item.peer
            const diff = Math.abs(Math.round(item.mine - item.peer))
            return <div key={item.key}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}><div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><div style={{ width: 7, height: 7, borderRadius: 2, background: categoryColor(item.name) }} /><span style={{ fontSize: 12, fontWeight: 600, color: S.text }}>{item.name}</span></div><div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ fontSize: 12, fontWeight: 700, color: '#5B6CF6' }}>{item.mine}%</span><span style={{ fontSize: 11, color: '#bbb' }}>vs</span><span style={{ fontSize: 12, color: '#bbb' }}>{item.peer}%</span>{diff > 0 ? <span style={{ fontSize: 10, fontWeight: 800, padding: '1px 6px', borderRadius: 20, background: myMore ? 'rgba(255,107,107,0.12)' : 'rgba(0,184,148,0.12)', color: myMore ? S.red : S.green }}>{myMore ? '+' : '-'}{diff}%</span> : null}</div></div><div style={{ height: 6, background: '#F0F0F0', borderRadius: 3, overflow: 'hidden', marginBottom: 3 }}><div style={{ width: `${item.mine}%`, height: '100%', background: '#5B6CF6', borderRadius: 3 }} /></div><div style={{ height: 6, background: '#F0F0F0', borderRadius: 3, overflow: 'hidden' }}><div style={{ width: `${item.peer}%`, height: '100%', background: '#D0D3E8', borderRadius: 3 }} /></div></div>
          })}
        </div>
      </Card>

      {(content.showFilterCta || state.contentApplied) ? <Card style={{ background: 'linear-gradient(135deg,#FFF9ED,#FFF3DE)', border: '1px solid #FFD4A0' }}><div style={{ display: 'flex', gap: 10, marginBottom: state.contentApplied ? 0 : 14 }}><span style={{ fontSize: 20 }}>🛡️</span><div style={{ flex: 1 }}><p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#B8620A' }}>자극 콘텐츠 비중이 높아요</p><p style={{ margin: '5px 0 0', fontSize: 12, color: '#777', lineHeight: 1.55 }}>현재 자극 콘텐츠 비중은 {content.riskyShare}%이며 비교 기준은 {content.peerRiskyShare}%입니다. 연령 기준 필터와 허용 콘텐츠 정책은 추가 DB 설계가 필요합니다.</p></div></div><SocialBtn onClick={onApply} icon={<Shield size={15} strokeWidth={2.5} />} label="연령 필터 설계안 확인" badge="부모님 91% 선택" color="yellow" applied={state.contentApplied} appliedLabel="콘텐츠 필터 설계 체크 완료" /></Card> : null}
    </div>
  )
}

function ScreenPosture({ snapshot, state, onApply, onNavigate }) {
  const posture = snapshot.posture
  const baseline = posture.comparisonBaseline
  const postureScore = posture.postureScore
  const distance = posture.averageDistanceCm
  const blink = posture.averageBlinkBpm
  const postureGauge = postureScore == null ? 50 : Math.round(postureScore)

  return (
    <div style={screenBodyStyle}>
      <Card style={{ background: 'linear-gradient(135deg,#7B68EE,#5B6CF6)', color: '#fff', padding: '18px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}><Camera size={14} color="rgba(255,255,255,0.8)" /><p style={{ margin: 0, fontSize: 12, opacity: 0.85 }}>LG 스마트캠 분석</p></div>
        <p style={{ margin: '0 0 14px', fontSize: 17, fontWeight: 800 }}>이번 주 자세 건강 리포트</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <ScoreRing score={postureScore} size={84} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[{ label: '시청 거리', value: distance == null ? '대기' : `${Math.round(distance)}cm`, ok: distance != null && distance >= baseline.distanceCm }, { label: '눈 깜박임', value: blink == null ? '대기' : `${Math.round(blink)}회/분`, ok: blink != null && blink >= baseline.blinkBpm }, { label: `${posture.comparisonBaselineLabel} 자세 점수`, value: `${baseline.postureScore}점`, ok: true }].map((item) => <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ fontSize: 11, opacity: 0.8 }}>{item.label}</span><div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ fontSize: 13, fontWeight: 700 }}>{item.value}</span><span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 8, background: item.ok ? 'rgba(0,255,170,0.2)' : 'rgba(255,200,100,0.25)', color: item.ok ? '#AAF0D1' : '#FFD080' }}>{item.ok ? '양호' : '주의'}</span></div></div>)}
          </div>
        </div>
      </Card>

      <Card style={{ padding: '16px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}><Users size={14} color={S.green} /><span style={{ fontSize: 13, fontWeight: 700, color: S.text }}>비교 기준 대비 자세 위치</span></div>
        <PeerGauge pct={postureGauge} leftLabel="낮은 점수" rightLabel="높은 점수" markerLabel={postureScore == null ? '자세 측정 데이터가 들어오면 자동 계산됩니다.' : `${snapshot.profile.childName} 자세 점수 ${Math.round(postureScore)}점 · 기준 ${baseline.postureScore}점`} goodIsLow={false} />
      </Card>

      <div style={{ display: 'flex', gap: 10 }}>
        {[
          { label: '시청 거리', value: distance == null ? '대기' : `${Math.round(distance)}cm`, hint: `권장 ${baseline.distanceCm}cm+`, color: metricColor(distance, baseline.distanceCm, 150), screen: 6 },
          { label: '눈 깜박임', value: blink == null ? '대기' : `${Math.round(blink)}회/분`, hint: `권장 ${baseline.blinkBpm}+`, color: metricColor(blink, baseline.blinkBpm, 10), screen: 7 },
          { label: '자세 점수', value: postureScore == null ? '대기' : `${Math.round(postureScore)}점`, hint: `기준 ${baseline.postureScore}점`, color: metricColor(postureScore, baseline.postureScore, 50), screen: 8 },
        ].map((item) => (
          <button
            key={item.label}
            onClick={() => onNavigate?.(item.screen)}
            style={{ flex: 1, background: S.white, borderRadius: 14, padding: '14px 12px', boxShadow: '0 2px 10px rgba(0,0,0,0.06)', border: '1px solid #EDF0F5', cursor: 'pointer', textAlign: 'left' }}
          >
            <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: S.sub }}>{item.label}</p>
            <p style={{ margin: '0 0 2px', fontSize: 22, fontWeight: 800, color: item.color }}>{item.value}</p>
            <p style={{ margin: '0 0 6px', fontSize: 10, color: S.muted }}>{item.hint}</p>
            <p style={{ margin: 0, fontSize: 9, color: S.primary, fontWeight: 700 }}>음성 설정 →</p>
          </button>
        ))}
      </div>

      <Card style={{ padding: '16px 18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}><p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: S.text }}>스마트캠 / Mongo 상태</p><SourceBadge kind="db" /></div>
        <p style={{ margin: 0, fontSize: 12, color: S.sub, lineHeight: 1.6 }}>{posture.note}</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
          <div style={{ background: '#F8F9FC', borderRadius: 12, padding: '12px 14px' }}><p style={{ margin: 0, fontSize: 10, color: S.sub }}>세션 수</p><p style={{ margin: '5px 0 0', fontSize: 16, fontWeight: 800, color: S.text }}>{posture.sessionCount}건</p></div>
          <div style={{ background: '#F8F9FC', borderRadius: 12, padding: '12px 14px' }}><p style={{ margin: 0, fontSize: 10, color: S.sub }}>이벤트 수</p><p style={{ margin: '5px 0 0', fontSize: 16, fontWeight: 800, color: S.text }}>{posture.eventCount}건</p></div>
        </div>
        {posture.latestSessionStatus || posture.latestEventMessage ? <div style={{ marginTop: 12, padding: '12px 14px', background: '#f8fafc', borderRadius: 12 }}><p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: S.text }}>최근 상태</p><p style={{ margin: '6px 0 0', fontSize: 11, color: S.sub }}>세션 상태: {posture.latestSessionStatus || '없음'}</p><p style={{ margin: '4px 0 0', fontSize: 11, color: S.sub, lineHeight: 1.5 }}>{posture.latestEventMessage || '최근 이벤트 메시지 없음'}</p></div> : null}
      </Card>

      <Card>
        <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 700, color: S.text }}>최근 7일 자세 이력</p>
        <p style={{ margin: '0 0 14px', fontSize: 12, color: S.sub }}>자세 측정 데이터가 있을 때 자동 집계됩니다.</p>
        {posture.history.length === 0 ? <div style={{ padding: '16px 0', textAlign: 'center', color: S.sub, fontSize: 12 }}>아직 시계열 자세 데이터가 없습니다.</div> : <ResponsiveContainer width="100%" height={150}><BarChart data={posture.history} barSize={24} margin={{ top: 4, right: 4, bottom: 0, left: -32 }}><XAxis dataKey="label" tick={{ fontSize: 11, fill: S.muted }} axisLine={false} tickLine={false} /><YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: '#ccc' }} axisLine={false} tickLine={false} /><Tooltip formatter={(value) => `${value}점`} /><ReferenceLine y={baseline.postureScore} stroke="#D0D3E8" strokeDasharray="4 4" strokeWidth={1.5} /><Bar dataKey="postureScore" radius={[5, 5, 0, 0]}>{posture.history.map((item) => <Cell key={item.date} fill={metricColor(item.postureScore, baseline.postureScore, 50)} />)}</Bar></BarChart></ResponsiveContainer>}
      </Card>

      {(posture.deviations.length > 0 || state.postureApplied) ? <Card style={{ background: 'linear-gradient(135deg,#F5F0FF,#EDE8FF)', border: '1px solid #C8B8F5' }}><div style={{ display: 'flex', gap: 10, marginBottom: state.postureApplied ? 0 : 14 }}><span style={{ fontSize: 20 }}>{state.postureApplied ? '✅' : '👁️'}</span><div style={{ flex: 1 }}><p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: state.postureApplied ? S.green : '#6B4FCF' }}>{state.postureApplied ? '눈 건강 액션 체크 완료' : '자세 건강에 주의가 필요해요'}</p><p style={{ margin: '5px 0 0', fontSize: 12, color: state.postureApplied ? '#00A882' : '#777', lineHeight: 1.55 }}>{state.postureApplied ? '스마트캠 연동과 자세 데이터 저장 기준, 알림 정책 설계를 다시 확인할 수 있습니다.' : posture.deviations[0]?.message || '자세 데이터가 쌓이면 평소보다 어떤 행동이 늘었는지 더 자세히 안내합니다.'}</p></div></div><SocialBtn onClick={onApply} icon={<Bell size={15} strokeWidth={2.5} />} label="30분 눈 운동 알림 설계 확인" badge="안과 전문의 권장" color="purple" applied={state.postureApplied} appliedLabel="눈 운동 알림 설계 체크 완료" /></Card> : null}
    </div>
  )
}

function ScreenSettings({ snapshot, localSettings, setLocalSettings, onToggleAllowedCategory }) {
  const settings = snapshot.settings
  const row = (iconBg, icon, label, sub, right, badge) => <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', background: S.white, borderRadius: 12, boxShadow: '0 1px 6px rgba(0,0,0,0.05)', marginBottom: 8 }}><div style={{ width: 36, height: 36, borderRadius: 10, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{icon}</div><div style={{ flex: 1 }}><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: S.text }}>{label}</p>{badge}</div><p style={{ margin: 0, fontSize: 11, color: S.sub, marginTop: 2 }}>{sub}</p></div>{right}</div>

  return (
    <div style={{ ...screenBodyStyle, paddingTop: 10 }}>
      <p style={sectionTitleStyle}>시청 시간 설정</p>
      <Card style={{ borderRadius: 12, padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <div style={miniIconWrap('#FFF0F0', 36)}><Clock size={18} color={S.red} /></div>
          <div style={{ flex: 1 }}><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: S.text }}>하루 최대 시청 시간</p><SourceBadge kind="db" /></div><p style={{ margin: 0, fontSize: 11, color: S.sub, marginTop: 2 }}>child_watch_policy.daily_limit_minutes 기준</p></div>
          <span style={{ fontSize: 18, fontWeight: 800, color: S.primary }}>{localSettings.maxHour}시간</span>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>{[0.5, 1, 1.5, 2, 2.5, 3].map((value) => <div key={value} style={{ width: 26, height: 8, borderRadius: 4, background: value <= localSettings.maxHour ? S.primary : '#EEF0FF' }} />)}</div>
      </Card>

      {row('#FFF7E6', <Bell size={18} color={S.yellow} />, '초과 시청 알림', `${settings.notificationThreshold}분 초과 시 보호자 알림 기준`, <Toggle on={localSettings.notify} onToggle={() => setLocalSettings((prev) => ({ ...prev, notify: !prev.notify }))} />, <SourceBadge kind="db" />)}
      {row('#F0F4FF', <Star size={18} color={S.primary} />, '취침 시간 잠금', settings.bedtimeLockEnabled ? `${settings.bedtimeHour}:00 이후에는 시청이 자동으로 잠깁니다.` : '현재 취침 잠금이 꺼져 있습니다.', <Toggle on={localSettings.bedtime} onToggle={() => setLocalSettings((prev) => ({ ...prev, bedtime: !prev.bedtime }))} />, <SourceBadge kind="db" />)}

      <Card style={{ borderRadius: 12, padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <div style={miniIconWrap('#EEF4FF', 36)}><Clock size={18} color={S.primary} /></div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: S.text }}>요일별 시청 시간 제한</p>
              <SourceBadge kind="db" />
            </div>
            <p style={{ margin: 0, fontSize: 11, color: S.sub, marginTop: 2 }}>PostgreSQL child_watch_policy 기준</p>
          </div>
        </div>
        <div style={{ display: 'grid', gap: 8 }}>
          {settings.dayLimits.map((item) => (
            <div key={item.day} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ width: 18, fontSize: 12, fontWeight: 700, color: S.sub }}>{item.day}</span>
              <div style={{ flex: 1, height: 8, borderRadius: 999, background: '#EEF0FF', overflow: 'hidden' }}>
                <div style={{ width: `${Math.min(100, Math.round((item.limitMinutes / 240) * 100))}%`, height: '100%', borderRadius: 999, background: S.primary }} />
              </div>
              <span style={{ width: 42, textAlign: 'right', fontSize: 12, fontWeight: 700, color: S.primary }}>{item.limitMinutes}분</span>
            </div>
          ))}
        </div>
      </Card>

      <p style={sectionTitleStyle}>콘텐츠 유형 설정</p>
      <Card style={{ borderRadius: 12, padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <div style={miniIconWrap('#F0F4FF', 36)}><Shield size={18} color={S.primary} /></div>
          <div><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: S.text }}>허용 콘텐츠 유형</p><SourceBadge kind="db" /></div><p style={{ margin: 0, fontSize: 11, color: S.sub, marginTop: 2 }}>모델 기준 15개 유튜브 카테고리를 자녀별 데이터 정책으로 관리합니다.</p></div>
        </div>
        {settings.allowedCategories.map((category) => <button key={category.key} onClick={() => onToggleAllowedCategory(category.key)} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', padding: '7px 0', textAlign: 'left', width: '100%' }}><div style={{ width: 20, height: 20, borderRadius: 6, background: localSettings.allowed[category.key] ? categoryColor(category.name) : '#EEE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{localSettings.allowed[category.key] ? <Check size={12} color="#fff" strokeWidth={3} /> : null}</div><div style={{ width: 8, height: 8, borderRadius: 2, background: categoryColor(category.name), flexShrink: 0 }} /><span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: localSettings.allowed[category.key] ? S.text : S.muted }}>{category.name}</span><span style={{ fontSize: 11, fontWeight: 700, color: localSettings.allowed[category.key] ? S.green : S.muted }}>{localSettings.allowed[category.key] ? '허용' : '차단'}</span></button>)}
      </Card>

      {row('#E8FAF6', <Shield size={18} color={S.green} />, '연령 제한 필터', settings.autoBlockEnabled ? '현재 자녀 보호 정책은 활성화되어 있습니다.' : '현재 자녀 보호 정책은 비활성화되어 있습니다.', <Toggle on={localSettings.ageFilter} onToggle={() => setLocalSettings((prev) => ({ ...prev, ageFilter: !prev.ageFilter }))} />, <SourceBadge kind="db" />)}

      <p style={sectionTitleStyle}>LG 스마트캠 연결</p>
      <Card style={{ borderRadius: 12, padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: localSettings.camLinked ? '#E8FAF6' : '#F5F5F5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Camera size={22} color={localSettings.camLinked ? S.green : S.muted} /></div>
          <div style={{ flex: 1 }}><div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: S.text }}>LG 스마트캠</p><SourceBadge kind={settings.dbCoverage.smartCamBinding ? 'db' : 'design'} /></div><p style={{ margin: 0, fontSize: 11, color: S.sub, marginTop: 2 }}>{localSettings.camLinked ? `세션 ${settings.smartCam.sessionCount}건 · 최근 상태 ${settings.smartCam.latestStatus || '없음'}` : '캠 연결/기기 바인딩 정책은 추가 스키마 설계가 필요합니다.'}</p></div>
        </div>
        {settings.smartCam.latestEventMessage ? <div style={{ marginTop: 12, padding: '10px 12px', background: '#F8F9FC', borderRadius: 10, fontSize: 11, color: S.sub, lineHeight: 1.5 }}>{settings.smartCam.latestEventMessage}</div> : null}
      </Card>

      <div style={{ background: '#F0F4FF', borderRadius: 12, padding: '12px 14px', display: 'flex', gap: 10 }}><Wifi size={18} color={S.primary} style={{ flexShrink: 0, marginTop: 1 }} /><p style={{ margin: 0, fontSize: 12, color: '#4E6EDB', lineHeight: 1.6 }}>{settings.source}</p></div>
    </div>
  )
}

function ScreenChildProfile({ snapshot, selectedChildId, onRefresh }) {
  const child = snapshot.childProfiles.find((item) => item.childId === selectedChildId) || snapshot.childProfiles[0]

  const [limitMins, setLimitMins] = useState(child?.dailyLimitMinutes ?? 120)
  const [bedtimeOn, setBedtimeOn] = useState(child?.bedtimeLockEnabled ?? false)
  const [bedtimeHour, setBedtimeHour] = useState(child?.bedtimeHour ?? 21)
  const [autoBlock, setAutoBlock] = useState(child?.autoBlockEnabled ?? true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState(null)

  useEffect(() => {
    if (!child) return
    setLimitMins(child.dailyLimitMinutes ?? 120)
    setBedtimeOn(child.bedtimeLockEnabled ?? false)
    setBedtimeHour(child.bedtimeHour ?? 21)
    setAutoBlock(child.autoBlockEnabled ?? true)
    setSaved(false)
  }, [child?.childId])

  async function handleSave() {
    if (!child) return
    setSaving(true)
    setSaveError(null)
    try {
      await updateWatchPolicy(child.childId, { dailyLimitMinutes: limitMins, bedtimeLockEnabled: bedtimeOn, bedtimeHour, autoBlockEnabled: autoBlock })
      setSaved(true)
      await onRefresh()
    } catch (err) {
      setSaveError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (!child) return null

  return (
    <div style={screenBodyStyle}>
      <Card style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#f9b3d1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 800, color: S.text, flexShrink: 0 }}>
          {child.avatarLetter}
        </div>
        <div>
          <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: S.text }}>{child.childName}</p>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: S.sub }}>{child.age}세 · {child.schoolLabel}</p>
          <span style={{ display: 'inline-flex', marginTop: 6, padding: '3px 10px', borderRadius: 999, background: child.viewingAllowedNow ? '#E8FAF6' : '#FFF0F0', color: child.viewingAllowedNow ? S.green : S.red, fontSize: 11, fontWeight: 700 }}>
            {child.viewingAllowedNow ? '보호 켜짐 · 시청 가능' : '현재 제한 중'}
          </span>
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        <div style={{ background: S.white, borderRadius: 14, padding: '12px 10px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <p style={{ margin: 0, fontSize: 10, color: S.sub }}>일일 제한</p>
          <p style={{ margin: '6px 0 0', fontSize: 15, fontWeight: 800, color: S.text }}>{formatMinutes(limitMins)}</p>
        </div>
        <div style={{ background: S.white, borderRadius: 14, padding: '12px 10px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <p style={{ margin: 0, fontSize: 10, color: S.sub }}>허용 등급</p>
          <p style={{ margin: '6px 0 0', fontSize: 12, fontWeight: 800, color: S.text }}>{child.contentRatingLabel}</p>
        </div>
        <div style={{ background: S.white, borderRadius: 14, padding: '12px 10px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <p style={{ margin: 0, fontSize: 10, color: S.sub }}>취침 잠금</p>
          <p style={{ margin: '6px 0 0', fontSize: 15, fontWeight: 800, color: bedtimeOn ? S.text : S.muted }}>{bedtimeOn ? `${bedtimeHour}시` : '꺼짐'}</p>
        </div>
      </div>

      <p style={sectionTitleStyle}>시청 시간 관리</p>
      <Card style={{ borderRadius: 12, padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <div style={miniIconWrap('#FFF0F0', 36)}><Clock size={18} color={S.red} /></div>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: S.text }}>일일 시청 제한</p>
            <p style={{ margin: 0, fontSize: 11, color: S.sub }}>하루 최대 시청 가능 시간</p>
          </div>
          <span style={{ fontSize: 16, fontWeight: 800, color: S.primary }}>{formatMinutes(limitMins)}</span>
        </div>
        <input type="range" min={0} max={240} step={10} value={limitMins} onChange={(event) => { setLimitMins(Number(event.target.value)); setSaved(false) }} style={{ width: '100%', accentColor: S.primary }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          <span style={{ fontSize: 10, color: S.muted }}>0분</span>
          <span style={{ fontSize: 10, color: S.muted }}>4시간</span>
        </div>
      </Card>

      <Card style={{ borderRadius: 12, padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: bedtimeOn ? 14 : 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={miniIconWrap('#F0F4FF', 36)}><Shield size={18} color={S.primary} /></div>
            <div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: S.text }}>취침 잠금</p>
              <p style={{ margin: 0, fontSize: 11, color: S.sub }}>취침 시간 이후 자동 잠금</p>
            </div>
          </div>
          <Toggle on={bedtimeOn} onToggle={() => { setBedtimeOn((prev) => !prev); setSaved(false) }} />
        </div>
        {bedtimeOn && (
          <div style={{ borderTop: `1px solid ${S.border}`, paddingTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: S.text }}>잠금 시작 시간</span>
            <select value={bedtimeHour} onChange={(event) => { setBedtimeHour(Number(event.target.value)); setSaved(false) }} style={{ ...selectStyle, width: 'auto', padding: '6px 10px', fontSize: 13 }}>
              {Array.from({ length: 12 }, (_, i) => i + 18).map((h) => (<option key={h} value={h}>{h}시</option>))}
            </select>
          </div>
        )}
      </Card>

      <Card style={{ borderRadius: 12, padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={miniIconWrap('#FFF8E0', 36)}><Bell size={18} color={S.yellow} /></div>
            <div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: S.text }}>자동 차단</p>
              <p style={{ margin: 0, fontSize: 11, color: S.sub }}>제한 시간 초과 시 자동 차단</p>
            </div>
          </div>
          <Toggle on={autoBlock} onToggle={() => { setAutoBlock((prev) => !prev); setSaved(false) }} />
        </div>
      </Card>

      {saveError ? <p style={{ margin: 0, fontSize: 12, color: S.red, textAlign: 'center' }}>{saveError}</p> : null}
      <button onClick={handleSave} disabled={saving} style={{ ...primaryButtonStyle, background: saved ? S.green : S.primary, opacity: saving ? 0.7 : 1 }}>
        {saving ? '저장 중...' : saved ? '✓ 저장 완료' : '변경사항 저장'}
      </button>
    </div>
  )
}

function ScreenVoiceGroup({ group, familyId = 1 }) {
  const info = VOICE_GROUP_INFO[group]
  const enabledKey = `${group}Enabled`
  const activeSpeakerKey = `${group}ActiveSpeakerId`

  const [recordings, setRecordings] = useState([])
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)

  const [activeType, setActiveType] = useState(null)
  const [step, setStep] = useState('idle')
  const [speakerName, setSpeakerName] = useState('')
  const [recordingSec, setRecordingSec] = useState(0)
  const [blobUrl, setBlobUrl] = useState(null)
  const [blobMime, setBlobMime] = useState('audio/webm')
  const [blobDuration, setBlobDuration] = useState(0)
  const [errorMsg, setErrorMsg] = useState(null)
  const [previewPlaying, setPreviewPlaying] = useState(false)

  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)
  const previewAudioRef = useRef(null)
  const startTimeRef = useRef(0)

  const reload = useCallback(async () => {
    try {
      const [recs, stgs] = await Promise.all([getVoiceRecordings(familyId), getVoiceSettings(familyId)])
      setRecordings(recs.filter((r) => info.subTypes.some((s) => s.type === r.alertType)))
      setSettings(stgs)
    } catch { /* 오프라인 — 현재 상태 유지 */ }
    finally { setLoading(false) }
  }, [familyId, group]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { void reload() }, [reload])

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current) { mediaRecorderRef.current.stop(); mediaRecorderRef.current = null }
    if (timerRef.current != null) { clearInterval(timerRef.current); timerRef.current = null }
    if (blobUrl) URL.revokeObjectURL(blobUrl)
    if (previewAudioRef.current) { previewAudioRef.current.pause(); previewAudioRef.current = null }
    setBlobUrl(null); setSpeakerName(''); setStep('idle'); setActiveType(null)
    setErrorMsg(null); setPreviewPlaying(false)
  }, [blobUrl])

  const startRecording = useCallback(async (alertType) => {
    setErrorMsg(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mime = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg'
      setBlobMime(mime)
      chunksRef.current = []
      const mr = new MediaRecorder(stream, { mimeType: mime })
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())
        const blob = new Blob(chunksRef.current, { type: mime })
        setBlobUrl(URL.createObjectURL(blob))
        setBlobDuration(Math.round((Date.now() - startTimeRef.current) / 100) / 10)
        setStep('preview')
      }
      mr.start(250)
      mediaRecorderRef.current = mr
      startTimeRef.current = Date.now()
      setRecordingSec(0)
      timerRef.current = setInterval(() => setRecordingSec((s) => s + 1), 1000)
      setStep('recording')
    } catch {
      setErrorMsg('마이크 권한이 필요합니다. 브라우저 설정에서 마이크를 허용해 주세요.')
    }
  }, [])

  const stopRecording = useCallback(() => {
    if (timerRef.current != null) { clearInterval(timerRef.current); timerRef.current = null }
    mediaRecorderRef.current?.stop()
    mediaRecorderRef.current = null
  }, [])

  const togglePreview = useCallback(() => {
    if (!blobUrl) return
    if (previewAudioRef.current) {
      previewAudioRef.current.pause(); previewAudioRef.current = null; setPreviewPlaying(false); return
    }
    const audio = new Audio(blobUrl)
    previewAudioRef.current = audio
    audio.onended = () => { previewAudioRef.current = null; setPreviewPlaying(false) }
    void audio.play()
    setPreviewPlaying(true)
  }, [blobUrl])

  const saveRec = useCallback(async () => {
    if (!blobUrl || !activeType) return
    setStep('saving'); setErrorMsg(null)
    try {
      const blob = await fetch(blobUrl).then((r) => r.blob())
      const reader = new FileReader()
      reader.onloadend = async () => {
        try {
          const speakerId = `spk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
          await saveVoiceRecording({
            familyId, speakerId,
            speakerName: speakerName.trim() || '이름 없음',
            alertType: activeType,
            audioData: reader.result,
            audioMime: blobMime,
            audioDuration: blobDuration,
          })
          URL.revokeObjectURL(blobUrl)
          setBlobUrl(null); setSpeakerName(''); setStep('idle'); setActiveType(null)
          await reload()
        } catch { setErrorMsg('저장에 실패했습니다. 다시 시도해 주세요.'); setStep('preview') }
      }
      reader.readAsDataURL(blob)
    } catch { setErrorMsg('저장에 실패했습니다.'); setStep('preview') }
  }, [blobUrl, blobMime, blobDuration, activeType, speakerName, familyId, reload])

  const handleToggleGroup = useCallback(async (enabled) => {
    if (!settings) return
    const next = { ...settings, [enabledKey]: enabled }
    setSettings(next)
    try { await saveVoiceSettings(familyId, next) } catch { setSettings(settings) }
  }, [settings, enabledKey, familyId])

  const handleSetActiveSpeaker = useCallback(async (speakerId) => {
    if (!settings) return
    const next = { ...settings, [activeSpeakerKey]: speakerId }
    setSettings(next)
    try { await saveVoiceSettings(familyId, next) } catch { setSettings(settings) }
  }, [settings, activeSpeakerKey, familyId])

  const handleDelete = useCallback(async (speakerId, alertType) => {
    try { await deleteVoiceRecording(familyId, speakerId, alertType); await reload() } catch { /* ignore */ }
  }, [familyId, reload])

  const handleToggleClip = useCallback(async (speakerId, alertType, enabled) => {
    try { await toggleVoiceRecordingEnabled(familyId, speakerId, alertType, enabled); await reload() } catch { /* ignore */ }
  }, [familyId, reload])

  const groupEnabled = settings ? settings[enabledKey] : true
  const activeSpeakerId = settings ? settings[activeSpeakerKey] : null
  const allSpeakers = Array.from(new Map(recordings.map((r) => [r.speakerId, r.speakerName])).entries())

  const cardStyle = { background: S.white, borderRadius: 14, padding: '14px 16px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', marginBottom: 0 }
  const btnBase = { border: 'none', borderRadius: 10, fontSize: 12, fontWeight: 700, padding: '8px 14px', cursor: 'pointer' }

  return (
    <div style={screenBodyStyle}>
      {/* 그룹 토글 */}
      <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: S.text }}>{info.icon} {info.label} 음성 알림</p>
          <p style={{ margin: '3px 0 0', fontSize: 11, color: S.sub }}>알림이 뜰 때 이 목소리로 자동 안내해요</p>
        </div>
        <Toggle on={groupEnabled} onToggle={() => void handleToggleGroup(!groupEnabled)} />
      </div>

      {/* 화자 선택 */}
      {groupEnabled && allSpeakers.length > 0 && (
        <div style={cardStyle}>
          <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: S.sub }}>재생할 목소리</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            <button
              onClick={() => void handleSetActiveSpeaker(null)}
              style={{ ...btnBase, background: activeSpeakerId == null ? S.primary : '#F0F2F8', color: activeSpeakerId == null ? '#fff' : S.text }}
            >랜덤</button>
            {allSpeakers.map(([id, name]) => (
              <button
                key={id}
                onClick={() => void handleSetActiveSpeaker(id)}
                style={{ ...btnBase, background: activeSpeakerId === id ? S.primary : '#F0F2F8', color: activeSpeakerId === id ? '#fff' : S.text }}
              >{name}</button>
            ))}
          </div>
        </div>
      )}

      {/* 알림 유형별 섹션 */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 24, color: S.sub, fontSize: 13 }}>불러오는 중...</div>
      ) : (
        info.subTypes.map(({ type: alertType, label: typeLabel }) => {
          const typeRecs = recordings.filter((r) => r.alertType === alertType)
          const isRecordingThis = activeType === alertType
          const canAddNew = step === 'idle' || !isRecordingThis

          return (
            <div key={alertType} style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: S.text }}>{typeLabel}</p>
                <span style={{ fontSize: 11, color: S.sub }}>{typeRecs.length > 0 ? `${typeRecs.length}개 녹음` : '녹음 없음'}</span>
              </div>

              {typeRecs.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
                  {typeRecs.map((rec) => (
                    <div key={`${rec.speakerId}-${rec.alertType}`} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: '#F8F9FC', borderRadius: 10 }}>
                      <span style={{ flex: 1, fontSize: 12, fontWeight: 700, color: S.text }}>{rec.speakerName}</span>
                      <span style={{ fontSize: 11, color: S.muted }}>{rec.audioDuration.toFixed(1)}초</span>
                      <button
                        onClick={() => void handleToggleClip(rec.speakerId, rec.alertType, !rec.enabled)}
                        style={{ ...btnBase, padding: '5px 10px', fontSize: 11, background: rec.enabled ? '#E8F5E9' : '#F0F2F8', color: rec.enabled ? '#2E7D32' : S.sub }}
                      >{rec.enabled ? '사용 중' : '꺼짐'}</button>
                      <button
                        onClick={() => void handleDelete(rec.speakerId, rec.alertType)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: S.muted, display: 'flex', alignItems: 'center' }}
                      ><Trash2 size={14} /></button>
                    </div>
                  ))}
                </div>
              )}

              {canAddNew && (
                <button
                  onClick={() => { setActiveType(alertType); setStep('name') }}
                  style={{ ...btnBase, width: '100%', background: '#F0F4FF', color: S.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                ><Mic size={13} /> 새 목소리 추가</button>
              )}

              {isRecordingThis && step === 'name' && (
                <div style={{ marginTop: 10 }}>
                  <p style={{ margin: '0 0 8px', fontSize: 12, color: S.sub }}>녹음할 사람 이름을 입력해 주세요</p>
                  <input
                    type="text"
                    placeholder="예: 엄마, 아빠"
                    value={speakerName}
                    onChange={(e) => setSpeakerName(e.target.value)}
                    maxLength={20}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: 10, border: `1px solid ${S.border}`, fontSize: 13, marginBottom: 8 }}
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={cancelRecording} style={{ ...btnBase, flex: 1, background: '#F0F2F8', color: S.sub }}>취소</button>
                    <button
                      onClick={() => void startRecording(alertType)}
                      disabled={!speakerName.trim()}
                      style={{ ...btnBase, flex: 1, background: speakerName.trim() ? S.primary : S.border, color: speakerName.trim() ? '#fff' : S.muted }}
                    >녹음 시작</button>
                  </div>
                  {errorMsg && <p style={{ margin: '6px 0 0', fontSize: 11, color: S.red }}>{errorMsg}</p>}
                </div>
              )}

              {isRecordingThis && step === 'recording' && (
                <div style={{ marginTop: 10, textAlign: 'center' }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#FFE0E0', margin: '0 auto 6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Mic size={18} color={S.red} />
                  </div>
                  <p style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800, color: S.red }}>{recordingSec}초</p>
                  <p style={{ margin: '0 0 10px', fontSize: 11, color: S.sub }}>"{speakerName}" 녹음 중...</p>
                  <button onClick={stopRecording} style={{ ...btnBase, background: S.red, color: '#fff' }}>녹음 완료</button>
                </div>
              )}

              {isRecordingThis && step === 'preview' && (
                <div style={{ marginTop: 10 }}>
                  <p style={{ margin: '0 0 8px', fontSize: 12, color: S.sub }}>"{speakerName}" 녹음 완료 ({blobDuration}초)</p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={togglePreview} style={{ ...btnBase, flex: 1, background: '#F0F4FF', color: S.primary }}>
                      {previewPlaying ? '⏹ 정지' : '▶ 미리듣기'}
                    </button>
                    <button onClick={() => { if (blobUrl) URL.revokeObjectURL(blobUrl); setBlobUrl(null); setStep('name') }} style={{ ...btnBase, flex: 1, background: '#F0F2F8', color: S.sub }}>다시 녹음</button>
                    <button onClick={() => void saveRec()} style={{ ...btnBase, flex: 1, background: S.primary, color: '#fff' }}>저장</button>
                  </div>
                  {errorMsg && <p style={{ margin: '6px 0 0', fontSize: 11, color: S.red }}>{errorMsg}</p>}
                </div>
              )}

              {isRecordingThis && step === 'saving' && (
                <p style={{ margin: '10px 0 0', fontSize: 12, color: S.sub, textAlign: 'center' }}>저장 중...</p>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}

function BottomTab({ screen, setScreen }) {
  return <div style={{ background: S.white, borderTop: `1px solid ${S.border}`, display: 'flex' }}>{tabs.map(({ id, label, Icon }) => <button key={id} onClick={() => setScreen(id)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '10px 0 14px', background: 'none', border: 'none', cursor: 'pointer', color: screen === id ? S.primary : S.muted }}><Icon size={21} strokeWidth={screen === id ? 2.5 : 1.8} /><span style={{ fontSize: 9, fontWeight: screen === id ? 700 : 400 }}>{label}</span></button>)}</div>
}

export default function App() {
  const [screen, setScreen] = useState(0)
  const [screenHistory, setScreenHistory] = useState([])
  const [selectedFamilyId, setSelectedFamilyId] = useState(1)
  const [selectedChildId, setSelectedChildId] = useState(null)
  const [snapshot, setSnapshot] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [actions, setActions] = useState({ dailyApplied: false, contentApplied: false, postureApplied: false })
  const [localSettings, setLocalSettings] = useState({ maxHour: 2, notify: true, bedtime: true, camLinked: false, ageFilter: true, allowed: {} })

  async function refresh(nextFamilyId = selectedFamilyId, nextChildId = selectedChildId) {
    setLoading(true)
    setError(null)
    try {
      const payload = await fetchMobileDashboard(nextFamilyId, nextChildId)
      setSnapshot(payload)
      setSelectedFamilyId(payload.selectedFamilyId)
      setSelectedChildId(payload.selectedChildId)
    } catch (nextError) {
      setError(nextError.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void refresh(1, null) }, [])

  useEffect(() => {
    if (!snapshot) return
    setActions({ dailyApplied: false, contentApplied: false, postureApplied: false })
    setLocalSettings({
      maxHour: Math.max(0.5, Math.round((snapshot.settings.dailyLimitMinutes / 60) * 10) / 10),
      notify: snapshot.settings.notificationThreshold > 0,
      bedtime: snapshot.settings.bedtimeLockEnabled,
      camLinked: snapshot.settings.smartCam.linked,
      ageFilter: snapshot.settings.autoBlockEnabled,
      allowed: Object.fromEntries(snapshot.settings.allowedCategories.map((item) => [item.key, item.enabled])),
    })
  }, [snapshot?.selectedFamilyId, snapshot?.selectedChildId])

  function navigate(nextScreen) {
    setScreenHistory((prev) => [...prev, screen])
    setScreen(nextScreen)
  }

  function goBack() {
    setScreenHistory((prev) => {
      const next = [...prev]
      const prevScreen = next.pop() ?? 0
      setScreen(prevScreen)
      return next
    })
  }

  function switchTab(nextScreen) {
    setScreenHistory([])
    setScreen(nextScreen)
  }

  async function handleToggleAllowedCategory(categoryKey) {
    if (!snapshot?.selectedChildId) return

    const currentEnabled = Boolean(localSettings.allowed[categoryKey])
    const nextEnabled = !currentEnabled

    setLocalSettings((prev) => ({
      ...prev,
      allowed: {
        ...prev.allowed,
        [categoryKey]: nextEnabled,
      },
    }))

    try {
      await updateYoutubeCategoryFilter(snapshot.selectedChildId, categoryKey, nextEnabled)
      await refresh(selectedFamilyId, snapshot.selectedChildId)
    } catch (nextError) {
      setLocalSettings((prev) => ({
        ...prev,
        allowed: {
          ...prev.allowed,
          [categoryKey]: currentEnabled,
        },
      }))
      setError(nextError.message)
    }
  }

  const content = useMemo(() => {
    if (!snapshot) return null
    if (screen === 1) return <ScreenDaily snapshot={snapshot} state={actions} onApply={() => setActions((prev) => ({ ...prev, dailyApplied: true }))} />
    if (screen === 2) return <ScreenContent snapshot={snapshot} state={actions} onApply={() => setActions((prev) => ({ ...prev, contentApplied: true }))} />
    if (screen === 3) return <ScreenPosture snapshot={snapshot} state={actions} onApply={() => setActions((prev) => ({ ...prev, postureApplied: true }))} onNavigate={navigate} />
    if (screen === 4) return <ScreenSettings snapshot={snapshot} localSettings={localSettings} setLocalSettings={setLocalSettings} onToggleAllowedCategory={handleToggleAllowedCategory} />
    if (screen === 5) return <ScreenChildProfile snapshot={snapshot} selectedChildId={selectedChildId} onRefresh={() => refresh(selectedFamilyId, selectedChildId)} />
    if (screen === 6) return <ScreenVoiceGroup group="distance" familyId={selectedFamilyId} />
    if (screen === 7) return <ScreenVoiceGroup group="blink" familyId={selectedFamilyId} />
    if (screen === 8) return <ScreenVoiceGroup group="stretch" familyId={selectedFamilyId} />
    return <ScreenHome snapshot={snapshot} onNavigate={navigate} onSelectChild={(childId) => void refresh(selectedFamilyId, childId)} />
  }, [actions, localSettings, screen, selectedChildId, selectedFamilyId, snapshot])

  if (loading && !snapshot) return <LoadingScreen />
  if (error && !snapshot) return <ErrorScreen message={error} onRetry={() => void refresh()} />

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100dvh', padding: 12, boxSizing: 'border-box', background: '#E8EAF0', fontFamily: "-apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif" }}>
      <div style={{ width: 'min(375px, calc(100vw - 24px))', height: 'min(812px, calc(100dvh - 24px))', maxWidth: '100vw', maxHeight: '100dvh', background: S.bg, borderRadius: 'min(44px, 6vw)', overflow: 'hidden', boxShadow: '0 30px 80px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 126, height: 34, background: '#000', borderRadius: '0 0 20px 20px', zIndex: 10 }} />
        <div style={{ background: S.white, paddingTop: 4 }}><StatusBar /></div>
        <div style={{ background: S.white, borderBottom: `1px solid ${S.border}` }}><NavBar title={screenTitles[screen]} onBack={screen !== 0 ? goBack : null} onRight={screen === 0 ? { action: () => navigate(4), icon: <Settings size={20} /> } : screen !== 4 ? { action: () => { setScreenHistory([]); setScreen(0) }, icon: <Home size={20} /> } : null} /></div>
        {snapshot ? <SelectorStrip snapshot={snapshot} selectedFamilyId={selectedFamilyId} selectedChildId={selectedChildId} onFamilyChange={(familyId) => void refresh(familyId, null)} onChildChange={(childId) => void refresh(selectedFamilyId, childId)} /> : null}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', background: S.bg }}>{content}</div>
        {screen !== 4 && screen !== 5 && screen !== 6 && screen !== 7 && screen !== 8 ? <BottomTab screen={screen} setScreen={switchTab} /> : null}
      </div>
    </div>
  )
}
