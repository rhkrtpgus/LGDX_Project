// 키즈 캐릭터 곰 아이콘 SVG 컴포넌트

type BearIconProps = {
  size?: number
}

export function BearIcon({ size = 72 }: BearIconProps) {
  return (
    <svg viewBox="0 0 80 80" width={size} height={size} xmlns="http://www.w3.org/2000/svg">
      {/* 귀 */}
      <circle cx={22} cy={24} r={11} fill="#F5B840" />
      <circle cx={58} cy={24} r={11} fill="#F5B840" />
      <circle cx={22} cy={24} r={6}  fill="#E8963A" />
      <circle cx={58} cy={24} r={6}  fill="#E8963A" />
      {/* 머리 */}
      <circle cx={40} cy={44} r={25} fill="#F5B840" />
      {/* 눈 */}
      <circle cx={31} cy={39} r={3.5} fill="#2a2a2a" />
      <circle cx={49} cy={39} r={3.5} fill="#2a2a2a" />
      <circle cx={32.5} cy={37.5} r={1.2} fill="#fff" />
      <circle cx={50.5} cy={37.5} r={1.2} fill="#fff" />
      {/* 코 */}
      <ellipse cx={40} cy={48} rx={9} ry={6}   fill="#E8963A" />
      <ellipse cx={40} cy={46} rx={4.5} ry={2.5} fill="#C4702A" />
      {/* 입 */}
      <path d="M34 52 Q40 57 46 52" stroke="#C4702A" strokeWidth={1.8}
        fill="none" strokeLinecap="round" />
      {/* 새싹 */}
      <line x1={40} y1={18} x2={40} y2={10} stroke="#4CAF50" strokeWidth={2} />
      <ellipse cx={37} cy={9} rx={4.5} ry={7}   fill="#66BB6A"
        transform="rotate(-20 37 9)" />
      <ellipse cx={43} cy={10} rx={4}  ry={6.5} fill="#4CAF50"
        transform="rotate(20 43 10)" />
    </svg>
  )
}
