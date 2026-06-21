// ─────────────────────────────────────────────────────────────
//  ORC — Game Data Layer
//  Source: lastwartutorial.com, csmit195.com (validated Jun 2026)
// ─────────────────────────────────────────────────────────────

export type ArPhaseKey = "CITY" | "UNIT" | "TECH" | "DRONE" | "HERO";

export interface VsDay {
  day: number;
  wd: number; // 1=Mon..6=Sat
  name: string;
  short: string;
  emoji: string;
  icon: string;
  pts: number;
  cat: string;
  res: string[];
}

export interface ArPhase {
  id: string;
  name: string;
  emoji: string;
  icon: string;
  cls: string;
  cat: string;
  vsMatch: string[];
}

export interface Resource {
  emoji: string;
  icon: string;
  name: string;
  cat: string;
  vsDay: string | null;
  arKey: ArPhaseKey | "any";
  desc: string;
}

// Last War in-game icons — sourced from lastwartutorial.com (community guide screenshots)
export const ICONS = {
  radar:           "/icons/radar.png",
  stamina:         "/icons/stamina.png",
  building:        "/icons/building.png",
  builderSpeedup:  "/icons/builder-speedup.png",
  scienceSpeedup:  "/icons/science-speedup.png",
  valorBadge:      "/icons/valor-badge.png",
  heroExp:         "/icons/hero-exp.png",
  recruitHero:     "/icons/recruit-hero.png",
  trainingSpeedup: "/icons/training-speedup.png",
  dronePart:       "/icons/drone-part.png",
  droneData:       "/icons/drone-data.png",
  skillMedal:      "/icons/skill-medal.png",
  vsBanner:        "/icons/vs-banner.png",
  favicon:         "/icons/favicon.png",
} as const;

// Victory Showdown — Monday–Saturday
export const VS_DAYS: VsDay[] = [
  { day: 1, wd: 1, name: "Radar Training",     short: "RADAR",  emoji: "📡", icon: ICONS.radar,           pts: 1, cat: "radar",    res: ["Radar Missions", "Stamina", "Radar Refreshes"] },
  { day: 2, wd: 2, name: "Base Expansion",     short: "BASE",   emoji: "🏗️", icon: ICONS.building,        pts: 2, cat: "building", res: ["Building Speedups", "Building Upgrades", "Diamonds"] },
  { day: 3, wd: 3, name: "Age of Science",     short: "TECH",   emoji: "🔬", icon: ICONS.scienceSpeedup,  pts: 2, cat: "tech",     res: ["Research Speedups", "Tech Completions"] },
  { day: 4, wd: 4, name: "Train Heroes",       short: "HEROES", emoji: "🦸", icon: ICONS.heroExp,         pts: 2, cat: "heroes",   res: ["Hero XP", "Recruit Tickets", "Hero Shards"] },
  { day: 5, wd: 5, name: "Total Mobilization", short: "TROOPS", emoji: "⚔️", icon: ICONS.trainingSpeedup, pts: 2, cat: "troops",   res: ["Training Speedups", "Troop Training", "Promotions"] },
  { day: 6, wd: 6, name: "Enemy Buster",       short: "COMBAT", emoji: "💥", icon: ICONS.stamina,         pts: 4, cat: "combat",   res: ["Stamina", "PvP Actions", "Combat"] },
];

// Arms Race phases
export const AR_PHASES: Record<ArPhaseKey, ArPhase> = {
  CITY:  { id: "city",  name: "City Building",    emoji: "🏗️", icon: ICONS.builderSpeedup,  cls: "t-build", cat: "building", vsMatch: ["Base Expansion"] },
  UNIT:  { id: "unit",  name: "Unit Progression", emoji: "⚔️", icon: ICONS.trainingSpeedup, cls: "t-unit",  cat: "troops",   vsMatch: ["Total Mobilization"] },
  TECH:  { id: "tech",  name: "Tech Research",    emoji: "🔬", icon: ICONS.scienceSpeedup,  cls: "t-tech",  cat: "tech",     vsMatch: ["Age of Science"] },
  DRONE: { id: "drone", name: "Drone Boost",      emoji: "🚁", icon: ICONS.dronePart,       cls: "t-drone", cat: "drone",    vsMatch: ["Radar Training", "Enemy Buster"] },
  HERO:  { id: "hero",  name: "Hero Advancement", emoji: "🦸", icon: ICONS.heroExp,         cls: "t-hero",  cat: "heroes",   vsMatch: ["Train Heroes"] },
};

// Full weekly AR rotation (slots: 0=02-06, 1=06-10, 2=10-14, 3=14-18, 4=18-22, 5=22-02)
// Verified via csmit195.com — server reset = 02:00 server time
export const AR_SCHEDULE: Record<number, ArPhaseKey[]> = {
  0: ["DRONE", "HERO", "CITY", "UNIT", "TECH", "DRONE"], // Sunday
  1: ["HERO",  "CITY", "UNIT", "TECH", "DRONE", "HERO"], // Monday
  2: ["DRONE", "HERO", "CITY", "UNIT", "TECH", "DRONE"], // Tuesday
  3: ["HERO",  "CITY", "UNIT", "TECH", "DRONE", "HERO"], // Wednesday
  4: ["CITY",  "UNIT", "TECH", "DRONE", "HERO", "CITY"], // Thursday
  5: ["UNIT",  "TECH", "DRONE", "HERO", "CITY", "UNIT"], // Friday
  6: ["TECH",  "DRONE", "HERO", "CITY", "UNIT", "TECH"], // Saturday
};

export const SLOT_STARTS = [2, 6, 10, 14, 18, 22];
export const SLOT_ENDS   = [6, 10, 14, 18, 22, 26]; // 26 = 2AM next day

export const RESOURCES: Resource[] = [
  { emoji: "📡", icon: ICONS.radar,           name: "Radar / Stamina",   cat: "radar",    vsDay: "Radar Training",     arKey: "DRONE", desc: "Radar missies, stamina verbruiken" },
  { emoji: "🏗️", icon: ICONS.builderSpeedup,  name: "Building Speedups", cat: "building", vsDay: "Base Expansion",     arKey: "CITY",  desc: "Constructie speedups gebruiken" },
  { emoji: "🔬", icon: ICONS.scienceSpeedup,  name: "Research Speedups", cat: "tech",     vsDay: "Age of Science",     arKey: "TECH",  desc: "Wetenschap speedups + research afronden" },
  { emoji: "🦸", icon: ICONS.heroExp,         name: "Hero XP / Tickets", cat: "heroes",   vsDay: "Train Heroes",       arKey: "HERO",  desc: "Hero XP gebruiken, tickets trekken" },
  { emoji: "⚔️", icon: ICONS.trainingSpeedup, name: "Training Speedups", cat: "troops",   vsDay: "Total Mobilization", arKey: "UNIT",  desc: "Training speedups, troepen trainen" },
  { emoji: "💥", icon: ICONS.stamina,         name: "PvP / Combat",      cat: "combat",   vsDay: "Enemy Buster",       arKey: "DRONE", desc: "Aanvallen, stamina voor PvP" },
  { emoji: "🚁", icon: ICONS.droneData,        name: "Drone Data",        cat: "drone",    vsDay: null,                 arKey: "DRONE", desc: "Drone combat data punten" },
  { emoji: "💠", icon: ICONS.valorBadge,      name: "Diamonds / Packs",  cat: "any",      vsDay: null,                 arKey: "any",   desc: "Pakjes kopen met Diamonds" },
];
