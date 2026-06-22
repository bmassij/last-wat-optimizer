"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { T, Lang } from "@/lib/i18n";
import type { VisionInventoryResult } from "@/lib/visionInventory";
import {
  loadPlayerProfile,
  mergeVisionIntoProfile,
  savePlayerProfile,
  type PlayerProfile,
} from "@/lib/playerProfile";
import {
  captureVideoFrame,
  frameFingerprint,
  requestScreenStream,
} from "@/lib/screenCapture";
import AlertDot from "./AlertDot";

const SCAN_INTERVAL_MS = 3000;
const MAX_SCANS_PER_SESSION = 25;

interface Props {
  t: T;
  lang: Lang;
  onProfileUpdate: (profile: PlayerProfile, latest: VisionInventoryResult) => void;
}

async function analyzeFrame(
  base64: string,
  mimeType: string,
  lang: Lang,
): Promise<VisionInventoryResult & { error?: string }> {
  const res = await fetch("/api/vision/inventory", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageBase64: base64, mimeType, lang }),
  });
  return res.json() as Promise<VisionInventoryResult & { error?: string }>;
}

export default function ScreenProfileScanner({ t, lang, onProfileUpdate }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scanningRef = useRef(false);
  const lastFpRef = useRef("");
  const profileRef = useRef<PlayerProfile | null>(loadPlayerProfile());
  const sessionScansRef = useRef(0);

  const [consent, setConsent] = useState(false);
  const [active, setActive] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [frameCount, setFrameCount] = useState(0);
  const [sessionAnalyzed, setSessionAnalyzed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<PlayerProfile | null>(profileRef.current);

  const stopScan = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    streamRef.current?.getTracks().forEach(tr => tr.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setActive(false);
    scanningRef.current = false;
    lastFpRef.current = "";
  }, []);

  useEffect(() => () => stopScan(), [stopScan]);

  async function tickScan() {
    if (scanningRef.current || !videoRef.current) return;
    const frame = captureVideoFrame(videoRef.current);
    if (!frame) return;

    const fp = frameFingerprint(frame.base64);
    if (fp === lastFpRef.current) return;
    lastFpRef.current = fp;

    if (sessionScansRef.current >= MAX_SCANS_PER_SESSION) {
      setError(t.advisorLiveScanLimit);
      stopScan();
      return;
    }

    scanningRef.current = true;
    setAnalyzing(true);
    setFrameCount(c => c + 1);
    sessionScansRef.current += 1;
    setSessionAnalyzed(sessionScansRef.current);

    try {
      const data = await analyzeFrame(frame.base64, frame.mimeType, lang);
      if (data.error) {
        setError(data.error.includes("OPENROUTER") ? t.advisorVisionNoKey : t.advisorVisionError);
        return;
      }

      const merged = mergeVisionIntoProfile(profileRef.current, data);
      profileRef.current = merged;
      savePlayerProfile(merged);
      setProfile(merged);
      setError(null);
      onProfileUpdate(merged, data);
    } catch {
      setError(t.advisorVisionError);
    } finally {
      scanningRef.current = false;
      setAnalyzing(false);
    }
  }

  async function startScan() {
    setError(null);
    setFrameCount(0);
    sessionScansRef.current = 0;
    setSessionAnalyzed(0);

    try {
      const stream = await requestScreenStream();
      streamRef.current = stream;
      stream.getVideoTracks()[0]?.addEventListener("ended", () => stopScan());

      const video = videoRef.current;
      if (!video) {
        stopScan();
        return;
      }
      video.srcObject = stream;
      await video.play();

      setActive(true);
      intervalRef.current = setInterval(() => {
        void tickScan();
      }, SCAN_INTERVAL_MS);
      void tickScan();
    } catch (e) {
      const name = e instanceof Error ? e.name : "";
      if (name === "NotAllowedError") setError(t.advisorLiveScanDenied);
      else if (e instanceof Error && e.message === "unsupported") setError(t.advisorLiveScanUnsupported);
      else setError(t.advisorLiveScanDenied);
      stopScan();
    }
  }

  return (
    <div className="lw-panel p-4 mb-4 mt-3 border-2" style={{ borderColor: "rgba(255,160,32,0.45)" }}>
      <div className="flex items-center gap-2 mb-1">
        {active && <AlertDot size="sm" />}
        <div className="lw-gold-text text-[16px]">{t.advisorLiveScanTitle}</div>
      </div>
      <p className="text-[13px] font-medium mb-3 lw-readable-text">{t.advisorLiveScanDesc}</p>

      {!consent ? (
        <div className="lw-sub-panel p-3 mb-3">
          <p className="text-[13px] lw-readable-text leading-relaxed mb-3">{t.advisorLiveScanConsent}</p>
          <button
            type="button"
            onClick={() => setConsent(true)}
            className="lw-btn-gold py-2.5 px-4 text-[12px]"
          >
            {t.advisorLiveScanAllow}
          </button>
        </div>
      ) : (
        <>
          {!active ? (
            <button
              type="button"
              onClick={() => void startScan()}
              className="lw-btn-gold py-2.5 px-4 text-[12px]"
            >
              {t.advisorLiveScanStart}
            </button>
          ) : (
            <div className="flex flex-wrap gap-2 items-center mb-3">
              <button type="button" onClick={stopScan} className="lw-btn-secondary py-2 px-4 text-[12px]">
                {t.advisorLiveScanStop}
              </button>
              <span className="text-[12px] lw-readable-text flex items-center gap-1.5">
                <AlertDot size="sm" />
                {analyzing ? t.advisorVisionScanning : t.advisorLiveScanActive}
              </span>
            </div>
          )}

          <p className="text-[11px] mb-2 lw-readable-text-dim">{t.advisorLiveScanHint}</p>

          {active && (
            <div className="relative rounded-lg overflow-hidden border-2 mb-2" style={{ borderColor: "var(--gold2)" }}>
              <video
                ref={videoRef}
                muted
                playsInline
                className="w-full max-h-40 object-contain bg-black"
              />
              <div className="absolute top-2 left-2 lw-do-now-badge text-[8px]">
                {t.advisorLiveScanRecording}
              </div>
            </div>
          )}

          {(active || sessionAnalyzed > 0) && (
            <p className="text-[11px] lw-readable-text-dim">
              {t.advisorLiveScanFrames}: {frameCount} · {t.advisorLiveScanAnalyzed}: {sessionAnalyzed}
            </p>
          )}
        </>
      )}

      {profile && (
        <div className="mt-3 pt-3 border-t border-white/10">
          <p className="text-[12px] lw-readable-text flex items-center gap-2">
            <AlertDot size="sm" />
            <strong>{t.profileActive}</strong>
            — {profile.inventory.length} items · HQ {profile.hqLevel}
          </p>
          {profile.summaries[profile.summaries.length - 1] && (
            <p className="text-[11px] mt-1 lw-readable-text-dim">{profile.summaries[profile.summaries.length - 1]}</p>
          )}
        </div>
      )}

      {error && (
        <p className="text-[11px] mt-2 font-medium" style={{ color: "var(--red2)" }}>{error}</p>
      )}
    </div>
  );
}
