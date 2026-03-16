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

export function ViewingHistoryScreen({
  familyName,
  viewingHistory,
  recentAlerts,
  analysisHistory,
}: ViewingHistoryScreenProps) {
  return (
    <div className="screen screen--kids">
      <div className="vh-screen">
        <div className="vh-screen__hero">
          <span className="vh-screen__badge">TV 시청 리포트</span>
          <h2>{familyName} 시청 기록</h2>
          <p>시청 기록, 보호 알림, 사전 확인 결과를 한 화면에서 이어서 확인할 수 있도록 정리했습니다.</p>
        </div>
        <ViewingHistoryPanel
          familyName={familyName}
          viewingHistory={viewingHistory}
          recentAlerts={recentAlerts}
          analysisHistory={analysisHistory}
        />
      </div>
    </div>
  )
}
