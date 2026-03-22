export async function fetchMobileDashboard(familyId, childId) {
  const params = new URLSearchParams({
    familyId: String(familyId),
  })

  if (childId) {
    params.set('childId', String(childId))
  }

  const response = await fetch(`/api/mobile-dashboard?${params.toString()}`)

  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    throw new Error(payload?.message || '모바일 대시보드 데이터를 불러오지 못했습니다.')
  }

  return response.json()
}

export async function updateYoutubeCategoryFilter(childId, categoryId, enabled) {
  const response = await fetch('/api/youtube-category-filter', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      childId,
      categoryId,
      enabled,
    }),
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    throw new Error(payload?.message || '유튜브 카테고리 설정을 저장하지 못했습니다.')
  }

  return response.json()
}

export async function updateWatchPolicy(childId, { dailyLimitMinutes, bedtimeLockEnabled, bedtimeHour, autoBlockEnabled }) {
  const response = await fetch('/api/watch-policy', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ childId, dailyLimitMinutes, bedtimeLockEnabled, bedtimeHour, autoBlockEnabled }),
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    throw new Error(payload?.message || '시청 정책을 저장하지 못했습니다.')
  }

  return response.json()
}

export async function getVoiceRecordings(familyId) {
  const response = await fetch(`/api/voice-recordings?familyId=${familyId}`)
  if (!response.ok) throw new Error('음성 녹음 목록을 불러오지 못했습니다.')
  return response.json()
}

export async function getVoiceSettings(familyId) {
  const response = await fetch(`/api/voice-settings?familyId=${familyId}`)
  if (!response.ok) throw new Error('음성 알림 설정을 불러오지 못했습니다.')
  return response.json()
}

export async function saveVoiceRecording({ familyId, speakerId, speakerName, alertType, audioData, audioMime, audioDuration }) {
  const response = await fetch('/api/voice-recordings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ familyId, speakerId, speakerName, alertType, audioData, audioMime, audioDuration }),
  })
  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    throw new Error(payload?.message || '녹음 저장에 실패했습니다.')
  }
  return response.json()
}

export async function toggleVoiceRecordingEnabled(familyId, speakerId, alertType, enabled) {
  const response = await fetch(`/api/voice-recordings/${encodeURIComponent(speakerId)}/${encodeURIComponent(alertType)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ familyId, enabled }),
  })
  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    throw new Error(payload?.message || '녹음 상태 변경에 실패했습니다.')
  }
  return response.json()
}

export async function deleteVoiceRecording(familyId, speakerId, alertType) {
  const response = await fetch(
    `/api/voice-recordings/${encodeURIComponent(speakerId)}/${encodeURIComponent(alertType)}?familyId=${familyId}`,
    { method: 'DELETE' },
  )
  if (!response.ok && response.status !== 204) {
    const payload = await response.json().catch(() => null)
    throw new Error(payload?.message || '녹음 삭제에 실패했습니다.')
  }
}

export async function saveVoiceSettings(familyId, settings) {
  const response = await fetch('/api/voice-settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ familyId, ...settings }),
  })
  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    throw new Error(payload?.message || '음성 알림 설정 저장에 실패했습니다.')
  }
  return response.json()
}
