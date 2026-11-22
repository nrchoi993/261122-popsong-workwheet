/**
 * AI API 설정·상태 관리
 * 상태: none(키 미설정) → unverified(연결 미확인) → checking(확인 중) → ok(요청 성공) | error(연결 실패)
 * - 키를 입력했다는 이유만으로 '요청 성공'이 되지 않습니다. 실제 생성 요청(OpenAI는 Responses API)이 성공해야 합니다.
 * - 키·제공사·모델이 바뀌면 다시 '연결 미확인'으로 돌아갑니다.
 */
import { PROVIDERS, guessProviderFromKey, generate as directGenerate, listModels as directListModels, parseJsonLoose, ProviderError } from "../lib/providers.js";

const LS_KEY = "popsong.settings.v2";
const SS_KEY = "popsong.session.v2";

const listeners = new Set();

export const state = {
  provider: "openai",
  apiKey: "",
  model: "",
  models: [],
  remember: false,
  ytKey: "",
  status: "none",
  statusMessage: "",
  statusDetail: "",
  lastOkAt: null,
  lastModel: "",
  proxy: "unknown", // unknown | ok | missing
};

export function onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function emit() { listeners.forEach((fn) => { try { fn(state); } catch (e) { console.error(e); } }); }

export function loadSettings() {
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(LS_KEY) || "null"); } catch (e) { saved = null; }
  let session = null;
  try { session = JSON.parse(sessionStorage.getItem(SS_KEY) || "null"); } catch (e) { session = null; }
  const src = (saved && saved.remember) ? saved : (session || saved || {});
  state.provider = PROVIDERS[src.provider] ? src.provider : "openai";
  state.apiKey = src.apiKey || "";
  state.model = src.model || "";
  state.models = Array.isArray(src.models) ? src.models : [];
  state.remember = !!(saved && saved.remember);
  state.ytKey = src.ytKey || "";
  state.status = state.apiKey ? "unverified" : "none";
  state.statusMessage = "";
  emit();
}

function persist() {
  const data = { provider: state.provider, apiKey: state.apiKey, model: state.model, models: state.models.slice(0, 40), remember: state.remember, ytKey: state.ytKey };
  try {
    if (state.remember) {
      localStorage.setItem(LS_KEY, JSON.stringify(data));
      sessionStorage.removeItem(SS_KEY);
    } else {
      localStorage.setItem(LS_KEY, JSON.stringify({ provider: data.provider, model: data.model, remember: false }));
      sessionStorage.setItem(SS_KEY, JSON.stringify(data));
    }
  } catch (e) { /* 저장 불가 환경: 메모리에만 유지 */ }
}

export function update(patch) {
  const before = { provider: state.provider, apiKey: state.apiKey, model: state.model };
  Object.assign(state, patch);
  if ("apiKey" in patch) state.apiKey = String(state.apiKey || "").trim();
  const connChanged = before.provider !== state.provider || before.apiKey !== state.apiKey || before.model !== state.model;
  if (before.provider !== state.provider) { state.models = []; state.model = ""; }
  if (connChanged) {
    state.status = state.apiKey ? "unverified" : "none";
    state.statusMessage = "";
    state.statusDetail = "";
  }
  persist();
  emit();
}

export function hasKey() { return !!state.apiKey; }
export function isReady() { return state.status === "ok"; }

/** 선택한 제공사와 키 모양이 다를 때 안내 문구 */
export function keyMismatchHint() {
  const g = guessProviderFromKey(state.apiKey);
  if (!g || g === state.provider) return null;
  return { suggested: g, message: `입력한 키는 ${PROVIDERS[g].name} 키 형식으로 보입니다.` };
}

/* ---------- 서버(Vercel 함수) 경유 호출, 없으면 브라우저에서 직접 호출 ---------- */

async function callProxy(payload, timeoutMs) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  const { signal: userSignal, ...body } = payload;
  if (userSignal) {
    if (userSignal.aborted) ctrl.abort();
    else userSignal.addEventListener("abort", () => ctrl.abort(), { once: true });
  }
  try {
    const res = await fetch("/api/llm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (res.status === 404 || res.status === 405) { state.proxy = "missing"; return null; }
    if (res.status === 504) throw new ProviderError("timeout", "AI 응답이 서버 제한 시간(60초)을 넘었습니다. 빈칸 수를 줄이거나 더 빠른 모델로 다시 시도해 주세요.");
    if (!res.ok) throw new ProviderError("proxy", `사이트 서버(Vercel) 오류가 발생했습니다(HTTP ${res.status}). 잠시 후 다시 시도해 주세요.`);
    const json = await res.json();
    state.proxy = "ok";
    if (!json.ok) {
      const e = json.error || {};
      throw new ProviderError(e.code || "unknown", e.message || "알 수 없는 오류", { status: e.status, detail: e.detail });
    }
    return json;
  } catch (e) {
    if (e instanceof ProviderError) throw e;
    if (e && e.name === "AbortError") {
      if (userSignal && userSignal.aborted) throw new ProviderError("cancelled", "요청을 취소했습니다.");
      throw new ProviderError("timeout", "응답이 너무 오래 걸려 중단했습니다. 다시 시도하거나 더 빠른 모델을 선택해 주세요.");
    }
    // 서버에 닿지 못함(로컬 파일로 열었거나 함수 미배포) → 직접 호출로 전환
    state.proxy = "missing";
    return null;
  } finally {
    clearTimeout(t);
  }
}

async function run(action, args = {}) {
  const payload = { provider: state.provider, apiKey: state.apiKey, model: state.model, action, ...args };
  if (state.proxy !== "missing") {
    const out = await callProxy(payload, action === "generate" ? 62000 : 35000);
    if (out) return out;
  }
  // 직접 호출(브라우저 → 제공사)
  if (action === "models") return { ok: true, models: await directListModels(payload) };
  if (action === "ping") {
    const r = await directGenerate({ ...payload, system: "You are a connection test. Reply with JSON only.", prompt: 'Return exactly this JSON: {"ok": true}', json: true, maxTokens: 300, timeoutMs: 30000 });
    return { ok: true, model: r.model };
  }
  const r = await directGenerate({ ...payload, timeoutMs: 90000 });
  return { ok: true, text: r.text, model: r.model };
}

function setError(e) {
  state.status = "error";
  state.statusMessage = e.message || "연결에 실패했습니다.";
  state.statusDetail = e.detail || "";
  emit();
}

function setOk(model) {
  state.status = "ok";
  state.statusMessage = "";
  state.statusDetail = "";
  state.lastOkAt = new Date();
  state.lastModel = model || state.model;
  emit();
}

export async function refreshModels() {
  if (!state.apiKey) throw new ProviderError("no_key", "API 키를 먼저 입력해 주세요.");
  const out = await run("models");
  const models = out.models || [];
  state.models = models;
  if (!state.model || !models.includes(state.model)) state.model = models[0] || PROVIDERS[state.provider].fallbackModels[0];
  persist();
  emit();
  return models;
}

/** 연결 확인: 모델 목록(가능하면) + 실제 생성 요청 1회 */
export async function testConnection() {
  if (!state.apiKey) {
    state.status = "none";
    emit();
    throw new ProviderError("no_key", "API 키를 입력해 주세요.");
  }
  state.status = "checking";
  state.statusMessage = "";
  emit();
  try {
    if (!state.models.length || !state.model) {
      try { await refreshModels(); } catch (e) {
        if (e.code === "invalid_key" || e.code === "quota" || e.code === "forbidden" || e.code === "region") throw e;
        if (!state.model) state.model = PROVIDERS[state.provider].fallbackModels[0];
      }
      state.status = "checking"; emit();
    }
    const out = await run("ping");
    setOk(out.model);
    return out;
  } catch (e) {
    setError(e);
    throw e;
  }
}

/** JSON을 돌려받는 생성 요청. 성공하면 상태를 '요청 성공'으로 갱신합니다. */
export async function generateJSON({ system, prompt, maxTokens = 4000, signal }) {
  if (!state.apiKey) throw new ProviderError("no_key", "API 키가 설정되지 않았습니다.");
  if (!state.model) state.model = PROVIDERS[state.provider].fallbackModels[0];
  try {
    const out = await run("generate", { system, prompt, json: true, maxTokens, signal });
    const data = parseJsonLoose(out.text);
    setOk(out.model);
    return data;
  } catch (e) {
    if (e.code === "bad_json") throw e; // 연결 자체는 성공 → 상태 유지
    if (["invalid_key", "quota", "forbidden", "region", "model_not_found", "network"].includes(e.code)) setError(e);
    throw e;
  }
}

export function statusView() {
  const p = PROVIDERS[state.provider];
  switch (state.status) {
    case "none": return { cls: "st-none", label: "키 미설정", text: "AI 키 없이도 기본 곡 목록과 자동 빈칸으로 사용할 수 있습니다." };
    case "unverified": return { cls: "st-unverified", label: "연결 미확인", text: `${p.name} 키가 입력되었습니다. ‘연결 확인’을 눌러 실제 요청을 보내 확인해 주세요.` };
    case "checking": return { cls: "st-checking", label: "확인 중…", text: "제공사에 테스트 요청을 보내고 있습니다." };
    case "ok": return { cls: "st-ok", label: "요청 성공", text: `${p.name} · ${state.lastModel || state.model} 모델로 요청이 성공했습니다.` };
    case "error": return { cls: "st-error", label: "연결 실패", text: state.statusMessage };
    default: return { cls: "st-none", label: "-", text: "" };
  }
}

export { PROVIDERS };
