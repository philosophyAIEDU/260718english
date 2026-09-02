/*
 * navigator.clipboard needs a secure context and, in some in-app/older
 * browsers, isn't there at all — exactly the KakaoTalk-adjacent situations
 * this app already has to work around elsewhere (see inAppBrowser.js).
 * A hidden-textarea + execCommand('copy') fallback keeps "복사하기" buttons
 * working everywhere, same approach 260818comingssoni's share-card.js uses.
 */
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fall through to the legacy path below.
  }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.position = 'fixed';
  ta.style.top = '-1000px';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }
  document.body.removeChild(ta);
  return ok;
}
