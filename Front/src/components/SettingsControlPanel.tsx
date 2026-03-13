import { useEffect, useState } from 'react'
import {
  fetchRuntimeSettings,
  updateRuntimeSettings,
  type RuntimeSettings,
} from '../lib/api'

type SettingsControlPanelProps = {
  onStatusChange?: (message: string) => void
}

export function SettingsControlPanel({ onStatusChange }: SettingsControlPanelProps) {
  const [settings, setSettings] = useState<RuntimeSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showConsentSheet, setShowConsentSheet] = useState(false)

  useEffect(() => {
    void loadSettings()
  }, [])

  async function loadSettings() {
    setLoading(true)
    setError(null)

    try {
      const nextSettings = await fetchRuntimeSettings()
      setSettings(nextSettings)
    } catch {
      setError('설정 정보를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  async function saveSettings(payload: Partial<RuntimeSettings>, statusMessage: string) {
    setSaving(true)
    setError(null)
    onStatusChange?.(statusMessage)

    try {
      const nextSettings = await updateRuntimeSettings(payload)
      setSettings(nextSettings)
      return nextSettings
    } catch {
      setError('설정 저장에 실패했습니다.')
      onStatusChange?.('설정 저장 실패')
      return null
    } finally {
      setSaving(false)
    }
  }

  async function handleConsentAgree() {
    const nextSettings = await saveSettings(
      { privacyConsent: true, addictionMonitorEnabled: true },
      '개인정보 동의와 addiction.py 실행 설정 저장 중',
    )

    if (nextSettings) {
      setShowConsentSheet(false)
      onStatusChange?.('개인정보 동의 완료, addiction.py 실행 켜짐')
    }
  }

  async function handleConsentWithdraw() {
    const nextSettings = await saveSettings(
      { privacyConsent: false },
      '개인정보 동의 철회 저장 중',
    )

    if (nextSettings) {
      onStatusChange?.('개인정보 동의 철회, addiction.py 실행 꺼짐')
    }
  }

  async function handleToggleAddiction() {
    if (!settings) {
      return
    }

    if (!settings.privacyConsent) {
      setShowConsentSheet(true)
      return
    }

    const nextSettings = await saveSettings(
      { addictionMonitorEnabled: !settings.addictionMonitorEnabled },
      settings.addictionMonitorEnabled
        ? 'addiction.py 실행 끄는 중'
        : 'addiction.py 실행 켜는 중',
    )

    if (nextSettings) {
      onStatusChange?.(
        nextSettings.addictionMonitorEnabled
          ? 'addiction.py 실행이 켜졌습니다.'
          : 'addiction.py 실행이 꺼졌습니다.',
      )
    }
  }

  return (
    <section className="service-panel">
      <div className="service-panel__header">
        <span className="section-heading__eyebrow">설정 제어 패널</span>
        <h2>개인정보 동의 및 addiction.py 실행 관리</h2>
        <p>
          YouTube 분석 흐름에서 추가 모니터링 기능은 개인정보 수집 동의가 있어야만 켤 수
          있습니다. 동의를 철회하면 관련 실행도 즉시 꺼집니다.
        </p>
      </div>

      {loading ? <p className="service-panel__empty">설정 정보를 불러오는 중입니다.</p> : null}
      {error ? <p className="service-panel__error">{error}</p> : null}

      {settings ? (
        <div className="settings-control-grid">
          <article className="settings-control-card">
            <span className="settings-control-card__eyebrow">1단계</span>
            <strong>개인정보 수집 동의</strong>
            <p>얼굴, 시청 패턴, 추가 모니터링 관련 처리를 허용할지 먼저 결정합니다.</p>
            <div className="settings-control-card__status">
              <span className={settings.privacyConsent ? 'is-on' : 'is-off'}>
                {settings.privacyConsent ? '동의 완료' : '동의 필요'}
              </span>
              <small>
                마지막 변경:{' '}
                {settings.updatedAt
                  ? new Date(settings.updatedAt).toLocaleString('ko-KR')
                  : '기록 없음'}
              </small>
            </div>
            <div className="settings-control-card__actions">
              <button
                className="analysis-submit"
                type="button"
                disabled={saving || settings.privacyConsent}
                onClick={() => setShowConsentSheet(true)}
              >
                동의하기
              </button>
              <button
                className="analysis-link"
                type="button"
                disabled={saving || !settings.privacyConsent}
                onClick={handleConsentWithdraw}
              >
                동의 철회
              </button>
            </div>
          </article>

          <article className="settings-control-card">
            <span className="settings-control-card__eyebrow">2단계</span>
            <strong>addiction.py 실행</strong>
            <p>
              현재 서버에서는 YouTube 중심 흐름에 맞춰 `Models/addiction.py`를 안전한
              메타데이터 점검 모드로 실행합니다.
            </p>
            <div className="settings-control-card__status">
              <span className={settings.addictionMonitorEnabled ? 'is-on' : 'is-off'}>
                {settings.addictionMonitorEnabled ? '실행 켜짐' : '실행 꺼짐'}
              </span>
              <small>개인정보 동의 {settings.privacyConsent ? '완료' : '없음'}</small>
            </div>
            <div className="settings-control-card__actions">
              <button
                className="analysis-submit"
                type="button"
                disabled={saving}
                onClick={handleToggleAddiction}
              >
                {settings.addictionMonitorEnabled ? '실행 끄기' : '실행 켜기'}
              </button>
            </div>
          </article>
        </div>
      ) : null}

      {showConsentSheet ? (
        <div className="consent-sheet" role="dialog" aria-modal="true">
          <div className="consent-sheet__card">
            <span className="section-heading__eyebrow">개인정보 수집 동의</span>
            <strong>addiction.py 실행 전에 동의가 필요합니다.</strong>
            <p>
              추가 모니터링은 개인정보 처리 가능성이 있어 동의 후에만 켤 수 있습니다.
              동의하면 설정에서 바로 `addiction.py` 실행이 켜집니다.
            </p>
            <div className="consent-sheet__actions">
              <button
                className="analysis-submit"
                type="button"
                disabled={saving}
                onClick={handleConsentAgree}
              >
                동의하고 켜기
              </button>
              <button
                className="analysis-link"
                type="button"
                disabled={saving}
                onClick={() => setShowConsentSheet(false)}
              >
                취소
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
