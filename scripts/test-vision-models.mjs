import { readFileSync } from "fs";

readFileSync(".env.local", "utf8").split("\n").forEach(l => {
  const m = l.match(/^([^#=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim();
});

const key = process.env.OPENROUTER_API_KEY;
const b64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
const dataUrl = `data:image/png;base64,${b64}`;
const sys = `Respond ONLY valid JSON: {"hqLevel":null,"detectedItems":[],"openNowSteps":[],"saveForLater":[],"summary":"test"}`;

const models = [
  "openrouter/free",
  "google/gemma-4-31b-it:free",
  "google/gemma-4-26b-a4b-it:free",
  "nvidia/nemotron-nano-12b-v2-vl:free",
  "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
  "nex-agi/nex-n2-pro:free",
];

for (const model of models) {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "http://localhost:3000",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_tokens: 800,
      messages: [
        { role: "system", content: sys },
        {
          role: "user",
          content: [
            { type: "text", text: "Analyze this Last War inventory screenshot." },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
    }),
  });
  const data = await res.json();
  const msg = data.choices?.[0]?.message;
  const content = typeof msg?.content === "string" ? msg.content : JSON.stringify(msg?.content);
  console.log("\n---", model);
  console.log("status:", res.status, "used:", data.model);
  console.log("error:", data.error?.message);
  console.log("content len:", content?.length ?? 0);
  console.log("preview:", String(content).slice(0, 150));
  if (msg?.reasoning) console.log("reasoning len:", String(msg.reasoning).length);
}
