import type { DigestItem, KnowledgeLayer } from "../types";

export const KNOWLEDGE_LAYERS: { id: KnowledgeLayer; label: string; question: string; description: string; terms: RegExp }[] = [
  { id: "models", label: "模型与能力", question: "AI 能做到什么？", description: "预训练、后训练、推理与多模态。把演示、基准成绩和真实任务能力分开看。", terms: /模型|推理|训练|多模态|model|reasoning|llm|benchmark/i },
  { id: "infrastructure", label: "算力与数据", question: "靠什么运行，成本多高？", description: "芯片、推理服务、数据、检索和上下文。能力能否以可接受的成本、延迟持续交付。", terms: /算力|芯片|检索|向量|数据|缓存|gpu|inference|rag|embedding|context|memory/i },
  { id: "agents", label: "Agent 与编排", question: "如何把能力变成任务？", description: "规划、工具调用、记忆、多 Agent 协作和事件触发。重点看任务状态、失败恢复与执行边界。", terms: /agent|智能体|编排|工具调用|mcp|a2a|swarm|dots/i },
  { id: "products", label: "产品与体验", question: "用户怎样用起来？", description: "助手、搜索、编程、内容创作与工作空间。观察入口、交互、信任和用户反馈如何改变工作流。", terms: /产品|助手|搜索|编程|体验|chatgpt|copilot|cursor|app|assistant|dots/i },
  { id: "business", label: "商业与市场", question: "谁付费，价值如何兑现？", description: "定价、分发、企业采购、广告、竞争与组织改变。区分试用热度、留存和可持续的单位经济。", terms: /商业|市场|融资|收入|定价|广告|企业|pricing|revenue|business|enterprise/i },
  { id: "governance", label: "评估与治理", question: "怎样证明可靠、可控？", description: "评测、权限、隐私、溯源与责任。贯穿模型、Agent 和业务的验证层，而非发布后的补丁。", terms: /安全|评估|权限|隐私|治理|对齐|评测|safety|eval|alignment|security|policy/i },
];

export const KNOWLEDGE_EDGES: { from: KnowledgeLayer; to: KnowledgeLayer; label: string; explanation: string }[] = [
  { from: "models", to: "infrastructure", label: "能力受资源约束", explanation: "更强的模型需要算力与数据；部署时还要衡量每次任务的成本和延迟。" },
  { from: "models", to: "agents", label: "能力转为行动", explanation: "模型提供推理与规划能力，编排负责状态、工具、重试和任务推进。" },
  { from: "infrastructure", to: "agents", label: "提供执行基础", explanation: "检索、记忆与运行环境决定 Agent 能访问什么，以及能持续工作多久。" },
  { from: "agents", to: "products", label: "封装为工作流", explanation: "产品把工具调用和多步任务变成用户可理解、可干预的体验。" },
  { from: "products", to: "business", label: "验证用户价值", explanation: "使用和付费反馈检验工作流是否创造价值；热度本身不代表留存或盈利。" },
  { from: "governance", to: "models", label: "验证能力主张", explanation: "评测设计与可复现证据帮助判断模型能力的适用范围。" },
  { from: "governance", to: "agents", label: "约束执行权限", explanation: "执行前的权限检查、确认和审计把任务能力约束在授权范围内。" },
  { from: "governance", to: "business", label: "建立责任边界", explanation: "业务落地必须定义错误由谁承担、怎样回退，以及数据能被怎样使用。" },
];

export function layersForItem(item: DigestItem): KnowledgeLayer[] {
  if (item.layers?.length) return item.layers;
  const text = `${item.title} ${item.titleZh} ${item.tags?.join(" ") ?? ""}`;
  return KNOWLEDGE_LAYERS.filter((layer) => layer.terms.test(text)).map((layer) => layer.id);
}

export function uniqueItems(items: DigestItem[]): DigestItem[] {
  return [...new Map(items.map((item) => [item.url, item])).values()];
}
