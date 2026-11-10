import { createHash } from "node:crypto";
import type { DigestItem, KnowledgeLayer, TrendTopic, SourceKind } from "../src/types";
import { KNOWLEDGE_LAYERS } from "../src/lib/knowledge";

export function canonicalUrl(value: string): string {
  try {
    const url = new URL(value);
    if (!["https:", "http:"].includes(url.protocol)) return "";
    url.hash = "";
    [...url.searchParams.keys()].forEach((key) => {
      if (/^(utm_|fbclid|gclid)/i.test(key)) url.searchParams.delete(key);
    });
    url.searchParams.sort();
    return url.toString().replace(/\/$/, "");
  } catch { return ""; }
}
export const sourceId = (url: string) => createHash("sha256").update(canonicalUrl(url)).digest("hex").slice(0, 16);
export function parseJson(text: string): unknown {
  // Never salvage partial objects: it can silently pair an article with another article's summary.
  return JSON.parse(text.trim().replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, ""));
}
export function textField(value: unknown, name: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`Missing ${name}`);
  return value.trim();
}
export function layerIds(value: unknown): KnowledgeLayer[] {
  if (!Array.isArray(value)) throw new Error("Invalid layers");
  const allowed = new Set<string>(KNOWLEDGE_LAYERS.map((l) => l.id));
  if (!value.length || value.some((v) => !allowed.has(v))) throw new Error("Unknown knowledge layer");
  return [...new Set(value)] as KnowledgeLayer[];
}
export interface ArticleInput {
  id: string; title: string; content: string; url: string; source: string;
  category: DigestItem["category"]; kind: SourceKind; publishedAt?: string;
}
export function classifiedItems(value: unknown, inputs: ArticleInput[], date: string): DigestItem[] {
  if (!Array.isArray(value) || value.length !== inputs.length) throw new Error("Incomplete classification batch");
  const byId = new Map(inputs.map((item) => [item.id, item]));
  const seen = new Set<string>();
  return value.flatMap((p) => {
    if (!p || typeof p !== "object" || !byId.has(p.id) || seen.has(p.id)) throw new Error("Unknown or duplicate article ID");
    seen.add(p.id);
    if (typeof p.include !== "boolean") throw new Error("Missing include decision");
    if (!p.include) return [];
    const original = byId.get(p.id)!;
    if (!Number.isInteger(p.importance) || p.importance < 1 || p.importance > 10) throw new Error("Invalid importance");
    if (!["general", "a2a", "agent-ads", "geo"].includes(p.relevance)) throw new Error("Invalid relevance");
    if (!["substantial", "limited"].includes(p.evidenceQuality)) throw new Error("Invalid evidence quality");
    if (!Array.isArray(p.tags) || p.tags.some((t: unknown) => typeof t !== "string")) throw new Error("Invalid tags");
    return [{
      id: original.id, title: original.title, titleZh: textField(p.titleZh, "title"),
      summary: original.content.slice(0, 500), summaryZh: textField(p.summaryZh, "summary"),
      whyItMatters: textField(p.whyItMatters, "whyItMatters"), limitations: textField(p.limitations, "limitations"),
      insight: typeof p.insight === "string" ? p.insight : "", importance: p.importance,
      relevance: p.relevance, labelType: "general" as const, tags: p.tags.slice(0, 5),
      url: original.url, source: original.source, category: original.category,
      date, publishedAt: original.publishedAt, sourceKind: original.kind,
      evidenceQuality: p.evidenceQuality, layers: layerIds(p.layers),
    }];
  });
}
export function validatedTopics(value: unknown, inputs: ArticleInput[], date: string): TrendTopic[] {
  if (!Array.isArray(value)) throw new Error("Topics must be an array");
  const byId = new Map(inputs.map((i) => [i.id, i]));
  return value.slice(0, 5).map((topic) => {
    if (!topic || !Array.isArray(topic.sections) || topic.sections.length < 3) throw new Error("Topic lacks depth");
    const used = new Set<string>();
    const sections = topic.sections.map((s: Record<string, unknown>) => {
      if (!Array.isArray(s.sourceIds) || !s.sourceIds.length || s.sourceIds.some((id) => !byId.has(id))) throw new Error("Ungrounded topic citation");
      if (!["fact", "analysis", "uncertainty"].includes(String(s.kind))) throw new Error("Invalid section kind");
      s.sourceIds.forEach((id) => used.add(id));
      return { heading: textField(s.heading, "heading"), body: textField(s.body, "body"), sourceIds: [...new Set(s.sourceIds)] as string[], kind: s.kind as "fact" | "analysis" | "uncertainty" };
    });
    const sources = [...used].map((id) => { const i = byId.get(id)!; return { id, title: i.title, url: i.url, source: i.source, kind: i.kind, publishedAt: i.publishedAt }; });
    if (new Set(sources.map((s) => new URL(s.url).hostname.replace(/^www\./, ""))).size < 2) throw new Error("Topic needs two distinct source domains");
    if (!sections.some((s: {kind: string}) => s.kind === "uncertainty")) throw new Error("Topic lacks uncertainty");
    if (!Array.isArray(topic.watchNext) || !topic.watchNext.length || topic.watchNext.some((v: unknown) => typeof v !== "string")) throw new Error("Missing watch list");
    return { id: sourceId("https://topic/" + encodeURIComponent(textField(topic.title, "title")) + "?sources=" + sources.map((s) => s.id).sort().join(",")), title: textField(topic.title, "topic title"), thesis: textField(topic.thesis, "thesis"), whyNow: textField(topic.whyNow, "whyNow"), layers: layerIds(topic.layers), sections, sources, watchNext: topic.watchNext, updatedAt: date, origin: "generated" as const };
  });
}
