/*
 * [Read & Build] 챌린지 설정 — 이 파일의 값만 바꾸면 챌린지 기간·킥아웃 기준·
 * Firebase 프로젝트가 전체 화면(체크인, Progress, 관리자 화면)에 반영됩니다.
 *
 * 이 구조와 킥아웃 판정 로직은 필로소피 AI 교육의 "퍼스널메이커스 독서 챌린지"
 * 인증 시스템(philosophyAIEDU/260818comingssoni)을 그대로 참고해서 만들었습니다.
 * 참가자 명단/인증 기록은 (그 프로젝트처럼) 로그인 없이 이름만 골라 쓰는 방식이며,
 * Firestore에 저장되어 운영자가 전체 참가자의 인증 현황을 볼 수 있습니다.
 */

export const CHALLENGE_CONFIG = {
  // 챌린지 기본 정보
  title: '[Read & Build] 챌린지',
  subtitle: 'AI로 나만의 영어 학습앱을 빌드하며 한 달간 원서 읽기',
  tagline: '한 달간 영어 원서를 읽고, 나만의 학습앱을 빌드합니다',
  // 소개 화면 첫머리에 그대로 실리는 운영자의 말 — 이 챌린지가 왜 존재하는지.
  manifesto:
    'AI를 활용해서 우리들의 능력을 향상시키는 것이 중요하다고 생각합니다. ' +
    '그래서 AI를 활용하여 영어 학습앱을 만들었고, 그 앱으로 영어 실력을 키우려고 합니다.',

  // 챌린지 기간 (양 끝 포함). 주 7일 인증 × 4주 = 28일이라,
  // 아래 CURRICULUM의 4회 수업과 주차가 정확히 맞아떨어집니다.
  startDate: '2026-09-10',
  endDate: '2026-10-07',

  // 마감/날짜 판정 기준 시간대. 매일 이 시간대의 24:00(자정)에 그날 인증이 마감됩니다.
  timezone: 'Asia/Seoul',
  deadlineHour: 24,

  // 누적 미인증 N회 이상 → 실제 킥아웃 대상 (챌린지 설명: "미인증 6회가 되면 킥아웃 대상")
  kickoutThreshold: 6,
  // 누적 미인증 N회 이상 → "위험" 경고 단계 (아직 킥아웃 대상은 아님, 미리 알림용)
  riskThreshold: 4,

  // 챌린지 기간 밖에서도 인증 제출을 허용할지 — 운영 시작 전 점검/시연용으로 true,
  // 실제 운영 중에는 false를 권장합니다.
  allowSubmitOutsidePeriod: true,

  // 관리자(운영자) 대시보드를 볼 수 있는 구글 계정 화이트리스트.
  // 여기 없는 계정은 구글 로그인에 성공해도 관리자 화면을 볼 수 없습니다.
  adminEmails: ['warmcomfortforyou@gmail.com'],

  // Firebase 웹 앱 설정 — Firebase 콘솔 > 프로젝트 설정 > 일반 > "내 앱"에서
  // 복사해 붙여넣으세요. projectId가 비어 있으면 챌린지 인증 기능(참가자 선택,
  // 인증 제출, 관리자 화면)은 자동으로 숨겨지고 앱은 평소처럼(개인 학습 도구로만)
  // 동작합니다 — 즉 이 값을 채우기 전까지는 아무것도 깨지지 않습니다.
  //
  // (README의 "Firebase 설정 방법"에 단계별 안내가 있습니다.)
  firebase: {
    apiKey: 'AIzaSyCtYndq3kLtucP5kiKoQfakzaqlkVTGn6M',
    authDomain: 'readandbuild-fbc7f.firebaseapp.com',
    projectId: 'readandbuild-fbc7f',
    storageBucket: 'readandbuild-fbc7f.firebasestorage.app',
    messagingSenderId: '1083825369067',
    appId: '1:1083825369067:web:3e9d5ad1f72c83108e33ae',
  },
};

/*
 * 참가비/보증금 정책. 첫 기수는 보증금만 받고, 킥아웃되지 않으면 전액 돌려줍니다.
 * 킥아웃 대상자의 보증금은 기부처(charity)로 전달됩니다.
 */
export const DEPOSIT = {
  amount: 50000,
  amountLabel: '5만원',
  note: '첫 기수라 보증금만 받습니다 (추후에는 유료로 진행될 예정입니다)',
  refund: '킥아웃만 당하지 않으시면 보증금 전액을 돌려받으실 수 있습니다',
  charity: '승일희망재단',
  charityNote: '루게릭 환우분들을 위한 병원을 운영하는 재단으로, 킥아웃 대상자의 보증금을 기부합니다',
};

/*
 * 챌린지를 떠받치는 네 개의 축 — 소개 화면과 홈에서 같은 문구를 씁니다.
 * icon 값은 components/Icons.jsx에 있는 아이콘 이름과 1:1로 대응합니다.
 */
export const PILLARS = [
  {
    icon: 'book',
    title: '매일 읽기 또는 듣기',
    body: '주 7일, 영어 원문을 읽거나 듣고 인증합니다. 읽기가 부담스러우면 듣기만 하셔도 됩니다.',
  },
  {
    icon: 'sparkles',
    title: 'AI 학습 가이드',
    body: '읽은 페이지를 AI가 요약·핵심 단어·문장 분석·퀴즈로 만들어 줍니다. 모두 영어로요.',
  },
  {
    icon: 'branch',
    title: '주 1회 앱 빌드 수업',
    body: '월 4회, AI로 나만의 학습앱을 직접 만듭니다. 데이터베이스와 AI API도 연동해봅니다.',
  },
  {
    icon: 'trophy',
    title: '보증금 환급제',
    body: `보증금 ${DEPOSIT.amountLabel}. 끝까지 완주하면 전액 돌려받습니다.`,
  },
];

/*
 * 주 1회(월 4회) 진행하는 "AI로 나만의 학습앱 만들기" 수업 커리큘럼.
 * week는 챌린지 시작일 기준 몇 주차인지를 뜻하고, 홈 화면은 오늘 날짜로
 * 이번 주차를 찾아 해당 회차를 안내합니다.
 */
export const CURRICULUM = [
  {
    week: 1,
    title: '내 학습앱 기획하고 첫 화면 만들기',
    summary: 'AI에게 무엇을 시킬지 정하고, 화면이 실제로 뜨는 데까지 갑니다.',
    topics: ['내 공부에 필요한 기능 정하기', 'AI로 첫 화면 만들기', '내 컴퓨터에서 앱 띄우기'],
  },
  {
    week: 2,
    title: '데이터베이스 연동하기',
    summary: '앱을 껐다 켜도 내 기록이 남도록, 데이터를 저장하고 불러옵니다.',
    topics: ['데이터베이스 만들기', '기록 저장하고 불러오기', '내 학습 기록 쌓기'],
  },
  {
    week: 3,
    title: 'AI API 연동하기',
    summary: '내 앱 안에서 AI가 직접 일하게 만듭니다.',
    topics: ['AI API 키 발급받기', '내 앱에 AI 기능 붙이기', '내 학습에 맞게 다듬기'],
  },
  {
    week: 4,
    title: '배포하고 공유하기',
    summary: '인터넷에 올려서 누구나 쓸 수 있는 진짜 앱으로 만듭니다.',
    topics: ['웹에 배포하기', '휴대폰에서 열어보기', '만든 앱 서로 공유하기'],
  },
];

/** 소개 화면의 "챌린지 규칙" 카드에 그대로 표시되는 항목들. */
export const RULES = [
  {
    icon: 'check',
    title: '주 7일 인증',
    body: '매일 영어 원문을 읽거나 듣고 홈 화면에서 인증합니다. 마감은 매일 자정(24시)입니다.',
  },
  {
    icon: 'speaker',
    title: '읽기가 부담되면 듣기로',
    body: '영어 원문마다 듣기 파일이 있습니다. 듣기만 하셔도 인증으로 인정됩니다.',
  },
  {
    icon: 'alert',
    title: '미인증 6회 = 킥아웃 대상',
    body: '누적 미인증이 6회가 되면 킥아웃 대상이 됩니다. 4회부터는 미리 경고가 표시됩니다.',
  },
  {
    icon: 'trophy',
    title: '보증금 환급 · 기부',
    body: `보증금 ${DEPOSIT.amountLabel}은 킥아웃만 당하지 않으면 전액 환급됩니다. 킥아웃 대상자의 보증금은 ${DEPOSIT.charity}에 기부합니다.`,
  },
];

export function isFirebaseConfigured() {
  return Boolean(CHALLENGE_CONFIG.firebase && CHALLENGE_CONFIG.firebase.projectId);
}
