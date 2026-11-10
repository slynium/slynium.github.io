import test from "node:test";
import assert from "node:assert/strict";
import { canonicalUrl, classifiedItems, parseJson, sourceId, validatedTopics, type ArticleInput } from "../scripts/content-utils";
import { selectFeedItems, plainText, type FeedItem } from "../scripts/fetch-feeds";
import { filterAIRepos, type GitHubRepo } from "../scripts/fetch-github-trending";
import { uniqueItems, layersForItem } from "../src/lib/knowledge";
import type { DigestItem } from "../src/types";
import { readFileSync } from "node:fs";
const inputs: ArticleInput[] = ["https://a.example/news", "https://b.example/news"].map((url,i) => ({ id: sourceId(url), title: `Original ${i}`, content: "Evidence", url, source: `Source ${i}`, category: "industry", kind: "primary" }));
const result = (id: string, title: string) => ({ id, include: true, titleZh: title, summaryZh: "Summary", whyItMatters: "Impact", limitations: "Limits", importance: 7, evidenceQuality: "substantial", relevance: "general", tags: ["Agent"], layers: ["agents"] });
test("out-of-order LLM results retain the correct source URL", () => {
  const items = classifiedItems([result(inputs[1].id, "Second"), result(inputs[0].id, "First")], inputs, "2026-10-07");
  assert.equal(items[0].url, inputs[1].url); assert.equal(items[1].title, "Original 0");
});
test("missing, duplicated and fabricated IDs fail closed", () => {
  for (const output of [[result(inputs[0].id, "Only")], [result(inputs[0].id, "A"), result(inputs[0].id, "B")], [result("invented", "A"), result(inputs[1].id, "B")]]) assert.throws(() => classifiedItems(output, inputs, "2026-10-07"));
});
test("explicitly excluded non-AI articles cannot shift other summaries", () => {
  const items = classifiedItems([{ id: inputs[0].id, include: false }, result(inputs[1].id, "Second")], inputs, "2026-10-07");
  assert.equal(items.length, 1); assert.equal(items[0].url, inputs[1].url);
});
test("partial JSON is rejected rather than salvaged", () => {
  assert.throws(() => parseJson('[{"id":"a"},{"id":'));
  assert.deepEqual(parseJson('```json\n[{"id":"a"}]\n```'), [{id:"a"}]);
});
test("URLs are normalized without removing meaningful query parameters", () => {
  assert.equal(canonicalUrl("https://example.com/?utm_source=x&id=4#top"), "https://example.com/?id=4");
  assert.equal(sourceId("https://example.com/a?utm_source=x"), sourceId("https://example.com/a"));
  assert.equal(canonicalUrl("javascript:alert(1)"), "");
});
const topic = () => ({ title: "Topic", thesis: "Thesis", whyNow: "New evidence", layers: ["agents"], watchNext: ["Measure"], sections: [
  {heading:"Fact",body:"Fact",kind:"fact",sourceIds:[inputs[0].id]},
  {heading:"Analysis",body:"Analysis",kind:"analysis",sourceIds:[inputs[1].id]},
  {heading:"Limits",body:"Limits",kind:"uncertainty",sourceIds:[inputs[0].id]},
] });
test("topic citations resolve only to supplied evidence", () => {
  const value = validatedTopics([topic()], inputs, "2026-10-07"); assert.equal(value[0].sources.length, 2);
  const forged = topic(); forged.sections[0].sourceIds = ["invented"];
  assert.throws(() => validatedTopics([forged], inputs, "2026-10-07"));
});
test("single-domain and no-boundary topics are rejected", () => {
  const sameDomain = inputs.map((i) => ({...i,url:"https://a.example/news"}));
  assert.throws(() => validatedTopics([topic()], sameDomain, "2026-10-07"));
  const noLimits = topic(); noLimits.sections[2].kind="fact";
  assert.throws(() => validatedTopics([noLimits], inputs, "2026-10-07"));
});
test("publisher diversity is deterministic despite fetch completion order", () => {
  const feeds: FeedItem[] = Array.from({length: 12}, (_,i) => ({ title: `Story ${i}`, link:`https://busy.example/${i}`, contentSnippet:"", pubDate:"2026-10-07", source:"Busy", category:"industry", kind:"reporting" }));
  feeds.push({ ...feeds[0], source:"Official", kind:"primary", link:"https://official.example/launch" });
  const selected = selectFeedItems(feeds, 3);
  assert.equal(selected[0].source, "Official");
  assert.deepEqual(selected, selectFeedItems([...feeds].reverse(), 3));
});
test("tracking links do not consume multiple selection slots", () => {
  const feeds = ["https://a.example/story", "https://a.example/story?utm_campaign=one"].map((link): FeedItem => ({title:"A",link,source:"A",category:"industry",kind:"reporting",pubDate:"2026-10-07",contentSnippet:""}));
  assert.equal(selectFeedItems(feeds).length, 1);
});
test("short AI keywords do not match unrelated words", () => {
  const repos = ["mail container", "AI agent", "pipeline", "RAG retrieval"].map((description) => ({name:"repo", description}) as GitHubRepo);
  assert.deepEqual(filterAIRepos(repos).map((r) => r.description), ["AI agent", "RAG retrieval"]);
});
test("legacy items still map to knowledge layers and deduplicate", () => {
  const item = {id:"old",title:"Agent memory",url:"https://a.example",tags:[]} as unknown as DigestItem;
  assert.ok(layersForItem(item).includes("agents")); assert.ok(layersForItem(item).includes("infrastructure"));
  assert.equal(uniqueItems([item,item]).length,1);
});
test("HTML extraction removes scripts and decodes entities", () => {
  assert.equal(plainText('<article>Hello &amp; world<script>bad()</script></article>'), "Hello & world");
});
test("curated Dots briefing has complete source and knowledge references", () => {
  const value = JSON.parse(readFileSync("data/briefings/dots.json", "utf8"));
  const evidence = value.sources.map((s: {id:string;title:string;url:string;source:string;kind:string}) => ({...s,content:"Curated research",category:"industry"}));
  assert.equal(validatedTopics([value], evidence, value.updatedAt).length, 1);
});


import { editorialJudgment, isCompleteTopic } from "../src/lib/editorial-quality";
import { TOPIC_SCHEMA, withSourceIds } from "../scripts/editorial-schemas";
test("valid JSON with mid-sentence editorial prose is withheld", () => {
  const complete = JSON.parse(readFileSync("data/briefings/dots.json", "utf8"));
  assert.equal(isCompleteTopic(complete), true);
  assert.equal(isCompleteTopic({ ...complete, thesis: "前沿AI模型正以分级授权方式向网络防御者开放，这一趋势客观上压缩了" }), false);
  assert.equal(isCompleteTopic({ ...complete, sections: complete.sections.map((s: {body: string}) => ({...s, body: "未完成的句子"})) }), false);
  assert.equal(editorialJudgment("（编辑判断）编辑判断：完整判断。"), "完整判断。");
});
test("source constraints do not mutate the shared schema", () => {
  const original = JSON.stringify(TOPIC_SCHEMA);
  const constrained = JSON.stringify(withSourceIds(TOPIC_SCHEMA, ["allowed-source"]));
  assert.ok(constrained.includes('"enum":["allowed-source"]'));
  assert.equal(JSON.stringify(TOPIC_SCHEMA), original);
});
