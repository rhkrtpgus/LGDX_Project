import { createMediaItem, createSpotlight } from './factory'
import type { MediaRow, PageContent, QuickApp } from './home'

const quickApps: QuickApp[] = [
  {
    id: 'settings-profile',
    name: '프로필',
    category: '사용자',
    shortcut: 'S1',
    accent: '#ff544f',
    spotlight: createSpotlight('settings-profile-spotlight', '프로필 관리', '사용자별 홈 화면과 추천 흐름을 관리하는 설정 중심 존.', '가족 구성원마다 다른 시청 습관을 반영하도록 프로필 전환과 잠금 설정을 전면에 배치했습니다.', '설정 바로가기', ['프로필', '잠금', '개인화'], ['성인', '키즈', '게스트'], '#ff544f', 'radial-gradient(circle at 78% 18%, rgba(255, 84, 79, 0.44), transparent 0 34%), linear-gradient(135deg, #2b0908 0%, #160606 48%, #080405 100%)'),
  },
  {
    id: 'settings-display',
    name: '화면',
    category: '디스플레이',
    shortcut: 'S2',
    accent: '#ff8654',
    spotlight: createSpotlight('settings-display-spotlight', '화면 설정', '밝기, 색감, 화면 모드를 큰 화면 기준으로 조정하는 공간.', '빨강/검정 테마에 맞는 깊은 대비와 영화 감상 모드를 빠르게 확인할 수 있게 정리했습니다.', '설정 바로가기', ['밝기', '명암', '화면 모드'], ['영화', '표준', '게임'], '#ff8654', 'radial-gradient(circle at 76% 18%, rgba(255, 134, 84, 0.42), transparent 0 34%), linear-gradient(135deg, #2e1208 0%, #160706 48%, #080405 100%)'),
  },
  {
    id: 'settings-sound',
    name: '사운드',
    category: '오디오',
    shortcut: 'S3',
    accent: '#d4554a',
    spotlight: createSpotlight('settings-sound-spotlight', '사운드 설정', '대사, 저음, 공간감 등 청취 경험을 조정하는 오디오 중심 존.', 'TV 스피커와 외부 사운드바를 오갈 때 혼란이 없도록 주요 설정만 압축해서 보여줍니다.', '설정 바로가기', ['사운드바', '대사 강화', '공간감'], ['표준', '시네마', '야간'], '#d4554a', 'radial-gradient(circle at 74% 18%, rgba(212, 85, 74, 0.42), transparent 0 34%), linear-gradient(135deg, #270b09 0%, #160706 48%, #080405 100%)'),
  },
  {
    id: 'settings-network',
    name: '네트워크',
    category: '연결',
    shortcut: 'S4',
    accent: '#c04a44',
    spotlight: createSpotlight('settings-network-spotlight', '네트워크 설정', '와이파이와 연결 상태를 빠르게 점검하는 연결 중심 설정.', '버퍼링이나 끊김 문제가 생겼을 때 가장 먼저 들어오는 화면이 되도록 핵심 정보 위주로 구성했습니다.', '설정 바로가기', ['와이파이', '속도', '연결 상태'], ['가정망', '유선', '블루투스'], '#c04a44', 'radial-gradient(circle at 74% 18%, rgba(192, 74, 68, 0.42), transparent 0 34%), linear-gradient(135deg, #240a09 0%, #150606 48%, #080405 100%)'),
  },
  {
    id: 'settings-guard',
    name: '보호 모드',
    category: '안전',
    shortcut: 'S5',
    accent: '#aa3f3e',
    spotlight: createSpotlight('settings-guard-spotlight', '보호 모드', '시청 제한과 안전 기능을 한 번에 묶어 다루는 보호 설정 존.', '키즈 보호, 앱 잠금, 시청 시간 제한처럼 실제로 자주 쓰는 제어를 우선 노출했습니다.', '설정 바로가기', ['키즈 보호', '앱 잠금', '시간 제한'], ['PIN', '연령 제한', '시청 관리'], '#aa3f3e', 'radial-gradient(circle at 72% 18%, rgba(170, 63, 62, 0.42), transparent 0 34%), linear-gradient(135deg, #210908 0%, #140606 48%, #080405 100%)'),
  },
]

const rows: MediaRow[] = [
  {
    id: 'settings-favorites',
    title: '자주 쓰는 설정',
    description: '실제로 가장 많이 들어오는 설정 항목을 한 번에 조정할 수 있도록 묶었습니다.',
    items: [
      createMediaItem('settings-picture-mode', '화면 모드', '영화 / 표준 / 게임 모드 전환', '상황에 따라 가장 많이 바꾸는 화면 모드를 카드 한 장에서 바로 조정할 수 있도록 구성했습니다.', '빠른 설정', ['디스플레이', '즉시 적용', '프리셋'], ['영화 모드', '게임 모드'], '#ff7b55', 'radial-gradient(circle at 78% 18%, rgba(255, 123, 85, 0.4), transparent 0 32%), linear-gradient(135deg, #301308 0%, #170706 56%, #0c0607 100%)', '즉시 조정', '핵심 설정'),
      createMediaItem('settings-audio-mode', '사운드 모드', '표준 / 시네마 / 야간 모드', '시간대와 시청 환경에 따라 빠르게 바꿔 쓰는 대표 오디오 설정입니다.', '빠른 설정', ['오디오', '야간', '시네마'], ['대사 강화', '저음 조절'], '#d85749', 'radial-gradient(circle at 76% 18%, rgba(216, 87, 73, 0.42), transparent 0 32%), linear-gradient(135deg, #280d09 0%, #160706 56%, #0c0607 100%)', '즉시 조정', '자주 사용'),
      createMediaItem('settings-wifi', '와이파이 상태', '현재 연결망과 신호 세기 확인', '문제가 생겼을 때 가장 먼저 확인하는 연결 정보를 앞단에 배치했습니다.', '빠른 설정', ['네트워크', '연결 상태', '안정적'], ['속도 확인', '재연결'], '#bf4d45', 'radial-gradient(circle at 74% 18%, rgba(191, 77, 69, 0.42), transparent 0 32%), linear-gradient(135deg, #250b09 0%, #150606 56%, #0c0607 100%)', '상태 확인', '연결 점검'),
      createMediaItem('settings-profile-lock', '프로필 잠금', 'PIN 기반 접근 제어', '가족 공용 TV에서도 사용자별 진입을 구분할 수 있도록 빠른 잠금 흐름을 제공합니다.', '빠른 설정', ['보호', 'PIN', '사용자별'], ['성인 보호', '키즈 보호'], '#a94442', 'radial-gradient(circle at 72% 18%, rgba(169, 68, 66, 0.42), transparent 0 32%), linear-gradient(135deg, #220908 0%, #140606 56%, #0c0607 100%)', '보호 추천', '잠금 설정'),
    ],
  },
  {
    id: 'settings-protection',
    title: '시청 보호',
    description: '가족 환경에서 중요한 보호 기능을 묶어 안전한 시청 흐름을 만듭니다.',
    items: [
      createMediaItem('settings-kids-filter', '키즈 보호 필터', '연령대별 접근 제한', '나이에 맞지 않는 콘텐츠를 걸러내는 핵심 기능을 전면에 배치했습니다.', '보호 기능', ['연령 제한', '키즈', '자동 필터'], ['7세', '12세', '전체'], '#d85e59', 'radial-gradient(circle at 74% 18%, rgba(216, 94, 89, 0.4), transparent 0 32%), linear-gradient(135deg, #270d0d 0%, #150707 56%, #0c0607 100%)', '안전 추천', '키즈 보호'),
      createMediaItem('settings-app-lock', '앱 잠금', '선택 앱 접근 제한', '특정 앱만 잠글 수 있어 가족 공용 TV에서 실용성이 높은 기능입니다.', '보호 기능', ['앱 잠금', 'PIN', '선택 제어'], ['스트리밍', '브라우저'], '#be4d4a', 'radial-gradient(circle at 76% 18%, rgba(190, 77, 74, 0.4), transparent 0 32%), linear-gradient(135deg, #250b0b 0%, #140606 56%, #0c0607 100%)', '안전 추천', '앱 제어'),
      createMediaItem('settings-time-limit', '시청 시간 제한', '하루 사용 시간 관리', '아이들 시청 시간을 관리할 수 있도록 간단한 시간 단위 제어를 제공합니다.', '보호 기능', ['시간 제한', '알림', '자동 종료'], ['주중', '주말'], '#a74240', 'radial-gradient(circle at 72% 18%, rgba(167, 66, 64, 0.42), transparent 0 32%), linear-gradient(135deg, #210908 0%, #130606 56%, #0c0607 100%)', '생활 관리', '시간 관리'),
      createMediaItem('settings-device-sync', '연결된 기기', '사운드바와 콘솔 상태 점검', 'TV와 함께 쓰는 외부 기기 연결 상태를 한 화면에서 빠르게 점검하도록 구성했습니다.', '보호 기능', ['기기 관리', '연결 상태', '외부 입력'], ['사운드바', '콘솔'], '#c96b4f', 'radial-gradient(circle at 74% 18%, rgba(201, 107, 79, 0.42), transparent 0 32%), linear-gradient(135deg, #2b120a 0%, #160706 56%, #0c0607 100%)', '연결 확인', '기기 관리'),
    ],
  },
]

export const settingsPageContent: PageContent = {
  id: 'settings',
  headerEyebrow: 'LGDX 스마트 허브',
  headerTitle: '설정',
  headerDescription: '프로필, 화면, 사운드, 네트워크, 보호 기능을 큰 화면에 맞게 직관적으로 정리한 화면입니다.',
  readyLabel: '설정 화면 준비 완료',
  primaryActionLabel: '설정 열기',
  secondaryActionLabel: '설정 안내',
  appLaunchLabel: '설정 여는 중',
  itemLaunchLabel: '항목 여는 중',
  detailLabel: '설정 안내 확인',
  dockEyebrow: '설정 바로가기',
  dockTitle: '핵심 설정',
  insight: {
    label: '설정 포인트',
    title: '자주 쓰는 기능을 전면에 압축',
    description:
      '복잡한 설정 트리 대신 자주 쓰는 항목을 카드형으로 묶어, 리모컨 환경에서도 빠르게 조정할 수 있도록 구성했습니다.',
    stats: [
      { label: '핵심 설정', value: String(quickApps.length) },
      { label: '관리 줄', value: String(rows.length) },
      { label: '주요 목적', value: '빠른 제어' },
    ],
  },
  spotlight: quickApps[0].spotlight,
  quickApps,
  rows,
}
