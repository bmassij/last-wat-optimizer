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
      style={{ background: "rgba(0,0,10,0.85)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="info-modal-title"
    >
      <div
        className="lw-modal-readable w-full max-w-md max-h-[85vh] overflow-y-auto p-5 relative"
        onClick={e => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 lw-btn-secondary w-9 h-9 flex items-center justify-center text-base font-bold"
          aria-label={t.modalClose}
        >
          ✕
        </button>
        <h2 id="info-modal-title" className="lw-modal-title pr-10 mb-4">
          {title}
        </h2>
        <div className="lw-modal-body whitespace-pre-line">
          {body}
        </div>
        {sources && sources.length > 0 && (
          <div className="mt-5 pt-4 border-t border-white/15">
            <div className="lw-label mb-2" style={{ color: "#b8cce8" }}>{t.modalSources}</div>
            <div className="flex flex-wrap gap-2">
              {sources.map(s => (
                <span key={s} className="lw-res-pill dim text-[10px]">{s}</span>
              ))}
            </div>
          </div>
        )}
        <button type="button" onClick={onClose} className="lw-btn-gold w-full mt-5 py-3 text-[13px]">
          {t.modalClose}
        </button>
      </div>
    </div>
  );
}
