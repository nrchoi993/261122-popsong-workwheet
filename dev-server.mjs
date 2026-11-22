/**
 * 내 컴퓨터에서 미리 실행해 보기 (Vercel 없이)
 *   node dev-server.mjs   → http://localhost:3000
 * 정적 파일과 /api/* 함수를 Vercel과 비슷하게 실행합니다. (Node 18 이상)
 */
import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = fileURLToPath(new URL(".", import.meta.url));
const PORT = Number(process.env.PORT) || 3000;
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon", ".md": "text/plain; charset=utf-8" };

function wrapRes(res) {
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (obj) => { if (!res.getHeader("Content-Type")) res.setHeader("Content-Type", "application/json; charset=utf-8"); res.end(JSON.stringify(obj)); return res; };
  return res;
}

async function readBody(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  try { return raw ? JSON.parse(raw) : {}; } catch (e) { return raw; }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  try {
    if (url.pathname.startsWith("/api/")) {
      const name = url.pathname.slice(5).replace(/[^a-z0-9_-]/gi, "");
      const mod = await import(pathToFileURL(join(ROOT, "api", name + ".js")).href + "?t=" + Date.now());
      req.query = Object.fromEntries(url.searchParams);
      req.body = req.method === "POST" ? await readBody(req) : undefined;
      return await mod.default(req, wrapRes(res));
    }
    let p = normalize(decodeURIComponent(url.pathname)).replace(/^([/\\])+/, "");
    if (!p || p.endsWith("/")) p += "index.html";
    if (p.startsWith("..") || p.startsWith("api")) { res.statusCode = 403; return res.end("forbidden"); }
    const file = join(ROOT, p);
    const st = await stat(file).catch(() => null);
    if (!st || !st.isFile()) { res.statusCode = 404; return res.end("not found"); }
    res.setHeader("Content-Type", TYPES[extname(file)] || "application/octet-stream");
    res.end(await readFile(file));
  } catch (e) {
    console.error(e);
    res.statusCode = 500;
    res.end("server error: " + e.message);
  }
});

server.listen(PORT, () => console.log(`▶ http://localhost:${PORT} 에서 실행 중 (종료: Ctrl+C)`));
