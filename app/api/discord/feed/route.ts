import { NextResponse } from "next/server";
import { discordFeedConfigured, fetchDiscordFeed } from "@/lib/discordFeed";

export const runtime = "nodejs";
export const revalidate = 300;

export async function GET() {
  if (!discordFeedConfigured()) {
    return NextResponse.json({
      configured: false,
      messages: [],
      error: "Discord not configured. Set DISCORD_BOT_TOKEN, DISCORD_GUILD_ID and DISCORD_CHANNEL_IDS.",
    });
  }

  try {
    const messages = await fetchDiscordFeed(5);
    return NextResponse.json({ configured: true, messages });
  } catch (e) {
    console.error("Discord feed error:", e);
    const msg = e instanceof Error ? e.message : "Discord fetch failed";
    return NextResponse.json({ configured: true, messages: [], error: msg }, { status: 502 });
  }
}
