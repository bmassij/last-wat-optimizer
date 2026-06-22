export interface DiscordFeedMessage {
  id: string;
  content: string;
  author: string;
  channelId: string;
  channelName: string;
  timestamp: string;
  url: string;
}

const DISCORD_API = "https://discord.com/api/v10";

function isConfigured(): boolean {
  return Boolean(
    process.env.DISCORD_BOT_TOKEN &&
    process.env.DISCORD_GUILD_ID &&
    process.env.DISCORD_CHANNEL_IDS?.trim(),
  );
}

async function discordGet<T>(path: string): Promise<T> {
  const token = process.env.DISCORD_BOT_TOKEN!;
  const res = await fetch(`${DISCORD_API}${path}`, {
    headers: { Authorization: `Bot ${token}` },
    next: { revalidate: 300 },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Discord ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

interface DiscordChannel {
  id: string;
  name: string;
  type: number;
}

interface DiscordMessage {
  id: string;
  content: string;
  timestamp: string;
  author: { username: string; bot?: boolean };
}

export function discordFeedConfigured(): boolean {
  return isConfigured();
}

/** Fetch recent messages from configured Discord channels (server-side only). */
export async function fetchDiscordFeed(limitPerChannel = 5): Promise<DiscordFeedMessage[]> {
  if (!isConfigured()) return [];

  const guildId = process.env.DISCORD_GUILD_ID!;
  const channelIds = process.env.DISCORD_CHANNEL_IDS!.split(",").map(s => s.trim()).filter(Boolean);

  let channels: DiscordChannel[] = [];
  try {
    channels = await discordGet<DiscordChannel[]>(`/guilds/${guildId}/channels`);
  } catch {
    channels = channelIds.map(id => ({ id, name: id, type: 0 }));
  }

  const nameById = new Map(channels.map(c => [c.id, c.name]));
  const messages: DiscordFeedMessage[] = [];

  for (const channelId of channelIds) {
    try {
      const batch = await discordGet<DiscordMessage[]>(
        `/channels/${channelId}/messages?limit=${limitPerChannel}`,
      );
      for (const m of batch) {
        const text = m.content.trim();
        if (!text) continue;
        messages.push({
          id: m.id,
          content: text.length > 400 ? `${text.slice(0, 397)}…` : text,
          author: m.author.username,
          channelId,
          channelName: nameById.get(channelId) ?? channelId,
          timestamp: m.timestamp,
          url: `https://discord.com/channels/${guildId}/${channelId}/${m.id}`,
        });
      }
    } catch (e) {
      console.error("Discord channel fetch failed:", channelId, e);
    }
  }

  return messages.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  ).slice(0, 20);
}
