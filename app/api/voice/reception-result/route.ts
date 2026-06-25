import { NextResponse } from 'next/server';
import {
  createSession,
  updateSession,
  getBotConfigOrDefault,
  getReceptionContextByDid,
  type BotMessage,
} from '../../_lib/bot-store';
import { sendBotNotifications } from '../../_lib/notification-sender';

/**
 * POST /api/voice/reception-result
 * Pipecat（AI電話受付）が通話終了時に結果を送る。
 *  - 通話を bot_session として記録（会話ログに残す）
 *  - 既存の AI要約通知（メール/LINE/Webhook）を再利用してオーナーに伝言を届ける
 * サーバー間呼び出し。x-voice-service-key で認証。
 *
 * body: {
 *   to?: string,            // 着信DID（paletteId 解決用）
 *   paletteId?: string,     // 直接指定も可
 *   caller?: string,        // 発信者番号
 *   transcript?: Array<{ role: 'caller'|'ai'|'visitor'|'bot', content: string }>,
 *   lead?: Record<string, any>,  // 抽出済みの連絡先・伝言
 *   intent?: string,        // 用件種別（予約/問い合わせ/取り次ぎ/伝言 等）
 *   summary?: string,       // Pipecat側で要約済みなら任意で受け取る
 *   durationSec?: number,
 * }
 */

const authed = (req: Request): boolean => {
  const key = process.env.VOICE_SERVICE_KEY?.trim();
  if (!key) return false; // 未設定時は default-deny
  return req.headers.get('x-voice-service-key') === key;
};

export async function POST(req: Request) {
  try {
    if (!authed(req)) {
      return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 });
    }
    const body = await req.json().catch(() => ({}));

    // paletteId を解決（直接指定 or 着信DIDから）
    let paletteId = String(body.paletteId || '').trim().toUpperCase();
    if (!paletteId && body.to) {
      const ctx = await getReceptionContextByDid(String(body.to));
      if (ctx) paletteId = ctx.paletteId;
    }
    if (!paletteId || !/^[A-Z][0-9]{4}$/.test(paletteId)) {
      return NextResponse.json({ success: false, error: 'paletteId could not be resolved' }, { status: 400 });
    }

    const caller = String(body.caller || '').trim();
    const intent = body.intent ? String(body.intent) : 'reception';
    const lead = body.lead && typeof body.lead === 'object' ? body.lead : {};

    // transcript → BotMessage[]（caller→visitor / ai→bot）
    const now = new Date().toISOString();
    const rawTranscript: Array<{ role?: string; content?: string }> =
      Array.isArray(body.transcript) ? body.transcript : [];
    const messages: BotMessage[] = rawTranscript
      .map((m) => ({
        role: (m.role === 'ai' || m.role === 'bot' ? 'bot' : 'visitor') as BotMessage['role'],
        content: String(m.content || ''),
        timestamp: now,
      }))
      .filter((m) => m.content);

    // Pipecat 側要約があれば末尾の bot 発話として残す（通知の要約材料）
    if (body.summary && typeof body.summary === 'string') {
      messages.push({ role: 'bot', content: `【通話要約】${body.summary}`, timestamp: now });
    }

    // 通話をセッションとして記録（電話受付＝callerをvisitorIdに）
    const session = await createSession({
      paletteId,
      visitorId: caller ? `tel:${caller}` : `tel:unknown`,
    });
    const updated = await updateSession(session.id, {
      messages,
      lead: { ...lead, ...(caller ? { phone: lead.phone || caller } : {}), channel: 'phone', intent },
      closed: true,
      closedAction: intent,
      buyIntentScore: 3,
    });

    // 既存の AI要約通知を再利用（goals.notify が有効な場合のみ送信）
    let notifyResult: any = null;
    try {
      const config = await getBotConfigOrDefault(paletteId);
      if (updated && config.goals?.notify?.enabled) {
        const appUrl = process.env.APP_URL?.trim() || 'https://ai.palette-lab.com';
        notifyResult = await sendBotNotifications({
          config,
          session: updated,
          conversationUrl: `${appUrl}/admin/bot-settings/${paletteId}/sessions/${session.id}`,
        });
      }
    } catch (err: any) {
      console.warn('reception notify error:', err?.message || err);
    }

    return NextResponse.json({ success: true, sessionId: session.id, paletteId, notify: notifyResult });
  } catch (error: any) {
    console.error('reception-result error:', error?.message || error);
    return NextResponse.json({ success: false, error: 'internal error' }, { status: 500 });
  }
}
