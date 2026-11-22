/**
 * AI 제공사 어댑터 (브라우저·Vercel 서버 공용)
 * - OpenAI: Responses API (/v1/responses)
 * - Anthropic(Claude): Messages API (/v1/messages)
 * - Google(Gemini): generateContent (/v1beta/models/{model}:generateContent)
 * fetch만 사용하므로 Node 18+와 브라우저에서 모두 동작합니다.
 */

export const PROVIDERS = {
  openai: {
    id: "openai",
    name: "OpenAI (ChatGPT)",
    keyHint: "sk-... 또는 sk-proj-...",
    keyPage: "https://platform.openai.com/api-keys",
    fallbackModels: ["gpt-5.4-mini", "gpt-5.4"],
  },
  anthropic: {
    id: "anthropic",
    name: "Anthropic (Claude)",
    keyHint: "sk-ant-...",
    keyPage: "https://console.anthropic.com/settings/keys",
    fallbackModels: ["claude-sonnet-5-5", "claude-haiku-5-5"],
  },
  gemini: {
    id: "gemini",
    name: "Google (Gemini)",
    keyHint: "AIza...",
    keyPage: "https://aistudio.google.com/apikey",
    fallbackModels: ["gemini-flash-latest", "gemini-3.5-flash"],
  },
};

/** 키 모양으로 제공사를 추정합니다(드롭다운 선택을 돕는 보조 기능). */
export function guessProviderFromKey(key) {
  const k = String(key || "").trim();
  if (!k) return null;
  if (/^sk-ant-/i.test(k)) return "anthropic";
  if (/^AIza[0-9A-Za-z_\-]{20,}/.test(k)) return "gemini";
  if (/^sk-/.test(k)) return "openai";
  return null;
}

export class ProviderError extends Error {
  constructor(code, message, extra = {}) {
    super(message);
    this.code = code;
    this.status = extra.status || 0;
    this.detail = extra.detail || "";
  }
}

/* ---------- 오류를 이해하기 쉬운 문구로 ---------- */

export function explainError(provider, status, rawBody) {
  const body = typeof rawBody === "string" ? rawBody : JSON.stringify(rawBody || "");
  const lower = body.toLowerCase();
  const pname = (PROVIDERS[provider] && PROVIDERS[provider].name) || provider;
  const detail = extractProviderMessage(rawBody) || body.slice(0, 300);

  if (status === 401 || lower.includes("api key not valid") || lower.includes("invalid x-api-key") || lower.includes("incorrect api key") || lower.includes("invalid_api_key") || lower.includes("api_key_invalid")) {
    return new ProviderError("invalid_key", `API 키가 올바르지 않습니다. ${pname} 키가 맞는지, 복사할 때 앞뒤 공백이나 일부 글자가 빠지지 않았는지 확인해 주세요.`, { status, detail });
  }
  if (status === 429 || lower.includes("insufficient_quota") || lower.includes("credit balance") || lower.includes("quota")) {
    if (lower.includes("insufficient_quota") || lower.includes("credit balance") || lower.includes("billing") || lower.includes("exceeded your current quota")) {
      return new ProviderError("quota", `키는 정상이지만 사용 가능한 크레딧(잔액)이나 무료 한도가 없습니다. ${pname} 결제/요금제 설정을 확인해 주세요.`, { status, detail });
    }
    return new ProviderError("rate_limit", "짧은 시간에 요청이 너무 많습니다. 30초~1분 뒤 다시 시도해 주세요.", { status, detail });
  }
  if (status === 403) {
    if (lower.includes("region") || lower.includes("location") || lower.includes("country")) {
      return new ProviderError("region", "현재 지역에서는 이 제공사 API를 사용할 수 없다는 응답을 받았습니다.", { status, detail });
    }
    return new ProviderError("forbidden", "키는 인식되었지만 이 모델이나 기능을 쓸 권한이 없습니다. 키의 프로젝트 권한(또는 조직 인증)과 선택한 모델을 확인해 주세요.", { status, detail });
  }
  if (status === 404 || lower.includes("model_not_found") || lower.includes("does not exist") || lower.includes("not found for api version")) {
    return new ProviderError("model_not_found", "선택한 모델을 찾을 수 없습니다(종료되었거나 이름이 바뀌었을 수 있음). ‘모델 목록 새로고침’ 후 다른 모델을 선택해 주세요.", { status, detail });
  }
  if (status === 400) {
    return new ProviderError("bad_request", "제공사가 요청을 거부했습니다" + (detail ? ` (${detail.slice(0, 140)})` : "") + ". 다른 모델을 선택하거나 잠시 후 다시 시도해 주세요.", { status, detail });
  }
  if (status === 408 || status === 504) {
    return new ProviderError("timeout", "AI 응답이 너무 오래 걸려 중단되었습니다. 다시 시도하거나 더 빠른 모델을 선택해 주세요.", { status, detail });
  }
  if (status === 500 || status === 502 || status === 503 || status === 529 || lower.includes("overloaded")) {
    return new ProviderError("server_busy", `${pname} 서버가 일시적으로 혼잡하거나 오류 상태입니다. 잠시 후 다시 시도해 주세요.`, { status, detail });
  }
  return new ProviderError("unknown", `알 수 없는 오류가 발생했습니다(HTTP ${status}).`, { status, detail });
}

function extractProviderMessage(raw) {
  try {
    const obj = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!obj) return "";
    if (obj.error && typeof obj.error === "object") return String(obj.error.message || "");
    if (obj.error) return String(obj.error);
    if (obj.message) return String(obj.message);
  } catch (e) { /* ignore */ }
  return "";
}

async function doFetch(provider, url, init, timeoutMs) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs || 55000);
  let res;
  try {
    res = await fetch(url, { ...init, signal: ctrl.signal });
  } catch (e) {
    clearTimeout(timer);
    if (e && e.name === "AbortError") {
      throw new ProviderError("timeout", "AI 응답이 너무 오래 걸려 중단되었습니다. 다시 시도하거나 더 빠른 모델을 선택해 주세요.");
    }
    throw new ProviderError("network", "AI 제공사 서버에 연결하지 못했습니다. 인터넷 연결 또는 보안 프로그램(방화벽·광고 차단)을 확인해 주세요.", { detail: String(e && e.message || e) });
  }
  clearTimeout(timer);
  const text = await res.text();
  if (!res.ok) throw explainError(provider, res.status, text);
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new ProviderError("bad_response", "제공사 응답을 해석하지 못했습니다.", { status: res.status, detail: text.slice(0, 300) });
  }
}

/* ---------- 모델 목록 ---------- */

export async function listModels({ provider, apiKey }) {
  const key = String(apiKey || "").trim();
  if (!key) throw new ProviderError("no_key", "API 키를 입력해 주세요.");

  if (provider === "openai") {
    const json = await doFetch(provider, "https://api.openai.com/v1/models", {
      headers: { Authorization: "Bearer " + key },
    }, 20000);
    const ids = (json.data || []).map((m) => m.id).filter(isOpenAITextModel);
    return sortModels(provider, ids);
  }
  if (provider === "anthropic") {
    const json = await doFetch(provider, "https://api.anthropic.com/v1/models?limit=100", {
      headers: anthropicHeaders(key),
    }, 20000);
    const ids = (json.data || []).map((m) => m.id).filter((id) => /^claude/i.test(id));
    return sortModels(provider, ids);
  }
  if (provider === "gemini") {
    const json = await doFetch(provider, "https://generativelanguage.googleapis.com/v1beta/models?pageSize=200", {
      headers: { "x-goog-api-key": key },
    }, 20000);
    const ids = (json.models || [])
      .filter((m) => (m.supportedGenerationMethods || []).includes("generateContent"))
      .map((m) => String(m.name || "").replace(/^models\//, ""))
      .filter((id) => /^gemini/i.test(id) && !/(image|tts|audio|live|embedding|robotics|computer-use|native)/i.test(id));
    return sortModels(provider, ids);
  }
  throw new ProviderError("bad_provider", "지원하지 않는 제공사입니다.");
}

function isOpenAITextModel(id) {
  if (!/^(gpt-|o\d|chatgpt)/i.test(id)) return false;
  if (/(audio|realtime|transcribe|tts|image|search|codex|instruct|embedding|moderation|dall|whisper|davinci|babbage|live|cyber|deep-research|computer)/i.test(id)) return false;
  return true;
}

function versionScore(id) {
  const m = String(id).match(/(\d+(?:\.\d+)?)(?:[-.](\d+))?/);
  if (!m) return 0;
  return parseFloat(m[1]) * 100 + (m[2] ? parseFloat(m[2]) : 0);
}

/** 추천 모델(빠르고 저렴하며 안정적인 것)을 앞에 오도록 정렬 */
export function sortModels(provider, ids) {
  const unique = Array.from(new Set(ids));
  const score = (id) => {
    let s = versionScore(id);
    const isSnapshot = /-20\d\d-?\d\d-?\d\d|-\d{8}$|-\d{4}$/.test(id);
    if (isSnapshot) s -= 1000;
    if (/preview|exp|experimental/i.test(id)) s -= 500;
    if (provider === "openai") {
      if (/mini/i.test(id)) s += 3000;
      if (/nano|pro|chat-latest/i.test(id)) s -= 800;
    }
    if (provider === "anthropic") {
      if (/sonnet/i.test(id)) s += 3000;
      else if (/haiku/i.test(id)) s += 2500;
    }
    if (provider === "gemini") {
      if (/flash/i.test(id) && !/lite/i.test(id)) s += 3000;
      if (/latest/i.test(id)) s += 100;
      if (/lite/i.test(id)) s += 1000;
    }
    return s;
  };
  return unique.sort((a, b) => score(b) - score(a));
}

/* ---------- 텍스트 생성 ---------- */

function anthropicHeaders(key) {
  return {
    "x-api-key": key,
    "anthropic-version": "2023-06-01",
    "content-type": "application/json",
    "anthropic-dangerous-direct-browser-access": "true",
  };
}

/**
 * @returns {Promise<{text:string, model:string}>}
 */
export async function generate({ provider, apiKey, model, system, prompt, json = true, maxTokens = 4000, timeoutMs = 55000 }) {
  const key = String(apiKey || "").trim();
  if (!key) throw new ProviderError("no_key", "API 키를 입력해 주세요.");
  const p = PROVIDERS[provider];
  if (!p) throw new ProviderError("bad_provider", "지원하지 않는 제공사입니다.");
  const useModel = String(model || "").trim() || p.fallbackModels[0];
  // OpenAI JSON 모드는 '입력(input)'에 json이라는 단어가 반드시 있어야 함(instructions는 인정 안 됨) → 모든 제공사 공통으로 붙임
  if (json && !/json/i.test(String(prompt || ""))) prompt = String(prompt || "") + "\n\n응답 형식: JSON 객체 하나만 출력 (Respond in JSON only).";

  if (provider === "openai") {
    const body = {
      model: useModel,
      instructions: system || undefined,
      input: prompt,
      max_output_tokens: maxTokens,
    };
    const isReasoning = /^(gpt-5|o\d)/i.test(useModel);
    // 추론형 모델은 내부 추론 토큰도 출력 한도에 포함되므로 여유를 둠(잘림 방지)
    if (isReasoning) body.max_output_tokens = maxTokens + 6000;
    if (json) body.text = { format: { type: "json_object" } };
    if (isReasoning) body.reasoning = { effort: "low" };
    const send = () => doFetch(provider, "https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }, timeoutMs);
    let res;
    for (let attempt = 0; ; attempt++) {
      try { res = await send(); break; } catch (e) {
        if (e.code !== "bad_request" || attempt >= 2) throw e;
        // 거부 원인이 된 옵션을 빼고 다시 시도
        if (body.reasoning && /reasoning|effort/i.test(e.detail)) { delete body.reasoning; continue; }
        if (body.text && /json|text\.format|format/i.test(e.detail)) { delete body.text; continue; }
        if (/max_output_tokens/i.test(e.detail)) { body.max_output_tokens = maxTokens; continue; }
        throw e;
      }
    }
    const text = (res.output || [])
      .filter((o) => o.type === "message")
      .flatMap((o) => o.content || [])
      .filter((c) => c.type === "output_text")
      .map((c) => c.text)
      .join("");
    if (res.status === "incomplete" && !text) {
      throw new ProviderError("truncated", "AI 응답이 길이 제한으로 잘렸습니다. 다시 시도해 주세요.");
    }
    if (!text) throw new ProviderError("empty", "AI가 빈 응답을 보냈습니다. 다시 시도해 주세요.");
    return { text, model: res.model || useModel };
  }

  if (provider === "anthropic") {
    const res = await doFetch(provider, "https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: anthropicHeaders(key),
      body: JSON.stringify({
        model: useModel,
        max_tokens: maxTokens,
        system: system || undefined,
        messages: [{ role: "user", content: prompt + (json ? "\n\n반드시 JSON 객체 하나만 출력하세요. 설명이나 코드블록 표시는 쓰지 마세요." : "") }],
      }),
    }, timeoutMs);
    const text = (res.content || []).filter((c) => c.type === "text").map((c) => c.text).join("");
    if (!text) {
      if (res.stop_reason === "refusal") throw new ProviderError("refused", "AI가 이 요청에 대한 응답을 거절했습니다. 다른 곡이나 다른 제공사로 시도해 보세요.");
      throw new ProviderError("empty", "AI가 빈 응답을 보냈습니다. 다시 시도해 주세요.");
    }
    return { text, model: res.model || useModel };
  }

  if (provider === "gemini") {
    const body = {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: Math.max(maxTokens * 3, 8192) },
    };
    if (system) body.systemInstruction = { parts: [{ text: system }] };
    if (json) body.generationConfig.responseMimeType = "application/json";
    const url = "https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(useModel) + ":generateContent";
    const res = await doFetch(provider, url, {
      method: "POST",
      headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }, timeoutMs);
    const cand = (res.candidates || [])[0] || {};
    const text = ((cand.content && cand.content.parts) || []).filter((p) => !p.thought && p.text).map((p) => p.text).join("");
    if (!text) {
      const reason = cand.finishReason || (res.promptFeedback && res.promptFeedback.blockReason) || "";
      if (/SAFETY|RECITATION|BLOCK|PROHIBITED/i.test(reason)) {
        throw new ProviderError("refused", "Gemini가 안전/저작권 정책(" + reason + ")으로 응답을 막았습니다. 다른 곡이나 다른 제공사로 시도해 보세요.");
      }
      if (/MAX_TOKENS/i.test(reason)) throw new ProviderError("truncated", "AI 응답이 길이 제한으로 잘렸습니다. 다시 시도해 주세요.");
      throw new ProviderError("empty", "AI가 빈 응답을 보냈습니다. 다시 시도해 주세요.");
    }
    return { text, model: res.modelVersion || useModel };
  }

  throw new ProviderError("bad_provider", "지원하지 않는 제공사입니다.");
}

/** AI 응답 문자열에서 JSON 객체/배열을 안전하게 꺼냅니다. */
export function parseJsonLoose(text) {
  let t = String(text || "").trim();
  t = t.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  try { return JSON.parse(t); } catch (e) { /* continue */ }
  const firstObj = t.indexOf("{");
  const firstArr = t.indexOf("[");
  const start = firstObj === -1 ? firstArr : (firstArr === -1 ? firstObj : Math.min(firstObj, firstArr));
  if (start !== -1) {
    const open = t[start];
    const close = open === "{" ? "}" : "]";
    const end = t.lastIndexOf(close);
    if (end > start) {
      try { return JSON.parse(t.slice(start, end + 1)); } catch (e) { /* continue */ }
    }
  }
  throw new ProviderError("bad_json", "AI 응답 형식이 올바르지 않습니다. 다시 시도해 주세요.");
}
