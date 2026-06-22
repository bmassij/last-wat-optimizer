"use client";

import { useState, useMemo } from "react";
import type { T, Lang } from "@/lib/i18n";
import { getCategories, getArticles } from "@/lib/knowledgeBase";

interface Props {
  t: T;
  lang: Lang;
  onOpenArticle: (id: string) => void;
}

export default function InfoHub({ t, lang, onOpenArticle }: Props) {
  const [cat, setCat] = useState("all");
  const [query, setQuery] = useState("");
  const categories = getCategories(lang);
  const articles = useMemo(() => {
    const list = getArticles(lang, cat);
    if (!query.trim()) return list;
    const q = query.toLowerCase();
    return list.filter(a => a.title.toLowerCase().includes(q) || a.body.toLowerCase().includes(q));
  }, [lang, cat, query]);

  return (
    <div className="px-3.5 pb-8">
      <div className="lw-panel p-4 mb-4 mt-3">
        <div className="lw-gold-text text-[16px] mb-1">{t.infoHubTitle}</div>
        <p className="text-[13px] font-medium" style={{ color: "var(--t2)" }}>{t.infoHubDesc}</p>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={t.infoSearch}
          className="lw-input w-full mt-3 px-3 py-2 text-[13px]"
        />
      </div>

      <div className="flex gap-1.5 flex-wrap mb-4">
        <button
          type="button"
          onClick={() => setCat("all")}
          className={`px-3 py-1.5 rounded-full text-[10px] font-bold cursor-pointer lw-display ${cat === "all" ? "lw-pill-vs" : "lw-btn-secondary"}`}
        >
          {t.infoAllCats}
        </button>
        {categories.map(c => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCat(c.id)}
            className={`px-3 py-1.5 rounded-full text-[10px] font-bold cursor-pointer ${cat === c.id ? "lw-pill-vs" : "lw-btn-secondary"}`}
          >
            {c.icon} {c.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        {articles.map(a => (
          <button
            key={a.id}
            type="button"
            onClick={() => onOpenArticle(a.id)}
            className="lw-window-card px-4 py-3 text-left w-full cursor-pointer hover:brightness-110 transition-all"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-bold text-[13px] text-white">{a.title}</div>
                <div className="text-[11px] mt-1 line-clamp-2 font-medium" style={{ color: "var(--t2)" }}>
                  {a.body.split("\n")[0]}
                </div>
              </div>
              <span className="text-[10px] shrink-0 lw-display" style={{ color: "var(--gold3)" }}>{t.tapForInfo}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
