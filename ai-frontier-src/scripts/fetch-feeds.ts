import Parser from "rss-parser";
import * as cheerio from "cheerio";
import type { FeedHealth, SourceKind, DigestItem } from "../src/types";
import { canonicalUrl } from "./content-utils";
const parser = new Parser({ timeout: 15000, headers: { "User-Agent": "AI-Frontier-Digest/2.0" } });
export interface FeedItem {
  title: string; link: string; contentSnippet: string; pubDate: string;
  source: string; category: DigestItem["category"]; kind: SourceKind;
}
const BASE_FEEDS = [
  // ── Thought leaders (blogs / newsletters with RSS) ──
  {
    url: "https://karpathy.beehiiv.com/feed",
    source: "Karpathy Newsletter",
    category: "thought-leader",
  },
  {
    url: "https://simonwillison.net/atom/everything/",
    source: "Simon Willison",
    category: "thought-leader",
  },
  {
    url: "https://www.oneusefulthing.org/feed",
    source: "Ethan Mollick (One Useful Thing)",
    category: "thought-leader",
  },
  {
    url: "https://interconnects.ai/feed",
    source: "Nathan Lambert (Interconnects)",
    category: "thought-leader",
  },
  {
    url: "https://www.semianalysis.com/feed",
    source: "SemiAnalysis",
    category: "thought-leader",
  },
  {
    url: "https://jack-clark.net/feed/",
    source: "Jack Clark (Import AI)",
    category: "thought-leader",
  },

  // ── Aggregators that surface X/social discussion ──
  {
    url: "https://hnrss.org/frontpage?q=AI+OR+LLM+OR+agent&points=50",
    source: "HackerNews AI",
    category: "industry",
  },
  {
    url: "https://hnrss.org/frontpage?q=GPT+OR+Claude+OR+Gemini+OR+Llama&points=30",
    source: "HackerNews Models",
    category: "industry",
  },

  // ── International news ──
  {
    url: "https://tldr.tech/api/rss/ai",
    source: "TLDR AI",
    category: "industry",
  },
  {
    url: "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml",
    source: "The Verge AI",
    category: "industry",
  },
  {
    url: "https://venturebeat.com/category/ai/feed/",
    source: "VentureBeat AI",
    category: "industry",
  },
  {
    url: "https://openai.com/news/rss/",
    source: "OpenAI News",
    category: "industry",
  },
  {
    url: "https://www.anthropic.com/news",
    source: "Anthropic News",
    category: "industry",
  },

  // ── Research ──
  {
    url: "https://rss.arxiv.org/rss/cs.AI",
    source: "ArXiv CS.AI",
    category: "research",
  },
  {
    url: "https://rss.arxiv.org/rss/cs.LG",
    source: "ArXiv ML",
    category: "research",
  },
  {
    url: "https://huggingface.co/blog/feed.xml",
    source: "HuggingFace Blog",
    category: "research",
  },

  // ── Chinese ──
  {
    url: "https://www.qbitai.com/feed",
    source: "量子位",
    category: "chinese",
  },
  {
    url: "https://36kr.com/feed",
    source: "36氪",
    category: "chinese",
  },
  {
    url: "https://www.leiphone.com/feed",
    source: "雷锋网",
    category: "chinese",
  },
  {
    url: "https://www.woshipm.com/feed",
    source: "人人都是产品经理",
    category: "chinese",
  },
  {
    url: "https://www.jiqizhixin.com/rss",
    source: "机器之心",
    category: "chinese",
  },
  {
    url: "https://sspai.com/feed",
    source: "少数派",
    category: "chinese",
  },
  {
    url: "https://www.ifanr.com/feed",
    source: "爱范儿",
    category: "chinese",
  },
];

const EXTRA_FEEDS = [
  { url: "https://www.latent.space/feed", source: "Latent Space · 访谈与工程", category: "thought-leader" },
  { url: "https://www.dwarkesh.com/feed", source: "Dwarkesh Podcast · 深度访谈", category: "thought-leader" },
  { url: "https://lexfridman.com/feed/podcast/", source: "Lex Fridman · 访谈", category: "thought-leader" },
  { url: "https://techcrunch.com/category/artificial-intelligence/feed/", source: "TechCrunch AI", category: "industry" },
  { url: "https://www.technologyreview.com/topic/artificial-intelligence/feed/", source: "MIT Technology Review", category: "industry" },
  { url: "https://deepmind.google/blog/rss.xml", source: "Google DeepMind", category: "research" },
  { url: "https://blog.google/technology/ai/rss/", source: "Google AI", category: "industry" },
  { url: "https://blogs.nvidia.com/blog/category/deep-learning/feed/", source: "NVIDIA AI", category: "industry" },
  { url: "https://www.microsoft.com/en-us/research/feed/", source: "Microsoft Research", category: "research" },
];
export const FEEDS = [...BASE_FEEDS, ...EXTRA_FEEDS].map((feed) => ({
  ...feed,
  category: feed.category as DigestItem["category"],
  kind: (/OpenAI News|Anthropic|Google|HuggingFace|ArXiv|NVIDIA|Microsoft/.test(feed.source) ? "primary"
    : /HackerNews/.test(feed.source) ? "community"
    : feed.category === "thought-leader" ? "analysis" : "reporting") as SourceKind,
  lookbackDays: /访谈/.test(feed.source) ? 30 : 14,
}));
export function plainText(html: string): string {
  const $ = cheerio.load(html);
  $("script,style,nav,footer,header").remove();
  return $.root().text().replace(/\s+/g, " ").trim();
}
export async function fetchAllFeeds(now = new Date()): Promise<{ items: FeedItem[]; health: FeedHealth[] }> {
  const outcomes = await Promise.all(FEEDS.map(async (feed) => {
    const health: FeedHealth = { source: feed.source, url: feed.url, status: "ok", items: 0, undated: 0 };
    try {
      const data = feed.source === "Anthropic News"
        ? await fetchAnthropicNews()
        : await fetchFeed(feed.url);
      const cutoff = now.getTime() - feed.lookbackDays * 86400000;
      const items = data.items.flatMap((item): FeedItem[] => {
        const rawDate = item.isoDate || item.pubDate;
        const date = rawDate ? Date.parse(rawDate) : NaN;
        if (!Number.isFinite(date)) { health.undated++; return []; }
        if (date < cutoff || date > now.getTime() + 3600000) return [];
        const link = canonicalUrl(item.link ?? "");
        if (!link || !item.title) return [];
        const body = (item as Parser.Item & { "content:encoded"?: string })["content:encoded"] || item.content || item.contentSnippet || item.summary || "";
        return [{ title: item.title, link, contentSnippet: plainText(body).slice(0, 12000), pubDate: new Date(date).toISOString(), source: feed.source, category: feed.category, kind: feed.kind }];
      }).sort((a,b) => b.pubDate.localeCompare(a.pubDate) || a.link.localeCompare(b.link)).slice(0, 15);
      health.items = items.length;
      health.status = items.length ? "ok" : "empty";
      console.log(`[feeds] ${feed.source}: ${items.length}`);
      return { items, health };
    } catch (error) {
      health.status = "error";
      health.error = error instanceof Error ? error.message.slice(0, 200) : "Feed unavailable";
      console.warn(`[feeds] unavailable: ${feed.source}`);
      return { items: [], health };
    }
  }));
  return { items: outcomes.flatMap((o) => o.items), health: outcomes.map((o) => o.health) };
}

// Round-robin over publishers, with primary sources first in each round. Network
// completion speed and prolific feeds must not decide the editorial agenda.
export function selectFeedItems(items: FeedItem[], limit = 64): FeedItem[] {
  const sources = [...new Set(items.map((i) => i.source))].sort((a,b) => {
    const order = { primary: 0, reporting: 1, analysis: 2, community: 3 };
    return order[items.find((i) => i.source === a)!.kind] - order[items.find((i) => i.source === b)!.kind] || a.localeCompare(b);
  });
  const groups = sources.map((source) => items.filter((i) => i.source === source).sort((a,b) => b.pubDate.localeCompare(a.pubDate) || a.link.localeCompare(b.link)));
  const selected: FeedItem[] = [];
  const seen = new Set<string>();
  for (let round = 0; round < 6 && selected.length < limit; round++) {
    for (const group of groups) {
      const item = group[round];
      if (!item || seen.has(canonicalUrl(item.link))) continue;
      seen.add(canonicalUrl(item.link)); selected.push(item);
      if (selected.length === limit) break;
    }
  }
  return selected;
}

// Enrich short RSS excerpts only on configured publishers. No cookies, credentials,
// paywall bypass, or unrestricted following of URLs supplied by a feed.
export async function enrichFeedItems(items: FeedItem[]): Promise<FeedItem[]> {
  const allowed = new Set(FEEDS.map((f) => new URL(f.url).hostname.replace(/^www\./, "")));
  const results: FeedItem[] = [];
  for (let offset = 0; offset < items.length; offset += 4) {
    const batch = await Promise.all(items.slice(offset, offset + 4).map(async (item) => {
      if (item.contentSnippet.length >= 3500) return item;
      try {
        let url = new URL(item.link);
        for (let hop = 0; hop < 3; hop++) {
          if (url.protocol !== "https:" || !allowed.has(url.hostname.replace(/^www\./, "")) || url.port || url.username || url.password) return item;
          const response = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(12000), headers: { "User-Agent": "AI-Frontier-Digest/2.0" } });
          if (response.status >= 300 && response.status < 400 && response.headers.get("location")) {
            url = new URL(response.headers.get("location")!, url); await response.body?.cancel(); continue;
          }
          if (!response.ok || !response.headers.get("content-type")?.includes("text/html")) { await response.body?.cancel(); return item; }
          const reader = response.body?.getReader();
          if (!reader) return item;
          const chunks: Uint8Array[] = []; let size = 0;
          try {
            while (true) {
              const part = await reader.read(); if (part.done) break;
              size += part.value.length;
              if (size > 2000000) return item;
              chunks.push(part.value);
            }
          } finally { await reader.cancel(); }
          const $ = cheerio.load(Buffer.concat(chunks).toString("utf8"));
          const body = $("article").first().length ? $("article").first() : $("main").first();
          body.find("nav,footer,header,script,style,aside,form").remove();
          const text = body.text().replace(/\s+/g, " ").trim();
          return text.length > item.contentSnippet.length ? { ...item, contentSnippet: text.slice(0, 14000) } : item;
        }
      } catch { /* RSS excerpt remains usable; never invent the missing text. */ }
      return item;
    }));
    results.push(...batch);
  }
  return results;
}

// Anthropic does not expose the old RSS URL. Parse its public dated newsroom list.
async function fetchAnthropicNews() {
  const response = await fetch("https://www.anthropic.com/news", { signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`Newsroom HTTP ${response.status}`);
  const $ = cheerio.load(await response.text());
  const items: Parser.Item[] = [];
  $('a[href^="/news/"]').each((_, element) => {
    const anchor = $(element);
    const date = anchor.find("time").first().text().trim();
    const title = anchor.find('[class*="title"]').last().text().trim();
    if (!date || !title) return;
    items.push({ title, link: new URL(anchor.attr("href")!, "https://www.anthropic.com").href, pubDate: date + " 00:00:00 GMT", contentSnippet: title });
  });
  return { items };
}

async function fetchFeed(url: string) {
  // rss-parser's parseURL timeout rejects without destroying the underlying
  // request. A stalled publisher can otherwise keep the whole CI job alive.
  const response = await fetch(url, { signal: AbortSignal.timeout(15000), headers: { "User-Agent": "AI-Frontier-Digest/2.0" } });
  if (!response.ok) { await response.body?.cancel(); throw new Error(`Feed HTTP ${response.status}`); }
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Empty feed response");
  const chunks: Uint8Array[] = []; let bytes = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      bytes += part.value.length;
      if (bytes > 5000000) throw new Error("Feed exceeds size limit");
      chunks.push(part.value);
    }
  } finally { await reader.cancel(); }
  return parser.parseString(Buffer.concat(chunks).toString("utf8"));
}
