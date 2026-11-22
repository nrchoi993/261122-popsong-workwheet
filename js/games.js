/**
 * Part 2 단어 활동 생성기 (단어 찾기 / 비밀 암호 / 사라진 철자 / 철자 섞기)
 * seed가 같으면 같은 결과가 나와서 미리보기·DOCX·정답지가 일치합니다.
 */

export const GAME_TYPES = {
  wordsearch: { name: "단어 찾기 (Word Search)", short: "단어 찾기", guide: "표 안에 숨어 있는 단어를 찾아 동그라미 하세요. (가로 →, 세로 ↓, 대각선 ↘ ↗)" },
  secret: { name: "비밀 암호 (Secret Code)", short: "비밀 암호", guide: "Secret Code Key를 보고 숫자를 알파벳으로 바꾸어 단어와 문장을 완성하세요." },
  missing: { name: "사라진 철자 (Missing Letters)", short: "사라진 철자", guide: "뜻을 보고 빠진 철자를 채워 단어를 완성하세요." },
  scramble: { name: "철자 섞기 (Word Shuffle)", short: "철자 섞기", guide: "섞인 철자를 바르게 배열하여 단어를 완성하세요." },
};

export function rng(seed) {
  let s = (Number(seed) >>> 0) || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5; s >>>= 0;
    return (s >>> 0) / 4294967296;
  };
}

const letters = (w) => String(w || "").toUpperCase().replace(/[^A-Z]/g, "");

export function buildGame(type, vocab, opts = {}) {
  const rand = rng(opts.seed || 1);
  if (type === "wordsearch") return wordSearch(vocab, rand, opts);
  if (type === "secret") return secretCode(vocab, rand, opts);
  if (type === "missing") return missingLetters(vocab, rand);
  return scramble(vocab, rand);
}

function wordSearch(vocab, rand, opts) {
  // 모든 빈칸 단어를 넣습니다(같은 철자는 한 번만). 다 들어가지 않으면 표를 키워 다시 배치합니다.
  const seen = new Set();
  const all = vocab.map((v) => ({ num: v.num, word: letters(v.head || v.answer), meaning: v.meaning, display: v.head || v.answer })).filter((w) => w.word.length >= 1);
  // 같은 철자는 표에 한 번만 숨기고, 목록에는 번호별로 모두 표시
  const words = all.filter((w) => !seen.has(w.word) && seen.add(w.word));
  const usable = words.filter((w) => w.word.length <= 16);
  const longest = Math.max(8, ...usable.map((w) => w.word.length));
  const dirs = opts.hard ? [[0, 1], [1, 0], [1, 1], [-1, 1], [0, -1], [1, -1]] : [[0, 1], [1, 0], [1, 1], [-1, 1]];
  let best = null;
  const startSize = Math.min(16, Math.max(10, longest + 1, Math.ceil(Math.sqrt(usable.reduce((a, w) => a + w.word.length, 0) * 1.9))));
  for (let size = startSize; size <= 16; size++) {
    for (let attempt = 0; attempt < 6; attempt++) {
      const grid = Array.from({ length: size }, () => Array(size).fill(""));
      const placed = [];
      const sorted = usable.slice().sort((a, b) => b.word.length - a.word.length);
      for (const w of sorted) {
        let ok = false;
        for (let tries = 0; tries < 400 && !ok; tries++) {
          const [dr, dc] = dirs[Math.floor(rand() * dirs.length)];
          const r0 = Math.floor(rand() * size), c0 = Math.floor(rand() * size);
          const rEnd = r0 + dr * (w.word.length - 1), cEnd = c0 + dc * (w.word.length - 1);
          if (rEnd < 0 || rEnd >= size || cEnd < 0 || cEnd >= size) continue;
          let fit = true;
          for (let k = 0; k < w.word.length; k++) {
            const ch = grid[r0 + dr * k][c0 + dc * k];
            if (ch && ch !== w.word[k]) { fit = false; break; }
          }
          if (!fit) continue;
          const cells = [];
          for (let k = 0; k < w.word.length; k++) { grid[r0 + dr * k][c0 + dc * k] = w.word[k]; cells.push([r0 + dr * k, c0 + dc * k]); }
          placed.push({ ...w, cells });
          ok = true;
        }
      }
      if (!best || placed.length > best.placed.length) best = { size, grid, placed };
      if (placed.length === usable.length) break;
    }
    if (best.placed.length === usable.length) break;
  }
  const { size, grid, placed } = best;
  const answerCells = new Set();
  placed.forEach((p) => p.cells.forEach(([r, c]) => answerCells.add(r + "," + c)));
  const ALPHA = "ABCDEFGHIJKLMNOPRSTUWY";
  for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) if (!grid[r][c]) grid[r][c] = ALPHA[Math.floor(rand() * ALPHA.length)];
  const cellsOf = new Map(placed.map((p) => [p.word, p.cells]));
  const order = all.filter((w) => cellsOf.has(w.word)).map((w) => ({ ...w, cells: cellsOf.get(w.word) }));
  const skipped = all.filter((w) => !cellsOf.has(w.word)).map((w) => w.display);
  return { type: "wordsearch", size, grid, words: order, answerCells: Array.from(answerCells), skipped };
}

function encode(word) {
  return letters(word).split("").map((ch) => ch.charCodeAt(0) - 64);
}

function secretCode(vocab, rand, opts) {
  // 모든 빈칸 단어(번호 그대로)
  const easy = vocab.filter((v) => letters(v.head || v.answer).length >= 1).map((v) => ({
    num: v.num, word: letters(v.head || v.answer), display: v.head || v.answer, meaning: v.meaning, code: encode(v.head || v.answer),
  }));
  const hard = (opts.phrases || []).slice(0, 2).map((p) => ({
    phrase: p.text,
    ko: p.ko || "",
    words: p.text.split(/\s+/).map((w) => ({ word: letters(w), code: encode(w) })).filter((w) => w.word),
  }));
  return { type: "secret", easy, hard };
}

function missingLetters(vocab, rand) {
  const items = vocab.filter((v) => letters(v.head || v.answer).length >= 1).map((v) => {
    const word = String(v.head || v.answer);
    const idxs = [];
    for (let i = 0; i < word.length; i++) if (/[A-Za-z]/.test(word[i]) && (i > 0 || word.length <= 2)) idxs.push(i);
    const pick = idxs[Math.floor(rand() * idxs.length)];
    const shown = word.split("").map((ch, i) => (i === pick ? "_" : ch)).join(" ");
    return { num: v.num, word, shown, missing: word[pick].toUpperCase(), meaning: v.meaning };
  });
  return { type: "missing", items };
}

function shuffleWord(word, rand) {
  const arr = letters(word).toLowerCase().split("");
  if (arr.length < 2) return arr.join("");
  for (let t = 0; t < 5; t++) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    if (arr.join("") !== letters(word).toLowerCase()) break;
  }
  return arr.join(" ");
}

function scramble(vocab, rand) {
  const items = vocab.filter((v) => letters(v.head || v.answer).length >= 1).map((v) => ({
    num: v.num, word: v.head || v.answer, shuffled: shuffleWord(v.head || v.answer, rand), meaning: v.meaning,
  }));
  return { type: "scramble", items };
}
