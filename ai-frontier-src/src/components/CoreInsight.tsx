import type { CoreInsight as Insight } from "../types";
import { emphasisParts } from "../lib/core-insight";

function Emphasis({ text, phrases }: { text: string; phrases: string[] }) {
  return emphasisParts(text, phrases).map((part, i) => part.highlighted ? <mark key={i}><strong>{part.text}</strong></mark> : part.text);
}
export function CoreInsight({ insight }: { insight: Insight }) {
  return <section aria-labelledby="core-insight-title" className="digest-editor-note digest-card-padding mb-8">
    <div className="flex flex-wrap items-center gap-2 mb-3">
      <h2 id="core-insight-title" className="digest-card-title">✦ 本期核心洞见</h2>
      <span className="digest-meta">{insight.origin === "curated" ? "编辑校订" : "多源综合"} · {insight.date}</span>
    </div>
    <p className="digest-body core-takeaway"><span className="digest-label">一句话判断：</span><Emphasis text={insight.takeaway} phrases={insight.highlights} /></p>
    <ol className="core-priorities">
      {insight.points.map((point, index) => <li key={point.title}>
        <h3 className="digest-subheading">{index + 1}. {point.title}</h3>
        <p className="digest-body"><Emphasis text={point.fact} phrases={point.highlights} /></p>
        <p className="digest-body"><strong className="digest-label">这意味着：</strong><Emphasis text={point.meaning} phrases={point.highlights} /></p>
        <p className="digest-body"><strong className="digest-label">接下来看：</strong><Emphasis text={point.watch} phrases={point.highlights} /></p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">{point.sourceIds.map((id) => {
          const source = insight.sources.find((s) => s.id === id)!;
          return <a key={id} className="digest-source-link" href={source.url} target="_blank" rel="noopener noreferrer" title={source.title}>{source.source} · {source.publishedAt?.slice(0,10)} ↗</a>;
        })}</div>
      </li>)}
    </ol>
    <p className="digest-caption core-boundary"><strong>判断边界：</strong>{insight.boundary}</p>
  </section>;
}
