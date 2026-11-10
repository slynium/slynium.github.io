// Classification IDs are validated against the input map after decoding.
// Topic citations additionally receive an input-specific enum below.
type Schema = Record<string, unknown>;
const string: Schema = { type: "string" };
const list = (items: Schema): Schema => ({ type: "array", items });
const object = (properties: Record<string, Schema>): Schema => ({ type: "object", properties, required: Object.keys(properties), additionalProperties: false });
const choices = (...values: string[]): Schema => ({ type: "string", enum: values });
const layers = list(choices("models", "infrastructure", "agents", "products", "business", "governance"));
const envelope = (item: Schema): Schema => object({ items: list(item) });
const single = (item: Schema): Schema => object({ item });
export const CLASSIFICATION_SCHEMA = envelope(object({
  id: string, include: { type: "boolean" }, titleZh: string, summaryZh: string,
  whyItMatters: string, limitations: string, insight: string,
  importance: { type: "integer", enum: [1,2,3,4,5,6,7,8,9,10] },
  evidenceQuality: choices("substantial", "limited"),
  relevance: choices("general", "a2a", "agent-ads", "geo"), tags: list(string), layers,
}));
export const PLAN_SCHEMA = envelope(object({ title: string, sourceIds: list(string) }));
export const TOPIC_SCHEMA = envelope(object({
  title: string, thesis: string, whyNow: string, layers,
  sections: list(object({ heading: string, body: string, sourceIds: list(string), kind: choices("fact", "analysis", "uncertainty") })),
  watchNext: list(string),
}));

// Constrain citations during decoding as well as validating them after generation.
export function withSourceIds(schema: Schema, ids: string[]): Schema {
  const copy = structuredClone(schema);
  function visit(value: unknown) {
    if (!value || typeof value !== "object") return;
    for (const [key, child] of Object.entries(value)) {
      if (key === "sourceIds") (value as Schema)[key] = list({ type: "string", enum: ids });
      else visit(child);
    }
  }
  visit(copy);
  return copy;
}

export const CORE_INSIGHT_SCHEMA = envelope(object({
  takeaway: string, highlights: list(string), boundary: string,
  points: list(object({ title: string, fact: string, meaning: string, watch: string, highlights: list(string), sourceIds: list(string) })),
}));

export const TOPIC_HEADER_SCHEMA = single(object({ title: string, thesis: string, whyNow: string, layers, watchNext: list(string) }));
export const TOPIC_SECTION_SCHEMA = single(object({ body: string, sourceIds: list(string) }));

export const CORE_POINT_SCHEMA = single(object({ title: string, fact: string, meaning: string, watch: string, highlights: list(string), sourceIds: list(string) }));
export const CORE_SUMMARY_SCHEMA = single(object({ takeaway: string, highlights: list(string), boundary: string }));
