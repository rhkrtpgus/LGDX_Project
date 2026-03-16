// 03_스마트캠 연결전 (연결하기 클릭 → cam-connecting)
import type { ScreenId } from '../data/kidsProfileFlow'
import { KidsTopNav } from './KidsTopNav'
import { WebcamIcon } from './WebcamIcon'

type SmartCamBeforeScreenProps = {
  onNavigate: (screen: ScreenId) => void
}

export function SmartCamBeforeScreen({ onNavigate }: SmartCamBeforeScreenProps) {
  return (
    <div className="screen screen--kids screen--center">
      <KidsTopNav />
      <div className="kc">
        <h2 className="kc-title">LG 스마트 캠이 있나요?</h2>
        <p className="kc-sub">스마트캠이 있으면 시청 자세, 거리, 눈깜박임 등을 관리할 수 있어요</p>
        <WebcamIcon />
        <button
          type="button"
          className="k-btn k-btn--blue"
          onClick={() => onNavigate('cam-connecting')}
          style={{ marginTop: 40 }}
        >
          연결하기
        </button>
        <button
          type="button"
          className="k-btn k-btn--white"
          onClick={() => onNavigate('done')}
        >
          넘어가기
        </button>
      </div>
    </div>
  )
}
