import type { TrendTopic } from "../types";
import { editorialJudgment, isCompleteTopic } from "./editorial-quality";

export function topicEditions(date: string, generated: TrendTopic[], library: TrendTopic[]) {
  const cutoff = Date.parse(`${date}T23:59:59+08:00`);
  const current = generated.filter((t) => t.updatedAt.slice(0,10) === date && isCompleteTopic(t));
  const currentIds = new Set(current.map((t) => t.id));
  const background = [...new Map([...library, ...generated].filter((t) => {
    const age = cutoff - Date.parse(t.updatedAt);
    return !currentIds.has(t.id) && age >= 0 && age <= 14 * 86400000 && isCompleteTopic(t);
  }).sort((a,b) => b.updatedAt.localeCompare(a.updatedAt)).map((t) => [t.id, t])).values()];
  const normalize = (t: TrendTopic) => ({...t, thesis: editorialJudgment(t.thesis)});
  return { current: current.map(normalize), background: background.slice(0, 8).map(normalize) };
}
