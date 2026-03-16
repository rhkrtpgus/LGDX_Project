// 03_관심사 설정 (다중 선택 → 확인 → cam-before)
import { useState } from 'react'
import type { ScreenId } from '../data/kidsProfileFlow'
import { INTEREST_CARDS } from '../data/kidsProfileFlow'
import { KidsTopNav } from './KidsTopNav'
import { BearIcon } from './BearIcon'

type InterestScreenProps = {
  onNavigate: (screen: ScreenId) => void
}

export function InterestScreen({ onNavigate }: InterestScreenProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set())

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <div className="screen screen--kids">
      <KidsTopNav />
      <div className="kc">
        <h2 className="kc-title">아이의 관심사를 알려주세요</h2>
        <p className="kc-sub">여러개 선택이 가능해요</p>
        <div className="card-row">
          {INTEREST_CARDS.map((card) => (
            <button
              key={card.id}
              type="button"
              className={`kcard${selected.has(card.id) ? ' kcard--selected' : ''}`}
              onClick={() => toggle(card.id)}
            >
              <BearIcon />
              <span className="kcard-label">{card.label}</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          className="k-btn k-btn--blue"
          disabled={selected.size === 0}
          style={{ opacity: selected.size === 0 ? 0.4 : 1 }}
          onClick={() => onNavigate('cam-before')}
        >
          확인 ({selected.size}개 선택)
        </button>
      </div>
    </div>
  )
}
