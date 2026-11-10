import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import type { CoreInsight, DailyDigest, TrendTopic } from "../src/types";
import { assertCompleteEdition, publishDigest } from "../scripts/publish-digest";
import { repairCompletion } from "../scripts/editorial-retry";
import { synthesizeCore } from "../scripts/synthesize-core";

function edition(): DailyDigest {
  const digest: DailyDigest = JSON.parse(readFileSync("data/digests/latest.json", "utf8"));
  const core: CoreInsight = JSON.parse(readFileSync("data/editorials/2026-10-09.json", "utf8"));
  const topic: TrendTopic = JSON.parse(readFileSync("data/briefings/dots.json", "utf8"));
  topic.updatedAt = core.date; topic.origin = "generated"; topic.sources = core.sources;
  // Controlled full-length paragraphs: the historical briefing has shorter sections.
  const body = "以下是根据提供资料进行的编辑分析，模型能力必须放在具体任务与适用边界里理解。不同发布者的报道不自动等于独立验证，因此还要区分产品公告、实验结论和行业推断。实际效果需要观察任务完成率、人工介入次数与总体使用成本，不能只根据一次演示就认定适合所有人。";
  topic.sections = ["fact", "analysis", "analysis", "uncertainty"].map((kind, i) => ({heading:`段落${i}`,kind:kind as "fact" | "analysis" | "uncertainty",body,sourceIds:topic.sources.map((s) => s.id)}));
  return {...digest,date:core.date,coreInsight:core,topics:[topic],topicGeneration:{status:"complete",attempted:1,published:1,failures:[]}};
}
test("only an edition with both complete current editorial sections can publish", () => {
  assert.doesNotThrow(() => assertCompleteEdition(edition()));
  for (const mutate of [
    (d: DailyDigest) => { delete d.coreInsight; },
    (d: DailyDigest) => { d.coreInsight!.date = "2026-10-08"; },
    (d: DailyDigest) => { d.coreInsight!.highlights = []; },
    (d: DailyDigest) => { d.topics = []; },
    (d: DailyDigest) => { d.topics![0].origin = "curated"; },
    (d: DailyDigest) => { d.topics![0].updatedAt = "2026-10-08"; },
    (d: DailyDigest) => { d.topics![0].sections[0].body = "尚未写完的句子，不能直接发布"; },
    (d: DailyDigest) => { d.topics![0].sections[0].sourceIds = ["invented"]; },
    (d: DailyDigest) => { d.topics![0].watchNext = []; },
    (d: DailyDigest) => { d.topicGeneration!.published = 0; },
  ]) { const d = edition(); mutate(d); assert.throws(() => assertCompleteEdition(d)); }
  assert.throws(() => assertCompleteEdition(edition(), "2026-10-10"));
});
test("failed generation cannot overwrite latest, dated archive or index", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "digest-publication-"));
  try {
    const valid = edition();
    await publishDigest(valid, dir, valid.date);
    const names = await fs.readdir(dir);
    const before = await Promise.all(names.map((name) => fs.readFile(path.join(dir, name), "utf8")));
    const incomplete = {...valid,topics:[]};
    await assert.rejects(publishDigest(incomplete, dir, valid.date));
    assert.deepEqual(await fs.readdir(dir), names);
    assert.deepEqual(await Promise.all(names.map((name) => fs.readFile(path.join(dir, name), "utf8"))), before);
    const next = {...valid,date:"2026-10-10"};
    await assert.rejects(publishDigest(next, dir, next.date));
    assert.deepEqual(await fs.readdir(dir), names);
  } finally { await fs.rm(dir, {recursive:true,force:true}); }
});
test("repair receives rejected content and exact error; exhaustion fails closed", async () => {
  const repairs: string[] = [];
  const result = await repairCompletion(async (repair, attempt) => { repairs.push(repair); return attempt ? "complete。" : "unfinished"; }, (v) => { if (v !== "complete。") throw new Error("sentence unfinished"); return v; });
  assert.equal(result, "complete。"); assert.match(repairs[1], /sentence unfinished/); assert.match(repairs[1], /unfinished/);
  let calls = 0;
  await assert.rejects(repairCompletion(async () => { calls++; return []; }, () => { throw new Error("missing section"); }), /3 attempts/);
  assert.equal(calls, 3);
});
test("core synthesis validates each priority separately before composing its summary", async () => {
  const core = edition().coreInsight!;
  let priority = 0;
  const sources = core.sources.map((s) => ({...s,content:"Evidence",category:"industry" as const}));
  const items = sources.map((s) => ({...edition().hotRanking[0],id:s.id,evidenceQuality:"substantial" as const}));
  const result = await synthesizeCore(sources, items, core.date, async (prompt, _schema, validate) => {
    if (prompt.includes("只规划 title")) return validate(core.points.map((p) => ({title:p.title,sourceIds:p.sourceIds})));
    if (prompt.includes("写一个重点")) return validate([core.points[priority++]]);
    return validate([{takeaway:core.takeaway,highlights:core.highlights,boundary:core.boundary}]);
  });
  assert.equal(priority, 3); assert.equal(result.points.length, 3); assert.equal(result.takeaway, core.takeaway);
});
