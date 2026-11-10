import type { TrendTopic } from "../types";

export function editorialJudgment(text: string): string {
  return text.replace(/^(?:(?:[（(]?编辑判断[）)]?)[：:·]?\s*)+/, "").trim();
}
export function completeSentence(text: string, minimum: number): boolean {
  const plain = text.replace(/\*\*|__/g, "").trim();
  return plain.length >= minimum && /[。！？.!?][”’」』）)"']*$/.test(plain);
}
// Valid JSON can still contain prose cut off in the middle of a sentence.
export function topicIssues(topic: Pick<TrendTopic, "thesis" | "whyNow" | "sections">): string[] {
  const issues: string[] = [];
  if (!completeSentence(editorialJudgment(topic.thesis), 20)) issues.push("编辑判断不足20字或句子未完成");
  if (!completeSentence(topic.whyNow, 40)) issues.push("时效背景不足40字或句子未完成");
  if (topic.sections.length < 3) issues.push("正文不足3节");
  topic.sections.forEach((section, i) => {
    if (!completeSentence(section.body, 60)) issues.push(`第${i + 1}节不足60字或句子未完成`);
  });
  if (topic.sections.reduce((length, section) => length + section.body.length, 0) < 400) issues.push("正文总计不足400字");
  return issues;
}
export function isCompleteTopic(topic: Pick<TrendTopic, "thesis" | "whyNow" | "sections">): boolean {
  return topicIssues(topic).length === 0;
}
