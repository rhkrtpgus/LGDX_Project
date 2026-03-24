import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import './App.css'

import type { ScreenId } from './data/kidsProfileFlow'
import { AUTO_ADVANCE, AUTO_ADVANCE_DELAY_MS } from './data/kidsProfileFlow'
import { getThemeByAge, type ChildProfile } from './data/profiles'
import {
  DEFAULT_YOUTUBE_CATEGORY_SETTINGS,
  type YoutubeCategoryId,
  type YoutubeCategorySettings,
} from './data/youtubeExperience'

import {
  analyzeYoutube,
  createChildProfile,
  deleteChildProfile,
  getActiveAddictionMonitor,
  getAnalysisHistory,
  getMonitorLive,
  getParentOverview,
  getRuntimeSettings,
  getSelection,
  getSystemHealth,
  getYoutubeCategoryFilter,
  getViewingHistory,
  recordPlaybackFromAnalysis,
  startAddictionMonitor,
  stopAddictionMonitor,
  updateRuntimeSettings,
  updateSelection,
  updateYoutubeCategoryFilter,
  updateWatchPolicy,
  type AnalysisResponse,
  type MonitorControlResponse,
  type MonitorGuidanceSettings,
  type MonitorLiveResponse,
  type ParentAlertResponse,
  type ParentChildResponse,
  type ParentOverviewResponse,
  type ParentViewingHistoryResponse,
  type RuntimeSettingsResponse,
  type SystemHealthResponse,
  type VoiceAlertGroup,
  type VoiceAlertSettings,
  type VoiceAlertType,
  type VoiceRecordingMeta,
  getVoiceAlertSettings,
  getVoiceRecordingsByAlert,
  getVoiceRecordings,
  saveVoiceAlertSettings,
  toggleVoiceRecordingEnabled,
} from './lib/api'
import {
  buildProfilesFromChildren,
  childIdFromProfileId,
  profileIdFromChildId,
} from './lib/integration'

import { MainScreen } from './components/MainScreen'
import { ProfileTypeScreen } from './components/ProfileTypeScreen'
import { LoginScreen } from './components/LoginScreen'
import { ConnectedScreen } from './components/ConnectedScreen'
import { ContentEnvScreen } from './components/ContentEnvScreen'
import { WatchTimeScreen } from './components/WatchTimeScreen'
import { InterestScreen } from './components/InterestScreen'
import { SmartCamBeforeScreen } from './components/SmartCamBeforeScreen'
import { SmartCamConnectingScreen } from './components/SmartCamConnectingScreen'
import { SmartCamAfterScreen } from './components/SmartCamAfterScreen'
import { ThinQScreen } from './components/ThinQScreen'
import { CreationCompleteScreen } from './components/CreationCompleteScreen'
import { KidsMainScreen } from './components/KidsMainScreen'
import { MainSettingsLayout } from './components/MainSettingsLayout'
import { ViewingHistoryScreen } from './components/ViewingHistoryScreen'
import { ProfileCreateFormScreen } from './components/ProfileCreateFormScreen'
import { PinScreen } from './components/PinScreen'
import { YoutubeCareScreen } from './components/YoutubeCareScreen'
import { BearIcon } from './components/BearIcon'
import { ProfileSelectScreen } from './components/ProfileSelectScreen'
import { TvLiveScreen } from './components/TvLiveScreen'

export { getThemeByAge }
export type { ChildProfile }

export type ProfileMode = 'adult' | 'kids'

const FAMILY_ID = 1
const TOAST_DURATION_MS = 60_000
const BLINK_WARNING_THRESHOLD_BPM = 10
const BLINK_GUIDANCE_DURATION_MS = 15_000
const BUBBLE_COUNT_MIN = 5
const BUBBLE_COUNT_MAX = 7
const CARE_POPUP_DISPLAY_MS = 15_000
const PARENT_PIN_STORAGE_KEY = 'lgdx-parent-pin'
const YOUTUBE_CATEGORY_STORAGE_KEY = 'lgdx-youtube-category-settings'
const MONITOR_GUIDANCE_STORAGE_KEY = 'lgdx-monitor-guidance-settings'

type ToastTone = 'info' | 'warning' | 'danger' | 'success'

type AlertToast = {
  id: string
  title: string
  message: string
  tone: ToastTone
  sourceKey: string
  createdAt: number
  durationMs?: number
}

type BubbleItem = {
  id: number
  left: number      // % position from left (5–93)
  size: number      // px diameter
  delay: number     // s animation delay
  duration: number  // s rise duration
  drift: number     // px horizontal drift during rise
  rise: number      // px vertical travel
  state: 'rising' | 'popping'
}

type KidsCarePopup = {
  trigger: string
  title: string
  message: string
  showBubbles: boolean
}

type PendingPinAction =
  | { kind: 'navigate'; screen: ScreenId }
  | { kind: 'open-url'; url: string }

function loadStoredParentPin() {
  if (typeof window === 'undefined') {
    return '1234'
  }

  const saved = window.localStorage.getItem(PARENT_PIN_STORAGE_KEY)?.trim()
  return /^\d{4}$/.test(saved ?? '') ? saved! : '1234'
}

function formatRemainingMinutesLabel(minutes: number): string {
  if (minutes <= 0) {
    return '시청 시간이 모두 끝났어요'
  }

  if (minutes < 60) {
    return `${minutes}분 남았어요`
  }

  const hours = Math.floor(minutes / 60)
  const remain = minutes % 60
  if (remain === 0) {
    return `${hours}시간 남았어요`
  }

  return `${hours}시간 ${remain}분 남았어요`
}

function spawnBubbles(): BubbleItem[] {
  const count = BUBBLE_COUNT_MIN + Math.floor(Math.random() * (BUBBLE_COUNT_MAX - BUBBLE_COUNT_MIN + 1))
  return Array.from({ length: count }, (_, i) => ({
    id: Date.now() + i,
    left: 5 + Math.random() * 88,
    size: 40 + Math.floor(Math.random() * 54),
    delay: Math.random() * 1.2,
    duration: 3.5 + Math.random() * 2.5,
    drift: -45 + Math.floor(Math.random() * 90),
    rise: 280 + Math.floor(Math.random() * 180),
    state: 'rising' as const,
  }))
}

function buildKidsCarePopup(
  trigger: string | null | undefined,
  fallbackMessage: string | null | undefined,
  dailyLimitMinutes: number | null | undefined,
  todayWatchMinutes: number | null | undefined,
): KidsCarePopup | null {
  const normalizedTrigger = trigger ?? 'fallback'
  const remainingMinutes = Math.max((dailyLimitMinutes ?? 0) - (todayWatchMinutes ?? 0), 0)

  switch (normalizedTrigger) {
    case 'watch_time_30m':
    case 'watch_time_60m':
    case 'watch_time_90m':
      return {
        trigger: normalizedTrigger,
        title: '오늘 시청 시간을 확인해 볼까요?',
        message: `오늘 시청 시간은 ${formatRemainingMinutesLabel(remainingMinutes)}`,
        showBubbles: false,
      }
    case 'stretch':
      return {
        trigger: normalizedTrigger,
        title: '잠깐 몸을 움직여 볼까요?',
        message: '같은 자세가 오래 이어졌어요. 어깨를 펴고 가볍게 스트레칭해요.',
        showBubbles: false,
      }
    case 'blink_low':
      return {
        trigger: normalizedTrigger,
        title: '눈을 깜박여볼까요',
        message: '눈을 깜박이면 비눗방울이 사라져요.',
        showBubbles: true,
      }
    case 'blink_high':
      return {
        trigger: normalizedTrigger,
        title: '잠깐 먼 곳을 볼까요?',
        message: '눈이 많이 바빴어요. 화면에서 잠깐 눈을 떼고 쉬어가요.',
        showBubbles: false,
      }
    case 'head_pose':
      return {
        trigger: normalizedTrigger,
        title: '화면을 정면으로 봐 주세요',
        message: '고개를 바르게 하면 더 편안하게 볼 수 있어요.',
        showBubbles: false,
      }
    case 'distance_near':
      return {
        trigger: normalizedTrigger,
        title: '조금만 뒤로 가볼까요?',
        message: 'TV와 너무 가까워요. 조금만 뒤로 가면 눈이 더 편안해요.',
        showBubbles: false,
      }
    case 'distance_far':
      return {
        trigger: normalizedTrigger,
        title: '조금만 앞으로 와볼까요?',
        message: '너무 멀리서 보고 있어요. 편하게 볼 수 있는 자리로 와 주세요.',
        showBubbles: false,
      }
    default:
      if (!fallbackMessage) {
        return null
      }

      return {
        trigger: normalizedTrigger,
        title: '잠깐 확인해 볼까요?',
        message: fallbackMessage,
        showBubbles: false,
      }
  }
}

function normalizeWatchPolicy(
  policy: Partial<ParentChildResponse['watchPolicy']> | null | undefined,
): ParentChildResponse['watchPolicy'] {
  const dailyLimitMinutes = policy?.dailyLimitMinutes ?? 120
  const weekdayDefault = dailyLimitMinutes
  const weekendDefault = Math.min(dailyLimitMinutes + 20, 240)

  return {
    childId: policy?.childId ?? 0,
    dailyLimitMinutes,
    weekdayStartHour: policy?.weekdayStartHour ?? 7,
    weekdayEndHour: policy?.weekdayEndHour ?? 21,
    weekendStartHour: policy?.weekendStartHour ?? 8,
    weekendEndHour: policy?.weekendEndHour ?? 22,
    bedtimeLockEnabled: policy?.bedtimeLockEnabled ?? false,
    bedtimeHour: policy?.bedtimeHour ?? 21,
    mondayLimitMinutes: policy?.mondayLimitMinutes ?? weekdayDefault,
    tuesdayLimitMinutes: policy?.tuesdayLimitMinutes ?? weekdayDefault,
    wednesdayLimitMinutes: policy?.wednesdayLimitMinutes ?? weekdayDefault,
    thursdayLimitMinutes: policy?.thursdayLimitMinutes ?? weekdayDefault,
    fridayLimitMinutes: policy?.fridayLimitMinutes ?? weekdayDefault,
    saturdayLimitMinutes: policy?.saturdayLimitMinutes ?? weekendDefault,
    sundayLimitMinutes: policy?.sundayLimitMinutes ?? weekendDefault,
    notificationThreshold: policy?.notificationThreshold ?? 70,
    autoBlockEnabled: policy?.autoBlockEnabled ?? true,
    updatedAt: policy?.updatedAt ?? new Date().toISOString(),
  }
}

function normalizeChildResponse(child: ParentChildResponse): ParentChildResponse {
  const normalizedPolicy = normalizeWatchPolicy(child.watchPolicy)
  return {
    ...child,
    watchPolicy: {
      ...normalizedPolicy,
      childId: child.childId,
    },
  }
}

function buildDefaultYoutubeCategorySettings(): YoutubeCategorySettings {
  return { ...DEFAULT_YOUTUBE_CATEGORY_SETTINGS }
}

function normalizeYoutubeCategorySettings(
  categorySettings: Record<string, boolean> | null | undefined,
): YoutubeCategorySettings {
  return {
    ...DEFAULT_YOUTUBE_CATEGORY_SETTINGS,
    ...(categorySettings ?? {}),
  } as YoutubeCategorySettings
}

function loadStoredYoutubeCategorySettings() {
  if (typeof window === 'undefined') {
    return {} as Record<number, YoutubeCategorySettings>
  }

  try {
    const raw = window.localStorage.getItem(YOUTUBE_CATEGORY_STORAGE_KEY)
    if (!raw) {
      return {} as Record<number, YoutubeCategorySettings>
    }

    const parsed = JSON.parse(raw) as Record<string, Record<string, boolean>>
    return Object.fromEntries(
      Object.entries(parsed).map(([childId, settings]) => [
        Number(childId),
        normalizeYoutubeCategorySettings(settings),
      ]),
    ) as Record<number, YoutubeCategorySettings>
  } catch {
    return {} as Record<number, YoutubeCategorySettings>
  }
}

function persistYoutubeCategorySettings(settingsByChildId: Record<number, YoutubeCategorySettings>) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(YOUTUBE_CATEGORY_STORAGE_KEY, JSON.stringify(settingsByChildId))
}

function buildDefaultMonitorGuidanceSettings(): MonitorGuidanceSettings {
  return {
    posture: true,
    blink: true,
    distance: true,
  }
}

function normalizeMonitorGuidanceSettings(
  settings: Partial<MonitorGuidanceSettings> | null | undefined,
): MonitorGuidanceSettings {
  return {
    ...buildDefaultMonitorGuidanceSettings(),
    ...(settings ?? {}),
  }
}

function loadStoredMonitorGuidanceSettings() {
  if (typeof window === 'undefined') {
    return {} as Record<number, MonitorGuidanceSettings>
  }

  try {
    const raw = window.localStorage.getItem(MONITOR_GUIDANCE_STORAGE_KEY)
    if (!raw) {
      return {} as Record<number, MonitorGuidanceSettings>
    }

    const parsed = JSON.parse(raw) as Record<string, Partial<MonitorGuidanceSettings>>
    return Object.fromEntries(
      Object.entries(parsed).map(([childId, settings]) => [
        Number(childId),
        normalizeMonitorGuidanceSettings(settings),
      ]),
    ) as Record<number, MonitorGuidanceSettings>
  } catch {
    return {} as Record<number, MonitorGuidanceSettings>
  }
}

function persistMonitorGuidanceSettings(settingsByChildId: Record<number, MonitorGuidanceSettings>) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(MONITOR_GUIDANCE_STORAGE_KEY, JSON.stringify(settingsByChildId))
}

function deriveBirthYearFromAge(age: number, nowYear = new Date().getFullYear()) {
  return Math.max(2000, nowYear - age + 1)
}

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenId>('main')
  const [profiles, setProfiles] = useState<ChildProfile[]>([])
  const [activeProfileId, setActiveProfileId] = useState<string>('')
  const [sharedMode, setSharedMode] = useState(false)
  const [profileMode, setProfileMode] = useState<ProfileMode>('adult')
  const [parentPin, setParentPin] = useState(loadStoredParentPin)
  const [pendingPinAction, setPendingPinAction] = useState<PendingPinAction | null>(null)
  const [pinCancelScreen, setPinCancelScreen] = useState<ScreenId>('main')

  const [familyOverview, setFamilyOverview] = useState<ParentOverviewResponse | null>(null)
  const [children, setChildren] = useState<ParentChildResponse[]>([])
  const [viewingHistory, setViewingHistory] = useState<ParentViewingHistoryResponse[]>([])
  const [recentAlerts, setRecentAlerts] = useState<ParentAlertResponse[]>([])
  const [runtimeSettings, setRuntimeSettings] = useState<RuntimeSettingsResponse | null>(null)
  const [systemHealth, setSystemHealth] = useState<SystemHealthResponse | null>(null)
  const [analysisHistory, setAnalysisHistory] = useState<AnalysisResponse[]>([])
  const [latestAnalysis, setLatestAnalysis] = useState<AnalysisResponse | null>(null)
  const [analysisPending, setAnalysisPending] = useState(false)
  const [pendingKidsPlaybackVideoId, setPendingKidsPlaybackVideoId] = useState<string | null>(null)
  const [activeMonitor, setActiveMonitor] = useState<MonitorControlResponse | null>(null)
  const [monitorLive, setMonitorLive] = useState<MonitorLiveResponse | null>(null)
  const [monitorPending, setMonitorPending] = useState(false)
  const [serverLoading, setServerLoading] = useState(true)
  const [serverError, setServerError] = useState<string | null>(null)
  const [youtubeCategorySettingsByChildId, setYoutubeCategorySettingsByChildId] = useState<Record<number, YoutubeCategorySettings>>(loadStoredYoutubeCategorySettings)
  const [monitorGuidanceSettingsByChildId, setMonitorGuidanceSettingsByChildId] = useState<Record<number, MonitorGuidanceSettings>>(loadStoredMonitorGuidanceSettings)
  const [alertToasts, setAlertToasts] = useState<AlertToast[]>([])
  const [activeBubbles, setActiveBubbles] = useState<BubbleItem[]>([])
  const [carePopupVisible, setCarePopupVisible] = useState(false)
  const [carePopupExiting, setCarePopupExiting] = useState(false)
  const [demoPopupVisible, setDemoPopupVisible] = useState(false)
  const [demoPopupExiting, setDemoPopupExiting] = useState(false)
  const [demoPopupContent, setDemoPopupContent] = useState<{ title: string; message: string }>({ title: '', message: '' })
  const [demoBubbleVisible, setDemoBubbleVisible] = useState(false)
  const [demoBubbleExiting, setDemoBubbleExiting] = useState(false)
  const [demoBubbleBubbles, setDemoBubbleBubbles] = useState<BubbleItem[]>([])
  const [voiceAlertSettings, setVoiceAlertSettings] = useState<VoiceAlertSettings>({
    distanceEnabled: true,
    blinkEnabled: true,
    stretchEnabled: true,
    distanceActiveSpeakerId: null,
    blinkActiveSpeakerId: null,
    stretchActiveSpeakerId: null,
  })
  const [voiceRecordings, setVoiceRecordings] = useState<VoiceRecordingMeta[]>([])
  const seenToastKeysRef = useRef<Set<string>>(new Set())
  const countedToastMetricKeysRef = useRef<Set<string>>(new Set())
  const countedViewingMetricKeysRef = useRef<Set<string>>(new Set())
  const prevBlinkTotalRef = useRef<number | null>(null)
  const lowBlinkBubbleEpisodeShownRef = useRef(false)
  const lowBlinkToastEpisodeShownRef = useRef(false)
  const lowBlinkBubbleAutoHideTimerRef = useRef<number | null>(null)
  const carePopupAutoHideTimerRef = useRef<number | null>(null)
  const carePopupExitTimerRef = useRef<number | null>(null)
  const carePopupTriggerShownRef = useRef<string | null>(null)
  const prevVoiceTriggerRef = useRef<string | null>(null)
  const voiceAudioRef = useRef<HTMLAudioElement | null>(null)
  const demoPopupTimerRef = useRef<number | null>(null)
  const demoPopupExitTimerRef = useRef<number | null>(null)
  const demoBubbleTimerRef = useRef<number | null>(null)
  const demoBubbleExitTimerRef = useRef<number | null>(null)

  const navigate = useCallback((screen: ScreenId) => {
    setCurrentScreen(screen)
  }, [])

  const updateParentPin = useCallback((nextPin: string) => {
    setParentPin(nextPin)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(PARENT_PIN_STORAGE_KEY, nextPin)
    }
  }, [])

  const requestParentPin = useCallback((action: PendingPinAction, cancelScreen: ScreenId = currentScreen) => {
    setPendingPinAction(action)
    setPinCancelScreen(cancelScreen)
    setCurrentScreen('pin')
  }, [currentScreen])

  const handleGoHome = useCallback(() => {
    setProfileMode('adult')
    setCurrentScreen('main')
  }, [])

  const incrementViewingCount = useCallback((metricKey: string, mode: 'increment' | 'ensure' = 'increment', baseline = 0) => {
    if (countedViewingMetricKeysRef.current.has(metricKey)) {
      return
    }

    countedViewingMetricKeysRef.current.add(metricKey)
    setFamilyOverview((prev) => {
      if (!prev) {
        return prev
      }

      if (mode === 'ensure') {
        return {
          ...prev,
          todayViewingCount: Math.max(prev.todayViewingCount, baseline + 1),
        }
      }

      return {
        ...prev,
        todayViewingCount: prev.todayViewingCount + 1,
      }
    })
  }, [])

  const incrementAlertCount = useCallback((count: number) => {
    if (count <= 0) {
      return
    }

    setFamilyOverview((prev) => (
      prev
        ? { ...prev, alertCount: prev.alertCount + count }
        : prev
    ))
  }, [])

  const loadIntegratedData = useCallback(async () => {
    setServerLoading(true)
    setServerError(null)

    try {
      const [overview, history, runtime, health, modelHistory, selection] = await Promise.all([
        getParentOverview(FAMILY_ID),
        getViewingHistory(FAMILY_ID, undefined, 10),
        getRuntimeSettings(),
        getSystemHealth(),
        getAnalysisHistory(6),
        getSelection(FAMILY_ID).catch(() => ({ familyId: FAMILY_ID, childId: null, updatedAt: null })),
      ]) 

      const normalizedChildren = overview.children.map(normalizeChildResponse)

      const nextProfiles = buildProfilesFromChildren(normalizedChildren)

      const selectedProfileId = selection.childId
        ? profileIdFromChildId(selection.childId)
        : nextProfiles[0]?.id ?? ''

      setFamilyOverview({
        ...overview,
        children: normalizedChildren,
      })
      setChildren(normalizedChildren)
      setProfiles(nextProfiles)
      setViewingHistory(history)
      setRecentAlerts(overview.recentAlerts)
      setRuntimeSettings(runtime)
      setSystemHealth(health)
      setAnalysisHistory(modelHistory)
      setActiveProfileId(prev => nextProfiles.some(profile => profile.id === prev) ? prev : selectedProfileId)
    } catch (error) {
      const message = error instanceof Error ? error.message : '서비스 정보를 불러오지 못했어요.'
      setServerError(message)
    } finally {
      setServerLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadIntegratedData()
  }, [loadIntegratedData])

  useEffect(() => {
    void getVoiceAlertSettings(FAMILY_ID).then(setVoiceAlertSettings).catch(() => {})
    void getVoiceRecordings(FAMILY_ID).then(setVoiceRecordings).catch(() => {})
  }, [])

  useEffect(() => {
    const nextScreen = AUTO_ADVANCE[currentScreen]
    if (!nextScreen) {
      return
    }

    const timer = setTimeout(() => setCurrentScreen(nextScreen), AUTO_ADVANCE_DELAY_MS)
    return () => clearTimeout(timer)
  }, [currentScreen])

  useEffect(() => {
    if (currentScreen === 'kids-main') {
      setProfileMode('kids')
    } else if (currentScreen === 'main') {
      setProfileMode('adult')
    }
  }, [currentScreen])

  useEffect(() => {
    const childId = childIdFromProfileId(activeProfileId)
    if (childId == null || children.length === 0) {
      return
    }

    void updateSelection(FAMILY_ID, childId).catch(() => {
      // Ignore persistence failures and keep the UI responsive.
    })
  }, [activeProfileId, children.length])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setAlertToasts((prev) => prev.filter((toast) => Date.now() - toast.createdAt < (toast.durationMs ?? TOAST_DURATION_MS)))
    }, 1000)

    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => () => {
    if (carePopupAutoHideTimerRef.current != null) {
      window.clearTimeout(carePopupAutoHideTimerRef.current)
    }
    if (carePopupExitTimerRef.current != null) {
      window.clearTimeout(carePopupExitTimerRef.current)
    }
  }, [])

  const activeBackendChild = useMemo(
    () => children.find((child) => profileIdFromChildId(child.childId) === activeProfileId) ?? null,
    [activeProfileId, children],
  )

  const youtubeCategorySettings = useMemo(
    () => activeBackendChild?.childId != null
      ? youtubeCategorySettingsByChildId[activeBackendChild.childId] ?? buildDefaultYoutubeCategorySettings()
      : buildDefaultYoutubeCategorySettings(),
    [activeBackendChild?.childId, youtubeCategorySettingsByChildId],
  )

  const monitorGuidanceSettings = useMemo(
    () => activeBackendChild?.childId != null
      ? monitorGuidanceSettingsByChildId[activeBackendChild.childId] ?? buildDefaultMonitorGuidanceSettings()
      : buildDefaultMonitorGuidanceSettings(),
    [activeBackendChild?.childId, monitorGuidanceSettingsByChildId],
  )

  useEffect(() => {
    if (!activeBackendChild?.childId) {
      return
    }

    if (youtubeCategorySettingsByChildId[activeBackendChild.childId]) {
      return
    }

    void getYoutubeCategoryFilter(activeBackendChild.childId)
      .then((response) => {
        setYoutubeCategorySettingsByChildId((prev) => ({
          ...prev,
          [activeBackendChild.childId]: normalizeYoutubeCategorySettings(response.categorySettings),
        }))
      })
      .catch(() => {
        setYoutubeCategorySettingsByChildId((prev) => ({
          ...prev,
          [activeBackendChild.childId]: prev[activeBackendChild.childId] ?? buildDefaultYoutubeCategorySettings(),
        }))
      })
  }, [activeBackendChild?.childId, youtubeCategorySettingsByChildId])

  useEffect(() => {
    persistYoutubeCategorySettings(youtubeCategorySettingsByChildId)
  }, [youtubeCategorySettingsByChildId])

  useEffect(() => {
    persistMonitorGuidanceSettings(monitorGuidanceSettingsByChildId)
  }, [monitorGuidanceSettingsByChildId])

  const activeChildAlerts = useMemo(
    () => recentAlerts.filter((alert) => alert.childId === activeBackendChild?.childId),
    [activeBackendChild?.childId, recentAlerts],
  )

  const activeChildHistory = useMemo(
    () => viewingHistory.filter((item) => item.childId === activeBackendChild?.childId),
    [activeBackendChild?.childId, viewingHistory],
  )

  const activeChildAnalyses = useMemo(
    () => analysisHistory.filter((item) => item.inputUrl).slice(0, 4),
    [analysisHistory],
  )

  const lowBlinkGuidance = useMemo(() => {
    if (!monitorLive?.active || monitorLive.errorMessage || monitorLive.blinkBpm == null) {
      return null
    }

    if (monitorLive.blinkBpm >= BLINK_WARNING_THRESHOLD_BPM) {
      return null
    }

    return {
      title: '눈을 천천히 깜박여 주세요',
      message: `${Math.round(monitorLive.blinkBpm)}회/분으로 감지됐어요. 눈이 피곤할 수 있으니 천천히 한 번 깜박여 주세요.`,
      sourceKey: `blink-guidance:${activeBackendChild?.childId ?? 'unknown'}`,
    }
  }, [activeBackendChild?.childId, monitorLive])

  const kidsCarePopup = useMemo(() => {
    const card = monitorLive?.childMessageCard
    return buildKidsCarePopup(
      card?.trigger,
      card?.message ?? lowBlinkGuidance?.message,
      activeBackendChild?.watchPolicy.dailyLimitMinutes,
      activeBackendChild?.todayWatchMinutes,
    )
  }, [activeBackendChild?.todayWatchMinutes, activeBackendChild?.watchPolicy.dailyLimitMinutes, lowBlinkGuidance?.message, monitorLive?.childMessageCard])

  const showKidsCarePopup = profileMode === 'kids' && (currentScreen === 'kids-main' || currentScreen === 'youtube-care')

  // 버블 에피소드 시작 / 종료
  useEffect(() => {
    if (kidsCarePopup?.showBubbles) {
      if (lowBlinkBubbleEpisodeShownRef.current) return
      lowBlinkBubbleEpisodeShownRef.current = true
      prevBlinkTotalRef.current = null
      setActiveBubbles(spawnBubbles())
      lowBlinkBubbleAutoHideTimerRef.current = window.setTimeout(() => {
        lowBlinkBubbleAutoHideTimerRef.current = null
        setActiveBubbles([])
      }, CARE_POPUP_DISPLAY_MS)
      return
    }

    if (lowBlinkBubbleAutoHideTimerRef.current != null) {
      window.clearTimeout(lowBlinkBubbleAutoHideTimerRef.current)
      lowBlinkBubbleAutoHideTimerRef.current = null
    }
    lowBlinkBubbleEpisodeShownRef.current = false
    lowBlinkToastEpisodeShownRef.current = false
    prevBlinkTotalRef.current = null
    setActiveBubbles([])
  }, [kidsCarePopup?.showBubbles])

  // 깜박임 1회 감지 → 버블 1개 팝
  useEffect(() => {
    if (!kidsCarePopup?.showBubbles) return
    const total = monitorLive?.blinkTotal
    if (total == null) return

    if (prevBlinkTotalRef.current == null) {
      prevBlinkTotalRef.current = total
      return
    }

    const newBlinks = total - prevBlinkTotalRef.current
    prevBlinkTotalRef.current = total
    if (newBlinks <= 0) return

    setActiveBubbles((prev) => {
      let toPop = Math.min(newBlinks, prev.filter((b) => b.state === 'rising').length)
      return prev.map((b) => {
        if (b.state === 'rising' && toPop > 0) {
          toPop--
          return { ...b, state: 'popping' as const }
        }
        return b
      })
    })
  }, [monitorLive?.blinkTotal, kidsCarePopup?.showBubbles])

  // 데모 버블 전부 팝 → 팝업 자동 닫기
  useEffect(() => {
    if (!demoBubbleVisible || demoBubbleExiting || demoBubbleBubbles.length > 0) return
    if (demoBubbleTimerRef.current != null) { window.clearTimeout(demoBubbleTimerRef.current); demoBubbleTimerRef.current = null }
    setDemoBubbleExiting(true)
    demoBubbleExitTimerRef.current = window.setTimeout(() => {
      demoBubbleExitTimerRef.current = null
      setDemoBubbleVisible(false)
      setDemoBubbleExiting(false)
    }, 400)
  }, [demoBubbleBubbles.length, demoBubbleVisible, demoBubbleExiting])

  // 알림 발생 시 음성 자동 재생
  useEffect(() => {
    const trigger = kidsCarePopup?.trigger ?? null
    if (trigger === null) {
      prevVoiceTriggerRef.current = null
      return
    }
    if (trigger === prevVoiceTriggerRef.current) return
    prevVoiceTriggerRef.current = trigger

    const validTypes: VoiceAlertType[] = ['distance_near', 'distance_far', 'blink_high', 'blink_low', 'stretch']
    if (!validTypes.includes(trigger as VoiceAlertType)) return

    const alertType = trigger as VoiceAlertType
    const group: VoiceAlertGroup = (alertType === 'distance_near' || alertType === 'distance_far') ? 'distance'
      : (alertType === 'blink_high' || alertType === 'blink_low') ? 'blink'
      : 'stretch'

    const groupEnabled = group === 'distance' ? voiceAlertSettings.distanceEnabled
      : group === 'blink' ? voiceAlertSettings.blinkEnabled
      : voiceAlertSettings.stretchEnabled
    if (!groupEnabled) return

    const activeSpeakerId = group === 'distance' ? voiceAlertSettings.distanceActiveSpeakerId
      : group === 'blink' ? voiceAlertSettings.blinkActiveSpeakerId
      : voiceAlertSettings.stretchActiveSpeakerId

    void getVoiceRecordingsByAlert(FAMILY_ID, alertType).then((recs) => {
      const enabledRecs = recs.filter((r) => r.enabled)
      if (enabledRecs.length === 0) return
      const rec = activeSpeakerId
        ? (enabledRecs.find((r) => r.speakerId === activeSpeakerId) ?? enabledRecs[Math.floor(Math.random() * enabledRecs.length)])
        : enabledRecs[Math.floor(Math.random() * enabledRecs.length)]
      if (!rec.audioData) return
      if (voiceAudioRef.current) voiceAudioRef.current.pause()
      const audio = new Audio(rec.audioData)
      voiceAudioRef.current = audio
      audio.onended = () => { voiceAudioRef.current = null }
      void audio.play().catch(() => {})
    }).catch(() => {})
  }, [kidsCarePopup?.trigger, voiceAlertSettings])

  // Non-bubble care popup: 15s 자동 닫기 + 조건 해소 시 즉시 닫기
  useEffect(() => {
    if (kidsCarePopup?.showBubbles) {
      // 버블 팝업은 위 effect가 처리
      return
    }

    const trigger = kidsCarePopup?.trigger ?? null

    function startExit() {
      setCarePopupExiting(true)
      carePopupExitTimerRef.current = window.setTimeout(() => {
        setCarePopupVisible(false)
        setCarePopupExiting(false)
        carePopupExitTimerRef.current = null
      }, 400)
    }

    if (trigger === null) {
      // 조건 해소 → 즉시 퇴장 애니
      if (carePopupTriggerShownRef.current !== null) {
        carePopupTriggerShownRef.current = null
        if (carePopupAutoHideTimerRef.current != null) {
          window.clearTimeout(carePopupAutoHideTimerRef.current)
          carePopupAutoHideTimerRef.current = null
        }
        startExit()
      }
      return
    }

    if (trigger === carePopupTriggerShownRef.current) {
      // 같은 조건 → 타이머 유지
      return
    }

    // 새 조건 → 팝업 표시 + 15s 타이머 시작
    carePopupTriggerShownRef.current = trigger
    if (carePopupAutoHideTimerRef.current != null) {
      window.clearTimeout(carePopupAutoHideTimerRef.current)
    }
    if (carePopupExitTimerRef.current != null) {
      window.clearTimeout(carePopupExitTimerRef.current)
    }
    setCarePopupExiting(false)
    setCarePopupVisible(true)

    carePopupAutoHideTimerRef.current = window.setTimeout(() => {
      carePopupAutoHideTimerRef.current = null
      carePopupTriggerShownRef.current = null
      startExit()
    }, CARE_POPUP_DISPLAY_MS)
  }, [kidsCarePopup?.trigger, kidsCarePopup?.showBubbles])

  // 단축키: 1 → distance_near 데모 팝업 / Q → 모든 알림 즉시 닫기
  useEffect(() => {
    function dismissAll() {
      // 데모 팝업 닫기
      if (demoPopupTimerRef.current != null) { window.clearTimeout(demoPopupTimerRef.current); demoPopupTimerRef.current = null }
      if (demoPopupExitTimerRef.current != null) { window.clearTimeout(demoPopupExitTimerRef.current); demoPopupExitTimerRef.current = null }
      setDemoPopupExiting(true)
      window.setTimeout(() => { setDemoPopupVisible(false); setDemoPopupExiting(false) }, 400)

      // 케어 팝업 닫기
      if (carePopupAutoHideTimerRef.current != null) { window.clearTimeout(carePopupAutoHideTimerRef.current); carePopupAutoHideTimerRef.current = null }
      if (carePopupExitTimerRef.current != null) { window.clearTimeout(carePopupExitTimerRef.current); carePopupExitTimerRef.current = null }
      carePopupTriggerShownRef.current = null
      setCarePopupExiting(true)
      window.setTimeout(() => { setCarePopupVisible(false); setCarePopupExiting(false) }, 400)

      // 버블 팝업 닫기
      if (lowBlinkBubbleAutoHideTimerRef.current != null) { window.clearTimeout(lowBlinkBubbleAutoHideTimerRef.current); lowBlinkBubbleAutoHideTimerRef.current = null }
      setActiveBubbles([])

      // 데모 버블 팝업 닫기
      if (demoBubbleTimerRef.current != null) { window.clearTimeout(demoBubbleTimerRef.current); demoBubbleTimerRef.current = null }
      if (demoBubbleExitTimerRef.current != null) { window.clearTimeout(demoBubbleExitTimerRef.current); demoBubbleExitTimerRef.current = null }
      setDemoBubbleExiting(true)
      window.setTimeout(() => { setDemoBubbleVisible(false); setDemoBubbleExiting(false); setDemoBubbleBubbles([]) }, 400)

      // 토스트 알림 전체 닫기
      setAlertToasts([])
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.repeat) return

      if (e.code === 'Digit1' || e.code === 'Digit3') {
        if (demoPopupTimerRef.current != null) window.clearTimeout(demoPopupTimerRef.current)
        if (demoPopupExitTimerRef.current != null) window.clearTimeout(demoPopupExitTimerRef.current)

        setDemoPopupContent(
          e.code === 'Digit1'
            ? { title: '조금만 뒤로 가볼까요?', message: 'TV와 너무 가까워요. 조금만 뒤로 가면 눈이 더 편안해요.' }
            : { title: '잠깐 몸을 움직여 볼까요?', message: '같은 자세가 오래 이어졌어요. 어깨를 펴고 가볍게 스트레칭해요.' }
        )
        setDemoPopupExiting(false)
        setDemoPopupVisible(true)

        demoPopupTimerRef.current = window.setTimeout(() => {
          demoPopupTimerRef.current = null
          setDemoPopupExiting(true)
          demoPopupExitTimerRef.current = window.setTimeout(() => {
            demoPopupExitTimerRef.current = null
            setDemoPopupVisible(false)
            setDemoPopupExiting(false)
          }, 400)
        }, CARE_POPUP_DISPLAY_MS)
        return
      }

      if (e.code === 'Digit2') {
        if (demoBubbleTimerRef.current != null) window.clearTimeout(demoBubbleTimerRef.current)
        if (demoBubbleExitTimerRef.current != null) window.clearTimeout(demoBubbleExitTimerRef.current)

        setDemoBubbleExiting(false)
        setDemoBubbleBubbles(spawnBubbles())
        setDemoBubbleVisible(true)

        demoBubbleTimerRef.current = window.setTimeout(() => {
          demoBubbleTimerRef.current = null
          setDemoBubbleExiting(true)
          demoBubbleExitTimerRef.current = window.setTimeout(() => {
            demoBubbleExitTimerRef.current = null
            setDemoBubbleVisible(false)
            setDemoBubbleExiting(false)
            setDemoBubbleBubbles([])
          }, 400)
        }, CARE_POPUP_DISPLAY_MS)
        return
      }

      if (e.code === 'KeyQ') {
        dismissAll()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    if (!activeBackendChild?.childId || !activeMonitor?.active) {
      return
    }

    const timer = window.setInterval(() => {
      void getActiveAddictionMonitor(activeBackendChild.childId)
        .then((monitor) => {
          setActiveMonitor((prev) => {
            if (!prev) {
              return monitor
            }
            return monitor
          })
        })
        .catch(() => {
          // Ignore polling errors and keep the latest visible state.
        })
    }, 5000)

    return () => window.clearInterval(timer)
  }, [activeBackendChild?.childId, activeMonitor?.active])

  useEffect(() => {
    if (!activeBackendChild?.childId) {
      setActiveMonitor(null)
      setMonitorLive(null)
      return
    }

    void getActiveAddictionMonitor(activeBackendChild.childId)
      .then((monitor) => {
        setActiveMonitor(monitor.active ? monitor : null)
      })
      .catch(() => {
        setActiveMonitor(null)
      })
  }, [activeBackendChild?.childId])

  useEffect(() => {
    if (!activeBackendChild?.childId) {
      setMonitorLive(null)
      return
    }

    const loadLive = () => {
      void getMonitorLive(activeBackendChild.childId)
        .then((live) => {
          setMonitorLive(live)
        })
        .catch(() => {
          setMonitorLive(null)
        })
    }

    loadLive()

    const timer = window.setInterval(loadLive, 3000)
    return () => window.clearInterval(timer)
  }, [activeBackendChild?.childId])

  const handleSelectKidsProfile = useCallback((profileId: string) => {
    setActiveProfileId(profileId)
    setSharedMode(false)
    setProfileMode('kids')
  }, [])

  const updateTimeLimit = useCallback(async (profileId: string, minutes: number) => {
    setProfiles((prev) => prev.map((profile) => (
      profile.id === profileId ? { ...profile, timeLimit: minutes } : profile
    )))

    const childId = childIdFromProfileId(profileId)
    const targetChild = children.find((child) => child.childId === childId)
    if (!targetChild) {
      return
    }

    try {
      const nextPolicy = normalizeWatchPolicy(await updateWatchPolicy({
        ...targetChild.watchPolicy,
        childId: targetChild.childId,
        dailyLimitMinutes: minutes,
      }))

      setChildren((prev) => prev.map((child) => (
        child.childId === targetChild.childId
          ? { ...child, watchPolicy: nextPolicy }
          : child
      )))
    } catch (error) {
      const message = error instanceof Error ? error.message : '시청 시간 제한 저장에 실패했어요.'
      setServerError(message)
    }
  }, [children])

  const handleAutoBlockToggle = useCallback(async (childId: number, enabled: boolean) => {
    const targetChild = children.find((child) => child.childId === childId)
    if (!targetChild) {
      return
    }

    try {
      const nextPolicy = normalizeWatchPolicy(await updateWatchPolicy({
        ...targetChild.watchPolicy,
        childId: targetChild.childId,
        autoBlockEnabled: enabled,
      }))

      setChildren((prev) => prev.map((child) => (
        child.childId === targetChild.childId
          ? { ...child, watchPolicy: nextPolicy }
          : child
      )))
    } catch (error) {
      const message = error instanceof Error ? error.message : '가족 보호 설정 변경에 실패했어요.'
      setServerError(message)
    }
  }, [children])

  const handleWatchPolicyChange = useCallback(async (
    childId: number,
    patch: Partial<ParentChildResponse['watchPolicy']>,
  ) => {
    const targetChild = children.find((child) => child.childId === childId)
    if (!targetChild) {
      return
    }

    try {
      const nextPolicy = normalizeWatchPolicy(await updateWatchPolicy({
        ...targetChild.watchPolicy,
        ...patch,
        childId: targetChild.childId,
      }))

      setChildren((prev) => prev.map((child) => (
        child.childId === targetChild.childId
          ? { ...child, watchPolicy: nextPolicy }
          : child
      )))
      setProfiles((prev) => prev.map((profile) => (
        profile.id === `child-${targetChild.childId}`
          ? { ...profile, timeLimit: nextPolicy.dailyLimitMinutes }
          : profile
      )))
    } catch (error) {
      const message = error instanceof Error ? error.message : '가족 보호 설정 저장에 실패했어요.'
      setServerError(message)
    }
  }, [children])

  const addProfile = useCallback(async (
    newProfile: ChildProfile,
    options?: {
      useCam?: boolean | null
    },
  ) => {
    try {
      const createdChild = await createChildProfile({
        familyId: FAMILY_ID,
        childName: newProfile.name,
        birthYear: deriveBirthYearFromAge(newProfile.age),
        dailyLimitMinutes: newProfile.timeLimit,
      })

      setMonitorGuidanceSettingsByChildId((prev) => ({
        ...prev,
        [createdChild.childId]: options?.useCam === false
          ? { posture: false, blink: false, distance: false }
          : buildDefaultMonitorGuidanceSettings(),
      }))

      await loadIntegratedData()

      const newProfileId = profileIdFromChildId(createdChild.childId)
      // loadIntegratedData가 백엔드 데이터로 프로필을 재구성할 때
      // 새 아이가 즉시 포함되지 않을 수 있으므로 upsert로 보장합니다
      setChildren((prev) => {
        const exists = prev.some((c) => c.childId === createdChild.childId)
        if (exists) return prev
        return [...prev, normalizeChildResponse(createdChild)]
      })

      setProfiles((prev) => {
        const exists = prev.some((p) => p.id === newProfileId)
        const finalProfile: ChildProfile = {
          id: newProfileId,
          name: newProfile.name,
          age: newProfile.age,
          color: newProfile.color,
          bgGradient: newProfile.bgGradient,
          timeLimit: newProfile.timeLimit,
          interests: newProfile.interests,
        }
        if (exists) {
          return prev.map((p) =>
            p.id === newProfileId
              ? { ...p, color: newProfile.color, bgGradient: newProfile.bgGradient, interests: newProfile.interests }
              : p
          )
        }
        return [...prev, finalProfile]
      })

      setActiveProfileId(newProfileId)
      setProfileMode('kids')
    } catch (error) {
      const message = error instanceof Error ? error.message : '새 자녀 프로필 생성에 실패했어요.'
      setServerError(message)
      throw error
    }
  }, [loadIntegratedData])

  const handleDeleteProfile = useCallback(async (profileId: string) => {
    const childId = childIdFromProfileId(profileId)
    if (childId == null) return

    await deleteChildProfile(childId)

    setChildren(prev => prev.filter(c => c.childId !== childId))
    setProfiles(prev => prev.filter(p => p.id !== profileId))
    setActiveProfileId(prev => {
      if (prev !== profileId) return prev
      return profiles.find(p => p.id !== profileId)?.id ?? ''
    })
  }, [profiles])

  const handlePlayInKidsMain = useCallback((videoId: string) => {
    const existing = analysisHistory.find((a) => a.videoId === videoId) ?? null
    if (existing) setLatestAnalysis(existing)
    setPendingKidsPlaybackVideoId(videoId)
    navigate('kids-main')
  }, [analysisHistory, navigate])

  const handleAnalyzeYoutube = useCallback(async (videoId: string) => {
    if (!activeBackendChild?.childId) {
      setServerError('유튜브 확인을 시작하려면 자녀 프로필을 먼저 선택해 주세요.')
      return
    }

    setAnalysisPending(true)
    const baselineViewingCount = familyOverview?.todayViewingCount ?? 0

    try {
      if (!runtimeSettings?.privacyConsent || !runtimeSettings?.addictionMonitorEnabled) {
        const nextSettings = await updateRuntimeSettings({
          privacyConsent: true,
          addictionMonitorEnabled: true,
        })
        setRuntimeSettings(nextSettings)
        setSystemHealth((prev) => prev ? { ...prev, runtimeSettings: nextSettings } : prev)
      }

      if (!activeBackendChild.watchPolicy.autoBlockEnabled) {
        const nextPolicy = normalizeWatchPolicy(await updateWatchPolicy({
          ...activeBackendChild.watchPolicy,
          childId: activeBackendChild.childId,
          autoBlockEnabled: true,
        }))

        setChildren((prev) => prev.map((child) => (
          child.childId === activeBackendChild.childId
            ? { ...child, watchPolicy: nextPolicy }
            : child
        )))
      }

      const result = await analyzeYoutube(videoId, activeBackendChild.childId)
      let syncedResult = result

      if (result.source !== 'spring') {
        try {
          const recordedPlayback = await recordPlaybackFromAnalysis({
            childId: activeBackendChild.childId,
            videoId: result.videoId ?? videoId,
            durationSeconds: result.durationSeconds,
            harmful: result.harmful,
            harmfulReasons: result.harmfulReasons,
            shortForm: result.shortForm,
          })
          syncedResult = {
            ...result,
            playback: recordedPlayback.playback,
          }
          await loadIntegratedData()
        } catch (recordError) {
          const message = recordError instanceof Error ? recordError.message : '시청 기록 저장에 실패했어요.'
          setServerError(message)
        }
      } else {
        await loadIntegratedData()
      }

      setLatestAnalysis(syncedResult)
      setAnalysisHistory((prev) => [syncedResult, ...prev].slice(0, 8))

      if (syncedResult.playback.allowed) {
        incrementViewingCount(
          `analysis:${syncedResult.analysisId ?? videoId}:${activeBackendChild.childId}`,
          'ensure',
          baselineViewingCount,
        )
        const monitor = await startAddictionMonitor(
          videoId,
          activeBackendChild.childId,
          syncedResult.analysisId ?? null,
          monitorGuidanceSettings,
        )
        setActiveMonitor(monitor)
      } else {
        setActiveMonitor(null)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '영상 확인에 실패했어요.'
      setServerError(message)
    } finally {
      setAnalysisPending(false)
    }
  }, [activeBackendChild, familyOverview?.todayViewingCount, incrementViewingCount, loadIntegratedData, monitorGuidanceSettings, runtimeSettings])

  const handleStopAddictionMonitor = useCallback(async () => {
    if (!activeBackendChild?.childId && !activeMonitor?.sessionId) {
      return
    }

    setMonitorPending(true)

    try {
      const result = await stopAddictionMonitor(
        activeBackendChild?.childId ?? null,
        activeMonitor?.sessionId ?? null,
      )
      setActiveMonitor(result)
    } catch (error) {
      const message = error instanceof Error ? error.message : '카메라 종료 요청에 실패했어요.'
      setServerError(message)
    } finally {
      setMonitorPending(false)
    }
  }, [activeBackendChild?.childId, activeMonitor?.sessionId])

  const handleRuntimeSettingsChange = useCallback(async (patch: Partial<RuntimeSettingsResponse>) => {
    try {
      const nextSettings = await updateRuntimeSettings(patch)
      setRuntimeSettings(nextSettings)
      setSystemHealth((prev) => prev ? { ...prev, runtimeSettings: nextSettings } : prev)
    } catch (error) {
      const message = error instanceof Error ? error.message : '보호 설정 저장에 실패했어요.'
      setServerError(message)
    }
  }, [])

  const handleYoutubeCategoryChange = useCallback((categoryId: YoutubeCategoryId, enabled: boolean) => {
    if (!activeBackendChild?.childId) {
      return
    }

    const childId = activeBackendChild.childId
    const previousSettings = youtubeCategorySettingsByChildId[childId] ?? buildDefaultYoutubeCategorySettings()
    const nextSettings = {
      ...previousSettings,
      [categoryId]: enabled,
    }

    setYoutubeCategorySettingsByChildId((prev) => ({
      ...prev,
      [childId]: nextSettings,
    }))

    void updateYoutubeCategoryFilter(childId, categoryId, enabled)
      .then((response) => {
        setYoutubeCategorySettingsByChildId((prev) => ({
          ...prev,
          [childId]: normalizeYoutubeCategorySettings(response.categorySettings),
        }))
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : 'youtube category update failed'
        if (message.includes('404')) {
          setServerError('YouTube 카테고리 설정은 현재 이 PC에서만 저장되어 적용됩니다.')
          return
        }
        setYoutubeCategorySettingsByChildId((prev) => ({
          ...prev,
          [childId]: previousSettings,
        }))
        setServerError(message)
      })
  }, [activeBackendChild?.childId, youtubeCategorySettingsByChildId])

  const handleMonitorGuidanceSettingsChange = useCallback((
    childId: number,
    patch: Partial<MonitorGuidanceSettings>,
  ) => {
    setMonitorGuidanceSettingsByChildId((prev) => ({
      ...prev,
      [childId]: normalizeMonitorGuidanceSettings({
        ...(prev[childId] ?? buildDefaultMonitorGuidanceSettings()),
        ...patch,
      }),
    }))
  }, [])

  const handleToggleVoiceGroup = useCallback(async (group: VoiceAlertGroup, enabled: boolean) => {
    const key = (`${group}Enabled`) as keyof VoiceAlertSettings
    const next = { ...voiceAlertSettings, [key]: enabled }
    setVoiceAlertSettings(next)
    await saveVoiceAlertSettings({ familyId: FAMILY_ID, ...next }).catch(() => {})
  }, [voiceAlertSettings])

  const handleSetGroupActiveSpeaker = useCallback(async (group: VoiceAlertGroup, speakerId: string | null) => {
    const key = (`${group}ActiveSpeakerId`) as keyof VoiceAlertSettings
    const next = { ...voiceAlertSettings, [key]: speakerId }
    setVoiceAlertSettings(next)
    await saveVoiceAlertSettings({ familyId: FAMILY_ID, ...next }).catch(() => {})
  }, [voiceAlertSettings])

  const handleVoiceRecordingsChanged = useCallback(() => {
    void getVoiceRecordings(FAMILY_ID).then(setVoiceRecordings).catch(() => {})
  }, [])

  const handleToggleClipEnabled = useCallback(async (speakerId: string, alertType: VoiceAlertType, enabled: boolean) => {
    await toggleVoiceRecordingEnabled(FAMILY_ID, speakerId, alertType, enabled)
    handleVoiceRecordingsChanged()
  }, [handleVoiceRecordingsChanged])

  const activeKidsProfile = profiles.find((profile) => profile.id === activeProfileId)
  const kidsTheme = activeKidsProfile ? getThemeByAge(activeKidsProfile.age) : null
  const familyName = familyOverview?.familyName ?? '우리 가족'
  const settingsInitialSection = currentScreen === 'settings-family'
    ? 'family'
    : currentScreen === 'settings-youtube' || currentScreen === 'settings-child'
      ? 'youtube'
      : currentScreen === 'settings-history'
        ? 'history'
        : 'network'
  const themeVars: CSSProperties = profileMode === 'kids' && kidsTheme
    ? {
        '--theme-accent': kidsTheme.accent,
        '--theme-bg': kidsTheme.bgColor,
        '--theme-text': kidsTheme.textColor,
      } as CSSProperties
    : {}

  const activeToastSourceKeys = useMemo(() => {
    const keys = new Set<string>()

    recentAlerts.slice(0, 3).forEach((alert) => {
      keys.add(`recent-alert:${alert.alertId}`)
    })

    if (serverError) {
      keys.add(`server-error:${serverError}`)
    }

    if (latestAnalysis) {
      const mappedCategoryId = latestAnalysis.categoryNameKo
        ? mapCategoryNameToId(latestAnalysis.categoryNameKo)
        : null
      const categoryBlocked = mappedCategoryId
        ? !youtubeCategorySettings[mappedCategoryId]
        : false
      const riskTone = latestAnalysis.playback.addictionRiskLevel?.toUpperCase()
      if (!latestAnalysis.playback.allowed || categoryBlocked || riskTone === 'HIGH' || riskTone === 'MEDIUM') {
        keys.add(`analysis:${latestAnalysis.analysisId ?? latestAnalysis.inputUrl}:${latestAnalysis.status}`)
      }
    }

    return keys
  }, [latestAnalysis, recentAlerts, serverError, youtubeCategorySettings])

  useEffect(() => {
    setAlertToasts((prev) => prev.filter((toast) => activeToastSourceKeys.has(toast.sourceKey)))

    seenToastKeysRef.current.forEach((key) => {
      if (!activeToastSourceKeys.has(key)) {
        seenToastKeysRef.current.delete(key)
      }
    })

    const nextToasts: AlertToast[] = []

    recentAlerts.slice(0, 2).forEach((alert) => {
      const sourceKey = `recent-alert:${alert.alertId}`
      if (seenToastKeysRef.current.has(sourceKey)) {
        return
      }

      seenToastKeysRef.current.add(sourceKey)
      nextToasts.push({
        id: `toast-${sourceKey}`,
        sourceKey,
        title: `${alert.childName} 보호 알림`,
        message: alert.messageText,
        tone: mapRiskToToastTone(alert.riskLevel),
        createdAt: Date.now(),
      })
    })

    if (serverError) {
      const sourceKey = `server-error:${serverError}`
      if (!seenToastKeysRef.current.has(sourceKey)) {
        seenToastKeysRef.current.add(sourceKey)
        nextToasts.push({
          id: `toast-${sourceKey}`,
          sourceKey,
          title: '서비스 알림',
          message: serverError,
          tone: 'danger',
          createdAt: Date.now(),
        })
      }
    }

    if (latestAnalysis) {
      const mappedCategoryId = latestAnalysis.categoryNameKo
        ? mapCategoryNameToId(latestAnalysis.categoryNameKo)
        : null
      const categoryBlocked = mappedCategoryId
        ? !youtubeCategorySettings[mappedCategoryId]
        : false
      const riskTone = latestAnalysis.playback.addictionRiskLevel?.toUpperCase()
      const shouldShowAnalysisAlert =
        !latestAnalysis.playback.allowed || categoryBlocked || riskTone === 'HIGH' || riskTone === 'MEDIUM'

      if (shouldShowAnalysisAlert) {
        const sourceKey = `analysis:${latestAnalysis.analysisId ?? latestAnalysis.inputUrl}:${latestAnalysis.status}`
        if (!seenToastKeysRef.current.has(sourceKey)) {
          seenToastKeysRef.current.add(sourceKey)
          nextToasts.push({
            id: `toast-${sourceKey}`,
            sourceKey,
            title: '시청 확인 알림',
            message: categoryBlocked
              ? `${latestAnalysis.categoryNameKo ?? '해당 카테고리'} 시청은 현재 필터에서 제한되어 있어요.`
              : latestAnalysis.playback.message,
            tone: !latestAnalysis.playback.allowed ? 'danger' : riskTone === 'HIGH' ? 'warning' : 'info',
            createdAt: Date.now(),
          })
        }
      }
    }

    if (lowBlinkGuidance && !lowBlinkToastEpisodeShownRef.current && !seenToastKeysRef.current.has(lowBlinkGuidance.sourceKey)) {
      seenToastKeysRef.current.add(lowBlinkGuidance.sourceKey)
      lowBlinkToastEpisodeShownRef.current = true
      nextToasts.push({
        id: `toast-${lowBlinkGuidance.sourceKey}`,
        sourceKey: lowBlinkGuidance.sourceKey,
        title: lowBlinkGuidance.title,
        message: lowBlinkGuidance.message,
        tone: 'warning',
        createdAt: Date.now(),
        durationMs: BLINK_GUIDANCE_DURATION_MS,
      })
    }

    if (nextToasts.length > 0) {
      setAlertToasts((prev) => [...nextToasts, ...prev].slice(0, 4))
      nextToasts.forEach((toast) => {
        countedToastMetricKeysRef.current.add(toast.sourceKey)
      })
      incrementAlertCount(
        nextToasts.filter((toast) => !toast.sourceKey.startsWith('server-error:')).length,
      )
    }
  }, [activeToastSourceKeys, incrementAlertCount, latestAnalysis, lowBlinkGuidance, recentAlerts, serverError, youtubeCategorySettings])

  return (
    <div data-profile-mode={profileMode} style={themeVars} className="app-root">
      <header className="global-topbar">
        <button type="button" className="global-home-logo" onClick={handleGoHome} aria-label="메인 페이지로 이동">
          <span className="global-home-logo__wordmark" aria-hidden="true">
            <span className="global-home-logo__lg">LG</span>
            <span className="global-home-logo__smart">SMART TV</span>
          </span>
        </button>
      </header>

      <div className="global-toast-stack" aria-live="polite" aria-label="보호 알림">
        {alertToasts.map((toast) => (
          <div key={toast.id} className={`global-toast global-toast--${toast.tone}`}>
            <div className="global-toast__copy">
              <strong>{toast.title}</strong>
              <p>{toast.message}</p>
            </div>
            <button
              type="button"
              className="global-toast__close"
              aria-label="알림 닫기"
              onClick={() => {
                seenToastKeysRef.current.delete(toast.sourceKey)
                setAlertToasts((prev) => prev.filter((item) => item.id !== toast.id))
              }}
            >
              닫기
            </button>
          </div>
        ))}
      </div>

      {showKidsCarePopup && kidsCarePopup && ((kidsCarePopup.showBubbles && activeBubbles.length > 0) || carePopupVisible) && (
        <div
          className={`blink-bubble-overlay ${kidsCarePopup.showBubbles ? 'blink-bubble-overlay--with-bubbles' : ''}`}
          aria-live="polite"
          aria-label="아이들 시청 안내"
        >
          {kidsCarePopup.showBubbles && activeBubbles.length > 0 && (
            <div className="blink-bubble-cluster" aria-hidden="true">
              {activeBubbles.map((bubble) => (
                <span
                  key={bubble.id}
                  className={`blink-bubble blink-bubble--${bubble.state}`}
                  style={{
                    ['--bubble-size' as string]: `${bubble.size}px`,
                    ['--bubble-left' as string]: `${bubble.left}%`,
                    ['--bubble-delay' as string]: `${bubble.delay}s`,
                    ['--bubble-duration' as string]: `${bubble.duration}s`,
                    ['--bubble-drift' as string]: `${bubble.drift}px`,
                    ['--bubble-rise' as string]: `${bubble.rise}px`,
                  } as CSSProperties}
                  onAnimationEnd={(e) => {
                    if (e.animationName === 'bubble-pop') {
                      setActiveBubbles((prev) => prev.filter((b) => b.id !== bubble.id))
                    }
                  }}
                />
              ))}
            </div>
          )}
          <div className={`kids-care-popup${carePopupExiting ? ' kids-care-popup--exit' : ''}`}>
            <div className="kids-care-popup__bear" aria-hidden="true">
              <BearIcon size={88} />
            </div>
            <div className="kids-care-popup__bubble">
              <strong>{kidsCarePopup.title}</strong>
              <p>{kidsCarePopup.message}</p>
            </div>
          </div>
        </div>
      )}

      {/* 숫자키 2 데모 팝업 – blink_low (버블) */}
      {demoBubbleVisible && (
        <div className="blink-bubble-overlay blink-bubble-overlay--with-bubbles" aria-live="polite" aria-label="눈 깜박임 안내 데모">
          {demoBubbleBubbles.length > 0 && (
            <div className="blink-bubble-cluster">
              {demoBubbleBubbles.map((bubble) => (
                <span
                  key={bubble.id}
                  role="button"
                  tabIndex={0}
                  aria-label="비눗방울 터뜨리기"
                  className={`blink-bubble blink-bubble--${bubble.state}`}
                  style={{
                    ['--bubble-size' as string]: `${bubble.size}px`,
                    ['--bubble-left' as string]: `${bubble.left}%`,
                    ['--bubble-delay' as string]: `${bubble.delay}s`,
                    ['--bubble-duration' as string]: `${bubble.duration}s`,
                    ['--bubble-drift' as string]: `${bubble.drift}px`,
                    ['--bubble-rise' as string]: `${bubble.rise}px`,
                    cursor: 'pointer',
                  } as CSSProperties}
                  onClick={() => {
                    if (bubble.state === 'popping') return
                    setDemoBubbleBubbles((prev) => prev.map((b) => b.id === bubble.id ? { ...b, state: 'popping' as const } : b))
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      if (bubble.state === 'popping') return
                      setDemoBubbleBubbles((prev) => prev.map((b) => b.id === bubble.id ? { ...b, state: 'popping' as const } : b))
                    }
                  }}
                  onAnimationEnd={(e) => {
                    if (e.animationName === 'bubble-pop') {
                      setDemoBubbleBubbles((prev) => prev.filter((b) => b.id !== bubble.id))
                    }
                  }}
                />
              ))}
            </div>
          )}
          <div className={`kids-care-popup${demoBubbleExiting ? ' kids-care-popup--exit' : ''}`}>
            <div className="kids-care-popup__bear" aria-hidden="true">
              <BearIcon size={88} />
            </div>
            <div className="kids-care-popup__bubble">
              <strong>눈을 깜박여볼까요</strong>
              <p>눈을 깜박이면 비눗방울이 사라져요.</p>
            </div>
          </div>
        </div>
      )}

      {/* 숫자키 1·3 데모 팝업 */}
      {demoPopupVisible && (
        <div className="blink-bubble-overlay" aria-live="polite" aria-label="케어 알림 데모">
          <div className={`kids-care-popup${demoPopupExiting ? ' kids-care-popup--exit' : ''}`}>
            <div className="kids-care-popup__bear" aria-hidden="true">
              <BearIcon size={88} />
            </div>
            <div className="kids-care-popup__bubble">
              <strong>{demoPopupContent.title}</strong>
              <p>{demoPopupContent.message}</p>
            </div>
          </div>
        </div>
      )}

      {currentScreen === 'main' && (
        <MainScreen
          onNavigate={navigate}
          onRequestProtectedUrl={(url) => requestParentPin({ kind: 'open-url', url }, 'main')}
          onRequestProtectedTv={() => requestParentPin({ kind: 'navigate', screen: 'tv-live' }, 'main')}
          profiles={profiles}
          activeProfileId={activeProfileId}
          onSelectKidsProfile={handleSelectKidsProfile}
          familyName={familyName}
          todayViewingCount={familyOverview?.todayViewingCount ?? 0}
          alertCount={familyOverview?.alertCount ?? 0}
          recentAlerts={recentAlerts}
          recentHistory={viewingHistory}
          serverLoading={serverLoading}
          serverError={serverError}
        />
      )}

      {currentScreen === 'profile-select' && (
        <ProfileSelectScreen
          profiles={profiles}
          onSelectProfile={handleSelectKidsProfile}
          onNavigate={navigate}
          onDeleteProfile={handleDeleteProfile}
        />
      )}

      {currentScreen === 'profile-type' && (
        <ProfileTypeScreen onNavigate={navigate} />
      )}
      {currentScreen === 'login' && <LoginScreen />}
      {currentScreen === 'connected' && <ConnectedScreen />}
      {currentScreen === 'content' && <ContentEnvScreen onNavigate={navigate} />}
      {currentScreen === 'time' && <WatchTimeScreen onNavigate={navigate} />}
      {currentScreen === 'interest' && <InterestScreen onNavigate={navigate} />}
      {currentScreen === 'cam-before' && <SmartCamBeforeScreen onNavigate={navigate} />}
      {currentScreen === 'cam-connecting' && <SmartCamConnectingScreen />}
      {currentScreen === 'cam-after' && <SmartCamAfterScreen onNavigate={navigate} />}
      {currentScreen === 'thinq' && (
        <ThinQScreen
          onBack={() => navigate(profileMode === 'kids' ? 'kids-main' : 'main')}
          familyName={familyName}
          dailySummary={familyOverview?.report.daily.watchSummary ?? '리포트를 준비하고 있어요.'}
          alertSummary={familyOverview?.report.daily.alertSummary ?? '최근 경고가 없어요.'}
          recentAlerts={recentAlerts}
          analysisHistory={analysisHistory}
          runtimeSettings={runtimeSettings}
          systemHealth={systemHealth}
          serverLoading={serverLoading}
          childSummaries={children}
          youtubeCategorySettings={youtubeCategorySettings}
          onUpdateYoutubeCategory={handleYoutubeCategoryChange}
          onToggleAutoBlock={handleAutoBlockToggle}
          onUpdateWatchPolicy={handleWatchPolicyChange}
          voiceAlertSettings={voiceAlertSettings}
          voiceRecordings={voiceRecordings}
          onToggleVoiceGroup={handleToggleVoiceGroup}
          onSetGroupActiveSpeaker={handleSetGroupActiveSpeaker}
          onToggleClipEnabled={handleToggleClipEnabled}
          onVoiceRecordingsChanged={handleVoiceRecordingsChanged}
        />
      )}
      {currentScreen === 'watch-history' && (
        <ViewingHistoryScreen
          familyName={familyName}
          viewingHistory={viewingHistory}
          recentAlerts={recentAlerts}
          analysisHistory={analysisHistory}
          onPlayInKidsMain={handlePlayInKidsMain}
        />
      )}
      {currentScreen === 'tv-live' && (
        <TvLiveScreen onBack={handleGoHome} />
      )}
      {currentScreen === 'youtube-care' && (
        <YoutubeCareScreen
          onBack={handleGoHome}
          onNavigate={navigate}
          activeChild={activeBackendChild}
          latestAnalysis={latestAnalysis}
          analysisHistory={activeChildAnalyses}
          viewingHistory={activeChildHistory}
          recentAlerts={activeChildAlerts}
          runtimeSettings={runtimeSettings}
          systemHealth={systemHealth}
          serverLoading={serverLoading}
          youtubeCategorySettings={youtubeCategorySettings}
          onAnalyzeYoutube={handleAnalyzeYoutube}
          analysisPending={analysisPending}
          activeMonitor={activeMonitor}
          monitorLive={monitorLive}
          monitorPending={monitorPending}
          onStopAddictionMonitor={handleStopAddictionMonitor}
        />
      )}
      {currentScreen === 'done' && <CreationCompleteScreen onNavigate={navigate} />}

      {currentScreen === 'profile-create' && (
        <ProfileCreateFormScreen
          onNavigate={navigate}
          onAddProfile={addProfile}
        />
      )}

      {currentScreen === 'kids-main' && (
        <KidsMainScreen
          onNavigate={navigate}
          onRequestProtectedUrl={(url) => requestParentPin({ kind: 'open-url', url }, 'kids-main')}
          profiles={profiles}
          activeProfileId={activeProfileId}
          onSwitchProfile={(id) => {
            setActiveProfileId(id)
            setProfileMode('kids')
          }}
          sharedMode={sharedMode}
          onToggleSharedMode={() => setSharedMode((value) => !value)}
          onUpdateTimeLimit={updateTimeLimit}
          activeChild={activeBackendChild}
          recentAlerts={activeChildAlerts}
          viewingHistory={activeChildHistory}
          analysisHistory={activeChildAnalyses}
          latestAnalysis={latestAnalysis}
          runtimeSettings={runtimeSettings}
          systemHealth={systemHealth}
          serverLoading={serverLoading}
          onAnalyzeYoutube={handleAnalyzeYoutube}
          analysisPending={analysisPending}
          youtubeCategorySettings={youtubeCategorySettings}
          activeMonitor={activeMonitor}
          monitorLive={monitorLive}
          monitorPending={monitorPending}
          onStopAddictionMonitor={handleStopAddictionMonitor}
          initialPlaybackVideoId={pendingKidsPlaybackVideoId}
          onInitialPlaybackConsumed={() => setPendingKidsPlaybackVideoId(null)}
        />
      )}

      {currentScreen === 'pin' && (
        <PinScreen
          expectedPin={parentPin}
          helperText="설정 > 가족 보호에서 부모 PIN을 바꿀 수 있어요"
          onSuccess={() => {
            const action = pendingPinAction
            setPendingPinAction(null)
            setProfileMode('adult')

            if (!action) {
              navigate('main')
              return
            }

            if (action.kind === 'open-url') {
              incrementViewingCount(`pin-open-url:${action.url}`)
              window.open(action.url, '_blank', 'noopener,noreferrer')
              navigate('main')
              return
            }

            if (action.screen === 'tv-live') {
              incrementViewingCount(`pin-screen:${action.screen}`)
            }
            navigate(action.screen)
          }}
          onCancel={() => {
            setPendingPinAction(null)
            navigate(pendingPinAction ? pinCancelScreen : 'kids-main')
          }}
        />
      )}

      {(
        currentScreen === 'settings'
        || currentScreen === 'settings-child'
        || currentScreen === 'settings-family'
        || currentScreen === 'settings-youtube'
        || currentScreen === 'settings-history'
      ) && (
        <MainSettingsLayout
          key={currentScreen}
          onBack={() => navigate(profileMode === 'kids' ? 'kids-main' : 'main')}
          profiles={profiles}
          activeProfileId={activeProfileId}
          onUpdateTimeLimit={updateTimeLimit}
          onUpdateWatchPolicy={handleWatchPolicyChange}
          monitorGuidanceSettings={monitorGuidanceSettings}
          onUpdateMonitorGuidanceSettings={handleMonitorGuidanceSettingsChange}
          initialSection={settingsInitialSection}
          familyName={familyName}
          childSummaries={children}
          viewingHistory={viewingHistory}
          recentAlerts={recentAlerts}
          analysisHistory={analysisHistory}
          runtimeSettings={runtimeSettings}
          systemHealth={systemHealth}
          onUpdateRuntimeSettings={handleRuntimeSettingsChange}
          serverError={serverError}
          youtubeCategorySettings={youtubeCategorySettings}
          onUpdateYoutubeCategory={handleYoutubeCategoryChange}
          parentPin={parentPin}
          onUpdateParentPin={updateParentPin}
        />
      )}
    </div>
  )
}

function mapRiskToToastTone(riskLevel?: string | null): ToastTone {
  switch ((riskLevel ?? '').toUpperCase()) {
    case 'HIGH':
    case '위험':
      return 'danger'
    case 'MEDIUM':
    case 'WARNING':
    case '경고':
      return 'warning'
    case 'LOW':
    case '주의':
      return 'info'
    default:
      return 'success'
  }
}

function mapCategoryNameToId(categoryName: string): YoutubeCategoryId | null {
  switch (categoryName) {
    case '영화·애니메이션':
      return 'film_animation'
    case '자동차·이동수단':
      return 'autos_vehicles'
    case '음악':
      return 'music'
    case '반려동물·동물':
      return 'pets_animals'
    case '스포츠':
      return 'sports'
    case '여행·이벤트':
      return 'travel_events'
    case '게임':
      return 'gaming'
    case '인물·브이로그':
      return 'people_blogs'
    case '코미디':
      return 'comedy'
    case '엔터테인먼트':
      return 'entertainment'
    case '뉴스·정치':
      return 'news_politics'
    case '생활·스타일':
      return 'howto_style'
    case '교육':
      return 'education'
    case '과학·기술':
      return 'science_technology'
    case '비영리·사회활동':
      return 'nonprofits_activism'
    default:
      return null
  }
}

