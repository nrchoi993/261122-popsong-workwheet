/**
 * YouTube 영상 찾기·재생
 * - /api/youtube 가 '삽입 가능' 검증을 마친 후보(공식 → 가사·해석)를 돌려줍니다.
 * - 재생은 YouTube IFrame Player API로 하며, 재생 오류(101/150/153 등)가 나면 다음 후보로 자동 전환합니다.
 * - Error 153(참조자 누락) 방지를 위해 페이지 Referrer-Policy를 strict-origin-when-cross-origin으로 둡니다(vercel.json, index.html).
 */

const cache = new Map();

export function parseYouTubeId(url) {
  const s = String(url || "").trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
  const pats = [/[?&]v=([A-Za-z0-9_-]{11})/, /youtu\.be\/([A-Za-z0-9_-]{11})/, /youtube(?:-nocookie)?\.com\/(?:embed|shorts|live|v)\/([A-Za-z0-9_-]{11})/];
  for (const p of pats) { const m = s.match(p); if (m) return m[1]; }
  return "";
}

export function watchUrl(id) { return "https://www.youtube.com/watch?v=" + id; }
export function searchUrl(title, artist) { return "https://www.youtube.com/results?search_query=" + encodeURIComponent((artist ? artist + " " : "") + title); }

export async function resolveVideos(song, ytKey) {
  const key = (song.artist + "|" + song.title).toLowerCase();
  if (cache.has(key)) return cache.get(key);
  try {
    const ss = sessionStorage.getItem("yt:" + key);
    if (ss) { const v = JSON.parse(ss); cache.set(key, v); return v; }
  } catch (e) { /* ignore */ }

  const p = (async () => {
    const qs = new URLSearchParams({ title: song.title, artist: song.artist || "" });
    if (ytKey) qs.set("ytKey", ytKey);
    let data = null;
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 25000);
      const res = await fetch("/api/youtube?" + qs.toString(), { signal: ctrl.signal });
      clearTimeout(t);
      if (res.ok) data = await res.json();
    } catch (e) { data = null; }
    const out = {
      ok: !!(data && data.ok),
      server: !!data,
      official: (data && data.official) || [],
      lyrics: (data && data.lyrics) || [],
      searchUrl: (data && data.searchUrl) || searchUrl(song.title, song.artist),
    };
    if (out.ok) { try { sessionStorage.setItem("yt:" + key, JSON.stringify(out)); } catch (e) { /* ignore */ } }
    return out;
  })();
  cache.set(key, p);
  const v = await p;
  cache.set(key, v);
  return v;
}

/* ---------- IFrame API ---------- */

let apiPromise = null;
function loadApi() {
  if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve, reject) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { if (prev) try { prev(); } catch (e) { /* */ } resolve(window.YT); };
    const s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    s.async = true;
    s.onerror = () => { apiPromise = null; reject(new Error("YouTube 플레이어를 불러오지 못했습니다. 학교 네트워크에서 YouTube가 차단되었는지 확인해 주세요.")); };
    document.head.appendChild(s);
    setTimeout(() => { if (!(window.YT && window.YT.Player)) { apiPromise = null; reject(new Error("YouTube 플레이어 로딩 시간이 초과되었습니다.")); } }, 15000);
  });
  return apiPromise;
}

const ERROR_TEXT = {
  2: "영상 주소가 올바르지 않습니다.",
  5: "브라우저에서 이 영상을 재생할 수 없습니다.",
  100: "영상이 삭제되었거나 비공개입니다.",
  101: "영상 소유자가 다른 사이트에서의 재생을 막았습니다.",
  150: "영상 소유자가 다른 사이트에서의 재생을 막았습니다.",
  153: "플레이어 설정 오류(참조자 정보 누락)입니다.",
};

/**
 * 컨테이너에 플레이어를 만듭니다.
 * @param container HTMLElement
 * @param candidates [{id,title,channel,kind}]
 * @param hooks { onSwitch(cand, reason), onFail(lastError), autoplay }
 * @returns controller { play(index), destroy(), current() }
 */
export function mountPlayer(container, candidates, hooks = {}) {
  let idx = 0;
  let player = null;
  let destroyed = false;
  const list = candidates.slice();

  const ctrl = {
    current: () => list[idx],
    index: () => idx,
    list: () => list,
    destroy() { destroyed = true; try { player && player.destroy(); } catch (e) { /* */ } container.innerHTML = ""; },
    async play(i, autoplay = true) {
      idx = i;
      const cand = list[idx];
      if (!cand) return;
      container.innerHTML = '<div class="yt-target"></div>';
      const target = container.firstChild;
      try {
        const YT = await loadApi();
        if (destroyed) return;
        player = new YT.Player(target, {
          videoId: cand.id,
          host: "https://www.youtube.com",
          playerVars: { rel: 0, playsinline: 1, modestbranding: 1, autoplay: autoplay ? 1 : 0, origin: location.origin },
          events: {
            onError: (ev) => {
              const reason = ERROR_TEXT[ev.data] || "재생 오류(" + ev.data + ")";
              if (idx + 1 < list.length) {
                hooks.onSwitch && hooks.onSwitch(list[idx + 1], reason);
                ctrl.play(idx + 1, true);
              } else {
                hooks.onFail && hooks.onFail(reason);
              }
            },
          },
        });
        const iframe = container.querySelector("iframe");
        if (iframe) iframe.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
      } catch (e) {
        hooks.onFail && hooks.onFail(e.message);
      }
    },
  };
  return ctrl;
}

export function thumbUrl(id) { return "https://i.ytimg.com/vi/" + id + "/mqdefault.jpg"; }
