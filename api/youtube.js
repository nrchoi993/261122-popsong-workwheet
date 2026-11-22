/**
 * GET /api/youtube?title=...&artist=...
 * 곡 제목/가수로 YouTube 영상을 찾고, 실제로 "다른 사이트에 삽입(embed) 가능한" 영상만 돌려줍니다.
 *
 * 1) 검색: Vercel 환경변수 YOUTUBE_API_KEY(또는 요청의 ytKey)가 있으면 YouTube Data API v3 사용,
 *    없으면 YouTube 검색 결과 페이지에서 영상 ID를 읽습니다.
 * 2) 검증: oEmbed로 삽입 가능 여부 확인 (401 = 삽입 금지, 404 = 없음/비공개)
 * 3) 분류: official(공식) / lyrics(가사·한글 해석) 후보 목록
 */


const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const BAD_WORDS = /(cover|reaction|karaoke|instrumental|inst\.|1\s?hour|10\s?hours|sped\s?up|slowed|nightcore|8d|remix|piano ver|tutorial|lesson|커버|반응|노래방|1시간|mr\b)/i;
const KO_LYRIC_WORDS = /(가사|해석|번역|한글|한국어|자막|lyrics?\s*\/\s*한)/i;

export default async function handler(req, res) {
  const q = req.query || {};
  const title = String(q.title || "").slice(0, 120).trim();
  const artist = String(q.artist || "").slice(0, 120).trim();
  const ytKey = String(q.ytKey || process.env.YOUTUBE_API_KEY || "").trim();
  if (!title) return res.status(400).json({ ok: false, error: "title이 필요합니다." });

  const base = (artist ? artist + " " : "") + title;
  const searchUrl = "https://www.youtube.com/results?search_query=" + encodeURIComponent(base);

  try {
    const [officialRaw, lyricsRaw] = await Promise.all([
      search(base + " official", ytKey).catch(() => []),
      search(base + " 가사 해석", ytKey).catch(() => []),
    ]);

    const officialCands = rankOfficial(officialRaw, title, artist).slice(0, 5);
    const lyricCands = rankLyrics(lyricsRaw, title).slice(0, 5);

    const [official, lyrics] = await Promise.all([
      verifyEmbeddable(officialCands, 3),
      verifyEmbeddable(lyricCands.filter((c) => !officialCands.some((o) => o.id === c.id)), 3),
    ]);

    const source = ytKey ? "data-api" : "search-page";
    const ok = official.length + lyrics.length > 0;
    if (ok) res.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=604800");
    else res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({ ok, source, official, lyrics, searchUrl });
  } catch (e) {
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({ ok: false, source: "error", official: [], lyrics: [], searchUrl, error: String(e && e.message || e) });
  }
}

async function search(query, ytKey) {
  if (ytKey) return searchDataApi(query, ytKey);
  return searchPage(query);
}

async function searchDataApi(query, key) {
  const url = "https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoEmbeddable=true&maxResults=10&regionCode=KR&q=" +
    encodeURIComponent(query) + "&key=" + encodeURIComponent(key);
  const r = await fetchWithTimeout(url, {}, 8000);
  if (!r.ok) throw new Error("data api " + r.status);
  const j = await r.json();
  return (j.items || []).map((it) => ({
    id: it.id && it.id.videoId,
    title: decodeEntities(it.snippet && it.snippet.title || ""),
    channel: decodeEntities(it.snippet && it.snippet.channelTitle || ""),
    verified: false,
  })).filter((v) => v.id);
}

async function searchPage(query) {
  const url = "https://www.youtube.com/results?search_query=" + encodeURIComponent(query) + "&sp=EgIQAQ%253D%253D&hl=ko&gl=KR";
  const r = await fetchWithTimeout(url, {
    headers: {
      "User-Agent": UA,
      "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
      Cookie: "CONSENT=YES+1; SOCS=CAI",
    },
  }, 9000);
  if (!r.ok) throw new Error("search page " + r.status);
  const html = await r.text();
  const m = html.match(/var ytInitialData\s*=\s*(\{[\s\S]*?\});\s*<\/script>/) || html.match(/ytInitialData"\]\s*=\s*(\{[\s\S]*?\});/);
  if (!m) return [];
  let data;
  try { data = JSON.parse(m[1]); } catch (e) { return []; }
  const out = [];
  walk(data, (node) => {
    if (node && node.videoRenderer && node.videoRenderer.videoId) {
      const v = node.videoRenderer;
      const badges = JSON.stringify(v.ownerBadges || []);
      out.push({
        id: v.videoId,
        title: textOf(v.title),
        channel: textOf(v.ownerText) || textOf(v.longBylineText),
        length: v.lengthText && v.lengthText.simpleText || "",
        verified: /VERIFIED_ARTIST|OFFICIAL_ARTIST|CHECK_CIRCLE_THICK|BADGE_STYLE_TYPE_VERIFIED/.test(badges),
        artistBadge: /VERIFIED_ARTIST|OFFICIAL_ARTIST/.test(badges),
      });
    }
  });
  return out.slice(0, 15);
}

function walk(node, fn, depth = 0) {
  if (!node || typeof node !== "object" || depth > 40) return;
  fn(node);
  if (Array.isArray(node)) node.forEach((n) => walk(n, fn, depth + 1));
  else Object.keys(node).forEach((k) => walk(node[k], fn, depth + 1));
}

function textOf(t) {
  if (!t) return "";
  if (t.simpleText) return t.simpleText;
  if (Array.isArray(t.runs)) return t.runs.map((r) => r.text).join("");
  return "";
}

function norm(s) {
  return String(s || "").toLowerCase().replace(/[^a-z0-9가-힣]/g, "");
}

function rankOfficial(list, title, artist) {
  const nt = norm(title);
  const na = norm(artist);
  return dedupe(list)
    .filter((v) => !BAD_WORDS.test(v.title))
    .map((v) => {
      const t = norm(v.title);
      const ch = norm(v.channel);
      let s = 0;
      if (nt && t.includes(nt)) s += 30;
      if (na && (ch.includes(na) || na.includes(ch.replace(/vevo$/, "")))) s += 30;
      if (/vevo$/.test(ch)) s += 25;
      if (v.artistBadge) s += 25;
      if (/official\s*(music\s*)?video|official\s*m\/?v|\bm\/v\b|뮤직비디오/i.test(v.title)) s += 20;
      if (/official\s*(lyric|audio|visualizer)/i.test(v.title)) s += 12;
      if (/live|concert|performance|직캠|무대/i.test(v.title)) s -= 15;
      if (KO_LYRIC_WORDS.test(v.title)) s -= 10;
      return { ...v, score: s, kind: "official" };
    })
    .filter((v) => v.score >= 25)
    .sort((a, b) => b.score - a.score);
}

function rankLyrics(list, title) {
  const nt = norm(title);
  return dedupe(list)
    .filter((v) => !BAD_WORDS.test(v.title))
    .map((v) => {
      const t = norm(v.title);
      let s = 0;
      if (nt && t.includes(nt)) s += 30;
      if (KO_LYRIC_WORDS.test(v.title)) s += 30;
      if (/lyrics?/i.test(v.title)) s += 8;
      return { ...v, score: s, kind: "lyrics" };
    })
    .filter((v) => v.score >= 30)
    .sort((a, b) => b.score - a.score);
}

function dedupe(list) {
  const seen = new Set();
  return (list || []).filter((v) => v && v.id && !seen.has(v.id) && seen.add(v.id));
}

async function verifyEmbeddable(cands, limit) {
  const checks = await Promise.all(cands.map(async (c) => {
    try {
      const url = "https://www.youtube.com/oembed?format=json&url=" + encodeURIComponent("https://www.youtube.com/watch?v=" + c.id);
      const r = await fetchWithTimeout(url, { headers: { "User-Agent": UA } }, 5000);
      if (r.status !== 200) return null; // 401: 삽입 금지, 404/400: 없음
      const j = await r.json();
      return {
        id: c.id,
        title: j.title || c.title,
        channel: j.author_name || c.channel,
        kind: c.kind,
        length: c.length || "",
      };
    } catch (e) {
      return null;
    }
  }));
  return checks.filter(Boolean).slice(0, limit);
}

async function fetchWithTimeout(url, init, ms) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

function decodeEntities(s) {
  return String(s).replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}
