/*
 * Firestore adapter for the [Read & Build] challenge's cohort tracking —
 * participants, daily submissions, and admin auth. Schema mirrors
 * philosophyAIEDU/260818comingssoni's store-firebase.js 1:1 (see that
 * project's README for the reasoning), trimmed to what this challenge
 * needs (no upvotes/feed/notify-email/notices):
 *
 *   participants/{id}  { nickname, email, status, joinDate, outDate,
 *                         exemptDates[], note, kickReason, createdAt }
 *   submissions/{id}   { participantId, nickname, date, mode,   // 'read' | 'listen'
 *                         bookTitle, note, createdAt, updatedAt }
 *
 * Firebase isn't initialized (and the SDK isn't even imported) until the
 * first call to any exported function, so importing this module has no
 * cost for a device that never touches the challenge features. All calls
 * throw if CHALLENGE_CONFIG.firebase.projectId is empty — callers should
 * check isFirebaseConfigured() first and hide the relevant UI instead of
 * letting these calls fail.
 */
import { CHALLENGE_CONFIG, isFirebaseConfigured } from './challengeConfig.js';
import { normalizeNick, nowStamp } from './challengeUtils.js';

/*
 * A Firestore call on a phone with no signal (or behind a network that
 * blocks googleapis) never rejects — it just waits. Without a deadline the
 * check-in card would sit in its loading skeleton forever, so every call
 * that a screen waits on races this timeout and surfaces a retryable error
 * instead.
 */
const CALL_TIMEOUT_MS = 12000;

function withTimeout(promise) {
  let timer;
  return Promise.race([
    promise.finally(() => clearTimeout(timer)),
    new Promise((_, reject) => {
      timer = setTimeout(
        () => reject(new Error('서버 응답이 없습니다. 인터넷 연결을 확인해주세요.')),
        CALL_TIMEOUT_MS
      );
    }),
  ]);
}

let appPromise = null;
let dbPromise = null;
let fsMod = null;
let authMod = null;
let auth = null;
let currentUser = null;
const authListeners = [];

async function init() {
  if (dbPromise) return dbPromise;
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase가 설정되지 않았습니다. src/lib/challengeConfig.js를 먼저 채워주세요.');
  }
  dbPromise = (async () => {
    const [{ initializeApp }, firestore, authModule] = await Promise.all([
      import('firebase/app'),
      import('firebase/firestore'),
      import('firebase/auth'),
    ]);
    // Give every network-touching Firestore call the deadline from
    // withTimeout, so a single wrapper covers all the queries below.
    fsMod = { ...firestore };
    for (const name of ['getDocs', 'getDoc', 'addDoc', 'setDoc', 'updateDoc', 'deleteDoc']) {
      const original = firestore[name];
      fsMod[name] = (...args) => withTimeout(original(...args));
    }
    authMod = authModule;
    const app = initializeApp(CHALLENGE_CONFIG.firebase);
    appPromise = app;
    auth = authMod.getAuth(app);
    authMod.onAuthStateChanged(auth, (user) => {
      currentUser = user;
      for (const cb of authListeners) {
        try {
          cb(user);
        } catch {
          /* listener errors shouldn't break auth state propagation */
        }
      }
    });
    return fsMod.getFirestore(app);
  })();
  // Don't cache a failed setup — otherwise every later retry replays the
  // same rejection and the "다시 시도" button could never recover.
  dbPromise.catch(() => {
    dbPromise = null;
  });
  return dbPromise;
}

/* --------------------------------- auth --------------------------------- */

export function onAuthStateChanged(callback) {
  authListeners.push(callback);
  if (dbPromise) callback(currentUser);
  return () => {
    const i = authListeners.indexOf(callback);
    if (i !== -1) authListeners.splice(i, 1);
  };
}

export async function signInWithGoogle() {
  await init();
  const provider = new authMod.GoogleAuthProvider();
  return authMod.signInWithPopup(auth, provider);
}

export async function signOutAdmin() {
  await init();
  return authMod.signOut(auth);
}

export function getCurrentUser() {
  return currentUser;
}

export function isAdminEmail(email) {
  return Boolean(email) && CHALLENGE_CONFIG.adminEmails.includes(email);
}

/* ----------------------------- participants ------------------------------ */

async function col(name) {
  const db = await init();
  return fsMod.collection(db, name);
}

const withId = (snap) => Object.assign({ id: snap.id }, snap.data());

export async function listParticipants() {
  const c = await col('participants');
  const snap = await fsMod.getDocs(c);
  return snap.docs.map(withId).sort((a, b) => a.nickname.localeCompare(b.nickname, 'ko'));
}

export async function addParticipant(nickname, patch) {
  const db = await init();
  const nick = normalizeNick(nickname);
  if (!nick) throw new Error('닉네임을 입력해 주세요.');
  const dup = await fsMod.getDocs(
    fsMod.query(await col('participants'), fsMod.where('nickname', '==', nick))
  );
  if (!dup.empty) throw new Error(`이미 등록된 닉네임입니다: ${nick}`);
  const body = Object.assign(
    {
      nickname: nick,
      email: '',
      status: 'active',
      joinDate: CHALLENGE_CONFIG.startDate,
      outDate: null,
      exemptDates: [],
      note: '',
      createdAt: nowStamp(),
    },
    patch || {}
  );
  const ref = await fsMod.addDoc(await col('participants'), body);
  return Object.assign({ id: ref.id }, body);
}

/** Bulk-add nicknames from newline/comma separated text; skips duplicates. */
export async function addParticipants(rawText) {
  const names = String(rawText || '')
    .split(/[\n,]/)
    .map(normalizeNick)
    .filter(Boolean);
  const existing = new Set((await listParticipants()).map((p) => p.nickname));
  const added = [];
  const skipped = [];
  for (const nick of names) {
    if (existing.has(nick)) {
      skipped.push(nick);
      continue;
    }
    added.push(await addParticipant(nick));
    existing.add(nick);
  }
  return { added, skipped };
}

export async function updateParticipant(id, patch) {
  const db = await init();
  await fsMod.updateDoc(fsMod.doc(db, 'participants', id), patch);
}

export async function removeParticipant(id) {
  const db = await init();
  const subs = await fsMod.getDocs(
    fsMod.query(await col('submissions'), fsMod.where('participantId', '==', id))
  );
  await Promise.all(subs.docs.map((d) => fsMod.deleteDoc(fsMod.doc(db, 'submissions', d.id))));
  await fsMod.deleteDoc(fsMod.doc(db, 'participants', id));
}

/* ------------------------------ submissions ------------------------------ */

export async function listSubmissions(filter) {
  const f = filter || {};
  const clauses = [];
  if (f.participantId) clauses.push(fsMod.where('participantId', '==', f.participantId));
  if (f.date) clauses.push(fsMod.where('date', '==', f.date));
  const c = await col('submissions');
  const snap = await fsMod.getDocs(clauses.length ? fsMod.query(c, ...clauses) : c);
  return snap.docs.map(withId);
}

export async function getSubmission(participantId, date) {
  const rows = await listSubmissions({ participantId, date });
  return rows[0] || null;
}

/** Create or overwrite today's submission for a participant (re-submitting edits it). */
export async function saveSubmission(data) {
  const db = await init();
  const now = nowStamp();
  const found = await getSubmission(data.participantId, data.date);
  if (found) {
    const body = Object.assign({}, data, { updatedAt: now });
    await fsMod.updateDoc(fsMod.doc(db, 'submissions', found.id), body);
    return Object.assign({}, found, body);
  }
  const body = Object.assign({ createdAt: now, updatedAt: now }, data);
  const ref = await fsMod.addDoc(await col('submissions'), body);
  return Object.assign({ id: ref.id }, body);
}

export async function removeSubmission(id) {
  const db = await init();
  await fsMod.deleteDoc(fsMod.doc(db, 'submissions', id));
}
