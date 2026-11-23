/**
 * 도움말: 첫 방문 안내 팝업 + 오른쪽 위 [도움말] 버튼으로 여는 단계별 도움말
 */
import { openModal } from "./ui.js";

const WELCOME_KEY = "popsong.welcome.v1";

const STEPS = [
  { n: 1, t: "표현 고르기", d: "2022 개정 교육과정의 언어 형식(표현)을 대분류·소분류로 고릅니다." },
  { n: 2, t: "영상 고르기", d: "그 표현이 들어 있는 팝송 3~6곡이 YouTube 영상과 함께 나옵니다." },
  { n: 3, t: "가사 넣기", d: "가사를 붙여 넣고 빈칸 수·활동 종류를 정합니다. 해석은 AI가 채워 줄 수 있어요." },
  { n: 4, t: "확인·내려받기", d: "활동지를 미리 보고 DOCX·PDF로 받거나, 화면에서 바로 정답을 확인합니다." },
];

export const HELP = [
  {
    id: "start", label: "처음 시작하기", html: `
      <p class="lead">교사가 <b>표현 → 팝송 영상 → 가사 → 활동지</b> 순서로 수업 자료를 만드는 사이트입니다.</p>
      <ol class="help-steps">${STEPS.map((s) => `<li><span class="hs-n">${s.n}</span><div><b>${s.t}</b><p>${s.d}</p></div></li>`).join("")}</ol>
      <div class="help-tip"><b>알아 두면 좋아요</b>
        <ul>
          <li><b>AI 설정은 선택</b>입니다. 키가 없어도 곡 목록·영상·활동지 만들기가 됩니다. 키를 넣으면 곡 추천, 해석 채우기, 단어 뜻 채우기가 더 풍부해집니다.</li>
          <li>작업은 자동 저장됩니다. <b>구글 로그인</b>을 하면 다른 컴퓨터·태블릿에서도 <b>내 작업</b>에서 이어서 할 수 있습니다.</li>
          <li>각 단계 제목 옆 <span class="q-chip">?</span> 를 누르면 그 단계 도움말이 바로 열립니다.</li>
        </ul>
      </div>` },
  {
    id: "s1", label: "1. 표현 고르기", html: `
      <h3>무엇을 하나요?</h3>
      <p>수업에서 다룰 언어 형식(표현)을 정합니다. 이 표현이 들어 있는 팝송을 찾는 기준이 됩니다.</p>
      <h3>사용 방법</h3>
      <ul>
        <li><b>대분류</b>에서 교육과정 [별표 4]의 범주를 고르면, <b>소분류</b>에 세부 표현이 나옵니다.</li>
        <li>이름을 알면 <b>「또는 표현 이름으로 바로 찾기」</b>에 <i>가정법, 현재완료, to부정사</i>처럼 입력해 바로 고를 수 있습니다.</li>
        <li><b>적용 학년</b>은 비워 두면 표현의 권장 학교급에 맞춰 곡을 고릅니다.</li>
        <li><b>영상 찾기 →</b>를 누르면 2단계로 넘어갑니다.</li>
      </ul>
      <div class="help-tip">목록에 없는 표현도 검색창에 쓰고 <b>✎ ‘…’ 표현으로 직접 찾기</b>를 고르면 진행할 수 있습니다(이때는 AI 설정이 있으면 더 잘 찾습니다).</div>` },
  {
    id: "s2", label: "2. 영상 고르기", html: `
      <h3>무엇을 하나요?</h3>
      <p>고른 표현이 들어 있는 팝송을 <b>3~6곡</b> 보여 줍니다. 공식 영상을 먼저 연결하고, 재생이 막힌 영상은 자동으로 다음 후보로 바꿉니다.</p>
      <h3>사용 방법</h3>
      <ul>
        <li>카드의 영상을 재생해 보고, 마음에 드는 곡에서 <b>이 곡으로 진행</b>을 누릅니다.</li>
        <li>카드 아래 <b>공식 영상 / 가사·해석</b> 버튼으로 영상 종류를 바꿀 수 있습니다(가사·한글 자막 영상).</li>
        <li><b>AI로 더 추천받기</b>: AI 설정이 되어 있으면 곡을 더 찾아 줍니다.</li>
        <li><b>곡을 직접 입력하기</b>: 원하는 곡이 없으면 제목·가수(필요하면 YouTube 주소)를 넣어 진행합니다.</li>
      </ul>
      <div class="help-tip">학교 네트워크에서 YouTube가 막혀 있으면 영상이 보이지 않을 수 있습니다. 이때도 곡을 골라 활동지는 만들 수 있습니다.</div>` },
  {
    id: "s3", label: "3. 가사·옵션", html: `
      <h3>무엇을 하나요?</h3>
      <p>가사를 붙여 넣고 활동지의 빈칸·단어 활동을 정합니다. 저작권 때문에 사이트가 가사를 직접 넣어 주지는 않습니다.</p>
      <h3>사용 방법</h3>
      <ul>
        <li>위의 <b>가사 검색 링크</b>(네이버·Genius)에서 가사를 복사해 <b>가사 붙여넣기</b> 칸에 넣습니다. 한글 해석이 함께 있으면 그대로 써도 됩니다.</li>
        <li><b>🏷 AI 구간 표시 붙이기</b>: [Verse 1], [Chorus] 같은 구간 이름을 붙여 줍니다.</li>
        <li><b>🪄 AI 해석 채우기</b>: 영어 줄 바로 아래에 한글 해석을 넣습니다. 그 자리에서 고친 내용이 그대로 활동지에 쓰이고, <b>↶ 되돌리기</b>로 취소할 수 있습니다.</li>
        <li><b>활동지 옵션</b>: 빈칸 수, 빈칸 고르는 기준, Part 1 문제 방식, Part 2 활동(단어 찾기·비밀 암호·사라진 철자·철자 섞기)을 고릅니다.</li>
        <li><b>활동지 만들기 →</b>를 누르면 4단계로 넘어갑니다.</li>
      </ul>
      <div class="help-tip">한 번 AI로 만든 곡 소개·해석은 이 브라우저에 보관되어, 같은 곡을 다시 만들 때는 AI 호출이 줄어듭니다.</div>` },
  {
    id: "s4", label: "4. 확인·내려받기", html: `
      <h3>무엇을 하나요?</h3>
      <p>완성된 활동지를 확인하고, 파일로 내려받거나 화면에서 바로 정답을 확인합니다.</p>
      <h3>활동지 구성</h3>
      <ul>
        <li><b>1쪽</b> 가사와 빈칸(학생용) · <b>2쪽</b> Part 1 단어 확인 + Part 2 단어 활동(학생용) · <b>3쪽</b> 정답 · <b>4쪽</b> 정답이 표시된 가사(교사용)</li>
        <li>쪽마다 내용이 한 장에 들어가도록 글자 크기가 자동으로 맞춰집니다. 1쪽이 넘치면 <b>1쪽에 맞추기</b>를 누르세요(여백 → 글자 크기 순서로 줄입니다).</li>
      </ul>
      <h3>세 가지 화면</h3>
      <ul>
        <li><b>활동지 미리보기</b>: 인쇄될 모습 그대로 봅니다. 글자 크기·여백·DOCX 글꼴, 해석/강조/후렴 접기, Part 1·2 종류를 바로 바꿀 수 있습니다. <b>다시 섞기</b>로 퍼즐을 새로 만듭니다.</li>
        <li><b>온라인 정답 확인</b>: 학생과 함께 화면에서 답을 써 보고 <b>Part별로 채점·정답 보기</b>를 합니다. ‘눌러서 정답 보기’ 모드에서는 빈칸을 누를 때마다 정답이 하나씩 열립니다.</li>
        <li><b>빈칸·단어 편집</b>: 가사의 단어를 눌러 빈칸을 더하거나 빼고, 단어 뜻을 고칩니다.</li>
      </ul>
      <h3>내려받기</h3>
      <ul>
        <li><b>DOCX 다운로드</b>: 한글(HWP)·워드에서 열어 고칠 수 있는 파일입니다.</li>
        <li><b>인쇄 / PDF</b>: 인쇄 창에서 ‘PDF로 저장’을 고르면 PDF가 됩니다.</li>
        <li>위의 <b>수업 영상</b>은 크게 보거나 접을 수 있고, <b>다른 영상</b>으로 바꿀 수 있습니다.</li>
      </ul>` },
  {
    id: "ai", label: "AI 설정", html: `
      <h3>무엇을 하나요?</h3>
      <p>AI 곡 추천, 구간 표시, 해석·단어 뜻 채우기에 쓰는 API 키를 넣습니다. <b>선택 사항</b>입니다.</p>
      <ul>
        <li>오른쪽 위 <b>AI 설정</b> 버튼(또는 1단계 위 설정 상자)에서 <b>제공사</b>(OpenAI · Anthropic · Google Gemini)를 고르고 키를 붙여 넣습니다.</li>
        <li><b>연결 확인</b>을 눌러 실제 요청이 성공해야 <b>요청 성공</b>으로 바뀝니다. 키를 넣기만 하면 <b>연결 미확인</b>으로 표시됩니다.</li>
        <li>키는 <b>이 브라우저에만</b> 저장됩니다. 구글 로그인을 해도 키는 계정에 올라가지 않으니, 다른 기기에서는 다시 넣어 주세요.</li>
        <li>‘이 브라우저에 키 기억하기’를 끄면 탭을 닫을 때 키가 지워집니다. 공용 컴퓨터에서는 꺼 두세요.</li>
      </ul>` },
  {
    id: "works", label: "내 작업·로그인", html: `
      <h3>작업 저장</h3>
      <ul>
        <li>곡을 고른 순간부터 작업이 <b>자동 저장</b>됩니다(가사, 해석, 빈칸, 옵션, 편집 내용 모두).</li>
        <li>로그인하지 않으면 <b>이 브라우저에만</b> 저장됩니다. 다른 브라우저나 기기에서는 보이지 않습니다.</li>
      </ul>
      <h3>구글 로그인</h3>
      <ul>
        <li>오른쪽 위 <b>로그인</b>을 누르면 구글 계정으로 로그인합니다. 이후 작업은 계정에 저장되어 <b>어느 기기에서든</b> 이어서 할 수 있습니다.</li>
        <li>헤더의 <b>저장 상태</b>(저장 중… / 계정에 저장됨)로 저장 여부를 확인할 수 있습니다.</li>
      </ul>
      <h3>내 작업</h3>
      <ul>
        <li><b>내 작업</b>을 누르면 작업 중이거나 이전에 만든 팝송 목록이 최근 순으로 나옵니다. 곡·가수·표현으로 검색하고, <b>열기</b>로 이어서 하거나 <b>삭제</b>할 수 있습니다.</li>
        <li>로그인 전에 이 브라우저에서 만든 작업은 <b>계정에 올리기</b>로 옮길 수 있습니다.</li>
        <li><b>+ 새 작업</b>으로 처음부터 시작해도 이전 작업은 목록에 남아 있습니다.</li>
      </ul>` },
];

export function openHelp(section = "start") {
  const tabs = HELP.map((h) => `<button type="button" role="tab" class="help-tab" data-h="${h.id}" aria-selected="false">${h.label}</button>`).join("");
  const d = openModal({
    title: "도움말",
    wide: true,
    cls: "help-modal",
    html: `<div class="help"><div class="help-tabs" role="tablist" aria-label="도움말 항목">${tabs}</div><div class="help-body" role="tabpanel" tabindex="0"></div></div>`,
  });
  const show = (id) => {
    const h = HELP.find((x) => x.id === id) || HELP[0];
    d.querySelectorAll(".help-tab").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.h === h.id)));
    const body = d.querySelector(".help-body");
    body.innerHTML = `<h2 class="help-title">${h.label}</h2>${h.html}`;
    body.scrollTop = 0;
    const tab = d.querySelector(`.help-tab[data-h="${h.id}"]`);
    if (tab && tab.scrollIntoView) tab.scrollIntoView({ block: "nearest", inline: "nearest" });
  };
  d.querySelector(".help-tabs").addEventListener("click", (e) => { const b = e.target.closest(".help-tab"); if (b) show(b.dataset.h); });
  show(section);
  return d;
}

/** 첫 방문 때 한 번만 보이는 간단 안내 */
export function maybeWelcome() {
  let seen = false;
  try { seen = !!localStorage.getItem(WELCOME_KEY); } catch (e) { seen = true; }
  if (seen) return false;
  const d = openModal({
    title: "팝송 문법 활동지에 오신 것을 환영합니다",
    cls: "welcome-modal",
    html: `
      <p class="lead">교육과정 표현이 들어 있는 팝송으로 <b>영상 + 활동지 + 정답 확인</b>까지 한 번에 만듭니다.</p>
      <ol class="help-steps compact">${STEPS.map((s) => `<li><span class="hs-n">${s.n}</span><div><b>${s.t}</b><p>${s.d}</p></div></li>`).join("")}</ol>
      <p class="muted small">AI 키는 없어도 됩니다 · 구글 로그인하면 다른 기기에서도 이어서 작업 · 오른쪽 위 <b>도움말</b>에서 단계별 설명을 언제든 다시 볼 수 있어요.</p>
      <div class="modal-actions"><button type="button" class="btn ghost" data-more>도움말 자세히</button><button type="button" class="btn primary" data-close>시작하기</button></div>`,
    onClose: () => { try { localStorage.setItem(WELCOME_KEY, "1"); } catch (e) { /* */ } },
  });
  d.querySelector("[data-more]").addEventListener("click", () => { d.close(); openHelp("start"); });
  return true;
}
