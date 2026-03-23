import { useCallback, useEffect, useRef, useState } from 'react'
import type { VoiceAlertGroup, VoiceAlertType, VoiceRecordingMeta } from '../lib/api'
import {
  deleteVoiceRecording,
  getVoiceRecordings,
  saveVoiceRecording,
} from '../lib/api'

const FAMILY_ID = 1

type SubType = { type: VoiceAlertType; label: string }

const GROUP_INFO: Record<VoiceAlertGroup, { label: string; icon: string; subTypes: SubType[] }> = {
  distance: {
    label: '시청 거리',
    icon: '📏',
    subTypes: [
      { type: 'distance_near', label: '너무 가까움' },
      { type: 'distance_far', label: '너무 멂' },
    ],
  },
  blink: {
    label: '눈 깜박임',
    icon: '👁️',
    subTypes: [
      { type: 'blink_high', label: '너무 많이 깜박임' },
      { type: 'blink_low', label: '너무 적게 깜박임' },
    ],
  },
  stretch: {
    label: '자세 점수',
    icon: '🧘',
    subTypes: [
      { type: 'stretch', label: '한 자세로 너무 오래 앉아있음' },
    ],
  },
}

type RecordingStep = 'idle' | 'name' | 'recording' | 'preview' | 'saving'

type Props = {
  group: VoiceAlertGroup
  groupEnabled: boolean
  activeSpeakerId: string | null
  onBack: () => void
  onToggleEnabled: (enabled: boolean) => void
  onSetActiveSpeaker: (speakerId: string | null) => void
  onToggleClip: (speakerId: string, alertType: VoiceAlertType, enabled: boolean) => Promise<void>
}

export function VoiceGroupPanel({
  group,
  groupEnabled,
  activeSpeakerId,
  onBack,
  onToggleEnabled,
  onSetActiveSpeaker,
  onToggleClip,
}: Props) {
  const info = GROUP_INFO[group]

  const [recordings, setRecordings] = useState<VoiceRecordingMeta[]>([])
  const [loading, setLoading] = useState(true)

  // 녹음 플로우 상태
  const [activeType, setActiveType] = useState<VoiceAlertType | null>(null)
  const [step, setStep] = useState<RecordingStep>('idle')
  const [speakerName, setSpeakerName] = useState('')
  const [recordingSec, setRecordingSec] = useState(0)
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [blobMime, setBlobMime] = useState('audio/webm')
  const [blobDuration, setBlobDuration] = useState(0)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [previewPlaying, setPreviewPlaying] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<number | null>(null)
  const previewAudioRef = useRef<HTMLAudioElement | null>(null)
  const startTimeRef = useRef<number>(0)

  const reload = useCallback(async () => {
    try {
      const list = await getVoiceRecordings(FAMILY_ID)
      setRecordings(list.filter((r) => info.subTypes.some((s) => s.type === r.alertType)))
    } catch {
      // 오프라인 — 현재 목록 유지
    } finally {
      setLoading(false)
    }
  }, [group]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { void reload() }, [reload])

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current = null
    }
    if (timerRef.current != null) { window.clearInterval(timerRef.current); timerRef.current = null }
    if (blobUrl) URL.revokeObjectURL(blobUrl)
    setBlobUrl(null)
    setSpeakerName('')
    setStep('idle')
    setActiveType(null)
    setErrorMsg(null)
    setPreviewPlaying(false)
    if (previewAudioRef.current) { previewAudioRef.current.pause(); previewAudioRef.current = null }
  }, [blobUrl])

  const startRecording = useCallback(async (_alertType: VoiceAlertType) => {
    setErrorMsg(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mime = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg'
      setBlobMime(mime)
      chunksRef.current = []
      const mr = new MediaRecorder(stream, { mimeType: mime })
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())
        const blob = new Blob(chunksRef.current, { type: mime })
        setBlobUrl(URL.createObjectURL(blob))
        setBlobDuration(Math.round((Date.now() - startTimeRef.current) / 100) / 10)
        setStep('preview')
      }
      mr.start(250)
      mediaRecorderRef.current = mr
      startTimeRef.current = Date.now()
      setRecordingSec(0)
      timerRef.current = window.setInterval(() => setRecordingSec((s) => s + 1), 1000)
      setStep('recording')
    } catch {
      setErrorMsg('마이크 권한이 필요합니다. 브라우저 설정에서 마이크를 허용해 주세요.')
    }
  }, [])

  const stopRecording = useCallback(() => {
    if (timerRef.current != null) { window.clearInterval(timerRef.current); timerRef.current = null }
    mediaRecorderRef.current?.stop()
    mediaRecorderRef.current = null
  }, [])

  const togglePreview = useCallback(() => {
    if (!blobUrl) return
    if (previewAudioRef.current) {
      previewAudioRef.current.pause()
      previewAudioRef.current = null
      setPreviewPlaying(false)
      return
    }
    const audio = new Audio(blobUrl)
    previewAudioRef.current = audio
    audio.onended = () => { previewAudioRef.current = null; setPreviewPlaying(false) }
    void audio.play()
    setPreviewPlaying(true)
  }, [blobUrl])

  const saveRecording = useCallback(async () => {
    if (!blobUrl || !activeType) return
    setStep('saving')
    setErrorMsg(null)
    try {
      const resp = await fetch(blobUrl)
      const blob = await resp.blob()
      const reader = new FileReader()
      reader.onloadend = async () => {
        try {
          const dataUrl = reader.result as string
          const speakerId = `spk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
          await saveVoiceRecording({
            familyId: FAMILY_ID,
            speakerId,
            speakerName: speakerName.trim() || '이름 없음',
            alertType: activeType,
            audioData: dataUrl,
            audioMime: blobMime,
            audioDuration: blobDuration,
          })
          URL.revokeObjectURL(blobUrl)
          setBlobUrl(null)
          setSpeakerName('')
          setStep('idle')
          setActiveType(null)
          await reload()
        } catch {
          setErrorMsg('저장에 실패했습니다. 다시 시도해 주세요.')
          setStep('preview')
        }
      }
      reader.readAsDataURL(blob)
    } catch {
      setErrorMsg('저장에 실패했습니다.')
      setStep('preview')
    }
  }, [blobUrl, blobMime, blobDuration, activeType, speakerName, reload])

  const handleDelete = useCallback(async (speakerId: string, alertType: VoiceAlertType) => {
    await deleteVoiceRecording(FAMILY_ID, speakerId, alertType)
    await reload()
  }, [reload])

  const handleToggleClip = useCallback(async (speakerId: string, alertType: VoiceAlertType, enabled: boolean) => {
    await onToggleClip(speakerId, alertType, enabled)
    await reload()
  }, [onToggleClip, reload])

  const allSpeakers = Array.from(
    new Map(recordings.map((r) => [r.speakerId, r.speakerName])).entries()
  )

  return (
    <div className="vgp-screen">
      {/* 헤더 */}
      <div className="vgp-header">
        <button type="button" className="vgp-back" onClick={() => { cancelRecording(); onBack() }}>
          ← 돌아가기
        </button>
        <div className="vgp-title-row">
          <span className="vgp-title-icon">{info.icon}</span>
          <div>
            <strong className="vgp-title">{info.label} 음성 알림</strong>
            <p className="vgp-subtitle">알림이 뜰 때 이 목소리로 자동 안내해요</p>
          </div>
        </div>
        <button
          type="button"
          className={`tv-toggle${groupEnabled ? ' tv-toggle--on' : ''}`}
          aria-label={`${info.label} 음성 알림 ${groupEnabled ? '끄기' : '켜기'}`}
          onClick={() => onToggleEnabled(!groupEnabled)}
        >
          <span className="tv-toggle-knob" />
        </button>
      </div>

      {/* 화자 선택 */}
      {groupEnabled && allSpeakers.length > 0 && (
        <div className="vgp-speakers">
          <span className="vgp-speakers-label">재생할 목소리</span>
          <div className="vgp-speaker-chips">
            <button
              type="button"
              className={`thinq-voice-chip${activeSpeakerId == null ? ' thinq-voice-chip--active' : ''}`}
              onClick={() => onSetActiveSpeaker(null)}
            >
              랜덤
            </button>
            {allSpeakers.map(([id, name]) => (
              <button
                key={id}
                type="button"
                className={`thinq-voice-chip${activeSpeakerId === id ? ' thinq-voice-chip--active' : ''}`}
                onClick={() => onSetActiveSpeaker(id)}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 알림 유형별 녹음 목록 + 녹음 플로우 */}
      {loading ? (
        <div className="vgp-loading">불러오는 중...</div>
      ) : (
        <div className="vgp-body">
          {info.subTypes.map(({ type: alertType, label: typeLabel }) => {
            const typeRecs = recordings.filter((r) => r.alertType === alertType)
            const isRecordingThis = activeType === alertType
            const canAddNew = step === 'idle' || !isRecordingThis

            return (
              <div key={alertType} className="vgp-type-section">
                <div className="vgp-type-header">
                  <strong className="vgp-type-label">{typeLabel}</strong>
                  <span className="vgp-type-count">
                    {typeRecs.length > 0 ? `${typeRecs.length}개 녹음` : '녹음 없음'}
                  </span>
                </div>

                {/* 기존 녹음 목록 */}
                {typeRecs.length > 0 && (
                  <div className="vgp-rec-list">
                    {typeRecs.map((rec) => (
                      <div key={`${rec.speakerId}-${rec.alertType}`} className="vgp-rec-item">
                        <span className="vgp-rec-name">{rec.speakerName}</span>
                        <span className="vgp-rec-dur">{rec.audioDuration.toFixed(1)}초</span>
                        <button
                          type="button"
                          className={`vgp-rec-toggle${rec.enabled ? ' vgp-rec-toggle--on' : ''}`}
                          onClick={() => void handleToggleClip(rec.speakerId, rec.alertType, !rec.enabled)}
                        >
                          {rec.enabled ? '사용 중' : '꺼짐'}
                        </button>
                        <button
                          type="button"
                          className="vgp-rec-delete"
                          onClick={() => void handleDelete(rec.speakerId, rec.alertType)}
                        >
                          삭제
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* 녹음 플로우 */}
                {canAddNew && (
                  <button
                    type="button"
                    className="vgp-add-btn"
                    onClick={() => { setActiveType(alertType); setStep('name') }}
                  >
                    + 새 목소리 추가
                  </button>
                )}

                {isRecordingThis && step === 'name' && (
                  <div className="vgp-step">
                    <p className="vgp-step-hint">녹음할 사람 이름을 입력해 주세요</p>
                    <input
                      type="text"
                      className="vap-name-input"
                      placeholder="예: 엄마, 아빠"
                      value={speakerName}
                      onChange={(e) => setSpeakerName(e.target.value)}
                      maxLength={20}
                    />
                    <div className="vap-step-actions">
                      <button type="button" className="vap-btn vap-btn--ghost" onClick={cancelRecording}>취소</button>
                      <button
                        type="button"
                        className="vap-btn vap-btn--primary"
                        disabled={!speakerName.trim()}
                        onClick={() => void startRecording(alertType)}
                      >
                        녹음 시작
                      </button>
                    </div>
                    {errorMsg && <p className="vap-error">{errorMsg}</p>}
                  </div>
                )}

                {isRecordingThis && step === 'recording' && (
                  <div className="vgp-step vgp-step--recording">
                    <div className="vap-mic-pulse" />
                    <p className="vap-rec-timer">{recordingSec}초</p>
                    <p className="vgp-step-hint">"{speakerName}" 녹음 중... 버튼을 눌러 완료하세요</p>
                    <button type="button" className="vap-btn vap-btn--danger" onClick={stopRecording}>
                      녹음 완료
                    </button>
                  </div>
                )}

                {isRecordingThis && step === 'preview' && (
                  <div className="vgp-step">
                    <p className="vgp-step-hint">"{speakerName}" 녹음 완료 ({blobDuration}초) — 미리 들어보세요</p>
                    <div className="vap-step-actions">
                      <button type="button" className="vap-btn vap-btn--ghost" onClick={togglePreview}>
                        {previewPlaying ? '⏹ 정지' : '▶ 미리듣기'}
                      </button>
                      <button
                        type="button"
                        className="vap-btn vap-btn--ghost"
                        onClick={() => { setBlobUrl(null); setStep('name') }}
                      >
                        다시 녹음
                      </button>
                      <button type="button" className="vap-btn vap-btn--primary" onClick={() => void saveRecording()}>
                        저장
                      </button>
                    </div>
                    {errorMsg && <p className="vap-error">{errorMsg}</p>}
                  </div>
                )}

                {isRecordingThis && step === 'saving' && (
                  <div className="vgp-step">
                    <p className="vgp-step-hint">저장 중...</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
