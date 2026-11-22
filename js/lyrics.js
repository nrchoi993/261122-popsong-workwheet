/**
 * 가사 처리: 붙여넣은 가사 해석(영어/한글 줄 짝짓기), 반복 구간 접기, 빈칸 자동 선택
 */

const LABEL_RE = /^\s*[\[(（【]?\s*(intro|verse|pre[-\s]?chorus|post[-\s]?chorus|chorus|bridge|hook|refrain|outro|interlude|breakdown|break|rap|drop|후렴|간주|도입|브릿지|\d+\s*절)\b[^\])）】]*[\])）】]?\s*:?\s*$/i;
const BRACKET_ONLY_RE = /^\s*[\[【].{1,30}[\]】]\s*$/;
const HANGUL_RE = /[가-힣]/g;
const LATIN_RE = /[A-Za-z]/g;

export const INTERJECTIONS = new Set(("oh ooh ooo oooh ah aah ahh uh uhh huh hah ha hey yeah yea yeh ya yo whoa woah wo mm mmm hmm na nah la doo da dum ayy ay eh ooh-ooh oh-oh woo hoo uh-huh ooh-oo baby babe shh"
).split(" "));

export const STOPWORDS = new Set(("a an the and or but if then than so as at by for from in into of on onto to with without up down out off over under again here there " +
  "i me my mine myself you your yours yourself he him his she her hers it its we us our ours they them their theirs this that these those " +
  "am is are was were be been being do does did done have has had having can could will would shall should may might must " +
  "not no yes just very too also still even ever never always only all any some each every much many more most less few lot lots " +
  "what who whom whose which when where why how whatever wherever " +
  "i'm you're he's she's it's we're they're i've you've we've they've i'd you'd he'd she'd we'd they'd i'll you'll he'll she'll we'll they'll " +
  "don't doesn't didn't can't won't isn't aren't wasn't weren't ain't couldn't wouldn't shouldn't haven't hasn't let's that's there's what's " +
  "gonna wanna gotta 'cause cause cuz till 'til like get got go one two oh yeah").split(/\s+/));

export function isHangulLine(s) {
  const h = (String(s).match(HANGUL_RE) || []).length;
  const l = (String(s).match(LATIN_RE) || []).length;
  return h > 0 && h >= l * 0.5;
}

export function isLabelLine(s) {
  const t = String(s).trim();
  if (!t) return false;
  if (LABEL_RE.test(t)) return true;
  if (BRACKET_ONLY_RE.test(t) && !isHangulLine(t.replace(/[\[\]【】]/g, "").replace(/(후렴|간주|절|반복)/g, ""))) return true;
  return false;
}

function cleanLine(s) {
  return String(s || "")
    .replace(/\u00a0/g, " ")
    .replace(/[“”]/g, '"')
    .replace(/[‘’`´]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * 붙여넣은 텍스트 → 줄 목록
 * [{type:'label'|'lyric'|'break', en, ko}]
 */
export function parseLyrics(text) {
  const rawLines = String(text || "").replace(/\r/g, "").split("\n");
  const out = [];
  let lastLyric = null;
  rawLines.forEach((raw) => {
    const line = cleanLine(raw);
    if (!line) {
      if (out.length && out[out.length - 1].type !== "break") out.push({ type: "break", en: "", ko: "" });
      lastLyric = null;
      return;
    }
    if (isLabelLine(line)) {
      const inner = line.replace(/^[\[(（【]\s*|\s*[\])）】]\s*:?$/g, "").replace(/:$/, "").trim();
      out.push({ type: "label", en: "[" + inner + "]", ko: "" });
      lastLyric = null;
      return;
    }
    if (isHangulLine(line)) {
      if (lastLyric && !lastLyric.ko) {
        lastLyric.ko = line;
      } else if (lastLyric && lastLyric.ko) {
        lastLyric.ko += " " + line;
      } else {
        out.push({ type: "lyric", en: "", ko: line }); // 영어 줄 없는 한국어(예: 한글 가사)
      }
      return;
    }
    const item = { type: "lyric", en: line, ko: "" };
    out.push(item);
    lastLyric = item;
  });
  while (out.length && out[out.length - 1].type === "break") out.pop();
  while (out.length && out[0].type === "break") out.shift();
  return out;
}

function stanzaKey(lines) {
  return lines.filter((l) => l.type === "lyric").map((l) => l.en.toLowerCase().replace(/[^a-z]/g, "")).join("|");
}

/**
 * 반복되는 연(후렴 등)을 "[Chorus] 반복" 한 줄로 바꿉니다. 원본은 바꾸지 않습니다.
 */
export function collapseRepeats(lines) {
  // 연 단위로 나누기: label 또는 break 기준
  const stanzas = [];
  let cur = { label: null, lines: [] };
  const push = () => { if (cur.label || cur.lines.length) stanzas.push(cur); };
  lines.forEach((l) => {
    if (l.type === "label") { push(); cur = { label: l, lines: [] }; }
    else if (l.type === "break") { push(); cur = { label: null, lines: [] }; }
    else cur.lines.push(l);
  });
  push();

  const seen = new Map();
  const result = [];
  stanzas.forEach((st, idx) => {
    const key = stanzaKey(st.lines);
    const lyricCount = st.lines.filter((l) => l.type === "lyric" && l.en).length;
    if (key && lyricCount >= 2 && seen.has(key)) {
      const first = seen.get(key);
      const lab = (st.label && st.label.en) || (first.label && first.label.en) || "";
      const name = lab ? (lab.startsWith("[") ? lab : "[" + lab + "]") + " 반복" : "(앞 구절 반복)";
      if (idx > 0) result.push({ type: "break", en: "", ko: "" });
      result.push({ type: "repeat", en: name, ko: "" });
      return;
    }
    if (key && lyricCount >= 2) seen.set(key, st);
    if (idx > 0) result.push({ type: "break", en: "", ko: "" });
    if (st.label) result.push(st.label);
    st.lines.forEach((l) => result.push(l));
  });
  return result;
}

/** 줄 안의 단어 위치 목록 */
export function tokenize(text) {
  const out = [];
  const re = /[A-Za-z][A-Za-z']*[A-Za-z]|[A-Za-z]/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    out.push({ word: m[0], start: m.index, end: m.index + m[0].length });
  }
  return out;
}

export function findWordInLine(text, word, avoid = []) {
  const target = String(word || "").trim();
  if (!target) return null;
  const esc = target.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/'/g, "['’]").replace(/\s+/g, "\\s+");
  const re = new RegExp("(^|[^A-Za-z'])(" + esc + ")(?![A-Za-z])", "gi");
  let m;
  while ((m = re.exec(text)) !== null) {
    const start = m.index + m[1].length;
    const end = start + m[2].length;
    const overlap = avoid.some((a) => start < a.end && end > a.start);
    if (!overlap) return { start, end, text: text.slice(start, end) };
  }
  return null;
}

function wordScore(w, grammarRanges, tok) {
  const lower = w.toLowerCase();
  let s = 0;
  s += Math.min(lower.length, 9);
  if (/ing$|ed$|ly$|er$|est$|tion$|ness$|ful$/.test(lower)) s += 1;
  if (grammarRanges.some((r) => tok.start >= r.start && tok.end <= r.end)) s += 3;
  return s;
}

/**
 * 빈칸 자동 선택
 * @param lines 표시용 줄 목록 (collapse 이후)
 * @param count 빈칸 수
 * @param opts { grammarRangesFor(lineIdx) => ranges, focus:'vocab'|'mixed'|'grammar', existing: [] }
 */
export function autoBlanks(lines, count, opts = {}) {
  const existing = (opts.existing || []).slice();
  const used = new Set(existing.map((b) => String(b.answer).toLowerCase()));
  const focus = opts.focus || "mixed";
  const lyricIdx = lines.map((l, i) => (l.type === "lyric" && l.en ? i : -1)).filter((i) => i >= 0);
  if (!lyricIdx.length) return existing;

  const candidatesPerLine = lyricIdx.map((i) => {
    const text = lines[i].en;
    const g = opts.grammarRangesFor ? opts.grammarRangesFor(i) : [];
    const toks = tokenize(text).filter((t) => {
      const lw = t.word.toLowerCase();
      if (lw.length < 3) return false;
      if (STOPWORDS.has(lw) || INTERJECTIONS.has(lw)) return false;
      if (/'/.test(t.word) && !/n't$/.test(lw)) return false; // shinin' 같은 축약형 제외
      if (/^[A-Z]/.test(t.word) && t.start > 0 && !/^(Christmas|Santa|God)$/.test(t.word)) return false; // 문장 중간 고유명사 제외
      return true;
    }).map((t) => {
      let s = wordScore(t.word, g, t);
      if (focus === "grammar") s += g.some((r) => t.start >= r.start && t.end <= r.end) ? 6 : -2;
      if (focus === "vocab") s -= g.some((r) => t.start >= r.start && t.end <= r.end) ? 1 : 0;
      return { ...t, line: i, score: s };
    }).sort((a, b) => b.score - a.score);
    return { line: i, toks };
  });

  const need = count - existing.length;
  if (need <= 0) return existing;

  // 고르게 분포: 일정 간격으로 줄을 고름
  const pool = candidatesPerLine.filter((c) => c.toks.length);
  const picks = [];
  const tryPick = (c) => {
    const taken = existing.concat(picks).filter((b) => b.line === c.line);
    for (const t of c.toks) {
      const lw = t.word.toLowerCase();
      if (used.has(lw)) continue;
      if (taken.some((b) => t.start < b.end && t.end > b.start)) continue;
      used.add(lw);
      picks.push({ line: c.line, start: t.start, end: t.end, answer: t.word, type: "vocab" });
      return true;
    }
    return false;
  };
  if (pool.length) {
    const step = pool.length / Math.min(need, pool.length);
    for (let k = 0; k < Math.min(need, pool.length); k++) {
      const c = pool[Math.floor(k * step)];
      if (!tryPick(c)) {
        // 가까운 다음 줄 시도
        for (let d = 1; d < pool.length; d++) {
          const alt = pool[(Math.floor(k * step) + d) % pool.length];
          if (!existing.concat(picks).some((b) => b.line === alt.line) && tryPick(alt)) break;
        }
      }
    }
    // 아직 부족하면 한 줄에 두 개까지
    let rounds = 0;
    while (picks.length < need && rounds++ < 3) {
      let added = false;
      for (const c of pool) {
        if (picks.length >= need) break;
        const n = existing.concat(picks).filter((b) => b.line === c.line).length;
        if (n >= 2) continue;
        if (tryPick(c)) added = true;
      }
      if (!added) break;
    }
  }
  return existing.concat(picks);
}

/** 빈칸 번호를 등장 순서대로 다시 매깁니다. */
export function renumber(blanks) {
  blanks.sort((a, b) => a.line - b.line || a.start - b.start);
  blanks.forEach((b, i) => { b.num = i + 1; });
  return blanks;
}

/**
 * 한 줄을 조각으로 나눕니다: [{text, kind:'text'|'blank'|'hl', blank}]
 */
export function segmentLine(text, blanks, highlights) {
  const marks = [];
  (blanks || []).forEach((b) => marks.push({ start: b.start, end: b.end, kind: "blank", blank: b }));
  (highlights || []).forEach((h) => marks.push({ start: h.start, end: h.end, kind: "hl" }));
  // 하이라이트를 빈칸과 겹치지 않게 자르기
  const blankMarks = marks.filter((m) => m.kind === "blank").sort((a, b) => a.start - b.start);
  let hlMarks = [];
  marks.filter((m) => m.kind === "hl").forEach((h) => {
    let pieces = [{ start: h.start, end: h.end }];
    blankMarks.forEach((b) => {
      pieces = pieces.flatMap((p) => {
        if (b.end <= p.start || b.start >= p.end) return [p];
        const res = [];
        if (b.start > p.start) res.push({ start: p.start, end: b.start });
        if (b.end < p.end) res.push({ start: b.end, end: p.end });
        return res;
      });
    });
    hlMarks = hlMarks.concat(pieces.filter((p) => p.end > p.start).map((p) => ({ ...p, kind: "hl" })));
  });
  // 하이라이트끼리 합치기
  hlMarks.sort((a, b) => a.start - b.start);
  const merged = [];
  hlMarks.forEach((h) => {
    const last = merged[merged.length - 1];
    if (last && h.start <= last.end) last.end = Math.max(last.end, h.end);
    else merged.push({ ...h });
  });
  const all = blankMarks.concat(merged).sort((a, b) => a.start - b.start);
  const segs = [];
  let pos = 0;
  all.forEach((m) => {
    if (m.start < pos) return;
    if (m.start > pos) segs.push({ text: text.slice(pos, m.start), kind: "text" });
    segs.push({ text: text.slice(m.start, m.end), kind: m.kind, blank: m.blank });
    pos = m.end;
  });
  if (pos < text.length) segs.push({ text: text.slice(pos), kind: "text" });
  return segs;
}

export function blankUnderscore(answer) {
  const n = Math.max(8, Math.min(16, String(answer || "").length + 5));
  return "_".repeat(n);
}
