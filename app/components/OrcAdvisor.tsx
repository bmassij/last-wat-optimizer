"use client";

import { useState } from "react";
import type { T, Lang } from "@/lib/i18n";
import { getItemGuide, buildAdvisorPlan, type AdvisorStep } from "@/lib/knowledgeBase";
import { getServerTime } from "@/lib/engines";
import GameIcon from "./GameIcon";

interface Props {
  t: T;
  lang: Lang;
  utcOffset: number;
  onOpenTopic: (id: string) => void;
}

const ITEM_LABELS: Record<string, Record<Lang, string>> = {
  "builder-speedup":  { nl: "Builder Speedups", en: "Builder Speedups", de: "Bau-Beschleuniger", fr: "Accél. construction", es: "Aceler. construcción" },
  "science-speedup":  { nl: "Science Speedups", en: "Science Speedups", de: "Forschungs-Beschleuniger", fr: "Accél. recherche", es: "Aceler. investigación" },
  "training-speedup": { nl: "Training Speedups", en: "Training Speedups", de: "Trainings-Beschleuniger", fr: "Accél. entraînement", es: "Aceler. entrenamiento" },
  "hero-exp":         { nl: "Hero XP / Tickets", en: "Hero XP / Tickets", de: "Helden-XP", fr: "XP Héros", es: "XP Héroe" },
  "drone-data":       { nl: "Drone Data", en: "Drone Data", de: "Drohnen-Daten", fr: "Données drone", es: "Datos dron" },
  "stamina":          { nl: "Stamina", en: "Stamina", de: "Ausdauer", fr: "Endurance", es: "Resistencia" },
  "radar":            { nl: "Radar / Missions", en: "Radar / Missions", de: "Radar", fr: "Radar", es: "Radar" },
  "valor-badge":      { nl: "Diamonds / Packs", en: "Diamonds / Packs", de: "Diamanten", fr: "Diamants", es: "Diamantes" },
};

export default function OrcAdvisor({ t, lang, utcOffset, onOpenTopic }: Props) {
  const [hqLevel, setHqLevel] = useState(18);
  const [selected, setSelected] = useState<string[]>(["builder-speedup", "science-speedup", "hero-exp"]);
  const [plan, setPlan] = useState<AdvisorStep[] | null>(null);
  const items = getItemGuide(lang);

  function toggle(id: string) {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  function generate() {
    if (selected.length === 0) return;
    const st = getServerTime(utcOffset);
    setPlan(buildAdvisorPlan({ hqLevel, inventory: selected }, lang, st));
  }

  return (
    <div className="px-3.5 pb-8">
      <div className="lw-panel p-4 mb-4 mt-3">
        <div className="lw-gold-text text-[16px] mb-1">{t.advisorTitle}</div>
        <p className="text-[13px] font-medium mb-4" style={{ color: "var(--t2)" }}>{t.advisorDesc}</p>

        <label className="block mb-4">
          <span className="lw-label block mb-2">{t.advisorHq}: <strong className="text-white text-[14px]">{hqLevel}</strong></span>
          <input
            type="range"
            min={5}
            max={35}
            value={hqLevel}
            onChange={e => setHqLevel(parseInt(e.target.value))}
            className="w-full accent-orange-500"
          />
        </label>

        <div className="lw-label mb-2">{t.advisorInventory}</div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {items.map(item => {
            const on = selected.includes(item.id);
            const label = ITEM_LABELS[item.id]?.[lang] ?? item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => toggle(item.id)}
                className={`lw-game-tile p-2 text-center cursor-pointer transition-all ${on ? "active" : ""}`}
              >
                <span className={`lw-icon-frame ${on ? "legendary" : ""} mx-auto block w-fit`}>
                  <GameIcon src={item.icon} alt={label} size={28} className="!filter-none" />
                </span>
                <div className="text-[9px] font-bold mt-1 leading-tight" style={{ color: on ? "var(--gold3)" : "var(--t2)" }}>{label}</div>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={generate}
          disabled={selected.length === 0}
          className="lw-btn-gold w-full mt-4 py-3 text-[13px] disabled:opacity-50"
        >
          {t.advisorGenerate}
        </button>
        {selected.length === 0 && (
          <p className="text-[11px] mt-2 text-center" style={{ color: "var(--red2)" }}>{t.advisorNoItems}</p>
        )}
      </div>

      {plan && plan.length > 0 && (
        <div className="flex flex-col gap-2">
          {plan.map((step, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onOpenTopic("triple-dip")}
              className={`lw-window-card px-4 py-3 text-left w-full cursor-pointer ${step.priority === "now" ? "perfect" : step.priority === "soon" ? "good" : ""}`}
            >
              <div className="flex gap-3">
                <div className="lw-display text-[20px] leading-none" style={{ color: "var(--gold2)" }}>{i + 1}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "var(--t3)" }}>{t.advisorWhen}: {step.when}</div>
                  <div className="font-bold text-[13px] text-white mt-0.5">{step.action}</div>
                  <div className="text-[11px] mt-1 font-medium" style={{ color: "var(--t2)" }}>{step.why}</div>
                  <div className="mt-2 lw-res-pill text-[9px] inline-block">{t.advisorOpenGame}: {step.openInGame}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
