/**
 * POST /api/llm
 * 사용자가 화면에서 입력한 API 키를 받아 AI 제공사에 그대로 전달합니다.
 * 키는 서버에 저장하지 않으며 로그에도 남기지 않습니다.
 *
 * body: { provider, apiKey, model, action: "ping" | "models" | "generate", system, prompt, json, maxTokens }
 * 응답: 항상 HTTP 200 + { ok: true, ... } 또는 { ok: false, error: { code, message, status, detail } }
 *  → HTTP 200이 아닌 응답은 "우리 서버(Vercel) 문제", ok:false는 "AI 제공사 쪽 문제"로 구분할 수 있습니다.
 */
import { generate, listModels, ProviderError } from "../lib/providers.js";


export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: { code: "method", message: "POST만 지원합니다." } });

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  body = body || {};
  const { provider, apiKey, model, action = "generate" } = body;
  const started = Date.now();

  try {
    if (action === "models") {
      const models = await listModels({ provider, apiKey });
      return res.status(200).json({ ok: true, models, ms: Date.now() - started });
    }
    if (action === "ping") {
      const out = await generate({
        provider, apiKey, model,
        system: "You are a connection test. Reply with JSON only.",
        prompt: 'Return exactly this JSON: {"ok": true}',
        json: true, maxTokens: 300, timeoutMs: 30000,
      });
      return res.status(200).json({ ok: true, model: out.model, sample: out.text.slice(0, 60), ms: Date.now() - started });
    }
    const out = await generate({
      provider, apiKey, model,
      system: body.system, prompt: body.prompt,
      json: body.json !== false,
      maxTokens: Math.min(Number(body.maxTokens) || 4000, 16000),
      timeoutMs: 56000,
    });
    return res.status(200).json({ ok: true, text: out.text, model: out.model, ms: Date.now() - started });
  } catch (e) {
    const err = e instanceof ProviderError ? e : new ProviderError("unknown", "서버에서 알 수 없는 오류가 발생했습니다.", { detail: String(e && e.message || e) });
    return res.status(200).json({ ok: false, error: { code: err.code, message: err.message, status: err.status, detail: String(err.detail || "").slice(0, 400) }, ms: Date.now() - started });
  }
}
