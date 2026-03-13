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
  addictionMonitor: AddictionMonitorResult | null
  status: string
  errorMessage: string | null
  createdAt: string | null
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

export function analyzeYoutubeVideo(videoUrl: string) {
  return request<AnalysisResult>('/api/analysis/youtube', {
    method: 'POST',
    body: JSON.stringify({ videoUrl }),
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
