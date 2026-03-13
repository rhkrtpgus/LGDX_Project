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
    id: 'guardian',
    label: 'Guardian',
    items: [
      {
        id: 'guardian-report',
        label: 'Trend Report',
        title: 'Guardian trend report',
        description:
          'Review how each period changed against the usual baseline and whether alerts increased or decreased.',
        detailType: 'report',
      },
      {
        id: 'guardian-child',
        label: 'Child Protection',
        title: 'Child protection and camera monitor',
        description:
          'Turn child protection on or off for each child. addiction.py runs only when this toggle and consent are both enabled.',
        detailType: 'childProtect',
      },
    ],
  },
  {
    id: 'system',
    label: 'System',
    items: [
      {
        id: 'system-consent',
        label: 'Consent',
        title: 'Privacy consent and runtime monitor',
        description:
          'Camera-based addiction monitoring needs privacy consent and the runtime monitor switch to be enabled.',
        detailType: 'consent',
      },
      {
        id: 'system-start',
        label: 'Startup',
        title: 'Startup screen',
        description: 'Launcher and quick-entry structure are fixed to the current TV demo flow.',
        detailType: 'placeholder',
      },
    ],
  },
]

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return 'Not available'
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
        <strong>No report</strong>
        <p>There is no baseline report for this period yet.</p>
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
            ? 'No baseline'
            : period.watchDeltaMinutes === 0
              ? 'Stable'
              : period.watchDeltaMinutes > 0
                ? 'Increased'
                : 'Reduced'}
        </span>
      </div>

      <div className="settings-report-card__stats">
        <div>
          <span>Current watch time</span>
          <b>{period.currentWatchMinutes ?? 0} min</b>
        </div>
        <div>
          <span>Usual baseline</span>
          <b>{period.compareTime ?? 0} min</b>
        </div>
        <div>
          <span>Watch delta</span>
          <b>{formatSigned(period.watchDeltaMinutes, ' min')}</b>
        </div>
        <div>
          <span>Watch change</span>
          <b>{formatSigned(period.watchDeltaPercent, '%')}</b>
        </div>
        <div>
          <span>Current alerts</span>
          <b>{period.currentAlertCount ?? 0}</b>
        </div>
        <div>
          <span>Alert delta</span>
          <b className={`settings-report-card__metric settings-report-card__metric--${alertTone}`}>
            {formatSigned(period.alertDeltaCount)}
          </b>
        </div>
      </div>

      <div className="settings-report-card__summary">
        <p>{period.watchSummary ?? 'No watch-time summary available.'}</p>
        <p>{period.alertSummary ?? 'No alert summary available.'}</p>
      </div>
    </article>
  )
}

export function SettingsControlPanel({ onStatusChange }: SettingsControlPanelProps) {
  const [settings, setSettings] = useState<RuntimeSettings | null>(null)
  const [showConsentSheet, setShowConsentSheet] = useState(false)
  const [savingRuntime, setSavingRuntime] = useState(false)
  const [savingProtection, setSavingProtection] = useState(false)
  const [activeSectionId, setActiveSectionId] = useState(settingsSections[0].id)
  const [activeItemId, setActiveItemId] = useState(settingsSections[0].items[0].id)
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
      .catch(() => onStatusChange?.('Could not load runtime settings.'))
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
        onStatusChange?.('Guardian report and child settings were loaded.')
      })
      .catch(() => {
        setMobileReport(null)
        setChildren([])
        setSelectedChildId(null)
        setReportError('Could not load guardian report data.')
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
      onStatusChange?.('Runtime settings could not be updated.')
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
          ? `${selectedChild.childName} child protection was enabled. Camera monitoring can now run when consent is active.`
          : `${selectedChild.childName} child protection was disabled. addiction.py will be skipped for this child.`,
      )
    } catch {
      onStatusChange?.('Child protection could not be updated.')
    } finally {
      setSavingProtection(false)
    }
  }

  return (
    <>
      <section className="settings-os-panel">
        <div className="settings-os-panel__columns">
          <div className="settings-os-panel__section-list">
            <div className="settings-os-panel__title">Settings</div>
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
                      <strong>Privacy consent</strong>
                      <p>{settings.privacyConsent ? 'Granted' : 'Required'}</p>
                    </div>
                    <div className="minimal-core-card">
                      <strong>Runtime camera monitor</strong>
                      <p>{settings.addictionMonitorEnabled ? 'Enabled' : 'Disabled'}</p>
                    </div>
                  </div>

                  <div className="settings-os-detail-card__status">
                    <span className={settings.privacyConsent ? 'is-on' : 'is-off'}>
                      {settings.privacyConsent ? 'Consent ready' : 'Consent needed'}
                    </span>
                    <small>Last updated: {formatDateTime(settings.updatedAt)}</small>
                  </div>

                  <ul className="settings-os-detail-list">
                    <li>`addiction.py` starts only when privacy consent is granted.</li>
                    <li>The runtime monitor toggle can pause camera-based monitoring without revoking consent.</li>
                    <li>Child protection must also be enabled for the selected child profile.</li>
                  </ul>

                  <div className="settings-control-card__actions">
                    <button
                      className="analysis-submit"
                      type="button"
                      disabled={savingRuntime || settings.privacyConsent}
                      onClick={() => setShowConsentSheet(true)}
                    >
                      Grant consent
                    </button>
                    <button
                      className="analysis-link"
                      type="button"
                      disabled={savingRuntime || !settings.privacyConsent}
                      onClick={() =>
                        void patchSettings(
                          { privacyConsent: false, addictionMonitorEnabled: false },
                          'Privacy consent was revoked and camera monitoring was stopped.',
                        )
                      }
                    >
                      Revoke consent
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
                            ? 'Runtime camera monitoring was paused.'
                            : 'Runtime camera monitoring was enabled.',
                        )
                      }
                    >
                      {settings.addictionMonitorEnabled
                        ? 'Pause camera monitor'
                        : 'Enable camera monitor'}
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
                      <option value="">No family</option>
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
                      <option value="">No child</option>
                    )}
                  </select>
                </div>

                {selectedChild ? (
                  <>
                    <div className="settings-control-grid">
                      <div className="minimal-core-card">
                        <strong>Child protection</strong>
                        <p>{selectedChild.watchPolicy.autoBlockEnabled ? 'On' : 'Off'}</p>
                      </div>
                      <div className="minimal-core-card">
                        <strong>Today watch time</strong>
                        <p>{selectedChild.todayWatchMinutes} min</p>
                      </div>
                      <div className="minimal-core-card">
                        <strong>Daily limit</strong>
                        <p>{selectedChild.watchPolicy.dailyLimitMinutes} min</p>
                      </div>
                      <div className="minimal-core-card">
                        <strong>Notification threshold</strong>
                        <p>{selectedChild.watchPolicy.notificationThreshold}</p>
                      </div>
                    </div>

                    <div className="settings-os-detail-card__status">
                      <span className={selectedChild.watchPolicy.autoBlockEnabled ? 'is-on' : 'is-off'}>
                        {selectedChild.watchPolicy.autoBlockEnabled ? 'Protection enabled' : 'Protection disabled'}
                      </span>
                      <small>
                        Policy updated: {formatDateTime(selectedChild.watchPolicy.updatedAt)}
                      </small>
                    </div>

                    <ul className="settings-os-detail-list">
                      <li>
                        Camera monitoring runs only when `privacyConsent`, `addictionMonitorEnabled`, and this child
                        protection switch are all on.
                      </li>
                      <li>
                        When protection is off, FastAPI skips `addiction.py` and no landmark telemetry is stored.
                      </li>
                      <li>
                        When protection is on, `addiction.py` uses the camera and stores telemetry in MongoDB.
                      </li>
                    </ul>

                    <div className="settings-control-card__actions">
                      <button
                        className="analysis-submit"
                        type="button"
                        disabled={savingProtection}
                        onClick={() => void toggleChildProtection(!selectedChild.watchPolicy.autoBlockEnabled)}
                      >
                        {savingProtection
                          ? 'Saving...'
                          : selectedChild.watchPolicy.autoBlockEnabled
                            ? 'Turn protection off'
                            : 'Turn protection on'}
                      </button>
                    </div>
                  </>
                ) : (
                  <p>No child profile is available for this family.</p>
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
                      <option value="">No family</option>
                    )}
                  </select>
                </div>

                <div className="settings-os-detail-card__status">
                  <span className="is-on">Guardian report ready</span>
                  <small>Generated: {formatDateTime(mobileReport?.generatedAt)}</small>
                </div>

                {reportLoading ? <p>Loading guardian report...</p> : null}
                {reportError ? <p className="service-panel__error">{reportError}</p> : null}

                {mobileReport ? (
                  <div className="settings-report-layout">
                    <PeriodCard period={mobileReport.daily} />
                    <PeriodCard period={mobileReport.weekly} />
                    <PeriodCard period={mobileReport.monthly} />
                  </div>
                ) : (
                  !reportLoading && <p>No report is available yet.</p>
                )}
              </div>
            ) : (
              <div className="settings-os-detail-card">
                <div className="minimal-mobile-note">
                  <strong>Reserved area</strong>
                  <p>This tile is kept for the current TV demo structure and can be expanded later.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {showConsentSheet ? (
        <div className="consent-sheet">
          <div className="consent-sheet__card">
            <strong>Privacy consent for camera monitoring</strong>
            <p>
              Granting consent enables camera-based behavior monitoring. If a child profile also has
              protection turned on, `addiction.py` can start and store landmark telemetry in MongoDB.
            </p>
            <div className="consent-sheet__actions">
              <button
                className="analysis-submit"
                type="button"
                onClick={() => {
                  setShowConsentSheet(false)
                  void patchSettings(
                    { privacyConsent: true, addictionMonitorEnabled: true },
                    'Privacy consent was granted and runtime camera monitoring was enabled.',
                  )
                }}
              >
                Agree and continue
              </button>
              <button
                className="analysis-link"
                type="button"
                onClick={() => setShowConsentSheet(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
