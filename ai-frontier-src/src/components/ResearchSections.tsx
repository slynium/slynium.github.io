"use client";

import { DigestText } from "./DigestText";
import { SectionHeader } from "./SectionHeader";
import { useState } from "react";
import type { DailyDigest, DigestItem, KnowledgeLayer, TrendTopic } from "@/types";
import { KNOWLEDGE_EDGES, KNOWLEDGE_LAYERS, layersForItem } from "@/lib/knowledge";

const KIND = { primary: "一手资料", reporting: "媒体报道", analysis: "分析 / 访谈", community: "社区信号" };
const SECTION_KIND = { fact: "材料陈述", analysis: "分析判断", uncertainty: "证据边界" };

export function TopicCard({ topic }: { topic: TrendTopic }) {
  return <article id={`topic-${topic.id}`} data-reader-card tabIndex={-1} className="topic-card digest-card digest-card-padding">
    <div className="digest-meta flex flex-wrap items-center gap-x-2 gap-y-1 mb-2.5">
      <span className="digest-badge">{topic.origin === "curated" ? "编辑精选" : "多源综合"}</span>
      <span>{topic.updatedAt} · {topic.sources.length} 篇材料 · {new Set(topic.sources.map((s) => new URL(s.url).hostname.replace(/^www\./, ""))).size} 个来源域名</span>
    </div>
    <h3 className="digest-card-title">{topic.title}</h3>
    <DigestText className="mt-3" label="编辑判断：">{topic.thesis}</DigestText>
    <DigestText className="mt-2" label="为什么现在看：">{topic.whyNow}</DigestText>
    <details className="digest-disclosure mt-3 group">
      <summary className="digest-disclosure-toggle">展开深读 · 机制、分歧与证据</summary>
      <div className="digest-expanded-content space-y-5">
        {topic.sections.map((section, index) => <div key={index}>
          <div className="flex flex-wrap items-center gap-2 mb-2"><span className="digest-badge">{SECTION_KIND[section.kind]}</span><h4 className="digest-subheading">{section.heading}</h4></div>
          <DigestText>{section.body}</DigestText>
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">{section.sourceIds.map((id) => { const source = topic.sources.find((s) => s.id === id); return source ? <a key={id} href={source.url} target="_blank" rel="noopener noreferrer" className="digest-source-link">{source.source} ↗</a> : null; })}</div>
        </div>)}
        <div className="digest-inset p-4"><h4 className="digest-subheading mb-2">接下来观察什么</h4><ul className="digest-body list-disc pl-4">{topic.watchNext.map((watch) => <li key={watch}>{watch}</li>)}</ul></div>
        <div className="digest-divider pt-4"><h4 className="digest-subheading mb-3">来源档案 · 多个域名不等于独立验证</h4><ul className="space-y-2">{topic.sources.map((source) => <li key={source.id} className="digest-caption"><span className="text-[var(--text-muted)]">{KIND[source.kind]} · {source.publishedAt?.slice(0,10) || "日期未标注"} · </span><a href={source.url} target="_blank" rel="noopener noreferrer" className="digest-link">{source.title}</a></li>)}</ul></div>
      </div>
    </details>
  </article>;
}
export function TrendSection({ topics, background = [], generation }: { topics: TrendTopic[]; background?: TrendTopic[]; generation?: DailyDigest["topicGeneration"] }) {
  const failed = generation?.status === "failed" || generation?.status === "partial";
  return <section id="trends" className="scroll-mt-28 mb-8">
    <SectionHeader icon="✦" title="趋势专题" count={topics.length} note="本期更新 · 把事件连起来看" />
    {topics.length ? <div className="space-y-4">{topics.map((topic) => <TopicCard key={topic.id} topic={topic}/>)}</div> : <p className="digest-empty">{failed || !generation ? "本期新专题尚未完成生成与校验。下方背景深读保留原核对日期，不作为今日更新。" : "本期尚未选出证据充分的跨来源专题。可先阅读资讯与背景深读。"}</p>}
    {failed && topics.length > 0 && <p className="digest-caption mt-3">本期已刊出 {topics.length} 篇专题，其余选题仍待完成校验。</p>}
    {background.length > 0 && <details className="trend-library digest-disclosure mt-4">
      <summary className="digest-disclosure-toggle">背景深读 · {background.length} 篇已刊专题（保留原日期）</summary>
      <p className="digest-caption my-3">用于补充背景，默认收起；不计入本期新增专题。</p>
      <div className="space-y-4">{background.map((topic) => <TopicCard key={topic.id} topic={topic}/>)}</div>
    </details>}
  </section>;
}
export function KnowledgeGraph({ items, topics }: { items: DigestItem[]; topics: TrendTopic[] }) {
  const [selected, setSelected] = useState<KnowledgeLayer>("agents");
  const layer = KNOWLEDGE_LAYERS.find((l) => l.id === selected)!;
  const related = items.filter((i) => layersForItem(i).includes(selected));
  const relatedTopics = topics.filter((t) => t.layers.includes(selected));
  const edges = KNOWLEDGE_EDGES.filter((edge) => edge.from === selected || edge.to === selected);
  return <section id="knowledge" className="scroll-mt-28 mb-8">
    <SectionHeader icon="⌘" title="AI 知识图谱" count={KNOWLEDGE_LAYERS.length} note="从一条新闻，走向一个系统" />
    <div className="digest-card digest-card-padding">
      <p className="digest-caption mb-4">点击任一层，查看它与其他层的关系及本期材料。连线是编辑整理的概念关系，不代表新闻证明的因果关系。</p>
      <div className="knowledge-map">
        <svg viewBox="0 0 600 220" preserveAspectRatio="none" aria-hidden="true" className="hidden sm:block absolute inset-0 w-full h-full pointer-events-none">
          {KNOWLEDGE_EDGES.map((edge) => { const a = KNOWLEDGE_LAYERS.findIndex((l) => l.id === edge.from); const b = KNOWLEDGE_LAYERS.findIndex((l) => l.id === edge.to); const active = edge.from === selected || edge.to === selected; return <line key={`${a}-${b}`} x1={100 + a % 3 * 200} y1={a < 3 ? 50 : 170} x2={100 + b % 3 * 200} y2={b < 3 ? 50 : 170} stroke={active ? "var(--border-strong)" : "var(--border-light)"} strokeWidth={active ? 2 : 1} />; })}
        </svg>
        {KNOWLEDGE_LAYERS.map((node) => <button key={node.id} aria-pressed={selected === node.id} aria-controls="knowledge-detail" onClick={() => setSelected(node.id)} className={`knowledge-node ${selected === node.id ? "is-selected" : ""}`}>
          <span className="digest-subheading">{node.label}</span><span className="knowledge-node-caption">{node.question}</span>
        </button>)}
      </div>
      <div id="knowledge-detail" className="digest-divider mt-5 pt-5" aria-live="polite">
        <h3 className="digest-card-title">{layer.label}</h3><p className="digest-body mt-2">{layer.description}</p>
        <div className="grid sm:grid-cols-2 gap-3 mt-4">{edges.map((edge) => { const other = edge.from === selected ? edge.to : edge.from; return <button key={`${edge.from}-${edge.to}`} onClick={() => setSelected(other)} className="knowledge-edge">
          <span className="digest-subheading block">{KNOWLEDGE_LAYERS.find((l) => l.id === edge.from)?.label} → {KNOWLEDGE_LAYERS.find((l) => l.id === edge.to)?.label} · {edge.label}</span><span className="block digest-caption mt-1">{edge.explanation}</span>
        </button>; })}</div>
        <div className="mt-5"><h4 className="digest-subheading mb-3">相关专题 {relatedTopics.length} · 关联资讯 {related.length}</h4>
          {relatedTopics.map((topic) => <a key={topic.id} href={`#topic-${topic.id}`} className="digest-link digest-body block py-2">专题 · {topic.title} ↗</a>)}
          <ul className="knowledge-related">{related.slice(0,8).map((item) => <li key={item.id} className="py-2 digest-caption"><a href={item.url} target="_blank" rel="noopener noreferrer" className="digest-link">{item.titleZh || item.title} ↗</a><span className="digest-meta ml-2">{item.source}</span></li>)}</ul>
          {!related.length && !relatedTopics.length && <p className="digest-caption">本期暂无直接关联材料；概念节点保留，便于继续积累。</p>}
        </div>
      </div>
    </div>
  </section>;
}
export function Coverage({ coverage }: { coverage: DailyDigest["coverage"] }) {
  if (!coverage) return null;
  const ok = coverage.sources.filter((s) => s.status === "ok").length;
  return <details className="digest-coverage digest-disclosure mb-6"><summary className="digest-disclosure-toggle">来源覆盖 · {ok}/{coverage.sources.length} 个源有近期材料 · {coverage.published} 条入选</summary>
    <p className="digest-caption mt-3 break-words">新闻回看 {coverage.lookbackDays} 天，访谈回看 30 天；热榜只选近 7 天材料。条目展示原文日期。无日期条目不冒充今日新闻。采集：{coverage.fetchedAt}</p>
    {coverage.warnings.map((w) => <p className="digest-caption mt-2" key={w}>{w}</p>)}
    <ul className="grid sm:grid-cols-2 gap-x-4 mt-2">{coverage.sources.map((source) => <li key={source.url} className="digest-caption">{source.status === "ok" ? "✓" : source.status === "empty" ? "○" : "!"} {source.source} · {source.status === "error" ? "暂不可用" : `${source.items} 篇`}{source.undated > 0 && ` · ${source.undated} 篇缺日期`}</li>)}</ul>
  </details>;
}
export function ArticleDepth({ item }: { item: DigestItem }) {
  if (!item.whyItMatters && !item.limitations) return null;
  return <details className="digest-disclosure mb-3"><summary className="digest-disclosure-toggle">影响与证据边界</summary>{item.whyItMatters && <DigestText className="mt-2" label="为什么重要：">{item.whyItMatters}</DigestText>}{item.limitations && <DigestText className="mt-2" label="仍需验证：">{item.limitations}</DigestText>}<p className="digest-meta mt-2">{item.sourceKind && KIND[item.sourceKind]} · {item.publishedAt?.slice(0,10) || "发布时间未标注"}{item.evidenceQuality === "limited" && " · 材料有限"}</p></details>;
}
