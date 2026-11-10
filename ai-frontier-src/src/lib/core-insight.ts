import type { CoreInsight, TopicSource } from "../types";

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Missing core insight object");
  return value as Record<string, unknown>;
}
function prose(value: unknown, name: string, min: number, max: number, sentence = true): string {
  if (typeof value !== "string" || value.trim().length < min || value.trim().length > max || /[<>]|\*\*/.test(value)
    || (sentence && !/[。！？.!?][”’」』）)"']*$/.test(value.trim()))) throw new Error(`${name}: require ${min}–${max} characters${sentence ? " and a complete sentence ending in punctuation" : ""}; received ${typeof value === "string" ? value.trim().length : "non-text"}`);
  return value.trim();
}
function highlights(value: unknown, text: string): string[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 3 || value.some((v) => typeof v !== "string" || v.length < 2 || v.length > 24 || !text.includes(v))) throw new Error("Highlights must be 1–3 exact short phrases in the prose");
  const phrases = [...new Set(value)] as string[];
  if (phrases.reduce((n, p) => n + p.length, 0) > text.length * .5) throw new Error("Highlight keywords, not whole paragraphs");
  return phrases;
}

// Emphasis is presentation metadata. Never rewrite facts to make a proposed
// highlight match; recover short, meaningful phrases from the actual prose.
export function groundedHighlights(text: string, proposed: unknown): string[] {
  const preferred = Array.isArray(proposed) ? proposed.filter((p): p is string => typeof p === "string").map((p) => p.trim()) : [];
  const quoted = [...text.matchAll(/[「“《]([^「」“”《》\n]{2,24})[」”》]/g)].map((m) => m[1]);
  const names = [...text.matchAll(/\b[A-Z][A-Za-z0-9.+-]*(?: [A-Z][A-Za-z0-9.+-]*){0,2}\b/g)].map((m) => m[0]);
  const numbers = [...text.matchAll(/\d+(?:[.,]\d+)*(?:\s?(?:%|倍|万|亿|美元|元|小时|天|GB|TB|tokens?))?/g)].map((m) => m[0]);
  const concepts = ["人工复核", "执行权限", "任务完成率", "推理成本", "能力边界", "独立验证", "数据隐私", "工作流", "可靠性", "算力", "成本", "部署", "模型"];
  const stopWords = new Set(["今天", "本期", "这些", "这个", "已经", "可以", "不能", "仍然", "需要", "因为", "所以", "不是", "而是", "我们", "他们", "没有", "以及", "但是", "同时"]);
  const words = [...new Intl.Segmenter("zh", {granularity:"word"}).segment(text)]
    .filter((s) => s.isWordLike && !stopWords.has(s.segment)).map((s) => s.segment).sort((a,b) => b.length-a.length);
  const selected: string[] = [];
  const budget = Math.floor(text.length / 2);
  for (const p of [...preferred, ...quoted, ...names, ...numbers, ...concepts, ...words]) {
    if (selected.length === 3) break;
    if (p.length < 2 || p.length > 24 || !text.includes(p) || /[。！？!?<>]/.test(p)
      || selected.some((s) => s.includes(p) || p.includes(s)) || selected.reduce((n,s) => n+s.length,0)+p.length > budget) continue;
    selected.push(p);
  }
  return highlights(selected, text);
}
// This contract depends on article evidence, never on whether long topics succeed.
export function validateCoreInsight(value: unknown, sources: TopicSource[], date: string, origin: CoreInsight["origin"] = "generated"): CoreInsight {
  const v = record(value);
  const takeaway = prose(v.takeaway, "takeaway", 20, 140);
  const boundary = prose(v.boundary, "boundary", 12, 180);
  const byId = new Map(sources.map((s) => [s.id, s]));
  if (!Array.isArray(v.points) || v.points.length < 2 || v.points.length > 3) throw new Error("Core insight needs 2–3 priorities");
  const points = v.points.map((raw) => validateCorePoint(raw, sources));
  const used = [...new Set(points.flatMap((p) => p.sourceIds))].map((id) => byId.get(id)!);
  const cutoff = Date.parse(`${date}T23:59:59+08:00`);
  if (!Number.isFinite(cutoff) || used.some((s) => {
    const published = Date.parse(s.publishedAt ?? "");
    return !["https:", "http:"].includes(new URL(s.url).protocol) || !Number.isFinite(published) || published > cutoff || cutoff - published > 7 * 86400000;
  })) throw new Error("Core insight needs dated evidence from this edition's past seven days");
  if (new Set(used.map((s) => new URL(s.url).hostname.replace(/^www\./, ""))).size < 2) throw new Error("Core insight needs more than one publisher");
  return { date, origin, takeaway, highlights: highlights(v.highlights, takeaway), points, boundary, sources: used.map(({ id, title, url, source, kind, publishedAt }) => ({ id, title, url, source, kind, publishedAt })) };
}

export function selectCoreInsight(date: string, generated?: CoreInsight, correction?: CoreInsight): CoreInsight | undefined {
  for (const candidate of [correction, generated]) {
    if (!candidate || candidate.date !== date) continue;
    try { return validateCoreInsight(candidate, candidate.sources, date, candidate.origin); } catch { /* Invalid editions cannot replace verified content. */ }
  }
}

// Literal matching; no HTML injection, regex interpretation or markdown leakage.
export function emphasisParts(text: string, phrases: string[]) {
  const parts: { text: string; highlighted: boolean }[] = [];
  let offset = 0;
  while (offset < text.length) {
    const matches = phrases.filter(Boolean).map((phrase) => ({ phrase, index: text.indexOf(phrase, offset) })).filter((m) => m.index >= 0).sort((a,b) => a.index - b.index || b.phrase.length - a.phrase.length);
    const match = matches[0];
    if (!match) { parts.push({ text: text.slice(offset), highlighted: false }); break; }
    if (match.index > offset) parts.push({ text: text.slice(offset, match.index), highlighted: false });
    parts.push({ text: match.phrase, highlighted: true });
    offset = match.index + match.phrase.length;
  }
  return parts;
}

export function validateCorePoint(raw: unknown, sources: TopicSource[]): CoreInsight["points"][number] {
    const byId = new Map(sources.map((s) => [s.id, s]));
    const p = record(raw);
    const title = prose(p.title, "title", 4, 60, false);
    const fact = prose(p.fact, "fact", 20, 300);
    const meaning = prose(p.meaning, "meaning", 15, 180);
    const watch = prose(p.watch, "watch", 10, 120);
    if (!Array.isArray(p.sourceIds) || !p.sourceIds.length || p.sourceIds.some((id) => typeof id !== "string" || !byId.has(id))) throw new Error("Unknown core insight source");
    return { title, fact, meaning, watch, highlights: highlights(p.highlights, fact + meaning + watch), sourceIds: [...new Set(p.sourceIds)] as string[] };
}
