// LG 스마트캠 아이콘 컴포넌트

type WebcamIconProps = {
  glowing?: boolean // 연결 중 펄스 효과
}

export function WebcamIcon({ glowing = false }: WebcamIconProps) {
  return (
    <div className={`webcam-wrap${glowing ? ' webcam-wrap--glowing' : ''}`}>
      {glowing && <div className="webcam-glow-ring" />}
      <div className="webcam-body">
        {/* 렌즈 */}
        <div className="webcam-lens">
          <div className="webcam-lens-inner" />
        </div>
        {/* 표시등 */}
        <div className="webcam-led" />
        {/* 받침대 */}
        <div className="webcam-base" />
      </div>
    </div>
  )
}
