import type {
  AnalysisResponse,
  ParentAlertResponse,
  ChildWatchPolicyResponse,
  ParentChildResponse,
  RuntimeSettingsResponse,
  SystemHealthResponse,
} from '../lib/api'
import {
  getEnabledYoutubeCategories,
  YOUTUBE_CATEGORY_OPTIONS,
  type YoutubeCategoryId,
  type YoutubeCategorySettings,
} from '../data/youtubeExperience'
import { summarizeAlert } from '../lib/integration'

type RatioLabel =
  | '교육'
  | '음악·동요'
  | '엔터테인먼트'
  | '동화·애니'
  | '과학·탐구'
  | '가족·일상'
  | '기타'

type ThinQScreenProps = {
  onBack: () => void
  familyName: string
  dailySummary: string
  alertSummary: string
  recentAlerts: ParentAlertResponse[]
  analysisHistory: AnalysisResponse[]
  runtimeSettings: RuntimeSettingsResponse | null
  systemHealth: SystemHealthResponse | null
  serverLoading: boolean
  childSummaries: ParentChildResponse[]
  youtubeCategorySettings: YoutubeCategorySettings
  onUpdateYoutubeCategory: (categoryId: YoutubeCategoryId, enabled: boolean) => void
  onToggleAutoBlock: (childId: number, enabled: boolean) => Promise<void> | void
  onUpdateWatchPolicy: (childId: number, patch: Partial<ChildWatchPolicyResponse>) => Promise<void> | void
}

export function ThinQScreen({
  onBack,
  familyName,
  dailySummary,
  alertSummary,
  recentAlerts,
  analysisHistory,
  runtimeSettings,
  systemHealth,
  serverLoading,
  childSummaries,
  youtubeCategorySettings,
  onUpdateYoutubeCategory,
  onToggleAutoBlock,
  onUpdateWatchPolicy,
}: ThinQScreenProps) {
  const healthChips = systemHealth
    ? [
        { label: 'TV 서비스', value: systemHealth.backend.status === 'UP' ? '정상' : '확인 필요' },
        { label: '기록 저장소', value: systemHealth.database.status === 'UP' ? '정상' : '확인 필요' },
        { label: '콘텐츠 보호', value: systemHealth.mainModel.status === 'UP' ? '정상' : '확인 필요' },
        { label: '시청 케어', value: systemHealth.addictionModel.status === 'UP' ? '정상' : '확인 필요' },
      ]
    : []

  const enabledCategories = getEnabledYoutubeCategories(youtubeCategorySettings)
  const contentMix = buildContentMix(analysisHistory)

  return (
    <div className="screen thinq-screen-shell">
      <div className="thinq-page-head">
        <button type="button" className="thinq-page-back" onClick={onBack}>
          돌아가기
        </button>
        <div className="thinq-page-copy">
          <strong>ThinQ 리포트 대시보드</strong>
          <p>자녀 보호와 시청 흐름을 한 화면에서 보는 전용 대시보드</p>
        </div>
      </div>
      <div className="kc thinq-dashboard">
        <h2 className="kc-title">{familyName} 모바일 리포트</h2>
        <p className="kc-sub">모바일에서 보던 보호 리포트를 TV 안에서도 같은 기준으로 확인하고 바로 조절할 수 있도록 정리했습니다.</p>

        <div className="thinq-row">
          <div className="phone-shell">
            <div className="phone-notch" />
            <div className="thinq-icon">
              <svg viewBox="0 0 44 44" fill="none">
                <rect x={4} y={4} width={36} height={36} rx={8} fill="#e53030" />
                <path d="M14 22 L22 14 L30 22" stroke="#fff" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
                <path d="M22 14 L22 30" stroke="#fff" strokeWidth={2.5} strokeLinecap="round" />
                <circle cx={22} cy={30} r={3} fill="#fff" />
              </svg>
            </div>
            <span className="thinq-name">모바일 리포트</span>
          </div>

          <div className="thinq-insights">
            <div className="thinq-insight-card">
              <span className="thinq-insight-kicker">오늘 요약</span>
              <strong>{dailySummary}</strong>
              <p>{alertSummary}</p>
            </div>
            <div className="thinq-insight-card">
              <span className="thinq-insight-kicker">보호 설정</span>
              <strong>{runtimeSettings?.privacyConsent ? '개인정보 동의 켜짐' : '개인정보 동의 꺼짐'}</strong>
              <p>시청 케어 {runtimeSettings?.addictionMonitorEnabled ? '켜짐' : '꺼짐'}</p>
            </div>
            <div className="thinq-insight-card">
              <span className="thinq-insight-kicker">최근 알림</span>
              <strong>{recentAlerts.length}건</strong>
              <p>{summarizeAlert(recentAlerts[0])}</p>
            </div>
          </div>
        </div>

        <div className="thinq-control-grid">
          <div className="thinq-category-card">
            <div>
              <span className="thinq-insight-kicker">가족 보호</span>
              <strong>{childSummaries.length}명 자녀 보호 상태</strong>
              <p>자녀별 자동 차단 상태와 오늘 시청 시간을 여기에서 바로 확인하고 바꿀 수 있습니다.</p>
            </div>
            <div className="thinq-family-list">
              {childSummaries.map((child) => (
                <div key={child.childId} className="thinq-family-item">
                  <div className="thinq-family-copy">
                    <strong>{child.childName}</strong>
                    <p>
                      오늘 {child.todayWatchMinutes}분 시청 · 제한 {child.watchPolicy.dailyLimitMinutes}분 · {child.viewingAllowedNow ? '지금 시청 가능' : '지금 보호 시간'}
                    </p>
                    <p>
                      취침 잠금 {child.watchPolicy.bedtimeLockEnabled ? '켜짐' : '꺼짐'} · {String(child.watchPolicy.bedtimeHour).padStart(2, '0')}:00
                    </p>
                    <div className="thinq-family-actions">
                      <button
                        type="button"
                        className="thinq-mini-btn"
                        onClick={() => onUpdateWatchPolicy(child.childId, {
                          dailyLimitMinutes: Math.max(0, child.watchPolicy.dailyLimitMinutes - 10),
                        })}
                      >
                        -10분
                      </button>
                      <button
                        type="button"
                        className="thinq-mini-btn"
                        onClick={() => onUpdateWatchPolicy(child.childId, {
                          dailyLimitMinutes: Math.min(240, child.watchPolicy.dailyLimitMinutes + 10),
                        })}
                      >
                        +10분
                      </button>
                      <button
                        type="button"
                        className={`thinq-mini-btn${child.watchPolicy.bedtimeLockEnabled ? ' thinq-mini-btn--active' : ''}`}
                        onClick={() => onUpdateWatchPolicy(child.childId, {
                          bedtimeLockEnabled: !child.watchPolicy.bedtimeLockEnabled,
                        })}
                      >
                        취침 잠금 {child.watchPolicy.bedtimeLockEnabled ? 'ON' : 'OFF'}
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    className={`tv-toggle${child.watchPolicy.autoBlockEnabled ? ' tv-toggle--on' : ''}`}
                    aria-label={`${child.childName} 자동 차단 ${child.watchPolicy.autoBlockEnabled ? '끄기' : '켜기'}`}
                    onClick={() => onToggleAutoBlock(child.childId, !child.watchPolicy.autoBlockEnabled)}
                  >
                    <span className="tv-toggle-knob" />
                  </button>
                </div>
              ))}
              {childSummaries.length === 0 && (
                <div className="thinq-family-item thinq-family-item--empty">
                  <div className="thinq-family-copy">
                    <strong>연결된 자녀 프로필이 없어요.</strong>
                    <p>자녀 프로필을 만들면 가족 보호 상태를 여기서 바로 볼 수 있어요.</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="thinq-category-card">
            <div>
              <span className="thinq-insight-kicker">유튜브 필터</span>
              <strong>{enabledCategories.length}개 카테고리 사용 중</strong>
              <p>설정 화면과 같은 기준으로, 이 화면에서도 허용 카테고리를 바로 켜고 끌 수 있습니다.</p>
            </div>
            <div className="thinq-filter-grid">
              {YOUTUBE_CATEGORY_OPTIONS.map((category) => {
                const enabled = youtubeCategorySettings[category.id]
                return (
                  <button
                    key={category.id}
                    type="button"
                    className={`thinq-filter-chip${enabled ? ' thinq-filter-chip--active' : ''}`}
                    style={enabled ? { borderColor: category.accent, color: category.accent, background: `${category.accent}18` } : {}}
                    onClick={() => onUpdateYoutubeCategory(category.id, !enabled)}
                  >
                    <span>{category.shortLabel}</span>
                    <strong>{enabled ? '켜짐' : '꺼짐'}</strong>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <div className="thinq-category-card">
          <div>
            <span className="thinq-insight-kicker">허용된 유튜브 카테고리</span>
            <strong>{enabledCategories.length}개 사용 중</strong>
            <p>설정에서 고른 필터가 키즈 화면과 리포트에 함께 반영됩니다.</p>
          </div>
          <div className="thinq-category-list">
            {enabledCategories.map((category) => (
              <span key={category.id} className="thinq-category-chip" style={{ background: `${category.accent}22`, color: category.accent }}>
                {category.label}
              </span>
            ))}
            {enabledCategories.length === 0 && (
              <span className="thinq-category-chip thinq-category-chip--empty">아직 허용된 카테고리가 없어요.</span>
            )}
          </div>
        </div>

        <div className="thinq-category-card">
          <div>
            <span className="thinq-insight-kicker">콘텐츠 유형 비율</span>
            <strong>최근 확인 기록 기준으로 보고 있어요</strong>
            <p>교육, 음악, 애니, 탐구 흐름이 한쪽으로 치우치지 않도록 보기 쉽게 정리했습니다.</p>
          </div>
          <div className="thinq-ratio-list">
            {contentMix.map((item) => (
              <div key={item.label} className="thinq-ratio-row">
                <div className="thinq-ratio-meta">
                  <span>{item.label}</span>
                  <strong>{item.percent}%</strong>
                </div>
                <div className="thinq-ratio-bar">
                  <div className="thinq-ratio-fill" style={{ width: `${item.percent}%`, background: item.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="thinq-health-grid">
          {healthChips.map((chip) => (
            <div key={chip.label} className="thinq-health-chip">
              <span>{chip.label}</span>
              <strong>{chip.value}</strong>
            </div>
          ))}
          {serverLoading && (
            <div className="thinq-health-chip">
              <span>동기화</span>
              <strong>불러오는 중</strong>
            </div>
          )}
        </div>
      </div>
      <div className="auto-bar running" />
    </div>
  )
}

function buildContentMix(analysisHistory: AnalysisResponse[]) {
  const fallback = [
    { label: '교육', percent: 35, color: '#4aaef5' },
    { label: '음악·동요', percent: 25, color: '#f58f5c' },
    { label: '동화·애니', percent: 22, color: '#9b7fe8' },
    { label: '과학·탐구', percent: 18, color: '#64c96a' },
  ]

  const categorized = analysisHistory
    .map((item) => normalizeRatioCategory(item.categoryNameKo))
    .filter((item): item is RatioLabel => item !== null)

  if (categorized.length < 4) {
    return fallback
  }

  const counts = new Map<RatioLabel, number>()
  categorized.forEach((label) => {
    counts.set(label, (counts.get(label) ?? 0) + 1)
  })

  if (counts.size < 3) {
    return fallback
  }

  const total = categorized.length
  const colors: Record<RatioLabel, string> = {
    교육: '#4aaef5',
    '음악·동요': '#f58f5c',
    엔터테인먼트: '#f06292',
    '동화·애니': '#9b7fe8',
    '과학·탐구': '#64c96a',
    '가족·일상': '#7dc67e',
    기타: '#8b8fa8',
  }

  return Array.from(counts.entries())
    .map(([label, count]) => ({
      label,
      percent: Math.max(8, Math.round((count / total) * 100)),
      color: colors[label] ?? '#8b8fa8',
    }))
    .sort((left, right) => right.percent - left.percent)
    .slice(0, 4)
}

function normalizeRatioCategory(categoryName: string | null) {
  if (!categoryName) {
    return null
  }

  const value = categoryName.toLowerCase()
  if (value.includes('교육')) return '교육'
  if (value.includes('음악')) return '음악·동요'
  if (value.includes('엔터') || value.includes('예능')) return '엔터테인먼트'
  if (value.includes('애니') || value.includes('영화')) return '동화·애니'
  if (value.includes('과학') || value.includes('기술')) return '과학·탐구'
  if (value.includes('가족') || value.includes('people') || value.includes('blog')) return '가족·일상'
  return '기타'
}
