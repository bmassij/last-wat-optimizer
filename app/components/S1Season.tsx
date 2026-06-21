"use client";

import { useState, useEffect } from "react";
import type { T } from "@/lib/i18n";

interface Props {
  t: T;
}

const PRIORITY_COLORS: Record<string, string> = {
  hoog:   "var(--red2)",
  medium: "var(--gold2)",
  laag:   "var(--blue2)",
};

const PRIORITY_BG: Record<string, string> = {
  hoog:   "rgba(224,64,48,0.10)",
  medium: "rgba(240,192,48,0.08)",
  laag:   "rgba(64,176,224,0.08)",
};

export default function S1Season({ t }: Props) {
  const STORAGE_KEY = "orc_s1_checklist";
  const [checked, setChecked] = useState<boolean[]>(() => {
    // Initialize all unchecked; hydrate from localStorage in useEffect
    return t.s1ChecklistItems.map(() => false);
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as boolean[];
        if (Array.isArray(saved) && saved.length === t.s1ChecklistItems.length) {
          setChecked(saved);
        }
      }
    } catch {}
  }, [t.s1ChecklistItems.length]);

  function toggleItem(i: number) {
    const next = checked.map((v, idx) => idx === i ? !v : v);
    setChecked(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
  }

  const doneCount = checked.filter(Boolean).length;
  const total = t.s1ChecklistItems.length;
  const pct = Math.round((doneCount / total) * 100);
  const readyColor = pct >= 80 ? "var(--green2)" : pct >= 50 ? "var(--gold2)" : "var(--red2)";

  return (
    <div className="px-3.5 pb-8">
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, rgba(104,64,168,0.15), var(--bg2))", border: "1px solid rgba(160,112,232,0.35)" }}
        className="rounded-xl p-4 mb-4 mt-3">
        <div style={{
          fontFamily: "var(--font-display)", letterSpacing: "0.08em", textTransform: "uppercase",
          background: "linear-gradient(180deg, var(--purple2) 0%, #c0a0ff 100%)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          backgroundClip: "text", fontSize: 16,
        }}>
          {t.s1Title}
        </div>
        <div style={{ color: "var(--t3)" }} className="text-[12px] mt-1">{t.s1Desc}</div>
      </div>

      {/* What is S1 */}
      <div style={{ background: "var(--bg2)", border: "1px solid var(--border)" }} className="rounded-xl p-4 mb-4">
        <div className="lw-section-title text-[10px] mb-2">{t.s1WhatIs}</div>
        <p style={{ color: "var(--t2)" }} className="text-[12px] leading-relaxed">{t.s1WhatIsBody}</p>
      </div>

      {/* Readiness meter */}
      <div style={{ background: "var(--bg2)", border: `1px solid ${readyColor}44` }} className="rounded-xl p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="lw-section-title text-[10px]">
            {t.lang === "nl" ? "S1 Gereedheid" : t.lang === "de" ? "S1 Bereitschaft" : t.lang === "fr" ? "Préparation S1" : t.lang === "es" ? "Preparación S1" : "S1 Readiness"}
          </span>
          <span style={{ color: readyColor }} className="lw-display text-[20px]">{pct}%</span>
        </div>
        <div style={{ background: "var(--bg4)" }} className="h-2.5 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${readyColor}, ${readyColor}cc)` }} />
        </div>
        <div className="text-[10px] mt-1.5" style={{ color: "var(--t3)" }}>
          {doneCount}/{total} {t.lang === "nl" ? "items klaar" : t.lang === "de" ? "Punkte erledigt" : t.lang === "fr" ? "éléments prêts" : t.lang === "es" ? "elementos listos" : "items done"}
          {" · "}
          {pct >= 80
            ? (t.lang === "nl" ? "✅ Klaar voor S1!" : t.lang === "de" ? "✅ Bereit für S1!" : t.lang === "fr" ? "✅ Prêt pour S1!" : t.lang === "es" ? "✅ ¡Listo para S1!" : "✅ Ready for S1!")
            : pct >= 50
            ? (t.lang === "nl" ? "⚠️ Bijna klaar" : t.lang === "de" ? "⚠️ Fast bereit" : t.lang === "fr" ? "⚠️ Presque prêt" : t.lang === "es" ? "⚠️ Casi listo" : "⚠️ Almost ready")
            : (t.lang === "nl" ? "❌ Meer voorbereiding nodig" : t.lang === "de" ? "❌ Mehr Vorbereitung nötig" : t.lang === "fr" ? "❌ Plus de préparation nécessaire" : t.lang === "es" ? "❌ Se necesita más preparación" : "❌ More preparation needed")}
        </div>
      </div>

      {/* Checklist */}
      <div style={{ background: "var(--bg2)", border: "1px solid var(--border-gold)" }} className="rounded-xl overflow-hidden mb-4">
        <div className="lw-panel-header px-4 py-2.5">
          <span className="lw-section-title text-[10px]">{t.s1Checklist}</span>
        </div>
        <div className="p-2">
          {t.s1ChecklistItems.map((item, i) => {
            const isChecked = checked[i];
            const pColor = PRIORITY_COLORS[item.priority] ?? "var(--t3)";
            const pBg = PRIORITY_BG[item.priority] ?? "var(--bg4)";
            return (
              <button key={i} onClick={() => toggleItem(i)}
                style={{
                  background: isChecked ? "rgba(42,138,58,0.08)" : "transparent",
                  border: `1px solid ${isChecked ? "var(--green)" : "transparent"}`,
                  borderRadius: 8,
                  width: "100%",
                  textAlign: "left",
                  cursor: "pointer",
                }}
                className="px-3 py-2.5 mb-1 flex items-start gap-3 transition-all last:mb-0">
                {/* Checkbox */}
                <div style={{
                  width: 18, height: 18, borderRadius: 5, flexShrink: 0, marginTop: 1,
                  background: isChecked ? "var(--green2)" : "var(--bg4)",
                  border: `2px solid ${isChecked ? "var(--green2)" : "var(--border2)"}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.15s",
                }}>
                  {isChecked && <span style={{ color: "#0a120c", fontSize: 11, fontWeight: 900 }}>✓</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <div style={{ color: isChecked ? "var(--t3)" : "var(--t1)", textDecoration: isChecked ? "line-through" : "none" }}
                    className="text-[12px] leading-snug">
                    {item.text}
                  </div>
                  <div className="mt-1">
                    <span style={{ fontSize: 8, padding: "1px 6px", borderRadius: 10, background: pBg, color: pColor, border: `1px solid ${pColor}44` }}
                      className="font-bold">
                      {item.priority === "hoog" ? t.priorityHigh : item.priority === "medium" ? t.priorityMed : t.priorityLow}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Timeline */}
      <div style={{ background: "var(--bg2)", border: "1px solid var(--border)" }} className="rounded-xl overflow-hidden">
        <div className="lw-panel-header px-4 py-2.5">
          <span className="lw-section-title text-[10px]">{t.s1Timeline}</span>
        </div>
        <div className="p-4">
          <div className="flex flex-col gap-0">
            {t.s1TimelineItems.map((item, i) => (
              <div key={i} className="flex gap-3">
                {/* Timeline line */}
                <div className="flex flex-col items-center">
                  <div style={{
                    width: 12, height: 12, borderRadius: "50%", flexShrink: 0,
                    background: i === 2 ? "var(--gold2)" : "var(--bg4)",
                    border: `2px solid ${i === 2 ? "var(--gold)" : "var(--border2)"}`,
                    boxShadow: i === 2 ? "0 0 10px var(--goldglow)" : "none",
                    marginTop: 2,
                  }} />
                  {i < t.s1TimelineItems.length - 1 && (
                    <div style={{ width: 1, flex: 1, background: "var(--border)", minHeight: 20, margin: "4px 0" }} />
                  )}
                </div>
                {/* Content */}
                <div className="pb-4 flex-1">
                  <div style={{ color: i === 2 ? "var(--gold2)" : "var(--purple2)" }} className="lw-display text-[10px] tracking-wide">
                    {item.week}
                  </div>
                  <div style={{ color: "var(--t1)" }} className="text-[12px] font-semibold mt-0.5">{item.title}</div>
                  <div style={{ color: "var(--t3)" }} className="text-[11px] mt-0.5">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
