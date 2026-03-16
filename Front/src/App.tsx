import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import './App.css'

import type { ScreenId } from './data/kidsProfileFlow'
import { AUTO_ADVANCE, AUTO_ADVANCE_DELAY_MS } from './data/kidsProfileFlow'
import { DEFAULT_PROFILES, getThemeByAge, type ChildProfile } from './data/profiles'
import {
  DEFAULT_YOUTUBE_CATEGORY_SETTINGS,
  type YoutubeCategoryId,
  type YoutubeCategorySettings,
} from './data/youtubeExperience'

import {
  analyzeYoutube,
  getActiveAddictionMonitor,
  getAnalysisHistory,
  getMonitorLive,
  getParentOverview,
  getRuntimeSettings,
  getSelection,
  getSystemHealth,
  getViewingHistory,
  startAddictionMonitor,
  stopAddictionMonitor,
  updateRuntimeSettings,
  updateSelection,
  updateWatchPolicy,
  type AnalysisResponse,
  type MonitorControlResponse,
  type MonitorLiveResponse,
  type ParentAlertResponse,
  type ParentChildResponse,
  type ParentOverviewResponse,
  type ParentViewingHistoryResponse,
  type RuntimeSettingsResponse,
  type SystemHealthResponse,
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

export { getThemeByAge }
export type { ChildProfile }

export type ProfileMode = 'adult' | 'kids'

const FAMILY_ID = 1
const YOUTUBE_CATEGORY_STORAGE_KEY = 'lg-smart-tv.youtube-category-settings'
const TOAST_DURATION_MS = 60_000
const BLINK_WARNING_THRESHOLD_BPM = 10
const BUBBLE_BURST_DURATION_MS = 1100

type ToastTone = 'info' | 'warning' | 'danger' | 'success'

type AlertToast = {
  id: string
  title: string
  message: string
  tone: ToastTone
  sourceKey: string
  createdAt: number
}

type BlinkBubbleState = 'hidden' | 'rising' | 'bursting'

type KidsCarePopup = {
  trigger: string
  title: string
  message: string
  showBubbles: boolean
}

function formatRemainingMinutesLabel(minutes: number): string {
  if (minutes <= 0) {
    return '시청 시간이 다 되었어요'
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
        title: '시청 시간을 확인해 볼까요?',
        message: `오늘 시청시간이 ${formatRemainingMinutesLabel(remainingMinutes)}`,
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
        title: '눈을 한 번 깜박여 주세요',
        message: '눈이 조금 지쳐 보여요. 눈을 천천히 깜박이면 비눗방울이 사라져요.',
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
        message: '고개를 바르게 두면 더 편하게 볼 수 있어요.',
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

function loadYoutubeCategorySettings(): YoutubeCategorySettings {
  if (typeof window === 'undefined') {
    return DEFAULT_YOUTUBE_CATEGORY_SETTINGS
  }

  try {
    const raw = window.localStorage.getItem(YOUTUBE_CATEGORY_STORAGE_KEY)
    if (!raw) {
      return DEFAULT_YOUTUBE_CATEGORY_SETTINGS
    }

    const parsed = JSON.parse(raw) as Partial<YoutubeCategorySettings>
    return {
      ...DEFAULT_YOUTUBE_CATEGORY_SETTINGS,
      ...parsed,
    }
  } catch {
    return DEFAULT_YOUTUBE_CATEGORY_SETTINGS
  }
}

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenId>('main')
  const [profiles, setProfiles] = useState<ChildProfile[]>([...DEFAULT_PROFILES])
  const [activeProfileId, setActiveProfileId] = useState<string>(DEFAULT_PROFILES[0].id)
  const [sharedMode, setSharedMode] = useState(false)
  const [profileMode, setProfileMode] = useState<ProfileMode>('adult')

  const [familyOverview, setFamilyOverview] = useState<ParentOverviewResponse | null>(null)
  const [children, setChildren] = useState<ParentChildResponse[]>([])
  const [viewingHistory, setViewingHistory] = useState<ParentViewingHistoryResponse[]>([])
  const [recentAlerts, setRecentAlerts] = useState<ParentAlertResponse[]>([])
  const [runtimeSettings, setRuntimeSettings] = useState<RuntimeSettingsResponse | null>(null)
  const [systemHealth, setSystemHealth] = useState<SystemHealthResponse | null>(null)
  const [analysisHistory, setAnalysisHistory] = useState<AnalysisResponse[]>([])
  const [latestAnalysis, setLatestAnalysis] = useState<AnalysisResponse | null>(null)
  const [analysisPending, setAnalysisPending] = useState(false)
  const [activeMonitor, setActiveMonitor] = useState<MonitorControlResponse | null>(null)
  const [monitorLive, setMonitorLive] = useState<MonitorLiveResponse | null>(null)
  const [monitorPending, setMonitorPending] = useState(false)
  const [serverLoading, setServerLoading] = useState(true)
  const [serverError, setServerError] = useState<string | null>(null)
  const [youtubeCategorySettings, setYoutubeCategorySettings] = useState<YoutubeCategorySettings>(() => loadYoutubeCategorySettings())
  const [alertToasts, setAlertToasts] = useState<AlertToast[]>([])
  const [blinkBubbleState, setBlinkBubbleState] = useState<BlinkBubbleState>('hidden')
  const seenToastKeysRef = useRef<Set<string>>(new Set())
  const blinkBubbleTimerRef = useRef<number | null>(null)

  const navigate = useCallback((screen: ScreenId) => {
    setCurrentScreen(screen)
  }, [])

  const handleGoHome = useCallback(() => {
    setProfileMode('adult')
    setCurrentScreen('main')
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

      const nextProfiles = normalizedChildren.length > 0
        ? buildProfilesFromChildren(normalizedChildren)
        : [...DEFAULT_PROFILES]

      const selectedProfileId = selection.childId
        ? profileIdFromChildId(selection.childId)
        : nextProfiles[0]?.id ?? DEFAULT_PROFILES[0].id

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
      const message = error instanceof Error ? error.message : '서비스 정보를 불러오지 못했습니다.'
      setServerError(message)
    } finally {
      setServerLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadIntegratedData()
  }, [loadIntegratedData])

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
    window.localStorage.setItem(YOUTUBE_CATEGORY_STORAGE_KEY, JSON.stringify(youtubeCategorySettings))
  }, [youtubeCategorySettings])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setAlertToasts((prev) => prev.filter((toast) => Date.now() - toast.createdAt < TOAST_DURATION_MS))
    }, 1000)

    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => () => {
    if (blinkBubbleTimerRef.current != null) {
      window.clearTimeout(blinkBubbleTimerRef.current)
    }
  }, [])

  const activeBackendChild = useMemo(
    () => children.find((child) => profileIdFromChildId(child.childId) === activeProfileId) ?? null,
    [activeProfileId, children],
  )

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
      message: `${Math.round(monitorLive.blinkBpm)}회/분으로 감지됐어요. 눈을 한 번 깜박이면 비눗방울이 톡 터져요.`,
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

  useEffect(() => {
    if (kidsCarePopup?.showBubbles) {
      if (blinkBubbleTimerRef.current != null) {
        window.clearTimeout(blinkBubbleTimerRef.current)
        blinkBubbleTimerRef.current = null
      }

      setBlinkBubbleState((prev) => (prev === 'hidden' ? 'rising' : prev))
      return
    }

    setBlinkBubbleState((prev) => {
      if (prev !== 'rising') {
        return prev === 'bursting' ? prev : 'hidden'
      }

      if (blinkBubbleTimerRef.current != null) {
        window.clearTimeout(blinkBubbleTimerRef.current)
      }

      blinkBubbleTimerRef.current = window.setTimeout(() => {
        setBlinkBubbleState('hidden')
        blinkBubbleTimerRef.current = null
      }, BUBBLE_BURST_DURATION_MS)

      return 'bursting'
    })
  }, [kidsCarePopup?.showBubbles])

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
      const message = error instanceof Error ? error.message : '시청 시간 제한 저장에 실패했습니다.'
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
      const message = error instanceof Error ? error.message : '가족 보호 설정 변경에 실패했습니다.'
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
      const message = error instanceof Error ? error.message : '가족 보호 설정 저장에 실패했습니다.'
      setServerError(message)
    }
  }, [children])

  const addProfile = useCallback((newProfile: ChildProfile) => {
    setProfiles((prev) => [...prev, newProfile])
    setActiveProfileId(newProfile.id)
    setProfileMode('kids')
  }, [])

  const handleAnalyzeYoutube = useCallback(async (videoUrl: string) => {
    if (!activeBackendChild?.childId) {
      setServerError('유튜브 확인을 시작하려면 자녀 프로필이 먼저 선택되어야 합니다.')
      return
    }

    setAnalysisPending(true)

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

      const result = await analyzeYoutube(videoUrl, activeBackendChild.childId)
      setLatestAnalysis(result)
      setAnalysisHistory((prev) => [result, ...prev].slice(0, 8))

      if (result.playback.allowed) {
        const monitor = await startAddictionMonitor(
          videoUrl,
          activeBackendChild.childId,
          result.analysisId ?? null,
        )
        setActiveMonitor(monitor)
      } else {
        setActiveMonitor(null)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '영상 확인에 실패했습니다.'
      setServerError(message)
    } finally {
      setAnalysisPending(false)
    }
  }, [activeBackendChild, runtimeSettings])

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
      const message = error instanceof Error ? error.message : '카메라 종료 요청에 실패했습니다.'
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
      const message = error instanceof Error ? error.message : '보호 설정 저장에 실패했습니다.'
      setServerError(message)
    }
  }, [])

  const handleYoutubeCategoryChange = useCallback((categoryId: YoutubeCategoryId, enabled: boolean) => {
    setYoutubeCategorySettings((prev) => ({
      ...prev,
      [categoryId]: enabled,
    }))
  }, [])

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

    if (lowBlinkGuidance) {
      keys.add(lowBlinkGuidance.sourceKey)
    }

    return keys
  }, [latestAnalysis, lowBlinkGuidance, recentAlerts, serverError, youtubeCategorySettings])

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
              ? `${latestAnalysis.categoryNameKo ?? '해당 카테고리'} 시청이 현재 필터에서 제한되어 있어요.`
              : latestAnalysis.playback.message,
            tone: !latestAnalysis.playback.allowed ? 'danger' : riskTone === 'HIGH' ? 'warning' : 'info',
            createdAt: Date.now(),
          })
        }
      }
    }

    if (lowBlinkGuidance && !seenToastKeysRef.current.has(lowBlinkGuidance.sourceKey)) {
      seenToastKeysRef.current.add(lowBlinkGuidance.sourceKey)
      nextToasts.push({
        id: `toast-${lowBlinkGuidance.sourceKey}`,
        sourceKey: lowBlinkGuidance.sourceKey,
        title: lowBlinkGuidance.title,
        message: lowBlinkGuidance.message,
        tone: 'warning',
        createdAt: Date.now(),
      })
    }

    if (nextToasts.length > 0) {
      setAlertToasts((prev) => [...nextToasts, ...prev].slice(0, 4))
    }
  }, [activeToastSourceKeys, latestAnalysis, lowBlinkGuidance, recentAlerts, serverError, youtubeCategorySettings])

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

      {showKidsCarePopup && kidsCarePopup && (
        <div
          className={`blink-bubble-overlay blink-bubble-overlay--${blinkBubbleState} ${kidsCarePopup.showBubbles ? 'blink-bubble-overlay--with-bubbles' : ''}`}
          aria-live="polite"
          aria-label="아이들 시청 안내"
        >
          {kidsCarePopup.showBubbles && (
            <div className="blink-bubble-cluster" aria-hidden="true">
              {Array.from({ length: 20 }).map((_, index) => (
                <span
                  key={`blink-bubble-${index}`}
                  className="blink-bubble"
                  style={{
                    ['--bubble-size' as string]: `${34 + (index % 5) * 14}px`,
                    ['--bubble-left' as string]: `${2 + ((index * 17) % 94)}%`,
                    ['--bubble-delay' as string]: `${(index % 6) * 0.22}s`,
                    ['--bubble-duration' as string]: `${3.6 + (index % 4) * 0.55}s`,
                    ['--bubble-drift' as string]: `${-32 + (index % 7) * 10}px`,
                    ['--bubble-rise' as string]: `${220 + (index % 5) * 70}px`,
                  } as CSSProperties}
                />
              ))}
            </div>
          )}
          <div className="kids-care-popup">
            <div className="kids-care-popup__bear" aria-hidden="true">
              <span className="kids-care-popup__leaf" />
              <span className="kids-care-popup__ear kids-care-popup__ear--left" />
              <span className="kids-care-popup__ear kids-care-popup__ear--right" />
              <span className="kids-care-popup__face">
                <span className="kids-care-popup__eye kids-care-popup__eye--left" />
                <span className="kids-care-popup__eye kids-care-popup__eye--right" />
                <span className="kids-care-popup__nose" />
              </span>
            </div>
            <div className="kids-care-popup__bubble">
              <strong>{kidsCarePopup.title}</strong>
              <p>{kidsCarePopup.message}</p>
            </div>
          </div>
        </div>
      )}

      {currentScreen === 'main' && (
        <MainScreen
          onNavigate={navigate}
          onOpenYoutubeCare={() => navigate('youtube-care')}
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
          dailySummary={familyOverview?.report.daily.watchSummary ?? '리포트가 준비되는 중입니다.'}
          alertSummary={familyOverview?.report.daily.alertSummary ?? '최근 경고가 없습니다.'}
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
        />
      )}
      {currentScreen === 'watch-history' && (
        <ViewingHistoryScreen
          familyName={familyName}
          viewingHistory={viewingHistory}
          recentAlerts={recentAlerts}
          analysisHistory={analysisHistory}
        />
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
        />
      )}

      {currentScreen === 'pin' && (
        <PinScreen
          onNavigate={navigate}
          onSuccess={() => { setProfileMode('adult'); navigate('main') }}
          onCancel={() => navigate('kids-main')}
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
