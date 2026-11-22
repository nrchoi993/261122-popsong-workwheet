/**
 * 팝송 문법 활동지 생성기 — 화면 흐름
 *  1. 표현 선택 → 2. 영상 고르기(빠름) → 3. 가사·옵션 → 4. 활동지 확인·다운로드
 */
import { GRADES, CATEGORIES, GRAMMAR_ITEMS, searchGrammar, getGrammar, categoryOf, makeCustomGrammar, levelLabel } from "./data/grammar-catalog.js";
import { SONG_LIBRARY } from "./data/song-library.js";
import * as API from "./llm-client.js";
import { recommendSongs, buildWorksheetWithAI, fillMeanings, translateLines } from "./ai-tasks.js";
import { resolveVideos, mountPlayer, parseYouTubeId, watchUrl, searchUrl, thumbUrl } from "./youtube.js";
import { parseLyrics, collapseRepeats } from "./lyrics.js";
import {
  createWorksheet, computeLines, setBlanks, syncBlankIds, fillAutoBlanks, visibleBlanks, addBlank, removeBlank,
  renderPage1, renderPage2, renderAnswerPages, renderAllPages, renderOnline, gradeOnline, revealOnline, resetOnline, esc, grammarSummary,
} from "./worksheet.js";
import { $, $$, showLoading, hideLoading, setLoadingStep, toast, qrDataUrl } from "./ui.js";

const WORK_KEY = "popsong.work.v2";
const app = {
  step: 1,
  maxStep: 1,
  grammar: null,
  grade: "",
  cards: [],
  aiShown: [],
  selected: null, // { song, videos, choice }
  ws: null,
  qr: "",
  view: "preview",
  dirty: { preview: true, online: true, edit: true },
  cardCtrl: null,
  s3Ctrl: null,
  abort: null,
};

/* =================== 초기화 =================== */

document.addEventListener("DOMContentLoaded", init);

function init() {
  API.onChange(renderApiStatus);
  API.loadSettings();
  bindSettings();
  bindStepper();
  initStep1();
  initStep2();
  initStep3();
  initStep4();
  restoreWork();
  checkServer();
  window.addEventListener("resize", debounce(() => { if (app.step === 4) layoutPages(); }, 150));
}

async function checkServer() {
  try {
    const r = await fetch("/api/health", { cache: "no-store" });
    if (!r.ok) throw new Error();
    const j = await r.json();
    app.server = !!j.ok;
  } catch (e) {
    app.server = false;
  }
}

/* =================== AI 설정 =================== */

function bindSettings() {
  const panel = $("#settingsPanel");
  const pill = $("#apiPill");
  const open = (v, scroll = true) => { panel.hidden = !v; pill.setAttribute("aria-expanded", String(v)); if (v && scroll) window.scrollTo({ top: 0, behavior: "smooth" }); };
  pill.addEventListener("click", () => open(panel.hidden));
  $("#settingsClose").addEventListener("click", () => open(false));

  const s = API.state;
  $("#provider").value = s.provider;
  $("#apiKey").value = s.apiKey;
  $("#remember").checked = s.remember;
  $("#ytKey").value = s.ytKey;
  fillModelSelect();

  $("#provider").addEventListener("change", (e) => { API.update({ provider: e.target.value }); fillModelSelect(); });
  $("#apiKey").addEventListener("input", debounce((e) => { API.update({ apiKey: e.target.value }); }, 250));
  $("#apiKey").addEventListener("change", (e) => API.update({ apiKey: e.target.value }));
  $("#model").addEventListener("change", (e) => API.update({ model: e.target.value }));
  $("#remember").addEventListener("change", (e) => API.update({ remember: e.target.checked }));
  $("#ytKey").addEventListener("change", (e) => API.update({ ytKey: e.target.value.trim() }));
  $("#toggleKey").addEventListener("click", (e) => {
    const inp = $("#apiKey");
    const show = inp.type === "password";
    inp.type = show ? "text" : "password";
    e.currentTarget.textContent = show ? "숨기기" : "보기";
    e.currentTarget.setAttribute("aria-pressed", String(show));
  });
  $("#refreshModels").addEventListener("click", async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true; btn.textContent = "…";
    try {
      const list = await API.refreshModels();
      fillModelSelect();
      toast(`사용 가능한 모델 ${list.length}개를 불러왔습니다.`, "ok");
    } catch (err) {
      toast("모델 목록을 불러오지 못했습니다: " + err.message, "error", 7000);
    } finally { btn.disabled = false; btn.textContent = "목록"; }
  });
  $("#testConn").addEventListener("click", async (e) => {
    const btn = e.currentTarget;
    API.update({ apiKey: $("#apiKey").value });
    btn.disabled = true;
    try {
      await API.testConnection();
      fillModelSelect();
      toast("요청 성공! 이제 AI 추천과 해석을 사용할 수 있습니다.", "ok");
    } catch (err) { /* 상태 영역에 표시 */ }
    finally { btn.disabled = false; }
  });

  if (!s.apiKey && !localStorage.getItem("popsong.seenSettings")) {
    open(true, false);
    try { localStorage.setItem("popsong.seenSettings", "1"); } catch (e) { /* */ }
  }
}

function fillModelSelect() {
  const s = API.state;
  const sel = $("#model");
  const list = s.models.length ? s.models : API.PROVIDERS[s.provider].fallbackModels;
  const cur = s.model || "";
  sel.innerHTML = (s.models.length ? "" : '<option value="">자동 선택 (기본 모델)</option>') +
    list.map((m, i) => `<option value="${esc(m)}">${esc(m)}${i === 0 && s.models.length ? " · 추천" : ""}</option>`).join("");
  if (cur && !list.includes(cur)) sel.insertAdjacentHTML("afterbegin", `<option value="${esc(cur)}">${esc(cur)}</option>`);
  sel.value = cur || (s.models.length ? list[0] : "");
  $("#apiKey").placeholder = API.PROVIDERS[s.provider].keyHint + " 를 붙여 넣으세요";
  $("#keyPage").href = API.PROVIDERS[s.provider].keyPage;
}

function renderApiStatus(s) {
  const v = API.statusView();
  const pill = $("#apiPill");
  if (!pill) return;
  pill.className = "api-pill " + v.cls;
  pill.querySelector(".pill-label").textContent = v.label;
  pill.querySelector(".pill-sub").textContent = s.apiKey ? API.PROVIDERS[s.provider].name.split(" ")[0] : "AI 설정";
  const box = $("#apiStatus");
  box.className = "api-status " + v.cls;
  $("#apiStatusLabel").textContent = v.label;
  $("#apiStatusText").textContent = v.text;
  const dw = $("#apiStatusDetailWrap");
  dw.hidden = !(s.status === "error" && s.statusDetail);
  $("#apiStatusDetail").textContent = s.statusDetail || "";
  const mm = API.keyMismatchHint();
  const mmBox = $("#mismatch");
  if (mm) {
    mmBox.hidden = false;
    mmBox.innerHTML = `${esc(mm.message)} 제공사를 바꿀까요? <button type="button" class="btn sm" id="mmFix">${esc(API.PROVIDERS[mm.suggested].name)}(으)로 변경</button>`;
    $("#mmFix").onclick = () => { $("#provider").value = mm.suggested; API.update({ provider: mm.suggested }); fillModelSelect(); };
  } else mmBox.hidden = true;
  $("#keyHint").textContent = s.apiKey ? `입력됨 · ${s.apiKey.slice(0, 6)}…${s.apiKey.slice(-4)}` : "";
  updateAiHints();
}

function updateAiHints() {
  const has = API.hasKey();
  const gh = $("#genHint");
  const th = $("#trHint");
  if (th) th.textContent = has ? "영어 줄 바로 아래에 해석이 들어갑니다. 확인하고 그 자리에서 고치면 그대로 활동지에 쓰입니다." : "AI 키를 연결하면 사용할 수 있습니다. 해석을 직접 쓰려면 영어 줄 바로 아래 줄에 한글로 입력하세요.";
  if (gh) gh.textContent = has ? "AI가 빈칸·뜻·해석·곡 소개를 만듭니다(보통 15~40초)." : "AI 키가 없으면 빈칸을 자동으로 고르고, 뜻·해석은 직접 입력합니다.";
  const more = $("#moreSongs");
  if (more) more.hidden = !has || app.step !== 2;
}

/* =================== 단계 이동 =================== */

function bindStepper() {
  $$(".stepper button").forEach((b) => b.addEventListener("click", () => goStep(Number(b.dataset.step))));
  $$("[data-go]").forEach((b) => b.addEventListener("click", () => goStep(Number(b.dataset.go))));
}

function goStep(n) {
  if (n > app.maxStep) return;
  app.step = n;
  [1, 2, 3, 4].forEach((i) => { $("#step" + i).hidden = i !== n; });
  $$(".stepper button").forEach((b) => {
    const i = Number(b.dataset.step);
    b.disabled = i > app.maxStep;
    b.classList.toggle("done", i < n);
    if (i === n) b.setAttribute("aria-current", "step"); else b.removeAttribute("aria-current");
  });
  if (n !== 2 && app.cardCtrl) { app.cardCtrl.destroy(); app.cardCtrl = null; renderCardsVideoReset(); }
  if (n !== 3 && app.s3Ctrl) { app.s3Ctrl.destroy(); app.s3Ctrl = null; }
  if (n === 3) mountStep3Player();
  if (n === 4) renderStep4();
  updateAiHints();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function unlock(n) { app.maxStep = Math.max(app.maxStep, n); }

/* =================== 1단계: 표현 선택 =================== */

const QUICK = ["pass_basic", "inf_noun", "perf_present", "rel_subject_object", "subj_past", "caus_make_let_have", "ger_object", "comp_er", "modal_used_to", "cond_if", "indirect_question", "cl_imperative"];

function initStep1() {
  $("#grade").innerHTML = '<option value="">자동 (권장 학교급 기준)</option>' + GRADES.map((g) => `<option>${g}</option>`).join("");
  $("#grade").addEventListener("change", (e) => { app.grade = e.target.value; });
  $("#quickChips").innerHTML = '<span class="muted small" style="align-self:center">자주 찾는 표현:</span>' + QUICK.map((id) => {
    const g = getGrammar(id);
    return `<button type="button" class="chip-btn" data-gid="${id}">${esc(g.label.split(" (")[0].replace(/\s*\(.*$/, ""))}</button>`;
  }).join("");
  $("#quickChips").addEventListener("click", (e) => { const b = e.target.closest("[data-gid]"); if (b) selectGrammar(getGrammar(b.dataset.gid)); });

  $("#catList").innerHTML = CATEGORIES.map((c) => {
    const items = GRAMMAR_ITEMS.filter((g) => g.cat === c.no);
    return `<div class="cat"><h4>${c.no}. ${esc(c.ko)} <small>${esc(c.en)}</small></h4><div class="items">${items.map((g) => `<button type="button" class="chip-btn" data-gid="${g.id}" title="${esc(g.form)}">${esc(g.label)}</button>`).join("")}</div></div>`;
  }).join("");
  $("#catList").addEventListener("click", (e) => { const b = e.target.closest("[data-gid]"); if (b) { selectGrammar(getGrammar(b.dataset.gid)); $("#browse").open = false; } });

  const q = $("#gq");
  const list = $("#gList");
  let active = -1;
  let current = [];
  const close = () => { list.hidden = true; q.setAttribute("aria-expanded", "false"); active = -1; };
  const render = () => {
    const text = q.value.trim();
    $("#gClear").hidden = !text;
    if (!text) { close(); return; }
    current = searchGrammar(text, 14);
    let html = current.map((g, i) => {
      const c = categoryOf(g);
      return `<li role="option" id="opt-${i}" data-i="${i}" aria-selected="${i === active}"><span class="sg-l">${esc(g.label)}</span><span class="lv lv-${g.level}">${levelLabel(g.level)}</span><span class="sg-f">${esc(g.form)}</span><span class="sg-c">${c.no}. ${esc(c.ko)} · ${esc(c.en)}</span></li>`;
    }).join("");
    if (!current.length) html += `<li class="sg-empty" aria-disabled="true">교육과정 목록에서 ‘${esc(text)}’을(를) 찾지 못했습니다. 띄어쓰기를 바꾸거나 아래 범주에서 찾아보세요.</li>`;
    html += `<li role="option" class="sg-custom" data-custom="1" id="opt-custom">✎ ‘${esc(text)}’ 표현으로 직접 찾기${API.hasKey() ? "" : " (AI 키 연결 시 더 정확)"}</li>`;
    list.innerHTML = html;
    list.hidden = false;
    q.setAttribute("aria-expanded", "true");
  };
  q.addEventListener("input", () => { active = -1; render(); });
  q.addEventListener("focus", () => { if (q.value.trim()) render(); });
  q.addEventListener("keydown", (e) => {
    const opts = $$("li[role=option]", list);
    if (e.key === "ArrowDown") { e.preventDefault(); active = Math.min(opts.length - 1, active + 1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); active = Math.max(0, active - 1); }
    else if (e.key === "Enter") {
      e.preventDefault();
      const pick = opts[active >= 0 ? active : 0];
      if (pick) pick.click();
      return;
    } else if (e.key === "Escape") { close(); return; } else return;
    opts.forEach((o, i) => o.setAttribute("aria-selected", String(i === active)));
    if (opts[active]) { opts[active].scrollIntoView({ block: "nearest" }); q.setAttribute("aria-activedescendant", opts[active].id); }
  });
  list.addEventListener("mousedown", (e) => e.preventDefault());
  list.addEventListener("click", (e) => {
    const li = e.target.closest("li[role=option]");
    if (!li) return;
    if (li.dataset.custom) selectGrammar(makeCustomGrammar(q.value));
    else selectGrammar(current[Number(li.dataset.i)]);
    close();
  });
  q.addEventListener("blur", () => setTimeout(close, 120));
  $("#gClear").addEventListener("click", () => { q.value = ""; $("#gClear").hidden = true; close(); q.focus(); });
  $("#findBtn").addEventListener("click", findSongs);
}

function selectGrammar(g) {
  if (!g) return;
  app.grammar = g;
  const box = $("#selGrammar");
  const c = g.custom ? null : categoryOf(g);
  box.hidden = false;
  box.innerHTML = `
    <div class="sg-top"><b>${esc(g.label)}</b>${g.form ? `<span class="muted">${esc(g.form)}</span>` : ""}${g.custom ? '<span class="lv lv-중">직접 입력</span>' : `<span class="lv lv-${g.level}">${levelLabel(g.level)}</span>`}</div>
    <div class="sg-cat">${c ? `[별표 4] ${c.no}. ${esc(c.ko)} (${esc(c.en)})${g.ext ? " · 수업용 확장 항목" : ""}` : "교육과정 목록 밖의 표현 — AI가 해석해 곡을 찾습니다."}</div>
    ${g.example ? `<div class="sg-ex">교육과정 예문: <i>${esc(g.example)}</i></div>` : ""}
    <button type="button" class="icon-btn" aria-label="선택 해제" id="unsel">×</button>`;
  $("#unsel").onclick = () => { app.grammar = null; box.hidden = true; $("#findBtn").disabled = true; $$(".chip-btn.on").forEach((b) => b.classList.remove("on")); };
  $$(".chip-btn[data-gid]").forEach((b) => b.classList.toggle("on", b.dataset.gid === g.id));
  $("#findBtn").disabled = false;
  $("#gq").value = "";
  $("#gClear").hidden = true;
  setTimeout(() => $("#findBtn").focus({ preventScroll: true }), 0);
}

/* =================== 2단계: 영상 고르기 =================== */

function gradeIndex(g) { const i = GRADES.indexOf(g); return i < 0 ? 4 : i; }

function libraryMatches(g) {
  let ids = [];
  if (g.custom) {
    const found = searchGrammar(g.label, 3);
    ids = found.map((x) => x.id);
  } else {
    ids = [g.id];
    // 같은 범주의 가까운 항목도 함께 (예: 수동태 기본 ↔ 조동사 수동태)
  }
  const exact = SONG_LIBRARY.filter((s) => s.tags.some((t) => ids.includes(t)));
  return exact.map((s) => libToCard(s, g));
}

function libToCard(s, g) {
  const gi = Math.max(gradeIndex(g.grade || "중학교 1학년"), gradeIndex(s.minGrade)) + (s.vocab === "advanced" ? 1 : 0);
  return {
    title: s.title, artist: s.artist, year: s.year, vocab: s.vocab,
    grade: GRADES[Math.min(GRADES.length - 1, gi)],
    evidence: "", reason: s.note, caution: "", source: "lib",
  };
}

function relatedSuggestions(g) {
  if (g.custom) return [];
  const sameCat = GRAMMAR_ITEMS.filter((x) => x.cat === g.cat && x.id !== g.id);
  return sameCat.filter((x) => SONG_LIBRARY.some((s) => s.tags.includes(x.id))).slice(0, 6);
}

function dedupeCards(list) {
  const seen = new Set();
  return list.filter((c) => {
    const k = c.title.toLowerCase().replace(/[^a-z0-9가-힣]/g, "").replace(/\(.*?\)/g, "");
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function sortByGrade(cards) {
  if (!app.grade) return cards;
  const t = gradeIndex(app.grade);
  return cards.slice().sort((a, b) => Math.abs(gradeIndex(a.grade) - t) - Math.abs(gradeIndex(b.grade) - t));
}

async function findSongs({ more = false } = {}) {
  const g = app.grammar;
  if (!g) { toast("먼저 표현을 골라 주세요.", "error"); return; }
  const lib = libraryMatches(g);
  let ai = [];
  let aiError = null;
  if (!more) app.aiShown = [];

  if (API.hasKey()) {
    app.abort = new AbortController();
    showLoading({
      title: more ? "곡을 더 찾고 있어요" : "표현이 들어간 곡을 찾고 있어요",
      kind: "recommend",
      steps: [{ label: "AI에게 곡 추천 요청", state: "run" }, { label: "재생 가능한 YouTube 영상 확인", state: "wait" }],
      onCancel: () => app.abort && app.abort.abort(),
    });
    try {
      const exclude = more ? app.cards.map((c) => c.title) : lib.map((c) => c.title).slice(0, 8);
      ai = await recommendSongs({ grammar: g, grade: app.grade, exclude, count: 6, signal: app.abort.signal });
      app.aiShown = app.aiShown.concat(ai.map((c) => c.title));
      setLoadingStep(0, "done");
    } catch (e) {
      aiError = e;
      setLoadingStep(0, "fail");
    } finally {
      hideLoading();
    }
    if (aiError && aiError.code === "cancelled") { toast("AI 추천을 취소했습니다. 기본 목록을 보여 드립니다.", "info"); aiError = null; }
  }

  const cards = more
    ? dedupeCards(app.cards.concat(ai.map(toCardModel)))
    : dedupeCards(sortByGrade(ai.map(toCardModel)).concat(sortByGrade(lib.map(toCardModel))));
  app.cards = cards;
  unlock(2);
  goStep(2);
  renderSongNotice(g, ai.length, lib.length, aiError);
  renderCards();
  resolveAllVideos();
}

function toCardModel(c) {
  return { ...c, grade: c.grade || app.grammar.grade, videos: null, choice: null, id: "c" + Math.random().toString(36).slice(2, 8) };
}

function renderSongNotice(g, nAi, nLib, aiError) {
  $("#s2Sub").textContent = `${grammarSummaryOf(g)} · ${app.grade || "학년 자동"}`;
  const box = $("#s2Notice");
  let html = "";
  if (aiError) html += `<div class="notice err"><b>AI 추천을 받지 못했습니다.</b> ${esc(aiError.message)} ${nLib ? "기본 곡 목록에서 찾은 곡을 보여 드립니다." : ""} <button type="button" class="btn sm" id="openSet">AI 설정 열기</button></div>`;
  if (!API.hasKey()) html += `<div class="notice info">AI 키 없이 <b>기본 곡 목록(${SONG_LIBRARY.length}곡)</b>에서 찾았습니다. 더 다양한 곡은 상단의 <b>AI 설정</b>에서 키를 연결해 주세요.</div>`;
  if (app.server === false) html += `<div class="notice warn">영상 검색 서버(/api)에 연결할 수 없습니다. Vercel에 배포한 주소에서 열면 영상이 자동으로 연결됩니다. 지금은 ‘YouTube에서 검색’ 후 주소를 붙여 넣어 사용할 수 있습니다.</div>`;
  if (!app.cards.length) {
    const rel = relatedSuggestions(g);
    html += `<div class="card empty"><p><b>이 표현으로 찾은 곡이 아직 없습니다.</b></p><p class="muted">${API.hasKey() ? "AI 추천이 비어 있습니다. 다시 시도하거나 아래 비슷한 표현을 골라 보세요." : "AI 키를 연결하면 이 표현이 들어간 곡을 찾아 줍니다. 또는 아래 비슷한 표현을 골라 보세요."}</p>
      ${rel.length ? `<div class="related">${rel.map((x) => `<button type="button" class="chip-btn" data-rel="${x.id}">${esc(x.label)}</button>`).join("")}</div>` : ""}
      <p class="muted small">원하는 곡을 알고 있다면 아래 ‘곡을 직접 입력하기’를 사용하세요.</p></div>`;
  }
  box.innerHTML = html;
  const os = $("#openSet");
  if (os) os.onclick = () => { $("#settingsPanel").hidden = false; $("#apiPill").setAttribute("aria-expanded", "true"); window.scrollTo({ top: 0, behavior: "smooth" }); };
  $$("[data-rel]", box).forEach((b) => b.addEventListener("click", () => { selectGrammar(getGrammar(b.dataset.rel)); findSongs(); }));
}

function grammarSummaryOf(g) {
  if (g.custom) return "직접 입력: " + g.label;
  const c = categoryOf(g);
  return `${c.no}. ${c.ko} · ${g.label}`;
}

function gradeShort(g) { return (g || "").replace("학교 ", "").replace("학년", ""); }
function gradeCls(g) { return /^초/.test(g) ? "g-초" : /^고/.test(g) ? "g-고" : "g-중"; }
const VOCAB_KO = { basic: "어휘 기초", intermediate: "어휘 중", advanced: "어휘 상" };

function renderCards() {
  const grid = $("#songGrid");
  grid.innerHTML = app.cards.map((c) => `
    <article class="song-card" id="${c.id}">
      <div class="vid" data-vid><div class="skel">재생 가능한 영상을 찾는 중…</div></div>
      <div class="vbar" data-vbar></div>
      <div class="vmsg" data-vmsg hidden></div>
      <div class="sc-body">
        <div class="badges">
          <span class="bdg ${gradeCls(c.grade)}">${esc(gradeShort(c.grade))} 권장</span>
          <span class="bdg v-${c.vocab}">${VOCAB_KO[c.vocab] || "어휘 중"}</span>
          <span class="bdg ${c.source === "ai" ? "src-ai" : "src-lib"}">${c.source === "ai" ? "AI 추천" : "기본 목록"}</span>
        </div>
        <h3>${esc(c.title)}</h3>
        <div class="artist">${esc(c.artist)}${c.year ? " · " + esc(c.year) : ""}</div>
        ${c.evidence ? `<div class="ev">“${esc(c.evidence)}”${c.where ? ` <i>(${esc(c.where)})</i>` : ""}</div>` : ""}
        ${c.reason ? `<div class="why">${esc(c.reason)}</div>` : ""}
        ${c.caution ? `<div class="caution">⚠ ${esc(c.caution)}</div>` : ""}
      </div>
      <div class="sc-act"><button type="button" class="btn primary" data-pick="${c.id}">이 곡으로 활동지 만들기</button></div>
    </article>`).join("");
  $$("[data-pick]", grid).forEach((b) => b.addEventListener("click", () => pickSong(app.cards.find((c) => c.id === b.dataset.pick))));
}

function renderCardsVideoReset() {
  app.cards.forEach((c) => { if (c.videos) renderCardVideo(c); });
}

async function resolveAllVideos() {
  const queue = app.cards.filter((c) => !c.videos);
  const worker = async () => {
    while (queue.length) {
      const c = queue.shift();
      c.videos = await resolveVideos(c, API.state.ytKey);
      if (!c.choice) c.choice = c.videos.official.length ? "official" : (c.videos.lyrics.length ? "lyrics" : null);
      renderCardVideo(c);
    }
  };
  await Promise.all([worker(), worker(), worker(), worker()]);
}

function orderedCandidates(c) {
  const v = c.videos || { official: [], lyrics: [] };
  if (c.manualId) return [{ id: c.manualId, title: c.title, kind: "manual" }].concat(v.official, v.lyrics);
  return c.choice === "lyrics" ? v.lyrics.concat(v.official) : v.official.concat(v.lyrics);
}

function renderCardVideo(c) {
  const el = document.getElementById(c.id);
  if (!el) return;
  const vid = $("[data-vid]", el);
  const bar = $("[data-vbar]", el);
  const cands = orderedCandidates(c);
  if (!cands.length) {
    const why = c.videos && !c.videos.server ? "영상 검색 서버에 연결할 수 없습니다." : "사이트에서 바로 재생할 수 있는 영상을 찾지 못했습니다.";
    vid.innerHTML = `<div class="vid-empty"><span>${why}</span>
      <a class="btn sm" href="${esc((c.videos && c.videos.searchUrl) || searchUrl(c.title, c.artist))}" target="_blank" rel="noopener">YouTube에서 검색 ↗</a>
      <span class="input-row" style="width:100%;max-width:300px"><input type="url" placeholder="찾은 영상 주소 붙여넣기" data-url><button type="button" class="btn sm" data-urlbtn>연결</button></span></div>`;
    bar.innerHTML = "";
    $("[data-urlbtn]", vid).addEventListener("click", () => {
      const id = parseYouTubeId($("[data-url]", vid).value);
      if (!id) { toast("YouTube 주소를 확인해 주세요.", "error"); return; }
      c.manualId = id; renderCardVideo(c);
    });
    return;
  }
  const first = cands[0];
  const kindLabel = first.kind === "lyrics" ? "가사·해석 영상" : first.kind === "manual" ? "직접 연결한 영상" : "공식 영상";
  vid.innerHTML = `<button type="button" class="facade" style="background-image:url('${thumbUrl(first.id)}')" aria-label="${esc(c.title)} 영상 재생"><span class="play"></span><span class="vk">${kindLabel} · ${esc(first.title || "")}</span></button>`;
  $(".facade", vid).addEventListener("click", () => playCard(c));
  const v = c.videos || { official: [], lyrics: [] };
  bar.innerHTML = `${v.official.length ? `<button type="button" class="vb ${c.choice === "official" ? "on" : ""}" data-k="official">공식 영상 ${v.official.length}</button>` : ""}
    ${v.lyrics.length ? `<button type="button" class="vb ${c.choice === "lyrics" ? "on" : ""}" data-k="lyrics">가사·해석 ${v.lyrics.length}</button>` : ""}
    <a href="${watchUrl(first.id)}" target="_blank" rel="noopener">YouTube에서 보기 ↗</a>`;
  $$("[data-k]", bar).forEach((b) => b.addEventListener("click", () => { c.choice = b.dataset.k; c.manualId = null; if (app.cardCtrl && app.cardCtrl.owner === c.id) { app.cardCtrl.destroy(); app.cardCtrl = null; } renderCardVideo(c); }));
}

function playCard(c) {
  if (app.cardCtrl) { const prev = app.cards.find((x) => x.id === app.cardCtrl.owner); app.cardCtrl.destroy(); app.cardCtrl = null; if (prev && prev !== c) renderCardVideo(prev); }
  const el = document.getElementById(c.id);
  const vid = $("[data-vid]", el);
  const msg = $("[data-vmsg]", el);
  msg.hidden = true;
  const ctrl = mountPlayer(vid, orderedCandidates(c), {
    onSwitch: (next, reason) => { msg.hidden = false; msg.textContent = `${reason} → 다른 영상으로 자동 전환했습니다.`; c.currentId = next.id; },
    onFail: (reason) => { msg.hidden = false; msg.textContent = `${reason} ‘YouTube에서 보기’를 이용해 주세요.`; },
  });
  ctrl.owner = c.id;
  app.cardCtrl = ctrl;
  ctrl.play(0, true);
}

function initStep2() {
  $("#moreSongs").addEventListener("click", () => findSongs({ more: true }));
  $("#mAdd").addEventListener("click", () => {
    const title = $("#mTitle").value.trim();
    const artist = $("#mArtist").value.trim();
    if (!title) { toast("곡 제목을 입력해 주세요.", "error"); return; }
    const id = parseYouTubeId($("#mUrl").value);
    const c = toCardModel({ title, artist, year: "", vocab: "intermediate", grade: app.grade || (app.grammar && app.grammar.grade) || "중학교 2학년", reason: "직접 입력한 곡", source: "lib" });
    c.manualId = id || null;
    pickSong(c);
  });
}

/* =================== 3단계: 가사·옵션 =================== */

async function pickSong(c) {
  if (!c) return;
  if (!app.grammar) { toast("표현을 먼저 골라 주세요.", "error"); goStep(1); return; }
  if (!c.videos && !c.manualId) { c.videos = await resolveVideos(c, API.state.ytKey).catch(() => null); }
  app.selected = { song: { title: c.title, artist: c.artist, year: c.year }, card: c };
  if (app.cardCtrl) { app.cardCtrl.destroy(); app.cardCtrl = null; }
  $("#s3Sub").textContent = `${c.title} — ${c.artist} · ${grammarSummaryOf(app.grammar)}`;
  const q = encodeURIComponent(`${c.artist} ${c.title}`);
  $("#lyrLinks").innerHTML = `<a class="btn sm ghost" href="https://search.naver.com/search.naver?query=${q}+%EA%B0%80%EC%82%AC" target="_blank" rel="noopener">네이버 가사 ↗</a><a class="btn sm ghost" href="https://genius.com/search?q=${q}" target="_blank" rel="noopener">Genius ↗</a>`;
  const prevLyrics = app.ws && app.ws.song.title === c.title ? app.ws.lyricsText : "";
  if (prevLyrics && !$("#lyrics").value.trim()) $("#lyrics").value = prevLyrics;
  else if (!app.ws || app.ws.song.title !== c.title) $("#lyrics").value = $("#lyrics").dataset.song === c.title ? $("#lyrics").value : "";
  $("#lyrics").dataset.song = c.title;
  updateLyricStat();
  unlock(3);
  goStep(3);
  saveWork();
}

function mountStep3Player() {
  const c = app.selected && app.selected.card;
  const box = $("#s3Player");
  const bar = $("#s3PlayerBar");
  if (!c) { box.innerHTML = ""; return; }
  const cands = orderedCandidates(c);
  if (!cands.length) {
    box.innerHTML = `<div class="vid-empty"><span>연결된 영상이 없습니다.</span><a class="btn sm" href="${esc(searchUrl(c.title, c.artist))}" target="_blank" rel="noopener">YouTube에서 검색 ↗</a><span class="small">찾은 영상 주소를 아래 ‘다른 YouTube 영상 연결하기’에 붙여 넣으세요.</span></div>`;
    bar.innerHTML = "";
    app.selected.videoId = "";
    return;
  }
  if (app.s3Ctrl) app.s3Ctrl.destroy();
  const ctrl = mountPlayer(box, cands, {
    onSwitch: (next, reason) => { app.selected.videoId = next.id; renderS3Bar(next, reason); },
    onFail: (reason) => renderS3Bar(null, reason),
  });
  app.s3Ctrl = ctrl;
  app.selected.videoId = cands[0].id;
  ctrl.play(0, false);
  renderS3Bar(cands[0]);
}

function renderS3Bar(cur, warn) {
  const bar = $("#s3PlayerBar");
  const c = app.selected.card;
  const list = orderedCandidates(c);
  const i = cur ? list.findIndex((x) => x.id === cur.id) : -1;
  bar.innerHTML = `${cur ? `<span class="bdg">${cur.kind === "lyrics" ? "가사·해석 영상" : cur.kind === "manual" ? "직접 연결" : "공식 영상"}</span>` : ""}
    ${list.length > 1 || !cur ? `<button type="button" class="vb" id="s3Next">${cur ? `다음 영상 (${i + 1}/${list.length})` : "다시 시도"}</button>` : ""}
    ${cur ? `<a href="${watchUrl(cur.id)}" target="_blank" rel="noopener">YouTube에서 보기 ↗</a>` : ""}
    ${warn ? `<div class="vmsg" style="width:100%;padding:0">${esc(warn)}${cur ? " → 다른 영상으로 전환했습니다." : ""}</div>` : ""}
    <div class="small muted" style="width:100%">활동지 QR 코드는 지금 재생 중인 영상으로 연결됩니다.</div>`;
  const nb = $("#s3Next");
  if (nb) nb.onclick = () => { const n = cur ? (i + 1) % list.length : 0; app.s3Ctrl.play(n, true); app.selected.videoId = list[n].id; renderS3Bar(list[n]); };
}

function initStep3() {
  $("#lyrics").addEventListener("input", debounce(() => { updateLyricStat(); saveWork(); }, 250));
  $("#oCollapse").addEventListener("change", updateLyricStat);
  $("#s3UrlBtn").addEventListener("click", () => {
    const id = parseYouTubeId($("#s3Url").value);
    if (!id) { toast("YouTube 주소를 확인해 주세요.", "error"); return; }
    app.selected.card.manualId = id;
    mountStep3Player();
    toast("영상을 연결했습니다.", "ok");
  });
  $("#genBtn").addEventListener("click", generate);
  $("#trBtn").addEventListener("click", aiTranslateLyrics);
  $("#trUndo").addEventListener("click", () => {
    if (app.trUndo == null) return;
    $("#lyrics").value = app.trUndo;
    app.trUndo = null;
    $("#trUndo").hidden = true;
    updateLyricStat(); saveWork();
    toast("해석을 채우기 전으로 되돌렸습니다.", "info", 2500);
  });
}

/** 파싱한 줄을 '영어 줄 / 바로 아래 해석' 형식의 텍스트로 되돌림 */
function linesToText(lines) {
  return lines.map((l) => {
    if (l.type === "break") return "";
    if (l.type === "label") return l.en;
    if (l.en && l.ko) return l.en + "\n" + l.ko;
    return l.en || l.ko || "";
  }).join("\n");
}

async function aiTranslateLyrics() {
  const text = $("#lyrics").value;
  const lines = parseLyrics(text);
  const todo = lines.map((l, i) => ({ i, en: l.en, ko: l.ko, type: l.type })).filter((l) => l.type === "lyric" && l.en && !l.ko);
  if (!lines.some((l) => l.type === "lyric" && l.en)) { toast("먼저 영어 가사를 붙여 넣어 주세요.", "error"); $("#lyrics").focus(); return; }
  if (!todo.length) { toast("모든 영어 줄에 이미 해석이 있습니다.", "info"); return; }
  if (!API.hasKey()) {
    toast("AI 해석은 API 키가 필요합니다. 상단 ‘AI 설정’에서 키를 연결해 주세요.", "error", 6000);
    $("#settingsPanel").hidden = false; $("#apiPill").setAttribute("aria-expanded", "true");
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }
  const song = (app.selected && app.selected.song) || { title: "", artist: "" };
  app.abort = new AbortController();
  const uniqCount = new Set(todo.map((l) => l.en.toLowerCase().replace(/[^a-z0-9']/g, ""))).size;
  showLoading({
    title: "가사 해석을 채우고 있어요",
    kind: "translate",
    steps: [{ label: `영어 ${todo.length}줄 확인 (반복 제외 ${uniqCount}줄 번역)`, state: "done" }, { label: "한국어 해석 (AI)", state: "run" }],
    onCancel: () => app.abort && app.abort.abort(),
  });
  try {
    const ko = await translateLines({ song, items: todo.map((l) => ({ i: l.i, en: l.en })), signal: app.abort.signal });
    let n = 0;
    Object.keys(ko).forEach((i) => { if (lines[i] && !lines[i].ko) { lines[i].ko = ko[i]; n++; } });
    if (!n) throw new Error("AI가 해석을 돌려주지 않았습니다. 다시 시도해 주세요.");
    // 원래 입력이 바뀌지 않았을 때만 덮어씀
    if ($("#lyrics").value !== text) { toast("번역하는 동안 가사가 바뀌어 적용하지 않았습니다. 다시 눌러 주세요.", "error", 6000); return; }
    app.trUndo = text;
    $("#lyrics").value = linesToText(lines);
    $("#trUndo").hidden = false;
    updateLyricStat(); saveWork();
    const miss = todo.length - n;
    toast(`해석 ${n}줄을 채웠습니다.${miss ? ` (${miss}줄은 비어 있어 직접 입력해 주세요)` : ""} 가사 칸에서 확인하고 고쳐 주세요.`, "ok", 6000);
    $("#lyrics").focus();
    $("#lyrics").setSelectionRange(0, 0);
    $("#lyrics").scrollTop = 0;
  } catch (e) {
    if (e.code !== "cancelled") toast("해석을 채우지 못했습니다: " + e.message, "error", 7000);
  } finally {
    hideLoading();
  }
}

function updateLyricStat() {
  const text = $("#lyrics").value;
  const el = $("#lyrStat");
  if (!text.trim()) { el.textContent = "가사를 붙여 넣으면 줄 수와 반복 구간을 알려 드립니다."; return; }
  const lines = parseLyrics(text);
  const en = lines.filter((l) => l.type === "lyric" && l.en).length;
  const ko = lines.filter((l) => l.type === "lyric" && l.ko).length;
  const labels = lines.filter((l) => l.type === "label").length;
  let msg = `영어 ${en}줄 · 해석 ${ko}줄 · 구간 표시 ${labels}개`;
  if ($("#oCollapse").checked) {
    const col = collapseRepeats(lines.map((l, i) => ({ ...l, base: i })));
    const rep = col.filter((l) => l.type === "repeat").length;
    const shown = col.filter((l) => l.type === "lyric" && l.en).length;
    if (rep) msg += ` · 반복 ${rep}곳 접힘 → 활동지에 ${shown}줄`;
    else if (!labels && en > 30) msg += " · 팁: [Chorus] 같은 구간 표시를 넣으면 반복 후렴을 접을 수 있어요";
  }
  if (en < 4) msg += " — 영어 가사가 너무 짧습니다.";
  el.textContent = msg;
}

function readOptions() {
  return {
    blankCount: Number($("#oCount").value),
    focus: $("#oFocus").value,
    vocabMode: $("#oVocab").value,
    game: $("#oGame").value,
    translation: $("#oTrans").checked,
    collapse: $("#oCollapse").checked,
    highlight: $("#oHl").checked,
    fontSize: 10,
  };
}

async function generate() {
  const text = $("#lyrics").value;
  const parsed = parseLyrics(text);
  if (parsed.filter((l) => l.type === "lyric" && l.en).length < 4) {
    toast("영어 가사를 4줄 이상 붙여 넣어 주세요.", "error");
    $("#lyrics").focus();
    return;
  }
  const song = { ...app.selected.song, videoId: app.selected.videoId || "" };
  const ws = createWorksheet({ song, grammar: app.grammar, grade: app.grade || app.selected.card.grade, lyricsText: text, options: readOptions() });

  if (API.hasKey()) {
    app.abort = new AbortController();
    const needKo = ws.options.translation && ws.lines.some((l) => l.type === "lyric" && l.en && !l.ko);
    showLoading({
      title: "활동지를 만들고 있어요",
      kind: "worksheet",
      steps: [
        { label: "가사 분석", state: "done" },
        { label: "빈칸·단어 뜻·곡 소개 (AI)", state: "run" },
        { label: needKo ? "가사 한글 해석 (AI)" : "가사 해석 (붙여 넣은 해석 사용)", state: needKo ? "run" : "done" },
        { label: "활동지·정답지 구성", state: "wait" },
      ],
      onCancel: () => app.abort && app.abort.abort(),
    });
    try {
      const res = await buildWorksheetWithAI({
        song, grammar: app.grammar, grade: ws.grade, lines: ws.lines, blankCount: ws.options.blankCount,
        focus: ws.options.focus, needTranslation: ws.options.translation, signal: app.abort.signal,
      });
      setLoadingStep(1, "done"); setLoadingStep(2, Object.keys(res.translations).length || !needKo ? "done" : "fail");
      // 표시 줄 → 원본 줄 번호로 변환
      setBlanks(ws, res.blanks.slice(0, ws.options.blankCount).map((b) => ({ ...b, line: ws.lines[b.line].base })));
      Object.keys(res.translations).forEach((di) => { const bi = ws.lines[di] && ws.lines[di].base; if (bi != null && ws.baseLines[bi] && !ws.baseLines[bi].ko) ws.baseLines[bi].ko = res.translations[di]; });
      ws.grammarHL = res.grammarLines.map((h) => ({ ...h, line: ws.lines[h.line].base }));
      if (res.info.length) ws.info = res.info;
      if (res.grammarTip) ws.grammarTip = res.grammarTip;
      ws.warnings = res.warnings.slice();
      ws.lines = computeLines(ws);
      setLoadingStep(3, "run");
      const added = fillAutoBlanks(ws);
      if (added) {
        const missing = visibleBlanks(ws).filter((b) => !b.meaning);
        if (missing.length) {
          try {
            const ctx = missing.map((b) => ({ answer: b.answer, context: (ws.baseLines[b.line] || {}).en || "" }));
            const m = await fillMeanings({ song, words: ctx, signal: app.abort.signal });
            missing.forEach((b, i) => { if (m[i]) { b.head = m[i].head || b.head; b.pos = m[i].pos || b.pos; b.meaning = m[i].meaning || ""; } });
          } catch (e) { /* 뜻 보충 실패는 무시 */ }
        }
      }
      setLoadingStep(3, "done");
    } catch (e) {
      hideLoading();
      if (e.code === "cancelled") { toast("활동지 생성을 취소했습니다.", "info"); return; }
      ws.warnings = [`AI 요청에 실패해 자동 빈칸으로 만들었습니다: ${e.message}`];
      fillAutoBlanks(ws);
    } finally {
      hideLoading();
    }
  } else {
    fillAutoBlanks(ws);
    ws.warnings = ["AI 키 없이 만들어 빈칸 단어의 뜻·품사가 비어 있습니다. ‘빈칸·단어 편집’ 탭에서 입력하거나, AI를 연결한 뒤 ‘뜻 자동 채우기’를 눌러 주세요."];
  }

  app.ws = ws;
  app.qr = ws.song.videoId ? qrDataUrl(watchUrl(ws.song.videoId)) : "";
  app.dirty = { preview: true, online: true, edit: true };
  app.autoFitPending = true;
  unlock(4);
  saveWork();
  goStep(4);
}

/* =================== 4단계: 확인·다운로드 =================== */

function initStep4() {
  $$(".tabs [role=tab]").forEach((t) => t.addEventListener("click", () => setView(t.id.replace("tab-", ""))));
  $(".tabs").addEventListener("keydown", (e) => {
    if (!["ArrowLeft", "ArrowRight"].includes(e.key)) return;
    const tabs = $$(".tabs [role=tab]");
    const i = tabs.findIndex((t) => t.getAttribute("aria-selected") === "true");
    const n = (i + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
    tabs[n].focus(); setView(tabs[n].id.replace("tab-", ""));
  });
  $("#fontDown").addEventListener("click", () => changeFont(-0.5));
  $("#fontUp").addEventListener("click", () => changeFont(0.5));
  $("#fitBtn").addEventListener("click", () => fitToPage(true));
  const opt = (id, key, isCheck) => $(id).addEventListener("change", (e) => {
    app.ws.options[key] = isCheck ? e.target.checked : e.target.value;
    if (key === "collapse") app.ws.lines = computeLines(app.ws);
    changed();
  });
  opt("#tTrans", "translation", true);
  opt("#tHl", "highlight", true);
  opt("#tCollapse", "collapse", true);
  opt("#tVocab", "vocabMode", false);
  opt("#tGame", "game", false);
  $("#reshuffle").addEventListener("click", () => { app.ws.gameSeed = Math.floor(Math.random() * 1e9); changed(); toast("Part 2를 새로 섞었습니다.", "ok", 2000); });
  $("#printBtn").addEventListener("click", printWorksheet);
  $("#docxBtn").addEventListener("click", downloadDocx);
  window.addEventListener("afterprint", () => { document.body.classList.remove("printing"); $("#printRoot").innerHTML = ""; });
}

function changed() {
  app.dirty = { preview: true, online: true, edit: true };
  renderStep4();
  saveWorkDebounced();
}

function changeFont(d) {
  const ws = app.ws;
  ws.options.fontSize = Math.max(7.5, Math.min(12, Math.round((ws.options.fontSize + d) * 2) / 2));
  changed();
}

function setView(v) {
  app.view = v;
  $$(".tabs [role=tab]").forEach((t) => t.setAttribute("aria-selected", String(t.id === "tab-" + v)));
  ["preview", "online", "edit"].forEach((k) => { $("#view-" + k).hidden = k !== v; });
  $("#viewTools").hidden = v === "edit";
  $("#fontTools").hidden = v !== "preview";
  renderStep4();
}

function renderStep4() {
  const ws = app.ws;
  if (!ws) return;
  const nBlank = visibleBlanks(ws).length;
  $("#s4Sub").textContent = `${ws.song.title} — ${ws.song.artist} · ${grammarSummary(ws)} · 빈칸 ${nBlank}개`;
  $("#fontVal").textContent = ws.options.fontSize + "pt";
  $("#tTrans").checked = ws.options.translation;
  $("#tHl").checked = ws.options.highlight;
  $("#tCollapse").checked = ws.options.collapse;
  $("#tVocab").value = ws.options.vocabMode;
  $("#tGame").value = ws.options.game;

  const notes = (ws.warnings || []).map((w) => `<li>${esc(w)}</li>`).join("");
  const missingMeaning = visibleBlanks(ws).filter((b) => !b.meaning).length;
  let html = notes ? `<div class="notice warn"><ul>${notes}</ul></div>` : "";
  if (nBlank < ws.options.blankCount) html += `<div class="notice info">빈칸이 ${nBlank}개입니다(목표 ${ws.options.blankCount}개). <button type="button" class="btn sm" id="fillMore">빈칸 자동 보충</button></div>`;
  if (missingMeaning && API.hasKey()) html += `<div class="notice info">뜻이 비어 있는 단어가 ${missingMeaning}개 있습니다. <button type="button" class="btn sm" id="aiMeaning">AI로 뜻 채우기</button></div>`;
  if (ws.info.some((f) => f.label !== "가수" && f.value) && API.hasKey()) html += `<div class="notice info small" style="font-size:13px">곡 소개(가수·발매·배경 등)는 AI가 작성했습니다. 사실과 다를 수 있으니 ‘빈칸·단어 편집’ 탭에서 확인해 주세요.</div>`;
  $("#s4Notice").innerHTML = html;
  const fm = $("#fillMore");
  if (fm) fm.onclick = () => { fillAutoBlanks(ws); changed(); };
  const am = $("#aiMeaning");
  if (am) am.onclick = aiFillMeanings;

  if (app.view === "preview" && app.dirty.preview) renderPreview();
  if (app.view === "online" && app.dirty.online) renderOnlineView();
  if (app.view === "edit" && app.dirty.edit) renderEditView();
}

const PX_PER_MM = (() => { const d = document.createElement("div"); d.style.cssText = "position:absolute;visibility:hidden;width:100mm"; document.documentElement.appendChild(d); const v = d.getBoundingClientRect().width / 100 || 3.7795; d.remove(); return v; })();
const A4H = 297 * PX_PER_MM;
const A4W = 210 * PX_PER_MM;

function renderPreview() {
  const ws = app.ws;
  const labels = ["1쪽 · 가사와 빈칸 (학생용)", "2쪽 · Part 1·2 단어 활동 (학생용)", "3쪽 · 정답 (교사용)", "4쪽 · 정답 표시 가사 (교사용)"];
  const tmp = document.createElement("div");
  tmp.innerHTML = renderPage1(ws, { qr: app.qr }) + renderPage2(ws) + renderAnswerPages(ws);
  const pages = Array.from(tmp.children);
  $("#pages").innerHTML = pages.map((p, i) => `<div class="page-label" data-pl="${i}">${labels[i] || i + 1 + "쪽"} <span class="pl-warn"></span></div><div class="page-scale-wrap"><div class="page-scale">${p.outerHTML}</div></div>`).join("");
  app.dirty.preview = false;
  const after = () => {
    layoutPages();
    if (app.autoFitPending) { app.autoFitPending = false; fitToPage(false); }
  };
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(after); else after();
}

function layoutPages() {
  const box = $("#pages");
  if (!box || box.offsetParent === null) return;
  const avail = box.clientWidth - 4;
  const s = Math.min(1, avail / A4W);
  $$(".page-scale-wrap", box).forEach((wrap, i) => {
    const inner = wrap.firstElementChild;
    const page = inner.firstElementChild;
    inner.style.transform = s < 1 ? `scale(${s})` : "";
    const h = page.offsetHeight;
    wrap.style.width = A4W * s + "px";
    wrap.style.height = h * s + "px";
    const warn = $(`[data-pl="${i}"] .pl-warn`, box);
    if (warn) {
      const pagesUsed = Math.ceil((h - 2) / A4H);
      warn.textContent = pagesUsed > 1 ? `⚠ 내용이 A4 ${pagesUsed}장 분량입니다` : "";
    }
  });
}

function page1Height(fs) {
  const ws = app.ws;
  const prev = ws.options.fontSize;
  ws.options.fontSize = fs;
  const holder = document.createElement("div");
  holder.style.cssText = "position:absolute;left:-9999px;top:0;visibility:hidden";
  holder.innerHTML = renderPage1(ws, { qr: app.qr });
  document.body.appendChild(holder);
  const h = holder.firstElementChild.offsetHeight;
  holder.remove();
  ws.options.fontSize = prev;
  return h;
}

function fitToPage(manual) {
  const ws = app.ws;
  const start = manual ? 11 : ws.options.fontSize;
  const min = manual ? 7.5 : 8.5;
  if (!manual && page1Height(ws.options.fontSize) <= A4H + 2) return;
  let chosen = null;
  for (let fs = start; fs >= min; fs -= 0.5) {
    if (page1Height(fs) <= A4H + 2) { chosen = fs; break; }
  }
  if (chosen != null) {
    if (chosen !== ws.options.fontSize) { ws.options.fontSize = chosen; changed(); }
    if (manual) toast(`1쪽에 맞게 글자를 ${chosen}pt로 조정했습니다.`, "ok");
    else if (chosen < 10) toast(`가사가 1쪽에 들어가도록 글자를 ${chosen}pt로 줄였습니다.`, "info");
  } else {
    const tips = [];
    if (ws.options.translation) tips.push("해석 끄기");
    if (!ws.options.collapse) tips.push("후렴 접기");
    tips.push("[Chorus] 같은 구간 표시 넣기");
    if (manual) { ws.options.fontSize = min; changed(); }
    toast(`가사가 길어 1쪽에 다 들어가지 않습니다. ${tips.join(", ")}를 시도해 보세요.`, "error", 8000);
  }
}

function renderOnlineView() {
  const root = $("#view-online");
  root.innerHTML = renderOnline(app.ws);
  app.dirty.online = false;
  const score = $(".ol-score", root);
  root.querySelector("[data-ol=check]").onclick = () => {
    const r = gradeOnline(root);
    score.textContent = `가사 빈칸 ${r.correct}/${r.total} 정답` + (r.vTotal ? ` · 단어 ${r.vOk}/${r.vTotal}` + (r.vCheck ? ` (뜻 ${r.vCheck}개는 직접 확인)` : "") : "");
  };
  root.querySelector("[data-ol=reveal]").onclick = () => { revealOnline(root); score.textContent = "정답을 표시했습니다."; };
  root.querySelector("[data-ol=reset]").onclick = () => { resetOnline(root); score.textContent = ""; };
  root.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" || e.target.tagName !== "INPUT") return;
    e.preventDefault();
    const all = $$("input", root);
    const i = all.indexOf(e.target);
    if (all[i + 1]) all[i + 1].focus();
  });
}

function renderEditView() {
  const ws = app.ws;
  const root = $("#view-edit");
  const blanks = visibleBlanks(ws);
  const POS = ["", "n.", "v.", "a.", "ad.", "prep.", "conj.", "pron.", "phr.", "int."];
  const lyricLines = ws.lines.filter((l) => l.type === "lyric" && l.en);
  root.innerHTML = `<div class="edit-wrap">
    <div class="card">
      <h3 class="h3" style="margin-top:0">① 빈칸 고르기</h3>
      <p class="muted small edit-help">아래 1쪽에서 <b>단어를 누르면 빈칸이 추가</b>되고, <b>노란 빈칸을 누르면 해제</b>됩니다. 번호는 자동으로 다시 매겨집니다.</p>
      <div class="edit-page"><div class="page-scale-wrap" id="editWrap"><div class="page-scale">${renderPage1(ws, { mode: "edit", qr: app.qr })}</div></div></div>
    </div>
    <div class="card">
      <h3 class="h3" style="margin-top:0">② 빈칸 단어 · 품사 · 뜻 (${blanks.length}개)</h3>
      <div class="set-actions">
        <button type="button" class="btn sm" id="eFill">빈칸 ${ws.options.blankCount}개까지 자동 보충</button>
        ${API.hasKey() ? '<button type="button" class="btn sm" id="eMeaning">비어 있는 뜻 AI로 채우기</button>' : ""}
        <label class="field inline"><span>목표 빈칸 수</span><select id="eCount">${[10, 15, 20, 25, 30].map((n) => `<option ${n === ws.options.blankCount ? "selected" : ""}>${n}</option>`).join("")}</select></label>
      </div>
      <div style="overflow-x:auto"><table class="vtable"><thead><tr><th>번호</th><th>가사 속 단어</th><th>활동지 표기(표제어)</th><th class="pos-col">품사</th><th>뜻</th><th></th></tr></thead><tbody>
      ${blanks.map((b) => `<tr data-id="${b.id}"><td class="num">${b.num}</td><td class="ans">${esc(b.answer)}</td>
        <td><input type="text" data-f="head" value="${esc(b.head)}" aria-label="${b.num}번 표제어"></td>
        <td class="pos-col"><select data-f="pos" aria-label="${b.num}번 품사">${POS.map((p) => `<option ${p === b.pos ? "selected" : ""} value="${p}">${p || "-"}</option>`).join("")}</select></td>
        <td><input type="text" data-f="meaning" value="${esc(b.meaning)}" placeholder="뜻 입력" aria-label="${b.num}번 뜻"></td>
        <td class="del"><button type="button" class="icon-btn" data-del="${b.id}" aria-label="${b.num}번 빈칸 삭제">×</button></td></tr>`).join("")}
      </tbody></table></div>
    </div>
    <div class="card">
      <h3 class="h3" style="margin-top:0">③ 곡 소개 · 오늘의 표현 설명</h3>
      <div class="info-edit" id="infoEdit">${ws.info.map((f, i) => `<div class="info-row"><input type="text" data-ii="${i}" data-if="label" value="${esc(f.label)}" aria-label="항목 이름"><input type="text" data-ii="${i}" data-if="value" value="${esc(f.value)}" aria-label="${esc(f.label)} 내용"><button type="button" class="icon-btn" data-idel="${i}" aria-label="항목 삭제">×</button></div>`).join("")}</div>
      <button type="button" class="btn sm" id="infoAdd" style="margin-top:6px">항목 추가</button>
      <label class="field" style="margin-top:10px"><span>오늘의 표현 설명 (활동지 상단)</span><input type="text" id="tipEdit" value="${esc(ws.grammarTip)}"></label>
    </div>
    <details class="card">
      <summary class="h3" style="margin:0;cursor:pointer">④ 가사 해석 고치기 (${lyricLines.filter((l) => l.ko).length}/${lyricLines.length}줄)</summary>
      <div class="ko-list" style="margin-top:10px">${lyricLines.map((l) => `<div class="ko-row"><span class="en">${esc(l.en)}</span><input type="text" data-ko="${l.base}" value="${esc(l.ko || "")}" placeholder="해석 입력" aria-label="해석"></div>`).join("")}</div>
    </details>
  </div>`;
  app.dirty.edit = false;

  // 편집 페이지 크기 맞춤
  requestAnimationFrame(() => {
    const wrap = $("#editWrap");
    if (!wrap) return;
    const avail = root.clientWidth - 40;
    const s = Math.max(0.72, Math.min(1, avail / A4W)); // 휴대폰에서도 단어를 누를 수 있게 최소 배율 유지(가로 스크롤)
    const inner = wrap.firstElementChild;
    inner.style.transform = s < 1 ? `scale(${s})` : "";
    wrap.style.width = A4W * s + "px";
    wrap.style.height = inner.firstElementChild.offsetHeight * s + "px";
  });

  $("#editWrap").addEventListener("click", (e) => {
    const bl = e.target.closest("[data-blank]");
    if (bl) { removeBlank(ws, Number(bl.dataset.blank)); editChanged(); return; }
    const tok = e.target.closest(".tok");
    if (tok) {
      const line = Number(tok.dataset.line);
      const start = Number(tok.dataset.start);
      const end = Number(tok.dataset.end);
      addBlank(ws, { line, start, end, answer: (ws.baseLines[line].en || "").slice(start, end) });
      editChanged();
    }
  });
  root.querySelectorAll("tr[data-id] [data-f]").forEach((inp) => inp.addEventListener("change", (e) => {
    const id = Number(e.target.closest("tr").dataset.id);
    const b = ws.blanks.find((x) => x.id === id);
    if (b) { b[e.target.dataset.f] = e.target.value.trim(); app.dirty.preview = app.dirty.online = true; saveWorkDebounced(); }
  }));
  root.querySelectorAll("[data-del]").forEach((btn) => btn.addEventListener("click", () => { removeBlank(ws, Number(btn.dataset.del)); editChanged(); }));
  $("#eFill").onclick = () => { const n = fillAutoBlanks(ws); toast(n ? `빈칸 ${n}개를 추가했습니다.` : "더 추가할 단어가 없습니다.", n ? "ok" : "info"); editChanged(); };
  $("#eCount").onchange = (e) => { ws.options.blankCount = Number(e.target.value); app.dirty.preview = true; saveWorkDebounced(); };
  const em = $("#eMeaning");
  if (em) em.onclick = aiFillMeanings;
  root.querySelectorAll("[data-if]").forEach((inp) => inp.addEventListener("change", (e) => { ws.info[Number(e.target.dataset.ii)][e.target.dataset.if] = e.target.value.trim(); app.dirty.preview = true; saveWorkDebounced(); }));
  root.querySelectorAll("[data-idel]").forEach((btn) => btn.addEventListener("click", () => { ws.info.splice(Number(btn.dataset.idel), 1); editChanged(); }));
  $("#infoAdd").onclick = () => { ws.info.push({ label: "항목", value: "" }); editChanged(); };
  $("#tipEdit").onchange = (e) => { ws.grammarTip = e.target.value.trim(); app.dirty.preview = true; saveWorkDebounced(); };
  root.querySelectorAll("[data-ko]").forEach((inp) => inp.addEventListener("change", (e) => {
    const bi = Number(e.target.dataset.ko);
    ws.baseLines[bi].ko = e.target.value.trim();
    ws.lines = computeLines(ws);
    app.dirty.preview = app.dirty.online = true;
    saveWorkDebounced();
  }));
}

function editChanged() {
  app.dirty = { preview: true, online: true, edit: true };
  const y = window.scrollY;
  renderStep4();
  window.scrollTo(0, y);
  saveWorkDebounced();
}

async function aiFillMeanings() {
  const ws = app.ws;
  const missing = visibleBlanks(ws).filter((b) => !b.meaning);
  if (!missing.length) { toast("비어 있는 뜻이 없습니다.", "info"); return; }
  app.abort = new AbortController();
  showLoading({ title: "단어 뜻을 채우고 있어요", kind: "worksheet", steps: [{ label: `단어 ${missing.length}개의 품사·뜻 (AI)`, state: "run" }], onCancel: () => app.abort.abort() });
  try {
    const m = await fillMeanings({ song: ws.song, words: missing.map((b) => ({ answer: b.answer, context: (ws.baseLines[b.line] || {}).en || "" })), signal: app.abort.signal });
    let n = 0;
    missing.forEach((b, i) => { if (m[i] && m[i].meaning) { b.head = m[i].head || b.head; b.pos = m[i].pos || b.pos; b.meaning = m[i].meaning; n++; } });
    ws.warnings = (ws.warnings || []).filter((w) => !/AI 키 없이/.test(w));
    toast(`뜻 ${n}개를 채웠습니다.`, "ok");
  } catch (e) {
    if (e.code !== "cancelled") toast("뜻을 채우지 못했습니다: " + e.message, "error", 7000);
  } finally {
    hideLoading();
  }
  editChanged();
}

function printWorksheet() {
  const root = $("#printRoot");
  root.innerHTML = renderAllPages(app.ws, app.qr);
  document.body.classList.add("printing");
  const go = () => { window.print(); setTimeout(() => { document.body.classList.remove("printing"); root.innerHTML = ""; }, 500); };
  const imgs = $$("img", root);
  if (!imgs.length) return go();
  Promise.all(imgs.map((im) => (im.complete ? 0 : new Promise((r) => { im.onload = im.onerror = r; })))).then(go);
}

async function downloadDocx() {
  const btn = $("#docxBtn");
  btn.disabled = true;
  const label = btn.textContent;
  btn.textContent = "만드는 중…";
  try {
    const { exportDocx } = await import("./export-docx.js");
    const name = await exportDocx(app.ws, app.qr);
    toast(`‘${name}’ 파일을 내려받았습니다. 한글(HWP)·Word·Google 문서에서 열 수 있습니다.`, "ok", 6000);
  } catch (e) {
    console.error(e);
    toast("DOCX를 만들지 못했습니다: " + (e.message || e), "error", 7000);
  } finally {
    btn.disabled = false;
    btn.textContent = label;
  }
}

/* =================== 작업 저장 =================== */

function saveWork() {
  try {
    const data = {
      grammar: app.grammar, grade: app.grade,
      selected: app.selected ? { song: app.selected.song, videoId: app.selected.videoId, card: { ...app.selected.card } } : null,
      lyrics: $("#lyrics").value,
      ws: app.ws ? { ...app.ws, lines: undefined } : null,
      maxStep: app.maxStep,
      savedAt: Date.now(),
    };
    localStorage.setItem(WORK_KEY, JSON.stringify(data));
  } catch (e) { /* 저장 공간 부족 등은 무시 */ }
}
const saveWorkDebounced = debounce(saveWork, 600);

function restoreWork() {
  let data = null;
  try { data = JSON.parse(localStorage.getItem(WORK_KEY) || "null"); } catch (e) { data = null; }
  if (!data || !data.grammar) return;
  const box = document.createElement("div");
  const title = data.ws ? data.ws.song.title : data.selected ? data.selected.song.title : data.grammar.label;
  box.className = "notice info";
  box.innerHTML = `최근 작업이 있습니다: <b>${esc(title)}</b> (${esc(data.grammar.label)}) <button type="button" class="btn sm" id="resume">이어서 하기</button> <button type="button" class="btn sm ghost" id="discard">지우기</button>`;
  $("#step1 .card").prepend(box);
  $("#resume").onclick = () => {
    box.remove();
    selectGrammar(data.grammar.custom ? data.grammar : (getGrammar(data.grammar.id) || data.grammar));
    app.grade = data.grade || ""; $("#grade").value = app.grade;
    if (data.selected) {
      app.selected = data.selected;
      app.cards = [data.selected.card];
      $("#lyrics").value = data.lyrics || "";
      $("#lyrics").dataset.song = data.selected.song.title;
      $("#s3Sub").textContent = `${data.selected.song.title} — ${data.selected.song.artist} · ${grammarSummaryOf(app.grammar)}`;
      const q = encodeURIComponent(`${data.selected.song.artist} ${data.selected.song.title}`);
      $("#lyrLinks").innerHTML = `<a class="btn sm ghost" href="https://search.naver.com/search.naver?query=${q}+%EA%B0%80%EC%82%AC" target="_blank" rel="noopener">네이버 가사 ↗</a><a class="btn sm ghost" href="https://genius.com/search?q=${q}" target="_blank" rel="noopener">Genius ↗</a>`;
      updateLyricStat();
      unlock(3);
    }
    if (data.ws) {
      app.ws = data.ws;
      app.ws.lines = computeLines(app.ws);
      syncBlankIds(app.ws);
      app.qr = app.ws.song.videoId ? qrDataUrl(watchUrl(app.ws.song.videoId)) : "";
      app.dirty = { preview: true, online: true, edit: true };
      unlock(4);
      unlock(2);
      renderCards();
      goStep(4);
    } else if (data.selected) {
      unlock(2); renderCards(); goStep(3);
    }
  };
  $("#discard").onclick = () => { try { localStorage.removeItem(WORK_KEY); } catch (e) { /* */ } box.remove(); };
}

/* =================== 유틸 =================== */

function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}
