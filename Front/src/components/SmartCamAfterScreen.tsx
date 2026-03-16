// 03_스마트캠 연결후 (다음으로 클릭 → done)
import type { ScreenId } from '../data/kidsProfileFlow'
import { KidsTopNav } from './KidsTopNav'
import { WebcamIcon } from './WebcamIcon'

type SmartCamAfterScreenProps = {
  onNavigate: (screen: ScreenId) => void
}

export function SmartCamAfterScreen({ onNavigate }: SmartCamAfterScreenProps) {
  return (
    <div className="screen screen--kids screen--center">
      <KidsTopNav />
      <div className="kc">
        <h2 className="kc-title">LG 스마트 캠 연결됐습니다</h2>
        <WebcamIcon />
        <button
          type="button"
          className="k-btn k-btn--white"
          onClick={() => onNavigate('done')}
          style={{ marginTop: 40 }}
        >
          다음으로
        </button>
      </div>
    </div>
  )
}
