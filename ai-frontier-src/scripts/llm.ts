const DEFAULT_BASE_URL = "https://api.deepseek.com";
const MAX_OUTPUT_TOKENS = 8192;
const RETRIES = 2;

export interface JsonCompletionRequest {
  system: string;
  prompt: string;
  model: string;
  maxTokens: number;
}

interface ChatResponse {
  choices?: { finish_reason?: string; message?: { content?: string | null } }[];
  error?: { message?: string };
}

class FatalLlmError extends Error {}

function endpoint() {
  return `${(process.env.DEEPSEEK_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, "")}/chat/completions`;
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function completeJson({ system, prompt, model, maxTokens }: JsonCompletionRequest): Promise<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("DEEPSEEK_API_KEY is not set");

  let lastError: Error | undefined;
  for (let attempt = 0; attempt <= RETRIES; attempt++) {
    try {
      const response = await fetch(endpoint(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: system },
            { role: "user", content: prompt },
          ],
          max_tokens: Math.min(maxTokens, MAX_OUTPUT_TOKENS),
          // Reasoning models reject JSON mode; the prompt and validators still enforce structure.
          ...(model.includes("reasoner") ? {} : { response_format: { type: "json_object" } }),
          stream: false,
        }),
        signal: AbortSignal.timeout(180000),
      });

      if (!response.ok) {
        const detail = (await response.text()).slice(0, 300);
        const error = new Error(`DeepSeek request failed (${response.status}): ${detail}`);
        if (response.status !== 429 && response.status < 500) throw new FatalLlmError(error.message);
        lastError = error;
      } else {
        const data = (await response.json()) as ChatResponse;
        const choice = data.choices?.[0];
        if (!choice) throw new Error(`DeepSeek returned no choices${data.error?.message ? `: ${data.error.message}` : ""}`);
        if (choice.finish_reason !== "stop") throw new Error(`Incomplete model response: ${choice.finish_reason ?? "unknown"}`);
        const content = choice.message?.content;
        if (typeof content !== "string" || !content.trim()) throw new Error("DeepSeek returned empty content");
        return content;
      }
    } catch (error) {
      if (error instanceof FatalLlmError) throw error;
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt === RETRIES) break;
    }
    await wait(1000 * (attempt + 1));
  }

  throw lastError ?? new Error("DeepSeek request failed");
}
