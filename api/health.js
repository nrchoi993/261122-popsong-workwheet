/** GET /api/health — 서버(Vercel 함수)가 살아 있는지 확인합니다. */
export default function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({ ok: true, youtubeDataApi: !!process.env.YOUTUBE_API_KEY, time: new Date().toISOString() });
}
