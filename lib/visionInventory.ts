import base from "@/data/knowledge/base.json";
import type { Lang } from "./i18n";

/** Inventory item IDs ORC understands (must match data/knowledge/base.json itemGuide) */
export const VISION_ITEM_IDS = base.itemGuide.map(i => i.id);

export interface VisionInventoryResult {
  hqLevel: number | null;
  detectedItems: string[];
  openNowSteps: string[];
  saveForLater: string[];
  summary: string;
  modelUsed?: string;
}

export function sanitizeVisionResult(raw: unknown): VisionInventoryResult {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const valid = new Set(VISION_ITEM_IDS);

  const detectedItems = Array.isArray(o.detectedItems)
    ? o.detectedItems.filter((x): x is string => typeof x === "string" && valid.has(x))
    : [];

  const hqLevel = typeof o.hqLevel === "number" && o.hqLevel >= 1 && o.hqLevel <= 40
    ? Math.round(o.hqLevel)
    : null;

  const strArr = (v: unknown) =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.trim().length > 0) : [];

  return {
    hqLevel,
    detectedItems,
    openNowSteps: strArr(o.openNowSteps),
    saveForLater: strArr(o.saveForLater),
    summary: typeof o.summary === "string" ? o.summary.trim() : "",
  };
}

export function extractJsonFromText(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenced) return JSON.parse(fenced[1].trim());
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(trimmed.slice(start, end + 1));
    throw new Error("No JSON object in model response");
  }
}

export function buildVisionSystemPrompt(lang: Lang): string {
  const itemList = VISION_ITEM_IDS.join(", ");
  const langNote =
    lang === "nl" ? "Dutch" :
    lang === "de" ? "German" :
    lang === "fr" ? "French" :
    lang === "es" ? "Spanish" : "English";

  return `You analyze screenshots from the mobile game "Last War: Survival".
The user shows their INVENTORY, backpack, speedup items, or resource screen.

Identify visible items and map them ONLY to these IDs (use exact strings):
${itemList}

Game context:
- Building/construction speedups → builder-speedup
- Research/science speedups → science-speedup
- Training/troop speedups → training-speedup
- Hero XP, hero shards, recruit tickets → hero-exp
- Drone data, drone parts, combat data → drone-data
- Stamina (lightning bolt energy) → stamina
- Radar items/missions → radar
- Diamonds, valor badges, generic packs → valor-badge

If HQ level is visible, estimate hqLevel (1-40). Otherwise null.

Respond with ONLY valid JSON (no markdown), in this shape:
{
  "hqLevel": number or null,
  "detectedItems": ["id1", "id2"],
  "openNowSteps": ["step in ${langNote} — where to tap in game, e.g. Inventory → Boosts → ..."],
  "saveForLater": ["item to keep for optimal VS/Arms Race window — in ${langNote}"],
  "summary": "1-2 sentences in ${langNote} describing what you see"
}

Be conservative: only list items you clearly see. Empty arrays if unsure.`;
}
