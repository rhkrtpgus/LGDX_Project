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
  sessionId?: string | null
  telemetrySamples?: number | null
  finalRiskScore?: number | null
  finalRiskLevel?: string | null
  watchSeconds?: number | null
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
  currentWatchMinutes: number | null
  watchDeltaMinutes: number | null
  watchDeltaPercent: number | null
  currentAlertCount: number | null
  alertDeltaCount: number | null
  watchSummary: string | null
  alertSummary: string | null
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

function normalizeBaseUrl(value: string) {
  if (!value) {
    return ''
  }

  return value.endsWith('/') ? value.slice(0, -1) : value
}

const javaApiBaseUrl = normalizeBaseUrl(import.meta.env.VITE_JAVA_API_BASE_URL ?? '/api')
const fastapiApiBaseUrl = normalizeBaseUrl(import.meta.env.VITE_FASTAPI_API_BASE_URL ?? '/fastapi')

function buildUrl(baseUrl: string, path: string) {
  return `${baseUrl}${path}`
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
    let detail = ''

    try {
      const payload = (await response.json()) as { detail?: string }
      detail = payload.detail ? ` - ${payload.detail}` : ''
    } catch {
      detail = ''
    }

    throw new Error(`API request failed: ${response.status}${detail}`)
  }

  return response.json() as Promise<T>
}

export function fetchDashboardOverview() {
  return request<DashboardOverview>(buildUrl(javaApiBaseUrl, '/dashboard/overview'))
}

export function fetchAnalysisHistory(limit = 5) {
  return request<AnalysisResult[]>(buildUrl(fastapiApiBaseUrl, `/analysis/history?limit=${limit}`))
}

export function analyzeYoutubeVideo(
  videoUrl: string,
  childId?: number | null,
  signal?: AbortSignal,
) {
  return request<AnalysisResult>(buildUrl(fastapiApiBaseUrl, '/analysis/youtube'), {
    method: 'POST',
    signal,
    body: JSON.stringify({ videoUrl, childId }),
  })
}

export function fetchRuntimeSettings() {
  return request<RuntimeSettings>(buildUrl(javaApiBaseUrl, '/settings/runtime'))
}

export function updateRuntimeSettings(payload: Partial<RuntimeSettings>) {
  return request<RuntimeSettings>(buildUrl(javaApiBaseUrl, '/settings/runtime'), {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function fetchSystemHealth() {
  return request<SystemHealth>(buildUrl(fastapiApiBaseUrl, '/system/health'))
}

export function fetchReportFamilies() {
  return request<ReportFamily[]>(buildUrl(javaApiBaseUrl, '/report/families'))
}

export function fetchMobileReport(familyId: number) {
  return request<MobileReport>(buildUrl(javaApiBaseUrl, `/report/mobile?familyId=${familyId}`))
}

export function fetchParentOverview(familyId: number) {
  return request<ParentOverview>(buildUrl(javaApiBaseUrl, `/parent/overview?familyId=${familyId}`))
}

export function fetchParentChildren(familyId: number) {
  return request<ParentChild[]>(buildUrl(javaApiBaseUrl, `/parent/children?familyId=${familyId}`))
}

export function fetchChildWatchPolicy(childId: number) {
  return request<ChildWatchPolicy>(buildUrl(javaApiBaseUrl, `/parent/watch-policy?childId=${childId}`))
}

export function updateChildWatchPolicy(payload: Partial<ChildWatchPolicy> & { childId: number }) {
  return request<ChildWatchPolicy>(buildUrl(javaApiBaseUrl, '/parent/watch-policy'), {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function fetchParentAlerts(familyId: number, limit = 12) {
  return request<ParentAlert[]>(
    buildUrl(javaApiBaseUrl, `/parent/alerts?familyId=${familyId}&limit=${limit}`),
  )
}

export function fetchViewingHistory(familyId: number, childId?: number | null, limit = 12) {
  const params = new URLSearchParams({
    familyId: String(familyId),
    limit: String(limit),
  })

  if (childId) {
    params.set('childId', String(childId))
  }

  return request<ViewingHistoryItem[]>(
    buildUrl(javaApiBaseUrl, `/parent/viewing-history?${params.toString()}`),
  )
}

export function fetchAdminOverview() {
  return request<AdminOverview>(buildUrl(javaApiBaseUrl, '/admin/overview'))
}
