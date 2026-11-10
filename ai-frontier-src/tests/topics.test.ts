import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { synthesizeTopics } from "../scripts/synthesize-topics";
import { topicEditions } from "../src/lib/topic-editions";
import { topicIssues } from "../src/lib/editorial-quality";
import { DigestText } from "../src/components/DigestText";
import type { ArticleInput } from "../scripts/content-utils";
import type { DigestItem, TrendTopic } from "../src/types";
const oldTopic = (): TrendTopic => JSON.parse(readFileSync("data/briefings/dots.json", "utf8"));
const evidence: ArticleInput[] = ["a", "b"].map((id) => ({id,title:id,content:"Source evidence",url:`https://${id}.example/news`,source:id,kind:"primary",category:"industry",publishedAt:"2026-10-10"}));
const items = evidence.map((i) => ({id:i.id,evidenceQuality:"substantial"})) as DigestItem[];
const paragraph = "模型能力只有接上真实任务、工具和检验流程，才能帮助用户完成工作。这是基于所提供材料的编辑分析，不能把某个实验的分数推断为所有业务场景的表现。还需要检查不同任务的完成率、人工介入次数和使用成本，并用实际部署的结果来判断适用范围。";
test("a failed section withholds only its own topic and reports why", async () => {
  let calls = 0;
  const {topics, report} = await synthesizeTopics(evidence, items, "2026-10-10", async (prompt, _schema, validate) => {
    calls++;
    if (prompt.includes("选择2–3个")) return validate([{title:"失败选题",sourceIds:["a","b"]},{title:"完整选题",sourceIds:["a","b"]}]);
    if (prompt.includes("只写专题导语")) return validate([{title:"完整选题",thesis:paragraph,whyNow:paragraph,layers:["agents"],watchNext:["观察实际部署的任务完成率。","观察人工介入次数的变化。"]}]);
    if (prompt.includes("专题《失败选题》") && prompt.includes("现在只写“为什么会这样”")) throw new Error("body interrupted");
    return validate([{body:paragraph,sourceIds:["a","b"]}]);
  });
  assert.equal(topics.length, 1); assert.equal(topics[0].sections.length, 4);
  assert.deepEqual(topicIssues(topics[0]), []);
  assert.equal(report.status, "partial"); assert.equal(report.attempted, 2);
  assert.equal(report.failures[0].title, "失败选题"); assert.match(report.failures[0].reason, /interrupted/);
  assert.equal(calls, 9);
});
test("single publisher plan fails rather than presenting a fake cross-source topic", async () => {
  const {topics, report} = await synthesizeTopics(evidence, items, "2026-10-10", async (_prompt, _schema, validate) => validate([{title:"单源选题",sourceIds:["a","a"]}]));
  assert.equal(topics.length, 0); assert.equal(report.status, "failed");
});
test("a single-publisher idea retrieves complementary evidence before writing", async () => {
  const input = [...evidence, {...evidence[0],id:"c",url:"https://a.example/second"}];
  const selected = input.map((i) => ({id:i.id,evidenceQuality:"substantial"})) as DigestItem[];
  let repaired = false;
  const {topics,report} = await synthesizeTopics(input, selected, "2026-10-10", async (prompt, schema, validate) => {
    if (prompt.includes("选择2–3个")) return validate([{title:"具体问题",sourceIds:["a","c"]}]);
    if (prompt.includes("其他发布者候选")) {
      repaired = true;
      assert.deepEqual((schema as {properties:{items:{items:{properties:{sourceIds:{items:{enum:string[]}}}}}}}).properties.items.items.properties.sourceIds.items.enum, ["b"]);
      return validate([{title:"具体问题",sourceIds:["b"]}]);
    }
    if (prompt.includes("只写专题导语")) return validate([{title:"具体问题",thesis:paragraph,whyNow:paragraph,layers:["agents"],watchNext:["观察实际部署的任务完成率。","观察人工介入次数的变化。"]}]);
    return validate([{body:paragraph,sourceIds:["a","b"]}]);
  });
  assert.equal(repaired, true); assert.equal(report.status,"complete");
  assert.equal(topics.length,1); assert.deepEqual(topics[0].sources.map((s) => s.id),["a","b"]);
});
test("Dots and historical topics cannot impersonate today's updates", () => {
  const old = oldTopic();
  const today = {...old,id:"today",origin:"generated" as const,updatedAt:"2026-10-10"};
  const grouped = topicEditions("2026-10-10", [today], [old, today]);
  assert.deepEqual(grouped.current.map((t) => t.id), ["today"]);
  assert.deepEqual(grouped.background.map((t) => t.id), [old.id]);
  assert.equal(topicEditions("2026-11-01", [], [old]).background.length, 0);
});
test("a complete bold final sentence is accepted; unfinished text still fails", () => {
  const topic = oldTopic();
  assert.equal(topicIssues({...topic,thesis:`**${topic.thesis}**`}).length, 0);
  assert.ok(topicIssues({...topic,thesis:"完整性检查应该能够识别这句尚未写完的"}).length);
});
test("all prose renders emphasis consistently without executable HTML or blanket number marks", () => {
  const html = renderToStaticMarkup(createElement(DigestText, null, "**重点**：版本 2.0。<script>alert(1)</script>"));
  assert.match(html, /<strong>重点<\/strong>/);
  assert.doesNotMatch(html, /<script>|<mark>/);
  assert.ok(html.includes("版本 2.0"));
});

test("Chinese prose labels use semantic bold without Markdown delimiter ambiguity", () => {
  const html = renderToStaticMarkup(createElement(() => DigestText({ label:"编辑判断：", children:"持续工作的助手。" })));
  assert.match(html, /<strong class="digest-label">编辑判断：<\/strong>/);
  assert.doesNotMatch(html, /\*\*/);
});

test("old evidence and an unchanged source set do not become today's new topic", async () => {
  const plan = [{title:"重复选题",sourceIds:["a","b"]}];
  const previous = {...oldTopic(),updatedAt:"2026-10-09",sources:evidence};
  const duplicate = await synthesizeTopics(evidence, items, "2026-10-10", async (_p, _s, validate) => validate(plan), [previous]);
  assert.equal(duplicate.topics.length, 0); assert.equal(duplicate.report.status, "failed");
  const stale = evidence.map((s) => ({...s,publishedAt:"2026-09-01"}));
  const old = await synthesizeTopics(stale, items, "2026-10-10", async (_p, _s, validate) => validate(plan));
  assert.equal(old.report.attempted, 0);
});
