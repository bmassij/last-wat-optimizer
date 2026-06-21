"use client";

import { VS_DAYS, AR_PHASES, AR_SCHEDULE, SLOT_STARTS, SLOT_ENDS } from "@/lib/gameData";
import { overlapScore, overlapLevel, getArPhaseAt } from "@/lib/engines";
import GameIcon from "./GameIcon";
import type { T } from "@/lib/i18n";

interface Props {
  serverDay: number; // 0=Sun..6=Sat
  t: T;
}

const WEEK_TIPS: Record<number, { icon: string; tip: string }> = {
  1: { icon: "📡", tip: "Radar dag: stamina, radar missies. Drone Boost om 02:00–06:00 actief. Ideaal voor drone runs als eerste ding." },
  2: { icon: "🏗️", tip: "Bouw dag: gebruik bouw speedups EN claim klaar-staande upgrades. Check je rugzak!" },
  3: { icon: "🔬", tip: "Science dag: claim voltooide research EN gebruik research speedups. Perfecte dag voor Mastery push." },
  4: { icon: "🦸", tip: "Hero dag: Hero XP, recruit tickets, hero shards. Doe dit tijdens Hero Advancement AR fase (12:00–18:00 server)." },
  5: { icon: "⚔️", tip: "Troepen dag: training speedups nu. Perfect overlap met Unit Progression AR fase. Grootste badge boost van de week." },
  6: { icon: "💥", tip: "Combat dag: 4 win punten! Stamina, PvP, aanvallen. Let op: alleen als je schild niet nodig hebt." },
  0: { icon: "🐹", tip: "Geen VS! Hamsterdag — spaar alles op voor maandag. Drone runs als Drone Boost actief is. Bereid je voor." },
};

export default function WeekPlanner({ serverDay, t }: Props) {
  const days = [
    { wd: 1 }, { wd: 2 }, { wd: 3 }, { wd: 4 }, { wd: 5 }, { wd: 6 }, { wd: 0 },
  ];

  return (
    <div className="px-3.5 pb-8">
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, var(--bg3), var(--bg2))", border: "1px solid var(--border-gold)" }}
        className="rounded-xl p-4 mb-4 mt-3">
        <div className="lw-gold-text text-[16px] mb-1">{t.weekplanTitle}</div>
        <div style={{ color: "var(--t3)" }} className="text-[12px]">{t.weekplanDesc}</div>
      </div>

      {/* Day cards */}
      <div className="flex flex-col gap-3">
        {days.map(({ wd }) => {
          const vsD = wd === 0 ? null : VS_DAYS.find(v => v.wd === wd) ?? null;
          const isToday = wd === serverDay;
          const isSun = wd === 0;
          const dayTip = WEEK_TIPS[wd];

          // Find best overlap slots for the day
          const slots = AR_SCHEDULE[wd].map((key, s) => {
            const phase = AR_PHASES[key];
            const score = overlapScore(vsD, phase);
            return { s, phase, score };
          });
          const best = slots.reduce((a, b) => b.score > a.score ? b : a, slots[0]);

          return (
            <div key={wd}
              style={{
                background: isToday ? "var(--bg3)" : "var(--bg2)",
                border: `1px solid ${isToday ? "var(--gold)" : isSun ? "var(--blue)" : "var(--border)"}`,
                boxShadow: isToday ? "0 0 20px var(--goldglow)" : "none",
              }}
              className="rounded-xl overflow-hidden">

              {/* Day header */}
              <div style={{
                background: isToday
                  ? "linear-gradient(90deg, rgba(200,150,12,0.18) 0%, transparent 100%)"
                  : isSun
                  ? "linear-gradient(90deg, rgba(26,106,138,0.12) 0%, transparent 100%)"
                  : "linear-gradient(90deg, rgba(30,44,30,0.5) 0%, transparent 100%)",
                borderBottom: `1px solid ${isToday ? "var(--border-gold)" : "var(--border)"}`,
              }} className="px-4 py-2.5 flex items-center gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="lw-display text-[14px]" style={{ color: isToday ? "var(--gold2)" : isSun ? "var(--blue2)" : "var(--t1)" }}>
                      {t.days[wd]}
                    </span>
                    {isToday && (
                      <span style={{ background: "var(--goldglow)", border: "1px solid var(--gold)", color: "var(--gold2)" }}
                        className="text-[8px] px-2 py-0.5 rounded-full lw-display">
                        {t.weekplanToday}
                      </span>
                    )}
                    {isSun && (
                      <span style={{ background: "var(--blueglow)", border: "1px solid var(--blue2)", color: "var(--blue2)" }}
                        className="text-[8px] px-2 py-0.5 rounded-full lw-display">
                        AR ONLY
                      </span>
                    )}
                  </div>
                  {vsD && (
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <GameIcon src={vsD.icon} alt={vsD.name} size={14} />
                      <span style={{ color: "var(--t3)" }} className="text-[10px]">{vsD.name}</span>
                      <span style={{ color: "var(--gold2)" }} className="text-[9px]">· {vsD.pts} pt{vsD.pts > 1 ? "s" : ""}</span>
                    </div>
                  )}
                </div>

                {/* Best overlap badge */}
                {!isSun && (
                  <div className="ml-auto text-right">
                    <div className="text-[8px] tracking-wide mb-0.5" style={{ color: "var(--t4)" }}>{t.weekplanBestSlot}</div>
                    <div style={{ color: best.score >= 100 ? "var(--gold3)" : best.score >= 70 ? "var(--green2)" : "var(--t3)" }}
                      className="lw-display text-[11px]">
                      {String(SLOT_STARTS[best.s]).padStart(2,"0")}:00–{String(SLOT_ENDS[best.s] % 24).padStart(2,"0")}:00
                    </div>
                    <div className="text-[9px]" style={{ color: "var(--t3)" }}>
                      {best.score >= 100 ? t.weekplanPerfect : best.score >= 70 ? t.weekplanGood : t.weekplanLow}
                    </div>
                  </div>
                )}
              </div>

              {/* AR slots row */}
              <div className="px-4 py-2.5">
                <div className="flex gap-1.5 overflow-x-auto pb-1 mb-2.5">
                  {slots.map(({ s, phase, score }) => {
                    const lvl = overlapLevel(score);
                    const startH = SLOT_STARTS[s];
                    const endH = SLOT_ENDS[s] % 24;
                    return (
                      <div key={s}
                        style={{
                          background: "var(--bg4)",
                          border: `1px solid ${lvl === "PERFECT" ? "var(--gold)" : lvl === "GOED" ? "var(--green)" : "var(--border)"}`,
                          boxShadow: lvl === "PERFECT" ? "0 0 8px var(--goldglow)" : "none",
                          minWidth: 64, flex: 1,
                        }}
                        className="rounded-md px-1.5 py-1.5 text-center">
                        <div className="flex justify-center mb-0.5">
                          <GameIcon src={phase.icon} alt={phase.name} size={20} />
                        </div>
                        <div className="text-[7px] leading-tight" style={{ color: lvl === "PERFECT" ? "var(--gold2)" : lvl === "GOED" ? "var(--green2)" : "var(--t3)" }}>
                          {phase.name}
                        </div>
                        <div className="text-[7px] mt-0.5" style={{ color: "var(--t4)" }}>
                          {String(startH).padStart(2,"0")}–{String(endH).padStart(2,"0")}
                        </div>
                        {lvl !== "LAAG" && (
                          <div className="mt-0.5">
                            <span style={{
                              fontSize: 6,
                              padding: "1px 4px",
                              borderRadius: 3,
                              background: lvl === "PERFECT" ? "var(--goldglow)" : "rgba(92,216,90,0.1)",
                              color: lvl === "PERFECT" ? "var(--gold2)" : "var(--green2)",
                              border: `1px solid ${lvl === "PERFECT" ? "var(--gold)" : "var(--green)"}`,
                            }}>
                              {lvl === "PERFECT" ? t.perfect : t.good}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Tip */}
                {dayTip && (
                  <div style={{ background: "rgba(255,255,255,0.025)", borderLeft: "2px solid var(--gold)", borderRadius: "0 6px 6px 0" }}
                    className="px-3 py-2">
                    <div className="text-[11px]" style={{ color: "var(--t2)" }}>
                      <span className="mr-1">{dayTip.icon}</span>
                      {isSun ? t.weekplanSundayDesc : dayTip.tip}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
