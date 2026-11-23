/**
 * GET /api/config — 브라우저가 쓸 공개 설정(Firebase 웹 설정)을 돌려줍니다.
 *
 * Vercel 환경 변수 FIREBASE_CONFIG 에 Firebase 콘솔의 "SDK 설정 및 구성" 코드를
 * 그대로 붙여 넣으면 됩니다. 아래 형태를 모두 받습니다.
 *   {"apiKey":"...","authDomain":"...","projectId":"...","appId":"..."}            (JSON)
 *   const firebaseConfig = { apiKey: "...", authDomain: "...", ... };          (콘솔 코드 그대로)
 * 또는 FIREBASE_API_KEY / FIREBASE_AUTH_DOMAIN / FIREBASE_PROJECT_ID / FIREBASE_APP_ID 를 따로 넣어도 됩니다.
 *
 * ※ Firebase 웹 설정 값(apiKey 포함)은 원래 브라우저에 공개되는 값입니다.
 *   데이터 보호는 Firestore 보안 규칙이 맡습니다(README 참고).
 */
export function parseFirebaseConfig(raw) {
  if (!raw || typeof raw !== "string") return null;
  let t = raw.trim();
  const a = t.indexOf("{"), b = t.lastIndexOf("}");
  if (a < 0 || b <= a) return null;
  t = t.slice(a, b + 1);
  try { return JSON.parse(t); } catch (e) { /* JS 객체 표기 → JSON */ }
  try {
    const json = t
      .replace(/(^|[^:])\/\/[^\n]*/gm, "$1")             // 주석(https:// 는 제외)
      .replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, '"$1"')    // 작은따옴표 문자열
      .replace(/([{,]\s*)([A-Za-z_$][\w$]*)\s*:/g, '$1"$2":') // 따옴표 없는 키
      .replace(/,\s*}/g, "}");                           // 끝 쉼표
    return JSON.parse(json);
  } catch (e) {
    return null;
  }
}

export default function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const env = process.env;
  let fb = parseFirebaseConfig(env.FIREBASE_CONFIG);
  if (!fb && env.FIREBASE_API_KEY && env.FIREBASE_PROJECT_ID) {
    fb = {
      apiKey: env.FIREBASE_API_KEY,
      authDomain: env.FIREBASE_AUTH_DOMAIN || `${env.FIREBASE_PROJECT_ID}.firebaseapp.com`,
      projectId: env.FIREBASE_PROJECT_ID,
      appId: env.FIREBASE_APP_ID || undefined,
    };
  }
  const ok = fb && fb.apiKey && fb.projectId;
  const firebase = ok ? {
    apiKey: fb.apiKey,
    authDomain: fb.authDomain || `${fb.projectId}.firebaseapp.com`,
    projectId: fb.projectId,
    appId: fb.appId,
    storageBucket: fb.storageBucket,
    messagingSenderId: fb.messagingSenderId,
  } : null;
  res.status(200).json({ firebase, firebaseError: env.FIREBASE_CONFIG && !ok ? "FIREBASE_CONFIG 값을 읽지 못했습니다. Firebase 콘솔의 firebaseConfig 코드를 그대로 붙여 넣었는지 확인해 주세요." : null });
}
