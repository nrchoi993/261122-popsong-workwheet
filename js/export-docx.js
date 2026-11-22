/**
 * 활동지 DOCX 내보내기 (Word·한글·Google 문서에서 열 수 있음)
 *  1쪽: 머리표 + 곡 정보 + 가사(2단, 빈칸)
 *  2쪽: Part 1 Vocabulary Check + Part 2 단어 활동
 *  3쪽~: Answer Key
 */
import { visibleBlanks, vocabList, vocabCheckRows, threeColumnRows, gameData } from "./worksheet.js";
import { segmentLine } from "./lyrics.js";
import { findGrammarRanges } from "./data/grammar-catalog.js";
import { GAME_TYPES } from "./games.js";

let loading = null;
function loadDocx() {
  if (window.docx) return Promise.resolve(window.docx);
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "vendor/docx.iife.js";
    s.onload = () => resolve(window.docx);
    s.onerror = () => { loading = null; reject(new Error("문서 생성 도구를 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요.")); };
    document.head.appendChild(s);
  });
  return loading;
}

function dataUrlToBytes(dataUrl) {
  const b64 = String(dataUrl).split(",")[1] || "";
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export async function exportDocx(ws, qrDataUrl) {
  const d = await loadDocx();
  const {
    Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType,
    BorderStyle, ImageRun, SectionType, ShadingType, VerticalAlign, TableLayoutType, UnderlineType,
  } = d;

  const FONT = { ascii: "Arial", hAnsi: "Arial", eastAsia: "Malgun Gothic", cs: "Arial" };
  const pt = (n) => Math.round(n * 2);
  const base = ws.options.fontSize || 10;
  const NAVY = "1F4E79";
  const GRAY = "666666";
  const PAGE = { size: { width: 11906, height: 16838 }, margin: { top: 680, bottom: 680, left: 720, right: 720 } };
  const CONTENT_W = 11906 - 1440;

  const run = (text, o = {}) => new TextRun({ text: String(text == null ? "" : text), font: FONT, size: pt(o.size || base), bold: o.bold, italics: o.italics, color: o.color, underline: o.underline ? { type: UnderlineType.SINGLE } : undefined, shading: o.shade ? { type: ShadingType.CLEAR, fill: o.shade, color: "auto" } : undefined });
  const para = (children, o = {}) => new Paragraph({ children: Array.isArray(children) ? children : [children], alignment: o.align, spacing: { before: o.before || 0, after: o.after == null ? 40 : o.after, line: o.line }, keepNext: o.keepNext, keepLines: true });
  const border = { style: BorderStyle.SINGLE, size: 4, color: "999999" };
  const borders = { top: border, bottom: border, left: border, right: border };
  const cell = (children, o = {}) => new TableCell({
    children: Array.isArray(children) ? children : [children],
    width: o.w ? { size: o.w, type: WidthType.DXA } : undefined,
    rowSpan: o.rowSpan, columnSpan: o.colSpan,
    verticalAlign: o.vAlign || VerticalAlign.CENTER,
    shading: o.fill ? { type: ShadingType.CLEAR, fill: o.fill, color: "auto" } : undefined,
    margins: { top: o.pad == null ? 60 : o.pad, bottom: o.pad == null ? 60 : o.pad, left: 80, right: 80 },
    borders,
  });
  const table = (rows, widths) => new Table({ rows, width: { size: widths.reduce((a, b) => a + b, 0), type: WidthType.DXA }, columnWidths: widths, layout: TableLayoutType.FIXED });
  const partTitle = (t) => para(run(t, { bold: true, size: base + 3, color: NAVY }), { before: 160, after: 60 });
  const guide = (t) => para(run(t, { size: base - 0.5, color: "444444" }), { after: 80 });

  /* ----- 1쪽 ----- */
  const head = table([
    new TableRow({ children: [
      cell(para(run("Let's Sing", { bold: true, size: base + 3, color: "FFFFFF" }), { align: AlignmentType.CENTER }), { w: 1500, rowSpan: 2, fill: NAVY }),
      cell(para(run(ws.song.title, { bold: true, size: base + 6, color: NAVY }), { align: AlignmentType.CENTER }), { w: 5400 }),
      cell(para(run("학번", { bold: true }), { align: AlignmentType.CENTER }), { w: 1000, fill: "EEF3F8" }),
      cell(para(run("")), { w: CONTENT_W - 7900 }),
    ] }),
    new TableRow({ children: [
      cell(para(run(ws.song.artist, { bold: true, size: base + 1, color: "333333" }), { align: AlignmentType.CENTER }), { w: 5400 }),
      cell(para(run("이름", { bold: true }), { align: AlignmentType.CENTER }), { w: 1000, fill: "EEF3F8" }),
      cell(para(run("")), { w: CONTENT_W - 7900 }),
    ] }),
  ], [1500, 5400, 1000, CONTENT_W - 7900]);

  const infoParas = (ws.info || []).filter((f) => f.value).map((f) => para([run(f.label + "  ", { bold: true, color: NAVY, size: base - 0.5 }), run(f.value, { size: base - 0.5 })], { after: 30 }));
  const g = ws.grammar;
  infoParas.push(para([run("오늘의 표현  ", { bold: true, color: "FFFFFF", shade: NAVY, size: base - 0.5 }), run(" " + g.label, { bold: true, size: base - 0.5 }), run(g.form ? ` (${g.form})` : "", { size: base - 0.5, color: GRAY })], { before: 40, after: 20 }));
  if (ws.grammarTip) infoParas.push(para(run(ws.grammarTip, { size: base - 1, color: "333333" }), { after: 0 }));

  const infoRowCells = [];
  if (qrDataUrl) {
    infoRowCells.push(cell([
      new Paragraph({ alignment: AlignmentType.CENTER, children: [new ImageRun({ type: "png", data: dataUrlToBytes(qrDataUrl), transformation: { width: 78, height: 78 } })] }),
      para(run("영상 QR", { size: 7.5, color: GRAY }), { align: AlignmentType.CENTER, after: 0 }),
    ], { w: 1500, fill: "F7F9FC" }));
  }
  infoRowCells.push(cell(infoParas.length ? infoParas : [para(run(""))], { w: qrDataUrl ? CONTENT_W - 1500 : CONTENT_W, vAlign: VerticalAlign.TOP, pad: 80 }));
  const info = table([new TableRow({ children: infoRowCells })], qrDataUrl ? [1500, CONTENT_W - 1500] : [CONTENT_W]);

  const blanksByBase = new Map();
  visibleBlanks(ws).forEach((b) => { if (!blanksByBase.has(b.line)) blanksByBase.set(b.line, []); blanksByBase.get(b.line).push(b); });

  const highlights = (line) => {
    if (!ws.options.highlight || line.type !== "lyric" || !line.en) return [];
    const ai = (ws.grammarHL || []).filter((h) => h.line === line.base);
    return ai.length ? ai : findGrammarRanges(ws.grammar, line.en);
  };

  const lyricParas = (answerMode) => {
    const out = [];
    ws.lines.forEach((line) => {
      if (line.type === "break") { out.push(para(run("", { size: base - 4 }), { after: 0 })); return; }
      if (line.type === "label") { out.push(para(run(line.en, { bold: true, color: NAVY, size: base - 0.5 }), { after: 20, keepNext: true })); return; }
      if (line.type === "repeat") { out.push(para(run(line.en, { italics: true, color: GRAY, size: base - 0.5 }), { after: 40 })); return; }
      const segs = segmentLine(line.en || "", blanksByBase.get(line.base) || [], highlights(line));
      const runs = segs.map((s) => {
        if (s.kind === "blank") {
          const b = s.blank;
          if (answerMode) return [run(b.num + ") ", { size: base - 1.5, color: GRAY }), run(b.answer, { bold: true, color: "C00000" })];
          return [run(b.num + ")", { size: base - 1.5, bold: true }), run("_".repeat(Math.max(8, Math.min(16, b.answer.length + 5))))];
        }
        if (s.kind === "hl") return [run(s.text, { bold: true, underline: true })];
        return [run(s.text)];
      }).flat();
      const hasKo = ws.options.translation && line.ko;
      out.push(new Paragraph({ children: runs, spacing: { after: hasKo ? 0 : 60 }, keepNext: !!hasKo, keepLines: true }));
      if (hasKo) out.push(para(run(line.ko, { size: base - 1.5, color: GRAY }), { after: 70 }));
    });
    return out;
  };

  /* ----- 2쪽 ----- */
  const vocabTable = (answer) => {
    const W = [420, 1500, 1595];
    const header = new TableRow({ tableHeader: true, children: [0, 1, 2].flatMap(() => [
      cell(para(run(""), { after: 0 }), { w: W[0], fill: "EEF3F8" }),
      cell(para(run("단어", { bold: true, color: NAVY }), { align: AlignmentType.CENTER, after: 0 }), { w: W[1], fill: "EEF3F8" }),
      cell(para(run("뜻", { bold: true, color: NAVY }), { align: AlignmentType.CENTER, after: 0 }), { w: W[2], fill: "EEF3F8" }),
    ]) });
    const rows = threeColumnRows(vocabCheckRows(ws)).map((r) => new TableRow({ children: r.flatMap((it) => {
      if (!it) return [cell(para(run(""), { after: 0 }), { w: W[0] }), cell(para(run(""), { after: 0 }), { w: W[1] }), cell(para(run(""), { after: 0 }), { w: W[2] })];
      const showW = answer || it.show === "word";
      const showM = answer || it.show === "meaning";
      const wRed = answer && it.show === "meaning";
      const mRed = answer && it.show === "word";
      return [
        cell(para(run(it.num, { bold: true, size: base - 1 }), { align: AlignmentType.CENTER, after: 0 }), { w: W[0], fill: "F7F9FC" }),
        cell(para([run(it.pos ? it.pos + " " : "", { size: base - 2.5, color: GRAY }), run(showW ? it.head : "", { bold: true, color: wRed ? "C00000" : undefined })], { align: AlignmentType.CENTER, after: 0 }), { w: W[1] }),
        cell(para(run(showM ? it.meaning : "", { size: base - 1, color: mRed ? "C00000" : undefined, bold: mRed }), { align: AlignmentType.CENTER, after: 0 }), { w: W[2] }),
      ];
    }) }));
    return table([header, ...rows], [...W, ...W, ...W]);
  };

  const gameBlocks = (answer) => {
    const game = gameData(ws);
    const out = [];
    if (game.type === "wordsearch") {
      const cw = Math.min(560, Math.floor(7000 / game.size));
      const ans = new Set(game.answerCells);
      out.push(table(game.grid.map((row, r) => new TableRow({ children: row.map((ch, c) => cell(para(run(ch, { bold: true, size: base + 1, color: answer && ans.has(r + "," + c) ? "C00000" : undefined }), { align: AlignmentType.CENTER, after: 0 }), { w: cw, pad: 30, fill: answer && ans.has(r + "," + c) ? "FDE2E2" : undefined })) })), Array(game.size).fill(cw)));
      out.push(para([run("찾을 단어: ", { bold: true, color: NAVY }), run(game.words.map((w) => w.display).join(",  "))], { before: 100 }));
    } else if (game.type === "secret") {
      const A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
      const kw = Math.floor(CONTENT_W / 13);
      const keyRows = [A.slice(0, 13), A.slice(13)].flatMap((part, pi) => [
        new TableRow({ children: part.map((k) => cell(para(run(k, { bold: true }), { align: AlignmentType.CENTER, after: 0 }), { w: kw, fill: "EEF3F8", pad: 30 })) }),
        new TableRow({ children: part.map((k, i) => cell(para(run(i + 1 + pi * 13), { align: AlignmentType.CENTER, after: 0 }), { w: kw, pad: 30 })) }),
      ]);
      out.push(para(run("[ Secret Code Key ]", { bold: true, color: NAVY })));
      out.push(table(keyRows, Array(13).fill(kw)));
      out.push(para(run("[ EASY ]", { bold: true, color: NAVY }), { before: 120 }));
      game.easy.forEach((e, i) => out.push(para([run(`${i + 1}. `, { bold: true }), run(e.meaning ? e.meaning + "   " : "", { color: GRAY }), run(e.code.join("-") + "  ➡  "), run(answer ? e.word : e.word.split("").map(() => "_").join(" "), { bold: answer, color: answer ? "C00000" : undefined })], { after: 60 })));
      if (game.hard.length) {
        out.push(para(run("[ HARD ] 가사 속 구절", { bold: true, color: NAVY }), { before: 120 }));
        game.hard.forEach((h, i) => {
          out.push(para([run(`${i + 1}. `, { bold: true }), run(h.words.map((w) => "( " + w.code.join("-") + " )").join("   "))], { after: 20 }));
          out.push(para(run("➡  " + (answer ? h.phrase.toUpperCase() : h.words.map((w) => w.word.split("").map(() => "_").join(" ")).join("     ")), { bold: answer, color: answer ? "C00000" : undefined }), { after: 80 }));
        });
      }
    } else {
      const isMissing = game.type === "missing";
      const W = [600, 3600, 3600, CONTENT_W - 7800];
      const headRow = new TableRow({ tableHeader: true, children: ["No.", isMissing ? "단어" : "섞인 철자", "뜻", isMissing ? "빠진 철자" : "정답"].map((h, i) => cell(para(run(h, { bold: true, color: NAVY }), { align: AlignmentType.CENTER, after: 0 }), { w: W[i], fill: "EEF3F8" })) });
      const rows = game.items.map((it, i) => new TableRow({ children: [
        cell(para(run(i + 1), { align: AlignmentType.CENTER, after: 0 }), { w: W[0] }),
        cell(para(run(isMissing ? (answer ? it.word : it.shown) : it.shuffled, { bold: true, size: base + 1 }), { align: AlignmentType.CENTER, after: 0 }), { w: W[1] }),
        cell(para(run(it.meaning || ""), { align: AlignmentType.CENTER, after: 0 }), { w: W[2] }),
        cell(para(run(answer ? (isMissing ? it.missing : it.word) : "", { bold: true, color: "C00000" }), { align: AlignmentType.CENTER, after: 0 }), { w: W[3] }),
      ] }));
      out.push(table([headRow, ...rows], W));
    }
    return out;
  };

  const v = vocabList(ws);
  const vocabGuide = ws.options.vocabMode === "word" ? "단어의 뜻을 빈칸에 적어 보세요." : ws.options.vocabMode === "meaning" ? "뜻을 보고 알맞은 단어를 적어 보세요." : "빈칸에 알맞은 단어 또는 뜻을 적어 보세요.";
  const miniHead = (left, right) => table([new TableRow({ children: [
    cell(para(run(left, { bold: true, color: NAVY }), { after: 0 }), { w: Math.round(CONTENT_W * 0.6) }),
    cell(para(run(right, { color: "333333" }), { align: AlignmentType.RIGHT, after: 0 }), { w: CONTENT_W - Math.round(CONTENT_W * 0.6) }),
  ] })], [Math.round(CONTENT_W * 0.6), CONTENT_W - Math.round(CONTENT_W * 0.6)]);

  const page2 = [
    miniHead(`${ws.song.title} · ${ws.song.artist}`, "(    )학년 (    )반 이름 (              )"),
    partTitle("Part 1. Vocabulary Check"),
    guide(vocabGuide + " (번호는 가사 빈칸 번호와 같습니다.)"),
    vocabTable(false),
    partTitle("Part 2. " + GAME_TYPES[ws.options.game].name),
    guide(GAME_TYPES[ws.options.game].guide),
    ...gameBlocks(false),
  ];

  const ansW = [500, CONTENT_W / 3 - 500];
  const ansTable = table(threeColumnRows(v).map((r) => new TableRow({ children: r.flatMap((it) => [
    cell(para(run(it ? it.num + ")" : "", { bold: true }), { align: AlignmentType.CENTER, after: 0 }), { w: ansW[0], fill: "F7F9FC" }),
    cell(para(run(it ? it.answer : "", { bold: true, color: "C00000" }), { after: 0 }), { w: Math.round(ansW[1]) }),
  ]) })), [ansW[0], Math.round(ansW[1]), ansW[0], Math.round(ansW[1]), ansW[0], Math.round(ansW[1])]);

  const page3 = [
    miniHead(`[Answer Key] ${ws.song.title} · ${ws.song.artist}`, "교사용"),
    partTitle("가사 빈칸 정답"), ansTable,
    partTitle("Part 1. Vocabulary Check 정답"), vocabTable(true),
    partTitle("Part 2. " + GAME_TYPES[ws.options.game].name + " 정답"), ...gameBlocks(true),
  ];

  const doc = new Document({
    creator: "팝송 문법 활동지 생성기",
    title: `[영어활동지] ${ws.song.title} - ${ws.song.artist}`,
    styles: { default: { document: { run: { font: FONT, size: pt(base) } } } },
    sections: [
      { properties: { page: PAGE }, children: [head, para(run("", { size: 4 }), { after: 60 }), info, para(run("", { size: 4 }), { after: 80 })] },
      { properties: { type: SectionType.CONTINUOUS, page: PAGE, column: { count: 2, space: 425 } }, children: lyricParas(false) },
      // 연속 구역 나누기로 2단을 좌우 균형 있게 맞춤
      { properties: { type: SectionType.CONTINUOUS, page: PAGE }, children: [para(run("", { size: 2 }), { after: 0 })] },
      { properties: { type: SectionType.NEXT_PAGE, page: PAGE }, children: page2 },
      { properties: { type: SectionType.NEXT_PAGE, page: PAGE }, children: page3 },
      { properties: { type: SectionType.NEXT_PAGE, page: PAGE }, children: [miniHead("[Answer Key] 정답이 표시된 가사", "교사용"), para(run(""), { after: 60 })] },
      { properties: { type: SectionType.CONTINUOUS, page: PAGE, column: { count: 2, space: 425 } }, children: lyricParas(true) },
      { properties: { type: SectionType.CONTINUOUS, page: PAGE }, children: [para(run("", { size: 2 }), { after: 0 })] },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const name = `[영어활동지] ${ws.song.title} - ${ws.song.artist}`.replace(/[\\/:*?"<>|]/g, "").slice(0, 80) + ".docx";
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  return name;
}
