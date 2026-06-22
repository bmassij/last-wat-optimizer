"use client";

import { useState, useEffect, useRef } from "react";
import {
  getServerTime, getSlot, secsUntilSlotEnd, formatCountdown, formatDuration,
  getVsDay, isSunday, getArPhase, getNextArPhase, getArPhaseAt,
  overlapScore, overlapLevel, buildRecommendations, getUpcomingWindows,
} from "@/lib/engines";
import { VS_DAYS, AR_PHASES, AR_SCHEDULE, SLOT_STARTS, SLOT_ENDS, ICONS } from "@/lib/gameData";
import { detectLang, getTranslation, LANG_NAMES, type Lang, type T } from "@/lib/i18n";
import { getTopicContent } from "@/lib/knowledgeBase";
import GameIcon from "./GameIcon";
import InfoModal from "./InfoModal";
import InfoHub from "./InfoHub";
import OrcAdvisor from "./OrcAdvisor";
import WeekPlanner from "./WeekPlanner";
import SpeedupCalc from "./SpeedupCalc";
import TipsTricks from "./TipsTricks";
import S1Season from "./S1Season";

// ── Types ────────────────────────────────────────────────────

interface Settings {
  offset: number;
  arOverride: string;
  notif: boolean;
  lang: Lang;
  _setup?: boolean;
}

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem("orc_settings");
    if (raw) {
      const s = JSON.parse(raw) as Settings;
      if (!s.lang) s.lang = detectLang();
      return s;
    }
  } catch {}
  return { offset: 0, arOverride: "", notif: false, lang: detectLang() };
}

function saveSettings(s: Settings) {
  try { localStorage.setItem("orc_settings", JSON.stringify({ ...s, _setup: true })); } catch {}
}

// ── Helpers ──────────────────────────────────────────────────

function olBadge(score: number, t: T) {
  const lv = overlapLevel(score);
  const cls = lv === "PERFECT" ? "ol-perfect" : lv === "GOED" ? "ol-good" : "ol-low";
  const label = lv === "PERFECT" ? t.perfect : lv === "GOED" ? t.good : t.low;
  return <span className={`lw-display text-[9px] px-2 py-0.5 rounded-full ${cls}`}>{label}</span>;
}

type Tab = "dashboard" | "weekplan" | "speedup" | "tips" | "info" | "advisor" | "s1";

// ── Main Component ───────────────────────────────────────────

export default function OrcDashboard() {
  const [settings,  setSettings]  = useState<Settings>({ offset: 0, arOverride: "", notif: false, lang: "nl" });
  const [showSetup, setShowSetup] = useState(false);
  const [serverInput, setServerInput] = useState("");
  const [now,       setNow]       = useState(new Date());
  const [tab,       setTab]       = useState<Tab>("dashboard");
  const [showLang,  setShowLang]  = useState(false);
  const [modal,     setModal]     = useState<{ title: string; body: string; sources?: string[] } | null>(null);
  const lastSlotRef = useRef(-1);
  const lastDayRef  = useRef(-1);
  const [, forceRender] = useState(0);

  useEffect(() => {
    const s = loadSettings();
    setSettings(s);
    if (!s._setup) setShowSetup(true);
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setNow(new Date());
      const st   = getServerTime(settings.offset);
      const slot = getSlot(st);
      const day  = st.getDay();
      if (slot !== lastSlotRef.current || day !== lastDayRef.current) {
        lastSlotRef.current = slot;
        lastDayRef.current  = day;
        forceRender(v => v + 1);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [settings.offset]);

  const t        = getTranslation(settings.lang ?? "nl");
  const st       = getServerTime(settings.offset);
  const vsDay    = getVsDay(st);
  const arPhase  = getArPhase(st, settings.arOverride);
  const sun      = isSunday(st);
  const slot     = getSlot(st);
  const secs     = secsUntilSlotEnd(st);
  const progress = ((4 * 3600 - secs) / (4 * 3600) * 100).toFixed(1);
  const sc       = overlapScore(vsDay, arPhase);
  const recs     = buildRecommendations(st, settings.arOverride);
  const windows  = getUpcomingWindows(st, 6);

  const spendRecs = recs.filter(r => r.action === "spend").sort((a, b) => b.score - a.score);
  const saveRecs  = recs.filter(r => r.action === "save");
  const delayRecs = recs.filter(r => r.action === "delay");
  const avoidRecs = recs.filter(r => r.action === "avoid");

  const resetLocal = ((2 - settings.offset) + 24) % 24;
  const hasGoodNow = spendRecs.some(r => r.score >= 80);

  function updateSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
    const ns = { ...settings, [key]: value, _setup: true };
    setSettings(ns); saveSettings(ns);
  }

  function calibrate() {
    const match = serverInput.trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!match) { alert(t.setupError); return; }
    const sH = parseInt(match[1]), sM = parseInt(match[2]);
    const lH = now.getHours(),    lM = now.getMinutes();
    let diff = sH - lH;
    if (Math.abs(sM - lM) > 15) diff += sM > lM ? 1 : -1;
    if (diff > 12) diff -= 24;
    if (diff < -12) diff += 24;
    const ns = { ...settings, offset: diff, _setup: true };
    setSettings(ns); saveSettings(ns); setShowSetup(false);
  }

  async function toggleNotif() {
    if (!("Notification" in window)) { alert(t.notifUnsupported); return; }
    if (settings.notif) { updateSetting("notif", false); return; }
    const perm = await Notification.requestPermission();
    if (perm === "granted") {
      updateSetting("notif", true);
      new Notification(t.notifGranted, { body: t.notifGrantedBody });
    } else {
      alert(t.notifDenied);
    }
  }

  function openInfo(topicId: string) {
    const content = getTopicContent(topicId, settings.lang ?? "en");
    if (content) setModal(content);
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "dashboard", label: t.tabDashboard },
    { id: "weekplan",  label: t.tabWeekplan  },
    { id: "speedup",   label: t.tabSpeedup   },
    { id: "tips",      label: t.tabTips      },
    { id: "info",      label: t.tabInfo      },
    { id: "advisor",   label: t.tabAdvisor   },
    { id: "s1",        label: t.tabS1        },
  ];

  const dayWord = t.lang === "de" ? "Tag" : t.lang === "fr" ? "Jour" : t.lang === "es" ? "Día" : t.lang === "nl" ? "Dag" : "Day";
  const nowWord = t.lang === "de" ? "JETZT" : t.lang === "fr" ? "MAINTENANT" : t.lang === "es" ? "AHORA" : t.lang === "nl" ? "NU" : "NOW";

  return (
    <div className="min-h-screen relative z-[1]">
    <div className="lw-game-shell">

      {modal && (
        <InfoModal t={t} title={modal.title} body={modal.body} sources={modal.sources} onClose={() => setModal(null)} />
      )}

      {/* ── TOPBAR ── */}
      <div className="lw-topbar sticky top-0 z-50 flex items-center gap-3 px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <div className="lw-logo-mark w-9 h-9 flex items-center justify-center flex-shrink-0 p-1">
            <GameIcon src={ICONS.favicon} alt="ORC" size={28} className="!filter-none" />
          </div>
          <div>
            <div className="lw-gold-text text-[22px] leading-none">{t.appName}</div>
            <div className="lw-label text-[8px] mt-0.5">{t.appSub}</div>
          </div>
        </div>
        <span className={`text-[11px] px-3 py-1 rounded-full ${sun ? "lw-pill-ar" : "lw-pill-vs"}`}>
          {sun ? t.arOnly : t.vsActive}
        </span>
        <div className="ml-auto flex items-center gap-2">
          {/* Lang picker */}
          <div className="relative">
            <button onClick={() => setShowLang(v => !v)}
              style={{ background: "var(--bg4)", border: "1px solid var(--border2)", color: "var(--t2)", borderRadius: 6, padding: "4px 8px", fontSize: 11, cursor: "pointer" }}>
              {LANG_NAMES[settings.lang ?? "nl"].slice(0, 2)}
            </button>
            {showLang && (
              <div style={{ position: "absolute", right: 0, top: "calc(100% + 4px)", background: "var(--bg3)", border: "1px solid var(--border-gold)", borderRadius: 10, boxShadow: "0 8px 32px rgba(0,0,0,0.5)", zIndex: 200, minWidth: 160 }}>
                {(Object.entries(LANG_NAMES) as [Lang, string][]).map(([code, name]) => (
                  <button key={code} onClick={() => { updateSetting("lang", code); setShowLang(false); }}
                    style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 14px", background: settings.lang === code ? "var(--goldglow)" : "transparent", color: settings.lang === code ? "var(--gold2)" : "var(--t2)", fontSize: 12, cursor: "pointer", borderBottom: "1px solid var(--border)" }}
                    className="last:border-0">
                    {name}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="text-right">
            <span style={{ color: "var(--gold2)" }} className="lw-display text-[20px] tabular-nums block leading-none">
              {now.toLocaleTimeString("en-GB")}
            </span>
            <span style={{ color: "var(--t3)" }} className="text-[9px]">
              {now.toLocaleDateString(t.lang === "nl" ? "nl-NL" : t.lang === "de" ? "de-DE" : t.lang === "fr" ? "fr-FR" : t.lang === "es" ? "es-ES" : "en-GB", { weekday: "short", day: "numeric", month: "short" })}
            </span>
          </div>
        </div>
      </div>

      {/* ── TAB BAR ── */}
      <div className="lw-tab-bar">
        {tabs.map(({ id, label }) => (
          <button key={id} type="button" onClick={() => setTab(id)} className={`lw-tab${tab === id ? " active" : ""}`}>
            {label}
          </button>
        ))}
      </div>

      <p className="text-center text-[10px] py-1.5 font-semibold" style={{ color: "var(--t3)" }}>{t.clickHint}</p>

      {/* ── SETUP BANNER ── */}
      {showSetup && tab === "dashboard" && (
        <div style={{ background: "linear-gradient(135deg, var(--bg2), var(--bg3))", borderBottom: "2px solid var(--gold)" }} className="px-4 py-4">
          <div className="lw-gold-text text-[15px] mb-1">⚙️ {t.setupTitle}</div>
          <div style={{ color: "var(--t2)" }} className="text-[12px] mb-3">{t.setupDesc}</div>
          <div className="flex items-center gap-2 flex-wrap">
            <span style={{ color: "var(--t3)" }} className="text-[11px]">{t.setupServerTime}</span>
            <input value={serverInput} onChange={e => setServerInput(e.target.value)}
              placeholder="14:30" maxLength={5} className="lw-input px-2 py-1.5 text-[13px] w-20" />
            <button onClick={calibrate} className="lw-btn-gold px-4 py-1.5 text-[12px]">{t.setupCalibrate}</button>
            <button onClick={() => { updateSetting("_setup" as keyof Settings, true as unknown as Settings[keyof Settings]); setShowSetup(false); }}
              className="lw-btn-secondary px-3 py-1.5 text-[11px]">{t.setupSkip}</button>
          </div>
        </div>
      )}

      {/* ── MODULE TABS ── */}
      {tab === "weekplan" && <WeekPlanner serverDay={st.getDay()} t={t} />}
      {tab === "speedup"  && <SpeedupCalc utcOffset={settings.offset} arOverride={settings.arOverride} t={t} />}
      {tab === "tips"     && <TipsTricks t={t} />}
      {tab === "info"     && <InfoHub t={t} lang={settings.lang} onOpenArticle={openInfo} />}
      {tab === "advisor"  && <OrcAdvisor t={t} lang={settings.lang} utcOffset={settings.offset} onOpenTopic={openInfo} />}
      {tab === "s1"       && <S1Season t={t} />}

      {/* ── DASHBOARD TAB ── */}
      {tab === "dashboard" && (
        <>
          {/* VS banner */}
          {!sun && vsDay && (
            <button type="button" onClick={() => openInfo(`vs-${vsDay.wd}`)} className="lw-vs-banner w-[calc(100%-24px)] text-left cursor-pointer hover:brightness-110 transition-all">
              <GameIcon src={ICONS.vsBanner} alt="VS" size={48} className="!filter-none rounded" />
              <div className="flex-1">
                <div className="lw-display text-[11px]" style={{ color: "var(--gold2)" }}>{t.vsBanner} {vsDay.day} <span className="text-[9px] opacity-80">{t.tapForInfo}</span></div>
                <div className="flex items-center gap-1.5 text-[12px]" style={{ color: "var(--t2)" }}>
                  <GameIcon src={vsDay.icon} alt={vsDay.name} size={18} />
                  <span>{vsDay.name}</span>
                  <span style={{ color: "var(--t4)" }}>·</span>
                  <span>{vsDay.pts} win point{vsDay.pts > 1 ? "s" : ""}</span>
                </div>
              </div>
            </button>
          )}

          {/* Config bar */}
          <div style={{ background: "var(--bg2)", borderBottom: "1px solid var(--border-gold)" }} className="px-4 py-2 flex items-center gap-3 flex-wrap text-[10px]">
            <span style={{ color: "var(--t3)" }}>⚙️</span>
            <label style={{ color: "var(--t3)" }}>{t.serverUtc}
              <select value={settings.offset} onChange={e => updateSetting("offset", parseInt(e.target.value))} className="lw-select ml-1.5 px-2 py-1 text-[11px] cursor-pointer">
                {Array.from({ length: 25 }, (_, i) => i - 12).map(o => (
                  <option key={o} value={o}>UTC{o >= 0 ? "+" : ""}{o}</option>
                ))}
              </select>
            </label>
            <label style={{ color: "var(--t3)" }}>{t.arOverride}
              <select value={settings.arOverride} onChange={e => updateSetting("arOverride", e.target.value)} className="lw-select ml-1.5 px-2 py-1 text-[11px] cursor-pointer">
                <option value="">{t.arAuto}</option>
                <option value="CITY">🏗️ City Building</option>
                <option value="UNIT">⚔️ Unit Progression</option>
                <option value="TECH">🔬 Tech Research</option>
                <option value="DRONE">🚁 Drone Boost</option>
                <option value="HERO">🦸 Hero Advancement</option>
              </select>
            </label>
            <button onClick={toggleNotif}
              style={settings.notif ? { background: "var(--greenglow)", border: "1px solid var(--green2)", color: "var(--green2)" } : { background: "var(--bg4)", border: "1px solid var(--border2)", color: "var(--t2)" }}
              className="px-2.5 py-1 rounded text-[11px] cursor-pointer">
              🔔 {t.notifBtn} {settings.notif ? t.notifOn : t.notifOff}
            </button>
            <span className="ml-auto" style={{ color: "var(--t4)" }}>
              {t.resetLocal} <strong style={{ color: "var(--gold2)" }}>{String(resetLocal).padStart(2, "0")}:00</strong>
            </span>
          </div>

          {/* Alert */}
          {!hasGoodNow && windows.length > 0 && !sun && (
            <div style={{ background: "rgba(160,24,24,0.12)", border: "1px solid rgba(224,48,48,0.35)", borderLeft: "3px solid var(--red2)" }}
              className="mx-3.5 mt-3 px-4 py-2.5 rounded-lg flex items-center gap-3">
              <span>⚠️</span>
              <div style={{ color: "var(--t2)" }} className="flex-1 text-[12px]">
                <strong style={{ color: "var(--red2)" }}>{t.suboptimal}</strong>{" "}
                {windows[0].vsDay?.name ?? "AR"} + {windows[0].arPhase.name} ~{formatDuration(windows[0].secsUntil / 60)}{t.suboptimalSuffix}
              </div>
              <div style={{ color: "var(--green2)" }} className="text-[11px] whitespace-nowrap">
                +{windows[0].score - sc}% in {formatDuration(windows[0].secsUntil / 60)}
              </div>
            </div>
          )}

          {/* Hero command card */}
          <div className="px-3.5 pt-3">
            <div className="lw-panel overflow-hidden">
              <div className="lw-panel-header px-4 py-2.5 flex items-center gap-2">
                <span className="lw-section-title text-[10px]">
                  {sun ? `${t.sunday} — ${t.arOnly}` : sc >= 100 ? `🎯 ${t.perfect}` : sc >= 70 ? `✅ ${t.good}` : "COMMAND"}
                </span>
                <span className="ml-auto flex items-center gap-1.5 text-[10px]" style={{ color: "var(--t3)" }}>
                  {vsDay ? (<><GameIcon src={vsDay.icon} alt={vsDay.name} size={16}/><span>{vsDay.name}</span><span style={{color:"var(--t4)"}}>×</span><GameIcon src={arPhase.icon} alt={arPhase.name} size={16}/><span>{arPhase.name}</span></>) : (<><GameIcon src={arPhase.icon} alt={arPhase.name} size={16}/><span>{arPhase.name}</span></>)}
                </span>
              </div>
              <div className="p-4">
                {/* DOE DIT NU */}
                <div className={`lw-command-box p-4 mb-3 ${sc >= 80 ? "perfect" : sc >= 50 ? "good" : "low"}`}>
                  <div className="absolute top-2 right-3 lw-display text-[9px]" style={{ color: "var(--green2)", opacity: 0.85 }}>{t.doNow}</div>
                  {spendRecs[0] ? (
                    <>
                      <div className="font-semibold text-[13px] mb-1" style={{ color: "var(--t1)" }}>{spendRecs[0].tip || spendRecs[0].reason}</div>
                      <div className="text-[11px] mb-3" style={{ color: "var(--t2)" }}>{spendRecs[0].reason}</div>
                      <div className="flex flex-wrap gap-2">
                        {spendRecs.map(r => (
                          <div key={r.name}
                            style={r.score >= 90 ? { background: "var(--greenglow)", border: "1px solid var(--green2)", color: "var(--green2)" } : { background: "var(--bg4)", border: "1px solid var(--border2)", color: "var(--t1)" }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold">
                            <GameIcon src={r.icon} alt={r.name} size={18}/> {r.name}
                            <span className="text-[9px] font-bold" style={{ color: "var(--green2)" }}>{r.score >= 90 ? "+MAX" : `${r.score}%`}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div style={{ color: "var(--t4)" }} className="text-[12px]">{t.noOptimal}</div>
                  )}
                  <div className="mt-3">
                    <div className="flex justify-between text-[10px] mb-1" style={{ color: "var(--t3)" }}>
                      <span>{t.effNow}</span><span>{sc}%</span>
                    </div>
                    <div style={{ background: "var(--bg4)" }} className="h-1.5 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${sc}%`, background: sc >= 80 ? "linear-gradient(90deg, var(--green), var(--green2))" : sc >= 50 ? "linear-gradient(90deg, var(--gold), var(--gold2))" : "linear-gradient(90deg, var(--red), var(--red2))" }} />
                    </div>
                  </div>
                </div>
                {/* Save/Delay/Avoid */}
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {[
                    { icon: "🔒", label: t.save,  items: saveRecs,  color: "var(--blue2)" },
                    { icon: "⏳", label: t.wait,  items: delayRecs, color: "var(--gold2)" },
                    { icon: "🚫", label: t.avoid, items: avoidRecs, color: "var(--red2)"  },
                  ].map(({ icon, label, items, color }) => items.length > 0 && (
                    <div key={label} style={{ background: "var(--bg3)", border: "1px solid var(--border)" }} className="rounded-lg p-3">
                      <div className="text-[9px] font-bold tracking-widest mb-2" style={{ color }}>{icon} {label}</div>
                      {items.map(r => (
                        <div key={r.name} style={{ borderBottom: "1px solid var(--border)" }} className="py-1.5 last:border-0">
                          <div className="text-[11px] flex items-center gap-1.5" style={{ color: "var(--t2)" }}><GameIcon src={r.icon} alt={r.name} size={16}/> {r.name}</div>
                          <div className="text-[9px] mt-0.5" style={{ color: "var(--t4)" }}>{r.tip || r.reason}</div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Status strip */}
          <div className="grid grid-cols-2 gap-2 px-3.5 pt-3 sm:grid-cols-4">
            {[
              { label: t.vsDay,      val: sun ? t.sunday : `${dayWord} ${vsDay?.day ?? "—"}`, sub: sun ? t.arOnly2 : vsDay?.name ?? "—", color: "var(--gold2)",   accent: "var(--gold2)" },
              { label: t.arPhaseNow, val: arPhase?.name ?? "—", valIcon: arPhase?.icon, sub: `${t.slot} ${slot+1}/6`, color: "var(--blue2)", accent: "var(--blue2)" },
              { label: t.phaseEnds,  val: formatCountdown(secs), sub: "", color: "var(--green2)", accent: "var(--green2)", prog: progress },
              { label: t.nextWindow, val: windows[0] ? (windows[0].vsDay?.short ?? "AR") : "—", sub: windows[0] ? `~${formatDuration(windows[0].secsUntil/60)}` : "—", color: "var(--purple2)", accent: "var(--purple2)" },
            ].map(({ label, val, valIcon, sub, color, accent, prog }) => (
              <div key={label} style={{ "--accent": accent } as React.CSSProperties} className="lw-stat-card p-3">
                <div className="lw-label mb-1">{label}</div>
                <div style={{ color }} className="lw-display text-[18px] tabular-nums leading-none flex items-center gap-1.5">
                  {valIcon && <GameIcon src={valIcon} alt="" size={20}/>}{val}
                </div>
                {sub && <div style={{ color: "var(--t3)" }} className="text-[10px] mt-0.5">{sub}</div>}
                {prog && <div style={{ background: "var(--bg4)" }} className="mt-1.5 h-1 rounded-full overflow-hidden"><div className="h-full rounded-full transition-all duration-1000" style={{ width: `${prog}%`, background: "var(--blue2)" }} /></div>}
              </div>
            ))}
          </div>

          {/* VS Week */}
          <div className="px-3.5 pt-4">
            <div className="flex items-center gap-2 mb-2.5">
              <span className="lw-section-title">{t.vsWeek}</span>
              <div className="lw-divider" />
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {[{wd:1},{wd:2},{wd:3},{wd:4},{wd:5},{wd:6},{wd:0}].map(({ wd }) => {
                const vs = wd === 0 ? null : VS_DAYS.find(v => v.wd === wd) ?? null;
                const isActive = wd === st.getDay();
                const isPast   = st.getDay() > 0 && wd > 0 && wd < st.getDay();
                const isSun    = wd === 0;
                return (
                  <button key={wd} type="button" onClick={() => openInfo(wd === 0 ? "sunday-hamster" : `vs-${wd}`)}
                    className={`lw-game-tile px-1 py-2 text-center relative w-full cursor-pointer${isActive ? " active" : ""}`}
                    style={{ opacity: isPast ? 0.35 : isSun ? 0.5 : 1 }}>
                    {isActive && <div className="blink absolute top-1 right-1 w-1.5 h-1.5 rounded-full" style={{ background: "var(--gold2)", boxShadow: "0 0 5px var(--gold2)" }} />}
                    <div style={{ color: "var(--t3)" }} className="text-[8px] tracking-wide">{t.daysShort[wd]}</div>
                    <div className="flex justify-center my-1">{vs ? <GameIcon src={vs.icon} alt={vs.short} size={26}/> : <GameIcon src={ICONS.dronePart} alt="AR" size={22} className="opacity-40"/>}</div>
                    <div style={{ color: isActive ? "var(--gold2)" : "var(--t2)" }} className="text-[8px] font-bold">{vs ? vs.short : "AR"}</div>
                    <div style={{ color: "var(--t4)" }} className="text-[8px]">{vs ? `${vs.pts}pt` : "—"}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* AR Timeline */}
          <div className="px-3.5 pt-4">
            <div className="flex items-center gap-2 mb-2.5">
              <span className="lw-section-title">{t.arToday}</span>
              <div className="lw-divider" />
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {AR_SCHEDULE[st.getDay()].map((key, s) => {
                const phase = AR_PHASES[key];
                const isCur = s === slot;
                const isOvl = overlapScore(vsDay, phase) >= 100 && !isCur;
                return (
                  <button key={s} type="button" onClick={() => openInfo(`ar-${key}`)}
                    className={`lw-game-tile px-2 py-2 text-center relative cursor-pointer${isCur ? " current-ar" : isOvl ? " overlap-ar" : ""}`}
                    style={{ minWidth: 70, flex: 1 }}>
                    {isCur && <div className="absolute -top-2 left-1/2 -translate-x-1/2 lw-do-now-badge text-[7px] z-10">{nowWord}</div>}
                    {isOvl && <div className="absolute -top-2 left-1/2 -translate-x-1/2 text-[7px] font-bold whitespace-nowrap px-1 rounded" style={{ color: "var(--gold2)", background: "var(--bg0)" }}>{t.overlap}</div>}
                    <div className="flex justify-center mb-1"><GameIcon src={phase.icon} alt={phase.name} size={24}/></div>
                    <div className="text-[8px] font-semibold" style={{ color: isCur ? "var(--blue2)" : isOvl ? "var(--gold2)" : "var(--t2)" }}>{phase.name}</div>
                    <div className="text-[8px] mt-0.5 font-bold" style={{ color: "var(--t3)" }}>{String(SLOT_STARTS[s]).padStart(2,"0")}–{String(SLOT_ENDS[s]%24).padStart(2,"0")}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Upcoming windows */}
          <div className="px-3.5 pt-4">
            <div className="flex items-center gap-2 mb-2.5">
              <span className="lw-section-title">{t.upcomingWindows}</span>
              <div className="lw-divider" />
            </div>
            <div className="flex flex-col gap-2">
              {windows.length === 0
                ? <div style={{ color: "var(--t4)" }} className="text-[12px] py-3">{t.noWindows}</div>
                : windows.map((w, i) => (
                  <button key={i} type="button" onClick={() => openInfo("triple-dip")}
                    className={`lw-window-card px-4 py-3 flex items-center gap-3 w-full text-left cursor-pointer${w.score >= 100 ? " perfect" : w.score >= 70 ? " good" : ""}`}>
                    <div className="flex-1">
                      <div style={{ color: "var(--t3)" }} className="text-[9px] mb-0.5">{w.dayName} · {w.slotLabel}</div>
                      <div className="font-bold text-[13px] flex items-center gap-1.5" style={{ color: "var(--t1)" }}>
                        {w.vsDay ? (<><GameIcon src={w.vsDay.icon} alt={w.vsDay.name} size={20}/>{w.vsDay.name}</>) : (<><GameIcon src={ICONS.dronePart} alt="AR" size={20}/>AR Only</>)}
                      </div>
                      <div className="text-[11px] mt-0.5 flex items-center gap-1.5" style={{ color: "var(--t2)" }}><GameIcon src={w.arPhase.icon} alt={w.arPhase.name} size={16}/> {w.arPhase.name}</div>
                      <div className="flex gap-1.5 flex-wrap mt-1.5">
                        {(w.vsDay ? w.vsDay.res.slice(0,3) : ["Drone Data","Stamina"]).map(r => (
                          <span key={r} style={w.score >= 100 ? { background: "var(--goldglow)", border: "1px solid var(--gold)", color: "var(--gold2)" } : { background: "var(--bg4)", border: "1px solid var(--border)", color: "var(--t3)" }} className="text-[9px] px-2 py-0.5 rounded-full">{r}</span>
                        ))}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div style={{ color: w.score >= 100 ? "var(--gold3)" : "var(--gold2)" }} className="font-bold text-[15px] tabular-nums">~{formatDuration(w.secsUntil/60)}</div>
                      <div className="mt-1">{olBadge(w.score, t)}</div>
                    </div>
                  </button>
                ))}
            </div>
          </div>

          {/* Overlap matrix */}
          <div className="px-3.5 pt-4 pb-2">
            <div className="flex items-center gap-2 mb-2.5">
              <span className="lw-section-title">{t.overlapMatrix}</span>
              <div className="lw-divider" />
            </div>
            <div className="lw-panel overflow-hidden overflow-x-auto">
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    {[t.matrixDay, t.matrixTheme, "06–10", "14–18", "22–02", t.matrixOverlap, t.matrixBest].map(h => (
                      <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontSize: 8, letterSpacing: "1.5px", color: "var(--t4)", textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[{wd:1},{wd:2},{wd:3},{wd:4},{wd:5},{wd:6},{wd:0}].map(({ wd }) => {
                    const vsD = wd === 0 ? null : VS_DAYS.find(v => v.wd === wd) ?? null;
                    const isToday = wd === st.getDay();
                    const s1p = AR_PHASES[AR_SCHEDULE[wd][1]];
                    const s3p = AR_PHASES[AR_SCHEDULE[wd][3]];
                    const s5p = AR_PHASES[AR_SCHEDULE[wd][5]];
                    const best = Math.max(overlapScore(vsD, s1p), overlapScore(vsD, s3p), overlapScore(vsD, s5p));
                    return (
                      <tr key={wd} style={{ background: isToday ? "rgba(212,144,10,0.04)" : "transparent", borderBottom: "1px solid rgba(30,45,63,0.5)" }}>
                        <td style={{ padding: "7px 10px", fontWeight: 600, color: isToday ? "var(--gold2)" : "var(--t1)", whiteSpace: "nowrap" }}>{t.days[wd]}{isToday ? " ◀" : ""}</td>
                        <td style={{ padding: "7px 10px", color: "var(--t2)", whiteSpace: "nowrap" }}>{vsD ? <span className="inline-flex items-center gap-1"><GameIcon src={vsD.icon} alt={vsD.name} size={16}/>{vsD.name}</span> : <span style={{ color: "var(--t4)" }}>— AR Only</span>}</td>
                        {[s1p, s3p, s5p].map((ph, i) => {
                          const slotKey = AR_SCHEDULE[wd][i === 0 ? 1 : i === 1 ? 3 : 5];
                          return (
                          <td key={i} style={{ padding: "7px 10px" }}>
                            <button type="button" onClick={() => openInfo(`ar-${slotKey}`)} className={`ar-tag ${ph.cls} inline-flex items-center gap-1 cursor-pointer hover:brightness-110`}>
                              <GameIcon src={ph.icon} alt={ph.name} size={14}/>{ph.name}
                            </button>
                          </td>
                          );
                        })}
                        <td style={{ padding: "7px 10px" }}>{olBadge(best, t)}</td>
                        <td style={{ padding: "7px 10px", color: "var(--t3)", fontSize: 11 }}>{vsD ? vsD.res[0] : "Drone Data"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Footer */}
      <div className="lw-footer px-4 py-4 text-[10px] text-center tracking-wide font-medium">
        {t.footer}
      </div>
    </div>
    </div>
  );
}
