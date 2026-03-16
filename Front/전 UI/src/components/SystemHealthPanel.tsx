import { useEffect, useState } from 'react'
import { fetchSystemHealth, type ComponentHealth, type SystemHealth } from '../lib/api'

type SystemHealthPanelProps = {
  onStatusChange?: (message: string) => void
}

function HealthCard({ label, item }: { label: string; item: ComponentHealth }) {
  const tone =
    item.status === 'UP' || item.status === 'READY'
      ? 'is-ok'
      : item.status === 'DEGRADED'
        ? 'is-warn'
        : 'is-bad'

  return (
    <article className="health-card">
      <div className="health-card__header">
        <span>{label}</span>
        <strong className={tone}>{item.status}</strong>
      </div>
      <p>{item.message}</p>
    </article>
  )
}

export function SystemHealthPanel({ onStatusChange }: SystemHealthPanelProps) {
  const [health, setHealth] = useState<SystemHealth | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchSystemHealth()
      .then((data) => {
        setHealth(data)
        onStatusChange?.('시스템 상태 보드를 업데이트했습니다.')
      })
      .catch(() => {
        setError('시스템 상태 정보를 불러오지 못했습니다.')
      })
  }, [onStatusChange])

  return (
    <section className="service-panel">
      <div className="service-panel__header">
        <span className="section-heading__eyebrow">시스템 상태</span>
        <h2>백엔드 · DB · 모델 연결 상태</h2>
        <p>분석 API, PostgreSQL, 메인 모델, 행동 분석 스크립트의 현재 상태를 점검합니다.</p>
      </div>

      {error ? <p className="service-panel__error">{error}</p> : null}

      {health ? (
        <>
          <div className="health-grid">
            <HealthCard label="백엔드 API" item={health.backend} />
            <HealthCard label="PostgreSQL" item={health.database} />
            <HealthCard label="메인 분석 모델" item={health.mainModel} />
            <HealthCard label="행동 분석 스크립트" item={health.addictionModel} />
          </div>

          <div className="health-runtime">
            <div>
              <span>개인정보 동의</span>
              <strong>{health.runtimeSettings.privacyConsent ? '완료' : '대기'}</strong>
            </div>
            <div>
              <span>addiction.py 실행</span>
              <strong>{health.runtimeSettings.addictionMonitorEnabled ? '켜짐' : '꺼짐'}</strong>
            </div>
          </div>
        </>
      ) : null}
    </section>
  )
}
