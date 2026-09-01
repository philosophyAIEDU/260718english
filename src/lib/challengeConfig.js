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

  // 챌린지 기간 (포함) — 시작 전에 실제 날짜로 꼭 바꿔주세요.
  // 주 7일 인증 × 4주 = 한 달(30일) 챌린지 기준입니다.
  startDate: '2026-09-08',
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
    apiKey: '',
    authDomain: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: '',
  },
};

export function isFirebaseConfigured() {
  return Boolean(CHALLENGE_CONFIG.firebase && CHALLENGE_CONFIG.firebase.projectId);
}
