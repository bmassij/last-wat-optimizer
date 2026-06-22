import base from "@/data/knowledge/base.json";
import type { Lang } from "./i18n";
import { VS_DAYS, AR_PHASES, type ArPhaseKey } from "./gameData";
import { getUpcomingWindows } from "./engines";

function locText(obj: Partial<Record<Lang, string>> & { en: string }, lang: Lang): string {
  return obj[lang] ?? obj.en;
}

export type KnowledgeCategory = typeof base.categories[number];
export type KnowledgeArticle = typeof base.articles[number];
export type ItemGuideEntry = typeof base.itemGuide[number];

export function getCategories(lang: Lang) {
  return base.categories.map(c => ({
    id: c.id,
    icon: c.icon,
    label: c[lang] ?? c.en,
  }));
}

export function getArticles(lang: Lang, categoryId?: string) {
  return base.articles
    .filter(a => !categoryId || categoryId === "all" || a.category === categoryId)
    .map(a => ({
      id: a.id,
      category: a.category,
      impact: a.impact,
      title: locText(a.title, lang),
      body: locText(a.body, lang),
      sources: a.sources,
    }));
}

export function getArticleById(id: string, lang: Lang) {
  const a = base.articles.find(x => x.id === id);
  if (!a) return null;
  return {
    id: a.id,
    category: a.category,
    impact: a.impact,
    title: locText(a.title, lang),
    body: locText(a.body, lang),
    sources: a.sources,
  };
}

export function getItemGuide(lang: Lang) {
  return base.itemGuide.map(item => {
    const vs = item.vsDay ? VS_DAYS.find(v => v.day === item.vsDay) : null;
    const ar = AR_PHASES[item.arKey as ArPhaseKey];
    return { ...item, vsName: vs?.name ?? null, arName: ar?.name ?? null };
  });
}

/** Popup content for VS days, AR phases, resources */
export function getTopicContent(topicId: string, lang: Lang): { title: string; body: string; sources?: string[] } | null {
  if (topicId.startsWith("vs-")) {
    const wd = parseInt(topicId.replace("vs-", ""), 10);
    if (wd === 0) return getArticleById("sunday-hamster", lang);
    const vs = VS_DAYS.find(v => v.wd === wd);
    if (!vs) return null;
    const bodies: Record<Lang, string> = {
      nl: `${vs.name} — ${vs.pts} win point(s).\n\nBeste resources: ${vs.res.join(", ")}.\n\nTip: combineer met matchende AR-fase voor max badges. Klik Weekplanner tab voor dag-schema.`,
      en: `${vs.name} — ${vs.pts} win point(s).\n\nBest resources: ${vs.res.join(", ")}.\n\nTip: combine with matching AR phase for max badges. See Week Planner tab.`,
      de: `${vs.name} — ${vs.pts} Win-Punkt(e).\n\nBeste Ressourcen: ${vs.res.join(", ")}.`,
      fr: `${vs.name} — ${vs.pts} point(s) victoire.\n\nMeilleures ressources: ${vs.res.join(", ")}.`,
      es: `${vs.name} — ${vs.pts} punto(s) victoria.\n\nMejores recursos: ${vs.res.join(", ")}.`,
    };
    return { title: vs.name, body: bodies[lang] ?? bodies.en, sources: ["lastwartutorial.com", "csmit195.com"] };
  }
  if (topicId.startsWith("ar-")) {
    const key = topicId.replace("ar-", "") as ArPhaseKey;
    const ph = AR_PHASES[key];
    if (!ph) return null;
    const bodies: Record<Lang, string> = {
      nl: `${ph.name} fase (4 uur).\n\nMatcht VS: ${ph.vsMatch.join(", ") || "Geen directe VS match"}.\n\nOpen inventory → gebruik matchende speedups/items alleen in dit venster.`,
      en: `${ph.name} phase (4 hours).\n\nMatches VS: ${ph.vsMatch.join(", ") || "No direct VS match"}.\n\nOpen inventory → use matching speedups/items only in this window.`,
      de: `${ph.name} Phase (4 Stunden).\n\nPasst zu VS: ${ph.vsMatch.join(", ")}.`,
      fr: `Phase ${ph.name} (4 heures).\n\nCorrespond à VS: ${ph.vsMatch.join(", ")}.`,
      es: `Fase ${ph.name} (4 horas).\n\nCoincide con VS: ${ph.vsMatch.join(", ")}.`,
    };
    return { title: ph.name, body: bodies[lang] ?? bodies.en, sources: ["lastwarvault.com"] };
  }
  if (topicId.startsWith("resource-")) {
    const name = topicId.replace("resource-", "");
    const article = base.articles.find(a => a.id === `item-${name}` || a.id.includes(name));
    if (article) return getArticleById(article.id, lang);
  }
  return getArticleById(topicId, lang);
}

export interface AdvisorInput {
  hqLevel: number;
  inventory: string[]; // item guide ids
}

export interface AdvisorStep {
  when: string;
  action: string;
  why: string;
  openInGame: string;
  priority: "now" | "save" | "soon";
}

export function buildAdvisorPlan(input: AdvisorInput, lang: Lang, serverDate: Date): AdvisorStep[] {
  const steps: AdvisorStep[] = [];
  const windows = getUpcomingWindows(serverDate, 8);

  const labels: Record<Lang, { now: string; save: string; open: string }> = {
    nl: { now: "Nu / vandaag", save: "Bewaar in inventory", open: "Open in game" },
    en: { now: "Now / today", save: "Save in inventory", open: "Open in game" },
    de: { now: "Jetzt / heute", save: "Im Inventar behalten", open: "Im Spiel öffnen" },
    fr: { now: "Maintenant / aujourd'hui", save: "Garder en inventaire", open: "Ouvrir en jeu" },
    es: { now: "Ahora / hoy", save: "Guardar en inventario", open: "Abrir en juego" },
  };
  const L = labels[lang] ?? labels.en;

  for (const itemId of input.inventory) {
    const guide = base.itemGuide.find(g => g.id === itemId);
    if (!guide) continue;
    const vs = guide.vsDay ? VS_DAYS.find(v => v.day === guide.vsDay) : null;
    const ar = AR_PHASES[guide.arKey as ArPhaseKey];
    const bestWin = windows.find(w =>
      (!vs || w.vsDay?.day === vs.day) &&
      w.arPhase.id === ar.id &&
      w.score >= 70
    );

    if (bestWin) {
      steps.push({
        when: `${bestWin.dayName} · ${bestWin.slotLabel}`,
        action: lang === "nl"
          ? `Gebruik ${itemId.replace(/-/g, " ")} in ${ar.name} venster`
          : `Use ${itemId.replace(/-/g, " ")} during ${ar.name} window`,
        why: lang === "nl"
          ? `Overlap score ${bestWin.score}% — VS ${vs?.name ?? "AR only"} + ${ar.name}`
          : `Overlap score ${bestWin.score}% — VS ${vs?.name ?? "AR only"} + ${ar.name}`,
        openInGame: lang === "nl"
          ? `Inventory → ${itemId.includes("speedup") ? "Boosts" : "Items"} → wacht tot ${bestWin.slotLabel}`
          : `Inventory → ${itemId.includes("speedup") ? "Boosts" : "Items"} → wait until ${bestWin.slotLabel}`,
        priority: bestWin.secsUntil < 3600 * 6 ? "now" : "soon",
      });
    } else if (guide.keep) {
      steps.push({
        when: L.save,
        action: lang === "nl" ? `Bewaar ${itemId.replace(/-/g, " ")}` : `Save ${itemId.replace(/-/g, " ")}`,
        why: vs
          ? (lang === "nl" ? `Wacht op ${vs.name} (VS dag ${vs.day}) + ${ar.name}` : `Wait for ${vs.name} + ${ar.name}`)
          : (lang === "nl" ? `Wacht op ${ar.name} AR-fase` : `Wait for ${ar.name} AR phase`),
        openInGame: `Inventory → check ${itemId.replace(/-/g, " ")}`,
        priority: "save",
      });
    }
  }

  if (input.hqLevel < 15) {
    steps.unshift({
      when: L.now,
      action: lang === "nl" ? "Focus HQ + Mastery research" : "Focus HQ + Mastery research",
      why: lang === "nl" ? "HQ <15: prioriteit groei vóór competitieve VS/AR push (S1 prep)" : "HQ <15: growth before competitive VS/AR push",
      openInGame: lang === "nl" ? "Base → HQ upgrade + Research Center" : "Base → HQ upgrade + Research Center",
      priority: "now",
    });
  }

  return steps.sort((a, b) => {
    const order = { now: 0, soon: 1, save: 2 };
    return order[a.priority] - order[b.priority];
  });
}
