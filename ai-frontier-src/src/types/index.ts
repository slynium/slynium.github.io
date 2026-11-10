export interface DigestItem {
  id: string;
  publishedAt?: string;
  sourceKind?: SourceKind;
  evidenceQuality?: "substantial" | "limited";
  layers?: KnowledgeLayer[];
  whyItMatters?: string;
  limitations?: string;
  title: string;
  titleZh: string;
  summary: string;
  summaryZh: string;
  insight: string;
  url: string;
  source: string;
  category: "github" | "github-new" | "github-hot" | "research" | "industry" | "thought-leader" | "chinese";
  tags: string[];
  // objective importance score 1-10, used for global hot ranking
  importance: number;
  // optional project relevance (may be absent / general)
  relevance: "a2a" | "agent-ads" | "geo" | "general";
  // tag types for richer labeling
  labelType?: "model-release" | "benchmark" | "knowledge-base" | "open-source" | "industry-news" | "research" | "policy" | "thought-leader" | "general";
  date: string;
}

export interface DailyDigest {
  date: string;
  dateZh: string;
  schemaVersion?: number;
  topics?: TrendTopic[];
  // Snapshot of background editions; used when a published digest ships its own library.
  backgroundTopics?: TrendTopic[];
  topicGeneration?: { status: "complete" | "partial" | "failed" | "insufficient"; attempted: number; published: number; failures: { title: string; reason: string }[] };
  coverage?: { fetchedAt: string; lookbackDays: number; sources: FeedHealth[]; selected: number; published: number; warnings: string[] };
  // global top 10 by importance, regardless of project relevance
  hotRanking: DigestItem[];
  // subset of hotRanking items that relate to user's 3 projects
  pmHighlights: DigestItem[];
  // github split into new entries vs persistent hot
  githubNew: DigestItem[];
  githubHot: DigestItem[];
  research: DigestItem[];
  industry: DigestItem[];
  thoughtLeaders: DigestItem[];
  chinese: DigestItem[];
  editorNote: string;
  coreInsight?: CoreInsight;
  // legacy, kept for compatibility during transition
  highlights: DigestItem[];
  github: DigestItem[];
}

export type KnowledgeLayer = "models" | "infrastructure" | "agents" | "products" | "business" | "governance";
export type SourceKind = "primary" | "reporting" | "analysis" | "community";
export interface TopicSource {
  id: string;
  title: string;
  url: string;
  source: string;
  kind: SourceKind;
  publishedAt?: string;
}
export interface TopicSection {
  heading: string;
  body: string;
  sourceIds: string[];
  kind: "fact" | "analysis" | "uncertainty";
}
export interface TrendTopic {
  id: string;
  title: string;
  thesis: string;
  whyNow: string;
  layers: KnowledgeLayer[];
  sections: TopicSection[];
  sources: TopicSource[];
  watchNext: string[];
  updatedAt: string;
  origin: "generated" | "curated";
}
export interface FeedHealth {
  source: string;
  url: string;
  status: "ok" | "empty" | "error";
  items: number;
  undated: number;
  error?: string;
}

export interface CoreInsight {
  date: string;
  origin: "generated" | "curated";
  takeaway: string;
  highlights: string[];
  points: { title: string; fact: string; meaning: string; watch: string; highlights: string[]; sourceIds: string[] }[];
  boundary: string;
  sources: TopicSource[];
}
