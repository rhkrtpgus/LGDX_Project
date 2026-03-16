// 키즈 프로필 생성 – 5단계 폼 (이름 → 나이/곰 옷입기 → 시청시간 → 선호콘텐츠 → 스마트캠)
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import type { ScreenId } from '../data/kidsProfileFlow'
import type { ChildProfile } from '../data/profiles'
import { getThemeByAge, ALL_CONTENTS } from '../data/profiles'

type Step = 'name' | 'age' | 'time' | 'interests' | 'cam' | 'build'

type Props = {
  onNavigate: (screen: ScreenId) => void
  onAddProfile: (profile: ChildProfile) => void
}

const COLORS = ['#FFB3D1','#90C8F0','#B5E8A0','#FFD580','#C9A0F5','#80D8D8','#F5A0A0','#A0C0F5']
const TIME_OPTIONS = [30, 60, 90, 120]
const BUILD_MSGS = [
  '이름을 새기고 있어요... ✏️',
  '연령에 맞는 콘텐츠를 찾고 있어요... 📚',
  '시청 시간 설정 중... ⏰',
  '프로필 완성! 🎉',
]

// 나이대별 곰돌이 옷 설정
type BearOutfit = {
  range: string
  label: string
  bodyColor: string
  outfitColor: string
  outfitType: 'overalls' | 'tshirt' | 'uniform' | 'hoodie'
  accessory: string  // emoji
  bgColor: string
}
function getBearOutfit(age: number): BearOutfit {
  if (age <= 3)  return { range:'2-3세', label:'아기',       bodyColor:'#F4C2A1', outfitColor:'#FFB3D1', outfitType:'overalls', accessory:'🍼', bgColor:'#FFF0F5' }
  if (age <= 5)  return { range:'4-5세', label:'유아',       bodyColor:'#F4C2A1', outfitColor:'#FFD580', outfitType:'overalls', accessory:'🧸', bgColor:'#FFF9E6' }
  if (age <= 7)  return { range:'6-7세', label:'유치원생',   bodyColor:'#F4C2A1', outfitColor:'#90C8F0', outfitType:'tshirt',   accessory:'🎒', bgColor:'#EAF4FF' }
  if (age <= 9)  return { range:'8-9세', label:'초등 저학년', bodyColor:'#F4C2A1', outfitColor:'#B5E8A0', outfitType:'uniform',  accessory:'📚', bgColor:'#EAF7EA' }
  return              { range:'10+세', label:'초등 고학년', bodyColor:'#F4C2A1', outfitColor:'#C9A0F5', outfitType:'hoodie',   accessory:'🎮', bgColor:'#F3EAFF' }
}

// 인기 태그 목록
const INTEREST_TAGS = [
  { id:'songs',   label:'음악·동요', emoji:'🎵' },
  { id:'habits',  label:'생활·습관', emoji:'🦷' },
  { id:'arts',    label:'창의·미술', emoji:'🎨' },
  { id:'speech',  label:'언어·학습', emoji:'📖' },
  { id:'sports',  label:'운동·체조', emoji:'⚽' },
  { id:'science', label:'과학·탐구', emoji:'🔬' },
]

// 페이지 전환 variants
const pageV = {
  enter:  (dir: number) => ({ x: dir * 60, opacity: 0 }),
  center: { x: 0, opacity: 1, transition: { type: 'spring' as const, damping: 22, stiffness: 260 } },
  exit:   (dir: number) => ({ x: dir * -60, opacity: 0, transition: { duration: 0.18 } }),
}

const STEPS: Step[] = ['name','age','time','interests','cam','build']

export function ProfileCreateFormScreen({ onNavigate, onAddProfile }: Props) {
  const [step, setStep]           = useState<Step>('name')
  const [dir, setDir]             = useState(1)
  const [name, setName]           = useState('')
  const [age, setAge]             = useState(5)
  const [color, setColor]         = useState(COLORS[0])
  const [timeLimit, setTimeLimit] = useState(60)
  const [interests, setInterests] = useState<Set<string>>(new Set())
  const [useCam, setUseCam]       = useState<boolean | null>(null)
  const [buildStep, setBuildStep] = useState(0)
  const [buildDone, setBuildDone] = useState(false)
  const [prevAge, setPrevAge]     = useState(age)
  const [bearChanging, setBearChanging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const theme  = getThemeByAge(age)
  const outfit = getBearOutfit(age)
  const stepIdx = STEPS.indexOf(step)

  // 이름 입력 자동 포커스
  useEffect(() => {
    if (step === 'name') setTimeout(() => inputRef.current?.focus(), 120)
  }, [step])

  // 나이 변경 시 옷 바꾸기 애니메이션 트리거
  useEffect(() => {
    if (age === prevAge) return
    setBearChanging(true)
    const t = setTimeout(() => { setBearChanging(false); setPrevAge(age) }, 500)
    return () => clearTimeout(t)
  }, [age])

  // 빌드 애니메이션
  useEffect(() => {
    if (step !== 'build') return
    setBuildStep(0); setBuildDone(false)
    const timers: ReturnType<typeof setTimeout>[] = []
    BUILD_MSGS.forEach((_, i) => {
      timers.push(setTimeout(() => {
        setBuildStep(i + 1)
        if (i === BUILD_MSGS.length - 1) {
          setTimeout(() => {
            setBuildDone(true)
            setTimeout(() => {
              const np: ChildProfile = {
                id: `profile-${Date.now()}`,
                name, age, color,
                bgGradient: `linear-gradient(135deg, ${outfit.bgColor} 0%, ${color}33 100%)`,
                timeLimit,
                interests: Array.from(interests),
              }
              onAddProfile(np)
              onNavigate('kids-main')
            }, 900)
          }, 400)
        }
      }, i * 950))
    })
    return () => timers.forEach(clearTimeout)
  }, [step])

  function go(next: Step) { setDir(1); setStep(next) }
  function back(prev: Step) { setDir(-1); setStep(prev) }

  function toggleInterest(id: string) {
    setInterests(prev => {
      const s = new Set(prev)
      s.has(id) ? s.delete(id) : s.add(id)
      return s
    })
  }

  function changeAge(delta: number) {
    setAge(a => Math.max(2, Math.min(13, a + delta)))
  }

  return (
    <div className="screen pcf2-screen" style={{ background: outfit.bgColor }}>

      {/* 뒤로 버튼 */}
      {step !== 'build' && (
        <button type="button" className="pcf2-back"
          onClick={() => {
            const prev: Record<Step, Step | null> = {
              name:'name', age:'name', time:'age', interests:'time', cam:'interests', build:'cam'
            }
            const p = prev[step]
            if (p && p !== step) back(p); else onNavigate('profile-type')
          }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}
            strokeLinecap="round" strokeLinejoin="round" width={20} height={20}>
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      )}

      {/* 진행 바 */}
      <div className="pcf2-progress">
        {STEPS.slice(0, -1).map((s, i) => (
          <div key={s} className="pcf2-progress-seg">
            <div
              className="pcf2-progress-fill"
              style={{
                width: stepIdx > i ? '100%' : stepIdx === i ? '50%' : '0%',
                background: theme.accent,
              }}
            />
          </div>
        ))}
      </div>

      {/* ── 단계별 컨텐츠 ── */}
      <AnimatePresence mode="wait" custom={dir}>
        <motion.div
          key={step}
          className="pcf2-step"
          custom={dir}
          variants={pageV}
          initial="enter" animate="center" exit="exit"
        >

          {/* ══ Step 1: 이름 ══ */}
          {step === 'name' && (
            <>
              <div className="pcf2-avatar" style={{ background: color }}>
                <span className="pcf2-avatar-char">{name ? name[0] : '?'}</span>
              </div>
              <h2 className="pcf2-question">이름이 뭐예요?</h2>
              <p className="pcf2-hint">아이의 이름을 입력해 주세요</p>
              <input
                ref={inputRef}
                className="pcf2-input"
                style={{ borderColor: theme.accent }}
                type="text"
                placeholder="예: 민준, 서연, 하은..."
                maxLength={10}
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && name.trim() && go('age')}
              />
              <div className="pcf2-colors">
                {COLORS.map(c => (
                  <button key={c} type="button"
                    className={`pcf2-color-dot${color === c ? ' pcf2-color-dot--on' : ''}`}
                    style={{ background: c }}
                    onClick={() => setColor(c)}
                  />
                ))}
              </div>
              <button type="button" className="pcf2-btn" style={{ background: theme.accent }}
                disabled={!name.trim()} onClick={() => go('age')}>
                다음 →
              </button>
            </>
          )}

          {/* ══ Step 2: 나이 + 곰돌이 옷 입기 ══ */}
          {step === 'age' && (
            <>
              <h2 className="pcf2-question">{name}, 몇 살인가요?</h2>
              <p className="pcf2-hint">나이에 꼭 맞는 옷을 입혀줄게요!</p>

              {/* 곰돌이 캐릭터 */}
              <div className="bear-stage">
                {/* 배경 원 */}
                <div className="bear-bg" style={{ background: `${theme.accent}22` }} />

                {/* 나이 뱃지 */}
                <div className="bear-age-badge" style={{ background: theme.accent }}>
                  {outfit.range}
                </div>

                {/* 곰돌이 SVG */}
                <div className={`bear-wrap${bearChanging ? ' bear-wrap--changing' : ''}`}>
                  <BearSVG outfit={getBearOutfit(prevAge)} changing={bearChanging} />
                </div>

                {/* 액세서리 이모지 */}
                <div className={`bear-accessory${bearChanging ? ' bear-accessory--fly' : ''}`}>
                  {outfit.accessory}
                </div>
              </div>

              {/* 나이 선택 */}
              <div className="pcf2-age-row">
                <button type="button" className="pcf2-age-btn" style={{ color: theme.accent, borderColor: theme.accent }}
                  onClick={() => changeAge(-1)}>−</button>
                <div className="pcf2-age-display">
                  <span className="pcf2-age-num" style={{ color: theme.accent }}>{age}</span>
                  <span className="pcf2-age-unit">세</span>
                </div>
                <button type="button" className="pcf2-age-btn" style={{ color: theme.accent, borderColor: theme.accent }}
                  onClick={() => changeAge(1)}>+</button>
              </div>

              <div className="pcf2-age-quick">
                {[2,3,4,5,6,7,8,9,10,11,12].map(n => (
                  <button key={n} type="button"
                    className={`pcf2-age-quick-btn${age===n ? ' pcf2-age-quick-btn--on' : ''}`}
                    style={age===n ? { background: theme.accent, color:'#fff', borderColor: theme.accent } : {}}
                    onClick={() => setAge(n)}>{n}</button>
                ))}
              </div>

              <button type="button" className="pcf2-btn" style={{ background: theme.accent }}
                onClick={() => go('time')}>
                다음 →
              </button>
            </>
          )}

          {/* ══ Step 3: 시청 시간 ══ */}
          {step === 'time' && (
            <>
              <div className="pcf2-step-icon" style={{ background: `${theme.accent}22` }}>
                <span style={{ fontSize: 40 }}>⏰</span>
              </div>
              <h2 className="pcf2-question">하루에 얼마나 볼 수 있을까요?</h2>
              <p className="pcf2-hint">시청 시간을 설정해 두면 알림을 드려요</p>

              <div className="pcf2-time-grid">
                {TIME_OPTIONS.map(t => (
                  <button key={t} type="button"
                    className={`pcf2-time-btn${timeLimit===t ? ' pcf2-time-btn--on' : ''}`}
                    style={timeLimit===t ? { background: theme.accent, borderColor: theme.accent } : {}}
                    onClick={() => setTimeLimit(t)}
                  >
                    <span className="pcf2-time-num">{t < 60 ? t : t/60}</span>
                    <span className="pcf2-time-unit">{t < 60 ? '분' : '시간'}</span>
                    {t === 60 && <span className="pcf2-time-badge">추천</span>}
                  </button>
                ))}
              </div>

              <p className="pcf2-time-note" style={{ color: theme.accent }}>
                시청 시간이 {timeLimit}분을 초과하면 알림이 울려요
              </p>
              <button type="button" className="pcf2-btn" style={{ background: theme.accent }}
                onClick={() => go('interests')}>
                다음 →
              </button>
            </>
          )}

          {/* ══ Step 4: 관심 콘텐츠 ══ */}
          {step === 'interests' && (
            <>
              <div className="pcf2-step-icon" style={{ background: `${theme.accent}22` }}>
                <span style={{ fontSize: 40 }}>🎯</span>
              </div>
              <h2 className="pcf2-question">어떤 걸 좋아해요?</h2>
              <p className="pcf2-hint">여러 개 선택해도 돼요</p>

              <div className="pcf2-interests">
                {INTEREST_TAGS.map(tag => {
                  const on = interests.has(tag.id)
                  return (
                    <button key={tag.id} type="button"
                      className={`pcf2-interest-chip${on ? ' pcf2-interest-chip--on' : ''}`}
                      style={on ? { background: theme.accent, borderColor: theme.accent } : {}}
                      onClick={() => toggleInterest(tag.id)}
                    >
                      <span>{tag.emoji}</span>
                      <span>{tag.label}</span>
                    </button>
                  )
                })}
              </div>

              {/* 선택된 관심사에 맞는 콘텐츠 미리보기 */}
              {interests.size > 0 && (
                <div className="pcf2-preview-bar">
                  <p className="pcf2-preview-label">이런 콘텐츠를 추천해 드려요</p>
                  <div className="pcf2-preview-chips">
                    {ALL_CONTENTS
                      .filter(c => c.tags.some(t => interests.has(t)) && age >= c.ageMin && age <= c.ageMax)
                      .slice(0, 4)
                      .map(c => (
                        <span key={c.id} className="pcf2-preview-chip"
                          style={{ background: c.color }}>{c.title}</span>
                      ))}
                  </div>
                </div>
              )}

              <button type="button" className="pcf2-btn" style={{ background: theme.accent }}
                onClick={() => go('cam')}>
                {interests.size > 0 ? `다음 (${interests.size}개 선택) →` : '건너뛰기 →'}
              </button>
            </>
          )}

          {/* ══ Step 5: 스마트캠 ══ */}
          {step === 'cam' && (
            <>
              <div className="pcf2-step-icon" style={{ background: `${theme.accent}22` }}>
                <span style={{ fontSize: 40 }}>📷</span>
              </div>
              <h2 className="pcf2-question">스마트캠을 연결할까요?</h2>
              <p className="pcf2-hint">자녀의 시청 자세와 거리를 확인해 눈 건강을 지켜요</p>

              <div className="pcf2-cam-cards">
                <button type="button"
                  className={`pcf2-cam-card${useCam===true ? ' pcf2-cam-card--on' : ''}`}
                  style={useCam===true ? { borderColor: theme.accent, background: `${theme.accent}15` } : {}}
                  onClick={() => setUseCam(true)}
                >
                  <span className="pcf2-cam-icon">📡</span>
                  <p className="pcf2-cam-title">연결하기</p>
                  <p className="pcf2-cam-desc">시청 거리·자세·시간을<br/>실시간으로 확인해요</p>
                </button>

                <button type="button"
                  className={`pcf2-cam-card${useCam===false ? ' pcf2-cam-card--on' : ''}`}
                  style={useCam===false ? { borderColor: '#999', background: 'rgba(0,0,0,0.04)' } : {}}
                  onClick={() => setUseCam(false)}
                >
                  <span className="pcf2-cam-icon">🚫</span>
                  <p className="pcf2-cam-title">나중에</p>
                  <p className="pcf2-cam-desc">설정에서 언제든지<br/>연결할 수 있어요</p>
                </button>
              </div>

              {useCam === true && (
                <motion.p
                  className="pcf2-cam-note"
                  style={{ color: theme.accent }}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  ✓ 연결 후에는 자녀 보호 설정에서 더 자세히 조절할 수 있어요
                </motion.p>
              )}

              <button type="button" className="pcf2-btn" style={{ background: theme.accent }}
                disabled={useCam === null}
                onClick={() => {
                  if (useCam) onNavigate('cam-before')
                  else go('build')
                }}>
                {useCam === null ? '선택해 주세요' : useCam ? '스마트캠 연결하기 →' : '프로필 완성하기 →'}
              </button>
            </>
          )}

          {/* ══ Step 6: 빌드 애니메이션 ══ */}
          {step === 'build' && (
            <>
              <div
                className={`pcf2-build-bear${buildDone ? ' pcf2-build-bear--done' : ' pcf2-build-bear--pulse'}`}
                style={{ background: color }}
              >
                <BearSVG outfit={outfit} changing={false} />
                {buildDone && (
                  <div className="pcf2-particles">
                    {['🌟','✨','🎉','💫','⭐'].map((e,i) => (
                      <span key={i} className={`pcf2-particle pcf2-particle--${i}`}>{e}</span>
                    ))}
                  </div>
                )}
              </div>

              <div className="pcf2-build-msgs">
                {BUILD_MSGS.map((msg, i) => (
                  <p key={i} className={`pcf2-build-msg${buildStep > i ? ' pcf2-build-msg--on' : ''}`}>
                    {msg}
                  </p>
                ))}
              </div>

              <div className="pcf2-bar-wrap">
                <div className="pcf2-bar-fill"
                  style={{ width:`${(buildStep/BUILD_MSGS.length)*100}%`, background: theme.accent }} />
              </div>

              {buildDone && (
                <motion.p className="pcf2-done-text" style={{ color: theme.accent }}
                  initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}>
                  {name} 프로필이 완성됐어요! 🎊
                </motion.p>
              )}
            </>
          )}

        </motion.div>
      </AnimatePresence>
    </div>
  )
}

// ─── 곰돌이 SVG 컴포넌트 ────────────────────────────────────────────────────
function BearSVG({ outfit, changing }: { outfit: BearOutfit; changing: boolean }) {
  const oc = outfit.outfitColor
  return (
    <svg viewBox="0 0 120 140" className={`bear-svg${changing ? ' bear-svg--swap' : ''}`}>
      {/* 귀 */}
      <circle cx={22} cy={28} r={16} fill={outfit.bodyColor} />
      <circle cx={98} cy={28} r={16} fill={outfit.bodyColor} />
      <circle cx={22} cy={28} r={9}  fill="#E8A080" />
      <circle cx={98} cy={28} r={9}  fill="#E8A080" />

      {/* 머리 */}
      <circle cx={60} cy={48} r={34} fill={outfit.bodyColor} />

      {/* 얼굴 */}
      <ellipse cx={60} cy={54} rx={18} ry={13} fill="#E8A080" />
      {/* 눈 */}
      <circle cx={46} cy={40} r={5} fill="#3a2a1a" />
      <circle cx={74} cy={40} r={5} fill="#3a2a1a" />
      <circle cx={48} cy={38} r={1.5} fill="#fff" />
      <circle cx={76} cy={38} r={1.5} fill="#fff" />
      {/* 코 */}
      <ellipse cx={60} cy={51} rx={5} ry={3.5} fill="#3a2a1a" />
      {/* 입 */}
      <path d="M54 57 Q60 63 66 57" fill="none" stroke="#3a2a1a" strokeWidth={2} strokeLinecap="round" />

      {/* 몸통 */}
      <ellipse cx={60} cy={108} rx={30} ry={28} fill={outfit.bodyColor} />

      {/* ── 옷 (나이별) ── */}
      {outfit.outfitType === 'overalls' && (
        <g className="bear-outfit">
          {/* 멜빵 바지 */}
          <ellipse cx={60} cy={112} rx={26} ry={22} fill={oc} opacity={0.92} />
          <rect x={48} y={88} width={9} height={20} rx={4} fill={oc} />
          <rect x={63} y={88} width={9} height={20} rx={4} fill={oc} />
          {/* 가슴 주머니 */}
          <rect x={52} y={96} width={16} height={12} rx={3} fill="rgba(255,255,255,0.35)" />
          <circle cx={60} cy={93} r={3} fill={oc} stroke="rgba(255,255,255,0.5)" strokeWidth={1.5} />
        </g>
      )}
      {outfit.outfitType === 'tshirt' && (
        <g className="bear-outfit">
          {/* 티셔츠 */}
          <ellipse cx={60} cy={110} rx={27} ry={24} fill={oc} opacity={0.92} />
          {/* 칼라 */}
          <path d="M47 88 Q60 98 73 88" fill={oc} stroke="none" />
          {/* 줄무늬 */}
          <line x1={36} y1={100} x2={84} y2={100} stroke="rgba(255,255,255,0.4)" strokeWidth={3} />
          <line x1={36} y1={110} x2={84} y2={110} stroke="rgba(255,255,255,0.4)" strokeWidth={3} />
          {/* 소매 */}
          <ellipse cx={33} cy={96} rx={10} ry={7} fill={oc} opacity={0.85} transform="rotate(-15,33,96)" />
          <ellipse cx={87} cy={96} rx={10} ry={7} fill={oc} opacity={0.85} transform="rotate(15,87,96)" />
        </g>
      )}
      {outfit.outfitType === 'uniform' && (
        <g className="bear-outfit">
          {/* 교복 상의 */}
          <ellipse cx={60} cy={108} rx={27} ry={24} fill={oc} opacity={0.92} />
          {/* 흰 셔츠 칼라 */}
          <path d="M50 88 L60 100 L70 88" fill="#fff" opacity={0.8} />
          {/* 넥타이 */}
          <path d="M58 91 L60 108 L62 91 Z" fill="#E05A5A" />
          {/* 단추 */}
          {[95,105,115].map(y => <circle key={y} cx={60} cy={y} r={2} fill="rgba(255,255,255,0.6)" />)}
          {/* 소매 */}
          <ellipse cx={33} cy={98} rx={10} ry={7} fill={oc} opacity={0.85} transform="rotate(-15,33,98)" />
          <ellipse cx={87} cy={98} rx={10} ry={7} fill={oc} opacity={0.85} transform="rotate(15,87,98)" />
        </g>
      )}
      {outfit.outfitType === 'hoodie' && (
        <g className="bear-outfit">
          {/* 후드티 몸통 */}
          <ellipse cx={60} cy={110} rx={28} ry={25} fill={oc} opacity={0.92} />
          {/* 후드 */}
          <path d="M38 88 Q40 78 60 82 Q80 78 82 88" fill={oc} opacity={0.92} />
          {/* 주머니 */}
          <path d="M46 116 Q60 120 74 116 L74 130 Q60 134 46 130 Z" fill="rgba(0,0,0,0.12)" />
          {/* 소매 */}
          <ellipse cx={32} cy={100} rx={11} ry={7} fill={oc} opacity={0.85} transform="rotate(-15,32,100)" />
          <ellipse cx={88} cy={100} rx={11} ry={7} fill={oc} opacity={0.85} transform="rotate(15,88,100)" />
          {/* 앞 지퍼선 */}
          <line x1={60} y1={85} x2={60} y2={128} stroke="rgba(255,255,255,0.3)" strokeWidth={2} strokeDasharray="4 3" />
        </g>
      )}
    </svg>
  )
}
