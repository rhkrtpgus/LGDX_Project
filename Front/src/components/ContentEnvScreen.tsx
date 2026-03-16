// 03_콘텐츠 환경 선택 (card_01 클릭 → time)
import type { ScreenId } from '../data/kidsProfileFlow'
import { CONTENT_CARDS } from '../data/kidsProfileFlow'
import { KidsTopNav } from './KidsTopNav'
import { BearIcon } from './BearIcon'

type ContentEnvScreenProps = {
  onNavigate: (screen: ScreenId) => void
}

export function ContentEnvScreen({ onNavigate }: ContentEnvScreenProps) {
  return (
    <div className="screen screen--kids">
      <KidsTopNav />
      <div className="kc">
        <h2 className="kc-title">자녀에게 알맞은 콘텐츠 환경 선택</h2>
        <p className="kc-sub">나이를 선택하면 추천 콘텐츠가 자동으로 설정돼요.<br />설정은 나중에 변경할 수 있어요.</p>
        <div className="card-row">
          {CONTENT_CARDS.map((card) => (
            <button
              key={card.id}
              type="button"
              className="kcard"
              onClick={() => onNavigate('time')}
            >
              <BearIcon />
              <span className="kcard-label">{card.label}</span>
              <span className="kcard-sub">{card.sub}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
