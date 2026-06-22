import { NextRequest, NextResponse } from "next/server";
import type { Lang } from "@/lib/i18n";
import { callVisionWithFallback, getVisionModelChain } from "@/lib/openrouterVision";
import {
  buildVisionSystemPrompt,
  extractJsonFromText,
  sanitizeVisionResult,
  type VisionInventoryResult,
} from "@/lib/visionInventory";

export const runtime = "nodejs";
export const maxDuration = 60;

const LANGS: Lang[] = ["nl", "en", "de", "fr", "es"];

interface RequestBody {
  imageBase64: string;
  mimeType?: string;
  lang?: Lang;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENROUTER_API_KEY not configured on server. Add it in Vercel → Settings → Environment Variables." },
      { status: 503 },
    );
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { imageBase64, mimeType = "image/png" } = body;
  const lang: Lang = LANGS.includes(body.lang as Lang) ? (body.lang as Lang) : "en";

  if (!imageBase64 || typeof imageBase64 !== "string") {
    return NextResponse.json({ error: "imageBase64 is required" }, { status: 400 });
  }

  if (imageBase64.length > 5_000_000) {
    return NextResponse.json({ error: "Image too large (max ~3.5 MB)" }, { status: 400 });
  }

  const allowed = ["image/png", "image/jpeg", "image/webp", "image/gif"];
  if (!allowed.includes(mimeType)) {
    return NextResponse.json({ error: "Unsupported image type" }, { status: 400 });
  }

  const dataUrl = `data:${mimeType};base64,${imageBase64.replace(/^data:[^;]+;base64,/, "")}`;
  const systemPrompt = buildVisionSystemPrompt(lang);
  const userText =
    lang === "nl"
      ? "Analyseer deze Last War inventory-screenshot. Wat zie je? Welke items moet de speler NU openen vs bewaren voor VS/Arms Race overlap?"
      : "Analyze this Last War inventory screenshot. What do you see? What should the player open NOW vs save for VS/Arms Race overlap?";

  const models = getVisionModelChain();

  try {
    const { content, modelUsed } = await callVisionWithFallback(
      apiKey,
      models,
      systemPrompt,
      userText,
      dataUrl,
    );

    const parsed = sanitizeVisionResult(extractJsonFromText(content));
    const result: VisionInventoryResult = {
      ...parsed,
      modelUsed,
    };

    return NextResponse.json(result);
  } catch (e) {
    console.error("Vision inventory error:", e);
    const msg = e instanceof Error ? e.message : "Vision analysis failed";
    return NextResponse.json(
      {
        error: `Vision scan mislukt. Probeer opnieuw over een minuut. (${msg.slice(0, 280)})`,
        triedModels: models,
      },
      { status: 502 },
    );
  }
}
