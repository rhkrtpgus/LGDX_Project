import { useEffect, useState } from 'react'
import { fetchSystemHealth, type ComponentHealth, type SystemHealth } from '../lib/api'

type SystemHealthPanelProps = {
  onStatusChange?: (message: string) => void
}

function HealthCard({
  label,
  item,
}: {
  label: string
  item: ComponentHealth
}) {
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
    let cancelled = false

    fetchSystemHealth()
      .then((data) => {
        if (cancelled) {
          return
        }
        setHealth(data)
        onStatusChange?.('시스템 상태 보드를 업데이트했습니다.')
      })
      .catch(() => {
        if (cancelled) {
          return
        }
        setError('시스템 상태 정보를 불러오지 못했습니다.')
      })

    return () => {
      cancelled = true
    }
  }, [onStatusChange])

  return (
    <section className="service-panel">
      <div className="service-panel__header">
        <span className="section-heading__eyebrow">시스템 상태 보드</span>
        <h2>백엔드 · DB · 모델 연결 상태</h2>
        <p>
          지금 추가한 기능입니다. 프론트에서 바로 백엔드, PostgreSQL, 메인 모델, 추가
          모니터링 스크립트 상태를 확인할 수 있습니다.
        </p>
      </div>

      {error ? <p className="service-panel__error">{error}</p> : null}

      {health ? (
        <>
          <div className="health-grid">
            <HealthCard label="백엔드 API" item={health.backend} />
            <HealthCard label="PostgreSQL" item={health.database} />
            <HealthCard label="메인 분석 모델" item={health.mainModel} />
            <HealthCard label="추가 모니터링" item={health.addictionModel} />
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
