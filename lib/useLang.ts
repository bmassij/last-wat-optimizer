"use client";

import { useState, useEffect, useCallback } from "react";
import { detectLang, getTranslation, type Lang, type T } from "./i18n";

const STORAGE_KEY = "orc_lang";

export function useLang() {
  const [lang, setLangState] = useState<Lang>("en");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Lang | null;
      setLangState(saved ?? detectLang());
    } catch {
      setLangState(detectLang());
    }
    setReady(true);
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try { localStorage.setItem(STORAGE_KEY, l); } catch {}
  }, []);

  const t: T = getTranslation(lang);
  return { lang, setLang, t, ready };
}
