import { useEffect, useState } from 'react'
import { fetchDashboardOverview, type DashboardOverview } from '../lib/api'

type DashboardPanelProps = {
  onStatusChange?: (message: string) => void
}

export function DashboardPanel({ onStatusChange }: DashboardPanelProps) {
  const [overview, setOverview] = useState<DashboardOverview | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    fetchDashboardOverview()
      .then((data) => {
        if (cancelled) {
          return
        }
        setOverview(data)
        setError(null)
        onStatusChange?.('대시보드 데이터를 불러왔습니다.')
      })
      .catch(() => {
        if (cancelled) {
          return
        }
        setError('백엔드 대시보드 API 연결이 필요합니다.')
      })

    return () => {
      cancelled = true
    }
  }, [onStatusChange])

  return (
    <section className="service-panel">
      <div className="service-panel__header">
        <span className="section-heading__eyebrow">실시간 백엔드 연동</span>
        <h2>가족 보호 대시보드</h2>
        <p>
          PostgreSQL에 저장된 집계와 최근 경고 이력을 백엔드 API에서 바로 불러옵니다.
        </p>
      </div>

      {error ? <p className="service-panel__error">{error}</p> : null}

      {overview ? (
        <>
          <div className="dashboard-grid">
            <div>
              <span>사용자 수</span>
              <strong>{overview.userCount}</strong>
            </div>
            <div>
              <span>아동 프로필</span>
              <strong>{overview.childCount}</strong>
            </div>
            <div>
              <span>시청 기록</span>
              <strong>{overview.viewingCount}</strong>
            </div>
            <div>
              <span>경고 로그</span>
              <strong>{overview.alertCount}</strong>
            </div>
          </div>

          <div className="dashboard-alerts">
            {overview.recentAlerts.map((alert) => (
              <article key={alert.alertId} className="dashboard-alerts__item">
                <div>
                  <span>{alert.alertType}</span>
                  <strong>{alert.videoId}</strong>
                </div>
                <p>{alert.messageText}</p>
                <small>
                  위험도 {alert.riskLevel} · {new Date(alert.watchTime).toLocaleString('ko-KR')}
                </small>
              </article>
            ))}
          </div>
        </>
      ) : null}
    </section>
  )
}
