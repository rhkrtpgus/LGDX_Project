import { useEffect, useState } from 'react'
import {
  fetchMobileReport,
  fetchParentOverview,
  fetchReportFamilies,
  fetchViewingHistory,
  updateChildWatchPolicy,
  type MobileReport,
  type ParentOverview,
  type ReportFamily,
  type ViewingHistoryItem,
} from '../lib/api'

type ParentManagementPanelProps = {
  onStatusChange?: (message: string) => void
}

function formatHour(hour: number) {
  return `${String(hour).padStart(2, '0')}:00`
}

export function ParentManagementPanel({ onStatusChange }: ParentManagementPanelProps) {
  const [families, setFamilies] = useState<ReportFamily[]>([])
  const [selectedFamilyId, setSelectedFamilyId] = useState(1)
  const [overview, setOverview] = useState<ParentOverview | null>(null)
  const [report, setReport] = useState<MobileReport | null>(null)
  const [history, setHistory] = useState<ViewingHistoryItem[]>([])
  const [selectedChildId, setSelectedChildId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchReportFamilies()
      .then((items) => {
        setFamilies(items)
        if (items[0]) {
          setSelectedFamilyId(items[0].familyId)
        }
      })
      .catch(() => {
        setFamilies([])
      })
  }, [])

  useEffect(() => {
    void refreshFamilyData(selectedFamilyId)
  }, [selectedFamilyId])

  useEffect(() => {
    if (!selectedChildId) {
      return
    }
    void refreshHistory(selectedFamilyId, selectedChildId)
  }, [selectedFamilyId, selectedChildId])

  async function refreshFamilyData(familyId: number) {
    try {
      const [nextOverview, nextReport] = await Promise.all([
        fetchParentOverview(familyId),
        fetchMobileReport(familyId),
      ])
      setOverview(nextOverview)
      setReport(nextReport)
      const firstChildId = nextOverview.children[0]?.childId ?? null
      setSelectedChildId((current) => current ?? firstChildId)
      await refreshHistory(familyId, firstChildId)
      setError(null)
      onStatusChange?.('보호자 관리 정보를 불러왔습니다.')
    } catch {
      setError('보호자 관리 정보를 불러오지 못했습니다.')
    }
  }

  async function refreshHistory(familyId: number, childId: number | null) {
    try {
      setHistory(await fetchViewingHistory(familyId, childId, 10))
    } catch {
      setHistory([])
    }
  }

  async function handlePolicySave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedChildId) {
      return
    }

    const formData = new FormData(event.currentTarget)
    setSaving(true)

    try {
      await updateChildWatchPolicy({
        childId: selectedChildId,
        dailyLimitMinutes: Number(formData.get('dailyLimitMinutes')),
        weekdayStartHour: Number(formData.get('weekdayStartHour')),
        weekdayEndHour: Number(formData.get('weekdayEndHour')),
        weekendStartHour: Number(formData.get('weekendStartHour')),
        weekendEndHour: Number(formData.get('weekendEndHour')),
        notificationThreshold: Number(formData.get('notificationThreshold')),
        autoBlockEnabled: formData.get('autoBlockEnabled') === 'on',
      })

      await refreshFamilyData(selectedFamilyId)
      onStatusChange?.('시청 시간 정책을 저장했습니다.')
    } catch {
      onStatusChange?.('시청 시간 정책 저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const selectedChild = overview?.children.find((child) => child.childId === selectedChildId) ?? null

  return (
    <section className="service-panel">
      <div className="service-panel__header">
        <span className="section-heading__eyebrow">부모 관리 기능</span>
        <h2>시청 시간 설정 · 시청 기록 · 부모 알림</h2>
        <p>가정별로 아동 시청 정책을 관리하고, 알림과 리포트를 부모 앱 기준으로 확인합니다.</p>
      </div>

      <div className="parent-toolbar">
        <select
          className="analysis-input analysis-input--compact"
          value={selectedFamilyId}
          onChange={(event) => setSelectedFamilyId(Number(event.target.value))}
        >
          {families.map((family) => (
            <option key={family.familyId} value={family.familyId}>
              {family.familyName}
            </option>
          ))}
        </select>

        {overview ? (
          <div className="parent-toolbar__summary">
            <span>오늘 시청 {overview.todayViewingCount}건</span>
            <span>부모 알림 {overview.alertCount}건</span>
          </div>
        ) : null}
      </div>

      {error ? <p className="service-panel__error">{error}</p> : null}

      {overview ? (
        <>
          <div className="parent-grid">
            <article className="management-card">
              <strong>아동 프로필</strong>
              <div className="profile-list">
                {overview.children.map((child) => (
                  <button
                    key={child.childId}
                    type="button"
                    className={`profile-pill ${selectedChildId === child.childId ? 'is-active' : ''}`}
                    onClick={() => setSelectedChildId(child.childId)}
                  >
                    <span>{child.childName}</span>
                    <small>{child.todayWatchMinutes}분 시청</small>
                  </button>
                ))}
              </div>
            </article>

            <article className="management-card">
              <strong>리포트 요약</strong>
              <div className="report-grid">
                <div>
                  <span>일간</span>
                  <b>{report?.daily?.countAlertType ?? 0}건</b>
                </div>
                <div>
                  <span>주간</span>
                  <b>{report?.weekly?.countAlertType ?? 0}건</b>
                </div>
                <div>
                  <span>월간</span>
                  <b>{report?.monthly?.countAlertType ?? 0}건</b>
                </div>
              </div>
            </article>
          </div>

          {selectedChild ? (
            <form className="management-card policy-form" onSubmit={handlePolicySave}>
              <strong>{selectedChild.childName} 시청 시간 설정</strong>
              <div className="policy-grid">
                <label>
                  <span>일일 시청 시간(분)</span>
                  <input
                    className="analysis-input"
                    type="number"
                    name="dailyLimitMinutes"
                    defaultValue={selectedChild.watchPolicy.dailyLimitMinutes}
                  />
                </label>
                <label>
                  <span>주중 시작 시간</span>
                  <input
                    className="analysis-input"
                    type="number"
                    name="weekdayStartHour"
                    min={0}
                    max={23}
                    defaultValue={selectedChild.watchPolicy.weekdayStartHour}
                  />
                </label>
                <label>
                  <span>주중 종료 시간</span>
                  <input
                    className="analysis-input"
                    type="number"
                    name="weekdayEndHour"
                    min={1}
                    max={24}
                    defaultValue={selectedChild.watchPolicy.weekdayEndHour}
                  />
                </label>
                <label>
                  <span>주말 시작 시간</span>
                  <input
                    className="analysis-input"
                    type="number"
                    name="weekendStartHour"
                    min={0}
                    max={23}
                    defaultValue={selectedChild.watchPolicy.weekendStartHour}
                  />
                </label>
                <label>
                  <span>주말 종료 시간</span>
                  <input
                    className="analysis-input"
                    type="number"
                    name="weekendEndHour"
                    min={1}
                    max={24}
                    defaultValue={selectedChild.watchPolicy.weekendEndHour}
                  />
                </label>
                <label>
                  <span>부모 알림 임계치</span>
                  <input
                    className="analysis-input"
                    type="number"
                    name="notificationThreshold"
                    min={0}
                    max={100}
                    defaultValue={selectedChild.watchPolicy.notificationThreshold}
                  />
                </label>
              </div>

              <label className="toggle-row">
                <input
                  type="checkbox"
                  name="autoBlockEnabled"
                  defaultChecked={selectedChild.watchPolicy.autoBlockEnabled}
                />
                <span>
                  위험 시 자동 차단 사용 · 현재 허용 시간 {formatHour(selectedChild.watchPolicy.weekdayStartHour)} ~{' '}
                  {formatHour(selectedChild.watchPolicy.weekdayEndHour)}
                </span>
              </label>

              <div className="settings-control-card__actions">
                <button className="analysis-submit" type="submit" disabled={saving}>
                  {saving ? '저장 중...' : '정책 저장'}
                </button>
              </div>
            </form>
          ) : null}

          <div className="parent-grid">
            <article className="management-card">
              <strong>최근 부모 알림</strong>
              <div className="stack-list">
                {overview.recentAlerts.map((alert) => (
                  <div key={alert.alertId} className="stack-item">
                    <div>
                      <span>{alert.childName ?? '아동 미지정'}</span>
                      <b>{alert.alertType}</b>
                    </div>
                    <p>{alert.messageText}</p>
                    <small>
                      {alert.riskLevel} · {new Date(alert.watchTime).toLocaleString('ko-KR')}
                    </small>
                  </div>
                ))}
              </div>
            </article>

            <article className="management-card">
              <strong>시청 기록 조회</strong>
              <div className="stack-list">
                {history.map((item) => (
                  <div key={item.viewingId} className="stack-item">
                    <div>
                      <span>{item.childName ?? '가정 공용'}</span>
                      <b>{item.videoId}</b>
                    </div>
                    <p>
                      {item.latestAlertType
                        ? `최근 경고: ${item.latestAlertType} (${item.latestRiskLevel ?? '정보 없음'})`
                        : '추가 경고 없이 기록만 저장되었습니다.'}
                    </p>
                    <small>{new Date(item.watchTime).toLocaleString('ko-KR')}</small>
                  </div>
                ))}
              </div>
            </article>
          </div>
        </>
      ) : null}
    </section>
  )
}
