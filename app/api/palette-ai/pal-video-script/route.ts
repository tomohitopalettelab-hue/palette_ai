import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

const TEMPLATE_MAP: Record<string, string> = {
  instagram_feed: 'a02095a2-9469-4f52-9bcd-66fc884453a1',
  promotion: '516cafa1-15cc-44e3-8a39-af5a07862bc0',
  youtube: '979f7579-5567-4d7b-a615-777d825d9f9d',
};

const parseTemplateCandidates = (payload: any) => {
  const explicit = Array.isArray(payload?.templateCandidates) ? payload.templateCandidates : [];
  if (explicit.length > 0) return explicit.map((item: string) => String(item).trim()).filter(Boolean);
  const purpose = String(payload?.purpose || '').trim();
  const mapped = TEMPLATE_MAP[purpose];
  const raw = String(
    mapped ||
    process.env.CREATOMATE_TEMPLATE_IDS ||
    process.env.CREATOMATE_TEMPLATE_ID ||
    'pal_video_fixed_v1',
  );
  return raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

const buildPrompt = (payload: any, hearingMessages: any[]) => {
  const templateCandidates = parseTemplateCandidates(payload);
  const summary = {
    purpose: payload?.purpose || "instagram_reel",
    durationSec: payload?.durationSec || 30,
    telopMain: payload?.telopMain || "",
    telopSub: payload?.telopSub || "",
    colorPrimary: payload?.colorPrimary || "",
    colorAccent: payload?.colorAccent || "",
    cuts: Array.isArray(payload?.cuts) ? payload.cuts : [],
    hearingAnswers: Array.isArray(payload?.hearingAnswers) ? payload.hearingAnswers : [],
    templateCandidates,
  };

  const system = `You are a creative director for short-form promo videos.
Output JSON only. Do not include code fences or extra text.
Use this schema:
{
  "templateId": "pal_video_fixed_v1",
  "templateMode": "dynamic",
  "scenes": [
    {
      "durationSec": 4,
      "imageUrl": "https://...",
      "title": "...",
      "subtitle": "...",
      "templateId": "pal_video_fixed_v1",
      "textAnimation": "none",
      "textTransition": "none"
    }
  ],
  "style": { "primaryColor": "#E95464", "accentColor": "#1c9a8b", "font": "NotoSansJP" },
  "audio": { "bgm": "light" },
  "dynamicTemplateCandidates": []
}`;

  const user = `
Hearing summary:
${JSON.stringify(summary, null, 2)}

Conversation:
${JSON.stringify(hearingMessages || [], null, 2)}

Rules:
- templateId is the default template. Use per-scene templateId when templateCandidates are available.
- Prefer 1 cut per 4 seconds (sceneCount = ceil(durationSec / 4)).
- Each scene durationSec should be 4, except the last scene which can be shorter if needed.
- Use short, punchy Japanese text.
- If cuts are provided, align scenes to cuts.
- Choose a templateId for each scene from templateCandidates when available.
- If imageUrl is missing, leave it empty.
- Keep textAnimation and textTransition as "none".
- Set dynamicTemplateCandidates to templateCandidates when provided.
- Keep JSON valid.
`;

  return { system, user };
};

const safeJsonParse = (raw: string) => {
  try {
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
};

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ success: false, error: "API key missing" }, { status: 500 });
    }

    const body = await req.json();
    const payload = body?.payload || {};
    const hearingMessages = body?.hearingMessages || [];
    const { system, user } = buildPrompt(payload, hearingMessages);

    const ai = new GoogleGenAI({ apiKey });
    const modelList = (process.env.GENERATE_MODEL_LIST || process.env.GENERATE_MODEL || "gemini-2.5-flash")
      .split(",")
      .map((m) => m.trim())
      .filter(Boolean);

    let response: any = null;
    for (const mdl of modelList) {
      try {
        response = await ai.models.generateContent({
          model: mdl,
          config: { systemInstruction: system },
          contents: [{ role: "user", parts: [{ text: user }] }],
        });
        if (response) break;
      } catch (error) {
        console.warn("pal-video-script generate failed", mdl, error);
      }
    }

    const text = typeof response?.text === "function" ? response.text() : response?.text;
    const plan = safeJsonParse(String(text || "").trim());
    if (!plan) {
      return NextResponse.json({ success: false, error: "invalid json" }, { status: 422 });
    }

    return NextResponse.json({ success: true, plan });
  } catch (error) {
    console.error("pal-video-script error", error);
    return NextResponse.json({ success: false, error: "internal error" }, { status: 500 });
  }
}
