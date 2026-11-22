/**
 * 활동지 모델과 화면 렌더링
 *  1쪽: 곡 정보 + 가사(빈칸·해석)
 *  2쪽: Part 1 Vocabulary Check + Part 2 단어 활동
 *  3쪽~: Answer Key (빈칸 정답, Part 1·2 정답)
 */
import { parseLyrics, collapseRepeats, autoBlanks, renumber, segmentLine } from "./lyrics.js";
import { findGrammarRanges, categoryOf } from "./data/grammar-catalog.js";
import { buildGame, GAME_TYPES } from "./games.js";

export const DEFAULT_OPTIONS = {
  blankCount: 20,
  focus: "mixed",
  translation: true,
  collapse: true,
  highlight: true,
  vocabMode: "mixed",
  game: "wordsearch",
  fontSize: 10,
};

let blankIdSeq = 1;

/** 저장된 작업을 불러온 뒤 빈칸 id가 겹치지 않게 맞춥니다. */
export function syncBlankIds(ws) {
  const max = Math.max(0, ...(ws.blanks || []).map((b) => Number(b.id) || 0));
  blankIdSeq = Math.max(blankIdSeq, max + 1);
}

export function esc(s) {
  return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/** 표시용 줄 다시 계산(반복 접기 옵션 반영) */
export function computeLines(ws) {
  const base = ws.baseLines.map((l, i) => ({ ...l, base: i }));
  return ws.options.collapse ? collapseRepeats(base) : base;
}

export function createWorksheet({ song, grammar, grade, lyricsText, options }) {
  const ws = {
    version: 2,
    createdAt: Date.now(),
    song: { ...song },
    grammar,
    grade: grade || grammar.grade,
    lyricsText,
    baseLines: parseLyrics(lyricsText),
    blanks: [],
    grammarHL: [],
    info: defaultInfo(song),
    grammarTip: defaultTip(grammar),
    options: { ...DEFAULT_OPTIONS, ...(options || {}) },
    gameSeed: Math.floor(Math.random() * 1e9),
    warnings: [],
  };
  ws.lines = computeLines(ws);
  return ws;
}

function defaultInfo(song) {
  const f = [{ label: "가수", value: song.artist || "" }];
  if (song.year) f.push({ label: "발매", value: String(song.year) + "년" });
  if (song.album) f.push({ label: "앨범", value: song.album });
  return f;
}

function defaultTip(g) {
  if (!g || g.custom) return "";
  return `${g.form}` + (g.example ? ` — 예) ${g.example}` : "");
}

/** 줄 인덱스(base 기준)로 빈칸을 관리하기 위해, 표시 줄 ↔ base 줄 매핑 */
export function lineByBase(ws, baseIdx) {
  return ws.lines.find((l) => l.base === baseIdx);
}

export function addBlank(ws, b) {
  ws.blanks.push({ id: blankIdSeq++, head: b.answer, pos: "", meaning: "", type: "vocab", ...b });
  renumber(ws.blanks);
}

export function removeBlank(ws, id) {
  ws.blanks = ws.blanks.filter((b) => b.id !== id);
  renumber(ws.blanks);
}

/** 빈칸 목록을 표시 줄 기준으로 채웁니다. baseBlanks: [{line(base idx), ...}] */
export function setBlanks(ws, baseBlanks) {
  ws.blanks = baseBlanks.map((b) => ({ id: blankIdSeq++, head: b.head || b.answer, pos: b.pos || "", meaning: b.meaning || "", type: b.type || "vocab", ...b }));
  renumber(ws.blanks);
}

/** 화면에 보이는 줄(반복 접기 후)에 속한 빈칸만 유효 */
export function visibleBlanks(ws) {
  const visibleBase = new Set(ws.lines.filter((l) => l.type === "lyric").map((l) => l.base));
  const list = ws.blanks.filter((b) => visibleBase.has(b.line));
  renumber(list);
  return list;
}

export function fillAutoBlanks(ws) {
  const g = ws.grammar;
  const displayLines = ws.lines;
  const existing = visibleBlanks(ws).map((b) => {
    const di = displayLines.findIndex((l) => l.base === b.line);
    return { ...b, line: di };
  });
  const filled = autoBlanks(displayLines, ws.options.blankCount, {
    focus: ws.options.focus,
    existing,
    grammarRangesFor: (i) => findGrammarRanges(g, displayLines[i].en),
  });
  const added = filled.slice(existing.length).map((b) => ({ ...b, line: displayLines[b.line].base }));
  added.forEach((b) => ws.blanks.push({ id: blankIdSeq++, head: b.answer, pos: "", meaning: "", ...b }));
  renumber(ws.blanks);
  return added.length;
}

export function vocabList(ws) {
  return visibleBlanks(ws).map((b) => ({ num: b.num, answer: b.answer, head: b.head || b.answer, pos: b.pos || "", meaning: b.meaning || "", id: b.id }));
}

function highlightsFor(ws, line) {
  if (!ws.options.highlight || line.type !== "lyric" || !line.en) return [];
  const ai = (ws.grammarHL || []).filter((h) => h.line === line.base).map((h) => ({ start: h.start, end: h.end }));
  if (ai.length) return ai;
  return findGrammarRanges(ws.grammar, line.en);
}

export function secretPhrases(ws) {
  const out = [];
  const lines = ws.lines.filter((l) => l.type === "lyric" && l.en);
  const pick = (l, start, end) => {
    const words = l.en.slice(start, end).replace(/[^A-Za-z' ]/g, " ").split(/\s+/).filter(Boolean).slice(0, 4);
    if (words.length >= 2) out.push({ text: words.join(" "), ko: "" });
  };
  lines.forEach((l) => {
    if (out.length >= 2) return;
    const hl = highlightsFor(ws, l)[0];
    if (hl) pick(l, hl.start, Math.min(l.en.length, hl.end + 12));
  });
  for (let i = Math.floor(lines.length / 3); i < lines.length && out.length < 2; i += 3) pick(lines[i], 0, lines[i].en.length);
  return out.slice(0, 2);
}

export function gameData(ws) {
  return buildGame(ws.options.game, vocabList(ws), { seed: ws.gameSeed, phrases: secretPhrases(ws), hard: /고등/.test(ws.grade || "") });
}

/** Part 1 표에서 각 항목을 '단어 제시' 또는 '뜻 제시'로 */
export function vocabCheckRows(ws) {
  const v = vocabList(ws);
  return v.map((it, i) => {
    let show = "word";
    if (ws.options.vocabMode === "meaning") show = it.meaning ? "meaning" : "word";
    else if (ws.options.vocabMode === "mixed") show = (i % 3 === 1 && it.meaning) ? "meaning" : "word";
    return { ...it, show };
  });
}

/** n개를 3묶음(세로 순서)으로 나눈 표 행 */
export function threeColumnRows(items) {
  const rows = Math.max(1, Math.ceil(items.length / 3));
  const out = [];
  for (let r = 0; r < rows; r++) out.push([items[r], items[r + rows], items[r + rows * 2]]);
  return out;
}

/* ===================== 인쇄용 페이지 ===================== */

function renderLineHTML(ws, line, mode, blanksByBase) {
  if (line.type === "break") return '<div class="l-break"></div>';
  if (line.type === "label") return `<div class="l-label">${esc(line.en)}</div>`;
  if (line.type === "repeat") return `<div class="l-repeat">${esc(line.en)}</div>`;
  const blanks = blanksByBase.get(line.base) || [];
  let en = "";
  if (line.en) {
    const segs = segmentLine(line.en, blanks, highlightsFor(ws, line));
    en = segs.map((s) => {
      if (s.kind === "blank") {
        const b = s.blank;
        const w = Math.max(4.5, Math.min(9, b.answer.length * 0.55 + 2.2));
        if (mode === "answer") return `<span class="blank ans"><span class="bn">${b.num})</span><span class="bw">${esc(b.answer)}</span></span>`;
        if (mode === "edit") return `<span class="blank edit" data-blank="${b.id}" title="클릭하면 빈칸 해제"><span class="bn">${b.num})</span><span class="bu" style="width:${w}em">${esc(b.answer)}</span></span>`;
        return `<span class="blank"><span class="bn">${b.num})</span><span class="bu" style="width:${w}em"></span></span>`;
      }
      const cls = s.kind === "hl" ? ' class="hl"' : "";
      if (mode === "edit") {
        return `<span${cls}>${tokensHTML(line, s.text, segStart(segs, s))}</span>`;
      }
      return `<span${cls}>${esc(s.text)}</span>`;
    }).join("");
  }
  const ko = ws.options.translation && line.ko ? `<div class="ko">${esc(line.ko)}</div>` : "";
  return `<div class="l"><div class="en">${en}</div>${ko}</div>`;
}

function segStart(segs, seg) {
  let pos = 0;
  for (const s of segs) { if (s === seg) return pos; pos += s.text.length; }
  return 0;
}

function tokensHTML(line, text, offset) {
  return text.replace(/[A-Za-z][A-Za-z']*[A-Za-z]|[A-Za-z]|[^A-Za-z]+/g, (m, idx) => {
    if (!/^[A-Za-z]/.test(m)) return esc(m);
    const start = offset + idx;
    return `<span class="tok" data-line="${line.base}" data-start="${start}" data-end="${start + m.length}">${esc(m)}</span>`;
  });
}

function blanksMap(ws) {
  const map = new Map();
  visibleBlanks(ws).forEach((b) => { if (!map.has(b.line)) map.set(b.line, []); map.get(b.line).push(b); });
  return map;
}

function headerHTML(ws) {
  return `<table class="ws-head"><tbody>
    <tr><td class="lets" rowspan="2">Let's<br>Sing</td><td class="ttl">${esc(ws.song.title)}</td><td class="lbl">학번</td><td class="fill"></td></tr>
    <tr><td class="art">${esc(ws.song.artist)}</td><td class="lbl">이름</td><td class="fill"></td></tr>
  </tbody></table>`;
}

function infoHTML(ws, qrDataUrl) {
  const rows = (ws.info || []).filter((f) => f.value).map((f) => `<div class="if-row"><span class="if-l">${esc(f.label)}</span><span class="if-v">${esc(f.value)}</span></div>`).join("");
  const qr = qrDataUrl ? `<div class="qr"><img src="${qrDataUrl}" alt="영상 QR 코드"><span>영상 QR</span></div>` : "";
  const g = ws.grammar;
  const focus = `<div class="ws-focus"><span class="fx">오늘의 표현</span> <b>${esc(g.label)}</b>${g.form ? ` <span class="ff">(${esc(g.form)})</span>` : ""}${ws.grammarTip ? `<div class="tip">${esc(ws.grammarTip)}</div>` : ""}</div>`;
  return `<div class="ws-info">${qr}<div class="if-body">${rows}${focus}</div></div>`;
}

export function renderPage1(ws, { mode = "print", qr } = {}) {
  const map = blanksMap(ws);
  const lines = ws.lines.map((l) => renderLineHTML(ws, l, mode, map)).join("");
  return `<section class="ws-page p1" style="--ws-font:${ws.options.fontSize}pt">
    ${headerHTML(ws)}
    ${infoHTML(ws, qr)}
    <div class="ws-lyrics">${lines}</div>
  </section>`;
}

function vocabTableHTML(ws, answer) {
  const rows = threeColumnRows(vocabCheckRows(ws));
  const cell = (it) => {
    if (!it) return '<td class="n"></td><td class="w"></td><td class="m"></td>';
    const w = (answer || it.show === "word") ? esc(it.head) : "";
    const m = (answer || it.show === "meaning") ? esc(it.meaning) : "";
    const pos = it.pos ? `<span class="pos">${esc(it.pos)}</span> ` : "";
    const wCls = answer && it.show === "meaning" ? "w a" : "w";
    const mCls = answer && it.show === "word" ? "m a" : "m";
    return `<td class="n">${it.num}</td><td class="${wCls}">${pos}${w}</td><td class="${mCls}">${m}</td>`;
  };
  return `<table class="ws-vocab"><thead><tr>${'<th class="n"></th><th>단어</th><th>뜻</th>'.repeat(3)}</tr></thead><tbody>
    ${rows.map((r) => `<tr>${r.map(cell).join("")}</tr>`).join("")}
  </tbody></table>`;
}

function gameHTML(ws, game, answer) {
  if (game.type === "wordsearch") {
    const ans = new Set(game.answerCells);
    const grid = game.grid.map((row, r) => `<tr>${row.map((ch, c) => `<td class="${answer && ans.has(r + "," + c) ? "on" : ""}">${ch}</td>`).join("")}</tr>`).join("");
    const words = game.words.map((w) => `<span class="chip">${esc(w.display)}</span>`).join("");
    return `<div class="g-ws"><table class="ws-grid" style="--n:${game.size}"><tbody>${grid}</tbody></table><div class="g-words"><b>찾을 단어 (${game.words.length})</b><div>${words}</div></div></div>`;
  }
  if (game.type === "secret") {
    const key = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
    const keyTable = `<table class="ws-key"><tbody>
      <tr>${key.slice(0, 13).map((k) => `<th>${k}</th>`).join("")}</tr><tr>${key.slice(0, 13).map((k, i) => `<td>${i + 1}</td>`).join("")}</tr>
      <tr>${key.slice(13).map((k) => `<th>${k}</th>`).join("")}</tr><tr>${key.slice(13).map((k, i) => `<td>${i + 14}</td>`).join("")}</tr>
    </tbody></table>`;
    const easy = game.easy.map((e, i) => `<div class="code-item"><span class="ci-n">${i + 1}.</span> <span class="ci-m">${esc(e.meaning || "")}</span> <span class="ci-c">${e.code.join("-")}</span> ➡ <span class="ci-a">${answer ? esc(e.word) : e.word.split("").map(() => "_").join(" ")}</span></div>`).join("");
    const hard = game.hard.map((h, i) => `<div class="code-item hard"><span class="ci-n">${i + 1}.</span> ${h.words.map((w) => `<span class="ci-c">( ${w.code.join("-")} )</span>`).join(" ")}<div class="ci-a">➡ ${answer ? esc(h.phrase.toUpperCase()) : h.words.map((w) => w.word.split("").map(() => "_").join(" ")).join("&nbsp;&nbsp;&nbsp;")}</div></div>`).join("");
    return `<div class="g-secret"><div class="sub">[ Secret Code Key ]</div>${keyTable}<div class="sub">[ EASY ]</div>${easy}${hard ? `<div class="sub">[ HARD ] 가사 속 구절</div>${hard}` : ""}</div>`;
  }
  if (game.type === "missing") {
    return `<table class="ws-list"><thead><tr><th>No.</th><th>단어</th><th>뜻</th><th>빠진 철자</th></tr></thead><tbody>${game.items.map((it, i) => `<tr><td>${i + 1}</td><td class="mono">${answer ? esc(it.word) : esc(it.shown)}</td><td>${esc(it.meaning || "")}</td><td class="c">${answer ? it.missing : "[&nbsp;&nbsp;&nbsp;]"}</td></tr>`).join("")}</tbody></table>`;
  }
  return `<table class="ws-list"><thead><tr><th>No.</th><th>섞인 철자</th><th>뜻</th><th>정답</th></tr></thead><tbody>${game.items.map((it, i) => `<tr><td>${i + 1}</td><td class="mono">${esc(it.shuffled)}</td><td>${esc(it.meaning || "")}</td><td>${answer ? esc(it.word) : ""}</td></tr>`).join("")}</tbody></table>`;
}

export function renderPage2(ws) {
  const game = gameData(ws);
  const gt = GAME_TYPES[ws.options.game];
  const guide = ws.options.vocabMode === "word" ? "단어의 뜻을 빈칸에 적어 보세요." : ws.options.vocabMode === "meaning" ? "뜻을 보고 알맞은 단어를 적어 보세요." : "빈칸에 알맞은 단어 또는 뜻을 적어 보세요.";
  return `<section class="ws-page p2" style="--ws-font:${ws.options.fontSize}pt">
    <div class="ws-mini-head"><span>${esc(ws.song.title)} · ${esc(ws.song.artist)}</span><span>(&nbsp;&nbsp;&nbsp;&nbsp;)학년 (&nbsp;&nbsp;&nbsp;&nbsp;)반 이름 (&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;)</span></div>
    <h3 class="part">Part 1. Vocabulary Check</h3>
    <p class="guide">${guide} (번호는 가사 빈칸 번호와 같습니다.)</p>
    ${vocabTableHTML(ws, false)}
    <h3 class="part">Part 2. ${esc(gt.name)}</h3>
    <p class="guide">${esc(gt.guide)}</p>
    ${gameHTML(ws, game, false)}
  </section>`;
}

export function renderAnswerPages(ws) {
  const v = vocabList(ws);
  const game = gameData(ws);
  const map = blanksMap(ws);
  const lyricAns = `<table class="ws-ans"><tbody>${threeColumnRows(v).map((r) => `<tr>${r.map((it) => it ? `<td class="n">${it.num})</td><td>${esc(it.answer)}</td>` : '<td class="n"></td><td></td>').join("")}</tr>`).join("")}</tbody></table>`;
  return `<section class="ws-page p3" style="--ws-font:${ws.options.fontSize}pt">
    <div class="ws-mini-head"><span>[Answer Key] ${esc(ws.song.title)} · ${esc(ws.song.artist)}</span><span>교사용</span></div>
    <h3 class="part">가사 빈칸 정답</h3>
    ${lyricAns}
    <h3 class="part">Part 1. Vocabulary Check 정답</h3>
    ${vocabTableHTML(ws, true)}
    <h3 class="part">Part 2. ${esc(GAME_TYPES[ws.options.game].name)} 정답</h3>
    ${gameHTML(ws, game, true)}
  </section>
  <section class="ws-page p4" style="--ws-font:${ws.options.fontSize}pt">
    <div class="ws-mini-head"><span>[Answer Key] 정답이 표시된 가사</span><span>교사용</span></div>
    <div class="ws-lyrics">${ws.lines.map((l) => renderLineHTML(ws, l, "answer", map)).join("")}</div>
  </section>`;
}

export function renderAllPages(ws, qr) {
  return renderPage1(ws, { qr }) + renderPage2(ws) + renderAnswerPages(ws);
}

/* ===================== 온라인 정답 확인 ===================== */

export function renderOnline(ws) {
  const map = blanksMap(ws);
  const lines = ws.lines.map((line) => {
    if (line.type === "break") return '<div class="ol-break"></div>';
    if (line.type === "label") return `<div class="ol-label">${esc(line.en)}</div>`;
    if (line.type === "repeat") return `<div class="ol-repeat">${esc(line.en)}</div>`;
    const blanks = map.get(line.base) || [];
    const segs = segmentLine(line.en || "", blanks, highlightsFor(ws, line));
    const en = segs.map((s) => {
      if (s.kind === "blank") {
        const b = s.blank;
        const size = Math.max(4, Math.min(16, b.answer.length + 1));
        return `<label class="ol-blank"><span class="bn">${b.num}</span><input type="text" inputmode="latin" autocomplete="off" autocapitalize="off" spellcheck="false" data-num="${b.num}" data-answer="${esc(b.answer)}" style="width:${size + 1.5}ch" aria-label="${b.num}번 빈칸"></label>`;
      }
      return s.kind === "hl" ? `<span class="hl">${esc(s.text)}</span>` : esc(s.text);
    }).join("");
    const ko = ws.options.translation && line.ko ? `<div class="ol-ko">${esc(line.ko)}</div>` : "";
    return `<div class="ol-line"><div class="ol-en">${en}</div>${ko}</div>`;
  }).join("");

  const rows = vocabCheckRows(ws).map((it) => {
    const askWord = it.show === "meaning";
    const prompt = askWord ? `<span class="vq-m">${esc(it.meaning)}</span>` : `<span class="vq-w">${esc(it.head)}</span>${it.pos ? ` <span class="pos">${esc(it.pos)}</span>` : ""}`;
    const answer = askWord ? it.head : it.meaning;
    return `<div class="vq"><span class="vq-n">${it.num}</span><div class="vq-p">${prompt}</div><input type="text" autocomplete="off" spellcheck="false" data-kind="${askWord ? "word" : "meaning"}" data-answer="${esc(answer || "")}" placeholder="${askWord ? "단어" : "뜻"}"><span class="vq-r" aria-live="polite"></span></div>`;
  }).join("");

  return `<div class="online">
    <div class="ol-toolbar">
      <button type="button" class="btn primary" data-ol="check">채점하기</button>
      <button type="button" class="btn" data-ol="reveal">정답 보기</button>
      <button type="button" class="btn ghost" data-ol="reset">다시 풀기</button>
      <span class="ol-score" aria-live="polite"></span>
    </div>
    <h3 class="ol-h">가사 빈칸</h3>
    <div class="ol-lyrics">${lines}</div>
    <h3 class="ol-h">Part 1. Vocabulary Check</h3>
    <p class="muted small">뜻 문항은 자동 채점이 어려워 정답과 비교해 직접 확인하도록 표시합니다.</p>
    <div class="ol-vocab">${rows}</div>
  </div>`;
}

function normAns(s) {
  return String(s || "").toLowerCase().replace(/[’‘`]/g, "'").replace(/[^a-z가-힣']/g, "");
}

export function gradeOnline(root) {
  let correct = 0, total = 0;
  root.querySelectorAll(".ol-blank input").forEach((inp) => {
    total++;
    const ok = normAns(inp.value) === normAns(inp.dataset.answer);
    inp.classList.toggle("ok", ok);
    inp.classList.toggle("ng", !ok);
    if (ok) correct++;
  });
  let vOk = 0, vTotal = 0, vCheck = 0;
  root.querySelectorAll(".ol-vocab input").forEach((inp) => {
    const r = inp.parentElement.querySelector(".vq-r");
    const ans = inp.dataset.answer || "";
    if (!ans) { r.textContent = ""; return; }
    vTotal++;
    if (!inp.value.trim()) {
      inp.classList.remove("ok", "check"); inp.classList.add("ng");
      r.textContent = "정답: " + ans;
      return;
    }
    if (inp.dataset.kind === "word") {
      const ok = normAns(inp.value) === normAns(ans);
      inp.classList.toggle("ok", ok); inp.classList.toggle("ng", !ok);
      r.textContent = ok ? "정답" : "정답: " + ans;
      if (ok) vOk++;
    } else {
      const v = normAns(inp.value);
      const parts = ans.split(/[,，/]/).map((p) => normAns(p.replace(/\(.*?\)/g, ""))).filter(Boolean);
      const ok = !!v && parts.some((p) => p === v || (v.length >= 2 && (p.includes(v) || v.includes(p))));
      inp.classList.toggle("ok", ok); inp.classList.toggle("ng", false); inp.classList.toggle("check", !ok);
      r.textContent = ok ? "정답" : "확인: " + ans;
      if (ok) vOk++; else vCheck++;
    }
  });
  return { correct, total, vOk, vTotal, vCheck };
}

export function revealOnline(root) {
  root.querySelectorAll(".ol-blank input, .ol-vocab input").forEach((inp) => {
    inp.value = inp.dataset.answer || "";
    inp.classList.remove("ng", "check");
    inp.classList.add("revealed");
  });
}

export function resetOnline(root) {
  root.querySelectorAll(".ol-blank input, .ol-vocab input").forEach((inp) => {
    inp.value = "";
    inp.classList.remove("ok", "ng", "check", "revealed");
  });
  root.querySelectorAll(".vq-r").forEach((r) => { r.textContent = ""; });
}

export function grammarSummary(ws) {
  const g = ws.grammar;
  if (g.custom) return g.label;
  const c = categoryOf(g);
  return `${c.no}. ${c.ko} · ${g.label}`;
}
