/** Free vision models for Last War inventory screenshots (fallback order). */
export const DEFAULT_VISION_MODELS = [
  "openrouter/free",
  "google/gemma-4-31b-it:free",
  "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
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

export interface OpenRouterChatResponse {
  model?: string;
  choices?: { message?: { content?: string } }[];
  error?: { message?: string };
}

export async function callOpenRouterVision(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userText: string,
  dataUrl: string,
): Promise<{ content: string; modelUsed: string }> {
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
      max_tokens: 1200,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: userText },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
    }),
  });

  const data = await res.json() as OpenRouterChatResponse;

  if (!res.ok) {
    const msg = data.error?.message ?? `HTTP ${res.status}`;
    throw new Error(`${model}: ${msg}`);
  }

  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error(`${model}: empty response`);

  return { content, modelUsed: data.model ?? model };
}
