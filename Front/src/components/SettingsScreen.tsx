// 설정 메인 페이지 – LG webOS 다크 스타일
// 좌측 세로 메뉴 + 우측 콘텐츠 2단 구조
import type { ScreenId } from '../data/kidsProfileFlow'

type SettingsScreenProps = {
  onNavigate: (screen: ScreenId) => void
}

export function SettingsScreen({ onNavigate }: SettingsScreenProps) {
  return (
    <div className="screen settings-screen">

      {/* ── 좌측 카테고리 사이드바 ── */}
      <nav className="settings-sidenav">
        <div className="ssn-item">
          <div className="ssn-dot ssn-dot--orange" />
          <div>
            <p className="ssn-label">영화/TV방송</p>
            <p className="ssn-sub">채널과 콘텐츠</p>
          </div>
        </div>

        {/* ── 키즈 (무지개 아이콘) ── */}
        <div className="ssn-item">
          <div className="ssn-dot ssn-dot--rainbow" />
          <div>
            <p className="ssn-label">키즈</p>
            <p className="ssn-sub">아동 추천 화면</p>
          </div>
        </div>

        <div className="ssn-item">
          <div className="ssn-dot ssn-dot--blue" />
          <div>
            <p className="ssn-label">TV앱</p>
            <p className="ssn-sub">유튜브 보호 기능</p>
          </div>
        </div>

        <div className="ssn-item">
          <div className="ssn-dot ssn-dot--teal" />
          <div>
            <p className="ssn-label">계정 정보</p>
            <p className="ssn-sub">LG ID 연결 상태</p>
          </div>
        </div>

        {/* ── 가족 설정 (신규 강조 메뉴) ── */}
        <div
          className="ssn-item ssn-item--family ssn-item--active"
          onClick={() => onNavigate('settings-child')}
          style={{ cursor: 'pointer' }}
        >
          <div className="ssn-family-icon">
            <svg viewBox="0 0 24 24" fill="none" width={18} height={18}>
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="#FF8C42" strokeWidth={1.8} strokeLinecap="round"/>
              <circle cx={9} cy={7} r={4} stroke="#FF8C42" strokeWidth={1.8}/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke="#5B9BD5" strokeWidth={1.8} strokeLinecap="round"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="#5B9BD5" strokeWidth={1.8} strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <p className="ssn-label">가족 설정</p>
            <p className="ssn-sub">키즈 보호 및 시청 관리</p>
          </div>
          <div className="ssn-family-badge">신규</div>
        </div>

        <div className="ssn-item ssn-item--bottom">
          <div className="ssn-dot ssn-dot--pink" />
          <div>
            <p className="ssn-label">보안 설정</p>
            <p className="ssn-sub">시스템과 동의 관리</p>
          </div>
        </div>
      </nav>

      {/* ── 우측 메인 콘텐츠 ── */}
      <div className="settings-content">

        {/* 히어로 카드 */}
        <div className="settings-hero-card">
          <p className="shc-tag">설정 바로가기</p>
          <h1 className="shc-title">프로필 관리</h1>
          <p className="shc-desc">
            사용자별 홈 화면과 추천 흐름을 관리하는 설정 중심 존.
          </p>
          <div className="shc-tags">
            <span className="shc-tag-chip">프로필</span>
            <span className="shc-tag-chip">잠금</span>
            <span className="shc-tag-chip">개인화</span>
          </div>
          <p className="shc-body">
            가족 구성원마다 다른 시청 습관을 반영하도록 프로필 전환과
            잠금 설정을 전면에 배치했습니다.
          </p>
          <div className="shc-sub-tags">
            <span className="shc-tag-chip">성인</span>
            <span className="shc-tag-chip">키즈</span>
            <span className="shc-tag-chip">게스트</span>
          </div>
          <div className="shc-btns">
            <button
              type="button"
              className="shc-btn shc-btn--yellow"
              onClick={() => onNavigate('settings-child')}
            >
              가족 설정 열기
            </button>
            <button type="button" className="shc-btn shc-btn--dark">설정 안내</button>
          </div>
        </div>

        {/* 오른쪽 사이드 패널 */}
        <div className="settings-side-panel">
          <p className="ssp-title">설정 포인트</p>
          <p className="ssp-body">자주 쓰는 기능을 전면에 압축</p>
          <p className="ssp-body2">
            복잡한 설정 트리 대신 자주 쓰는 환경에서도 빠르게 조정할 수 있어요.
          </p>
          <div className="ssp-stats">
            <div className="ssp-stat">
              <p className="ssp-num">5</p>
              <p className="ssp-lbl">핵심 설정</p>
            </div>
            <div className="ssp-stat">
              <p className="ssp-num">2</p>
              <p className="ssp-lbl">관리 홈</p>
            </div>
          </div>
        </div>

        {/* 하단 메뉴 카드 행 */}
        <div className="settings-row">
          <div className="settings-menu-card">
            <p className="smc-title">설정</p>
            <div className="smc-item">공지사항</div>
            <div className="smc-item smc-item--active">시스템 설정</div>
          </div>

          <div className="settings-menu-card">
            <p className="smc-title">보안 설정</p>
            <div className="smc-item">개인정보 수집 동의</div>
            <div
              className="smc-item smc-item--yellow"
              onClick={() => onNavigate('settings-child')}
              style={{ cursor: 'pointer' }}
            >
              가족·키즈 보호 설정
            </div>
          </div>

          <div className="settings-info-card">
            <p className="sic-title">가족 설정</p>
            <h2 className="sic-heading">키즈 시청 시간 및 콘텐츠 관리</h2>
            <p className="sic-desc">
              자녀별 일일 시청 시간·관람 등급·시청 기록을 한 곳에서 관리하세요.
            </p>
            <div className="sic-row">
              <div className="sic-cell">
                <p className="sic-cell-label">시력 보호</p>
                <p className="sic-cell-value sic-cell-value--running">켜짐</p>
              </div>
              <div className="sic-cell">
                <p className="sic-cell-label">카메라 모니터</p>
                <p className="sic-cell-value sic-cell-value--running">실행 중</p>
              </div>
            </div>
            <button
              type="button"
              className="sic-btn"
              onClick={() => onNavigate('settings-child')}
            >
              가족 설정 바로가기 →
            </button>
          </div>
        </div>
      </div>

      {/* 닫기 */}
      <button
        type="button"
        className="settings-close"
        onClick={() => onNavigate('kids-main')}
        aria-label="닫기"
      >
        ✕
      </button>
    </div>
  )
}
