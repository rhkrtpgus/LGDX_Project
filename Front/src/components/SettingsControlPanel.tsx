import { useEffect, useMemo, useState } from 'react'
import {
  fetchMobileReport,
  fetchParentChildren,
  fetchReportFamilies,
  fetchRuntimeSettings,
  updateChildWatchPolicy,
  updateRuntimeSettings,
  type MobileReport,
  type ParentChild,
  type ReportFamily,
  type ReportPeriod,
  type RuntimeSettings,
} from '../lib/api'

type SettingsControlPanelProps = {
  onStatusChange?: (message: string) => void
}

type DetailType = 'consent' | 'report' | 'childProtect' | 'placeholder'

type SettingsItem = {
  id: string
  label: string
  title: string
  description: string
  detailType: DetailType
}

type SettingsSection = {
  id: string
  label: string
  items: SettingsItem[]
}

const settingsSections: SettingsSection[] = [
  {
    id: 'notice',
    label: '공지사항',
    items: [
      {
        id: 'notice-mobile',
        label: '보호자 리포트',
        title: '보호자 리포트',
        description: '평소 시청 패턴과 비교해 얼마나 변했는지 일간, 주간, 월간 단위로 확인합니다.',
        detailType: 'report',
      },
      {
        id: 'notice-child',
        label: '자녀 보호 설정',
        title: '자녀 보호 설정',
        description:
          '자녀 보호 설정을 켜고 끄며, 설정이 켜진 자녀만 카메라 기반 모니터링이 연동됩니다.',
        detailType: 'childProtect',
      },
    ],
  },
  {
    id: 'system',
    label: '시스템 설정',
    items: [
      {
        id: 'system-consent',
        label: '개인정보 수집 동의',
        title: '개인정보 수집 및 행동 분석 동의',
        description: '카메라 기반 시청 행동 분석과 보호 기능 연동에 필요한 동의와 실행 상태입니다.',
        detailType: 'consent',
      },
      {
        id: 'system-start',
        label: '시작 화면 설정',
        title: '시작 화면 설정',
        description: '현재 TV 첫 화면은 하단 런처 중심 구조로 고정돼 있습니다.',
        detailType: 'placeholder',
      },
    ],
  },
]

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return '없음'
  }

  return new Date(value).toLocaleString('ko-KR')
}

function formatSigned(value: number | null | undefined, unit = '') {
  if (value == null) {
    return '-'
  }

  const prefix = value > 0 ? '+' : ''
  return `${prefix}${value}${unit}`
}

function buildTrendTone(value: number | null | undefined) {
  if (value == null || value === 0) {
    return 'idle'
  }

  return value > 0 ? 'up' : 'down'
}

function PeriodCard({ period }: { period: ReportPeriod | null }) {
  if (!period) {
    return (
      <article className="settings-report-card">
        <strong>리포트 없음</strong>
        <p>아직 이 기간의 기준 데이터가 없습니다.</p>
      </article>
    )
  }

  const watchTone = buildTrendTone(period.watchDeltaMinutes)
  const alertTone = buildTrendTone(period.alertDeltaCount)

  return (
    <article className="settings-report-card">
      <div className="settings-report-card__header">
        <strong>{period.period}</strong>
        <span className={`settings-report-card__tone settings-report-card__tone--${watchTone}`}>
          {period.watchDeltaMinutes == null
            ? '기준 없음'
            : period.watchDeltaMinutes === 0
              ? '변화 없음'
              : period.watchDeltaMinutes > 0
                ? '증가'
                : '감소'}
        </span>
      </div>

      <div className="settings-report-card__stats">
        <div>
          <span>현재 시청 시간</span>
          <b>{period.currentWatchMinutes ?? 0}분</b>
        </div>
        <div>
          <span>평소 기준</span>
          <b>{period.compareTime ?? 0}분</b>
        </div>
        <div>
          <span>시청 시간 변화</span>
          <b>{formatSigned(period.watchDeltaMinutes, '분')}</b>
        </div>
        <div>
          <span>변화율</span>
          <b>{formatSigned(period.watchDeltaPercent, '%')}</b>
        </div>
        <div>
          <span>현재 경고 수</span>
          <b>{period.currentAlertCount ?? 0}건</b>
        </div>
        <div>
          <span>경고 변화</span>
          <b className={`settings-report-card__metric settings-report-card__metric--${alertTone}`}>
            {formatSigned(period.alertDeltaCount, '건')}
          </b>
        </div>
      </div>

      <div className="settings-report-card__summary">
        <p>{period.watchSummary ?? '시청 시간 요약 정보가 없습니다.'}</p>
        <p>{period.alertSummary ?? '경고 요약 정보가 없습니다.'}</p>
      </div>
    </article>
  )
}

export function SettingsControlPanel({ onStatusChange }: SettingsControlPanelProps) {
  const [settings, setSettings] = useState<RuntimeSettings | null>(null)
  const [showConsentSheet, setShowConsentSheet] = useState(false)
  const [savingRuntime, setSavingRuntime] = useState(false)
  const [savingProtection, setSavingProtection] = useState(false)
  const [activeSectionId, setActiveSectionId] = useState(settingsSections[1].id)
  const [activeItemId, setActiveItemId] = useState(settingsSections[1].items[0].id)
  const [reportFamilies, setReportFamilies] = useState<ReportFamily[]>([])
  const [selectedFamilyId, setSelectedFamilyId] = useState<number | null>(null)
  const [children, setChildren] = useState<ParentChild[]>([])
  const [selectedChildId, setSelectedChildId] = useState<number | null>(null)
  const [mobileReport, setMobileReport] = useState<MobileReport | null>(null)
  const [reportLoading, setReportLoading] = useState(false)
  const [reportError, setReportError] = useState<string | null>(null)

  useEffect(() => {
    fetchRuntimeSettings()
      .then(setSettings)
      .catch(() => onStatusChange?.('설정 정보를 불러오지 못했습니다.'))
  }, [onStatusChange])

  useEffect(() => {
    fetchReportFamilies()
      .then((families) => {
        setReportFamilies(families)
        setSelectedFamilyId((current) => current ?? families[0]?.familyId ?? null)
      })
      .catch(() => {
        setReportFamilies([])
        setSelectedFamilyId(null)
      })
  }, [])

  useEffect(() => {
    if (!selectedFamilyId) {
      setChildren([])
      setSelectedChildId(null)
      setMobileReport(null)
      return
    }

    setReportLoading(true)
    setReportError(null)

    void Promise.all([
      fetchMobileReport(selectedFamilyId),
      fetchParentChildren(selectedFamilyId),
    ])
      .then(([report, nextChildren]) => {
        setMobileReport(report)
        setChildren(nextChildren)
        setSelectedChildId((current) => current ?? nextChildren[0]?.childId ?? null)
        onStatusChange?.('보호자 리포트와 자녀 보호 설정을 불러왔습니다.')
      })
      .catch(() => {
        setMobileReport(null)
        setChildren([])
        setSelectedChildId(null)
        setReportError('보호자 리포트 정보를 불러오지 못했습니다.')
      })
      .finally(() => {
        setReportLoading(false)
      })
  }, [onStatusChange, selectedFamilyId])

  const activeSection = useMemo(
    () => settingsSections.find((section) => section.id === activeSectionId) ?? settingsSections[0],
    [activeSectionId],
  )

  const activeItem =
    activeSection.items.find((item) => item.id === activeItemId) ?? activeSection.items[0]

  const selectedChild =
    children.find((child) => child.childId === selectedChildId) ?? children[0] ?? null

  useEffect(() => {
    if (!activeSection.items.some((item) => item.id === activeItemId)) {
      setActiveItemId(activeSection.items[0]?.id ?? '')
    }
  }, [activeItemId, activeSection])

  async function patchSettings(payload: Partial<RuntimeSettings>, message: string) {
    setSavingRuntime(true)
    try {
      const next = await updateRuntimeSettings(payload)
      setSettings(next)
      onStatusChange?.(message)
    } catch {
      onStatusChange?.('시스템 설정 저장에 실패했습니다.')
    } finally {
      setSavingRuntime(false)
    }
  }

  async function toggleChildProtection(nextEnabled: boolean) {
    if (!selectedChild) {
      return
    }

    setSavingProtection(true)
    try {
      const nextPolicy = await updateChildWatchPolicy({
        childId: selectedChild.childId,
        autoBlockEnabled: nextEnabled,
      })

      setChildren((current) =>
        current.map((child) =>
          child.childId === selectedChild.childId
            ? {
                ...child,
                watchPolicy: {
                  ...child.watchPolicy,
                  autoBlockEnabled: nextPolicy.autoBlockEnabled,
                  updatedAt: nextPolicy.updatedAt,
                },
              }
            : child,
        ),
      )

      onStatusChange?.(
        nextEnabled
          ? `${selectedChild.childName} 자녀 보호 설정을 켰습니다.`
          : `${selectedChild.childName} 자녀 보호 설정을 껐습니다.`,
      )
    } catch {
      onStatusChange?.('자녀 보호 설정 저장에 실패했습니다.')
    } finally {
      setSavingProtection(false)
    }
  }

  return (
    <>
      <section className="settings-os-panel">
        <div className="settings-os-panel__columns">
          <div className="settings-os-panel__section-list">
            <div className="settings-os-panel__title">설정</div>
            {settingsSections.map((section) => (
              <button
                key={section.id}
                type="button"
                className={`settings-os-section ${section.id === activeSection.id ? 'is-active' : ''}`}
                onClick={() => {
                  setActiveSectionId(section.id)
                  setActiveItemId(section.items[0]?.id ?? '')
                }}
              >
                {section.label}
              </button>
            ))}
          </div>

          <div className="settings-os-panel__item-list">
            {activeSection.items.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`settings-os-item ${item.id === activeItem.id ? 'is-active' : ''}`}
                onClick={() => setActiveItemId(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="settings-os-panel__detail">
            <span className="settings-os-panel__eyebrow">{activeSection.label}</span>
            <h2>{activeItem.title}</h2>
            <p>{activeItem.description}</p>

            {activeItem.detailType === 'consent' ? (
              settings ? (
                <div className="settings-os-detail-card">
                  <div className="settings-control-grid">
                    <div className="minimal-core-card">
                      <strong>개인정보 수집 동의</strong>
                      <p>{settings.privacyConsent ? '동의 완료' : '동의 필요'}</p>
                    </div>
                    <div className="minimal-core-card">
                      <strong>카메라 모니터 실행</strong>
                      <p>{settings.addictionMonitorEnabled ? '실행 중' : '중지됨'}</p>
                    </div>
                  </div>

                  <div className="settings-os-detail-card__status">
                    <span className={settings.privacyConsent ? 'is-on' : 'is-off'}>
                      {settings.privacyConsent ? '동의 완료' : '동의 필요'}
                    </span>
                    <small>마지막 갱신: {formatDateTime(settings.updatedAt)}</small>
                  </div>

                  <ul className="settings-os-detail-list">
                    <li>개인정보 수집 동의가 있어야 `addiction.py`가 실행됩니다.</li>
                    <li>카메라 모니터 실행을 끄면 동의를 유지한 채 모니터링만 중지할 수 있습니다.</li>
                    <li>선택한 자녀의 보호 설정이 켜져 있어야 실제 모니터링이 연동됩니다.</li>
                  </ul>

                  <div className="settings-control-card__actions">
                    <button
                      className="analysis-submit"
                      type="button"
                      disabled={savingRuntime || settings.privacyConsent}
                      onClick={() => setShowConsentSheet(true)}
                    >
                      동의하기
                    </button>
                    <button
                      className="analysis-link"
                      type="button"
                      disabled={savingRuntime || !settings.privacyConsent}
                      onClick={() =>
                        void patchSettings(
                          { privacyConsent: false, addictionMonitorEnabled: false },
                          '개인정보 수집 동의를 철회했습니다.',
                        )
                      }
                    >
                      동의 철회
                    </button>
                    <button
                      className="analysis-link"
                      type="button"
                      disabled={savingRuntime || !settings.privacyConsent}
                      onClick={() =>
                        void patchSettings(
                          {
                            addictionMonitorEnabled: !settings.addictionMonitorEnabled,
                          },
                          settings.addictionMonitorEnabled
                            ? '카메라 모니터 실행을 중지했습니다.'
                            : '카메라 모니터 실행을 시작했습니다.',
                        )
                      }
                    >
                      {settings.addictionMonitorEnabled ? '모니터 중지' : '모니터 실행'}
                    </button>
                  </div>
                </div>
              ) : null
            ) : activeItem.detailType === 'childProtect' ? (
              <div className="settings-os-detail-card">
                <div className="settings-inline-selects">
                  <select
                    className="analysis-input analysis-input--compact"
                    value={selectedFamilyId ?? ''}
                    onChange={(event) => setSelectedFamilyId(Number(event.target.value))}
                  >
                    {reportFamilies.length > 0 ? (
                      reportFamilies.map((family) => (
                        <option key={family.familyId} value={family.familyId}>
                          {family.familyName}
                        </option>
                      ))
                    ) : (
                      <option value="">연결된 가족 없음</option>
                    )}
                  </select>

                  <select
                    className="analysis-input analysis-input--compact"
                    value={selectedChild?.childId ?? ''}
                    onChange={(event) => setSelectedChildId(Number(event.target.value))}
                  >
                    {children.length > 0 ? (
                      children.map((child) => (
                        <option key={child.childId} value={child.childId}>
                          {child.childName}
                        </option>
                      ))
                    ) : (
                      <option value="">연결된 자녀 없음</option>
                    )}
                  </select>
                </div>

                {selectedChild ? (
                  <>
                    <div className="settings-control-grid">
                      <div className="minimal-core-card">
                        <strong>자녀 보호</strong>
                        <p>{selectedChild.watchPolicy.autoBlockEnabled ? '켜짐' : '꺼짐'}</p>
                      </div>
                      <div className="minimal-core-card">
                        <strong>오늘 시청 시간</strong>
                        <p>{selectedChild.todayWatchMinutes}분</p>
                      </div>
                      <div className="minimal-core-card">
                        <strong>일일 제한 시간</strong>
                        <p>{selectedChild.watchPolicy.dailyLimitMinutes}분</p>
                      </div>
                      <div className="minimal-core-card">
                        <strong>알림 기준</strong>
                        <p>{selectedChild.watchPolicy.notificationThreshold}</p>
                      </div>
                    </div>

                    <div className="settings-os-detail-card__status">
                      <span className={selectedChild.watchPolicy.autoBlockEnabled ? 'is-on' : 'is-off'}>
                        {selectedChild.watchPolicy.autoBlockEnabled ? '자녀 보호 실행 중' : '자녀 보호 꺼짐'}
                      </span>
                      <small>마지막 갱신: {formatDateTime(selectedChild.watchPolicy.updatedAt)}</small>
                    </div>

                    <ul className="settings-os-detail-list">
                      <li>개인정보 수집 동의, 카메라 모니터 실행, 자녀 보호 설정이 모두 켜져야 모니터링이 실행됩니다.</li>
                      <li>자녀 보호 설정이 꺼져 있으면 `addiction.py`를 실행하지 않고 랜드마크도 저장하지 않습니다.</li>
                      <li>자녀 보호 설정이 켜져 있으면 카메라 모니터링과 MongoDB 저장 흐름이 함께 동작합니다.</li>
                    </ul>

                    <div className="settings-control-card__actions">
                      <button
                        className="analysis-submit"
                        type="button"
                        disabled={savingProtection}
                        onClick={() => void toggleChildProtection(!selectedChild.watchPolicy.autoBlockEnabled)}
                      >
                        {savingProtection
                          ? '저장 중...'
                          : selectedChild.watchPolicy.autoBlockEnabled
                            ? '자녀 보호 끄기'
                            : '자녀 보호 켜기'}
                      </button>
                    </div>
                  </>
                ) : (
                  <p>이 가족에 연결된 자녀 프로필이 없습니다.</p>
                )}
              </div>
            ) : activeItem.detailType === 'report' ? (
              <div className="settings-os-detail-card">
                <div className="settings-inline-selects">
                  <select
                    className="analysis-input analysis-input--compact"
                    value={selectedFamilyId ?? ''}
                    onChange={(event) => setSelectedFamilyId(Number(event.target.value))}
                  >
                    {reportFamilies.length > 0 ? (
                      reportFamilies.map((family) => (
                        <option key={family.familyId} value={family.familyId}>
                          {family.familyName}
                        </option>
                      ))
                    ) : (
                      <option value="">연결된 가족 없음</option>
                    )}
                  </select>
                </div>

                <div className="settings-os-detail-card__status">
                  <span className="is-on">리포트 연동</span>
                  <small>최신 생성: {formatDateTime(mobileReport?.generatedAt)}</small>
                </div>

                {reportLoading ? <p>리포트를 불러오는 중입니다.</p> : null}
                {reportError ? <p className="service-panel__error">{reportError}</p> : null}

                {mobileReport ? (
                  <div className="settings-report-layout">
                    <PeriodCard period={mobileReport.daily} />
                    <PeriodCard period={mobileReport.weekly} />
                    <PeriodCard period={mobileReport.monthly} />
                  </div>
                ) : (
                  !reportLoading && <p>표시할 리포트 데이터가 없습니다.</p>
                )}
              </div>
            ) : (
              <div className="settings-os-detail-card">
                <div className="minimal-mobile-note">
                  <strong>준비 중이거나 다른 화면에서 제공되는 메뉴입니다.</strong>
                  <p>현재 TV 화면 구조에 맞춰 유지하는 영역이며, 필요하면 다음 단계에서 확장할 수 있습니다.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {showConsentSheet ? (
        <div className="consent-sheet">
          <div className="consent-sheet__card">
            <strong>개인정보 수집 및 카메라 모니터링 동의</strong>
            <p>
              동의하면 카메라 기반 시청 행동 분석을 사용할 수 있습니다. 선택한 자녀의 보호 설정까지 켜져 있으면
              `addiction.py`가 실행되고 MongoDB에 랜드마크 텔레메트리 저장 흐름이 연결됩니다.
            </p>
            <div className="consent-sheet__actions">
              <button
                className="analysis-submit"
                type="button"
                onClick={() => {
                  setShowConsentSheet(false)
                  void patchSettings(
                    { privacyConsent: true, addictionMonitorEnabled: true },
                    '개인정보 수집 동의를 저장했습니다.',
                  )
                }}
              >
                동의하고 계속
              </button>
              <button className="analysis-link" type="button" onClick={() => setShowConsentSheet(false)}>
                취소
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
