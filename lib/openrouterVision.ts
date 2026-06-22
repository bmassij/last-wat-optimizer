/** Free vision models — tested against OpenRouter (Jun 2026). */
export const DEFAULT_VISION_MODELS = [
  "google/gemma-4-26b-a4b-it:free",
  "nvidia/nemotron-nano-12b-v2-vl:free",
  "nex-agi/nex-n2-pro:free",
  "openrouter/free",
] as const;

export function getVisionModelChain(): string[] {
  const fromList = process.env.OPENROUTER_VISION_MODELS?.split(",")
    .map(s => s.trim())
    .filter(Boolean);
  if (fromList?.length) return fromList;

  const primary = process.env.OPENROUTER_VISION_MODEL?.trim();
  if (primary) {
    const rest = DEFAULT_VISION_MODELS.filter(m => m !== primary);
    return [primary, ...rest];
  }

  return [...DEFAULT_VISION_MODELS];
}

interface OpenRouterMessage {
  content?: string | { type?: string; text?: string }[] | null;
  reasoning?: string | null;
  refusal?: string | null;
}

export interface OpenRouterChatResponse {
  model?: string;
  choices?: { message?: OpenRouterMessage; finish_reason?: string }[];
  error?: { message?: string };
}

/** Pull text from OpenRouter message — reasoning models often use `reasoning` field. */
export function extractMessageContent(message: OpenRouterMessage | undefined): string {
  if (!message) return "";

  const chunks: string[] = [];

  if (typeof message.content === "string" && message.content.trim()) {
    chunks.push(message.content.trim());
  } else if (Array.isArray(message.content)) {
    for (const part of message.content) {
      if (part?.text?.trim()) chunks.push(part.text.trim());
    }
  }

  if (typeof message.reasoning === "string" && message.reasoning.trim()) {
    chunks.push(message.reasoning.trim());
  }

  if (typeof message.refusal === "string" && message.refusal.trim()) {
    chunks.push(message.refusal.trim());
  }

  return chunks.join("\n").trim();
}

export async function callOpenRouterVision(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userText: string,
  dataUrl: string,
): Promise<{ content: string; modelUsed: string }> {
  const isReasoningModel = /reasoning|thinking|qwq|r1/i.test(model);

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.OPENROUTER_SITE_URL ?? "https://last-wat-optimizer.vercel.app",
      "X-Title": "ORC Last War Optimizer",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_tokens: 2000,
      ...(isReasoningModel ? { reasoning: { enabled: false } } : {}),
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: userText },
            { type: "image_url", image_url: { url: dataUrl, detail: "low" } },
          ],
        },
      ],
    }),
  });

  const raw = await res.text();
  let data: OpenRouterChatResponse;
  try {
    data = JSON.parse(raw) as OpenRouterChatResponse;
  } catch {
    throw new Error(`${model}: invalid JSON response (${raw.slice(0, 120)})`);
  }

  if (!res.ok) {
    const msg = data.error?.message ?? `HTTP ${res.status}`;
    throw new Error(`${model}: ${msg}`);
  }

  const message = data.choices?.[0]?.message;
  const content = extractMessageContent(message);
  if (!content) {
    const reason = data.choices?.[0]?.finish_reason ?? "unknown";
    throw new Error(`${model}: empty response (finish: ${reason})`);
  }

  return { content, modelUsed: data.model ?? model };
}

/** Try models in order; returns first successful parse candidate text. */
export async function callVisionWithFallback(
  apiKey: string,
  models: string[],
  systemPrompt: string,
  userText: string,
  dataUrl: string,
): Promise<{ content: string; modelUsed: string; errors: string[] }> {
  const errors: string[] = [];

  for (const model of models) {
    try {
      const result = await callOpenRouterVision(apiKey, model, systemPrompt, userText, dataUrl);
      return { ...result, errors };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(msg);
    }
  }

  throw new Error(errors.join(" | "));
}
