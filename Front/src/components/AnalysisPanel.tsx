import { useEffect, useState } from 'react'
import {
  analyzeYoutubeVideo,
  fetchAnalysisHistory,
  type AnalysisResult,
} from '../lib/api'

type AnalysisPanelProps = {
  onStatusChange?: (message: string) => void
}

type AnalysisInsight = {
  riskScore: number
  summary: string
  actions: string[]
}

const SAMPLE_URL = 'https://www.youtube.com/watch?v=aqz-KE-bpKQ'

function openYoutube(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer')
}

function buildInsight(result: AnalysisResult): AnalysisInsight {
  let score = 0

  if (result.blockedByCategory) {
    score += 30
  }

  if (result.hasViolence) {
    score += Math.round((result.violenceScore ?? 0.5) * 40)
  }

  if (result.hasNudity) {
    score += 35
  }

  if (result.shortForm) {
    score += 10
  }

  const riskScore = Math.max(0, Math.min(100, score))
  const actions: string[] = []

  if (result.blockedByCategory) {
    actions.push('카테고리 차단 대상이므로 보호 모드 기준으로 재확인하세요.')
  }

  if (result.hasViolence) {
    actions.push('폭력 감지가 있어 보호자 확인 후 재생 여부를 결정하세요.')
  }

  if (result.hasNudity) {
    actions.push('선정성 감지가 있어 아동 프로필에서는 차단하는 편이 안전합니다.')
  }

  if (result.addictionMonitor?.status === 'SKIPPED') {
    actions.push('추가 모니터링이 건너뛰어졌습니다. 설정에서 동의와 실행 상태를 점검하세요.')
  }

  if (result.addictionMonitor?.status === 'FAILED') {
    actions.push('addiction.py 추가 점검이 실패했습니다. 시스템 상태 보드에서 모델 상태를 확인하세요.')
  }

  if (actions.length === 0) {
    actions.push('현재 결과 기준으로는 위험 신호가 낮습니다. 그대로 이력을 저장해 두면 됩니다.')
  }

  const summary =
    riskScore >= 70
      ? '고위험으로 분류할 만한 신호가 많습니다.'
      : riskScore >= 40
        ? '주의가 필요한 혼합 신호가 있습니다.'
        : '상대적으로 안정적인 결과입니다.'

  return { riskScore, summary, actions }
}

function buildShareText(result: AnalysisResult, insight: AnalysisInsight) {
  return [
    `[유튜브 분석 리포트]`,
    `제목: ${result.title ?? '알 수 없음'}`,
    `URL: ${result.inputUrl}`,
    `위험 점수: ${insight.riskScore}점`,
    `카테고리: ${result.categoryNameKo ?? '-'}`,
    `폭력 감지: ${result.hasViolence ? '예' : '아니오'}`,
    `선정성 감지: ${result.hasNudity ? '예' : '아니오'}`,
    `addiction.py: ${result.addictionMonitor?.status ?? '정보 없음'}`,
    `권장 조치: ${insight.actions.join(' / ')}`,
  ].join('\n')
}

export function AnalysisPanel({ onStatusChange }: AnalysisPanelProps) {
  const [videoUrl, setVideoUrl] = useState(SAMPLE_URL)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [history, setHistory] = useState<AnalysisResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const insight = result ? buildInsight(result) : null

  useEffect(() => {
    void refreshHistory()
  }, [])

  async function refreshHistory() {
    try {
      const nextHistory = await fetchAnalysisHistory(6)
      setHistory(nextHistory)
    } catch {
      setHistory([])
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    onStatusChange?.('유튜브 모델 분석 요청 전송 중')

    try {
      const response = await analyzeYoutubeVideo(videoUrl)
      setResult(response)
      onStatusChange?.(
        response.status === 'SUCCESS'
          ? `${response.title ?? '유튜브 분석'} 완료`
          : '유튜브 분석 실패',
      )
      await refreshHistory()
    } catch {
      setError('분석 요청에 실패했습니다. 백엔드, PostgreSQL, Python 모델 연결 상태를 확인하세요.')
      onStatusChange?.('유튜브 분석 요청 실패')
    } finally {
      setLoading(false)
    }
  }

  async function handleCopyReport() {
    if (!result || !insight) {
      return
    }

    try {
      await navigator.clipboard.writeText(buildShareText(result, insight))
      onStatusChange?.('분석 리포트를 클립보드에 복사했습니다.')
    } catch {
      onStatusChange?.('클립보드 복사에 실패했습니다.')
    }
  }

  return (
    <section className="service-panel">
      <div className="service-panel__header">
        <span className="section-heading__eyebrow">유튜브 모델 연결</span>
        <h2>유튜브 위험도 분석</h2>
        <p>
          유튜브 URL을 넣으면 백엔드가 Python 모델을 실행하고, 결과를 PostgreSQL 이력에
          저장합니다. 원본 유튜브 이동과 분석 리포트 복사도 바로 할 수 있습니다.
        </p>
      </div>

      <form className="analysis-form" onSubmit={handleSubmit}>
        <input
          className="analysis-input"
          name="videoUrl"
          value={videoUrl}
          onChange={(event) => setVideoUrl(event.target.value)}
          placeholder="유튜브 URL을 입력하세요"
        />
        <button className="analysis-submit" type="submit" disabled={loading}>
          {loading ? '분석 중...' : '모델 실행'}
        </button>
        <button className="analysis-link" type="button" onClick={() => openYoutube(videoUrl)}>
          유튜브 열기
        </button>
      </form>

      {error ? <p className="service-panel__error">{error}</p> : null}

      {result && insight ? (
        <div className="analysis-result">
          <div className="analysis-result__headline">
            <strong>{result.title ?? '결과 없음'}</strong>
            <span className={result.harmful ? 'is-danger' : 'is-safe'}>
              {result.status === 'SUCCESS'
                ? result.harmful
                  ? '주의 필요'
                  : '위험 요소 낮음'
                : '실행 실패'}
            </span>
          </div>

          <p>
            카테고리 {result.categoryNameKo ?? '-'} · 재생 길이 {result.durationSeconds ?? 0}초
          </p>

          <div className="analysis-score-card">
            <div>
              <span>위험 점수</span>
              <strong>{insight.riskScore}점</strong>
            </div>
            <p>{insight.summary}</p>
          </div>

          <div className="analysis-result__chips">
            <span>카테고리 차단: {result.blockedByCategory ? '예' : '아니오'}</span>
            <span>폭력 감지: {result.hasViolence ? '예' : '아니오'}</span>
            <span>선정성 감지: {result.hasNudity ? '예' : '아니오'}</span>
            <span>쇼츠 여부: {result.shortForm ? '예' : '아니오'}</span>
          </div>

          <div className="analysis-result__monitor">
            <strong>추가 모니터링 상태</strong>
            <p>
              {result.addictionMonitor?.status ?? '정보 없음'} ·{' '}
              {result.addictionMonitor?.message ?? '추가 모니터링 정보가 없습니다.'}
            </p>
          </div>

          <div className="analysis-actions-card">
            <strong>권장 조치</strong>
            <ul className="analysis-result__reasons">
              {insight.actions.map((action) => (
                <li key={action}>{action}</li>
              ))}
            </ul>
          </div>

          {result.harmfulReasons.length > 0 ? (
            <div className="analysis-actions-card">
              <strong>모델 판단 근거</strong>
              <ul className="analysis-result__reasons">
                {result.harmfulReasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="analysis-result__actions">
            <button
              className="analysis-link"
              type="button"
              onClick={() => openYoutube(result.inputUrl)}
            >
              원본 유튜브 열기
            </button>
            <button className="analysis-link" type="button" onClick={() => void handleCopyReport()}>
              리포트 복사
            </button>
          </div>

          {result.errorMessage ? <p className="service-panel__error">{result.errorMessage}</p> : null}
        </div>
      ) : null}

      <div className="analysis-history">
        <div className="analysis-history__header">
          <strong>최근 분석 이력</strong>
          <span>{history.length}건</span>
        </div>

        {history.map((item) => (
          <article
            key={item.analysisId ?? `${item.inputUrl}-${item.createdAt}`}
            className="analysis-history__item"
          >
            <div>
              <strong>{item.title ?? item.inputUrl}</strong>
              <span>{item.status === 'SUCCESS' ? '완료' : '실패'}</span>
            </div>
            <p>
              {item.categoryNameKo ?? '분류 없음'} · 위험 여부 {item.harmful ? '주의 필요' : '낮음'}
            </p>
            <div className="analysis-history__actions">
              <small>{item.createdAt ? new Date(item.createdAt).toLocaleString('ko-KR') : ''}</small>
              <button
                className="analysis-link"
                type="button"
                onClick={() => openYoutube(item.inputUrl)}
              >
                유튜브 열기
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
