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
        onStatusChange?.('TV 핵심 요약 정보를 불러왔습니다.')
      })
      .catch(() => {
        if (cancelled) {
          return
        }
        setError('홈 요약 정보를 불러오지 못했습니다.')
      })

    return () => {
      cancelled = true
    }
  }, [onStatusChange])

  return (
    <section className="service-panel">
      <div className="service-panel__header">
        <span className="section-heading__eyebrow">TV 핵심 기능</span>
        <h2>큰 화면에서는 꼭 필요한 기능만</h2>
        <p>유튜브 실행, 재생 전 분석, 위험 콘텐츠 차단, 개인정보 동의만 TV에서 처리합니다.</p>
      </div>

      {error ? <p className="service-panel__error">{error}</p> : null}

      {overview ? (
        <>
          <div className="dashboard-grid">
            <div>
              <span>연결된 가족</span>
              <strong>{overview.userCount}</strong>
            </div>
            <div>
              <span>아동 프로필</span>
              <strong>{overview.childCount}</strong>
            </div>
            <div>
              <span>누적 분석</span>
              <strong>{overview.viewingCount}</strong>
            </div>
            <div>
              <span>누적 경고</span>
              <strong>{overview.alertCount}</strong>
            </div>
          </div>

          <div className="minimal-core-grid">
            <article className="minimal-core-card">
              <strong>유튜브 재생</strong>
              <p>앱 실행 또는 분석 결과에서 바로 YouTube로 이동합니다.</p>
            </article>
            <article className="minimal-core-card">
              <strong>AI 사전 분석</strong>
              <p>재생 전에 콘텐츠 유형, 유해 신호, 시청 규칙을 먼저 확인합니다.</p>
            </article>
            <article className="minimal-core-card">
              <strong>자동 차단</strong>
              <p>유해 콘텐츠 또는 시청 제한 조건이면 TV에서 바로 재생을 막습니다.</p>
            </article>
          </div>

          <div className="minimal-mobile-note">
            <strong>리포트와 상세 시청 기록은 모바일 전용</strong>
            <p>보호자 리포트, 주간 통계, 상세 기록 관리는 모바일 앱에서 확인하도록 분리했습니다.</p>
          </div>
        </>
      ) : null}
    </section>
  )
}
