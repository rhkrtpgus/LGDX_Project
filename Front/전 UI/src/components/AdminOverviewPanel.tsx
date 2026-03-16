import { useEffect, useState } from 'react'
import { fetchAdminOverview, type AdminOverview } from '../lib/api'

type AdminOverviewPanelProps = {
  onStatusChange?: (message: string) => void
}

export function AdminOverviewPanel({ onStatusChange }: AdminOverviewPanelProps) {
  const [overview, setOverview] = useState<AdminOverview | null>(null)

  useEffect(() => {
    fetchAdminOverview()
      .then((data) => {
        setOverview(data)
        onStatusChange?.('관리자 개요를 불러왔습니다.')
      })
      .catch(() => {
        setOverview(null)
      })
  }, [onStatusChange])

  if (!overview) {
    return null
  }

  return (
    <section className="service-panel">
      <div className="service-panel__header">
        <span className="section-heading__eyebrow">관리자 기능</span>
        <h2>시스템 관리 요약</h2>
        <p>정책 수, 고위험 경고 수, 최근 알림 흐름을 운영 관점에서 확인합니다.</p>
      </div>

      <div className="dashboard-grid">
        <div>
          <span>가족 수</span>
          <strong>{overview.familyCount}</strong>
        </div>
        <div>
          <span>정책 수</span>
          <strong>{overview.policyCount}</strong>
        </div>
        <div>
          <span>고위험 경고</span>
          <strong>{overview.highRiskAlertCount}</strong>
        </div>
        <div>
          <span>전체 알림</span>
          <strong>{overview.alertCount}</strong>
        </div>
      </div>

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
    </section>
  )
}
