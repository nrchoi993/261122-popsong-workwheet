/** 공용 UI: 진행 팝업(5~10초마다 문구 변경), 토스트, QR */

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

export const MESSAGES = {
  recommend: [
    "교육과정 표현이 들어간 곡을 고르고 있어요 🎵",
    "가사 속에서 표현이 실제로 쓰였는지 확인하고 있어요",
    "학생들이 좋아할 만한 곡인지 살펴보는 중이에요",
    "학년 수준과 어휘 난도를 맞춰 보고 있어요",
    "선정적이거나 수업에 맞지 않는 곡은 걸러내고 있어요",
    "추천 이유를 한국어로 정리하는 중이에요",
    "좋은 곡일수록 고르기가 어렵네요. 조금만 기다려 주세요 😊",
    "AI 응답이 평소보다 길어지고 있어요. 곧 결과를 보여 드릴게요",
  ],
  worksheet: [
    "가사를 한 줄씩 읽고 있어요 📖",
    "빈칸으로 만들 핵심 단어를 고르는 중이에요",
    "오늘의 표현이 쓰인 구절에 밑줄을 긋고 있어요",
    "단어의 품사와 뜻을 정리하고 있어요",
    "학생 눈높이에 맞게 가사 해석을 다듬고 있어요",
    "가수·앨범 소개를 준비하고 있어요",
    "정답지를 맞춰 보는 중이에요 ✅",
    "가사가 길면 조금 더 걸릴 수 있어요. 거의 다 됐어요!",
  ],
  translate: [
    "가사를 한 줄씩 읽고 있어요 📖",
    "반복되는 후렴은 한 번만 번역해 시간을 아끼는 중이에요",
    "노래 분위기에 맞는 우리말 표현을 고르고 있어요",
    "학생 눈높이에 맞게 해석을 다듬고 있어요",
    "거의 다 됐어요! 영어 줄 아래에 해석을 붙이는 중이에요",
  ],
  connect: [
    "제공사에 테스트 요청을 보내고 있어요",
    "응답을 기다리는 중이에요",
  ],
};

const TIPS = [
  "Tip: 활동지 미리보기에서 단어를 눌러 빈칸을 바꿀 수 있어요.",
  "Tip: ‘온라인 정답 확인’ 탭은 수업 화면에 띄워 함께 풀기 좋아요.",
  "Tip: 영상이 재생되지 않으면 자동으로 다른 영상으로 바뀌어요.",
  "Tip: 반복되는 후렴은 ‘[Chorus] 반복’으로 접혀 한 장에 들어가요.",
];

let popTimer = null;
let tickTimer = null;
let started = 0;

export function showLoading({ title, kind = "recommend", steps = [], onCancel }) {
  const pop = $("#loadingPop");
  $("#lpTitle").textContent = title || "처리 중입니다";
  const msgs = (MESSAGES[kind] || MESSAGES.recommend).slice();
  let i = 0;
  const msgEl = $("#lpMsg");
  const tipEl = $("#lpTip");
  msgEl.textContent = msgs[0];
  tipEl.textContent = TIPS[Math.floor(Math.random() * TIPS.length)];
  renderSteps(steps);
  pop.hidden = false;
  document.body.classList.add("is-busy");
  started = Date.now();
  $("#lpTime").textContent = "0초";
  clearInterval(tickTimer);
  tickTimer = setInterval(() => { $("#lpTime").textContent = Math.round((Date.now() - started) / 1000) + "초"; }, 1000);
  clearTimeout(popTimer);
  const rotate = () => {
    i = (i + 1) % msgs.length;
    msgEl.classList.add("fade");
    setTimeout(() => {
      msgEl.textContent = msgs[i];
      msgEl.classList.remove("fade");
      if (i % 2 === 0) tipEl.textContent = TIPS[Math.floor(Math.random() * TIPS.length)];
    }, 250);
    popTimer = setTimeout(rotate, 5000 + Math.random() * 3000); // 5~8초 간격
  };
  popTimer = setTimeout(rotate, 5000 + Math.random() * 2000);
  const cancel = $("#lpCancel");
  cancel.hidden = !onCancel;
  cancel.onclick = () => { if (onCancel) onCancel(); };
  setTimeout(() => cancel.focus(), 50);
}

function renderSteps(steps) {
  $("#lpSteps").innerHTML = steps.map((s, idx) => `<li data-i="${idx}" class="${s.state || "wait"}"><span class="ic"></span>${s.label}</li>`).join("");
}

export function setLoadingStep(idx, state) {
  const li = $(`#lpSteps li[data-i="${idx}"]`);
  if (li) li.className = state;
}

export function hideLoading() {
  clearTimeout(popTimer);
  clearInterval(tickTimer);
  $("#loadingPop").hidden = true;
  document.body.classList.remove("is-busy");
}

export function toast(text, type = "info", ms = 4500) {
  const box = $("#toasts");
  const el = document.createElement("div");
  el.className = "toast " + type;
  el.setAttribute("role", type === "error" ? "alert" : "status");
  el.innerHTML = `<span></span><button type="button" aria-label="닫기">×</button>`;
  el.firstChild.textContent = text;
  el.lastChild.onclick = () => el.remove();
  box.appendChild(el);
  setTimeout(() => el.classList.add("out"), ms);
  setTimeout(() => el.remove(), ms + 400);
}

/** URL → PNG dataURL (vendor/qrcode.js 사용) */
export function qrDataUrl(text, px = 220) {
  try {
    if (!window.qrcode || !text) return "";
    const qr = window.qrcode(0, "M");
    qr.addData(text);
    qr.make();
    const n = qr.getModuleCount();
    const quiet = 2;
    const cell = Math.max(2, Math.floor(px / (n + quiet * 2)));
    const size = cell * (n + quiet * 2);
    const c = document.createElement("canvas");
    c.width = size; c.height = size;
    const g = c.getContext("2d");
    g.fillStyle = "#fff"; g.fillRect(0, 0, size, size);
    g.fillStyle = "#000";
    for (let r = 0; r < n; r++) for (let col = 0; col < n; col++) if (qr.isDark(r, col)) g.fillRect((col + quiet) * cell, (r + quiet) * cell, cell, cell);
    return c.toDataURL("image/png");
  } catch (e) {
    return "";
  }
}
