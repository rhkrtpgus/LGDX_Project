const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ''
const FASTAPI_BASE = import.meta.env.VITE_FASTAPI_BASE_URL ?? ''
const THINQ_API_BASE = import.meta.env.VITE_THINQ_API_BASE_URL ?? 'http://localhost:4175'

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown
}

function formatUserFacingErrorMessage(message: string, status?: number) {
  const normalized = message.trim()
  const lower = normalized.toLowerCase()

  if (!normalized) {
    return status ? `요청 처리 중 오류가 발생했어요. (HTTP ${status})` : '요청 처리 중 오류가 발생했어요.'
  }

  if (lower.includes('quotaexceeded') || lower.includes('youtube.quota')) {
    return '유튜브 검색 한도를 초과해서 지금은 실시간 검색 결과를 불러올 수 없어요. 잠시 후 다시 시도해 주세요.'
  }

  if (lower.includes('requested format is not available')) {
    return '이 영상은 현재 분석에 필요한 재생 형식을 바로 가져올 수 없어요. 다른 영상을 선택하거나 잠시 후 다시 시도해 주세요.'
  }

  if (lower.includes('drm protected')) {
    return '이 영상은 보호된 스트림이라서 자동 분석을 진행할 수 없어요. 재생은 가능하지만 안전 분석은 제한될 수 있어요.'
  }

  if (lower.includes('timed out') || lower.includes('timeout')) {
    return '모델 분석 시간이 오래 걸려서 응답을 받지 못했어요. 네트워크나 영상 상태를 확인한 뒤 다시 시도해 주세요.'
  }

  if (lower.includes('could not be opened') || lower.includes('camera')) {
    return '카메라를 열지 못해서 시청 케어를 시작하지 못했어요. 카메라 연결과 권한을 확인해 주세요.'
  }

  if (lower.includes('model pipeline failed')) {
    const cleaned = normalized.replace(/^model pipeline failed:\s*/i, '')
    return `영상 분석을 끝까지 진행하지 못했어요. 원인: ${cleaned}`
  }

  if (lower.includes('youtube catalog request failed')) {
    const cleaned = normalized.replace(/^youtube catalog request failed:\s*/i, '')
    return `유튜브 추천 영상을 불러오지 못했어요. 원인: ${cleaned}`
  }

  if (lower.includes('playback was blocked by harmful-content detection')) {
    return '유해 장면이 감지돼서 이 영상은 재생할 수 없어요.'
  }

  if (lower.includes('playback was blocked by the category policy')) {
    return '부모님이 허용한 카테고리가 아니라서 이 영상은 재생할 수 없어요.'
  }

  return normalized
}

async function readErrorMessage(response: Response) {
  const message = await response.text()

  if (!message) {
    return formatUserFacingErrorMessage('', response.status)
  }

  try {
    const parsed = JSON.parse(message) as { detail?: string; message?: string }
    return formatUserFacingErrorMessage(parsed.detail || parsed.message || message, response.status)
  }
  catch {
    return formatUserFacingErrorMessage(message, response.status)
  }
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
    throw new Error(await readErrorMessage(response))
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
    throw new Error(await readErrorMessage(response))
  }

  return response.json() as Promise<T>
}

async function requestAbsoluteJson<T>(url: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
    ...options,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })

  if (!response.ok) {
    throw new Error(await readErrorMessage(response))
  }

  return response.json() as Promise<T>
}

export interface ComponentHealthResponse {
  status: string
  message: string
}

export interface YoutubeVideoCatalogItem {
  videoId: string
  title: string
  channelTitle: string | null
  description: string | null
  thumbnailUrl: string | null
  publishedAt: string | null
}

export interface MonitorGuidanceSettings {
  posture: boolean
  blink: boolean
  distance: boolean
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

export interface YoutubeCategoryFilterResponse {
  childId: number
  categorySettings: Record<string, boolean>
  updatedAt: string | null
}

export interface ParentChildResponse {
  childId: number
  childName: string
  birthYear: number
  todayWatchMinutes: number
  viewingAllowedNow: boolean
  watchPolicy: ChildWatchPolicyResponse
}

export interface ChildCreateRequest {
  familyId: number
  childName: string
  birthYear: number
  dailyLimitMinutes: number
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

export interface PlaybackRecordResponse {
  viewingId: number | null
  playback: PlaybackDecisionResult
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
  videoId: string | null
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
  source?: 'fastapi' | 'spring'
}

export function getParentOverview(familyId: number) {
  return requestJson<ParentOverviewResponse>(`/api/parent/overview?familyId=${familyId}`)
}

export function createChildProfile(payload: ChildCreateRequest) {
  return requestJson<ParentChildResponse>('/api/parent/children', {
    method: 'POST',
    body: payload,
  })
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

export function searchYoutubeVideos(query: string, limit = 10) {
  const params = new URLSearchParams({
    q: query,
    limit: String(limit),
  })

  return requestFastapiJson<{ items: YoutubeVideoCatalogItem[] }>(`/fastapi/youtube/search?${params.toString()}`)
}

export function getRelatedYoutubeVideos(videoId: string, limit = 10) {
  const params = new URLSearchParams({
    videoId,
    limit: String(limit),
  })

  return requestFastapiJson<{ items: YoutubeVideoCatalogItem[] }>(`/fastapi/youtube/related?${params.toString()}`)
}

export function analyzeYoutube(
  videoId: string,
  childId?: number | null,
  options?: {
    saveResult?: boolean
    requestSource?: string
  },
) {
  const payload = {
    videoId,
    childId: childId ?? null,
    saveResult: options?.saveResult ?? true,
    requestSource: options?.requestSource ?? 'front',
  }

  const requestFastApiAnalysis = () => requestFastapiJson<AnalysisResponse>('/fastapi/analysis/youtube', {
    method: 'POST',
    body: payload,
  }).then((response) => ({ ...response, source: 'fastapi' as const }))

  return requestFastApiAnalysis()
    .catch(() => requestJson<AnalysisResponse>('/api/analysis/youtube', {
      method: 'POST',
      body: payload,
    }).then((response) => ({ ...response, source: 'spring' as const })))
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

export function getYoutubeCategoryFilter(childId: number) {
  return requestJson<YoutubeCategoryFilterResponse>(`/api/parent/youtube-category-filter?childId=${childId}`)
    .catch(() => requestAbsoluteJson<YoutubeCategoryFilterResponse>(`${THINQ_API_BASE}/api/youtube-category-filter?childId=${childId}`))
}

export function updateYoutubeCategoryFilter(childId: number, categoryId: string, enabled: boolean) {
  return requestJson<YoutubeCategoryFilterResponse>('/api/parent/youtube-category-filter', {
    method: 'PATCH',
    body: {
      childId,
      categoryId,
      enabled,
    },
  })
    .catch(() => requestAbsoluteJson<YoutubeCategoryFilterResponse>(`${THINQ_API_BASE}/api/youtube-category-filter`, {
      method: 'PATCH',
      body: {
        childId,
        categoryId,
        enabled,
      },
    }))
}

export function recordPlaybackFromAnalysis(payload: {
  childId: number
  videoId: string
  durationSeconds?: number | null
  harmful?: boolean
  harmfulReasons?: string[]
  shortForm?: boolean
}) {
  return requestJson<PlaybackRecordResponse>('/api/parent/playback-record', {
    method: 'POST',
    body: {
      childId: payload.childId,
      videoId: payload.videoId,
      durationSeconds: payload.durationSeconds ?? null,
      harmful: payload.harmful ?? false,
      harmfulReasons: payload.harmfulReasons ?? [],
      shortForm: payload.shortForm ?? false,
    },
  })
}

export function startAddictionMonitor(
  videoId: string,
  childId: number,
  analysisId?: number | null,
  guidanceSettings?: MonitorGuidanceSettings | null,
) {
  return requestFastapiJson<MonitorControlResponse>('/fastapi/monitor/start', {
    method: 'POST',
    body: {
      videoId,
      childId,
      analysisId: analysisId ?? null,
      blinkGuidanceEnabled: guidanceSettings?.blink ?? true,
      postureGuidanceEnabled: guidanceSettings?.posture ?? true,
      distanceGuidanceEnabled: guidanceSettings?.distance ?? true,
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
