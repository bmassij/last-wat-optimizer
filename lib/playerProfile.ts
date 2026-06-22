import type { VisionInventoryResult } from "./visionInventory";

const STORAGE_KEY = "orc_player_profile";

export interface PlayerProfile {
  hqLevel: number;
  inventory: string[];
  summaries: string[];
  openNowSteps: string[];
  saveForLater: string[];
  updatedAt: string;
  scanCount: number;
}

function unique(arr: string[]): string[] {
  return [...new Set(arr.filter(Boolean))];
}

export function loadPlayerProfile(): PlayerProfile | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as PlayerProfile;
    if (!p || typeof p.hqLevel !== "number" || !Array.isArray(p.inventory)) return null;
    return p;
  } catch {
    return null;
  }
}

export function savePlayerProfile(profile: PlayerProfile): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    /* quota */
  }
}

export function mergeVisionIntoProfile(
  profile: PlayerProfile | null,
  vision: VisionInventoryResult,
): PlayerProfile {
  const inventory = unique([...(profile?.inventory ?? []), ...vision.detectedItems]);
  return {
    hqLevel: vision.hqLevel ?? profile?.hqLevel ?? 18,
    inventory,
    summaries: unique([...(profile?.summaries ?? []), vision.summary]).slice(-5),
    openNowSteps: unique([...(profile?.openNowSteps ?? []), ...vision.openNowSteps]).slice(-10),
    saveForLater: unique([...(profile?.saveForLater ?? []), ...vision.saveForLater]).slice(-10),
    updatedAt: new Date().toISOString(),
    scanCount: (profile?.scanCount ?? 0) + 1,
  };
}

export function clearPlayerProfile(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function formatProfileAge(iso: string, lang: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return lang === "nl" ? "zojuist" : lang === "de" ? "gerade eben" : lang === "fr" ? "à l'instant" : lang === "es" ? "ahora" : "just now";
  if (mins < 60) return lang === "nl" ? `${mins} min geleden` : `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  return lang === "nl" ? `${hrs} uur geleden` : `${hrs}h ago`;
}
