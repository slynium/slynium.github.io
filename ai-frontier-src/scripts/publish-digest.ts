import { promises as fs } from "node:fs";
import path from "node:path";
import type { DailyDigest } from "../src/types";
import { validateCoreInsight } from "../src/lib/core-insight";
import { topicIssues, completeSentence } from "../src/lib/editorial-quality";
import { validatedTopics } from "./content-utils";

// Shared by generation, scheduled-run short circuit and the deployment gate.
// A historical briefing or placeholder cannot satisfy either required section.
export function assertCompleteEdition(digest: DailyDigest, expectedDate = digest.date): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(digest.date) || digest.date !== expectedDate) throw new Error("Edition date does not match the requested day");
  if (!digest.coreInsight || digest.coreInsight.date !== digest.date) throw new Error("Missing this edition's core insight");
  validateCoreInsight(digest.coreInsight, digest.coreInsight.sources, digest.date, digest.coreInsight.origin);
  if (!digest.topics?.length) throw new Error("Missing this edition's trend topics");
  const ids = new Set<string>();
  for (const topic of digest.topics) {
    if (topic.updatedAt.slice(0, 10) !== digest.date || topic.origin !== "generated" || ids.has(topic.id)) throw new Error("Trend topics must be unique, generated for this edition");
    ids.add(topic.id);
    const issues = topicIssues(topic);
    if (issues.length) throw new Error(`Incomplete topic ${topic.title}: ${issues.join("; ")}`);
    if (topic.sections.length !== 4 || !["fact", "analysis", "analysis", "uncertainty"].every((kind, i) => topic.sections[i].kind === kind)
      || topic.sections.some((s) => !completeSentence(s.body, 100)) || topic.watchNext.length < 2 || topic.watchNext.some((s) => s.trim().length < 8)) throw new Error("Topic needs four complete sections and two watch metrics");
    validatedTopics([topic], topic.sources.map((s) => ({...s,content:"",category:"industry"})), digest.date);
    const cutoff = Date.parse(`${digest.date}T23:59:59+08:00`);
    if (!topic.sources.some((s) => s.publishedAt && cutoff - Date.parse(s.publishedAt) >= 0 && cutoff - Date.parse(s.publishedAt) <= 3 * 86400000)) throw new Error("Topic needs evidence from the past 72 hours");
    const factIds = topic.sections[0].sourceIds;
    if (new Set(topic.sources.filter((s) => factIds.includes(s.id)).map((s) => new URL(s.url).hostname.replace(/^www\./, ""))).size < 2) throw new Error("Topic fact section needs two publishers");
  }
  if (!digest.topicGeneration || digest.topicGeneration.published !== digest.topics.length || !["complete", "partial"].includes(digest.topicGeneration.status)) throw new Error("Topic generation report does not match published content");
  const articles = [...digest.research, ...digest.industry, ...digest.thoughtLeaders, ...digest.chinese, ...digest.githubNew, ...digest.githubHot];
  if (new Set(articles.map((i) => i.id)).size < 8) throw new Error("Edition needs at least eight verified articles");
}

export async function publishDigest(digest: DailyDigest, dir: string, date: string): Promise<void> {
  assertCompleteEdition(digest, date); // No writes, including dated archives, until complete.
  await fs.mkdir(dir, {recursive:true});
  const json = JSON.stringify(digest, null, 2);
  for (const name of [`${date}.json`, "latest.json"]) {
    await fs.writeFile(path.join(dir, `${name}.tmp`), json);
    await fs.rename(path.join(dir, `${name}.tmp`), path.join(dir, name));
  }
  const dates = (await fs.readdir(dir)).filter((file) => /^\d{4}-\d{2}-\d{2}\.json$/.test(file)).map((f) => f.slice(0,10)).sort().reverse();
  await fs.writeFile(path.join(dir, "index.json.tmp"), JSON.stringify(dates.slice(0,90), null, 2));
  await fs.rename(path.join(dir, "index.json.tmp"), path.join(dir, "index.json"));
  for (const old of dates.slice(90)) await fs.unlink(path.join(dir, `${old}.json`));
}
