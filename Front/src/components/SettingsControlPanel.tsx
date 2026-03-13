import { useEffect, useMemo, useState } from 'react'
import {
  fetchMobileReport,
  fetchReportFamilies,
  fetchRuntimeSettings,
  updateRuntimeSettings,
  type MobileReport,
  type ReportFamily,
  type RuntimeSettings,
} from '../lib/api'

type SettingsControlPanelProps = {
  onStatusChange?: (message: string) => void
}

type SettingsItem = {
  id: string
  label: string
  title: string
  description: string
  detailType: 'placeholder' | 'consent' | 'report'
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
        id: 'notice-latest',
        label: '최신 공지',
        title: '최신 공지',
        description: '서비스 변경과 연동 상태를 TV 화면에서 확인합니다.',
        detailType: 'placeholder',
      },
      {
        id: 'notice-mobile',
        label: '모바일 리포트',
        title: '모바일 리포트',
        description: '가족별 일간, 주간, 월간 리포트를 바로 확인합니다.',
        detailType: 'report',
      },
    ],
  },
  {
    id: 'child-protect',
    label: '자녀 보호 설정',
    items: [
      {
        id: 'protect-time',
        label: '시청 시간 설정',
        title: '시청 시간 설정',
        description: '시청 시간 정책과 알림 기준은 보호자 리포트와 함께 관리됩니다.',
        detailType: 'placeholder',
      },
      {
        id: 'protect-report',
        label: '보호자 리포트',
        title: '보호자 리포트',
        description: '가족별 리포트 요약을 이 화면에서 바로 확인합니다.',
        detailType: 'report',
      },
    ],
  },
  {
    id: 'channel',
    label: '채널 설정',
    items: [
      {
        id: 'channel-favorite',
        label: '즐겨찾기 채널',
        title: '즐겨찾기 채널',
        description: '영화와 방송 화면에서 자주 보는 항목을 우선 노출하는 영역입니다.',
        detailType: 'placeholder',
      },
      {
        id: 'channel-live',
        label: '실시간 방송',
        title: '실시간 방송',
        description: '라이브 채널 구성은 영화/TV방송 페이지와 함께 동작합니다.',
        detailType: 'placeholder',
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
        description: '카메라 기반 시청 행동 분석과 유튜브 보호 기능 연동에 필요한 동의입니다.',
        detailType: 'consent',
      },
      {
        id: 'system-startup',
        label: '시작 화면 설정',
        title: '시작 화면 설정',
        description: '현재 TV 첫 화면은 하단 런처 중심 구조로 고정돼 있습니다.',
        detailType: 'placeholder',
      },
      {
        id: 'system-update',
        label: '소프트웨어 업데이트',
        title: '소프트웨어 업데이트',
        description: '백엔드와 모델 서버 연결 상태를 기준으로 관리합니다.',
        detailType: 'placeholder',
      },
    ],
  },
  {
    id: 'av',
    label: '화면/음성 출력 설정',
    items: [
      {
        id: 'av-screen',
        label: '화면 모드',
        title: '화면 모드',
        description: '현재 UI는 TV 홈 레이아웃에 맞춘 화면 모드로 동작합니다.',
        detailType: 'placeholder',
      },
      {
        id: 'av-audio',
        label: '오디오 출력',
        title: '오디오 출력',
        description: '오디오 장치와 출력 설정은 다음 단계에서 연결할 예정입니다.',
        detailType: 'placeholder',
      },
    ],
  },
  {
    id: 'connect',
    label: 'TV와 앱 연결',
    items: [
      {
        id: 'connect-mobile',
        label: '모바일 앱 연동',
        title: '모바일 앱 연동',
        description: '보호자용 모바일 리포트와 TV 상태를 연결하는 영역입니다.',
        detailType: 'placeholder',
      },
      {
        id: 'connect-account',
        label: '연결 상태',
        title: '연결 상태',
        description: 'TV 분석과 모바일 리포트 흐름의 연결 상태를 확인합니다.',
        detailType: 'placeholder',
      },
    ],
  },
]

export function SettingsControlPanel({ onStatusChange }: SettingsControlPanelProps) {
  const [settings, setSettings] = useState<RuntimeSettings | null>(null)
  const [showConsentSheet, setShowConsentSheet] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeSectionId, setActiveSectionId] = useState('system')
  const [activeItemId, setActiveItemId] = useState('system-consent')
  const [reportFamilies, setReportFamilies] = useState<ReportFamily[]>([])
  const [selectedFamilyId, setSelectedFamilyId] = useState<number | null>(null)
  const [mobileReport, setMobileReport] = useState<MobileReport | null>(null)
  const [reportLoading, setReportLoading] = useState(false)
  const [reportError, setReportError] = useState<string | null>(null)

  useEffect(() => {
    fetchRuntimeSettings()
      .then(setSettings)
      .catch(() => {
        onStatusChange?.('동의 상태를 불러오지 못했습니다.')
      })
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
        setMobileReport(null)
      })
  }, [])

  useEffect(() => {
    if (!selectedFamilyId) {
      setMobileReport(null)
      return
    }

    setReportLoading(true)
    setReportError(null)

    fetchMobileReport(selectedFamilyId)
      .then((report) => {
        setMobileReport(report)
        onStatusChange?.('리포트 데이터를 불러왔습니다.')
      })
      .catch(() => {
        setMobileReport(null)
        setReportError('리포트 정보를 불러오지 못했습니다.')
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

  useEffect(() => {
    if (!activeSection.items.some((item) => item.id === activeItemId)) {
      setActiveItemId(activeSection.items[0]?.id ?? '')
    }
  }, [activeSection, activeItemId])

  async function patchSettings(payload: Partial<RuntimeSettings>, message: string) {
    setSaving(true)
    try {
      const next = await updateRuntimeSettings(payload)
      setSettings(next)
      onStatusChange?.(message)
    } catch {
      onStatusChange?.('동의 상태 저장에 실패했습니다.')
    } finally {
      setSaving(false)
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
                  <div className="settings-os-detail-card__status">
                    <span className={settings.privacyConsent ? 'is-on' : 'is-off'}>
                      {settings.privacyConsent ? '동의 완료' : '동의 필요'}
                    </span>
                    <small>
                      마지막 갱신:{' '}
                      {settings.updatedAt
                        ? new Date(settings.updatedAt).toLocaleString('ko-KR')
                        : '없음'}
                    </small>
                  </div>

                  <ul className="settings-os-detail-list">
                    <li>유튜브 보호 분석과 행동 분석 연동에 사용됩니다.</li>
                    <li>동의를 철회하면 관련 분석 실행도 함께 중지됩니다.</li>
                    <li>상세 리포트와 시청 기록은 연동된 보고 화면에서 확인합니다.</li>
                  </ul>

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
                      onClick={() =>
                        void patchSettings(
                          { privacyConsent: false, addictionMonitorEnabled: false },
                          '개인정보 수집 동의를 철회했습니다.',
                        )
                      }
                    >
                      동의 철회
                    </button>
                  </div>
                </div>
              ) : null
            ) : activeItem.detailType === 'report' ? (
              <div className="settings-os-detail-card">
                <div className="settings-os-detail-card__status">
                  <span className="is-on">리포트 연동</span>
                  <small>
                    최신 생성:{' '}
                    {mobileReport?.generatedAt
                      ? new Date(mobileReport.generatedAt).toLocaleString('ko-KR')
                      : '없음'}
                  </small>
                </div>

                <div className="settings-control-card__actions">
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

                {reportLoading ? <p>리포트를 불러오는 중입니다.</p> : null}
                {reportError ? <p className="service-panel__error">{reportError}</p> : null}

                {mobileReport ? (
                  <>
                    <div className="report-grid">
                      <div>
                        <span>일간</span>
                        <b>{mobileReport.daily?.countAlertType ?? 0}건</b>
                      </div>
                      <div>
                        <span>주간</span>
                        <b>{mobileReport.weekly?.countAlertType ?? 0}건</b>
                      </div>
                      <div>
                        <span>월간</span>
                        <b>{mobileReport.monthly?.countAlertType ?? 0}건</b>
                      </div>
                    </div>

                    <ul className="settings-os-detail-list">
                      <li>가족명: {mobileReport.familyName}</li>
                      <li>일간 비교 시간: {mobileReport.daily?.compareTime ?? 0}분</li>
                      <li>주간 비교 시간: {mobileReport.weekly?.compareTime ?? 0}분</li>
                      <li>월간 비교 시간: {mobileReport.monthly?.compareTime ?? 0}분</li>
                    </ul>
                  </>
                ) : (
                  !reportLoading && <p>표시할 리포트 데이터가 없습니다.</p>
                )}
              </div>
            ) : (
              <div className="settings-os-detail-card">
                <div className="minimal-mobile-note">
                  <strong>준비 중이거나 다른 화면에서 제공되는 메뉴입니다.</strong>
                  <p>
                    이 항목은 TV OS 레이아웃을 맞추기 위해 배치했고, 실제 보호 기능은 TV 또는
                    연결된 리포트 화면에서 확인하도록 정리해두었습니다.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {showConsentSheet ? (
        <div className="consent-sheet">
          <div className="consent-sheet__card">
            <strong>개인정보 수집 및 행동 분석 동의</strong>
            <p>
              시청 거리, 자세, 시선 관련 행동 분석 정보를 처리합니다. 동의하면 유튜브 분석과
              보호 기능이 함께 연동됩니다.
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
