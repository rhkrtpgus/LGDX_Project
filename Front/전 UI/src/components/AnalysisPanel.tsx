import { useEffect, useState, type FormEvent } from 'react'
import {
  analyzeYoutubeVideo,
  fetchAnalysisHistory,
  fetchParentChildren,
  type AnalysisResult,
  type ParentChild,
} from '../lib/api'

type AnalysisPanelProps = {
  familyId?: number
  preferredChildId?: number | null
  onSelectChildId?: (childId: number | null) => void
  initialVideoUrl?: string
  hideHistory?: boolean
  launchButtonLabel?: string
  onBack?: () => void
  onOpenUrl?: (url: string, statusMessage: string) => void
  onStatusChange?: (message: string) => void
}

const SAMPLE_URL = 'https://www.youtube.com/watch?v=aqz-KE-bpKQ'

function openYoutube(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer')
}

function buildRiskSummary(result: AnalysisResult) {
  if (result.playback.addictionRiskScore >= 75) {
    return '위험도가 높습니다. 보호자 확인 후 재생 여부를 결정하는 편이 안전합니다.'
  }

  if (result.playback.addictionRiskScore >= 45) {
    return '주의 구간입니다. 시청 시간과 반복 재생 여부를 함께 확인하세요.'
  }

  return '현재 규칙 기준에서는 비교적 안정적인 콘텐츠로 분류되었습니다.'
}

function buildShareText(result: AnalysisResult) {
  return [
    '[아동 TV 시청 안전 리포트]',
    `제목: ${result.title ?? '정보 없음'}`,
    `URL: ${result.inputUrl}`,
    `카테고리: ${result.categoryNameKo ?? '-'}`,
    `유해 판정: ${result.harmful ? '주의 필요' : '안전'}`,
    `재생 허용: ${result.playback.allowed ? '허용' : '차단'}`,
    `중독 위험 점수: ${result.playback.addictionRiskScore}점`,
    `중독 위험 단계: ${result.playback.addictionRiskLevel}`,
    `권장 안내: ${result.playback.message}`,
  ].join('\n')
}

export function AnalysisPanel({
  familyId = 1,
  preferredChildId = null,
  onSelectChildId,
  initialVideoUrl = SAMPLE_URL,
  hideHistory = false,
  launchButtonLabel = '유튜브로 이동',
  onBack,
  onOpenUrl,
  onStatusChange,
}: AnalysisPanelProps) {
  const [videoUrl, setVideoUrl] = useState(initialVideoUrl)
  const [children, setChildren] = useState<ParentChild[]>([])
  const [selectedChildId, setSelectedChildId] = useState<number | null>(preferredChildId)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [history, setHistory] = useState<AnalysisResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setVideoUrl(initialVideoUrl)
  }, [initialVideoUrl])

  useEffect(() => {
    setSelectedChildId(preferredChildId)
  }, [preferredChildId])

  useEffect(() => {
    onSelectChildId?.(selectedChildId)
  }, [onSelectChildId, selectedChildId])

  useEffect(() => {
    void Promise.all([refreshHistory(), refreshChildren()])
  }, [familyId, preferredChildId])

  async function refreshHistory() {
    if (hideHistory) {
      setHistory([])
      return
    }

    try {
      setHistory(await fetchAnalysisHistory(6))
    } catch {
      setHistory([])
    }
  }

  async function refreshChildren() {
    try {
      const nextChildren = await fetchParentChildren(familyId)
      setChildren(nextChildren)
      setSelectedChildId((current) => {
        if (preferredChildId && nextChildren.some((child) => child.childId === preferredChildId)) {
          return preferredChildId
        }

        return current ?? nextChildren[0]?.childId ?? null
      })
    } catch {
      setChildren([])
      setSelectedChildId(null)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    onStatusChange?.('유튜브 콘텐츠를 분석하고 재생 가능 여부를 확인하는 중입니다.')

    try {
      const response = await analyzeYoutubeVideo(videoUrl, selectedChildId)
      setResult(response)
      onStatusChange?.(
        response.playback.allowed ? '재생 허용 결과를 받았습니다.' : '재생 차단 결과를 받았습니다.',
      )
      await refreshHistory()
    } catch {
      setError('분석 요청에 실패했습니다. 백엔드, PostgreSQL, Python 모델 연결 상태를 확인하세요.')
      onStatusChange?.('유튜브 분석 요청에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  async function handleCopyReport() {
    if (!result) {
      return
    }

    try {
      await navigator.clipboard.writeText(buildShareText(result))
      onStatusChange?.('분석 리포트를 클립보드에 복사했습니다.')
    } catch {
      onStatusChange?.('리포트 복사에 실패했습니다.')
    }
  }

  function handleOpenResult() {
    if (!result) {
      return
    }

    if (onOpenUrl) {
      onOpenUrl(result.inputUrl, '분석을 통과한 유튜브 URL을 열었습니다.')
      return
    }

    openYoutube(result.inputUrl)
  }

  return (
    <section className="service-panel service-panel--analysis">
      <div className="service-panel__header">
        <span className="section-heading__eyebrow">TV앱 보호 기능</span>
        <h2>유튜브 재생 전 안전 분석</h2>
        <p>
          유튜브 URL을 입력하면 메타데이터, 유해 여부, 중독 위험도, 재생 허용 여부를 TV 화면에서 바로
          확인할 수 있습니다.
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
        <select
          className="analysis-input analysis-input--compact"
          value={selectedChildId ?? ''}
          onChange={(event) =>
            setSelectedChildId(event.target.value ? Number(event.target.value) : null)
          }
        >
          {children.length > 0 ? (
            children.map((child) => (
              <option key={child.childId} value={child.childId}>
                {child.childName}
              </option>
            ))
          ) : (
            <option value="">아동 프로필 없음</option>
          )}
        </select>
        <button className="analysis-submit" type="submit" disabled={loading}>
          {loading ? '분석 중...' : '재생 요청 분석'}
        </button>
      </form>

      {error ? <p className="service-panel__error">{error}</p> : null}

      {result ? (
        <div className="analysis-result">
          <div className="analysis-result__headline">
            <strong>{result.title ?? '제목 정보 없음'}</strong>
            <span className={result.playback.allowed ? 'is-safe' : 'is-danger'}>
              {result.playback.allowed ? '재생 가능' : '재생 차단'}
            </span>
          </div>

          <p>
            카테고리 {result.categoryNameKo ?? '-'} · 영상 길이 {result.durationSeconds ?? 0}초
          </p>

          <div className="analysis-score-card">
            <div>
              <span>중독 위험 점수</span>
              <strong>{result.playback.addictionRiskScore}점</strong>
            </div>
            <p>{buildRiskSummary(result)}</p>
          </div>

          <div className="analysis-result__chips">
            <span>콘텐츠 유형: {result.categoryNameKo ?? '미분류'}</span>
            <span>카테고리 차단: {result.blockedByCategory ? '예' : '아니오'}</span>
            <span>폭력 감지: {result.hasViolence ? '예' : '아니오'}</span>
            <span>선정성 감지: {result.hasNudity ? '예' : '아니오'}</span>
            <span>쇼츠 여부: {result.shortForm ? '예' : '아니오'}</span>
          </div>

          <div className="analysis-actions-card">
            <strong>재생 판단</strong>
            <p>{result.playback.message}</p>
          </div>

          <div className="analysis-actions-card">
            <strong>행동 분석 연동 상태</strong>
            <ul className="analysis-result__reasons">
              {result.playback.behaviorSignals.map((signal) => (
                <li key={signal}>{signal}</li>
              ))}
            </ul>
          </div>

          <div className="analysis-result__monitor">
            <strong>addiction.py 실행 상태</strong>
            <p>{result.addictionMonitor?.message ?? '추가 모니터링 정보가 없습니다.'}</p>
          </div>

          {result.harmfulReasons.length > 0 ? (
            <div className="analysis-actions-card">
              <strong>유해 판정 근거</strong>
              <ul className="analysis-result__reasons">
                {result.harmfulReasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="analysis-result__actions">
            <button
              className="analysis-submit"
              type="button"
              disabled={!result.playback.allowed}
              onClick={handleOpenResult}
            >
              {launchButtonLabel}
            </button>
            <button className="analysis-link" type="button" onClick={() => void handleCopyReport()}>
              리포트 복사
            </button>
            {onBack ? (
              <button className="analysis-link" type="button" onClick={onBack}>
                앱 목록으로
              </button>
            ) : null}
          </div>

          {result.errorMessage ? <p className="service-panel__error">{result.errorMessage}</p> : null}
        </div>
      ) : null}

      {!hideHistory ? (
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
                <span>{item.playback.allowed ? '허용' : '주의'}</span>
              </div>
              <p>
                {item.categoryNameKo ?? '미분류'} · 위험 점수 {item.playback.addictionRiskScore}점 ·{' '}
                {item.playback.addictionRiskLevel}
              </p>
              <div className="analysis-history__actions">
                <small>{item.createdAt ? new Date(item.createdAt).toLocaleString('ko-KR') : ''}</small>
                <button className="analysis-link" type="button" onClick={() => openYoutube(item.inputUrl)}>
                  유튜브 열기
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  )
}
