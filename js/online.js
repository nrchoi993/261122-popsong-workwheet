/**
 * 온라인 정답 확인 (수업 화면용)
 *  - 가사 빈칸, Part 1 Vocabulary Check, Part 2 단어 활동(단어 찾기/비밀 암호/사라진 철자/철자 섞기) 모두 채점
 *  - 모드: '직접 풀기'(입력 후 채점) / '눌러서 정답 보기'(칸을 누르면 그 칸의 정답이 나타남)
 *  - 글자 크기 조절
 */
import { segmentLine } from "./lyrics.js";
import { findGrammarRanges } from "./data/grammar-catalog.js";
import { GAME_TYPES } from "./games.js";
import { visibleBlanks, vocabCheckRows, gameData, esc } from "./worksheet.js";

function highlightsFor(ws, line) {
  if (!ws.options.highlight || line.type !== "lyric" || !line.en) return [];
  const ai = (ws.grammarHL || []).filter((h) => h.line === line.base);
  return ai.length ? ai : findGrammarRanges(ws.grammar, line.en);
}

const inputAttrs = (answer, label, extra = "") =>
  `type="text" autocomplete="off" autocapitalize="off" spellcheck="false" data-answer="${esc(answer || "")}" aria-label="${esc(label)}" ${extra}`;

function lyricsHTML(ws) {
  const map = new Map();
  visibleBlanks(ws).forEach((b) => { if (!map.has(b.line)) map.set(b.line, []); map.get(b.line).push(b); });
  return ws.lines.map((line) => {
    if (line.type === "break") return '<div class="ol-break"></div>';
    if (line.type === "label") return `<div class="ol-label">${esc(line.en)}</div>`;
    if (line.type === "repeat") return `<div class="ol-repeat">${esc(line.en)}</div>`;
    const segs = segmentLine(line.en || "", map.get(line.base) || [], highlightsFor(ws, line));
    const en = segs.map((s) => {
      if (s.kind === "blank") {
        const b = s.blank;
        const size = Math.max(5, Math.min(18, b.answer.length + 2));
        return `<span class="ol-blank"><button type="button" class="bn" data-peek title="${b.num}번 정답 보기">${b.num}</button><input ${inputAttrs(b.answer, b.num + "번 빈칸", `data-sec="lyrics" style="width:${size + 1}ch"`)}></span>`;
      }
      return s.kind === "hl" ? `<span class="hl">${esc(s.text)}</span>` : esc(s.text);
    }).join("");
    const ko = ws.options.translation && line.ko ? `<div class="ol-ko">${esc(line.ko)}</div>` : "";
    return `<div class="ol-line"><div class="ol-en">${en}</div>${ko}</div>`;
  }).join("");
}

function vocabHTML(ws) {
  return vocabCheckRows(ws).map((it) => {
    const askWord = it.show === "meaning";
    const prompt = askWord ? `<span class="vq-m">${esc(it.meaning)}</span>` : `<span class="vq-w">${esc(it.head)}</span>${it.pos ? ` <span class="pos">${esc(it.pos)}</span>` : ""}`;
    const answer = askWord ? it.head : it.meaning;
    return `<div class="vq"><button type="button" class="vq-n" data-peek title="${it.num}번 정답 보기">${it.num}</button><div class="vq-p">${prompt}</div><input ${inputAttrs(answer, it.num + "번 " + (askWord ? "단어" : "뜻"), `data-sec="vocab" data-kind="${askWord ? "word" : "meaning"}" placeholder="${askWord ? "단어" : "뜻"}"`)}><span class="vq-r" aria-live="polite"></span></div>`;
  }).join("");
}

function part2HTML(ws, game) {
  if (game.type === "wordsearch") {
    const grid = game.grid.map((row, r) => `<div class="wsr">${row.map((ch, c) => `<button type="button" class="wsc" data-r="${r}" data-c="${c}">${ch}</button>`).join("")}</div>`).join("");
    const chips = game.words.map((w) => `<button type="button" class="wchip" data-word="${esc(w.word)}" title="눌러서 위치 보기(정답 보기 모드)"><small>${w.num}</small> ${esc(w.display)}</button>`).join("");
    return `<p class="muted small">첫 글자를 누른 뒤 마지막 글자를 누르면 단어가 표시됩니다. (가로·세로·대각선)</p>
      <div class="ol-ws"><div class="ws-board" style="--n:${game.size}">${grid}</div><div class="ws-chips">${chips}</div></div>`;
  }
  if (game.type === "secret") {
    const easy = game.easy.map((e) => `<div class="p2q"><button type="button" class="vq-n" data-peek>${e.num}</button><div class="p2p"><span class="code">${e.code.join("-")}</span>${e.meaning ? ` <span class="muted">(${esc(e.meaning)})</span>` : ""}</div><input ${inputAttrs(e.word, e.num + "번 암호", 'data-sec="p2" data-kind="word" placeholder="단어"')}><span class="vq-r"></span></div>`).join("");
    const hard = game.hard.map((h, i) => `<div class="p2q wide"><button type="button" class="vq-n" data-peek>도전${i + 1}</button><div class="p2p"><span class="code">${h.words.map((w) => "(" + w.code.join("-") + ")").join(" ")}</span></div><input ${inputAttrs(h.phrase, "도전 " + (i + 1), 'data-sec="p2" data-kind="word" placeholder="구절"')}><span class="vq-r"></span></div>`).join("");
    return `<div class="p2-key">${"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((k, i) => `<span><b>${k}</b>${i + 1}</span>`).join("")}</div><div class="p2-grid">${easy}</div>${hard ? `<div class="p2-grid">${hard}</div>` : ""}`;
  }
  if (game.type === "missing") {
    return `<div class="p2-grid">${game.items.map((it) => `<div class="p2q"><button type="button" class="vq-n" data-peek>${it.num}</button><div class="p2p"><span class="mono">${esc(it.shown)}</span> <span class="muted">${esc(it.meaning || "")}</span></div><input ${inputAttrs(it.missing, it.num + "번 빠진 철자", 'data-sec="p2" data-kind="word" maxlength="2" class="letter" placeholder="?"')}><span class="vq-r"></span></div>`).join("")}</div>`;
  }
  return `<div class="p2-grid">${game.items.map((it) => `<div class="p2q"><button type="button" class="vq-n" data-peek>${it.num}</button><div class="p2p"><span class="mono">${esc(it.shuffled)}</span> <span class="muted">${esc(it.meaning || "")}</span></div><input ${inputAttrs(it.word, it.num + "번 단어", 'data-sec="p2" data-kind="word" placeholder="단어"')}><span class="vq-r"></span></div>`).join("")}</div>`;
}

export function renderOnline(ws) {
  const game = gameData(ws);
  const scale = ws.options.onlineScale || 1;
  return `<div class="online" style="--ol:${scale}">
    <div class="ol-toolbar">
      <div class="ol-modes" role="radiogroup" aria-label="풀이 방식">
        <button type="button" class="seg on" data-mode="solve" role="radio" aria-checked="true">✏️ 직접 풀기</button>
        <button type="button" class="seg" data-mode="peek" role="radio" aria-checked="false">👆 눌러서 정답 보기</button>
      </div>
      <div class="ol-acts">
        <button type="button" class="btn primary sm" data-ol="check">채점하기</button>
        <button type="button" class="btn sm" data-ol="reveal">전체 정답</button>
        <button type="button" class="btn sm ghost" data-ol="reset">다시 풀기</button>
      </div>
      <div class="ol-size"><span class="tl">글자</span><button type="button" class="btn sm ghost" data-ol="smaller" aria-label="글자 작게">A−</button><span class="fv" data-scale>${Math.round(scale * 100)}%</span><button type="button" class="btn sm ghost" data-ol="bigger" aria-label="글자 크게">A+</button></div>
      <div class="ol-score" aria-live="polite"></div>
    </div>
    <p class="muted small ol-help">번호(●)를 누르면 그 칸의 정답만 잠깐 볼 수 있습니다. ‘눌러서 정답 보기’ 모드에서는 칸을 누를 때마다 정답이 나타나고 사라집니다.</p>
    <h3 class="ol-h">가사 빈칸</h3>
    <div class="ol-lyrics">${lyricsHTML(ws)}</div>
    <h3 class="ol-h">Part 1. Vocabulary Check</h3>
    <p class="muted small">뜻 문항은 표현이 조금 달라도 정답일 수 있어, 자동으로 맞지 않으면 정답과 비교해 직접 확인하도록 표시합니다.</p>
    <div class="ol-vocab">${vocabHTML(ws)}</div>
    <h3 class="ol-h">Part 2. ${esc(GAME_TYPES[ws.options.game].name)}</h3>
    <div class="ol-p2" data-game="${game.type}">${part2HTML(ws, game)}</div>
  </div>`;
}

/* ---------- 채점 ---------- */

function norm(s) { return String(s || "").toLowerCase().replace(/[’‘`]/g, "'").replace(/[^a-z가-힣']/g, ""); }

function checkInput(inp) {
  const ans = inp.dataset.answer || "";
  const r = inp.parentElement.querySelector(".vq-r");
  inp.classList.remove("ok", "ng", "check", "revealed", "peeked");
  if (!inp.value.trim()) { inp.classList.add("ng"); if (r) r.textContent = ans ? "정답: " + ans : ""; return "empty"; }
  if (inp.dataset.kind === "meaning") {
    const v = norm(inp.value);
    const parts = ans.split(/[,，/;]/).map((p) => norm(p.replace(/\(.*?\)/g, ""))).filter(Boolean);
    const ok = parts.some((p) => p === v || (v.length >= 2 && (p.includes(v) || v.includes(p))));
    inp.classList.add(ok ? "ok" : "check");
    if (r) r.textContent = ok ? "정답" : "확인: " + ans;
    return ok ? "ok" : "check";
  }
  const ok = norm(inp.value) === norm(ans);
  inp.classList.add(ok ? "ok" : "ng");
  if (r) r.textContent = ok ? "정답" : "정답: " + ans;
  return ok ? "ok" : "ng";
}

function gradeAll(root, wsState) {
  const tally = { lyrics: [0, 0], vocab: [0, 0, 0], p2: [0, 0] };
  root.querySelectorAll("input[data-sec]").forEach((inp) => {
    const sec = inp.dataset.sec;
    const res = checkInput(inp);
    tally[sec][1]++;
    if (res === "ok") tally[sec][0]++;
    if (res === "check" && sec === "vocab") tally.vocab[2]++;
  });
  if (wsState) tally.p2 = [wsState.count(), wsState.total];
  return tally;
}

/* ---------- 연결 ---------- */

export function bindOnline(root, ws, { onScale } = {}) {
  let mode = "solve";
  const scoreEl = root.querySelector(".ol-score");
  const online = root.querySelector(".online");

  // 단어 찾기 상태
  const game = gameData(ws);
  let wsState = null;
  if (game.type === "wordsearch") {
    wsState = { found: new Set(), total: game.words.length, start: null, words: game.words };
    wsState.count = () => game.words.filter((w) => wsState.found.has(w.word)).length;
  }

  const peekToggle = (inp) => {
    if (!inp) return;
    if (inp.classList.contains("peeked")) {
      inp.value = inp.dataset.typed || "";
      inp.classList.remove("peeked");
    } else {
      inp.dataset.typed = inp.classList.contains("revealed") ? "" : inp.value;
      inp.value = inp.dataset.answer || "";
      inp.classList.add("peeked");
    }
  };

  const setMode = (m) => {
    mode = m;
    root.querySelectorAll("[data-mode]").forEach((b) => { const on = b.dataset.mode === m; b.classList.toggle("on", on); b.setAttribute("aria-checked", String(on)); });
    root.querySelectorAll("input[data-answer]").forEach((inp) => { inp.readOnly = m === "peek"; });
    online.classList.toggle("peek-mode", m === "peek");
  };

  root.addEventListener("click", (e) => {
    const t = e.target;
    const modeBtn = t.closest("[data-mode]");
    if (modeBtn) { setMode(modeBtn.dataset.mode); return; }
    const act = t.closest("[data-ol]");
    if (act) {
      const a = act.dataset.ol;
      if (a === "check") {
        const s = gradeAll(root, wsState);
        scoreEl.textContent = `가사 ${s.lyrics[0]}/${s.lyrics[1]} · Part 1 ${s.vocab[0]}/${s.vocab[1]}${s.vocab[2] ? ` (뜻 ${s.vocab[2]}개 직접 확인)` : ""} · Part 2 ${s.p2[0]}/${s.p2[1]}`;
      } else if (a === "reveal") {
        root.querySelectorAll("input[data-answer]").forEach((inp) => { inp.value = inp.dataset.answer || ""; inp.classList.remove("ng", "check", "peeked"); inp.classList.add("revealed"); });
        if (wsState) wsState.words.forEach((w) => markFound(w));
        scoreEl.textContent = "모든 정답을 표시했습니다.";
      } else if (a === "reset") {
        root.querySelectorAll("input[data-answer]").forEach((inp) => { inp.value = ""; inp.dataset.typed = ""; inp.classList.remove("ok", "ng", "check", "revealed", "peeked"); });
        root.querySelectorAll(".vq-r").forEach((r) => { r.textContent = ""; });
        if (wsState) { wsState.found.clear(); wsState.start = null; root.querySelectorAll(".wsc").forEach((c) => c.classList.remove("found", "sel", "bad")); root.querySelectorAll(".wchip").forEach((c) => c.classList.remove("done")); }
        scoreEl.textContent = "";
      } else if (a === "bigger" || a === "smaller") {
        const cur = ws.options.onlineScale || 1;
        const next = Math.max(0.8, Math.min(2, Math.round((cur + (a === "bigger" ? 0.1 : -0.1)) * 10) / 10));
        ws.options.onlineScale = next;
        online.style.setProperty("--ol", next);
        root.querySelector("[data-scale]").textContent = Math.round(next * 100) + "%";
        if (onScale) onScale(next);
      }
      return;
    }
    // 번호 버튼: 그 칸 정답 잠깐 보기
    const peek = t.closest("[data-peek]");
    if (peek) { peekToggle(peek.parentElement.querySelector("input[data-answer]")); return; }
    // '눌러서 정답 보기' 모드에서 입력칸 클릭
    if (mode === "peek" && t.matches("input[data-answer]")) { peekToggle(t); return; }
    // 단어 찾기
    const cellBtn = t.closest(".wsc");
    if (cellBtn && wsState) { wsClick(cellBtn); return; }
    const chip = t.closest(".wchip");
    if (chip && wsState && mode === "peek") {
      const w = wsState.words.find((x) => x.word === chip.dataset.word);
      if (w) markFound(w);
    }
  });

  root.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" || e.target.tagName !== "INPUT") return;
    e.preventDefault();
    const all = Array.from(root.querySelectorAll("input[data-answer]"));
    const i = all.indexOf(e.target);
    if (all[i + 1]) all[i + 1].focus();
  });

  function cellEl(r, c) { return root.querySelector(`.wsc[data-r="${r}"][data-c="${c}"]`); }

  function markFound(w) {
    wsState.found.add(w.word);
    w.cells.forEach(([r, c]) => { const el = cellEl(r, c); if (el) el.classList.add("found"); });
    root.querySelectorAll(`.wchip[data-word="${CSS.escape(w.word)}"]`).forEach((chip) => chip.classList.add("done"));
  }

  function wsClick(btn) {
    const r = Number(btn.dataset.r), c = Number(btn.dataset.c);
    if (!wsState.start) {
      wsState.start = [r, c];
      btn.classList.add("sel");
      return;
    }
    const [r0, c0] = wsState.start;
    const startEl = cellEl(r0, c0);
    if (startEl) startEl.classList.remove("sel");
    wsState.start = null;
    if (r0 === r && c0 === c) return;
    const dr = Math.sign(r - r0), dc = Math.sign(c - c0);
    const len = Math.max(Math.abs(r - r0), Math.abs(c - c0)) + 1;
    const straight = (r - r0 === 0 || c - c0 === 0 || Math.abs(r - r0) === Math.abs(c - c0));
    let text = "";
    const cells = [];
    if (straight) for (let k = 0; k < len; k++) { cells.push([r0 + dr * k, c0 + dc * k]); text += game.grid[r0 + dr * k][c0 + dc * k]; }
    const rev = text.split("").reverse().join("");
    const hit = straight && text.length > 1 && wsState.words.find((w) => !wsState.found.has(w.word) && (w.word === text || w.word === rev));
    if (hit) {
      markFound(hit);
      scoreEl.textContent = `단어 찾기 ${wsState.count()}/${wsState.total}`;
    } else {
      const els = (straight ? cells : [[r0, c0], [r, c]]).map(([a, b]) => cellEl(a, b)).filter(Boolean);
      els.forEach((el) => el.classList.add("bad"));
      setTimeout(() => els.forEach((el) => el.classList.remove("bad")), 500);
    }
  }

  setMode("solve");
}
