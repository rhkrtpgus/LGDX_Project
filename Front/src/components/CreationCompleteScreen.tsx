// 03_생성완료 (3초 자동 → kids-main) — 친근한 메시지 + 캐릭터 등장 애니메이션
import { useState, useEffect } from 'react'
import { KidsTopNav } from './KidsTopNav'
import { BearIcon } from './BearIcon'

const STEPS = [
  '프로필 정보를 저장하고 있어요...',
  '멋진 프로필을 만들고 있어요! ✨',
  '거의 다 됐어요! 🎉',
]

import type { ScreenId } from '../data/kidsProfileFlow'

export function CreationCompleteScreen({ onNavigate: _onNavigate }: { onNavigate?: (s: ScreenId) => void }) {
  const [step, setStep] = useState(0)
  const [showCheck, setShowCheck] = useState(false)

  useEffect(() => {
    const t1 = setTimeout(() => setStep(1), 700)
    const t2 = setTimeout(() => setStep(2), 1500)
    const t3 = setTimeout(() => setShowCheck(true), 2100)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [])

  return (
    <div className="screen screen--kids screen--center">
      <KidsTopNav showBack={false} />

      <div className="creation-complete">
        {/* 곰 캐릭터 – 완료 전엔 bounce, 완료 후엔 pop */}
        <div className={`cc-bear${showCheck ? ' cc-bear--done' : ' cc-bear--bounce'}`}>
          <BearIcon size={96} />
        </div>

        {/* 단계별 메시지 – key 바뀔 때마다 fade-in */}
        <p className="cc-step-msg" key={step}>{STEPS[step]}</p>

        {/* 완료 체크 (2.1초 후 등장) */}
        {showCheck && (
          <div className="cc-check-wrap">
            <h2 className="kc-title">키즈 프로필 생성이 완료되었습니다</h2>
            <div className="checkmark-circle cc-check-pop">
              <svg viewBox="0 0 24 24" fill="none" stroke="#1a1a1a" strokeWidth={2.8}
                strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
          </div>
        )}
      </div>

      <div className="auto-bar running" />
    </div>
  )
}
