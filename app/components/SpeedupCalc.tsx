"use client";

import { useState } from "react";
import {
  getServerTime, getSlot, secsUntilSlotEnd, formatDuration,
  getVsDay, getArPhase, overlapScore,
} from "@/lib/engines";
import { AR_PHASES, AR_SCHEDULE, SLOT_STARTS, SLOT_ENDS, VS_DAYS } from "@/lib/gameData";
import GameIcon from "./GameIcon";
import type { T } from "@/lib/i18n";

interface Props {
  utcOffset: number;
  arOverride: string;
  t: T;
}

// Badge reward table (approximate — based on community data)
// Score 100 (perfect) = 4 badges per 60-min block
// Score 70-99 = 2 badges per 60-min block
// Score < 70 = 0 badges from AR per block
// AR badges are per "completion action", roughly every hour of speedup

function calcBadges(scoreNow: number, minutes: number): number {
  const blocks = Math.floor(minutes / 60);
  if (scoreNow >= 100) return blocks * 4;
  if (scoreNow >= 70) return blocks * 2;
  return 0;
}

function findNextPerfectSlot(st: Date): { secsUntil: number; wd: number; slot: number } | null {
  const wd = st.getDay();
  const slot = getSlot(st);
  for (let i = 1; i <= 42; i++) {
    const ns = (slot + i) % 6;
    const nwd = (wd + Math.floor((slot + i) / 6)) % 7;
    const vsD = nwd === 0 ? null : VS_DAYS.find(v => v.wd === nwd) ?? null;
    const arP = AR_PHASES[AR_SCHEDULE[nwd][ns]];
    const sc = overlapScore(vsD, arP);
    if (sc >= 100) {
      const secs = secsUntilSlotEnd(st);
      return { secsUntil: (i - 1) * 4 * 3600 + secs, wd: nwd, slot: ns };
    }
  }
  return null;
}

type SpeedupCategory = "building" | "research" | "training" | "any";

const CATEGORY_DATA: { id: SpeedupCategory; emoji: string; arKey: string; labelNl: string; labelEn: string; labelDe: string; labelFr: string; labelEs: string }[] = [
  { id: "building", emoji: "🏗️", arKey: "CITY", labelNl: "Bouw speedups", labelEn: "Building speedups", labelDe: "Bau-Speedups", labelFr: "Accélérations construction", labelEs: "Aceleraciones construcción" },
  { id: "research", emoji: "🔬", arKey: "TECH", labelNl: "Research speedups", labelEn: "Research speedups", labelDe: "Forschungs-Speedups", labelFr: "Accélérations recherche", labelEs: "Aceleraciones investigación" },
  { id: "training", emoji: "⚔️", arKey: "UNIT", labelNl: "Training speedups", labelEn: "Training speedups", labelDe: "Trainings-Speedups", labelFr: "Accélérations entraînement", labelEs: "Aceleraciones entrenamiento" },
  { id: "any", emoji: "⚡", arKey: "any", labelNl: "Universele speedups", labelEn: "Universal speedups", labelDe: "Universal-Speedups", labelFr: "Accélérations universelles", labelEs: "Aceleraciones universales" },
];

export default function SpeedupCalc({ utcOffset, arOverride, t }: Props) {
  const [minutes, setMinutes] = useState(60);
  const [category, setCategory] = useState<SpeedupCategory>("building");
  const [result, setResult] = useState<null | {
    badgesNow: number;
    badgesOptimal: number;
    diff: number;
    secsUntil: number;
    nowPhase: string;
    nowVs: string;
    optPhase: string;
    optVs: string;
    scoreNow: number;
    scoreOptimal: number;
  }>(null);

  function calculate() {
    const st = getServerTime(utcOffset);
    const vsDay = getVsDay(st);
    const arPhase = getArPhase(st, arOverride);
    const scoreNow = overlapScore(vsDay, arPhase);
    const badgesNow = calcBadges(scoreNow, minutes);

    const perfect = findNextPerfectSlot(st);
    const badgesOptimal = calcBadges(100, minutes);

    setResult({
      badgesNow,
      badgesOptimal,
      diff: badgesOptimal - badgesNow,
      secsUntil: perfect?.secsUntil ?? 0,
      nowPhase: arPhase.name,
      nowVs: vsDay?.name ?? (t.lang === "nl" ? "Zondag (geen VS)" : t.lang === "de" ? "Sonntag (kein VS)" : t.lang === "fr" ? "Dimanche (pas de VS)" : t.lang === "es" ? "Domingo (sin VS)" : "Sunday (no VS)"),
      optPhase: perfect ? AR_PHASES[AR_SCHEDULE[perfect.wd][perfect.slot]].name : "—",
      optVs: perfect && perfect.wd !== 0 ? (VS_DAYS.find(v => v.wd === perfect.wd)?.name ?? "—") : "—",
      scoreNow,
      scoreOptimal: 100,
    });
  }

  function getLangCategoryLabel(cat: typeof CATEGORY_DATA[0]): string {
    if (t.lang === "nl") return cat.labelNl;
    if (t.lang === "de") return cat.labelDe;
    if (t.lang === "fr") return cat.labelFr;
    if (t.lang === "es") return cat.labelEs;
    return cat.labelEn;
  }

  // Preset minute options
  const PRESETS = [30, 60, 120, 240, 480, 1440];

  return (
    <div className="px-3.5 pb-8">
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, var(--bg3), var(--bg2))", border: "1px solid var(--border-gold)" }}
        className="rounded-xl p-4 mb-4 mt-3">
        <div className="lw-gold-text text-[16px] mb-1">{t.speedupTitle}</div>
        <div style={{ color: "var(--t3)" }} className="text-[12px]">{t.speedupDesc}</div>
      </div>

      {/* Input panel */}
      <div className="lw-panel p-4 mb-4">

        {/* Category selector */}
        <div className="mb-4">
          <div className="lw-section-title text-[9px] mb-2">{t.lang === "nl" ? "Type speedup" : t.lang === "de" ? "Speedup-Typ" : t.lang === "fr" ? "Type d'accélération" : t.lang === "es" ? "Tipo de aceleración" : "Speedup type"}</div>
          <div className="grid grid-cols-2 gap-2">
            {CATEGORY_DATA.map(cat => (
              <button key={cat.id} onClick={() => setCategory(cat.id)}
                style={category === cat.id
                  ? { background: "var(--goldglow)", border: "1px solid var(--gold)", color: "var(--gold2)" }
                  : { background: "var(--bg4)", border: "1px solid var(--border2)", color: "var(--t2)" }}
                className="rounded-lg px-3 py-2.5 text-[12px] font-semibold text-left transition-all cursor-pointer">
                {cat.emoji} {getLangCategoryLabel(cat)}
              </button>
            ))}
          </div>
        </div>

        {/* Minutes input */}
        <div className="mb-4">
          <div className="lw-section-title text-[9px] mb-2">{t.speedupMinutes}</div>
          <div className="flex gap-2 flex-wrap mb-2">
            {PRESETS.map(p => (
              <button key={p} onClick={() => setMinutes(p)}
                style={minutes === p
                  ? { background: "var(--goldglow)", border: "1px solid var(--gold)", color: "var(--gold2)" }
                  : { background: "var(--bg4)", border: "1px solid var(--border2)", color: "var(--t3)" }}
                className="px-3 py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer">
                {p >= 60 ? `${p / 60}${t.lang === "nl" ? "u" : t.lang === "de" ? "Std" : "h"}` : `${p}m`}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number" min={1} max={10080} value={minutes}
              onChange={e => setMinutes(Math.max(1, parseInt(e.target.value) || 1))}
              className="lw-input px-3 py-2 text-[13px] w-24 tabular-nums"
            />
            <span style={{ color: "var(--t3)" }} className="text-[12px]">
              {t.lang === "nl" ? "minuten" : t.lang === "de" ? "Minuten" : t.lang === "fr" ? "minutes" : t.lang === "es" ? "minutos" : "minutes"}
              {" · "}{formatDuration(minutes)}
            </span>
          </div>
        </div>

        <button onClick={calculate}
          className="lw-btn-gold w-full py-3 text-[14px] tracking-widest lw-display">
          {t.speedupCalc}
        </button>
      </div>

      {/* Result */}
      {result && (
        <div className="lw-panel overflow-hidden">
          <div className="lw-panel-header px-4 py-2.5">
            <span className="lw-section-title text-[10px]">{t.speedupResult}</span>
          </div>

          {result.diff === 0 ? (
            <div className="p-4">
              <div style={{ background: "var(--greenglow)", border: "1px solid var(--green2)", color: "var(--green2)" }}
                className="rounded-xl px-4 py-3 text-[13px] font-semibold">
                <span style={{ color: "var(--green2)" }}>{t.speedupNoLoss}</span>
              </div>
            </div>
          ) : (
            <div className="p-4">
              {/* Timing context */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div style={{ background: result.scoreNow >= 100 ? "rgba(92,216,90,0.06)" : "var(--bg3)", border: `1px solid ${result.scoreNow >= 100 ? "var(--green)" : "var(--border)"}` }}
                  className="rounded-xl p-3">
                  <div className="lw-label text-[8px] mb-1">{t.lang === "nl" ? "Spenderen NU" : t.lang === "de" ? "JETZT ausgeben" : t.lang === "fr" ? "Dépenser MAINTENANT" : t.lang === "es" ? "Gastar AHORA" : "Spending NOW"}</div>
                  <div style={{ color: "var(--t2)" }} className="text-[10px] mb-1">{result.nowVs}</div>
                  <div style={{ color: "var(--t3)" }} className="text-[10px] mb-2">{result.nowPhase}</div>
                  <div style={{ color: result.scoreNow >= 100 ? "var(--green2)" : result.scoreNow >= 70 ? "var(--gold2)" : "var(--red2)" }}
                    className="lw-display text-[20px]">
                    {result.badgesNow} <span className="text-[11px]">{t.speedupBadges}</span>
                  </div>
                </div>
                <div style={{ background: "rgba(240,192,48,0.06)", border: "1px solid var(--gold)" }}
                  className="rounded-xl p-3">
                  <div className="lw-label text-[8px] mb-1">{t.lang === "nl" ? "Spenderen OPTIMAAL" : t.lang === "de" ? "OPTIMAL ausgeben" : t.lang === "fr" ? "Dépenser OPTIMAL" : t.lang === "es" ? "Gastar ÓPTIMO" : "Spending OPTIMAL"}</div>
                  <div style={{ color: "var(--t2)" }} className="text-[10px] mb-1">{result.optVs}</div>
                  <div style={{ color: "var(--t3)" }} className="text-[10px] mb-2">{result.optPhase}</div>
                  <div style={{ color: "var(--gold3)" }} className="lw-display text-[20px]">
                    {result.badgesOptimal} <span className="text-[11px]">{t.speedupBadges}</span>
                  </div>
                </div>
              </div>

              {/* Delta */}
              {result.diff > 0 && (
                <div style={{ background: "rgba(160,40,24,0.1)", border: "1px solid var(--red2)", borderLeft: "3px solid var(--red2)" }}
                  className="rounded-r-xl px-4 py-3 mb-3 flex items-center justify-between">
                  <div>
                    <div style={{ color: "var(--red2)" }} className="lw-display text-[13px]">
                      {t.speedupDiff} {result.diff} {t.speedupBadges}
                    </div>
                    <div style={{ color: "var(--t3)" }} className="text-[10px] mt-0.5">
                      {result.diff >= 4 ? "❌ Flink verlies" : result.diff >= 2 ? "⚠️ Merkbaar verlies" : "ℹ️ Klein verlies"}
                    </div>
                  </div>
                  {result.secsUntil > 0 && (
                    <div className="text-right">
                      <div style={{ color: "var(--gold2)" }} className="lw-display text-[14px]">
                        {t.speedupWait} {formatDuration(result.secsUntil / 60)}
                      </div>
                      <div style={{ color: "var(--t3)" }} className="text-[9px]">
                        {t.speedupForMore} {result.diff} {t.speedupExtraBadges}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Worth it? */}
              <div style={{ background: "var(--bg4)", border: "1px solid var(--border)" }}
                className="rounded-xl px-4 py-2.5">
                <div style={{ color: "var(--t3)" }} className="text-[11px]">
                  💡 {result.diff > 3
                    ? (t.lang === "nl" ? "Sterk aanbevolen om te wachten. Je verliest significant veel badges." : t.lang === "de" ? "Stark empfohlen zu warten. Du verlierst erheblich viele Abzeichen." : t.lang === "fr" ? "Fortement recommandé d'attendre. Vous perdez beaucoup de badges." : t.lang === "es" ? "Muy recomendable esperar. Pierdes muchas insignias." : "Strongly recommended to wait. You lose a significant number of badges.")
                    : result.diff > 0
                    ? t.speedupWorth
                    : t.speedupNoLoss}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
