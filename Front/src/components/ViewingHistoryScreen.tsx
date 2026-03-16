import { useEffect, useMemo, useState } from 'react'
import type {
  AnalysisResponse,
  ParentAlertResponse,
  ParentViewingHistoryResponse,
} from '../lib/api'
import { ViewingHistoryPanel } from './ViewingHistoryPanel'

type ViewingHistoryScreenProps = {
  familyName: string
  viewingHistory: ParentViewingHistoryResponse[]
  recentAlerts: ParentAlertResponse[]
  analysisHistory: AnalysisResponse[]
}

type PlaybackCandidate = {
  videoId: string
  title: string
}

export function ViewingHistoryScreen({
  familyName,
  viewingHistory,
  recentAlerts,
  analysisHistory,
}: ViewingHistoryScreenProps) {
  const thinqMobileUrl = import.meta.env.VITE_THINQ_UI_URL ?? 'http://localhost:4174/'
  const playbackCandidates = useMemo<PlaybackCandidate[]>(() => {
    const byVideoId = new Map<string, PlaybackCandidate>()

    analysisHistory.forEach((item) => {
      if (!item.videoId || byVideoId.has(item.videoId)) {
        return
      }

      byVideoId.set(item.videoId, {
        videoId: item.videoId,
        title: item.title ?? `유튜브 영상 ${item.videoId}`,
      })
    })

    return Array.from(byVideoId.values())
  }, [analysisHistory])

  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(playbackCandidates[0]?.videoId ?? null)
  const [selectedVideoTitle, setSelectedVideoTitle] = useState<string>(playbackCandidates[0]?.title ?? '최근 시청 영상')

  useEffect(() => {
    if (playbackCandidates.length === 0) {
      setSelectedVideoId(null)
      setSelectedVideoTitle('최근 시청 영상')
      return
    }

    if (!selectedVideoId || !playbackCandidates.some((item) => item.videoId === selectedVideoId)) {
      setSelectedVideoId(playbackCandidates[0].videoId)
      setSelectedVideoTitle(playbackCandidates[0].title)
    }
  }, [playbackCandidates, selectedVideoId])

  const embedUrl = selectedVideoId
    ? `https://www.youtube.com/embed/${selectedVideoId}?autoplay=1&rel=0&modestbranding=1`
    : null

  return (
    <div className="screen screen--history">
      <div className="vh-screen">
        <div className="vh-screen__hero">
          <span className="vh-screen__badge">TV 시청 리포트</span>
          <h2>{familyName} 시청 기록</h2>
              <p>시청 기록과 보호 알림은 여기서 보고, 모바일용 ThinQ 리포트는 별도 화면으로 바로 열 수 있게 연결해 두었습니다.</p>
          <button
            type="button"
            className="vh-screen__link"
            onClick={() => window.open(thinqMobileUrl, '_blank', 'noopener,noreferrer')}
          >
            모바일 TV 시청 리포트 열기
          </button>
        </div>

        <section className="vh-screen__player">
          <div className="vh-screen__player-head">
            <div>
              <span className="vh-screen__badge">이어보기 플레이어</span>
              <h3>{selectedVideoTitle}</h3>
              <p>시청 기록이나 사전 확인 이력에서 영상을 고르면 이 자리에서 바로 재생됩니다.</p>
            </div>
          </div>
          <div className="vh-screen__player-frame">
            {embedUrl ? (
              <iframe
                title={selectedVideoTitle}
                src={embedUrl}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <div className="vh-screen__player-placeholder">
                <strong>재생할 영상을 선택해 주세요.</strong>
                <p>아래 이어보기나 사전 확인 이력에서 영상을 누르면 여기에서 바로 재생할 수 있어요.</p>
              </div>
            )}
          </div>
        </section>

        <ViewingHistoryPanel
          familyName={familyName}
          viewingHistory={viewingHistory}
          recentAlerts={recentAlerts}
          analysisHistory={analysisHistory}
          selectedVideoId={selectedVideoId}
          onSelectVideo={(videoId, title) => {
            setSelectedVideoId(videoId)
            setSelectedVideoTitle(title ?? `유튜브 영상 ${videoId}`)
          }}
        />
      </div>
    </div>
  )
}
