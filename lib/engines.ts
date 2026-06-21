// ─────────────────────────────────────────────────────────────
//  ORC — Core Engines (pure functions, no browser deps)
// ─────────────────────────────────────────────────────────────

import {
  VS_DAYS, AR_PHASES, AR_SCHEDULE, SLOT_STARTS, SLOT_ENDS, RESOURCES,
  type ArPhaseKey, type VsDay, type ArPhase, type Resource,
} from "./gameData";

// ── Time Engine ──────────────────────────────────────────────

export function getServerTime(utcOffset: number): Date {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + utcOffset * 3_600_000);
}

export function getSlot(st: Date): number {
  const h = st.getHours();
  if (h >= 2  && h < 6)  return 0;
  if (h >= 6  && h < 10) return 1;
  if (h >= 10 && h < 14) return 2;
  if (h >= 14 && h < 18) return 3;
  if (h >= 18 && h < 22) return 4;
  return 5;
}

export function secsUntilSlotEnd(st: Date): number {
  const slot = getSlot(st);
  let endH = SLOT_ENDS[slot];
  const endDate = new Date(st);
  if (endH >= 24) { endDate.setDate(endDate.getDate() + 1); endH -= 24; }
  endDate.setHours(endH, 0, 0, 0);
  return Math.max(0, Math.floor((endDate.getTime() - st.getTime()) / 1000));
}

export function formatCountdown(totalSecs: number): string {
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function formatDuration(mins: number): string {
  mins = Math.round(mins);
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}u${mins % 60 > 0 ? ` ${mins % 60}m` : ""}`;
}

// ── VS Engine ────────────────────────────────────────────────

export function getVsDay(st: Date): VsDay | null {
  const wd = st.getDay();
  if (wd === 0) return null;
  return VS_DAYS.find((v) => v.wd === wd) ?? null;
}

export function isSunday(st: Date): boolean {
  return st.getDay() === 0;
}

// ── Arms Race Engine ─────────────────────────────────────────

export function getArPhase(st: Date, override?: string): ArPhase {
  if (override && override in AR_PHASES) return AR_PHASES[override as ArPhaseKey];
  const wd   = st.getDay();
  const slot = getSlot(st);
  return AR_PHASES[AR_SCHEDULE[wd][slot]];
}

export function getNextArPhase(st: Date, override?: string): ArPhase {
  if (override && override in AR_PHASES) {
    // When overriding current, next is one step forward in standard rotation
  }
  const wd     = st.getDay();
  const slot   = getSlot(st);
  const next   = (slot + 1) % 6;
  const nextWd = next === 0 ? (wd + 1) % 7 : wd;
  return AR_PHASES[AR_SCHEDULE[nextWd][next]];
}

export function getArPhaseAt(wd: number, slot: number): ArPhase {
  return AR_PHASES[AR_SCHEDULE[wd][slot]];
}

// ── Overlap Engine ───────────────────────────────────────────

export function overlapScore(vsDay: VsDay | null, arPhase: ArPhase): number {
  if (!vsDay) return arPhase ? 40 : 0;
  if (arPhase.vsMatch.includes(vsDay.name)) return 100;
  if (vsDay.cat === arPhase.cat) return 80;
  if (arPhase.id === "drone" && (vsDay.cat === "radar" || vsDay.cat === "combat")) return 75;
  return 20;
}

export type OverlapLevel = "PERFECT" | "GOED" | "LAAG";
export function overlapLevel(score: number): OverlapLevel {
  if (score >= 100) return "PERFECT";
  if (score >= 70)  return "GOED";
  return "LAAG";
}

// ── Recommendation Engine ────────────────────────────────────

export type RecAction = "spend" | "save" | "delay" | "avoid";

export interface Recommendation extends Resource {
  score:  number;
  action: RecAction;
  reason: string;
  tip:    string;
}

function secsToArPhase(st: Date, arKey: ArPhaseKey): number {
  const wd   = st.getDay();
  const slot = getSlot(st);
  const secs = secsUntilSlotEnd(st);
  for (let i = 1; i <= 18; i++) {
    const ns  = (slot + i) % 6;
    const nwd = ((wd + Math.floor((slot + i) / 6)) % 7) as number;
    if (AR_SCHEDULE[nwd][ns] === arKey) {
      return (i - 1) * 4 * 3600 + secs;
    }
  }
  return 99 * 3600;
}

function nextPhaseLabel(st: Date, arKey: ArPhaseKey): string {
  return formatDuration(secsToArPhase(st, arKey) / 60);
}

function nextOverlapLabel(st: Date, cat: string): string {
  const wd   = st.getDay();
  const slot = getSlot(st);
  for (let i = 1; i <= 42; i++) {
    const ns  = (slot + i) % 6;
    const nwd = ((wd + Math.floor((slot + i) / 6)) % 7) as number;
    const arCat = AR_PHASES[AR_SCHEDULE[nwd][ns]]?.cat;
    const vsD   = nwd === 0 ? null : VS_DAYS.find((v) => v.wd === nwd);
    if (vsD && vsD.cat === cat && arCat === cat) return formatDuration(i * 4 * 60);
  }
  return "?";
}

export function buildRecommendations(st: Date, arOverride?: string): Recommendation[] {
  const vsDay   = getVsDay(st);
  const arPhase = getArPhase(st, arOverride);
  const sun     = isSunday(st);
  const secs    = secsUntilSlotEnd(st);

  return RESOURCES.map((r): Recommendation => {
    const vsMatch  = !!(vsDay && vsDay.name === r.vsDay);
    const arMatch  = !!(arPhase && (arPhase.id === r.arKey || r.arKey === "any"));
    const arDrone  = arPhase?.id === "drone";

    let score: number = 0;
    let action: RecAction = "avoid";
    let reason = "—";
    let tip    = "";

    if (r.cat === "any") {
      score = 65; action = "spend";
      reason = "Diamonds tellen altijd mee voor AR punten";
      tip    = "Koop pakketten tijdens elke AR fase.";
    } else if (r.cat === "drone") {
      if (arDrone || sun) {
        score = 90; action = "spend";
        reason = "🚁 Drone Boost actief — gebruik nu drone data";
        tip    = "Ga naar Drone Center → Data Training.";
      } else {
        score = 15; action = "delay";
        const t = nextPhaseLabel(st, "DRONE");
        reason = `Wacht op Drone Boost fase (~${t})`;
        tip    = `Sla op. Drone Boost fase start over ~${t}.`;
      }
    } else if (r.cat === "radar" || r.cat === "combat") {
      if (vsMatch && arDrone)  { score = 100; action = "spend"; reason = "🎯 PERFECT — VS dag + AR Drone = dubbele punten!"; tip = "Gebruik stamina nu voor maximale VS én AR punten."; }
      else if (vsMatch)        { score = 70;  action = "spend"; reason = "✅ VS dag actief — goed moment"; tip = "VS punten verdien je nu. AR bonus mis je wel."; }
      else if (arDrone)        { score = 60;  action = "spend"; reason = "🚁 Drone Boost = stamina telt mee"; tip = "Gebruik stamina voor AR punten via Drone Boost."; }
      else {
        score = 20; action = "delay";
        const nxt = nextOverlapLabel(st, r.cat);
        reason = `Wacht — beter venster over ~${nxt}`;
        tip    = `Sla stamina op. Beter venster over ~${nxt}.`;
      }
    } else {
      if (!sun && vsMatch && arMatch) {
        score = 100; action = "spend";
        reason = `🎯 PERFECT — ${vsDay!.name} + ${arPhase.name}`;
        tip    = "Perfecte overlap! Je verdient VS punten én AR badges. Gebruik alles.";
      } else if (!sun && vsMatch) {
        const wait = secsToArPhase(st, r.arKey as ArPhaseKey);
        if (wait < 3 * 3600) {
          score  = wait < 30 * 60 ? 65 : 50;
          action = wait < 30 * 60 ? "spend" : "delay";
          reason = `VS actief — AR fase over ${formatDuration(wait / 60)}`;
          tip    = `Wacht nog ${formatDuration(wait / 60)} voor AR fase = +3 badges extra.`;
        } else {
          score = 60; action = "spend";
          reason = "VS dag actief maar AR fase ver weg";
          tip    = `Spendeer voor VS punten, AR fase over ~${formatDuration(wait / 60)}.`;
        }
      } else if (arMatch) {
        score = 55; action = "spend";
        reason = `🔬 AR fase actief — verdien ${arPhase.name} badges`;
        tip    = "Geen VS bonus maar wel +3 AR badges per fase.";
      } else if (sun) {
        score = 30; action = "delay";
        const t = nextPhaseLabel(st, r.arKey as ArPhaseKey);
        reason = `Zondag — AR fase niet actief (~${t})`;
        tip    = `AR fase start over ~${t}.`;
      } else {
        score = 10; action = "save";
        reason = `Misaligned — wacht op ${r.vsDay} + ${AR_PHASES[r.arKey as ArPhaseKey]?.name}`;
        tip    = "Niet spenderen. Sla op voor overlap venster.";
      }
    }

    if (!sun && vsDay?.pts === 4 && vsMatch) score = Math.min(100, score + 5);

    return { ...r, score, action, reason, tip };
  });
}

// ── Upcoming Windows Engine ───────────────────────────────────

export interface OverlapWindow {
  secsUntil:  number;
  vsDay:      VsDay | null;
  arPhase:    ArPhase;
  score:      number;
  dayName:    string;
  slotLabel:  string;
}

const DAY_NAMES = ["Zo", "Ma", "Di", "Wo", "Do", "Vr", "Za"];

export function getUpcomingWindows(st: Date, count = 6): OverlapWindow[] {
  const wd   = st.getDay();
  const slot = getSlot(st);
  const secs = secsUntilSlotEnd(st);
  const wins: OverlapWindow[] = [];

  for (let i = 1; i <= 18; i++) {
    const ns  = (slot + i) % 6;
    const nwd = ((wd + Math.floor((slot + i) / 6)) % 7) as number;
    const arP = AR_PHASES[AR_SCHEDULE[nwd][ns]];
    const vsD = nwd === 0 ? null : VS_DAYS.find((v) => v.wd === nwd) ?? null;
    const sc  = overlapScore(vsD, arP);
    if (sc >= 70) {
      const startH = SLOT_STARTS[ns];
      const endH   = SLOT_ENDS[ns] % 24;
      wins.push({
        secsUntil: (i - 1) * 4 * 3600 + secs,
        vsDay: vsD, arPhase: arP, score: sc,
        dayName:   DAY_NAMES[nwd],
        slotLabel: `${String(startH).padStart(2, "0")}:00–${String(endH).padStart(2, "0")}:00 server`,
      });
    }
  }
  return wins.slice(0, count);
}
