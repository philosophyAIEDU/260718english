/*
 * Firestore adapter for the [Read & Build] challenge's cohort tracking —
 * participants, daily submissions, and auth. The attendance/kickout rules
 * follow philosophyAIEDU/260818comingssoni, but identity works differently
 * here: participants sign in with Google and pick their own nickname
 * instead of the organizer pre-registering a roster of names.
 *
 * Both collections are keyed by identity rather than an auto-id, so a
 * security rule can verify ownership from the document path alone and a
 * participant can hold at most one entry per day:
 *
 *   participants/{uid}          { nickname, email, status, joinDate, outDate,
 *                                  exemptDates[], note, kickReason, createdAt }
 *   submissions/{uid}_{date}    { participantId, nickname, date, mode,
 *                                  bookTitle, createdAt, updatedAt }
 *
 * Firebase isn't initialized (and the SDK isn't even imported) until the
 * first call to any exported function, so importing this module has no
 * cost for a device that never touches the challenge features. All calls
 * throw if CHALLENGE_CONFIG.firebase.projectId is empty — callers should
 * check isFirebaseConfigured() first and hide the relevant UI instead of
 * letting these calls fail.
 */
import { CHALLENGE_CONFIG, isFirebaseConfigured } from './challengeConfig.js';
import { normalizeNick, nowStamp, today } from './challengeUtils.js';

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

function onAuthStateChanged(callback) {
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

export async function signOut() {
  await init();
  return authMod.signOut(auth);
}

/**
 * Subscribe to auth state and get told once the first answer is known, even
 * when that answer is "signed out". Firebase resolves the persisted session
 * asynchronously, so a bare onAuthStateChanged leaves callers unable to tell
 * "still checking" from "definitely signed out" on first paint.
 */
export function onAuthReady(callback) {
  const unsubscribe = onAuthStateChanged(callback);
  // Touch init() so the listener above actually starts receiving state.
  init().catch(() => callback(null));
  return unsubscribe;
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

/**
 * Look up a nickname across the roster. Nicknames are how participants
 * recognise each other on the organizer's dashboard, so they have to be
 * unique even though the account behind them is the real identity.
 */
async function isNicknameTaken(nickname, exceptUid) {
  const nick = normalizeNick(nickname);
  if (!nick) return false;
  const snap = await fsMod.getDocs(
    fsMod.query(await col('participants'), fsMod.where('nickname', '==', nick))
  );
  return snap.docs.some((d) => d.id !== exceptUid);
}

/** This device's signed-in participant, or null if they haven't joined yet. */
export async function getMyParticipant() {
  const db = await init();
  const user = currentUser;
  if (!user) return null;
  const snap = await fsMod.getDoc(fsMod.doc(db, 'participants', user.uid));
  return snap.exists() ? withId(snap) : null;
}

/**
 * Join the challenge under the signed-in Google account. The document id is
 * the Firebase Auth uid, so a participant owns exactly one entry, their
 * submissions can be tied back to a verified account, and the organizer
 * never has to pre-register a roster.
 */
export async function registerParticipant(nickname) {
  const db = await init();
  const user = currentUser;
  if (!user) throw new Error('먼저 구글 로그인을 해주세요.');
  const nick = normalizeNick(nickname);
  if (!nick) throw new Error('닉네임을 입력해 주세요.');
  if (nick.length > 20) throw new Error('닉네임은 20자 이내로 지어주세요.');
  if (await isNicknameTaken(nick, user.uid)) {
    throw new Error(`이미 사용 중인 닉네임입니다: ${nick}`);
  }
  const body = {
    nickname: nick,
    email: user.email || '',
    status: 'active',
    // Joining mid-challenge shouldn't backfill misses for the days before
    // they signed up, so they're only graded from today onward.
    joinDate: today() > CHALLENGE_CONFIG.startDate ? today() : CHALLENGE_CONFIG.startDate,
    outDate: null,
    exemptDates: [],
    note: '',
    createdAt: nowStamp(),
  };
  await fsMod.setDoc(fsMod.doc(db, 'participants', user.uid), body);
  return Object.assign({ id: user.uid }, body);
}

/** Rename yourself. Only the nickname is the participant's to change. */
export async function updateMyNickname(nickname) {
  const db = await init();
  const user = currentUser;
  if (!user) throw new Error('먼저 구글 로그인을 해주세요.');
  const nick = normalizeNick(nickname);
  if (!nick) throw new Error('닉네임을 입력해 주세요.');
  if (nick.length > 20) throw new Error('닉네임은 20자 이내로 지어주세요.');
  if (await isNicknameTaken(nick, user.uid)) {
    throw new Error(`이미 사용 중인 닉네임입니다: ${nick}`);
  }
  await fsMod.updateDoc(fsMod.doc(db, 'participants', user.uid), { nickname: nick });
  return nick;
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

/*
 * A participant certifies at most once per day, so the submission id is
 * derived from who and when rather than auto-generated. That makes a
 * re-submit a plain overwrite (no duplicate rows, no read-modify-write
 * race) and lets a security rule verify ownership from the id alone.
 */
const submissionId = (participantId, date) => `${participantId}_${date}`;

async function getSubmission(participantId, date) {
  const db = await init();
  const snap = await fsMod.getDoc(
    fsMod.doc(db, 'submissions', submissionId(participantId, date))
  );
  return snap.exists() ? withId(snap) : null;
}

/** Create or overwrite one day's submission (re-submitting edits it). */
export async function saveSubmission(data) {
  const db = await init();
  const now = nowStamp();
  const ref = fsMod.doc(db, 'submissions', submissionId(data.participantId, data.date));
  const found = await getSubmission(data.participantId, data.date);
  if (found) {
    // Keep the original createdAt — lateness is judged by first submission,
    // so fixing a typo later must not turn an on-time entry into a miss.
    const body = Object.assign({}, data, { createdAt: found.createdAt, updatedAt: now });
    await fsMod.setDoc(ref, body);
    return Object.assign({ id: ref.id }, body);
  }
  const body = Object.assign({ createdAt: now, updatedAt: now }, data);
  await fsMod.setDoc(ref, body);
  return Object.assign({ id: ref.id }, body);
}
