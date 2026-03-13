export type RecentAlert = {
  alertId: number
  alertType: string
  riskLevel: string
  messageText: string
  videoId: string
  watchTime: string
}

export type DashboardOverview = {
  userCount: number
  childCount: number
  viewingCount: number
  alertCount: number
  recentAlerts: RecentAlert[]
}

export type AddictionMonitorResult = {
  enabled: boolean
  consentGranted: boolean
  executed: boolean
  status: string
  message: string
}

export type RuntimeSettings = {
  privacyConsent: boolean
  addictionMonitorEnabled: boolean
  updatedAt: string | null
}

export type ComponentHealth = {
  status: string
  message: string
}

export type SystemHealth = {
  backend: ComponentHealth
  database: ComponentHealth
  mainModel: ComponentHealth
  addictionModel: ComponentHealth
  runtimeSettings: RuntimeSettings
}

export type PlaybackDecision = {
  allowed: boolean
  message: string
  addictionRiskScore: number
  addictionRiskLevel: string
  behaviorSignals: string[]
}

export type AnalysisResult = {
  analysisId: number | null
  inputUrl: string
  videoId: string | null
  title: string | null
  categoryNameKo: string | null
  durationSeconds: number | null
  shortForm: boolean
  blockedByCategory: boolean
  hasViolence: boolean
  violenceScore: number | null
  violencePositiveWindows: number | null
  hasNudity: boolean
  nudityMatchCount: number | null
  harmful: boolean
  harmfulReasons: string[]
  playback: PlaybackDecision
  addictionMonitor: AddictionMonitorResult | null
  status: string
  errorMessage: string | null
  createdAt: string | null
}

export type ReportPeriod = {
  period: string
  compareTime: number | null
  countAlertType: number | null
}

export type MobileReport = {
  familyId: number
  familyName: string
  daily: ReportPeriod | null
  weekly: ReportPeriod | null
  monthly: ReportPeriod | null
  generatedAt: string
}

export type ReportFamily = {
  familyId: number
  familyName: string
}

export type ChildWatchPolicy = {
  childId: number
  dailyLimitMinutes: number
  weekdayStartHour: number
  weekdayEndHour: number
  weekendStartHour: number
  weekendEndHour: number
  notificationThreshold: number
  autoBlockEnabled: boolean
  updatedAt: string | null
}

export type ParentChild = {
  childId: number
  childName: string
  birthYear: number
  todayWatchMinutes: number
  viewingAllowedNow: boolean
  watchPolicy: ChildWatchPolicy
}

export type ParentAlert = {
  alertId: number
  viewingId: number
  childId: number | null
  childName: string | null
  alertType: string
  riskLevel: string
  messageText: string
  videoId: string
  watchTime: string
}

export type ViewingHistoryItem = {
  viewingId: number
  childId: number | null
  childName: string | null
  videoId: string
  watchTime: string
  watchDuration: number
  latestAlertType: string | null
  latestRiskLevel: string | null
}

export type ParentOverview = {
  familyId: number
  familyName: string
  todayViewingCount: number
  alertCount: number
  children: ParentChild[]
  report: MobileReport
  recentAlerts: ParentAlert[]
}

export type AdminOverview = {
  familyCount: number
  childCount: number
  viewingCount: number
  alertCount: number
  policyCount: number
  highRiskAlertCount: number
  recentAlerts: ParentAlert[]
}

async function request<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  })

  if (!response.ok) {
    throw new Error(`API 요청 실패: ${response.status}`)
  }

  return response.json() as Promise<T>
}

export function fetchDashboardOverview() {
  return request<DashboardOverview>('/api/dashboard/overview')
}

export function fetchAnalysisHistory(limit = 5) {
  return request<AnalysisResult[]>(`/api/analysis/history?limit=${limit}`)
}

export function analyzeYoutubeVideo(videoUrl: string, childId?: number | null) {
  return request<AnalysisResult>('/api/analysis/youtube', {
    method: 'POST',
    body: JSON.stringify({ videoUrl, childId }),
  })
}

export function fetchRuntimeSettings() {
  return request<RuntimeSettings>('/api/settings/runtime')
}

export function updateRuntimeSettings(payload: Partial<RuntimeSettings>) {
  return request<RuntimeSettings>('/api/settings/runtime', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function fetchSystemHealth() {
  return request<SystemHealth>('/api/system/health')
}

export function fetchReportFamilies() {
  return request<ReportFamily[]>('/api/report/families')
}

export function fetchMobileReport(familyId: number) {
  return request<MobileReport>(`/api/report/mobile?familyId=${familyId}`)
}

export function fetchParentOverview(familyId: number) {
  return request<ParentOverview>(`/api/parent/overview?familyId=${familyId}`)
}

export function fetchParentChildren(familyId: number) {
  return request<ParentChild[]>(`/api/parent/children?familyId=${familyId}`)
}

export function fetchChildWatchPolicy(childId: number) {
  return request<ChildWatchPolicy>(`/api/parent/watch-policy?childId=${childId}`)
}

export function updateChildWatchPolicy(payload: Partial<ChildWatchPolicy> & { childId: number }) {
  return request<ChildWatchPolicy>('/api/parent/watch-policy', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function fetchParentAlerts(familyId: number, limit = 12) {
  return request<ParentAlert[]>(`/api/parent/alerts?familyId=${familyId}&limit=${limit}`)
}

export function fetchViewingHistory(familyId: number, childId?: number | null, limit = 12) {
  const params = new URLSearchParams({
    familyId: String(familyId),
    limit: String(limit),
  })

  if (childId) {
    params.set('childId', String(childId))
  }

  return request<ViewingHistoryItem[]>(`/api/parent/viewing-history?${params.toString()}`)
}

export function fetchAdminOverview() {
  return request<AdminOverview>('/api/admin/overview')
}
