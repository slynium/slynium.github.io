"use client";

import { DailyDigest, DigestItem } from "@/types";
import { useState, useEffect, useCallback } from "react";
import { uniqueItems } from "@/lib/knowledge";
import { ArticleDepth, Coverage, KnowledgeGraph, TopicCard, TrendSection } from "./ResearchSections";
import { CoreInsight } from "./CoreInsight";
import { SectionHeader } from "./SectionHeader";
import { KeyboardHelp, useReaderKeyboard } from "./useReaderKeyboard";
import { DigestText } from "./DigestText";

/* ─────────────────────────────────────────
   Constants
───────────────────────────────────────── */

const RELEVANCE = {
  a2a: { label: "A2A协作" }, "agent-ads": { label: "Agent广告" },
  geo: { label: "GEO增强" }, general: { label: "前沿动态" },
};

const LABEL_TYPE_NAMES: Record<string, string> = {
  "model-release":  "新模型",
  "benchmark":      "评测",
  "knowledge-base": "知识库",
  "open-source":    "开源",
  "industry-news":  "行业",
  "research":       "研究",
  "policy":         "政策",
  "thought-leader": "观点",
  "general":        "动态",
};

const SECTIONS = [
  { id: "trends", label: "趋势专题", icon: "✦", key: "8" },
  { id: "knowledge", label: "知识图谱", icon: "⌘", key: "9" },
  { id: "hot-ranking", label: "全球热榜",  icon: "▲",  key: "1" },
  { id: "pm-focus",    label: "PM关联",    icon: "→",  key: "2" },
  { id: "github",      label: "开源热项",  icon: "◎",  key: "3" },
  { id: "thought",     label: "大佬说",    icon: "◆",  key: "4" },
  { id: "industry",    label: "行业动态",  icon: "○",  key: "5" },
  { id: "research",    label: "前沿研究",  icon: "◇",  key: "6" },
  { id: "chinese",     label: "国内速递",  icon: "◉",  key: "7" },
];

/* ─────────────────────────────────────────
   Small components
───────────────────────────────────────── */

function ImportanceBar({ score }: { score: number }) {
  const pct = Math.round((score / 10) * 100);
  return (
    <div className="flex items-center gap-1.5 shrink-0" title={`重要度 ${score}/10`}>
      <div className="w-14 h-1 rounded-full bg-[var(--border-light)] overflow-hidden">
        <div className={`h-full rounded-full bg-[var(--text-secondary)]`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[11px] font-mono text-[var(--text-muted)]">{score}</span>
    </div>
  );
}

function RelevanceBadge({ relevance }: { relevance: string }) {
  if (relevance === "general") return null;
  const cfg = RELEVANCE[relevance as keyof typeof RELEVANCE];
  if (!cfg) return null;
  return (
    <span className="digest-badge">
      {cfg.label}
    </span>
  );
}

function LabelTypeBadge({ labelType }: { labelType?: string }) {
  if (!labelType || labelType === "general") return null;
  const name = LABEL_TYPE_NAMES[labelType] ?? labelType;
  return (
    <span className="digest-badge">
      {name}
    </span>
  );
}

/* ─────────────────────────────────────────
   ItemCard — full summary, no line-clamp
───────────────────────────────────────── */

function ItemCard({
  item, rank, focused = false, cardRef, showImportance = false,
}: {
  item: DigestItem; rank?: number; focused?: boolean;
  cardRef?: React.Ref<HTMLDivElement>; showImportance?: boolean;
}) {
  return (
    <div
      ref={cardRef}
      data-reader-card
      tabIndex={-1}
      className={`group digest-card transition-shadow duration-200 ${focused ? "is-focused" : ""}`}
    >
      <div className="digest-card-padding">
        {/* badges row */}
        <div className="flex items-center gap-1.5 mb-2 flex-wrap">
          {rank !== undefined && (
            <span className="text-[11px] font-mono text-[var(--text-muted)] shrink-0">{String(rank + 1).padStart(2, "0")}</span>
          )}
          <LabelTypeBadge labelType={item.labelType} />
          <RelevanceBadge relevance={item.relevance} />
          {showImportance && <ImportanceBar score={item.importance ?? 5} />}
        </div>

        {/* title — prominent, clickable */}
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="digest-card-title block transition-colors mb-2.5 group-hover:underline decoration-[var(--border-strong)] underline-offset-2"
        >
          {item.titleZh || item.title}
        </a>

        {/* summary with number highlights */}
        {item.summaryZh && (
          <DigestText className="mb-3">{item.summaryZh}</DigestText>
        )}

        {/* insight */}
        {item.insight && item.relevance !== "general" && (
          <div className="digest-inset p-3 mb-3">
            <DigestText>{item.insight}</DigestText>
          </div>
        )}

        <ArticleDepth item={item} />
        {/* footer */}
        <div className="flex items-center justify-between gap-2 mt-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="digest-meta">{item.source}</span>
            {item.tags?.slice(0, 2).map((tag) => (
              <span key={tag} className="digest-badge hidden sm:inline-flex">
                {tag}
              </span>
            ))}
          </div>
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors shrink-0 flex items-center gap-0.5 font-medium"
          >
            原文
            <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
              <path d="M2 8L8 2M8 2H4M8 2V6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   HotRankingCard — numbered, importance bar
───────────────────────────────────────── */

function HotRankingCard({ item, index }: { item: DigestItem; index: number }) {
  return (
    <div data-reader-card tabIndex={-1} className="group relative digest-card transition-shadow duration-200">
      <div className="digest-card-padding">
        {/* rank row */}
        <div className="flex items-center gap-2 mb-2.5">
          <span className={`text-[20px] font-bold font-mono shrink-0 leading-none tabular-nums
            text-[var(--text-secondary)]
          `}>
            {String(index + 1).padStart(2, "0")}
          </span>
          <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0">
            <LabelTypeBadge labelType={item.labelType} />
            <RelevanceBadge relevance={item.relevance} />
          </div>
          <ImportanceBar score={item.importance ?? 5} />
        </div>

        {/* title — large and clickable */}
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="digest-card-title block transition-colors mb-3 group-hover:underline decoration-[var(--border-strong)] underline-offset-2"
        >
          {item.titleZh || item.title}
        </a>

        {/* summary with number highlights */}
        {item.summaryZh && (
          <DigestText className="mb-3">{item.summaryZh}</DigestText>
        )}

        {/* insight */}
        {item.insight && item.relevance !== "general" && (
          <div className="digest-inset p-3 mb-3">
            <DigestText>{item.insight}</DigestText>
          </div>
        )}

        <ArticleDepth item={item} />
        {/* footer */}
        <div className="flex items-center justify-between gap-2 mt-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="digest-meta">{item.source}</span>
            {item.tags?.slice(0, 2).map((tag) => (
              <span key={tag} className="digest-badge hidden sm:inline-flex">
                {tag}
              </span>
            ))}
          </div>
          <a href={item.url} target="_blank" rel="noopener noreferrer"
            className="text-[11px] text-[var(--accent)] hover:text-[var(--accent-hover)] font-medium transition-colors flex items-center gap-0.5 shrink-0">
            原文
            <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
              <path d="M2 8L8 2M8 2H4M8 2V6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   PMFocusSection — relevance grouped, below hot ranking
───────────────────────────────────────── */

function PMFocusSection({ items }: { items: DigestItem[] }) {
  if (items.length === 0) return null;

  const grouped = {
    a2a:         items.filter((i) => i.relevance === "a2a"),
    "agent-ads": items.filter((i) => i.relevance === "agent-ads"),
    geo:         items.filter((i) => i.relevance === "geo"),
  };

  const hasAny = Object.values(grouped).some((g) => g.length > 0);
  if (!hasAny) return null;

  return (
    <section id="pm-focus" className="scroll-mt-28 mb-8">
      <SectionHeader icon="→" title="PM 关联" note="来自今日热榜" />

      <div className="digest-grid">
        {(["a2a", "agent-ads", "geo"] as const).map((key) => {
          const cfg = RELEVANCE[key];
          const keyItems = grouped[key];
          if (!keyItems.length) return null;
          return (
            <div key={key} className="digest-card digest-card-padding">
              <div className="flex items-center gap-2 mb-3 pb-2.5 border-b border-[var(--border-subtle)]">
                <span className="text-[13px] font-semibold text-[var(--text-primary)]">{cfg.label}</span>
                <span className="text-[11px] text-[var(--text-muted)] ml-auto">{keyItems.length}</span>
              </div>
              <div className="flex flex-col gap-3">
                {keyItems.map((item) => (
                  <div key={item.id} data-reader-card tabIndex={-1}>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="digest-card-title block mb-2"
                    >
                      {item.titleZh || item.title}
                    </a>
                    {item.insight && (
                      <DigestText>{item.insight}</DigestText>
                    )}
                    <p className="text-[11px] text-[var(--text-muted)] mt-1">{item.source}</p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────
   GitHub Section — new vs persistent hot
───────────────────────────────────────── */

function GitHubSection({ newItems, hotItems }: { newItems: DigestItem[]; hotItems: DigestItem[] }) {
  const [tab, setTab] = useState<"new" | "hot">(newItems.length > 0 ? "new" : "hot");
  if (newItems.length === 0 && hotItems.length === 0) return null;

  const displayed = tab === "new" ? newItems : hotItems;

  return (
    <section id="github" className="scroll-mt-28 mb-8">
      <SectionHeader icon="◎" title="开源热项">
        {/* Tab toggle */}
        <div className="flex items-center gap-1 bg-[var(--bg-inset)] rounded-xl p-0.5">
          {newItems.length > 0 && (
            <button
              onClick={() => setTab("new")}
              className={`text-[11px] font-medium px-3 py-1 rounded-lg transition-all ${
                tab === "new" ? "bg-white shadow-sm text-[var(--text-primary)]" : "text-[var(--text-muted)]"
              }`}
            >
              新上榜 {newItems.length}
            </button>
          )}
          {hotItems.length > 0 && (
            <button
              onClick={() => setTab("hot")}
              className={`text-[11px] font-medium px-3 py-1 rounded-lg transition-all ${
                tab === "hot" ? "bg-white shadow-sm text-[var(--text-primary)]" : "text-[var(--text-muted)]"
              }`}
            >
              持续热门 {hotItems.length}
            </button>
          )}
        </div>
      </SectionHeader>

      {tab === "hot" && hotItems.length > 0 && (
        <p className="text-[12px] text-[var(--text-muted)] mb-4 ml-0.5">这些项目过去7天曾出现于 Trending，本次再次上榜；不代表每天在榜或今日发布。</p>
      )}

      <div className="digest-grid">
        {displayed.map((item, i) => <ItemCard key={item.id} item={item} rank={i} />)}
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────
   SectionBlock
───────────────────────────────────────── */

function SectionBlock({
  id, title, icon, items, defaultExpanded = true, cols = 2,
}: {
  id: string; title: string; icon: string;
  items: DigestItem[]; defaultExpanded?: boolean; cols?: 1 | 2;
}) {
  const [open, setOpen] = useState(defaultExpanded);
  if (items.length === 0) return null;
  const gridClass = cols === 2 ? "digest-grid" : "grid gap-4";

  return (
    <section id={id} className="scroll-mt-28 mb-8">
      <button aria-expanded={open} aria-controls={`${id}-items`} onClick={() => setOpen(!open)} className="w-full text-left group">
        <SectionHeader icon={icon} title={title} count={items.length} />
      </button>
      {open && <div id={`${id}-items`} className={gridClass}>{items.map((item, i) => <ItemCard key={item.id} item={item} rank={i} />)}</div>}
    </section>
  );
}

/* ─────────────────────────────────────────
   Mobile Tab Nav
───────────────────────────────────────── */

function MobileTabNav({ activeSection, counts, navigate }: { activeSection: string; counts: Record<string, number>; navigate: (id: string) => void }) {
  return (
    <div
      className="lg:hidden sticky top-14 z-40 overflow-x-auto scrollbar-hide border-b"
      style={{ background: "rgba(244,243,239,0.96)", backdropFilter: "blur(12px)", borderColor: "var(--border-card)" }}
    >
      <div className="flex items-center gap-1 px-4 py-2.5 min-w-max">
        {SECTIONS.map(({ id, label }) => {
          const count = counts[id] ?? 0;
          if (!count && id !== "trends" && id !== "knowledge") return null;
          const active = activeSection === id;
          return (
            <button
              key={id}
              onClick={() => navigate(id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-all duration-150 shrink-0 ${
                active ? "bg-[var(--text-primary)] text-white" : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
              }`}
            >
              {label}
              {active && <span className="text-[11px] opacity-60">{count}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   Desktop Sidebar
───────────────────────────────────────── */

function DesktopSidebar({
  activeSection, counts, navigate,
}: {
  activeSection: string; counts: Record<string, number>; navigate: (id: string) => void;
}) {
  return (
    <aside className="hidden lg:flex w-44 shrink-0 sticky top-14 self-start h-[calc(100vh-3.5rem)] flex-col pt-8 pl-2 pr-4">
      <nav className="flex flex-col gap-0.5 flex-1 overflow-y-auto">
        {SECTIONS.map(({ id, label, icon, key }) => {
          const count = counts[id] ?? 0;
          if (!count && id !== "trends" && id !== "knowledge") return null;
          const active = activeSection === id;
          return (
            <button
              key={id}
              onClick={() => navigate(id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all duration-150 text-left group ${
                active ? "bg-[var(--text-primary)] text-white" : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`text-[12px] leading-none ${active ? "opacity-80" : "opacity-40"}`}>{icon}</span>
                <span className="text-[12px] font-medium">{label}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className={`text-[11px] font-mono ${active ? "opacity-60" : "text-[var(--text-muted)]"}`}>{count}</span>
                <kbd className={`text-[11px] border rounded px-1 hidden group-hover:inline ${active ? "border-white/20 text-white/50" : "border-[var(--border-light)] text-[var(--text-muted)]"}`}>{key}</kbd>
              </div>
            </button>
          );
        })}
      </nav>

      <div className="mt-4 pt-4 border-t border-[var(--border-subtle)] pb-6">
        <p className="text-[11px] text-[var(--text-muted)] mb-2 font-medium uppercase tracking-wider">快捷键</p>
        {[["j/k","逐条阅读"],["PgUp/Dn","翻页"],["1–9","跳转"],["/","搜索"],["?","帮助"]].map(([k, d]) => (
          <div key={k} className="flex items-center justify-between mb-1.5">
            <kbd className="text-[11px] text-[var(--text-secondary)] bg-[var(--bg-inset)] border border-[var(--border-light)] rounded px-1.5 py-0.5 font-mono">{k}</kbd>
            <span className="text-[11px] text-[var(--text-muted)]">{d}</span>
          </div>
        ))}
      </div>
    </aside>
  );
}

/* ─────────────────────────────────────────
   Main DigestView
───────────────────────────────────────── */

export function DigestView({ digest }: { digest: DailyDigest }) {
  const [activeSection, setActiveSection] = useState("trends");
  const [searchQuery, setSearchQuery]     = useState("");


  // Support both new schema and legacy schema
  const hotRanking   = digest.hotRanking   ?? digest.highlights ?? [];
  const pmHighlights = digest.pmHighlights ?? hotRanking.filter((i) => i.relevance !== "general");
  const githubNew    = digest.githubNew    ?? [];
  const githubHot    = digest.githubHot    ?? digest.github ?? [];

  const topics = digest.topics ?? [];
  const allTopics = [...topics, ...(digest.backgroundTopics ?? [])];
  const allItems: DigestItem[] = uniqueItems([
    ...githubNew, ...githubHot, ...pmHighlights,
    ...hotRanking,
    ...(digest.thoughtLeaders ?? []),
    ...(digest.industry ?? []),
    ...(digest.research ?? []),
    ...(digest.chinese ?? []),
  ]);

  const filteredItems = searchQuery.trim()
    ? allItems.filter((item) => {
        const q = searchQuery.trim().toLowerCase();
        return (
          item.titleZh?.toLowerCase().includes(q) ||
          item.title?.toLowerCase().includes(q) ||
          item.summaryZh?.toLowerCase().includes(q) ||
          item.tags?.some((t) => t.toLowerCase().includes(q)) ||
          item.source?.toLowerCase().includes(q)
        );
      })
    : null;

  const q = searchQuery.trim().toLowerCase();
  const filteredTopics = q ? allTopics.filter((t) => `${t.title} ${t.thesis} ${t.sections.map((s) => s.body).join(" ")}`.toLowerCase().includes(q)) : [];
  const githubCount = githubNew.length + githubHot.length;

  const counts: Record<string, number> = {
    trends: topics.length, knowledge: 6,
    "hot-ranking": hotRanking.length,
    "pm-focus":    pmHighlights.length,
    github:        githubCount,
    thought:       (digest.thoughtLeaders ?? []).length,
    industry:      (digest.industry ?? []).length,
    research:      (digest.research ?? []).length,
    chinese:       (digest.chinese ?? []).length,
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) { setActiveSection(entry.target.id); break; }
        }
      },
      { rootMargin: "-10% 0px -75% 0px" }
    );
    SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [searchQuery]);

  const clearSearch = useCallback(() => setSearchQuery(""), []);
  const navigate = useCallback((id: string) => {
    setSearchQuery("");
    requestAnimationFrame(() => {
      const section = document.getElementById(id);
      if (!section) return;
      section.tabIndex = -1;
      section.focus({ preventScroll: true });
      section.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
      setActiveSection(id);
    });
  }, []);
  useReaderKeyboard(clearSearch, navigate, SECTIONS);

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-page)" }}>

      <KeyboardHelp />
      {/* Header */}
      <header
        className="sticky top-0 z-50 border-b"
        style={{ background: "rgba(244,243,239,0.92)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", borderColor: "var(--border-card)" }}
      >
        <div className="max-w-[1200px] mx-auto px-5 sm:px-8 h-14 flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-7 h-7 rounded-xl bg-[var(--text-primary)] flex items-center justify-center">
              <span className="text-[11px] font-bold text-white tracking-tight">日报</span>
            </div>
            <span className="font-semibold text-[13px] sm:text-[15px] text-[var(--text-primary)] tracking-tight">pupu的AI日报</span>
          </div>

          {/* Search — desktop only, fixed width centered */}
          <div className="relative w-72 hidden lg:block">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" width="12" height="12" viewBox="0 0 16 16" fill="none">
              <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <input
              data-reader-search
              aria-label="搜索资讯与专题"
              type="text"
              placeholder="搜索标题、来源、标签..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); }}
              className="w-full bg-white border border-[var(--border-light)] rounded-xl pl-8 pr-8 py-1.5 text-[13px] text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-[var(--accent)] transition-all"
            />
            {q && (
              <button
                aria-label="清除搜索"
                onClick={() => { setSearchQuery(""); }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            )}
          </div>

          {/* Right meta */}
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-[12px] text-[var(--text-muted)] hidden sm:block">{digest.dateZh}</span>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)]" />
              <span className="text-[11px] text-[var(--text-muted)]">本期 {digest.date}</span>
            </div>
          </div>
        </div>
      </header>

      <MobileTabNav activeSection={activeSection} counts={counts} navigate={navigate} />

      <div className="max-w-[1200px] mx-auto px-5 sm:px-8 flex gap-10">

        <DesktopSidebar
          activeSection={activeSection}
          counts={counts}
          navigate={navigate}
        />

        <main className="flex-1 min-w-0 py-6 sm:py-8">

          {/* Mobile search */}
          <div className="relative mb-5 lg:hidden">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" width="13" height="13" viewBox="0 0 16 16" fill="none">
              <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <input
              data-reader-search
              aria-label="搜索资讯与专题"
              type="text"
              placeholder="搜索资讯、来源、标签..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); }}
              className="w-full bg-white border border-[var(--border-light)] rounded-xl pl-9 pr-10 py-2.5 text-[13px] text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-[var(--accent)] transition-all"
            />
            {q && (
              <button aria-label="清除搜索" onClick={() => setSearchQuery("")} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                <svg width="11" height="11" viewBox="0 0 10 10" fill="none">
                  <path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            )}
          </div>

          {/* Hero */}
          <div className="mb-6">
            <h1 className="text-[22px] sm:text-[26px] font-bold text-[var(--text-primary)] tracking-tight mb-1">每日 AI 前沿 · 从资讯到洞见</h1>
            <p className="text-[13px] text-[var(--text-muted)]">{digest.dateZh} · 共 {allItems.length} 条去重资讯 · {topics.length} 个专题</p>
            <button onClick={() => document.querySelector<HTMLDialogElement>("#keyboard-help")?.showModal()} className="digest-help-trigger mt-3">键盘阅读指南 ?</button>
          </div>

          {!q && <Coverage coverage={digest.coverage} />}
          {/* Editor Note */}
          {!q && digest.coreInsight && <CoreInsight insight={digest.coreInsight} />}
          {!q && !digest.coreInsight && digest.editorNote && (
            <div className="digest-editor-note mb-8 digest-card-padding">
              <div className="flex items-center gap-2 mb-3">
                <h2 className="digest-card-title">✦ 本期洞见</h2>
                <span className="text-[11px] text-[var(--text-muted)] ml-1">· 编辑说明</span>
              </div>
              <DigestText className="digest-editor-prose">{digest.editorNote}</DigestText>
            </div>
          )}

          {/* Search results */}
          {q && (
            <div className="mb-8">
              <div className="flex flex-wrap items-center gap-2 mb-5">
                <span className="text-[13px] text-[var(--text-secondary)]">搜索</span>
                <span className="text-[13px] font-mono text-[var(--text-primary)] bg-[var(--bg-inset)] border border-[var(--border-light)] px-2 py-0.5 rounded-lg break-all min-w-0">&quot;{searchQuery}&quot;</span>
                <span className="text-[13px] text-[var(--text-muted)]">· {filteredItems?.length ?? 0} 条资讯 / {filteredTopics.length} 个专题</span>
                <button onClick={() => setSearchQuery("")} className="ml-auto text-[12px] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors border border-[var(--border-light)] rounded-lg px-3 py-1">清除</button>
              </div>
              <div className="space-y-4 mb-5">{filteredTopics.map((topic) => <TopicCard key={topic.id} topic={topic}/>)}</div>
              <div className="digest-grid">
                {(filteredItems ?? []).map((item, i) => (
                  <ItemCard key={item.id} item={item} rank={i}  />
                ))}
                {(filteredItems?.length ?? 0) === 0 && filteredTopics.length === 0 && (
                  <p className="text-[13px] text-[var(--text-muted)] md:col-span-2 py-12 text-center">没有找到相关内容</p>
                )}
              </div>
            </div>
          )}

          {/* Main content */}
          {!q && (
            <>
              <TrendSection topics={topics} background={digest.backgroundTopics} generation={digest.topicGeneration} />
              <KnowledgeGraph items={allItems} topics={allTopics} />
              {/* ── 全球热榜 ── */}
              {hotRanking.length > 0 && (
                <section id="hot-ranking" className="scroll-mt-28 mb-8">
                  <SectionHeader icon="▲" title="全球热榜" note="按影响力排序" />
                  <div className="digest-grid">
                    {hotRanking.map((item, i) => (
                      <HotRankingCard key={item.id} item={item} index={i} />
                    ))}
                  </div>
                </section>
              )}

              {/* ── PM 关联 ── */}
              <PMFocusSection items={pmHighlights} />

              {/* ── GitHub 开源 ── */}
              <GitHubSection newItems={githubNew} hotItems={githubHot} />

              {/* ── 大佬说 ── */}
              <SectionBlock id="thought"  title="大佬说"   icon="◆" items={digest.thoughtLeaders ?? []} />

              {/* ── 行业动态 ── */}
              <SectionBlock id="industry" title="行业动态" icon="○" items={digest.industry ?? []} />

              {/* ── 国内速递 ── */}
              <SectionBlock id="chinese"  title="国内速递" icon="◉" items={digest.chinese ?? []} />

              {/* ── 前沿研究（默认折叠）── */}
              <SectionBlock id="research" title="前沿研究" icon="◇" items={digest.research ?? []} defaultExpanded={false} />
            </>
          )}

          <footer className="mt-16 pt-6 border-t border-[var(--border-subtle)]">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <span className="text-[12px] text-[var(--text-muted)]">pupu的AI日报 · Claude API 每日自动生成</span>
              <div className="flex items-center gap-3 flex-wrap">
                {(["model-release","benchmark","knowledge-base","thought-leader"] as const).map((k) => (
                  <span key={k} className="digest-badge">
                    {LABEL_TYPE_NAMES[k]}
                  </span>
                ))}
              </div>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
