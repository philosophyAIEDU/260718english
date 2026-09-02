/*
 * Detects the Kakao/Instagram/Facebook/Naver/Line "in-app browsers" that
 * chat apps open links in — because Google actively refuses OAuth inside
 * them (an `auth/popup-blocked`-looking failure that's really Google's
 * disallowed_useragent policy, not something this app can code around).
 * Since the challenge is run over a KakaoTalk group chat, most first
 * visits will be exactly this case, so it's worth naming instead of
 * leaving participants stuck on a sign-in button that can never work.
 *
 * KakaoTalk is the one browser here with a documented way out: reopening
 * the current URL via its `kakaotalk://` scheme hands the page to the
 * device's real default browser. The others don't expose an equivalent,
 * so they just get instructions.
 */

const MATCHERS = [
  { id: 'kakaotalk', test: /KAKAOTALK/i, label: '카카오톡' },
  { id: 'instagram', test: /Instagram/i, label: '인스타그램' },
  { id: 'facebook', test: /FBAN|FBAV|FB_IAB/i, label: '페이스북' },
  { id: 'line', test: /\bLine\//i, label: '라인' },
  { id: 'naver', test: /NAVER\(inapp/i, label: '네이버 앱' },
];

/** { id, label } for the in-app browser the page is running in, or null. */
export function detectInAppBrowser(ua = navigator.userAgent) {
  const match = MATCHERS.find((m) => m.test.test(ua));
  return match ? { id: match.id, label: match.label } : null;
}

/**
 * Hand the current page to the device's real browser. Only KakaoTalk
 * supports this programmatically; everywhere else this is a no-op and the
 * caller should fall back to on-screen instructions instead.
 */
export function openInExternalBrowser() {
  const here = window.location.href;
  window.location.href = `kakaotalk://web/openExternal?url=${encodeURIComponent(here)}`;
}
