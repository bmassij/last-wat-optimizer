"use client";

import { useEffect, useState } from "react";
import type { T } from "@/lib/i18n";
import type { DiscordFeedMessage } from "@/lib/discordFeed";

interface Props {
  t: T;
}

export default function DiscordFeed({ t }: Props) {
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(false);
  const [messages, setMessages] = useState<DiscordFeedMessage[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/discord/feed");
        const data = await res.json() as {
          configured: boolean;
          messages: DiscordFeedMessage[];
          error?: string;
        };
        if (cancelled) return;
        setConfigured(data.configured);
        setMessages(data.messages ?? []);
        setError(data.error ?? null);
      } catch {
        if (!cancelled) setError(t.discordError);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [t.discordError]);

  return (
    <div className="px-3.5 pt-4 pb-2">
      <div className="flex items-center gap-2 mb-2.5">
        <span className="lw-section-title">{t.discordTitle}</span>
        <div className="lw-divider" />
      </div>

      <div className="lw-panel p-4">
        <p className="text-[13px] font-medium mb-3 lw-readable-text">{t.discordDesc}</p>

        {loading && (
          <p className="text-[12px] lw-readable-text-dim">{t.discordLoading}</p>
        )}

        {!loading && !configured && (
          <div className="lw-sub-panel p-3">
            <p className="text-[12px] lw-readable-text">{t.discordNotConfigured}</p>
          </div>
        )}

        {!loading && configured && error && messages.length === 0 && (
          <p className="text-[12px]" style={{ color: "var(--red2)" }}>{error}</p>
        )}

        {!loading && configured && messages.length === 0 && !error && (
          <p className="text-[12px] lw-readable-text-dim">{t.discordEmpty}</p>
        )}

        {messages.length > 0 && (
          <div className="flex flex-col gap-2 mt-1">
            {messages.map(m => (
              <a
                key={m.id}
                href={m.url}
                target="_blank"
                rel="noopener noreferrer"
                className="lw-window-card block px-4 py-3 hover:brightness-110 transition-all no-underline"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="lw-res-pill text-[9px]">#{m.channelName}</span>
                  <span className="text-[10px] lw-readable-text-dim">{m.author}</span>
                  <span className="text-[10px] ml-auto lw-readable-text-dim">
                    {new Date(m.timestamp).toLocaleDateString(undefined, { day: "numeric", month: "short" })}
                  </span>
                </div>
                <p className="text-[13px] lw-readable-text leading-relaxed whitespace-pre-line">{m.content}</p>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
