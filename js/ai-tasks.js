/**
 * AI에게 보내는 요청(프롬프트)과 응답 검증
 * 1단계: 표현이 들어간 곡 추천 (가볍고 빠르게 — 가사 전문은 요청하지 않음)
 * 2단계: 교사가 붙여 넣은 가사로 빈칸·어휘·해석·곡 소개 생성 (두 요청을 동시에 보내 대기 시간 단축)
 */
import { generateJSON } from "./llm-client.js";
import { categoryOf, GRADES } from "./data/grammar-catalog.js";
import { findWordInLine } from "./lyrics.js";

const SYSTEM_TEACHER = "너는 한국 중·고등학교 영어 교사를 돕는 수업 자료 도우미다. 2022 개정 영어과 교육과정의 언어 형식을 잘 알고, 학생에게 적절한 팝송을 고른다. 응답은 반드시 JSON 하나로만 한다.";

function grammarDesc(g) {
  if (g.custom) return `사용자 입력 표현: "${g.label}"`;
  const cat = categoryOf(g);
  return `${cat.no}. ${cat.en}(${cat.ko}) > ${g.label} [형태: ${g.form}] (교육과정 예문: ${g.example}; 학습 시작 권장 학교급: ${g.level})`;
}

export async function recommendSongs({ grammar, grade, exclude = [], count = 6, signal }) {
  const prompt = [
    "다음 영어 표현이 가사에 실제로 들어 있는 팝송(디즈니·영화 OST 포함)을 추천해 줘.",
    "",
    "표현: " + grammarDesc(grammar),
    "적용 학년: " + (grade || "자동(표현의 권장 학교급에 맞춤)"),
    exclude.length ? "제외할 곡(이미 보여 줌): " + exclude.join(" / ") : "",
    "",
    "규칙:",
    `1. ${count}곡. 실제로 존재하고 YouTube에 공식 영상이 있을 만한 잘 알려진 곡만. 확실하지 않으면 넣지 마.`,
    "2. 해당 표현이 후렴이나 자주 반복되는 부분에 분명히 쓰인 곡을 우선한다.",
    "3. 선정적·폭력적·약물·욕설이 두드러진 곡은 제외한다. 술 등 주의할 소재가 있으면 caution에 적는다.",
    "4. 한국 청소년에게 친숙한 최신곡과 검증된 명곡을 섞는다.",
    "5. evidence에는 표현이 쓰인 가사 구절을 10단어 이내로만 적는다(전체 가사 금지).",
    "6. grade는 다음 중 하나: " + GRADES.join(", "),
    "",
    '형식: {"songs":[{"title":"","artist":"","year":2019,"evidence":"","where":"후렴/1절 등","reason":"한국어 1~2문장","vocabLevel":"basic|intermediate|advanced","grade":"","caution":""}]}',
  ].filter(Boolean).join("\n");

  const data = await generateJSON({ system: SYSTEM_TEACHER, prompt, maxTokens: 2000, signal });
  const list = Array.isArray(data) ? data : (data.songs || data.recommendations || []);
  return list
    .filter((s) => s && s.title && s.artist)
    .map((s) => ({
      title: String(s.title).trim(),
      artist: String(s.artist).trim(),
      year: s.year || "",
      evidence: String(s.evidence || "").slice(0, 120),
      where: String(s.where || ""),
      reason: String(s.reason || ""),
      vocab: ["basic", "intermediate", "advanced"].includes(s.vocabLevel) ? s.vocabLevel : "intermediate",
      grade: GRADES.includes(s.grade) ? s.grade : "",
      caution: String(s.caution || ""),
      source: "ai",
    }))
    .slice(0, count);
}

/**
 * 2단계 활동지 생성
 * @param lines 표시용 줄(반복 접기 반영)
 * @returns {blanks, info, grammarTip, grammarLines, translations, warnings}
 */
export async function buildWorksheetWithAI({ song, grammar, grade, lines, blankCount, focus, needTranslation, skipInfo = false, skipTip = false, signal }) {
  const lyricLines = lines.map((l, i) => ({ i, en: l.en, ko: l.ko, type: l.type })).filter((l) => l.type === "lyric" && l.en);
  const numbered = lyricLines.map((l) => `${l.i}: ${l.en}`).join("\n");
  const focusText = focus === "grammar" ? "빈칸의 절반 이상을 목표 표현과 직접 관련된 단어(예: 동사 형태, 조동사, 관계사)로" :
    focus === "vocab" ? "빈칸은 주로 핵심 내용어(명사·동사·형용사)로" :
      "빈칸의 약 30%는 목표 표현과 관련된 단어로, 나머지는 핵심 내용어로";

  const structurePrompt = [
    `곡: ${song.title} - ${song.artist}`,
    "목표 표현: " + grammarDesc(grammar),
    "학년: " + (grade || "중학교"),
    "",
    "아래는 교사가 붙여 넣은 가사다. 각 줄 앞의 숫자는 줄 번호다.",
    numbered,
    "",
    "작업:",
    `1. 빈칸 ${blankCount}개를 고른다. ${focusText}. 곡 전체에 고르게 퍼지게 하고, 가능하면 한 줄에 하나씩, 같은 단어는 한 번만. 감탄사(oh, yeah 등)·고유명사·축약 구어(gonna 등)는 피한다.`,
    "   word는 그 줄에 적힌 철자 그대로(대소문자 포함), headword는 사전형(예: drinks→drink, memories→memory; -ing형이 형용사/동명사로 쓰이면 그대로 둬도 됨).",
    "   pos는 n./v./a./ad./prep./conj./pron./phr. 중 하나, meaning은 이 곡의 문맥에 맞는 한국어 뜻(쉼표로 2개 이내).",
    "2. 목표 표현이 쓰인 구절을 grammarLines에 최대 8개(phrase는 그 줄의 정확한 일부, note는 한국어 10자 내외 설명).",
    skipTip ? "3. grammarTip은 빈 문자열로 둔다(이미 있음)." : "3. grammarTip: 학생용으로 목표 표현의 형태와 뜻을 2문장 이내 한국어로 설명.",
    skipInfo ? "4. info는 빈 배열로 둔다(이미 있음)." : "4. info: 활동지 상단 곡 소개. label은 '가수','발매','앨범','특징','배경' 순서. value는 각 1~2문장의 한국어. 확실하지 않은 사실은 쓰지 말고 빈 문자열로 둔다.",
    "",
    '형식: {"blanks":[{"line":0,"word":"","headword":"","pos":"","meaning":"","type":"vocab|grammar"}],"grammarLines":[{"line":0,"phrase":"","note":""}],"grammarTip":"","info":[{"label":"","value":""}]}',
  ].join("\n");

  const needKo = needTranslation ? lyricLines.filter((l) => !l.ko) : [];
  const [structRes, transRes] = await Promise.allSettled([
    generateJSON({ system: SYSTEM_TEACHER, prompt: structurePrompt, maxTokens: 4000, signal }),
    needKo.length ? translateLines({ song, items: needKo.map((l) => ({ i: l.i, en: l.en })), signal }) : Promise.resolve(null),
  ]);

  const warnings = [];
  if (structRes.status === "rejected") throw structRes.reason;
  const data = structRes.value || {};

  // 빈칸 검증: 실제로 그 줄에 있는 단어만 채택
  const blanks = [];
  const usedHead = new Set();
  (Array.isArray(data.blanks) ? data.blanks : []).forEach((b) => {
    const li = Number(b.line);
    const line = lines[li];
    if (!line || line.type !== "lyric" || !line.en) return;
    const avoid = blanks.filter((x) => x.line === li);
    const found = findWordInLine(line.en, b.word, avoid);
    if (!found) return;
    const head = String(b.headword || b.word).trim();
    const key = head.toLowerCase();
    if (usedHead.has(key)) return;
    usedHead.add(key);
    blanks.push({
      line: li, start: found.start, end: found.end, answer: found.text,
      head, pos: normalizePos(b.pos), meaning: String(b.meaning || "").trim(),
      type: b.type === "grammar" ? "grammar" : "vocab",
    });
  });
  if (blanks.length < blankCount) warnings.push(`AI가 고른 빈칸 중 가사와 맞는 ${blanks.length}개를 사용하고, 나머지는 자동으로 골랐습니다.`);

  const grammarLines = (Array.isArray(data.grammarLines) ? data.grammarLines : []).map((g) => {
    const li = Number(g.line);
    const line = lines[li];
    if (!line || !line.en) return null;
    const idx = line.en.toLowerCase().indexOf(String(g.phrase || "").toLowerCase().trim());
    if (idx < 0 || !g.phrase) return null;
    return { line: li, start: idx, end: idx + String(g.phrase).trim().length, note: String(g.note || "") };
  }).filter(Boolean);

  const translations = {};
  if (transRes.status === "fulfilled" && transRes.value) {
    Object.keys(transRes.value).forEach((i) => { if (lines[i]) translations[i] = transRes.value[i]; });
  } else if (transRes.status === "rejected") {
    warnings.push("가사 해석을 받지 못했습니다(" + (transRes.reason && transRes.reason.message || "오류") + "). ‘편집’ 탭에서 직접 입력할 수 있습니다.");
  }

  const info = (Array.isArray(data.info) ? data.info : [])
    .map((f) => ({ label: String(f.label || "").trim(), value: String(f.value || "").trim() }))
    .filter((f) => f.label && f.value);

  return { blanks, grammarLines, translations, info, grammarTip: String(data.grammarTip || "").trim(), warnings };
}

/**
 * 영어 가사 줄 → 한국어 해석. 같은 줄(반복 후렴)은 한 번만 번역해 토큰을 아낍니다.
 * @param items [{i, en}]
 * @returns {Promise<Object>} { i: ko }
 */
export async function translateLines({ song, items, signal }) {
  const uniq = [];
  const keyOf = (t) => t.toLowerCase().replace(/[^a-z0-9']/g, "");
  const byKey = new Map();
  items.forEach((it) => {
    const k = keyOf(it.en);
    if (!k) return;
    if (!byKey.has(k)) { byKey.set(k, uniq.length); uniq.push(it.en); }
  });
  if (!uniq.length) return {};
  const prompt = [
    `곡: ${song.title} - ${song.artist}`,
    "다음 영어 가사 줄을 중·고등학생용 한국어 해석으로 옮겨라. 자연스럽고 짧게, 노래의 문맥을 살려서. 줄 번호를 유지하고 모든 줄을 번역한다.",
    uniq.map((en, n) => `${n}: ${en}`).join("\n"),
    "",
    '형식: {"ko":[{"i":0,"ko":""}]}',
  ].join("\n");
  const data = await generateJSON({ system: SYSTEM_TEACHER, prompt, maxTokens: Math.min(8000, 400 + uniq.length * 70), signal });
  const arr = Array.isArray(data) ? data : (data.ko || data.translations || []);
  const byN = {};
  (Array.isArray(arr) ? arr : []).forEach((t) => { if (t && t.ko != null) byN[Number(t.i)] = String(t.ko).trim(); });
  const out = {};
  items.forEach((it) => {
    const n = byKey.get(keyOf(it.en));
    if (n != null && byN[n]) out[it.i] = byN[n];
  });
  return out;
}

/**
 * 구간 표시가 없는 가사에 [Verse 1] [Chorus] 등을 붙이기 위한 구간 시작 줄 찾기
 * @param items [{i, en}] 영어 가사 줄(순서대로)
 * @returns [{start: i, label}]
 */
export async function labelSections({ song, items, signal }) {
  const prompt = [
    `곡: ${song.title} - ${song.artist}`,
    "다음은 구간 표시 없이 붙여 넣은 영어 가사다. 줄 번호를 보고 각 구간이 시작되는 줄과 이름을 정하라.",
    "이름은 Intro, Verse 1, Verse 2, Pre-Chorus, Chorus, Post-Chorus, Bridge, Outro 중에서 고르고, 같은 후렴이 반복되면 매번 같은 이름(Chorus)을 쓴다.",
    "첫 구간은 반드시 첫 줄에서 시작한다. 가사 내용을 다시 쓰지 말고 줄 번호만 답한다.",
    items.map((l) => `${l.i}: ${l.en}`).join("\n"),
    "",
    '형식(JSON): {"sections":[{"start":0,"label":"Verse 1"}]}',
  ].join("\n");
  const data = await generateJSON({ system: SYSTEM_TEACHER, prompt, maxTokens: 1200, signal });
  const valid = new Set(items.map((l) => l.i));
  const out = [];
  (Array.isArray(data.sections) ? data.sections : []).forEach((sec) => {
    const st = Number(sec.start);
    const label = String(sec.label || "").replace(/[\[\]]/g, "").trim().slice(0, 24);
    if (!valid.has(st) || !label) return;
    if (out.length && st <= out[out.length - 1].start) return;
    out.push({ start: st, label });
  });
  if (out.length && out[0].start !== items[0].i) out[0].start = items[0].i;
  return out;
}

/** 빈칸 단어 뜻만 따로 채우기(자동 선택된 빈칸용) */
export async function fillMeanings({ song, words, signal }) {
  if (!words.length) return {};
  const prompt = [
    `곡: ${song.title} - ${song.artist}`,
    "다음 단어들(가사 속 형태)의 사전형, 품사, 이 곡 문맥에 맞는 한국어 뜻(쉼표로 2개 이내)을 알려줘.",
    words.map((w, i) => `${i}: ${w.answer}  (문맥: ${w.context})`).join("\n"),
    '형식: {"items":[{"i":0,"headword":"","pos":"n./v./a./ad./prep./conj./pron./phr.","meaning":""}]}',
  ].join("\n");
  const data = await generateJSON({ system: SYSTEM_TEACHER, prompt, maxTokens: 1500, signal });
  const out = {};
  (data.items || []).forEach((it) => { out[Number(it.i)] = { head: it.headword, pos: normalizePos(it.pos), meaning: it.meaning }; });
  return out;
}

export function normalizePos(pos) {
  const p = String(pos || "").toLowerCase().trim();
  if (!p) return "";
  if (/^n|noun|명/.test(p)) return "n.";
  if (/^v|verb|동/.test(p)) return "v.";
  if (/^(a\.|adj|형)/.test(p)) return "a.";
  if (/^(ad|adv|부)/.test(p)) return "ad.";
  if (/^prep|전/.test(p)) return "prep.";
  if (/^conj|접/.test(p)) return "conj.";
  if (/^pron|대/.test(p)) return "pron.";
  if (/^ph|구|idiom/.test(p)) return "phr.";
  if (/^int|감/.test(p)) return "int.";
  return p.length <= 6 ? p : "";
}
