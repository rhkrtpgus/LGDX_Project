// 02_프로필 유형 선택 – 일반 / 키즈 카드 선택 화면
import { motion } from 'motion/react'
import type { ScreenId } from '../data/kidsProfileFlow'

type ProfileTypeScreenProps = {
  onNavigate: (screen: ScreenId) => void
}

export function ProfileTypeScreen({ onNavigate }: ProfileTypeScreenProps) {
  return (
    <div className="screen pts-screen">
      {/* 뒤로 */}
      <button type="button" className="pts-back" onClick={() => onNavigate('main')}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
          strokeLinecap="round" strokeLinejoin="round" width={20} height={20}>
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

      <div className="pts-content">
        <h1 className="pts-title">어떤 프로필을 만들까요?</h1>
        <p className="pts-sub">프로필 유형을 선택하면 맞춤 설정을 시작합니다</p>

        <div className="pts-cards">
          {/* 일반 프로필 */}
          <motion.button
            type="button"
            className="pts-card"
            whileHover={{ y: -6, scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onNavigate('login')}
          >
            <div className="pts-card-icon pts-card-icon--adult">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}
                strokeLinecap="round" strokeLinejoin="round" width={40} height={40}>
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx={12} cy={7} r={4} />
              </svg>
            </div>
            <p className="pts-card-title">일반 프로필</p>
            <p className="pts-card-desc">모든 콘텐츠를 자유롭게<br/>이용할 수 있습니다</p>
            <ul className="pts-card-features">
              <li>✓ 제한 없는 콘텐츠 접근</li>
              <li>✓ 개인화 추천</li>
              <li>✓ LG 계정 연동</li>
            </ul>
          </motion.button>

          {/* 키즈 프로필 */}
          <motion.button
            type="button"
            className="pts-card pts-card--kids"
            whileHover={{ y: -6, scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onNavigate('profile-create')}
          >
            <span className="pts-card-badge">추천</span>
            <div className="pts-card-icon pts-card-icon--kids">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}
                strokeLinecap="round" strokeLinejoin="round" width={40} height={40}>
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx={9} cy={7} r={4} />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <p className="pts-card-title">키즈 프로필</p>
            <p className="pts-card-desc">연령에 맞는 콘텐츠만<br/>안전하게 이용합니다</p>
            <ul className="pts-card-features">
              <li>✓ 연령별 콘텐츠 필터링</li>
              <li>✓ 시청 시간 제한</li>
              <li>✓ 스마트캠 연동 가능</li>
            </ul>
          </motion.button>
        </div>
      </div>
    </div>
  )
}
