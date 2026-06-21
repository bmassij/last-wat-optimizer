"use client";

import { useState } from "react";
import type { T } from "@/lib/i18n";

interface Props {
  t: T;
}

const IMPACT_COLORS: Record<string, string> = {
  hoog:   "var(--red2)",
  medium: "var(--gold2)",
  laag:   "var(--blue2)",
};

export default function TipsTricks({ t }: Props) {
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [expanded, setExpanded] = useState<number | null>(null);

  const cats = Object.entries(t.tipsCategories) as [string, string][];
  const filtered = activeFilter === "all" ? t.tips : t.tips.filter(tip => tip.cat === activeFilter);

  return (
    <div className="px-3.5 pb-8">
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, var(--bg3), var(--bg2))", border: "1px solid var(--border-gold)" }}
        className="rounded-xl p-4 mb-4 mt-3">
        <div className="lw-gold-text text-[16px] mb-1">{t.tipsTitle}</div>
        <div className="flex items-center gap-3 mt-2">
          <div style={{ background: "rgba(224,64,48,0.12)", border: "1px solid var(--red2)" }} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full">
            <span style={{ color: "var(--red2)" }} className="text-[10px] font-bold">🔥 {t.impactHigh}</span>
          </div>
          <div style={{ background: "rgba(240,192,48,0.08)", border: "1px solid var(--gold)" }} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full">
            <span style={{ color: "var(--gold2)" }} className="text-[10px] font-bold">⚡ {t.impactMed}</span>
          </div>
        </div>
      </div>

      {/* Category filters */}
      <div className="flex gap-1.5 flex-wrap mb-4">
        <button onClick={() => setActiveFilter("all")}
          style={activeFilter === "all"
            ? { background: "var(--goldglow)", border: "1px solid var(--gold)", color: "var(--gold2)" }
            : { background: "var(--bg3)", border: "1px solid var(--border)", color: "var(--t3)" }}
          className="px-3 py-1.5 rounded-full text-[10px] font-semibold cursor-pointer transition-all lw-display">
          {t.lang === "nl" ? "ALLE" : t.lang === "de" ? "ALLE" : t.lang === "fr" ? "TOUT" : t.lang === "es" ? "TODOS" : "ALL"}
        </button>
        {cats.map(([key, label]) => (
          <button key={key} onClick={() => setActiveFilter(key)}
            style={activeFilter === key
              ? { background: "var(--goldglow)", border: "1px solid var(--gold)", color: "var(--gold2)" }
              : { background: "var(--bg3)", border: "1px solid var(--border)", color: "var(--t3)" }}
            className="px-3 py-1.5 rounded-full text-[10px] font-semibold cursor-pointer transition-all">
            {label}
          </button>
        ))}
      </div>

      {/* Tips list */}
      <div className="flex flex-col gap-2.5">
        {filtered.map((tip, i) => {
          const isExpanded = expanded === i;
          const impactColor = IMPACT_COLORS[tip.impact] ?? "var(--t3)";
          return (
            <div key={i}
              style={{
                background: isExpanded ? "var(--bg3)" : "var(--bg2)",
                border: isExpanded ? "1px solid var(--border-gold)" : "1px solid var(--border)",
                boxShadow: isExpanded ? "0 0 16px var(--goldglow)" : "none",
              }}
              className="rounded-xl overflow-hidden transition-all">

              {/* Header row */}
              <button
                onClick={() => setExpanded(isExpanded ? null : i)}
                className="w-full text-left px-4 py-3 cursor-pointer"
                style={{ background: "transparent" }}>
                <div className="flex items-start gap-3">
                  {/* Impact indicator */}
                  <div style={{ width: 3, alignSelf: "stretch", background: impactColor, borderRadius: 2, flexShrink: 0 }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2">
                      <span className="text-[12px] font-semibold leading-snug flex-1" style={{ color: "var(--t1)" }}>
                        {tip.title}
                      </span>
                      <span style={{ color: isExpanded ? "var(--gold2)" : "var(--t4)" }} className="text-[14px] ml-1 flex-shrink-0">
                        {isExpanded ? "▲" : "▼"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span style={{
                        fontSize: 8, padding: "1px 6px", borderRadius: 10,
                        background: `${impactColor}18`,
                        border: `1px solid ${impactColor}44`,
                        color: impactColor,
                      }} className="font-bold tracking-wide">
                        {tip.impact === "hoog" ? t.impactHigh : t.impactMed}
                      </span>
                      <span style={{ color: "var(--t4)" }} className="text-[9px]">
                        {(t.tipsCategories as Record<string, string>)[tip.cat] ?? tip.cat}
                      </span>
                    </div>
                  </div>
                </div>
              </button>

              {/* Expanded body */}
              {isExpanded && (
                <div style={{ borderTop: "1px solid var(--border)" }} className="px-4 py-3">
                  <p style={{ color: "var(--t2)", lineHeight: 1.6 }} className="text-[12px]">
                    {tip.body}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Total count */}
      <div style={{ color: "var(--t4)" }} className="text-[9px] text-center mt-4 tracking-wide">
        {filtered.length} {t.lang === "nl" ? "tips" : "tips"} {activeFilter !== "all" ? `· ${(t.tipsCategories as Record<string, string>)[activeFilter] ?? ""}` : ""}
      </div>
    </div>
  );
}
