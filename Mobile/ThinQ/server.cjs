const express = require('express')
const { Pool } = require('pg')
const { MongoClient } = require('mongodb')

const PORT = Number(process.env.PORT || 4175)
const DAY_MS = 24 * 60 * 60 * 1000

const YOUTUBE_CATEGORY_OPTIONS = [
  { key: 'film_animation', name: '영화·애니메이션' },
  { key: 'autos_vehicles', name: '자동차·이동수단' },
  { key: 'music', name: '음악' },
  { key: 'pets_animals', name: '반려동물·동물' },
  { key: 'sports', name: '스포츠' },
  { key: 'travel_events', name: '여행·이벤트' },
  { key: 'gaming', name: '게임' },
  { key: 'people_blogs', name: '인물·브이로그' },
  { key: 'comedy', name: '코미디' },
  { key: 'entertainment', name: '엔터테인먼트' },
  { key: 'news_politics', name: '뉴스·정치' },
  { key: 'howto_style', name: '생활·스타일' },
  { key: 'education', name: '교육' },
  { key: 'science_technology', name: '과학·기술' },
  { key: 'nonprofits_activism', name: '비영리·사회활동' },
]

const DEFAULT_YOUTUBE_CATEGORY_SETTINGS = {
  film_animation: true,
  autos_vehicles: true,
  music: true,
  pets_animals: true,
  sports: true,
  travel_events: true,
  gaming: false,
  people_blogs: true,
  comedy: true,
  entertainment: false,
  news_politics: false,
  howto_style: true,
  education: true,
  science_technology: true,
  nonprofits_activism: true,
}

const pgPool = new Pool({
  host: process.env.PGHOST || '127.0.0.1',
  port: Number(process.env.PGPORT || 3355),
  database: process.env.PGDATABASE || 'lgdx',
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || '12345',
})

let mongoClientPromise = null

function getMongoClient() {
  if (!mongoClientPromise) {
    mongoClientPromise = MongoClient.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017', {
      maxPoolSize: 5,
    }).catch((error) => {
      mongoClientPromise = null
      throw error
    })
  }

  return mongoClientPromise
}

function startOfDay(value) {
  const date = new Date(value)
  date.setHours(0, 0, 0, 0)
  return date
}

function addDays(value, days) {
  return new Date(value.getTime() + days * DAY_MS)
}

function isoDay(value) {
  return startOfDay(value).toISOString().slice(0, 10)
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function average(values) {
  if (!values.length) {
    return 0
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function round(value, precision = 1) {
  const factor = 10 ** precision
  return Math.round(value * factor) / factor
}

function percent(part, total) {
  if (!total) {
    return 0
  }

  return round((part / total) * 100, 1)
}

function formatDayLabel(value) {
  return new Intl.DateTimeFormat('ko-KR', { weekday: 'short' }).format(value)
}

function getAgeFromBirthYear(birthYear) {
  if (!birthYear) {
    return null
  }

  return Math.max(1, new Date().getFullYear() - Number(birthYear))
}

function getSchoolLabel(age) {
  if (!age) {
    return '연령 정보 없음'
  }

  const elementaryGrade = age - 6
  if (elementaryGrade >= 1 && elementaryGrade <= 6) {
    return `초등학교 ${elementaryGrade}학년`
  }

  if (elementaryGrade <= 0) {
    return '미취학'
  }

  return `${age}세`
}

function inferCategory(videoId) {
  const text = String(videoId || '').toLowerCase()

  if (text.includes('cartoon') || text.includes('coco') || text.includes('animation') || text.includes('pororo')) {
    return 'Animation'
  }

  if (text.includes('minecraft') || text.includes('game')) {
    return 'Gaming'
  }

  if (text.includes('dance') || text.includes('music')) {
    return 'Music'
  }

  if (text.includes('racing') || text.includes('sport')) {
    return 'Sports'
  }

  if (text.includes('edu') || text.includes('school') || text.includes('study') || text.includes('math')) {
    return 'Education'
  }

  return 'General'
}

function getCategoryLabel(category) {
  const labels = {
    Animation: '애니메이션',
    Education: '교육',
    Gaming: '게임',
    Music: '음악',
    Sports: '스포츠',
    General: '일반',
  }

  return labels[category] || category
}

function titleFromVideoId(videoId) {
  return String(videoId || '')
    .replace(/^youtube-/, '')
    .split('-')
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ')
}

function getDayLimitMinutes(child, value = new Date()) {
  if (!child) {
    return 0
  }

  const day = value.getDay()
  switch (day) {
    case 1:
      return child.mondayLimitMinutes ?? child.dailyLimitMinutes ?? 0
    case 2:
      return child.tuesdayLimitMinutes ?? child.dailyLimitMinutes ?? 0
    case 3:
      return child.wednesdayLimitMinutes ?? child.dailyLimitMinutes ?? 0
    case 4:
      return child.thursdayLimitMinutes ?? child.dailyLimitMinutes ?? 0
    case 5:
      return child.fridayLimitMinutes ?? child.dailyLimitMinutes ?? 0
    case 6:
      return child.saturdayLimitMinutes ?? child.dailyLimitMinutes ?? 0
    case 0:
    default:
      return child.sundayLimitMinutes ?? child.dailyLimitMinutes ?? 0
  }
}

function isViewingAllowedNow(child, todayMinutes, value = new Date()) {
  if (!child) {
    return false
  }

  const hour = value.getHours()
  const isWeekend = value.getDay() === 0 || value.getDay() === 6
  const startHour = isWeekend ? child.weekendStartHour : child.weekdayStartHour
  const endHour = isWeekend ? child.weekendEndHour : child.weekdayEndHour
  const inSchedule = hour >= Number(startHour ?? 0) && hour < Number(endHour ?? 24)
  const bedtimeBlocked = Boolean(child.bedtimeLockEnabled) && hour >= Number(child.bedtimeHour ?? 24)
  const remainingMinutes = Math.max(getDayLimitMinutes(child, value) - todayMinutes, 0)

  return inSchedule && !bedtimeBlocked && remainingMinutes > 0
}

function getContentRatingLabel(age) {
  if (!age) {
    return '전체관람가'
  }

  if (age <= 7) {
    return '전체관람가'
  }

  if (age <= 10) {
    return '7세 이상'
  }

  if (age <= 13) {
    return '12세 이상'
  }

  return '15세 이상'
}

function ratingFromValue(value, thresholds) {
  if (value == null) {
    return '데이터 대기'
  }

  if (value >= thresholds.good) {
    return '양호'
  }

  if (value >= thresholds.warn) {
    return '주의'
  }

  return '경고'
}

function getValue(object, paths, fallback = null) {
  for (const path of paths) {
    const value = path.split('.').reduce((current, key) => {
      if (current == null) {
        return undefined
      }

      return current[key]
    }, object)

    if (value !== undefined) {
      return value
    }
  }

  return fallback
}

async function hasTable(tableName) {
  const result = await pgPool.query('select to_regclass($1) as "tableName"', [`public.${tableName}`])
  return Boolean(result.rows[0]?.tableName)
}

async function resolveYoutubeCategoryFilters(childId) {
  const tableExists = await hasTable('child_youtube_category_filter')
  if (!tableExists) {
    return YOUTUBE_CATEGORY_OPTIONS.map((category) => ({
      key: category.key,
      name: category.name,
      enabled: Boolean(DEFAULT_YOUTUBE_CATEGORY_SETTINGS[category.key]),
      backedByDatabase: false,
    }))
  }

  const existing = await pgPool.query(
    `select category_id as "categoryId", enabled as "enabled", updated_at as "updatedAt"
     from child_youtube_category_filter
     where child_id = $1
     order by category_id asc`,
    [childId],
  )

  const current = new Map(existing.rows.map((row) => [row.categoryId, row]))
  for (const category of YOUTUBE_CATEGORY_OPTIONS) {
    if (!current.has(category.key)) {
      await pgPool.query(
        `insert into child_youtube_category_filter (child_id, category_id, enabled, updated_at)
         values ($1, $2, $3, current_timestamp)
         on conflict (child_id, category_id) do update set
           enabled = excluded.enabled,
           updated_at = current_timestamp`,
        [childId, category.key, Boolean(DEFAULT_YOUTUBE_CATEGORY_SETTINGS[category.key])],
      )
    }
  }

  const hydrated = await pgPool.query(
    `select category_id as "categoryId", enabled as "enabled", updated_at as "updatedAt"
     from child_youtube_category_filter
     where child_id = $1
     order by category_id asc`,
    [childId],
  )

  const hydratedMap = new Map(hydrated.rows.map((row) => [row.categoryId, row]))
  return YOUTUBE_CATEGORY_OPTIONS.map((category) => ({
    key: category.key,
    name: category.name,
    enabled: Boolean(hydratedMap.get(category.key)?.enabled),
    backedByDatabase: true,
    updatedAt: hydratedMap.get(category.key)?.updatedAt ?? null,
  }))
}

async function updateYoutubeCategoryFilter(childId, categoryId, enabled) {
  if (!YOUTUBE_CATEGORY_OPTIONS.some((category) => category.key === categoryId)) {
    throw new Error(`지원하지 않는 YouTube 카테고리입니다: ${categoryId}`)
  }

  await pgPool.query(
    `insert into child_youtube_category_filter (child_id, category_id, enabled, updated_at)
     values ($1, $2, $3, current_timestamp)
     on conflict (child_id, category_id) do update set
       enabled = excluded.enabled,
       updated_at = current_timestamp`,
    [childId, categoryId, enabled],
  )

  return resolveYoutubeCategoryFilters(childId)
}

async function getExistingColumns(tableName) {
  const result = await pgPool.query(
    `select column_name as "columnName"
     from information_schema.columns
     where table_schema = 'public'
       and table_name = $1`,
    [tableName],
  )

  return new Set(result.rows.map((row) => row.columnName))
}

function selectColumnOrFallback(columns, columnName, alias, fallback = 'null') {
  if (columns.has(columnName)) {
    return `p.${columnName} as "${alias}"`
  }

  return `${fallback} as "${alias}"`
}

function buildDeviation({ label, recent, baseline, unit, direction }) {
  if (!Number.isFinite(recent) || !Number.isFinite(baseline)) {
    return null
  }

  const diff = recent - baseline
  const absDiff = Math.abs(diff)

  if (
    (unit === '%' && absDiff < 5) ||
    (unit === 'cm' && absDiff < 5) ||
    (unit === 'bpm' && absDiff < 2) ||
    (unit === 'sec' && absDiff < 3)
  ) {
    return null
  }

  const trend = diff > 0 ? 'increase' : 'decrease'
  const isConcern =
    (direction === 'higher-is-worse' && diff > 0) ||
    (direction === 'lower-is-worse' && diff < 0)

  return {
    label,
    trend,
    isConcern,
    recent: round(recent, 1),
    baseline: round(baseline, 1),
    delta: round(diff, 1),
    unit,
    message:
      trend === 'increase'
        ? `평소보다 ${label}이 ${round(absDiff, 1)}${unit} 늘었습니다.`
        : `평소보다 ${label}이 ${round(absDiff, 1)}${unit} 줄었습니다.`,
  }
}

function buildTelemetrySummary(telemetry, sessions, events, landmarkSamples) {
  if (!telemetry.length) {
    const latestSession = sessions[0] || null
    const latestEvent = events[0] || null

    return {
      available: false,
      sampleCount: 0,
      sessionCount: sessions.length,
      eventCount: events.length,
      landmarkSamples,
      latestCapturedAt: null,
      latestSessionStatus: latestSession?.status || null,
      latestSessionUpdatedAt: latestSession?.updated_at || null,
      latestEventType: latestEvent?.event_type || null,
      latestEventMessage: latestEvent?.message || null,
      smartCamLinked: sessions.length > 0 || events.length > 0,
      focusScore: null,
      riskScore: null,
      postureScore: null,
      averageBlinkBpm: null,
      averageDistanceCm: null,
      frontFacingRatio: null,
      safeDistanceRatio: null,
      stillDurationSeconds: null,
      negativeEmotionRatio: null,
      postureStatusBreakdown: [],
      history: [],
      deviations: [],
      recentMessages: [],
      comparisonBaselineLabel: '권장 기준',
      comparisonBaseline: {
        postureScore: 75,
        blinkBpm: 15,
        distanceCm: 200,
      },
      note:
        sessions.length || events.length
          ? '스마트캠 세션 기록은 존재하지만, 아직 monitor_telemetry / monitor_landmarks 데이터가 없어 자세 수치 집계는 비어 있습니다.'
          : 'MongoDB telemetry가 아직 없습니다. 5분 단위 랜드마크 좌표와 telemetry가 쌓이면 눈 깜박임, 자세, 거리 변화를 자동으로 집계합니다.',
    }
  }

  const ordered = [...telemetry].sort(
    (left, right) => new Date(left.captured_at || left.capturedAt) - new Date(right.captured_at || right.capturedAt),
  )

  const mapped = ordered.map((item) => ({
    capturedAt: new Date(item.captured_at || item.capturedAt),
    blinkBpm: Number(getValue(item, ['blink.bpm'], 0)),
    distanceCm: Number(getValue(item, ['distance.screen_distance_cm', 'distance.screenDistanceCm'], 0)),
    isSafeDistance: Boolean(getValue(item, ['distance.is_safe', 'distance.isSafe'], false)),
    isFront: Boolean(getValue(item, ['head_pose.is_front', 'headPose.isFront'], false)),
    stillDurationSeconds: Number(getValue(item, ['pose.still_duration_seconds', 'pose.stillDurationSeconds'], 0)),
    poseStatus: String(getValue(item, ['pose.status'], 'unknown')),
    negativeEmotionRatio: Number(getValue(item, ['emotion.negative_ratio', 'emotion.negativeRatio'], 0)),
    focusScore: Number(getValue(item, ['scores.focus_score', 'scores.focusScore'], 0)),
    riskScore: Number(getValue(item, ['scores.risk_score', 'scores.riskScore'], 0)),
    childMessages: getValue(item, ['child_messages', 'childMessages'], []),
  }))

  const poseStatusCounts = mapped.reduce((accumulator, item) => {
    accumulator[item.poseStatus] = (accumulator[item.poseStatus] || 0) + 1
    return accumulator
  }, {})

  const historyMap = new Map()
  for (const item of mapped) {
    const key = isoDay(item.capturedAt)
    const current = historyMap.get(key) || {
      date: key,
      label: formatDayLabel(item.capturedAt),
      focusScores: [],
      blinkBpms: [],
      postureScores: [],
    }

    current.focusScores.push(item.focusScore)
    current.blinkBpms.push(item.blinkBpm)
    current.postureScores.push(item.focusScore)
    historyMap.set(key, current)
  }

  const history = [...historyMap.values()]
    .sort((left, right) => left.date.localeCompare(right.date))
    .slice(-7)
    .map((item) => ({
      date: item.date,
      label: item.label,
      focusScore: round(average(item.focusScores), 1),
      blinkBpm: round(average(item.blinkBpms), 1),
      postureScore: round(average(item.postureScores), 1),
    }))

  const recentCount = Math.max(3, Math.ceil(mapped.length * 0.2))
  const baselineSlice = mapped.slice(0, Math.max(mapped.length - recentCount, 1))
  const recentSlice = mapped.slice(-recentCount)

  const baseline = {
    blinkBpm: average(baselineSlice.map((item) => item.blinkBpm)),
    distanceCm: average(baselineSlice.map((item) => item.distanceCm)),
    frontFacingRatio: average(baselineSlice.map((item) => (item.isFront ? 100 : 0))),
    stillDurationSeconds: average(baselineSlice.map((item) => item.stillDurationSeconds)),
    negativeEmotionRatio: average(baselineSlice.map((item) => item.negativeEmotionRatio * 100)),
  }

  const recent = {
    blinkBpm: average(recentSlice.map((item) => item.blinkBpm)),
    distanceCm: average(recentSlice.map((item) => item.distanceCm)),
    frontFacingRatio: average(recentSlice.map((item) => (item.isFront ? 100 : 0))),
    stillDurationSeconds: average(recentSlice.map((item) => item.stillDurationSeconds)),
    negativeEmotionRatio: average(recentSlice.map((item) => item.negativeEmotionRatio * 100)),
  }

  return {
    available: true,
    sampleCount: mapped.length,
    sessionCount: sessions.length,
    eventCount: events.length,
    landmarkSamples,
    latestCapturedAt: mapped[mapped.length - 1].capturedAt.toISOString(),
    latestSessionStatus: sessions[0]?.status || null,
    latestSessionUpdatedAt: sessions[0]?.updated_at || null,
    latestEventType: events[0]?.event_type || null,
    latestEventMessage: events[0]?.message || null,
    smartCamLinked: true,
    focusScore: round(average(mapped.map((item) => item.focusScore)), 1),
    riskScore: round(average(mapped.map((item) => item.riskScore)), 1),
    postureScore: round(average(mapped.map((item) => item.focusScore)), 1),
    averageBlinkBpm: round(average(mapped.map((item) => item.blinkBpm)), 1),
    averageDistanceCm: round(average(mapped.map((item) => item.distanceCm)), 1),
    frontFacingRatio: round(average(mapped.map((item) => (item.isFront ? 100 : 0))), 1),
    safeDistanceRatio: round(average(mapped.map((item) => (item.isSafeDistance ? 100 : 0))), 1),
    stillDurationSeconds: round(average(mapped.map((item) => item.stillDurationSeconds)), 1),
    negativeEmotionRatio: round(average(mapped.map((item) => item.negativeEmotionRatio * 100)), 1),
    postureStatusBreakdown: Object.entries(poseStatusCounts).map(([status, count]) => ({ status, count })),
    history,
    deviations: [
      buildDeviation({
        label: '눈 깜박임 빈도',
        recent: recent.blinkBpm,
        baseline: baseline.blinkBpm,
        unit: 'bpm',
        direction: 'lower-is-worse',
      }),
      buildDeviation({
        label: '화면 거리',
        recent: recent.distanceCm,
        baseline: baseline.distanceCm,
        unit: 'cm',
        direction: 'lower-is-worse',
      }),
      buildDeviation({
        label: '정면 응시 비율',
        recent: recent.frontFacingRatio,
        baseline: baseline.frontFacingRatio,
        unit: '%',
        direction: 'lower-is-worse',
      }),
      buildDeviation({
        label: '고정 자세 시간',
        recent: recent.stillDurationSeconds,
        baseline: baseline.stillDurationSeconds,
        unit: 'sec',
        direction: 'higher-is-worse',
      }),
      buildDeviation({
        label: '부정 감정 비율',
        recent: recent.negativeEmotionRatio,
        baseline: baseline.negativeEmotionRatio,
        unit: '%',
        direction: 'higher-is-worse',
      }),
    ].filter(Boolean),
    recentMessages: [...new Set(mapped.flatMap((item) => item.childMessages).filter(Boolean))].slice(0, 5),
    comparisonBaselineLabel: '권장 기준',
    comparisonBaseline: {
      postureScore: 75,
      blinkBpm: 15,
      distanceCm: 200,
    },
    note: 'MongoDB의 5분 단위 랜드마크 기반 telemetry를 집계해 최근 행동 패턴을 요약했습니다.',
  }
}

function buildDailySnapshot(childViewings, peerViewings, selectedChild) {
  const anchorSource = childViewings[childViewings.length - 1]?.watchTime || new Date()
  const anchorDate = startOfDay(anchorSource)

  const series = []
  for (let offset = 6; offset >= 0; offset -= 1) {
    const currentDay = addDays(anchorDate, -offset)
    const dayKey = isoDay(currentDay)
    const mine = round(
      childViewings
        .filter((item) => isoDay(item.watchTime) === dayKey)
        .reduce((sum, item) => sum + item.watchDuration / 60, 0),
      1,
    )

    const peerBuckets = new Map()
    for (const item of peerViewings.filter((entry) => isoDay(entry.watchTime) === dayKey)) {
      peerBuckets.set(item.childId, (peerBuckets.get(item.childId) || 0) + item.watchDuration / 60)
    }

    series.push({
      date: dayKey,
      day: formatDayLabel(currentDay),
      mine,
      peer: round(average([...peerBuckets.values()]), 1),
    })
  }

  const weeklyMinutes = round(series.reduce((sum, item) => sum + item.mine, 0), 1)
  const averageDailyMinutes = round(weeklyMinutes / 7, 1)
  const peerAverageDailyMinutes = round(series.reduce((sum, item) => sum + item.peer, 0) / 7, 1)
  const differenceFromPeers = round(averageDailyMinutes - peerAverageDailyMinutes, 1)
  const topDay = [...series].sort((left, right) => right.mine - left.mine)[0] || null
  const overLimitDays = series.filter((item) => item.mine > (selectedChild?.dailyLimitMinutes || 120)).length
  const gaugePct = clamp(Math.round(50 + differenceFromPeers * 4), 10, 90)

  return {
    anchorDate: anchorDate.toISOString(),
    series,
    weeklyMinutes,
    averageDailyMinutes,
    peerAverageDailyMinutes,
    differenceFromPeers,
    latestDayMinutes: series[series.length - 1]?.mine || 0,
    topDay,
    gaugePct,
    gaugeLabel:
      differenceFromPeers >= 0
        ? `또래보다 ${Math.abs(Math.round(differenceFromPeers))}분 더 많이 시청하고 있어요`
        : `또래보다 ${Math.abs(Math.round(differenceFromPeers))}분 적게 시청하고 있어요`,
    recommendedMinutes: selectedChild?.dailyLimitMinutes || 120,
    overLimitDays,
    ctaRecommended: averageDailyMinutes > (selectedChild?.dailyLimitMinutes || 120),
  }
}

function buildCategoryMinutes(viewings) {
  const categoryMap = new Map()

  for (const item of viewings) {
    const category = inferCategory(item.videoId)
    const current = categoryMap.get(category) || { category, minutes: 0, sessions: 0 }
    current.minutes += item.watchDuration / 60
    current.sessions += 1
    categoryMap.set(category, current)
  }

  return [...categoryMap.values()]
}

function buildContentSnapshot(childViewings, peerViewings, weeklyMinutes) {
  const childCategories = buildCategoryMinutes(childViewings)
  const peerCategories = buildCategoryMinutes(peerViewings)

  const breakdown = childCategories
    .sort((left, right) => right.minutes - left.minutes)
    .map((item) => ({
      key: item.category,
      name: getCategoryLabel(item.category),
      rawName: item.category,
      minutes: round(item.minutes, 1),
      share: percent(item.minutes, weeklyMinutes),
      sessions: item.sessions,
    }))

  const peerCategoryMap = new Map(peerCategories.map((item) => [item.category, item.minutes]))
  const totalPeerMinutes = peerCategories.reduce((sum, item) => sum + item.minutes, 0)

  const compare = ['Animation', 'Education', 'Gaming', 'Music', 'Sports', 'General'].map((category) => {
    const mineMinutes = childCategories.find((item) => item.category === category)?.minutes || 0
    const peerMinutes = peerCategoryMap.get(category) || 0

    return {
      key: category,
      name: getCategoryLabel(category),
      mine: percent(mineMinutes, weeklyMinutes),
      peer: percent(peerMinutes, totalPeerMinutes),
    }
  })

  const topShows = [...childViewings]
    .reduce((accumulator, item) => {
      const current = accumulator.get(item.videoId) || {
        title: titleFromVideoId(item.videoId),
        videoId: item.videoId,
        minutes: 0,
        category: getCategoryLabel(inferCategory(item.videoId)),
      }

      current.minutes += item.watchDuration / 60
      accumulator.set(item.videoId, current)
      return accumulator
    }, new Map())
    .values()

  const riskyCategories = new Set(['Gaming', 'General', 'Music'])
  const riskyShare = round(
    compare
      .filter((item) => riskyCategories.has(item.key))
      .reduce((sum, item) => sum + item.mine, 0),
    1,
  )
  const peerRiskyShare = round(
    compare
      .filter((item) => riskyCategories.has(item.key))
      .reduce((sum, item) => sum + item.peer, 0),
    1,
  )

  return {
    breakdown,
    compare,
    topShows: [...topShows].sort((left, right) => right.minutes - left.minutes).slice(0, 5).map((item) => ({
      ...item,
      minutes: round(item.minutes, 1),
    })),
    dominantCategory: breakdown[0] || null,
    riskyShare,
    peerRiskyShare,
    showFilterCta: riskyShare > Math.max(25, peerRiskyShare),
    note:
      '현재 콘텐츠 분류는 PostgreSQL viewing_history의 video_id 패턴으로 추정합니다. 연령별 허용 콘텐츠 정책을 세분화하려면 별도 설정 테이블이 추가로 필요합니다.',
  }
}

async function loadDashboard(familyId, requestedChildId) {
  const preferenceTableExists = await hasTable('family_selection_preference')
  const watchPolicyColumns = await getExistingColumns('child_watch_policy')

  const familiesResult = await pgPool.query(
    'select user_id as "familyId", user_name as "familyName" from users order by user_id asc',
  )

  const familyResult = await pgPool.query(
    'select user_id as "familyId", user_name as "familyName", birth_year as "birthYear" from users where user_id = $1',
    [familyId],
  )

  if (!familyResult.rows[0]) {
    throw new Error('가족 정보를 찾지 못했습니다.')
  }

  const preferenceResult = preferenceTableExists
    ? await pgPool.query(
        'select family_id as "familyId", selected_child_id as "selectedChildId", updated_at as "updatedAt" from family_selection_preference where family_id = $1',
        [familyId],
      )
    : { rows: [] }

  const childrenResult = await pgPool.query(
    `select
      c.child_id as "childId",
      c.user_id as "familyId",
      c.child_name as "childName",
      c.birth_year as "birthYear",
      p.daily_limit_minutes as "dailyLimitMinutes",
      p.weekday_start_hour as "weekdayStartHour",
      p.weekday_end_hour as "weekdayEndHour",
      p.weekend_start_hour as "weekendStartHour",
      p.weekend_end_hour as "weekendEndHour",
      ${selectColumnOrFallback(watchPolicyColumns, 'bedtime_lock_enabled', 'bedtimeLockEnabled', 'false')},
      ${selectColumnOrFallback(watchPolicyColumns, 'bedtime_hour', 'bedtimeHour', '21')},
      ${selectColumnOrFallback(watchPolicyColumns, 'monday_limit_minutes', 'mondayLimitMinutes')},
      ${selectColumnOrFallback(watchPolicyColumns, 'tuesday_limit_minutes', 'tuesdayLimitMinutes')},
      ${selectColumnOrFallback(watchPolicyColumns, 'wednesday_limit_minutes', 'wednesdayLimitMinutes')},
      ${selectColumnOrFallback(watchPolicyColumns, 'thursday_limit_minutes', 'thursdayLimitMinutes')},
      ${selectColumnOrFallback(watchPolicyColumns, 'friday_limit_minutes', 'fridayLimitMinutes')},
      ${selectColumnOrFallback(watchPolicyColumns, 'saturday_limit_minutes', 'saturdayLimitMinutes')},
      ${selectColumnOrFallback(watchPolicyColumns, 'sunday_limit_minutes', 'sundayLimitMinutes')},
      p.notification_threshold as "notificationThreshold",
      p.auto_block_enabled as "autoBlockEnabled",
      p.updated_at as "policyUpdatedAt"
    from children c
    left join child_watch_policy p
      on p.child_id = c.child_id
    where c.user_id = $1
    order by c.child_id asc`,
    [familyId],
  )

  const selectedChildId =
    requestedChildId ||
    preferenceResult.rows[0]?.selectedChildId ||
    childrenResult.rows[0]?.childId ||
    null

  const selectedChild =
    childrenResult.rows.find((child) => child.childId === selectedChildId) || childrenResult.rows[0] || null

  const viewingsResult = await pgPool.query(
    `select
      v.viewing_id as "viewingId",
      v.user_id as "familyId",
      v.child_id as "childId",
      c.child_name as "childName",
      v.video_id as "videoId",
      v.watch_time as "watchTime",
      v.watch_duration as "watchDuration"
    from viewing_history v
    join children c
      on c.child_id = v.child_id
    where v.user_id = $1
    order by v.watch_time asc, v.viewing_id asc`,
    [familyId],
  )

  const alertsResult = await pgPool.query(
    `select
      a.alert_id as "alertId",
      v.child_id as "childId",
      c.child_name as "childName",
      a.alert_type as "alertType",
      a.risk_level as "riskLevel",
      a.message_text as "messageText",
      v.watch_time as "watchTime"
    from alert_log a
    join viewing_history v
      on v.viewing_id = a.viewing_id
    join children c
      on c.child_id = v.child_id
    where v.user_id = $1
      and ($2::int is null or v.child_id = $2)
    order by v.watch_time desc, a.alert_id desc
    limit 8`,
    [familyId, selectedChildId],
  )

  const runtimeResult = await pgPool.query(
    'select privacy_consent as "privacyConsent", addiction_monitor_enabled as "addictionMonitorEnabled", updated_at as "updatedAt" from app_runtime_settings where settings_id = 1',
  )

  const childViewings = viewingsResult.rows.filter((item) => item.childId === selectedChildId)
  const peerViewings = viewingsResult.rows.filter((item) => item.childId !== selectedChildId)
  const now = new Date()
  const todayIso = isoDay(now)

  const childProfiles = childrenResult.rows.map((child) => {
    const age = getAgeFromBirthYear(child.birthYear)
    const todayMinutes = round(
      viewingsResult.rows
        .filter((item) => item.childId === child.childId && isoDay(item.watchTime) === todayIso)
        .reduce((sum, item) => sum + Number(item.watchDuration || 0), 0),
      1,
    )
    const dailyLimitMinutes = getDayLimitMinutes(child, now) || child.dailyLimitMinutes || 0
    const remainingMinutes = Math.max(round(dailyLimitMinutes - todayMinutes, 1), 0)

    return {
      childId: child.childId,
      childName: child.childName,
      age,
      schoolLabel: getSchoolLabel(age),
      avatarLetter: String(child.childName || '?').trim().charAt(0).toUpperCase() || '?',
      todayMinutes,
      dailyLimitMinutes,
      remainingMinutes,
      progressPercent: dailyLimitMinutes > 0 ? clamp(Math.round((todayMinutes / dailyLimitMinutes) * 100), 0, 100) : 0,
      autoBlockEnabled: Boolean(child.autoBlockEnabled),
      bedtimeLockEnabled: Boolean(child.bedtimeLockEnabled),
      bedtimeHour: child.bedtimeHour || 21,
      viewingAllowedNow: isViewingAllowedNow(child, todayMinutes, now),
      contentRatingLabel: getContentRatingLabel(age),
    }
  })

  const daily = buildDailySnapshot(childViewings, peerViewings, selectedChild)
  const content = buildContentSnapshot(childViewings, peerViewings, daily.weeklyMinutes)

  let posture = {
    available: false,
    sampleCount: 0,
    sessionCount: 0,
    eventCount: 0,
    landmarkSamples: 0,
    latestCapturedAt: null,
    latestSessionStatus: null,
    latestSessionUpdatedAt: null,
    latestEventType: null,
    latestEventMessage: null,
    smartCamLinked: false,
    focusScore: null,
    riskScore: null,
    postureScore: null,
    averageBlinkBpm: null,
    averageDistanceCm: null,
    frontFacingRatio: null,
    safeDistanceRatio: null,
    stillDurationSeconds: null,
    negativeEmotionRatio: null,
    postureStatusBreakdown: [],
    history: [],
    deviations: [],
    recentMessages: [],
    comparisonBaselineLabel: '권장 기준',
    comparisonBaseline: { postureScore: 75, blinkBpm: 15, distanceCm: 200 },
    note: 'MongoDB 상태를 확인하는 중입니다.',
  }

  try {
    const mongoClient = await getMongoClient()
    const mongoDb = mongoClient.db(process.env.MONGO_DB || 'lgdx_monitor')
    const collections = await mongoDb.listCollections().toArray()
    const names = new Set(collections.map((item) => item.name))

    const sessions = names.has('monitor_sessions')
      ? await mongoDb
          .collection('monitor_sessions')
          .find({ child_id: selectedChildId })
          .sort({ updated_at: -1 })
          .limit(20)
          .toArray()
      : []

    const events = names.has('monitor_events')
      ? await mongoDb
          .collection('monitor_events')
          .find({ child_id: selectedChildId })
          .sort({ occurred_at: -1 })
          .limit(20)
          .toArray()
      : []

    const telemetry = names.has('monitor_telemetry')
      ? await mongoDb
          .collection('monitor_telemetry')
          .find({ child_id: selectedChildId })
          .sort({ captured_at: -1 })
          .limit(500)
          .toArray()
      : []

    const landmarkSamples = names.has('monitor_landmarks')
      ? await mongoDb.collection('monitor_landmarks').countDocuments({ child_id: selectedChildId })
      : 0

    posture = buildTelemetrySummary(telemetry, sessions, events, landmarkSamples)
  } catch (error) {
    posture = {
      ...posture,
      note: `MongoDB telemetry를 읽지 못했습니다. ${error.message}`,
    }
  }

  const allowedCategories = selectedChild?.childId != null
    ? await resolveYoutubeCategoryFilters(selectedChild.childId)
    : YOUTUBE_CATEGORY_OPTIONS.map((category) => ({
        key: category.key,
        name: category.name,
        enabled: Boolean(DEFAULT_YOUTUBE_CATEGORY_SETTINGS[category.key]),
        backedByDatabase: false,
      }))

  return {
    generatedAt: new Date().toISOString(),
    families: familiesResult.rows,
    family: familyResult.rows[0],
    selectedFamilyId: familyId,
    selectedChildId: selectedChild?.childId || null,
    selection: preferenceResult.rows[0] || null,
    child: selectedChild,
    children: childrenResult.rows,
    childProfiles,
    profile: {
      childName: selectedChild?.childName || '아이',
      age: getAgeFromBirthYear(selectedChild?.birthYear),
      schoolLabel: getSchoolLabel(getAgeFromBirthYear(selectedChild?.birthYear)),
      weeklyMinutes: daily.weeklyMinutes,
      averageDailyMinutes: daily.averageDailyMinutes,
      familyName: familyResult.rows[0].familyName,
    },
    summary: {
      weeklyMinutes: daily.weeklyMinutes,
      averageDailyMinutes: daily.averageDailyMinutes,
      peerAverageDailyMinutes: daily.peerAverageDailyMinutes,
      differenceFromPeers: daily.differenceFromPeers,
      latestDayMinutes: daily.latestDayMinutes,
      alertCount: alertsResult.rows.length,
      latestAlert: alertsResult.rows[0] || null,
      sessionCount: childViewings.length,
      topDay: daily.topDay,
    },
    daily,
    content,
    posture,
    settings: {
      dailyLimitMinutes: selectedChild?.dailyLimitMinutes || 120,
      weekdayHours:
        selectedChild != null
          ? `${selectedChild.weekdayStartHour}:00 - ${selectedChild.weekdayEndHour}:00`
          : '-',
      weekendHours:
        selectedChild != null
          ? `${selectedChild.weekendStartHour}:00 - ${selectedChild.weekendEndHour}:00`
          : '-',
      bedtimeLockEnabled: Boolean(selectedChild?.bedtimeLockEnabled),
      bedtimeHour: selectedChild?.bedtimeHour || 21,
      dayLimits: selectedChild != null
        ? [
            { day: '월', limitMinutes: selectedChild.mondayLimitMinutes },
            { day: '화', limitMinutes: selectedChild.tuesdayLimitMinutes },
            { day: '수', limitMinutes: selectedChild.wednesdayLimitMinutes },
            { day: '목', limitMinutes: selectedChild.thursdayLimitMinutes },
            { day: '금', limitMinutes: selectedChild.fridayLimitMinutes },
            { day: '토', limitMinutes: selectedChild.saturdayLimitMinutes },
            { day: '일', limitMinutes: selectedChild.sundayLimitMinutes },
          ]
        : [],
      notificationThreshold: selectedChild?.notificationThreshold || 0,
      autoBlockEnabled: Boolean(selectedChild?.autoBlockEnabled),
      runtime: runtimeResult.rows[0] || null,
      smartCam: {
        linked: posture.smartCamLinked,
        latestStatus: posture.latestSessionStatus,
        latestEventMessage: posture.latestEventMessage,
        sessionCount: posture.sessionCount,
      },
      allowedCategories,
      dbCoverage: {
        dailyLimit: true,
        notificationThreshold: true,
        runtimeSettings: true,
        contentFilter: true,
        bedtimePolicy: true,
        smartCamBinding: false,
      },
      source: preferenceTableExists
        ? '가족 보호의 시청 시간, 취침 잠금, 요일별 제한은 PostgreSQL에서 직접 읽고 있습니다.'
        : '현재 환경은 family_selection_preference 없이 동작하지만, 가족 보호 설정은 PostgreSQL 기준으로 표시됩니다.',
    },
    alerts: alertsResult.rows,
    schemaPlan: {
      existing: [
        'users',
        'children',
        'child_watch_policy',
        'viewing_history',
        'alert_log',
        'app_runtime_settings',
        'monitor_sessions',
        'monitor_events',
      ],
      additionalNeeded: [
        'child_content_preference',
        'child_notification_preference',
        'smartcam_device_binding',
        'monitor_telemetry',
        'monitor_landmarks',
      ],
    },
  }
}

const app = express()
app.use(express.json())
app.use((request, response, next) => {
  response.setHeader('Access-Control-Allow-Origin', '*')
  response.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (request.method === 'OPTIONS') {
    response.status(204).end()
    return
  }
  next()
})

app.get('/api/health', async (_request, response) => {
  try {
    await pgPool.query('select 1')
    response.json({ status: 'ok' })
  } catch (error) {
    response.status(500).json({ status: 'error', message: error.message })
  }
})

app.get('/api/mobile-dashboard', async (request, response) => {
  const familyId = Number(request.query.familyId || 1)
  const childId = request.query.childId ? Number(request.query.childId) : null

  try {
    const payload = await loadDashboard(familyId, childId)
    response.json(payload)
  } catch (error) {
    response.status(500).json({
      status: 'error',
      message: error.message,
    })
  }
})

app.get('/api/youtube-category-filter', async (request, response) => {
  const childId = Number(request.query.childId)

  if (!Number.isFinite(childId) || childId <= 0) {
    response.status(400).json({ status: 'error', message: 'childId is required.' })
    return
  }

  try {
    const filters = await resolveYoutubeCategoryFilters(childId)
    response.json({
      childId,
      categorySettings: Object.fromEntries(filters.map((item) => [item.key, item.enabled])),
      categories: filters,
      updatedAt: filters.reduce((latest, item) => item.updatedAt ?? latest, null),
    })
  } catch (error) {
    response.status(500).json({
      status: 'error',
      message: error.message,
    })
  }
})

app.patch('/api/youtube-category-filter', async (request, response) => {
  const childId = Number(request.body?.childId)
  const categoryId = String(request.body?.categoryId || '').trim()
  const enabled = request.body?.enabled

  if (!Number.isFinite(childId) || childId <= 0) {
    response.status(400).json({ status: 'error', message: 'childId is required.' })
    return
  }
  if (!categoryId) {
    response.status(400).json({ status: 'error', message: 'categoryId is required.' })
    return
  }
  if (typeof enabled !== 'boolean') {
    response.status(400).json({ status: 'error', message: 'enabled must be boolean.' })
    return
  }

  try {
    const filters = await updateYoutubeCategoryFilter(childId, categoryId, enabled)
    response.json({
      childId,
      categorySettings: Object.fromEntries(filters.map((item) => [item.key, item.enabled])),
      categories: filters,
      updatedAt: filters.reduce((latest, item) => item.updatedAt ?? latest, null),
    })
  } catch (error) {
    response.status(500).json({
      status: 'error',
      message: error.message,
    })
  }
})

app.patch('/api/watch-policy', async (request, response) => {
  const { childId, dailyLimitMinutes, bedtimeLockEnabled, bedtimeHour, autoBlockEnabled } = request.body || {}

  if (!childId) {
    response.status(400).json({ status: 'error', message: 'childId is required.' })
    return
  }

  try {
    await pgPool.query(
      `INSERT INTO child_watch_policy (child_id, daily_limit_minutes, bedtime_lock_enabled, bedtime_hour, auto_block_enabled, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (child_id) DO UPDATE SET
         daily_limit_minutes = EXCLUDED.daily_limit_minutes,
         bedtime_lock_enabled = EXCLUDED.bedtime_lock_enabled,
         bedtime_hour = EXCLUDED.bedtime_hour,
         auto_block_enabled = EXCLUDED.auto_block_enabled,
         updated_at = NOW()`,
      [childId, dailyLimitMinutes ?? 120, Boolean(bedtimeLockEnabled), bedtimeHour ?? 21, Boolean(autoBlockEnabled)],
    )
    response.json({ status: 'ok', childId })
  } catch (error) {
    response.status(500).json({ status: 'error', message: error.message })
  }
})

// ── Voice Recording helpers ──────────────────────────────────────────────────

function docToRecMeta(doc) {
  return {
    speakerId: doc.speaker_id,
    speakerName: doc.speaker_name || '이름 없음',
    alertType: doc.alert_type,
    audioDuration: Number(doc.audio_duration || 0),
    audioMime: doc.audio_mime || 'audio/webm',
    enabled: doc.enabled !== false,
    createdAt: doc.created_at,
  }
}

function docToVoiceSettings(doc) {
  return {
    distanceEnabled: doc.distance_enabled !== false,
    blinkEnabled: doc.blink_enabled !== false,
    stretchEnabled: doc.stretch_enabled !== false,
    distanceActiveSpeakerId: doc.distance_active_speaker_id || null,
    blinkActiveSpeakerId: doc.blink_active_speaker_id || null,
    stretchActiveSpeakerId: doc.stretch_active_speaker_id || null,
  }
}

// ── Voice Recordings ─────────────────────────────────────────────────────────

app.get('/api/voice-recordings', async (request, response) => {
  const familyId = Number(request.query.familyId || 1)
  try {
    const mongoClient = await getMongoClient()
    const mongoDb = mongoClient.db(process.env.MONGO_DB || 'lgdx_monitor')
    const docs = await mongoDb.collection('voice_recordings')
      .find({ family_id: familyId }, { projection: { _id: 0, audio_data: 0 } })
      .toArray()
    response.json(docs.map(docToRecMeta))
  } catch (error) {
    response.status(500).json({ message: error.message })
  }
})

app.post('/api/voice-recordings', async (request, response) => {
  const { familyId, speakerId, speakerName, alertType, audioData, audioMime, audioDuration } = request.body || {}
  if (!familyId || !speakerId || !alertType || !audioData) {
    return response.status(400).json({ message: '필수 필드 누락' })
  }
  try {
    const mongoClient = await getMongoClient()
    const mongoDb = mongoClient.db(process.env.MONGO_DB || 'lgdx_monitor')
    const now = new Date().toISOString()
    const doc = {
      family_id: Number(familyId),
      speaker_id: speakerId,
      speaker_name: speakerName || '이름 없음',
      alert_type: alertType,
      audio_data: audioData,
      audio_mime: audioMime || 'audio/webm',
      audio_duration: Number(audioDuration || 0),
      enabled: true,
      created_at: now,
      updated_at: now,
    }
    await mongoDb.collection('voice_recordings').updateOne(
      { family_id: doc.family_id, speaker_id: doc.speaker_id, alert_type: doc.alert_type },
      { $set: doc },
      { upsert: true },
    )
    response.status(201).json(docToRecMeta(doc))
  } catch (error) {
    response.status(500).json({ message: error.message })
  }
})

app.patch('/api/voice-recordings/:speakerId/:alertType', async (request, response) => {
  const { speakerId, alertType } = request.params
  const { familyId, enabled } = request.body || {}
  if (!familyId) return response.status(400).json({ message: 'familyId 필요' })
  try {
    const mongoClient = await getMongoClient()
    const mongoDb = mongoClient.db(process.env.MONGO_DB || 'lgdx_monitor')
    const result = await mongoDb.collection('voice_recordings').updateOne(
      { family_id: Number(familyId), speaker_id: speakerId, alert_type: alertType },
      { $set: { enabled: Boolean(enabled) } },
    )
    if (result.matchedCount === 0) return response.status(404).json({ message: '녹음을 찾을 수 없습니다.' })
    const doc = await mongoDb.collection('voice_recordings').findOne(
      { family_id: Number(familyId), speaker_id: speakerId, alert_type: alertType },
      { projection: { _id: 0, audio_data: 0 } },
    )
    response.json(docToRecMeta(doc))
  } catch (error) {
    response.status(500).json({ message: error.message })
  }
})

app.delete('/api/voice-recordings/:speakerId/:alertType', async (request, response) => {
  const { speakerId, alertType } = request.params
  const familyId = Number(request.query.familyId || 1)
  try {
    const mongoClient = await getMongoClient()
    const mongoDb = mongoClient.db(process.env.MONGO_DB || 'lgdx_monitor')
    const result = await mongoDb.collection('voice_recordings').deleteOne(
      { family_id: familyId, speaker_id: speakerId, alert_type: alertType },
    )
    if (result.deletedCount === 0) return response.status(404).json({ message: '녹음을 찾을 수 없습니다.' })
    response.status(204).end()
  } catch (error) {
    response.status(500).json({ message: error.message })
  }
})

app.get('/api/voice-settings', async (request, response) => {
  const familyId = Number(request.query.familyId || 1)
  try {
    const mongoClient = await getMongoClient()
    const mongoDb = mongoClient.db(process.env.MONGO_DB || 'lgdx_monitor')
    const doc = await mongoDb.collection('voice_alert_settings').findOne(
      { family_id: familyId },
      { projection: { _id: 0 } },
    )
    response.json(doc ? docToVoiceSettings(doc) : {
      distanceEnabled: true, blinkEnabled: true, stretchEnabled: true,
      distanceActiveSpeakerId: null, blinkActiveSpeakerId: null, stretchActiveSpeakerId: null,
    })
  } catch (error) {
    response.status(500).json({ message: error.message })
  }
})

app.put('/api/voice-settings', async (request, response) => {
  const {
    familyId, distanceEnabled, blinkEnabled, stretchEnabled,
    distanceActiveSpeakerId, blinkActiveSpeakerId, stretchActiveSpeakerId,
  } = request.body || {}
  if (!familyId) return response.status(400).json({ message: 'familyId 필요' })
  try {
    const mongoClient = await getMongoClient()
    const mongoDb = mongoClient.db(process.env.MONGO_DB || 'lgdx_monitor')
    const doc = {
      family_id: Number(familyId),
      distance_enabled: distanceEnabled !== false,
      blink_enabled: blinkEnabled !== false,
      stretch_enabled: stretchEnabled !== false,
      distance_active_speaker_id: distanceActiveSpeakerId || null,
      blink_active_speaker_id: blinkActiveSpeakerId || null,
      stretch_active_speaker_id: stretchActiveSpeakerId || null,
      updated_at: new Date().toISOString(),
    }
    await mongoDb.collection('voice_alert_settings').updateOne(
      { family_id: doc.family_id },
      { $set: doc },
      { upsert: true },
    )
    response.json(docToVoiceSettings(doc))
  } catch (error) {
    response.status(500).json({ message: error.message })
  }
})

app.listen(PORT, () => {
  console.log(`UI ThinQ API listening on http://127.0.0.1:${PORT}`)
})
