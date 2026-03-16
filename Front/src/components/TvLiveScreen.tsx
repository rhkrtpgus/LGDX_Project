type TvLiveScreenProps = {
  onBack: () => void
}

export function TvLiveScreen({ onBack }: TvLiveScreenProps) {
  return (
    <div className="screen tv-live-screen">
      <div className="tv-live-shell">
        <span className="tv-live-shell__badge">TV 시청</span>
        <h2>부모 인증 후 TV 시청 화면으로 들어왔어요</h2>
        <p>
          현재 이 화면은 공중파/실시간 채널 시청 진입용 껍데기입니다.
          보호자 PIN 확인 뒤에만 접근되도록 연결되어 있어요.
        </p>
        <button type="button" className="tv-live-shell__button" onClick={onBack}>
          메인으로 돌아가기
        </button>
      </div>
    </div>
  )
}
