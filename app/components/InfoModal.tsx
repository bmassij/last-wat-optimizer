"use client";

import type { T } from "@/lib/i18n";

interface Props {
  t: T;
  title: string;
  body: string;
  sources?: string[];
  onClose: () => void;
}

export default function InfoModal({ t, title, body, sources, onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-3 sm:p-6"
      style={{ background: "rgba(0,0,10,0.75)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="info-modal-title"
    >
      <div
        className="lw-panel w-full max-w-md max-h-[85vh] overflow-y-auto p-5 relative"
        onClick={e => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 lw-btn-secondary w-8 h-8 flex items-center justify-center text-sm font-bold"
          aria-label={t.modalClose}
        >
          ✕
        </button>
        <h2 id="info-modal-title" className="lw-game-title text-[18px] text-white pr-10 mb-3">
          {title}
        </h2>
        <div className="text-[13px] leading-relaxed whitespace-pre-line font-medium" style={{ color: "var(--t1)" }}>
          {body}
        </div>
        {sources && sources.length > 0 && (
          <div className="mt-4 pt-3 border-t border-white/10">
            <div className="lw-label mb-1">{t.modalSources}</div>
            <div className="flex flex-wrap gap-1.5">
              {sources.map(s => (
                <span key={s} className="lw-res-pill dim text-[9px]">{s}</span>
              ))}
            </div>
          </div>
        )}
        <button type="button" onClick={onClose} className="lw-btn-gold w-full mt-4 py-2.5 text-[12px]">
          {t.modalClose}
        </button>
      </div>
    </div>
  );
}
