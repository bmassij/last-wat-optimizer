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

const ITEM_KEYWORDS: Record<string, string[]> = {
  "builder-speedup": ["builder", "building", "construction", "bouw", "gebouw"],
  "science-speedup": ["science", "research", "tech", "onderzoek", "wetenschap"],
  "training-speedup": ["training", "troop", "train", "troepen"],
  "hero-exp": ["hero", "xp", "shard", "recruit", "held", "helden"],
  "drone-data": ["drone", "combat data", "dron"],
  "stamina": ["stamina", "energy", "uitdaging", "energie"],
  "radar": ["radar", "mission", "missie"],
  "valor-badge": ["diamond", "valor", "badge", "pack", "diamant"],
};

export function sanitizeVisionResult(raw: unknown): VisionInventoryResult {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const valid = new Set(VISION_ITEM_IDS);

  const detectedItems = Array.isArray(o.detectedItems)
    ? o.detectedItems.filter((x): x is string => typeof x === "string" && valid.has(x))
    : [];

  const hqLevel = typeof o.hqLevel === "number" && o.hqLevel >= 1 && o.hqLevel <= 40
    ? Math.round(o.hqLevel)
    : o.hqLevel === null || o.hqLevel === undefined
      ? null
      : typeof o.hqLevel === "string" && /^\d+$/.test(o.hqLevel)
        ? Math.min(40, Math.max(1, parseInt(o.hqLevel, 10)))
        : null;

  const strArr = (v: unknown) =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.trim().length > 0) : [];

  return {
    hqLevel,
    detectedItems,
    openNowSteps: strArr(o.openNowSteps ?? o.open_now ?? o.openNow),
    saveForLater: strArr(o.saveForLater ?? o.save_for_later ?? o.saveLater),
    summary: typeof o.summary === "string" ? o.summary.trim() : "",
  };
}

function tryParseJson(s: string): unknown | null {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

/** Extract first balanced `{ ... }` block from mixed text. */
function extractFirstJsonObject(text: string): string | null {
  const start = text.indexOf("{");
  if (start < 0) return null;

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (c === "\\") {
      escape = true;
      continue;
    }
    if (c === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (c === "{") depth++;
    if (c === "}") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

function fixCommonJsonIssues(s: string): string {
  return s
    .replace(/,\s*}/g, "}")
    .replace(/,\s*]/g, "]")
    .replace(/'/g, '"')
    .replace(/(\w+)\s*:/g, '"$1":')
    .replace(/""(\w+)":/g, '"$1":');
}

export function extractJsonFromText(text: string): unknown {
  const trimmed = text.trim();

  const attempts = [
    trimmed,
    ...Array.from(trimmed.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)).map(m => m[1].trim()),
    extractFirstJsonObject(trimmed),
    extractFirstJsonObject(trimmed.replace(/^[^{]*/, "")),
  ].filter((x): x is string => Boolean(x));

  for (const candidate of attempts) {
    const parsed = tryParseJson(candidate);
    if (parsed && typeof parsed === "object") return parsed;

    const fixed = fixCommonJsonIssues(candidate);
    const parsedFixed = tryParseJson(fixed);
    if (parsedFixed && typeof parsedFixed === "object") return parsedFixed;
  }

  throw new Error("No JSON object in model response");
}

/** Fallback when model returns prose instead of JSON. */
export function parseVisionHeuristic(text: string): VisionInventoryResult {
  const lower = text.toLowerCase();
  const valid = new Set(VISION_ITEM_IDS);

  const detectedItems = VISION_ITEM_IDS.filter(id => {
    if (text.includes(id)) return true;
    return (ITEM_KEYWORDS[id] ?? []).some(kw => lower.includes(kw));
  });

  const hqMatch = text.match(/(?:hq|headquarters|hoofdkwartier|level|niveau)\s*[:#]?\s*(\d{1,2})/i);
  const hqLevel = hqMatch ? Math.min(40, Math.max(1, parseInt(hqMatch[1], 10))) : null;

  const sentences = text.split(/[.!?\n]+/).map(s => s.trim()).filter(s => s.length > 12);
  const summary = sentences.slice(0, 2).join(". ") || text.slice(0, 280);

  return sanitizeVisionResult({
    hqLevel,
    detectedItems: detectedItems.filter(id => valid.has(id)),
    openNowSteps: [],
    saveForLater: [],
    summary,
  });
}

export function parseVisionFromModelText(text: string): VisionInventoryResult {
  try {
    return sanitizeVisionResult(extractJsonFromText(text));
  } catch {
    return parseVisionHeuristic(text);
  }
}

export function isUsefulVisionResult(r: VisionInventoryResult): boolean {
  return (
    r.detectedItems.length > 0 ||
    r.hqLevel !== null ||
    r.summary.length > 15 ||
    r.openNowSteps.length > 0
  );
}

export function buildVisionSystemPrompt(lang: Lang): string {
  const itemList = VISION_ITEM_IDS.join(", ");
  const langNote =
    lang === "nl" ? "Dutch" :
    lang === "de" ? "German" :
    lang === "fr" ? "French" :
    lang === "es" ? "Spanish" : "English";

  return `You are a JSON API for Last War: Survival inventory screenshots.

Map visible items ONLY to these exact IDs:
${itemList}

Rules:
- builder/construction speedups → builder-speedup
- research/science speedups → science-speedup
- training speedups → training-speedup
- hero XP/shards/tickets → hero-exp
- drone data/parts → drone-data
- stamina/energy → stamina
- radar → radar
- diamonds/packs/valor → valor-badge
- hqLevel 1-40 if visible, else null

CRITICAL: Output ONLY a single raw JSON object. No markdown. No explanation. No code fences.
Start with { and end with }.

{
  "hqLevel": null,
  "detectedItems": [],
  "openNowSteps": [],
  "saveForLater": [],
  "summary": "short description in ${langNote}"
}`;
}

export function buildVisionUserText(lang: Lang): string {
  if (lang === "nl") {
    return "Analyseer deze screenshot. Antwoord ALLEEN met raw JSON (geen tekst ervoor of erna).";
  }
  return "Analyze this screenshot. Reply ONLY with raw JSON (no text before or after).";
}
