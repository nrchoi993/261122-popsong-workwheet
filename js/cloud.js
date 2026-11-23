/**
 * 구글 계정 로그인 + 작업 클라우드 저장 (Firebase Authentication + Cloud Firestore)
 *
 * - 설정은 /api/config 에서 받아 옵니다(Vercel 환경 변수 FIREBASE_CONFIG). 설정이 없으면 로그인 기능만 꺼지고
 *   나머지 기능(이 브라우저에 저장)은 그대로 동작합니다.
 * - 저장 위치: users/{uid}/works/{workId}  — 보안 규칙으로 본인만 읽고 쓸 수 있게 합니다(README 참고).
 * - API 키는 절대 클라우드에 올리지 않습니다(작업 내용만 저장).
 */
const SDK = "https://www.gstatic.com/firebasejs/10.12.2/";

let fb = null;       // { auth, db, A(auth 모듈), F(firestore 모듈) }
let user = null;
const subs = new Set();

export const cloud = {
  state: "loading",  // loading | off(설정 없음) | error | ready
  message: "",
  get user() { return user; },
  get signedIn() { return !!user; },
  onChange(fn) { subs.add(fn); fn(cloud); return () => subs.delete(fn); },
};
const emit = () => subs.forEach((fn) => { try { fn(cloud); } catch (e) { console.error(e); } });

export async function initCloud() {
  let cfg = null;
  try {
    const r = await fetch("/api/config", { cache: "no-store" });
    if (r.ok) {
      const j = await r.json();
      cfg = j.firebase;
      if (!cfg && j.firebaseError) cloud.message = j.firebaseError;
    }
  } catch (e) { /* 서버 없이 열었을 때 */ }
  if (!cfg) { cloud.state = "off"; emit(); return; }
  try {
    const [appM, A, F] = await Promise.all([
      import(SDK + "firebase-app.js"),
      import(SDK + "firebase-auth.js"),
      import(SDK + "firebase-firestore.js"),
    ]);
    const fapp = appM.initializeApp(cfg);
    const auth = A.getAuth(fapp);
    const db = F.getFirestore(fapp);
    fb = { auth, db, A, F };
    A.getRedirectResult(auth).catch((e) => { cloud.message = authError(e); emit(); });
    await new Promise((resolve) => {
      let first = true;
      A.onAuthStateChanged(auth, (u) => {
        user = u ? { uid: u.uid, name: u.displayName || u.email || "사용자", email: u.email || "", photo: u.photoURL || "" } : null;
        cloud.state = "ready";
        emit();
        if (first) { first = false; resolve(); }
      });
    });
  } catch (e) {
    console.error(e);
    cloud.state = "error";
    cloud.message = "로그인 모듈을 불러오지 못했습니다. 인터넷 연결 또는 학교 방화벽(gstatic.com 차단)을 확인해 주세요.";
    emit();
  }
}

export function authError(e) {
  const c = (e && e.code) || "";
  if (c === "auth/popup-closed-by-user" || c === "auth/cancelled-popup-request") return "";
  if (c === "auth/unauthorized-domain") return "이 사이트 주소가 Firebase 승인된 도메인에 없습니다. Firebase 콘솔 → Authentication → 설정 → 승인된 도메인에 배포 주소를 추가해 주세요.";
  if (c === "auth/operation-not-allowed") return "Firebase 콘솔에서 Google 로그인이 켜져 있지 않습니다. Authentication → 로그인 방법 → Google을 사용 설정해 주세요.";
  if (c === "auth/network-request-failed") return "네트워크 오류로 로그인하지 못했습니다. 잠시 후 다시 시도해 주세요.";
  if (c === "permission-denied") return "저장 권한이 없습니다. Firestore 보안 규칙을 README대로 설정했는지 확인해 주세요.";
  if (c === "unavailable") return "클라우드에 연결할 수 없습니다(오프라인). 연결되면 다시 저장합니다.";
  if (c === "failed-precondition" || c === "not-found") return "Firestore 데이터베이스가 아직 만들어지지 않았을 수 있습니다. Firebase 콘솔 → Firestore Database → 데이터베이스 만들기를 확인해 주세요.";
  return (e && e.message ? e.message : "알 수 없는 오류") + (c ? ` (${c})` : "");
}

export async function signIn() {
  if (!fb) throw new Error(cloud.state === "off" ? "로그인 기능이 아직 설정되지 않았습니다." : cloud.message || "로그인을 준비하지 못했습니다.");
  const { A, auth } = fb;
  const provider = new A.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  try {
    await A.signInWithPopup(auth, provider);
  } catch (e) {
    if (e && (e.code === "auth/popup-blocked" || e.code === "auth/operation-not-supported-in-this-environment")) {
      await A.signInWithRedirect(auth, provider);
      return;
    }
    throw e;
  }
}

export async function signOut() {
  if (fb) await fb.A.signOut(fb.auth);
}

const col = () => fb.F.collection(fb.db, "users", user.uid, "works");
const ref = (id) => fb.F.doc(fb.db, "users", user.uid, "works", id);

/** 목록: 최근 수정 순 (메타 정보만 사용) */
export async function listWorks() {
  if (!fb || !user) return [];
  const { F } = fb;
  const snap = await F.getDocs(F.query(col(), F.orderBy("updatedAt", "desc"), F.limit(200)));
  return snap.docs.map((d) => {
    const x = d.data();
    return { id: d.id, ...(x.meta || {}), updatedAt: x.updatedAt && x.updatedAt.toMillis ? x.updatedAt.toMillis() : (x.meta && x.meta.savedAt) || 0 };
  });
}

export async function saveWork(id, meta, data) {
  if (!fb || !user) return false;
  const { F } = fb;
  await F.setDoc(ref(id), { meta, data: JSON.stringify(data), updatedAt: F.serverTimestamp(), v: 1 });
  return true;
}

export async function loadWork(id) {
  if (!fb || !user) return null;
  const s = await fb.F.getDoc(ref(id));
  if (!s.exists()) return null;
  const x = s.data();
  try { return JSON.parse(x.data); } catch (e) { return null; }
}

export async function deleteWork(id) {
  if (!fb || !user) return;
  await fb.F.deleteDoc(ref(id));
}
