import type {
  AnalysisResponse,
  ParentAlertResponse,
  ParentViewingHistoryResponse,
} from '../lib/api'
import { summarizeAlert, summarizeHistoryItem } from '../lib/integration'

type ViewingHistoryPanelProps = {
  familyName: string
  viewingHistory: ParentViewingHistoryResponse[]
  recentAlerts: ParentAlertResponse[]
  analysisHistory: AnalysisResponse[]
  compact?: boolean
}

export function ViewingHistoryPanel({
  familyName,
  viewingHistory,
  recentAlerts,
  analysisHistory,
  compact = false,
}: ViewingHistoryPanelProps) {
  const totalWatchMinutes = Math.max(
    0,
    viewingHistory.reduce((sum, item) => sum + Math.max(0, Math.round((item.watchDuration ?? 0) / 60)), 0),
  )

  const cards = [
    {
      label: '최근 시청',
      value: `${viewingHistory.length}건`,
      sub: `${familyName}의 최신 시청 내역입니다.`,
    },
    {
      label: '최근 알림',
      value: `${recentAlerts.length}건`,
      sub: recentAlerts[0] ? summarizeAlert(recentAlerts[0]) : '최근 알림이 없습니다.',
    },
    {
      label: '누적 시간',
      value: `${totalWatchMinutes}분`,
      sub: '현재 불러온 시청 기록을 기준으로 계산했습니다.',
    },
    {
      label: '사전 확인',
      value: `${analysisHistory.length}건`,
      sub: '시청 전에 확인한 영상 결과를 함께 보고 있습니다.',
    },
  ]

  const linkedAnalysisByViewingId = new Map<number, AnalysisResponse>()
  viewingHistory.forEach((item) => {
    const linked = analysisHistory.find((analysis) => isLinkedYoutubeEntry(item, analysis))
    if (linked) {
      linkedAnalysisByViewingId.set(item.viewingId, linked)
    }
  })

  return (
    <div className={`vhp-root${compact ? ' vhp-root--compact' : ''}`}>
      <div className="vhp-summary-grid">
        {cards.map((card) => (
          <article key={card.label} className="vhp-summary-card">
            <span className="vhp-summary-label">{card.label}</span>
            <strong className="vhp-summary-value">{card.value}</strong>
            <p className="vhp-summary-copy">{card.sub}</p>
          </article>
        ))}
      </div>

      <div className="vhp-board">
        <section className="vhp-card">
          <div className="vhp-card-head">
            <h3>이어보기</h3>
            <span>{viewingHistory.length}건</span>
          </div>
          <div className="vhp-list">
            {viewingHistory.slice(0, compact ? 5 : 8).map((item) => {
              const linkedAnalysis = linkedAnalysisByViewingId.get(item.viewingId)
              return (
              <div key={item.viewingId} className="vhp-item">
                <div>
                  <strong>{summarizeHistoryItem(item)}</strong>
                  <p>{linkedAnalysis ? `${item.watchTime} · 실제 누른 URL로 다시 열 수 있어요.` : item.watchTime}</p>
                </div>
                <div className="vhp-item__actions">
                  {linkedAnalysis?.inputUrl ? (
                    <button
                      type="button"
                      className="vhp-link-btn"
                      onClick={() => window.open(linkedAnalysis.inputUrl, '_blank', 'noopener,noreferrer')}
                    >
                      이어서 보기
                    </button>
                  ) : null}
                  <span className="vhp-pill">{Math.max(1, Math.round((item.watchDuration ?? 0) / 60))}분</span>
                </div>
              </div>
              )
            })}
            {viewingHistory.length === 0 && <p className="vhp-empty">아직 시청 기록이 없습니다.</p>}
          </div>
        </section>

        <section className="vhp-card">
          <div className="vhp-card-head">
            <h3>보호 알림</h3>
            <span>{recentAlerts.length}건</span>
          </div>
          <div className="vhp-list">
            {recentAlerts.slice(0, compact ? 4 : 6).map((alert) => (
              <div key={alert.alertId} className="vhp-item">
                <div>
                  <strong>{alert.childName}</strong>
                  <p>{alert.messageText}</p>
                </div>
                <span className={`vhp-pill vhp-pill--${(alert.riskLevel ?? 'safe').toLowerCase()}`}>
                  {formatRiskLabel(alert.riskLevel)}
                </span>
              </div>
            ))}
            {recentAlerts.length === 0 && <p className="vhp-empty">현재 표시할 알림이 없습니다.</p>}
          </div>
        </section>

        <section className="vhp-card">
          <div className="vhp-card-head">
            <h3>사전 확인 내역</h3>
            <span>{analysisHistory.length}건</span>
          </div>
          <div className="vhp-list">
            {analysisHistory.slice(0, compact ? 4 : 6).map((item) => (
              <div key={`${item.analysisId}-${item.inputUrl}`} className="vhp-item">
                <div>
                  <strong>{item.title ?? item.inputUrl}</strong>
                  <p>
                    {(item.categoryNameKo ?? '분류 전')} · {item.playback.allowed ? '시청 가능' : '주의 필요'}
                  </p>
                </div>
                <span className={`vhp-pill ${item.playback.allowed ? 'vhp-pill--ok' : 'vhp-pill--warn'}`}>
                  {item.playback.allowed ? '허용' : '차단'}
                </span>
              </div>
            ))}
            {analysisHistory.length === 0 && <p className="vhp-empty">아직 확인한 영상 기록이 없습니다.</p>}
          </div>
        </section>
      </div>
    </div>
  )
}

function formatRiskLabel(riskLevel?: string | null) {
  switch ((riskLevel ?? '').toUpperCase()) {
    case 'HIGH':
      return '높음'
    case 'MEDIUM':
      return '보통'
    case 'LOW':
      return '낮음'
    default:
      return '안정'
  }
}

function isLinkedYoutubeEntry(item: ParentViewingHistoryResponse, analysis: AnalysisResponse) {
  const viewingVideoId = normalizeToken(item.videoId)
  const analysisVideoId = normalizeToken(analysis.videoId)
  const analysisTitle = normalizeToken(analysis.title)
  const analysisUrl = normalizeToken(analysis.inputUrl)

  if (!viewingVideoId) {
    return false
  }

  return (
    (analysisVideoId.length > 0 && analysisVideoId === viewingVideoId)
    || (analysisTitle.length > 0 && analysisTitle.includes(viewingVideoId))
    || (analysisUrl.length > 0 && analysisUrl.includes(viewingVideoId))
  )
}

function normalizeToken(value?: string | null) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
}
