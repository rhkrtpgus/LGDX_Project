import type { ChildProfile } from '../data/profiles'
import type {
  ParentAlertResponse,
  ParentChildResponse,
  ParentViewingHistoryResponse,
} from './api'

const PROFILE_COLORS = ['#FFB3D1', '#90C8F0', '#8FD6C2', '#FFD16B', '#C2A2FF']
const PROFILE_GRADIENTS = [
  'linear-gradient(135deg, #FFF0F5 0%, #FFE4B5 100%)',
  'linear-gradient(135deg, #EAF4FF 0%, #D0F0E8 100%)',
  'linear-gradient(135deg, #EDFDF8 0%, #D9F7E8 100%)',
  'linear-gradient(135deg, #FFF8E0 0%, #FFE7A8 100%)',
  'linear-gradient(135deg, #F4EDFF 0%, #E0D4FF 100%)',
]

export function deriveAge(birthYear: number, nowYear = new Date().getFullYear()) {
  return Math.max(2, nowYear - birthYear + 1)
}

export function profileIdFromChildId(childId: number) {
  return `child-${childId}`
}

export function childIdFromProfileId(profileId: string) {
  if (!profileId.startsWith('child-')) {
    return null
  }

  const childId = Number(profileId.slice(6))
  return Number.isFinite(childId) ? childId : null
}

export function buildProfilesFromChildren(children: ParentChildResponse[]): ChildProfile[] {
  return children.map((child, index) => ({
    id: profileIdFromChildId(child.childId),
    name: child.childName,
    age: deriveAge(child.birthYear),
    color: PROFILE_COLORS[index % PROFILE_COLORS.length],
    bgGradient: PROFILE_GRADIENTS[index % PROFILE_GRADIENTS.length],
    timeLimit: child.watchPolicy.dailyLimitMinutes,
    interests: buildInterestTags(child),
  }))
}

function buildInterestTags(child: ParentChildResponse): string[] {
  const tags = ['habits']

  if (child.birthYear >= 2019) {
    tags.push('songs', 'speech')
  } else if (child.birthYear >= 2015) {
    tags.push('arts', 'speech')
  } else {
    tags.push('arts', 'habits')
  }

  return tags
}

export function summarizeAlert(alert?: ParentAlertResponse | null) {
  if (!alert) {
    return '최근 경고가 없습니다.'
  }

  return `${alert.childName}: ${alert.messageText}`
}

export function summarizeHistoryItem(item?: ParentViewingHistoryResponse | null) {
  if (!item) {
    return '아직 시청 기록이 없습니다.'
  }

  const risk = item.latestRiskLevel ? ` · ${item.latestRiskLevel}` : ''
  return `${item.childName} · ${item.videoId}${risk}`
}

export function formatMinutes(minutes?: number | null) {
  if (!minutes || minutes <= 0) {
    return '0분'
  }

  const hours = Math.floor(minutes / 60)
  const remain = minutes % 60
  if (hours <= 0) {
    return `${remain}분`
  }

  if (remain === 0) {
    return `${hours}시간`
  }

  return `${hours}시간 ${remain}분`
}

export function getRiskTone(riskLevel?: string | null) {
  switch ((riskLevel ?? '').toUpperCase()) {
    case 'HIGH':
      return '#ff6b6b'
    case 'MEDIUM':
      return '#ffb347'
    case 'LOW':
      return '#4dd4ac'
    default:
      return 'rgba(255,255,255,0.7)'
  }
}
