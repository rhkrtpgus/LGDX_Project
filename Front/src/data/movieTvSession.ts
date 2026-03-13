import avatarImage from '../assets/avartar.jpg'
import f1Image from '../assets/f1.jpg'
import ufcImage from '../assets/ufc.jpg'
import hometownChaChaChaImage from '../assets/갯마을_차차차.webp'
import golfImage from '../assets/골프.jpg'
import strangerThingsImage from '../assets/기묘한_이야기.jpg'
import tailOfTailImage from '../assets/꼬리에_꼬리를_무는_그날이야기.webp'
import iAmSoloImage from '../assets/나는_SOLO.jpg'
import pleaseTakeCareImage from '../assets/냉장고를_부탁해.webp'
import basketballImage from '../assets/농구.jpg'
import universityWarImage from '../assets/대학전쟁.jpg'
import theGloryImage from '../assets/더글로리.jpg'
import duneImage from '../assets/듄.jpg'
import volleyballImage from '../assets/배구.jpg'
import breakingBadImage from '../assets/브레이킹_배드.webp'
import bridgertonImage from '../assets/브리저튼.jpg'
import secretForestImage from '../assets/비밀의_숲.webp'
import managerKimStoryImage from '../assets/서울_자가에_사는 _김부장_이야기.webp'
import sherlockHolmesImage from '../assets/셜록홈즈.webp'
import devilWearsPradaImage from '../assets/악마는프라다를입는다.webp'
import baseballImage from '../assets/야구.jpg'
import avengersImage from '../assets/어벤저스.webp'
import reply1988Image from '../assets/응답하라_1988.webp'
import translationLoveImage from '../assets/이_사랑_통역_되나요.jpg'
import traumaCenterImage from '../assets/중증외상센터.jpg'
import soccerImage from '../assets/축구.jpg'
import proBonoImage from '../assets/프로보노.webp'
import transitLoveImage from '../assets/환승연애.jpg'
import culinaryClassWarsImage from '../assets/흑백요리사.jpg'

export type MovieTvTile = {
  id: string
  title: string
  subtitle: string
  badge: string
  image: string
  accent: string
}

export type MovieTvShelf = {
  id: string
  title: string
  items: MovieTvTile[]
}

function tile(
  id: string,
  title: string,
  subtitle: string,
  badge: string,
  image: string,
  accent: string,
): MovieTvTile {
  return {
    id,
    title,
    subtitle,
    badge,
    image,
    accent,
  }
}

export const movieTvTabs = [
  { id: 'home', label: '홈' },
  { id: 'movies', label: '영화' },
  { id: 'tv', label: 'TV 프로그램' },
  { id: 'variety', label: '예능' },
  { id: 'sports', label: '스포츠' },
]

export const movieTvFeaturedTile: MovieTvTile = tile(
  'featured-the-glory',
  '더 글로리',
  '지금 가장 많이 보는 몰입형 시리즈',
  '메인 추천',
  theGloryImage,
  '#a42e4b',
)

export const movieTvSideTiles: MovieTvTile[] = [
  tile('side-dune', '듄', '압도적인 스케일의 SF 영화', '영화', duneImage, '#d8a24a'),
  tile(
    'side-stranger-things',
    '기묘한 이야기',
    '지금 이어보기 좋은 글로벌 시리즈',
    '시리즈',
    strangerThingsImage,
    '#b33752',
  ),
  tile(
    'side-culinary-class-wars',
    '흑백요리사',
    '화제의 예능을 한 번에',
    '예능',
    culinaryClassWarsImage,
    '#e09647',
  ),
]

export const movieTvShelves: MovieTvShelf[] = [
  {
    id: 'trending-now',
    title: '지금 인기 있는 작품',
    items: [
      tile('trending-1', '브리저튼', '시즌 정주행 추천', '인기', bridgertonImage, '#cc6d8b'),
      tile('trending-2', '응답하라 1988', '다시 보고 싶은 인생 드라마', '드라마', reply1988Image, '#db8f43'),
      tile('trending-3', '비밀의 숲', '몰입감 높은 미스터리', '스릴러', secretForestImage, '#47649a'),
      tile('trending-4', '중증외상센터', '긴장감 있는 메디컬 시리즈', '신작', traumaCenterImage, '#728ad7'),
      tile('trending-5', '오징어 게임', '임시 편성용 대표 흥행작', 'Top 10', theGloryImage, '#b43d4f'),
      tile('trending-6', '폭싹 속았수다', '로맨스 신작 후보', '신규 후보', hometownChaChaChaImage, '#6d99c7'),
    ],
  },
  {
    id: 'movie-picks',
    title: '영화 추천',
    items: [
      tile('movie-1', '아바타', '환상적인 비주얼의 블록버스터', '대작', avatarImage, '#4a8fd8'),
      tile('movie-2', '어벤저스', '마블 대표 액션 영화', '액션', avengersImage, '#6171d9'),
      tile('movie-3', '셜록 홈즈', '추리와 액션을 함께', '추리', sherlockHolmesImage, '#7d7465'),
      tile(
        'movie-4',
        '악마는 프라다를 입는다',
        '가볍게 보기 좋은 클래식 영화',
        '클래식',
        devilWearsPradaImage,
        '#d8606b',
      ),
      tile('movie-5', '탑건: 매버릭', '속도감 있는 극장형 영화', '블록버스터', f1Image, '#586ed8'),
      tile('movie-6', '인터스텔라', '다시 꺼내보기 좋은 SF 명작', 'SF', duneImage, '#af8a54'),
      tile('movie-7', '인셉션', '생각할수록 재밌는 작품', '명작', sherlockHolmesImage, '#6b7486'),
      tile('movie-8', '라라랜드', '감성적인 뮤지컬 영화', '감성', devilWearsPradaImage, '#dc7888'),
      tile('movie-9', '범죄도시', '통쾌하게 보기 좋은 액션', '한국영화', avengersImage, '#965558'),
      tile('movie-10', '파묘', '긴장감 있는 오컬트 영화', '화제작', secretForestImage, '#5f6a84'),
    ],
  },
  {
    id: 'series-picks',
    title: '드라마와 시리즈',
    items: [
      tile('series-1', '브레이킹 배드', '한 번 시작하면 멈출 수 없는 시리즈', '명작', breakingBadImage, '#47976d'),
      tile('series-2', '갯마을 차차차', '따뜻한 분위기의 힐링 드라마', '로맨스', hometownChaChaChaImage, '#5f93c8'),
      tile('series-3', '이 사랑 통역 되나요', '새로 담아둘 로맨스 시리즈', '신작', translationLoveImage, '#de6480'),
      tile('series-4', '프로보노', '분위기 있는 감성 드라마', '추천', proBonoImage, '#6b88c7'),
      tile('series-5', '슬기로운 의사생활', '편안하게 보기 좋은 정주행 드라마', '힐링', traumaCenterImage, '#7b92d9'),
      tile('series-6', '미생', '직장 드라마 대표작', '직장물', managerKimStoryImage, '#7c908b'),
      tile('series-7', '나의 아저씨', '여운이 긴 인생 드라마', '인생작', proBonoImage, '#7087af'),
      tile('series-8', '킹덤', '긴장감 높은 K-좀비 시리즈', '사극 스릴러', strangerThingsImage, '#8d4454'),
      tile('series-9', '더 에이트 쇼', '몰입형 서바이벌 드라마', '화제작', universityWarImage, '#6e7fd1'),
      tile('series-10', '미스터 션샤인', '웅장한 감성의 시대극', '시대극', reply1988Image, '#d69b55'),
    ],
  },
  {
    id: 'variety-docu',
    title: '예능과 교양',
    items: [
      tile('variety-1', '나는 SOLO', '화제성 높은 리얼리티 예능', '예능', iAmSoloImage, '#e77b52'),
      tile('variety-2', '환승연애', '가장 많이 찾는 연애 예능', '연애 예능', transitLoveImage, '#d86a8d'),
      tile('variety-3', '냉장고를 부탁해', '편하게 보기 좋은 요리 예능', '요리', pleaseTakeCareImage, '#d9a34b'),
      tile('variety-4', '대학전쟁', '두뇌 서바이벌 예능', '서바이벌', universityWarImage, '#6d84d7'),
      tile(
        'variety-5',
        '꼬리에 꼬리를 무는 그날 이야기',
        '집중해서 보기 좋은 스토리텔링 교양',
        '교양',
        tailOfTailImage,
        '#6b76a0',
      ),
      tile(
        'variety-6',
        '서울 자가에 사는 김부장 이야기',
        '생활 밀착형 콘텐츠',
        '생활',
        managerKimStoryImage,
        '#6c9e9f',
      ),
      tile('variety-7', '유 퀴즈 온 더 블럭', '게스트 중심 토크 예능', '토크', tailOfTailImage, '#7388b1'),
      tile('variety-8', '놀면 뭐하니?', '가볍게 보기 좋은 주말 예능', '주말 예능', iAmSoloImage, '#e9885d'),
      tile('variety-9', '피지컬: 100', '강한 몰입감의 서바이벌', '서바이벌', ufcImage, '#a55358'),
      tile('variety-10', '나는 자연인이다', '휴식용 교양 콘텐츠', '교양', golfImage, '#5f9468'),
    ],
  },
  {
    id: 'global-series',
    title: '해외 시리즈 임시 후보',
    items: [
      tile('global-1', '웬즈데이', '다크한 분위기의 인기 시리즈', '해외 시리즈', strangerThingsImage, '#8f4d68'),
      tile('global-2', '더 크라운', '정주행용 프리미엄 시리즈', '프리미엄', bridgertonImage, '#ad7390'),
      tile('global-3', '체르노빌', '강한 몰입감의 미니시리즈', '미니시리즈', breakingBadImage, '#5d8667'),
      tile('global-4', '베터 콜 사울', '명작 후속 정주행 라인업', '명작', breakingBadImage, '#6ea06f'),
      tile('global-5', '기묘한 이야기 5', '차기 시즌 대기용 칸', '차기작', strangerThingsImage, '#b53e56'),
      tile('global-6', '하우스 오브 드래곤', '판타지 대작 후보', '판타지', duneImage, '#9d7749'),
      tile('global-7', '더 라스트 오브 어스', '강한 서사 중심 시리즈', '추천', theGloryImage, '#8b4151'),
      tile('global-8', '블랙 미러', '에피소드형 SF 시리즈', 'SF', sherlockHolmesImage, '#68768d'),
    ],
  },
  {
    id: 'sports-live',
    title: '스포츠 편성',
    items: [
      tile('sports-1', '축구', '주요 경기와 하이라이트', '실시간', soccerImage, '#4da45f'),
      tile('sports-2', '야구', '오늘의 경기 모아보기', '생중계', baseballImage, '#327db7'),
      tile('sports-3', '농구', '인기 리그 다시보기', '스포츠', basketballImage, '#e28a3f'),
      tile('sports-4', '배구', '화제 경기와 명장면', '추천', volleyballImage, '#d45d73'),
      tile('sports-5', '골프', '라운드와 레슨 콘텐츠', '레저', golfImage, '#4d9e74'),
      tile('sports-6', 'UFC', '격투 스포츠 하이라이트', '격투', ufcImage, '#a84b55'),
      tile('sports-7', 'F1', '스피드 레이스 특집', '레이싱', f1Image, '#6973d9'),
      tile('sports-8', '테니스', '그랜드슬램 임시 편성용', '특집', soccerImage, '#5d8fb5'),
      tile('sports-9', '월드컵 특집', '대형 이벤트 편성용 슬롯', '이벤트', baseballImage, '#4179be'),
    ],
  },
]
