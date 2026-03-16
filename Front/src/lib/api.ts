const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ''
const FASTAPI_BASE = import.meta.env.VITE_FASTAPI_BASE_URL ?? ''

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown
}

async function requestJson<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
    ...options,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || `Request failed: ${response.status}`)
  }

  return response.json() as Promise<T>
}

async function requestFastapiJson<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(`${FASTAPI_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
    ...options,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || `Request failed: ${response.status}`)
  }

  return response.json() as Promise<T>
}

export interface ComponentHealthResponse {
  status: string
  message: string
}

export interface RuntimeSettingsResponse {
  privacyConsent: boolean
  addictionMonitorEnabled: boolean
  updatedAt: string
}

export interface ChildWatchPolicyResponse {
  childId: number
  dailyLimitMinutes: number
  weekdayStartHour: number
  weekdayEndHour: number
  weekendStartHour: number
  weekendEndHour: number
  bedtimeLockEnabled: boolean
  bedtimeHour: number
  mondayLimitMinutes: number
  tuesdayLimitMinutes: number
  wednesdayLimitMinutes: number
  thursdayLimitMinutes: number
  fridayLimitMinutes: number
  saturdayLimitMinutes: number
  sundayLimitMinutes: number
  notificationThreshold: number
  autoBlockEnabled: boolean
  updatedAt: string
}

export interface ParentChildResponse {
  childId: number
  childName: string
  birthYear: number
  todayWatchMinutes: number
  viewingAllowedNow: boolean
  watchPolicy: ChildWatchPolicyResponse
}

export interface ParentAlertResponse {
  alertId: number
  viewingId: number
  childId: number
  childName: string
  alertType: string
  riskLevel: string
  messageText: string
  videoId: string
  watchTime: string
}

export interface ParentViewingHistoryResponse {
  viewingId: number
  childId: number
  childName: string
  videoId: string
  watchTime: string
  watchDuration: number
  latestAlertType: string | null
  latestRiskLevel: string | null
}

export interface ReportPeriodResponse {
  period: string
  compareTime: number
  countAlertType: number
  currentWatchMinutes: number
  watchDeltaMinutes: number
  watchDeltaPercent: number
  currentAlertCount: number
  alertDeltaCount: number
  watchSummary: string
  alertSummary: string
}

export interface MobileReportResponse {
  familyId: number
  familyName: string
  daily: ReportPeriodResponse
  weekly: ReportPeriodResponse
  monthly: ReportPeriodResponse
  generatedAt: string
}

export interface ParentOverviewResponse {
  familyId: number
  familyName: string
  todayViewingCount: number
  alertCount: number
  children: ParentChildResponse[]
  report: MobileReportResponse
  recentAlerts: ParentAlertResponse[]
}

export interface SystemHealthResponse {
  backend: ComponentHealthResponse
  database: ComponentHealthResponse
  mainModel: ComponentHealthResponse
  addictionModel: ComponentHealthResponse
  runtimeSettings: RuntimeSettingsResponse
}

export interface FamilySelectionPreferenceResponse {
  familyId: number
  childId: number | null
  updatedAt: string | null
}

export interface PlaybackDecisionResult {
  allowed: boolean
  message: string
  addictionRiskScore: number
  addictionRiskLevel: string
  behaviorSignals: string[]
}

export interface AddictionMonitorResponse {
  enabled: boolean
  consentGranted: boolean
  executed: boolean
  status: string
  message: string
}

export interface MonitorControlResponse {
  active: boolean
  status: string
  message: string
  childId: number | null
  sessionId: string | null
  analysisId: number | null
  videoUrl: string | null
  startedAt: string | null
}

export interface ChildMessageCardResponse {
  character: string | null
  layout: string | null
  trigger: string | null
  message: string | null
}

export interface MonitorLiveResponse {
  active: boolean
  status: string
  message: string
  childId: number | null
  sessionId: string | null
  capturedAt: string | null
  blinkBpm: number | null
  screenDistanceCm: number | null
  frontFacing: boolean | null
  poseStatus: string | null
  focusScore: number | null
  riskScore: number | null
  riskLevel: string | null
  childMessages: string[]
  childMessageCard: ChildMessageCardResponse | null
  errorMessage: string | null
}

export interface AnalysisResponse {
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
  playback: PlaybackDecisionResult
  addictionMonitor: AddictionMonitorResponse | null
  status: string
  errorMessage: string | null
  createdAt: string | null
}

export function getParentOverview(familyId: number) {
  return requestJson<ParentOverviewResponse>(`/api/parent/overview?familyId=${familyId}`)
}

export function getViewingHistory(familyId: number, childId?: number, limit = 8) {
  const params = new URLSearchParams({
    familyId: String(familyId),
    limit: String(limit),
  })
  if (childId) {
    params.set('childId', String(childId))
  }

  return requestJson<ParentViewingHistoryResponse[]>(`/api/parent/viewing-history?${params.toString()}`)
}

export function getRuntimeSettings() {
  return requestJson<RuntimeSettingsResponse>('/api/settings/runtime')
}

export function updateRuntimeSettings(payload: Partial<RuntimeSettingsResponse>) {
  return requestJson<RuntimeSettingsResponse>('/api/settings/runtime', {
    method: 'PATCH',
    body: payload,
  })
}

export function getSystemHealth() {
  return requestJson<SystemHealthResponse>('/api/system/health')
}

export function getAnalysisHistory(limit = 5) {
  return requestJson<AnalysisResponse[]>(`/api/analysis/history?limit=${limit}`)
}

export function analyzeYoutube(videoUrl: string, childId?: number | null) {
  return requestJson<AnalysisResponse>('/api/analysis/youtube', {
    method: 'POST',
    body: {
      videoUrl,
      childId: childId ?? null,
    },
  })
}

export function getSelection(familyId: number) {
  return requestJson<FamilySelectionPreferenceResponse>(`/api/parent/selection?familyId=${familyId}`)
}

export function updateSelection(familyId: number, childId: number | null) {
  return requestJson<FamilySelectionPreferenceResponse>('/api/parent/selection', {
    method: 'PATCH',
    body: {
      familyId,
      childId,
    },
  })
}

export function updateWatchPolicy(payload: Partial<ChildWatchPolicyResponse> & { childId: number }) {
  return requestJson<ChildWatchPolicyResponse>('/api/parent/watch-policy', {
    method: 'PATCH',
    body: payload,
  })
}

export function startAddictionMonitor(videoUrl: string, childId: number, analysisId?: number | null) {
  return requestFastapiJson<MonitorControlResponse>('/fastapi/monitor/start', {
    method: 'POST',
    body: {
      videoUrl,
      childId,
      analysisId: analysisId ?? null,
    },
  })
}

export function stopAddictionMonitor(childId?: number | null, sessionId?: string | null) {
  return requestFastapiJson<MonitorControlResponse>('/fastapi/monitor/stop', {
    method: 'POST',
    body: {
      childId: childId ?? null,
      sessionId: sessionId ?? null,
    },
  })
}

export function getActiveAddictionMonitor(childId?: number | null) {
  const params = new URLSearchParams()
  if (childId != null) {
    params.set('childId', String(childId))
  }

  const query = params.toString()
  return requestFastapiJson<MonitorControlResponse>(`/fastapi/monitor/active${query ? `?${query}` : ''}`)
}

export function getMonitorLive(childId: number) {
  return requestFastapiJson<MonitorLiveResponse>(`/fastapi/monitor/live?childId=${childId}`)
}
