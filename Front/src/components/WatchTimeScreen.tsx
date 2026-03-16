// 03_시청 시간 설정 (card_01 클릭 → interest)
import type { ScreenId } from '../data/kidsProfileFlow'
import { TIME_CARDS } from '../data/kidsProfileFlow'
import { KidsTopNav } from './KidsTopNav'
import { BearIcon } from './BearIcon'

type WatchTimeScreenProps = {
  onNavigate: (screen: ScreenId) => void
}

export function WatchTimeScreen({ onNavigate }: WatchTimeScreenProps) {
  return (
    <div className="screen screen--kids">
      <KidsTopNav />
      <div className="kc">
        <h2 className="kc-title">아이에게 적당한 시청 시간을 정해주세요.</h2>
        <p className="kc-sub">연령대별 시청시간을 제안해드려요.</p>
        <div className="card-row">
          {TIME_CARDS.map((card) => (
            <button
              key={card.id}
              type="button"
              className={`kcard${card.recommended ? ' kcard--selected' : ''}`}
              onClick={() => onNavigate('interest')}
            >
              <BearIcon />
              <span className="kcard-label">{card.label}</span>
              {card.recommended && (
                <span className="kcard-rec">가장 추천드려요</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
