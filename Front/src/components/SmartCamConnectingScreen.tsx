// 03_스마트캠 연결중 (3초 자동 → cam-after)
import { KidsTopNav } from './KidsTopNav'
import { WebcamIcon } from './WebcamIcon'

export function SmartCamConnectingScreen() {
  return (
    <div className="screen screen--kids screen--center">
      <KidsTopNav />
      <div style={{ textAlign: 'center' }}>
        <h2 className="kc-title">LG 스마트 캠 연결하기</h2>
        <p className="kc-sub">케이블이 연결되어있는지 확인해주세요</p>
        <WebcamIcon glowing />
        <p className="connecting-label">카메라를 찾고있습니다</p>
      </div>
      <div className="auto-bar running" />
    </div>
  )
}
