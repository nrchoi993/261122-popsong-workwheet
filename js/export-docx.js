/**
 * 활동지 DOCX 내보내기 (Word·한글·Google 문서에서 열 수 있음)
 *  1쪽: 머리표 + 곡 정보 + 가사(2단, 빈칸)
 *  2쪽: Part 1 Vocabulary Check + Part 2 단어 활동
 *  3쪽~: Answer Key
 *
 * 화면 미리보기와 같은 치수(mm)·줄 간격(고정값)을 사용해 '1쪽에 맞추기' 결과가 문서에도 그대로 적용되게 합니다.
 */
import { visibleBlanks, vocabList, vocabCheckRows, threeColumnRows, gameData, MARGINS, DOC_FONTS, pageFont } from "./worksheet.js";
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

export async function buildDocx(ws, qrDataUrl) {
  const d = await loadDocx();
  const {
    Document, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle, ImageRun,
    SectionType, ShadingType, VerticalAlign, TableLayoutType, UnderlineType, HeightRule, LineRuleType, TabStopType,
  } = d;

  /* ---------- 치수·색 ---------- */
  const mm = (x) => Math.round(x * 56.693); // mm → twip
  const pad = MARGINS[ws.options.margin] || MARGINS.normal;
  const PAGE_W = 11906, PAGE_H = 16838;
  const ML = mm(pad + 1.5), MT = mm(pad);
  const PAGE = { size: { width: PAGE_W, height: PAGE_H }, margin: { top: MT, bottom: MT, left: ML, right: ML, header: 0, footer: 0 } };
  const CW = PAGE_W - 2 * ML; // 본문 폭
  const fontName = (DOC_FONTS[ws.options.docFont] || DOC_FONTS.malgun).docx;
  const FONT = { ascii: fontName, hAnsi: fontName, eastAsia: fontName, cs: fontName };
  let base = ws.options.fontSize || 10; // 쪽마다 바뀜(1쪽에 맞춘 크기)
  const GREEN = "006241", GREEN_D = "1E3932", MINT = "E4F0EA", LIGHT = "F3F8F5", LINE = "9FB1A8", INK = "1F2421", GRAY = "6B7280", RED = "C00000";

  const half = (n) => Math.round(n * 2);
  const exact = (sizePt, mult = 1.38) => ({ line: Math.round(sizePt * mult * 20), lineRule: LineRuleType.EXACT });
  const run = (text, o = {}) => new TextRun({
    text: String(text == null ? "" : text), font: FONT, size: half(o.size || base), bold: o.bold, italics: o.italics,
    color: o.color || INK, underline: o.underline ? { type: UnderlineType.SINGLE } : undefined,
    shading: o.shade ? { type: ShadingType.CLEAR, fill: o.shade, color: "auto" } : undefined,
  });
  const P = (children, o = {}) => new Paragraph({
    children: Array.isArray(children) ? children : [children],
    alignment: o.align,
    spacing: { before: o.before || 0, after: o.after == null ? 0 : o.after, ...exact(o.lh || o.size || base, o.mult || 1.38) },
    keepNext: o.keepNext, keepLines: true, border: o.border, tabStops: o.tabs,
  });
  const gap = (h) => new Paragraph({ children: [run("", { size: 2 })], spacing: { before: 0, after: 0, line: Math.max(20, Math.round(h)), lineRule: LineRuleType.EXACT } });
  const edge = { style: BorderStyle.SINGLE, size: 4, color: LINE };
  const none = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
  const allEdges = { top: edge, bottom: edge, left: edge, right: edge };
  const noEdges = { top: none, bottom: none, left: none, right: none };
  const cell = (children, o = {}) => new TableCell({
    children: Array.isArray(children) ? children : [children],
    width: o.w ? { size: o.w, type: WidthType.DXA } : undefined,
    rowSpan: o.rowSpan, columnSpan: o.colSpan,
    verticalAlign: o.vAlign || VerticalAlign.CENTER,
    shading: o.fill ? { type: ShadingType.CLEAR, fill: o.fill, color: "auto" } : undefined,
    margins: { top: o.pt == null ? mm(1.2) : o.pt, bottom: o.pt == null ? mm(1.2) : o.pt, left: o.pl == null ? mm(1.8) : o.pl, right: o.pl == null ? mm(1.8) : o.pl },
    borders: o.borders || allEdges,
  });
  const table = (rows, widths) => new Table({ rows, width: { size: widths.reduce((a, b) => a + b, 0), type: WidthType.DXA }, columnWidths: widths, layout: TableLayoutType.FIXED });
  const pctW = (arr) => { const ws2 = arr.map((p) => Math.round(CW * p)); ws2[ws2.length - 1] = CW - ws2.slice(0, -1).reduce((a, b) => a + b, 0); return ws2; };

  const partTitle = (t) => P(run(t, { bold: true, size: base + 3, color: GREEN }), { before: mm(4), after: mm(1), size: base + 3, mult: 1.3, keepNext: true });
  const guide = (t) => P(run(t, { size: base - 0.5, color: "444444" }), { after: mm(2), size: base - 0.5, keepNext: true });
  const miniHead = (left, right) => P([run(left, { bold: true, color: GREEN, size: base - 0.5 }), run("\t"), run(right, { size: base - 0.5, color: "333333" })], {
    after: mm(3), size: base - 0.5, tabs: [{ type: TabStopType.RIGHT, position: CW }],
    border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: GREEN, space: 4 } },
  });
  const twoCol = (left, right, ratio = 0.5, gapW = mm(4)) => {
    const lw = Math.round((CW - gapW) * ratio), rw = CW - gapW - lw;
    return new Table({
      rows: [new TableRow({ children: [
        new TableCell({ children: left.length ? left : [P(run(""))], width: { size: lw, type: WidthType.DXA }, borders: noEdges, verticalAlign: VerticalAlign.TOP, margins: { top: 0, bottom: 0, left: 0, right: 0 } }),
        new TableCell({ children: [P(run(""))], width: { size: gapW, type: WidthType.DXA }, borders: noEdges, margins: { top: 0, bottom: 0, left: 0, right: 0 } }),
        new TableCell({ children: right.length ? right : [P(run(""))], width: { size: rw, type: WidthType.DXA }, borders: noEdges, verticalAlign: VerticalAlign.TOP, margins: { top: 0, bottom: 0, left: 0, right: 0 } }),
      ] })],
      width: { size: CW, type: WidthType.DXA }, columnWidths: [lw, gapW, rw], layout: TableLayoutType.FIXED,
    });
  };

  /* ---------- 1쪽: 머리표 ---------- */
  const hw = [mm(24), 0, mm(15), mm(36)];
  hw[1] = CW - hw[0] - hw[2] - hw[3];
  const hp = { pt: mm(1.6) };
  const head = table([
    new TableRow({ children: [
      cell(P(run("Let's Sing", { bold: true, size: base + 2, color: "FFFFFF" }), { align: AlignmentType.CENTER, size: base + 2 }), { w: hw[0], rowSpan: 2, fill: GREEN, ...hp }),
      cell(P(run(ws.song.title, { bold: true, size: base * 1.55, color: GREEN }), { align: AlignmentType.CENTER, size: base * 1.55, mult: 1.25 }), { w: hw[1], ...hp }),
      cell(P(run("학번", { bold: true }), { align: AlignmentType.CENTER }), { w: hw[2], fill: MINT, ...hp }),
      cell(P(run("")), { w: hw[3], ...hp }),
    ] }),
    new TableRow({ children: [
      cell(P(run(ws.song.artist, { bold: true, color: "333333" }), { align: AlignmentType.CENTER }), { w: hw[1], ...hp }),
      cell(P(run("이름", { bold: true }), { align: AlignmentType.CENTER }), { w: hw[2], fill: MINT, ...hp }),
      cell(P(run("")), { w: hw[3], ...hp }),
    ] }),
  ], hw);

  /* ---------- 1쪽: 곡 소개 ---------- */
  const isz = base * 0.92;
  const infoParas = (ws.info || []).filter((f) => f.value).map((f) => P([run(f.label + "   ", { bold: true, color: GREEN, size: isz }), run(f.value, { size: isz })], { size: isz, after: mm(0.6) }));
  const g = ws.grammar;
  infoParas.push(P([run(" 오늘의 표현 ", { bold: true, color: "FFFFFF", shade: GREEN, size: isz * 0.92 }), run("  " + g.label, { bold: true, size: isz }), run(g.form ? `  (${g.form})` : "", { size: isz, color: GRAY })], { size: isz, before: mm(1.2), after: mm(0.6), border: { top: { style: BorderStyle.DASHED, size: 4, color: "C3CCD6", space: 3 } } }));
  if (ws.grammarTip) infoParas.push(P(run(ws.grammarTip, { size: isz * 0.95, color: "333333" }), { size: isz * 0.95 }));
  const infoCells = [];
  const qrW = mm(23);
  if (qrDataUrl) {
    infoCells.push(cell([
      new Paragraph({ alignment: AlignmentType.CENTER, children: [new ImageRun({ type: "png", data: dataUrlToBytes(qrDataUrl), transformation: { width: 76, height: 76 } })] }),
      P(run("영상 QR", { size: 7, color: GRAY }), { align: AlignmentType.CENTER, size: 7 }),
    ], { w: qrW, fill: LIGHT, pt: mm(1.5), pl: mm(1) }));
  }
  infoCells.push(cell(infoParas, { w: qrDataUrl ? CW - qrW : CW, vAlign: VerticalAlign.TOP, pt: mm(2.2), pl: mm(3) }));
  const info = table([new TableRow({ children: infoCells })], qrDataUrl ? [qrW, CW - qrW] : [CW]);

  /* ---------- 가사 ---------- */
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
      if (line.type === "break") { out.push(gap(mm(1.6))); return; }
      if (line.type === "label") { out.push(P(run(line.en, { bold: true, color: GREEN, size: base * 0.92 }), { size: base * 0.92, before: mm(0.8), keepNext: true })); return; }
      if (line.type === "repeat") { out.push(P(run(line.en, { italics: true, color: GRAY, size: base * 0.92 }), { size: base * 0.92, after: mm(1.2) })); return; }
      const segs = segmentLine(line.en || "", blanksByBase.get(line.base) || [], highlights(line));
      const runs = segs.map((s) => {
        if (s.kind === "blank") {
          const b = s.blank;
          if (answerMode) return [run(b.num + ") ", { size: base * 0.8, color: GRAY }), run(b.answer, { bold: true, color: RED, underline: true })];
          return [run(b.num + ")", { size: base * 0.8, bold: true }), run("_".repeat(Math.max(10, Math.min(18, Math.round(b.answer.length * 1.2) + 6))))];
        }
        if (s.kind === "hl") return [run(s.text, { bold: true, underline: true })];
        return [run(s.text)];
      }).flat();
      const hasKo = ws.options.translation && line.ko;
      out.push(P(runs, { after: hasKo ? 0 : mm(1.5), keepNext: !!hasKo }));
      if (hasKo) out.push(P(run(line.ko, { size: base * 0.85, color: GRAY }), { size: base * 0.85, mult: 1.3, after: mm(1.5) }));
    });
    return out;
  };

  /* ---------- 2쪽: Part 1 ---------- */
  const vocabTable = (answer) => {
    const grp = [0.046, 0.134, 0.1533];
    const W = pctW([...grp, ...grp, ...grp]);
    const header = new TableRow({ tableHeader: true, height: { value: mm(0.7 * base), rule: HeightRule.ATLEAST }, children: [0, 1, 2].flatMap((k) => [
      cell(P(run("")), { w: W[k * 3], fill: MINT, pl: 0 }),
      cell(P(run("단어", { bold: true, color: GREEN }), { align: AlignmentType.CENTER }), { w: W[k * 3 + 1], fill: MINT }),
      cell(P(run("뜻", { bold: true, color: GREEN }), { align: AlignmentType.CENTER }), { w: W[k * 3 + 2], fill: MINT }),
    ]) });
    const rows = threeColumnRows(vocabCheckRows(ws)).map((r) => new TableRow({ height: { value: mm(0.95 * base), rule: HeightRule.ATLEAST }, children: r.flatMap((it, k) => {
      if (!it) return [cell(P(run("")), { w: W[k * 3], fill: LIGHT, pl: 0 }), cell(P(run("")), { w: W[k * 3 + 1] }), cell(P(run("")), { w: W[k * 3 + 2] })];
      const showW = answer || it.show === "word";
      const showM = answer || it.show === "meaning";
      const wRed = answer && it.show === "meaning";
      const mRed = answer && it.show === "word";
      return [
        cell(P(run(it.num, { bold: true, size: base * 0.9 }), { align: AlignmentType.CENTER, size: base * 0.9 }), { w: W[k * 3], fill: LIGHT, pl: 0 }),
        cell(P([run(it.pos ? it.pos + " " : "", { size: base * 0.78, color: GRAY }), run(showW ? it.head : "", { bold: true, color: wRed ? RED : INK })], { align: AlignmentType.LEFT }), { w: W[k * 3 + 1] }),
        cell(P(run(showM ? it.meaning : "", { size: base * 0.92, color: mRed ? RED : INK, bold: mRed }), { align: AlignmentType.LEFT, size: base * 0.92, mult: 1.3 }), { w: W[k * 3 + 2] }),
      ];
    }) }));
    return table([header, ...rows], W);
  };

  /* ---------- 2쪽: Part 2 ---------- */
  const missingRuns = (it, answer) => {
    const k = it.shown.indexOf("_");
    return [
      run(it.shown.slice(0, k), { bold: true }),
      answer ? run(it.missing.toLowerCase(), { bold: true, color: RED, underline: true }) : run("\u00A0\u00A0\u00A0\u00A0", { underline: true }),
      run(it.shown.slice(k + 1), { bold: true }),
    ];
  };
  const answerGrid = (cellsRuns, wideRuns) => {
    const W = pctW([0.25, 0.25, 0.25, 0.25]);
    const rows = [];
    for (let i = 0; i < cellsRuns.length; i += 4) {
      rows.push(new TableRow({ height: { value: mm(0.65 * base), rule: HeightRule.ATLEAST }, children: [0, 1, 2, 3].map((j) => cell(P(cellsRuns[i + j] || [run("")]), { w: W[j], pt: mm(0.25 * base) })) }));
    }
    (wideRuns || []).forEach((r) => rows.push(new TableRow({ children: [cell(P(r), { w: CW, colSpan: 4, pt: mm(0.25 * base) })] })));
    return table(rows, W);
  };
  const gameBlocks = (answer) => {
    const game = gameData(ws);
    const out = [];
    const halves = (arr) => { const h = Math.ceil(arr.length / 2); return [arr.slice(0, h), arr.slice(h)]; };
    const sc = base / 10;

    if (game.type === "wordsearch") {
      const cw = mm((game.size > 13 ? 6.2 : 7.4) * sc * (answer ? 0.8 : 1));
      const ans = new Set(game.answerCells);
      const grid = table(game.grid.map((row, r) => new TableRow({ height: { value: cw, rule: HeightRule.EXACT }, children: row.map((ch, c) => {
        const on = answer && ans.has(r + "," + c);
        return cell(P(run(ch, { bold: true, size: base + 0.5, color: on ? RED : INK }), { align: AlignmentType.CENTER, size: base + 0.5, mult: 1.1 }), { w: cw, pt: 0, pl: 0, fill: on ? "FDE2E2" : undefined });
      }) })), Array(game.size).fill(cw));
      const gridW = cw * game.size;
      const listW = CW - gridW - mm(5);
      const lw = [mm(6), Math.round((listW - mm(6)) * 0.45)];
      lw.push(listW - lw[0] - lw[1]);
      const dotted = { top: none, left: none, right: none, bottom: { style: BorderStyle.DOTTED, size: 4, color: "B8C4BE" } };
      const list = table([
        new TableRow({ children: [cell(P(run(`찾을 단어 (${game.words.length})`, { bold: true, color: GREEN })), { w: listW, colSpan: 3, borders: noEdges, pl: 0 })] }),
        ...game.words.map((w) => new TableRow({ children: [
          cell(P(run(w.seq, { size: base * 0.85, color: GRAY }), { align: AlignmentType.RIGHT, size: base * 0.85 }), { w: lw[0], borders: dotted, pl: mm(0.5), pt: mm(0.08 * base) }),
          cell(P(run(w.display, { bold: true })), { w: lw[1], borders: dotted, pt: mm(0.08 * base) }),
          cell(P(run(w.meaning || "", { size: base * 0.9, color: "444444" }), { size: base * 0.9 }), { w: lw[2], borders: dotted, pt: mm(0.08 * base) }),
        ] })),
      ], lw);
      out.push(new Table({
        rows: [new TableRow({ children: [
          new TableCell({ children: [grid], width: { size: gridW, type: WidthType.DXA }, borders: noEdges, verticalAlign: VerticalAlign.TOP, margins: { top: 0, bottom: 0, left: 0, right: 0 } }),
          new TableCell({ children: [P(run(""))], width: { size: mm(5), type: WidthType.DXA }, borders: noEdges }),
          new TableCell({ children: [list], width: { size: listW, type: WidthType.DXA }, borders: noEdges, verticalAlign: VerticalAlign.TOP, margins: { top: 0, bottom: 0, left: 0, right: 0 } }),
        ] })],
        width: { size: CW, type: WidthType.DXA }, columnWidths: [gridW, mm(5), listW], layout: TableLayoutType.FIXED,
      }));
      if (game.skipped && game.skipped.length) out.push(P(run("※ 너무 길어 표에 넣지 못한 단어: " + game.skipped.join(", "), { size: base * 0.85, color: GRAY }), { before: mm(1.5), size: base * 0.85 }));
      return out;
    }

    // 정답 쪽: 간결한 4칸 표
    if (answer) {
      if (game.type === "secret") {
        out.push(answerGrid(game.easy.map((e) => [run(e.seq + ". ", { color: GRAY, size: base * 0.85 }), run(e.word, { bold: true, color: RED })]),
          game.hard.map((h, i) => [run(`도전 ${i + 1}.  `, { color: GRAY, size: base * 0.85 }), run(h.phrase.toUpperCase(), { bold: true, color: RED })])));
      } else if (game.type === "missing") {
        out.push(answerGrid(game.items.map((it) => [run(it.seq + ". ", { color: GRAY, size: base * 0.85 }), ...missingRuns(it, true)]),
          game.phrase ? [[run("비밀 구절  ", { color: GRAY, size: base * 0.85 }), run(game.phrase, { bold: true, color: RED })]] : []));
      } else {
        out.push(answerGrid(game.items.map((it) => [run(it.seq + ". ", { color: GRAY, size: base * 0.85 }), run(it.word, { bold: true, color: RED })])));
      }
      return out;
    }

    if (game.type === "secret") {
      const A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
      const kw = pctW(Array(13).fill(1 / 13));
      const keyRows = [A.slice(0, 13), A.slice(13)].flatMap((part, pi) => [
        new TableRow({ children: part.map((k, i) => cell(P(run(k, { bold: true, color: GREEN }), { align: AlignmentType.CENTER }), { w: kw[i], fill: MINT, pt: mm(0.06 * base), pl: 0 })) }),
        new TableRow({ children: part.map((k, i) => cell(P(run(i + 1 + pi * 13), { align: AlignmentType.CENTER }), { w: kw[i], pt: mm(0.06 * base), pl: 0 })) }),
      ]);
      out.push(table(keyRows, kw));
      out.push(P(run("[ 단어 ]", { bold: true, color: GREEN }), { before: mm(0.3 * base), after: mm(0.15 * base) }));
      const item = (e) => [
        P([run(`${e.seq}.  `, { bold: true, color: GREEN }), run(e.code.join("-"))]),
        P([run("➜  ", { color: GRAY }), run(e.word.split("").map(() => "_").join(" ")), run(e.meaning ? `   (${e.meaning})` : "", { size: base * 0.85, color: GRAY })], { after: mm(0.22 * base) }),
      ];
      const [a, b] = halves(game.easy);
      out.push(twoCol(a.flatMap(item), b.flatMap(item)));
      if (game.hard.length) {
        out.push(P(run("[ 도전 ] 가사 속 구절", { bold: true, color: GREEN }), { before: mm(0.2 * base), after: mm(0.15 * base) }));
        game.hard.forEach((h, i) => {
          out.push(P([run(`${i + 1}.  `, { bold: true, color: GREEN }), run(h.words.map((w) => "( " + w.code.join("-") + " )").join("  "))]));
          out.push(P(run("➜  " + h.words.map((w) => w.word.split("").map(() => "_").join(" ")).join("      ")), { after: mm(0.25 * base) }));
        });
      }
      return out;
    }

    const isMissing = game.type === "missing";
    const colW = Math.round((CW - mm(4)) / 2);
    const fr = isMissing ? [0.12, 0.48] : [0.11, 0.36, 0.26];
    const W = fr.map((f) => Math.round(colW * f));
    W.push(colW - W.reduce((x, y) => x + y, 0));
    const heads = isMissing ? ["No", "단어 (빈칸에 철자 쓰기)", "뜻"] : ["No", "섞인 철자", "뜻", "정답"];
    const mk = (items) => {
      const headRow = new TableRow({ tableHeader: true, height: { value: mm(0.7 * base), rule: HeightRule.ATLEAST }, children: heads.map((h, i) => cell(P(run(h, { bold: true, color: GREEN, size: base * 0.9 }), { align: AlignmentType.CENTER, size: base * 0.9 }), { w: W[i], fill: MINT, pl: mm(0.6) })) });
      const rows = items.map((it) => new TableRow({ height: { value: mm(0.85 * base), rule: HeightRule.ATLEAST }, children: [
        cell(P(run(it.seq, { bold: true }), { align: AlignmentType.CENTER }), { w: W[0], fill: LIGHT, pl: 0 }),
        cell(P(isMissing ? missingRuns(it, false) : run(it.shuffled, { bold: true })), { w: W[1] }),
        cell(P(run(it.meaning || "", { size: base * 0.88, color: "444444" }), { size: base * 0.88, mult: 1.3 }), { w: W[2] }),
        ...(isMissing ? [] : [cell(P(run("")), { w: W[3] })]),
      ] }));
      return [table([headRow, ...rows], W)];
    };
    const [a, b] = halves(game.items);
    out.push(twoCol(mk(a), b.length ? mk(b) : []));
    if (isMissing && game.phrase) {
      out.push(P([run("[ 비밀 구절 ]  ", { bold: true, color: GREEN }), run("빠진 철자를 번호 순서대로 모아 가사 속 구절을 완성하세요.")], { before: mm(0.4 * base), after: mm(0.2 * base) }));
      let k = 0;
      const groups = game.phraseWords.map((n) => Array.from({ length: n }, () => game.items[k++]));
      const flat = [];
      groups.forEach((gr, gi) => { gr.forEach((it) => flat.push(it)); if (gi < groups.length - 1) flat.push(null); });
      const bw = Math.min(mm(0.85 * base), Math.floor(CW / flat.length));
      out.push(table([
        new TableRow({ children: flat.map((it) => it ? cell(P(run(it.seq, { size: 6.5, color: GRAY }), { size: 6.5 }), { w: bw, pt: mm(0.3), pl: mm(0.5), borders: { top: edge, left: edge, right: edge, bottom: none } }) : cell(P(run("")), { w: bw, borders: noEdges, pt: 0 })) }),
        new TableRow({ height: { value: mm(0.65 * base), rule: HeightRule.ATLEAST }, children: flat.map((it) => it ? cell(P(run("")), { w: bw, pt: 0, pl: 0, borders: { top: none, left: edge, right: edge, bottom: edge } }) : cell(P(run("")), { w: bw, borders: noEdges, pt: 0 })) }),
      ], Array(flat.length).fill(bw)));
      out.push(P(run("구절: __________________________________________"), { before: mm(0.3 * base) }));
    }
    return out;
  };

  /* ---------- 문서 조립 (쪽마다 맞춘 글자 크기 적용) ---------- */
  const v = vocabList(ws);
  const vocabGuide = ws.options.vocabMode === "word" ? "단어의 뜻을 빈칸에 적어 보세요." : ws.options.vocabMode === "meaning" ? "뜻을 보고 알맞은 단어를 적어 보세요." : "빈칸에 알맞은 단어 또는 뜻을 적어 보세요.";
  const studentRight = "(      )학년   (      )반   이름 (                    )";

  base = pageFont(ws, "p1");
  const lyr1 = lyricParas(false);

  base = pageFont(ws, "p2");
  const page2 = [
    miniHead(`${ws.song.title} · ${ws.song.artist}`, studentRight),
    partTitle("Part 1. Vocabulary Check"),
    guide(vocabGuide + " (번호는 가사 빈칸 번호와 같습니다.)"),
    vocabTable(false),
    partTitle("Part 2. " + GAME_TYPES[ws.options.game].name),
    guide(GAME_TYPES[ws.options.game].guide),
    ...gameBlocks(false),
  ];

  base = pageFont(ws, "p3");
  const aw = pctW([0.06, 0.273, 0.06, 0.273, 0.06, 0.274]);
  const ansTable = table(threeColumnRows(v).map((r) => new TableRow({ height: { value: mm(0.7 * base), rule: HeightRule.ATLEAST }, children: r.flatMap((it, k) => [
    cell(P(run(it ? it.num + ")" : "", { bold: true }), { align: AlignmentType.CENTER }), { w: aw[k * 2], fill: LIGHT, pl: 0 }),
    cell(P(run(it ? it.answer : "", { bold: true, color: RED })), { w: aw[k * 2 + 1] }),
  ]) })), aw);
  const page3 = [
    miniHead(`[Answer Key] ${ws.song.title} · ${ws.song.artist}`, "교사용"),
    partTitle("가사 빈칸 정답"), ansTable,
    partTitle("Part 1. Vocabulary Check 정답"), vocabTable(true),
    partTitle("Part 2. " + GAME_TYPES[ws.options.game].name + " 정답"), ...gameBlocks(true),
  ];

  base = pageFont(ws, "p4");
  const p4head = miniHead("[Answer Key] 정답이 표시된 가사", "교사용");
  const lyr4 = lyricParas(true);
  base = pageFont(ws, "p1");

  const cols = { count: 2, space: mm(7), separate: true };
  return new Document({
    creator: "팝송 문법 활동지 생성기",
    title: `[영어활동지] ${ws.song.title} - ${ws.song.artist}`,
    styles: { default: { document: { run: { font: FONT, size: half(base), color: INK } } } },
    sections: [
      { properties: { page: PAGE }, children: [head, info, gap(mm(3.5))] },
      { properties: { type: SectionType.CONTINUOUS, page: PAGE, column: cols }, children: lyr1 },
      { properties: { type: SectionType.CONTINUOUS, page: PAGE }, children: [gap(20)] },
      { properties: { type: SectionType.NEXT_PAGE, page: PAGE }, children: page2 },
      { properties: { type: SectionType.NEXT_PAGE, page: PAGE }, children: page3 },
      { properties: { type: SectionType.NEXT_PAGE, page: PAGE }, children: [p4head] },
      { properties: { type: SectionType.CONTINUOUS, page: PAGE, column: cols }, children: lyr4 },
      { properties: { type: SectionType.CONTINUOUS, page: PAGE }, children: [gap(20)] },
    ],
  });
}

export async function exportDocx(ws, qrDataUrl) {
  const d = await loadDocx();
  const doc = await buildDocx(ws, qrDataUrl);
  const blob = await d.Packer.toBlob(doc);
  const name = `[영어활동지] ${ws.song.title} - ${ws.song.artist}`.replace(/[\\/:*?"<>|]/g, "").slice(0, 80) + ".docx";
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  return name;
}
