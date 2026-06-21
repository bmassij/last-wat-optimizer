"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  getServerTime, getSlot, secsUntilSlotEnd, formatCountdown, formatDuration,
  getVsDay, isSunday, getArPhase, getNextArPhase, getArPhaseAt,
  overlapScore, overlapLevel, buildRecommendations,
  getUpcomingWindows,
  type Recommendation, type OverlapWindow,
} from "@/lib/engines";
import { VS_DAYS, AR_PHASES, AR_SCHEDULE, SLOT_STARTS, SLOT_ENDS } from "@/lib/gameData";

// ── Types ────────────────────────────────────────────────────

interface Settings {
  offset: number;
  arOverride: string;
  notif: boolean;
  _setup?: boolean;
}

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem("orc_settings");
    if (raw) return JSON.parse(raw) as Settings;
  } catch {}
  return { offset: 0, arOverride: "", notif: false };
}

function saveSettings(s: Settings) {
  try { localStorage.setItem("orc_settings", JSON.stringify({ ...s, _setup: true })); } catch {}
}

// ── Helpers ──────────────────────────────────────────────────

const DAY_LABELS = ["ZO", "MA", "DI", "WO", "DO", "VR", "ZA"];
const DAY_FULL   = ["Zondag", "Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag", "Zaterdag"];

function olBadge(score: number) {
  const lv = overlapLevel(score);
  const cls =
    lv === "PERFECT" ? "ol-perfect" :
    lv === "GOED"    ? "ol-good" :
                       "ol-low";
  return <span className={`lw-display text-[9px] px-2 py-0.5 rounded-full ${cls}`}>{lv}</span>;
}

// ── Main Component ───────────────────────────────────────────

export default function OrcDashboard() {
  const [settings,    setSettings]    = useState<Settings>({ offset: 0, arOverride: "", notif: false });
  const [showSetup,   setShowSetup]   = useState(false);
  const [serverInput, setServerInput] = useState("");
  const [now,         setNow]         = useState(new Date());
  const [notifStatus, setNotifStatus] = useState("uit");
  const lastSlotRef = useRef(-1);
  const lastDayRef  = useRef(-1);
  const [, forceRender] = useState(0);

  // Load settings on mount
  useEffect(() => {
    const s = loadSettings();
    setSettings(s);
    if (!s._setup) setShowSetup(true);
    if (s.notif && typeof Notification !== "undefined" && Notification.permission === "granted") {
      setNotifStatus("aan");
    }
  }, []);

  // Clock tick
  useEffect(() => {
    const id = setInterval(() => {
      const n = new Date();
      setNow(n);
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

  const st      = getServerTime(settings.offset);
  const vsDay   = getVsDay(st);
  const arPhase = getArPhase(st, settings.arOverride);
  const nextAr  = getNextArPhase(st);
  const sun     = isSunday(st);
  const slot    = getSlot(st);
  const secs    = secsUntilSlotEnd(st);
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

  // ── Calibration ─────────────────────────────────────────────
  function calibrate() {
    const match = serverInput.trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!match) { alert("Vul een geldige tijd in, bijv. 14:30"); return; }
    const sH = parseInt(match[1]);
    const sM = parseInt(match[2]);
    const lH = now.getHours();
    const lM = now.getMinutes();
    let diff = sH - lH;
    if (Math.abs(sM - lM) > 15) diff += sM > lM ? 1 : -1;
    if (diff > 12) diff -= 24;
    if (diff < -12) diff += 24;
    const ns = { ...settings, offset: diff, _setup: true };
    setSettings(ns); saveSettings(ns); setShowSetup(false);
  }

  function updateSetting(key: keyof Settings, value: string | number | boolean) {
    const ns = { ...settings, [key]: value, _setup: true };
    setSettings(ns); saveSettings(ns);
  }

  // ── Notifications ────────────────────────────────────────────
  async function toggleNotif() {
    if (!("Notification" in window)) { alert("Browser ondersteunt geen meldingen."); return; }
    if (settings.notif) {
      updateSetting("notif", false); setNotifStatus("uit"); return;
    }
    const perm = await Notification.requestPermission();
    if (perm === "granted") {
      updateSetting("notif", true); setNotifStatus("aan");
      new Notification("ORC Meldingen aan ✓", { body: "Je krijgt een melding als een perfect overlap venster begint." });
    } else {
      alert("Meldingen geweigerd — sta ze toe in je browser instellingen.");
    }
  }

  // ── Render ───────────────────────────────────────────────────

  return (
    <div style={{ background: "var(--bg0)", minHeight: "100vh" }}>

      {/* ── TOPBAR ── */}
      <div className="lw-topbar sticky top-0 z-50 flex items-center gap-3 px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <div className="lw-logo-mark w-9 h-9 flex items-center justify-center text-lg flex-shrink-0">⚔️</div>
          <div>
            <div className="lw-gold-text text-[22px] leading-none">ORC</div>
            <div className="lw-label text-[8px] mt-0.5">Optimization Resource Commander</div>
          </div>
        </div>
        <span className={`text-[11px] px-3 py-1 rounded-full ${sun ? "lw-pill-ar" : "lw-pill-vs"}`}>
          {sun ? "AR ONLY" : "VS ACTIEF"}
        </span>
        <div className="ml-auto text-right">
          <span style={{ color: "var(--gold2)" }} className="lw-display text-[20px] tabular-nums block leading-none">
            {now.toLocaleTimeString("en-GB")}
          </span>
          <span style={{ color: "var(--t3)" }} className="text-[9px]">
            {now.toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "short" })}
          </span>
        </div>
      </div>

      {/* ── SETUP BANNER ── */}
      {showSetup && (
        <div style={{ background: "linear-gradient(135deg, var(--bg2), var(--bg3))", borderBottom: "2px solid var(--gold)" }}
          className="px-4 py-4">
          <div className="lw-gold-text text-[15px] mb-1">⚙️ Eenmalige instelling — kalibreer jouw server</div>
          <div style={{ color: "var(--t2)" }} className="text-[12px] mb-3">
            Vul de servertijd in die jouw spel nu toont. ORC berekent de timezone offset automatisch.
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span style={{ color: "var(--t3)" }} className="text-[11px]">Server time nu (HH:MM):</span>
            <input
              value={serverInput} onChange={e => setServerInput(e.target.value)}
              placeholder="bv. 14:30" maxLength={5}
              className="lw-input px-2 py-1.5 text-[13px] w-20"
            />
            <button onClick={calibrate} className="lw-btn-gold px-4 py-1.5 text-[12px]">
              Kalibreer ✓
            </button>
            <button onClick={() => { updateSetting("_setup" as keyof Settings, true); setShowSetup(false); }}
              className="lw-btn-secondary px-3 py-1.5 text-[11px]">
              Sla over — reset = 4:00 AM lokaal
            </button>
          </div>
        </div>
      )}

      {/* ── CONFIG BAR ── */}
      <div style={{ background: "var(--bg2)", borderBottom: "1px solid var(--border-gold)", color: "var(--t3)" }}
        className="px-4 py-2 flex items-center gap-3 flex-wrap text-[10px]">
        <span style={{ color: "var(--t3)" }}>⚙️</span>
        <label style={{ color: "var(--t3)" }}>Server UTC:
          <select value={settings.offset}
            onChange={e => updateSetting("offset", parseInt(e.target.value))}
            className="lw-select ml-1.5 px-2 py-1 text-[11px] cursor-pointer">
            {Array.from({ length: 25 }, (_, i) => i - 12).map(o => (
              <option key={o} value={o}>UTC{o >= 0 ? "+" : ""}{o}</option>
            ))}
          </select>
        </label>
        <label style={{ color: "var(--t3)" }}>AR override:
          <select value={settings.arOverride}
            onChange={e => updateSetting("arOverride", e.target.value)}
            className="lw-select ml-1.5 px-2 py-1 text-[11px] cursor-pointer">
            <option value="">Auto (schema)</option>
            <option value="CITY">🏗️ City Building</option>
            <option value="UNIT">⚔️ Unit Progression</option>
            <option value="TECH">🔬 Tech Research</option>
            <option value="DRONE">🚁 Drone Boost</option>
            <option value="HERO">🦸 Hero Advancement</option>
          </select>
        </label>
        <button onClick={toggleNotif}
          style={settings.notif
            ? { background: "var(--greenglow)", border: "1px solid var(--green2)", color: "var(--green2)" }
            : { background: "var(--bg4)", border: "1px solid var(--border2)", color: "var(--t2)" }}
          className="px-2.5 py-1 rounded text-[11px] cursor-pointer flex items-center gap-1">
          🔔 Meldingen {notifStatus}
        </button>
        <span className="ml-auto" style={{ color: "var(--t4)" }}>
          Reset lokaal: <strong style={{ color: "var(--gold2)" }}>{String(resetLocal).padStart(2, "0")}:00</strong>
        </span>
      </div>

      {/* ── ALERT ── */}
      {!hasGoodNow && windows.length > 0 && !sun && (
        <div style={{ background: "rgba(160,24,24,0.12)", border: "1px solid rgba(224,48,48,0.35)", borderLeft: "3px solid var(--red2)" }}
          className="mx-3.5 mt-3 px-4 py-2.5 rounded-lg flex items-center gap-3">
          <span className="text-base">⚠️</span>
          <div style={{ color: "var(--t2)" }} className="flex-1 text-[12px]">
            <strong style={{ color: "var(--red2)" }}>Sub-optimaal moment.</strong>{" "}
            {windows[0].vsDay?.name ?? "AR fase"} + {windows[0].arPhase.name} overlap over ~{formatDuration(windows[0].secsUntil / 60)} — wacht voor betere badges.
          </div>
          <div style={{ color: "var(--green2)" }} className="text-[11px] whitespace-nowrap">
            +{windows[0].score - sc}% in {formatDuration(windows[0].secsUntil / 60)}
          </div>
        </div>
      )}

      {/* ── HERO CARD ── */}
      <div className="px-3.5 pt-3">
        <div className="lw-panel overflow-hidden">

          {/* Header */}
          <div className="lw-panel-header px-4 py-2.5 flex items-center gap-2">
            <span className="lw-section-title text-[10px]">
              {sun ? "ZONDAG — ARMS RACE ONLY MODE" : sc >= 100 ? "🎯 PERFECT OVERLAP ACTIEF" : sc >= 70 ? "✅ GOED VENSTER ACTIEF" : "COMMAND STATUS"}
            </span>
            <span className="ml-auto text-[10px]" style={{ color: "var(--t3)" }}>
              {vsDay ? `${vsDay.emoji} ${vsDay.name} × ${arPhase.emoji} ${arPhase.name}` : `${arPhase?.emoji} ${arPhase?.name} (geen VS)`}
            </span>
          </div>

          <div className="p-4">
            {/* DOE DIT NU */}
            <div className={`lw-command-box p-4 mb-3 ${sc >= 80 ? "perfect" : sc >= 50 ? "good" : "low"}`}>
              <div className="absolute top-2 right-3 lw-display text-[9px]" style={{ color: "var(--green2)", opacity: 0.85 }}>▶ Doe dit nu</div>
              {spendRecs[0] ? (
                <>
                  <div className="font-semibold text-[13px] mb-1" style={{ color: "var(--t1)" }}>{spendRecs[0].tip || spendRecs[0].reason}</div>
                  <div className="text-[11px] mb-3" style={{ color: "var(--t2)" }}>{spendRecs[0].reason}</div>
                  <div className="flex flex-wrap gap-2">
                    {spendRecs.map(r => (
                      <div key={r.name}
                        style={r.score >= 90
                          ? { background: "var(--greenglow)", border: "1px solid var(--green2)", color: "var(--green2)" }
                          : { background: "var(--bg4)", border: "1px solid var(--border2)", color: "var(--t1)" }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold">
                        {r.emoji} {r.name}
                        <span className="text-[9px] font-bold" style={{ color: "var(--green2)" }}>
                          {r.score >= 90 ? "+MAX" : `${r.score}%`}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div style={{ color: "var(--t4)" }} className="text-[12px]">Geen optimale resources op dit moment.</div>
              )}
              {/* Efficiency bar */}
              <div className="mt-3">
                <div className="flex justify-between text-[10px] mb-1" style={{ color: "var(--t3)" }}>
                  <span>Efficiëntie nu</span>
                  <span>{sc}%</span>
                </div>
                <div style={{ background: "var(--bg4)" }} className="h-1.5 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-700 ${sc >= 80 ? "lw-shimmer-bar" : ""}`}
                    style={{
                      width: `${sc}%`,
                      background: sc >= 80 ? undefined
                                : sc >= 50 ? "linear-gradient(90deg, var(--gold), var(--gold2))"
                                : "linear-gradient(90deg, var(--red), var(--red2))",
                    }} />
                </div>
              </div>
            </div>

            {/* SAVE / DELAY / AVOID */}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {[
                { key: "save" as const,  icon: "🔒", label: "BEWAAR",  items: saveRecs,  color: "var(--blue2)" },
                { key: "delay" as const, icon: "⏳", label: "WACHT",   items: delayRecs, color: "var(--gold2)" },
                { key: "avoid" as const, icon: "🚫", label: "VERMIJD", items: avoidRecs, color: "var(--red2)"  },
              ].map(({ icon, label, items, color }) => items.length > 0 && (
                <div key={label} style={{ background: "var(--bg3)", border: "1px solid var(--border)" }} className="rounded-lg p-3">
                  <div className="text-[9px] font-bold tracking-widest mb-2" style={{ color }}>{icon} {label}</div>
                  {items.map(r => (
                    <div key={r.name} style={{ borderBottom: "1px solid var(--border)" }} className="py-1.5 last:border-0">
                      <div className="text-[11px]" style={{ color: "var(--t2)" }}>{r.emoji} {r.name}</div>
                      <div className="text-[9px] mt-0.5" style={{ color: "var(--t4)" }}>{r.tip || r.reason}</div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── STATUS STRIP ── */}
      <div className="grid grid-cols-2 gap-2 px-3.5 pt-3 sm:grid-cols-4">
        {[
          { label: "VS Dag",        val: sun ? "ZONDAG" : `Dag ${vsDay?.day ?? "—"}`, sub: sun ? "AR Only" : vsDay?.name ?? "—", color: "var(--gold2)",   accent: "var(--gold2)" },
          { label: "AR Fase nu",    val: `${arPhase?.emoji} ${arPhase?.name}`,         sub: `Slot ${slot+1}/6`,                 color: "var(--blue2)",   accent: "var(--blue2)" },
          { label: "Fase eindigt",  val: formatCountdown(secs),                         sub: "",                                 color: "var(--green2)",  accent: "var(--green2)", progress: true },
          { label: "Volgend venster", val: windows[0] ? (windows[0].vsDay?.short ?? "AR") : "—", sub: windows[0] ? `~${formatDuration(windows[0].secsUntil/60)}` : "—", color: "var(--purple2)", accent: "var(--purple2)" },
        ].map(({ label, val, sub, color, accent, progress }) => (
          <div key={label} style={{ "--accent": accent } as React.CSSProperties} className="lw-stat-card p-3">
            <div className="lw-label mb-1">{label}</div>
            <div style={{ color }} className="lw-display text-[18px] tabular-nums leading-none">{val}</div>
            {sub && <div style={{ color: "var(--t3)" }} className="text-[10px] mt-0.5">{sub}</div>}
            {progress && (
              <div style={{ background: "var(--bg4)" }} className="mt-1.5 h-1 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-1000"
                  style={{ width: `${progress}%`, background: "var(--blue2)" }} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── VS WEEK ── */}
      <div className="px-3.5 pt-4">
        <div className="flex items-center gap-2 mb-2.5">
          <span className="lw-section-title">Alliance Duel VS — Week</span>
          <div className="lw-divider" />
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {[{wd:1,l:"MA",vs:VS_DAYS[0]},{wd:2,l:"DI",vs:VS_DAYS[1]},{wd:3,l:"WO",vs:VS_DAYS[2]},
            {wd:4,l:"DO",vs:VS_DAYS[3]},{wd:5,l:"VR",vs:VS_DAYS[4]},{wd:6,l:"ZA",vs:VS_DAYS[5]},
            {wd:0,l:"ZO",vs:null}].map(({ wd, l, vs }) => {
            const isActive = wd === st.getDay();
            const isPast   = st.getDay() > 0 && wd > 0 && wd < st.getDay();
            const isSun    = wd === 0;
            return (
              <div key={wd} style={{
                background: isActive ? "var(--bg3)" : "var(--bg2)",
                border: `1px solid ${isActive ? "var(--gold)" : isSun ? "var(--blue)" : "var(--border)"}`,
                boxShadow: isActive ? "0 0 12px var(--goldglow)" : "none",
                opacity: isPast ? 0.35 : isSun ? 0.5 : 1,
              }} className="rounded-md px-1 py-2 text-center relative">
                {isActive && <div className="blink absolute top-1 right-1 w-1.5 h-1.5 rounded-full" style={{ background: "var(--gold2)", boxShadow: "0 0 5px var(--gold2)" }} />}
                <div style={{ color: "var(--t3)" }} className="text-[8px] tracking-wide">{l}</div>
                <div className="text-sm leading-none my-1">{vs ? vs.emoji : "😴"}</div>
                <div style={{ color: isActive ? "var(--gold2)" : "var(--t2)" }} className="text-[8px] font-bold">{vs ? vs.short : "AR"}</div>
                <div style={{ color: "var(--t4)" }} className="text-[8px]">{vs ? `${vs.pts}pt` : "—"}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── AR TIMELINE ── */}
      <div className="px-3.5 pt-4">
        <div className="flex items-center gap-2 mb-2.5">
          <span className="lw-section-title">Arms Race — Vandaag</span>
          <div className="lw-divider" />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {AR_SCHEDULE[st.getDay()].map((key, s) => {
            const phase = AR_PHASES[key];
            const isCur = s === slot;
            const isOvl = overlapScore(vsDay, phase) >= 100 && !isCur;
            const startH = SLOT_STARTS[s];
            const endH   = SLOT_ENDS[s] % 24;
            return (
              <div key={s} style={{
                background: "var(--bg2)",
                border: `1px solid ${isCur ? "var(--blue2)" : isOvl ? "var(--gold)" : "var(--border)"}`,
                boxShadow: isCur ? "0 0 12px var(--blueglow)" : isOvl ? "0 0 12px var(--goldglow)" : "none",
                minWidth: 70, flex: 1,
              }} className="rounded-md px-2 py-2 text-center relative">
                {isCur && <div className="absolute -top-2 left-1/2 -translate-x-1/2 text-[7px] font-bold tracking-wide whitespace-nowrap px-1" style={{ color: "var(--blue2)", background: "var(--bg0)" }}>NU</div>}
                {isOvl && <div className="absolute -top-2 left-1/2 -translate-x-1/2 text-[7px] font-bold tracking-wide whitespace-nowrap px-1" style={{ color: "var(--gold2)", background: "var(--bg0)" }}>OVERLAP</div>}
                <div className="text-base leading-none mb-1">{phase.emoji}</div>
                <div className="text-[8px] font-semibold" style={{ color: isCur ? "var(--blue2)" : isOvl ? "var(--gold2)" : "var(--t2)" }}>{phase.name}</div>
                <div className="text-[8px] mt-0.5" style={{ color: "var(--t4)" }}>{String(startH).padStart(2,"0")}–{String(endH).padStart(2,"0")}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── UPCOMING WINDOWS ── */}
      <div className="px-3.5 pt-4">
        <div className="flex items-center gap-2 mb-2.5">
          <span className="lw-section-title">Komende optimale vensters — 72u</span>
          <div className="lw-divider" />
        </div>
        <div className="flex flex-col gap-2">
          {windows.length === 0 ? (
            <div style={{ color: "var(--t4)" }} className="text-[12px] py-3">Geen hoge-waarde vensters in de komende 72u.</div>
          ) : windows.map((w, i) => (
            <div key={i} style={{
              background: w.score >= 100 ? "var(--bg3)" : "var(--bg2)",
              border: `1px solid ${w.score >= 100 ? "var(--gold)" : w.score >= 70 ? "var(--green)" : "var(--border)"}`,
            }} className="rounded-xl px-4 py-3 flex items-center gap-3">
              <div className="flex-1">
                <div style={{ color: "var(--t3)" }} className="text-[9px] tracking-wide mb-0.5">{w.dayName} · {w.slotLabel}</div>
                <div className="font-bold text-[13px]" style={{ color: "var(--t1)" }}>{w.vsDay ? `${w.vsDay.emoji} ${w.vsDay.name}` : "🚁 Arms Race Only"}</div>
                <div className="text-[11px] mt-0.5" style={{ color: "var(--t2)" }}>{w.arPhase.emoji} {w.arPhase.name}</div>
                <div className="flex gap-1.5 flex-wrap mt-1.5">
                  {(w.vsDay ? w.vsDay.res.slice(0, 3) : ["Drone Data", "Stamina"]).map(r => (
                    <span key={r} style={w.score >= 100
                      ? { background: "var(--goldglow)", border: "1px solid var(--gold)", color: "var(--gold2)" }
                      : { background: "var(--bg4)", border: "1px solid var(--border)", color: "var(--t3)" }}
                      className="text-[9px] px-2 py-0.5 rounded-full">{r}</span>
                  ))}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div style={{ color: w.score >= 100 ? "var(--gold3)" : "var(--gold2)" }} className="font-bold text-[15px] tabular-nums">
                  ~{formatDuration(w.secsUntil / 60)}
                </div>
                <div className="mt-1">{olBadge(w.score)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── OVERLAP TABLE ── */}
      <div className="px-3.5 pt-4 pb-6">
        <div className="flex items-center gap-2 mb-2.5">
          <span className="lw-section-title">VS × AR Overlap Matrix</span>
          <div className="lw-divider" />
        </div>
        <div className="lw-panel overflow-hidden overflow-x-auto">
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Dag", "VS Thema", "06–10", "14–18", "22–02", "Overlap", "Beste resource"].map(h => (
                  <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontSize: 8, letterSpacing: "1.5px", color: "var(--t4)", textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[{wd:1,l:"Maandag"},{wd:2,l:"Dinsdag"},{wd:3,l:"Woensdag"},{wd:4,l:"Donderdag"},{wd:5,l:"Vrijdag"},{wd:6,l:"Zaterdag"},{wd:0,l:"Zondag"}].map(({ wd, l }) => {
                const vsD = wd === 0 ? null : VS_DAYS.find(v => v.wd === wd) ?? null;
                const isToday = wd === st.getDay();
                const s1 = getArPhaseAt(wd, 1);
                const s3 = getArPhaseAt(wd, 3);
                const s5 = getArPhaseAt(wd, 5);
                const best = Math.max(overlapScore(vsD, s1), overlapScore(vsD, s3), overlapScore(vsD, s5));
                return (
                  <tr key={wd} style={{ background: isToday ? "rgba(212,144,10,0.04)" : "transparent", borderBottom: "1px solid rgba(30,45,63,0.5)" }}>
                    <td style={{ padding: "7px 10px", fontWeight: 600, color: isToday ? "var(--gold2)" : "var(--t1)", whiteSpace: "nowrap" }}>{l}{isToday ? " ◀" : ""}</td>
                    <td style={{ padding: "7px 10px", color: "var(--t2)", fontSize: 11, whiteSpace: "nowrap" }}>{vsD ? `${vsD.emoji} ${vsD.name}` : <span style={{ color: "var(--t4)" }}>— AR Only</span>}</td>
                    {[s1, s3, s5].map((ph, i) => (
                      <td key={i} style={{ padding: "7px 10px" }}><span className={`ar-tag ${ph.cls}`}>{ph.emoji} {ph.name}</span></td>
                    ))}
                    <td style={{ padding: "7px 10px" }}>{olBadge(best)}</td>
                    <td style={{ padding: "7px 10px", color: "var(--t3)", fontSize: 11 }}>{vsD ? vsD.res[0] : "Drone Data"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* FOOTER */}
      <div style={{ borderTop: "1px solid var(--border)", color: "var(--t4)" }} className="px-4 py-4 text-[9px] text-center tracking-wide">
        ORC v2.0 · Last War: Survival · Data: lastwartutorial.com, csmit195.com · Niet gelieerd aan Last War ontwikkelaars
      </div>
    </div>
  );
}
