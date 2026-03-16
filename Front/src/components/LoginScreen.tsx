// 03_로그인 방법 선택하기 (3초 자동 → connected)
import { KidsTopNav } from './KidsTopNav'

export function LoginScreen() {
  return (
    <div className="screen screen--kids">
      <KidsTopNav />
      <div className="kc">
        <h2 className="kc-title">로그인 방법을 선택해주세요</h2>
        <p className="kc-sub">시청 리포트 확인을 위해서는 ThinQ 다운로드가 필요합니다.</p>

        <div className="login-cols">
          {/* ① QR 코드 스캔 */}
          <div className="login-col">
            <div className="login-num">1</div>
            <p className="login-col-title">스마트폰으로 QR코드를<br />스캔해주세요</p>
            <div className="qr-box">
              <div className="qr-grid" />
            </div>
          </div>

          {/* ② ThinQ 코드 입력 */}
          <div className="login-col">
            <div className="login-num">2</div>
            <p className="login-col-title">ThinQ에서 다음 코드를<br />입력해주세요</p>
            <div className="code-text">0759-0100</div>
          </div>
        </div>

        <button type="button" className="k-btn k-btn--blue">아이디로 로그인하기</button>
        <button type="button" className="k-btn k-btn--white">LG전자 계정 생성하기</button>
      </div>
    </div>
  )
}
