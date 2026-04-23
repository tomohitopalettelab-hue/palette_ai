/**
 * ヒアリング結果を顧客（オーナー）に通知する
 * - Email（Resend）
 * - LINE Messaging API Push
 * - 汎用Webhook（Slack/Discord/カスタム）
 */

import { getOpenAI, CHAT_MODEL } from './openai-client';
import { BotSession, BotConfig } from './bot-store';

export type NotifyChannels = {
  emailAddress?: string;
  lineChannelToken?: string;
  lineUserId?: string;
  webhookUrl?: string;
};

export type NotifyResult = {
  email?: { ok: boolean; error?: string };
  line?: { ok: boolean; error?: string };
  webhook?: { ok: boolean; error?: string };
};

/**
 * 会話履歴をAIで要約
 */
const summarizeConversation = async (session: BotSession, config: BotConfig): Promise<string> => {
  const shopName = config.basic?.shopName || 'お店';
  const messages = session.messages || [];
  if (messages.length === 0) return '会話ログなし';

  const transcript = messages
    .slice(-20)
    .map((m) => `${m.role === 'visitor' ? '訪問者' : 'Bot'}: ${String(m.content).slice(0, 400)}`)
    .join('\n');

  try {
    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: CHAT_MODEL,
      messages: [
        {
          role: 'system',
          content: `あなたは${shopName}の営業担当アシスタントです。訪問者とチャットBotの会話を3〜5行で要約し、「訪問者が何を求めているか」「何が決め手になりそうか」「次に何をすべきか」を明確にしてください。営業担当がすぐ行動できる実務メモにしてください。`,
        },
        { role: 'user', content: `以下の会話を要約:\n\n${transcript}` },
      ],
      temperature: 0.3,
    });
    return String(completion.choices?.[0]?.message?.content || '').trim() || transcript.slice(0, 500);
  } catch (err) {
    console.warn('summarize error:', err);
    return transcript.slice(0, 500);
  }
};

/**
 * Email送信（Resend）
 */
const sendEmail = async (
  to: string,
  shopName: string,
  summary: string,
  lead: Record<string, any>,
  conversationUrl: string,
  score: number,
): Promise<{ ok: boolean; error?: string }> => {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return { ok: false, error: 'RESEND_API_KEY 未設定' };

  const fromEmail = process.env.RESEND_FROM_EMAIL?.trim() || 'onboarding@resend.dev';

  const leadLines = Object.entries(lead)
    .filter(([, v]) => v)
    .map(([k, v]) => `- ${k}: ${v}`)
    .join('\n');

  const subject = `【Bot】${shopName}に新しい問い合わせ（買う気度 ${score}/5）`;
  const html = `
<div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
  <div style="background:linear-gradient(135deg,#6366f1,#d946ef);color:#fff;padding:20px;border-radius:12px;">
    <h1 style="margin:0 0 8px;font-size:20px;">新しい問い合わせが届きました</h1>
    <p style="margin:0;font-size:13px;opacity:0.9;">${shopName} / 買う気度 ${score}/5</p>
  </div>

  <h2 style="margin:20px 0 10px;font-size:15px;color:#1e293b;">訪問者情報</h2>
  <pre style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;font-size:13px;white-space:pre-wrap;">${leadLines || '(詳細未入力)'}</pre>

  <h2 style="margin:20px 0 10px;font-size:15px;color:#1e293b;">会話の要約</h2>
  <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;font-size:13px;line-height:1.7;white-space:pre-wrap;">${summary.replace(/[<>]/g, '')}</div>

  <div style="margin-top:20px;text-align:center;">
    <a href="${conversationUrl}" style="display:inline-block;padding:10px 24px;background:#6366f1;color:#fff;border-radius:8px;text-decoration:none;font-weight:bold;">全会話ログを見る</a>
  </div>

  <p style="margin-top:24px;font-size:11px;color:#94a3b8;text-align:center;">Palette AIX Bot より送信</p>
</div>`;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${shopName} Bot <${fromEmail}>`,
        to: [to],
        subject,
        html,
      }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return { ok: false, error: `Resend ${res.status}: ${errText.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'email error' };
  }
};

/**
 * LINE Push Message送信（Messaging API）
 */
const sendLineMessage = async (
  channelToken: string,
  userId: string,
  shopName: string,
  summary: string,
  lead: Record<string, any>,
  score: number,
): Promise<{ ok: boolean; error?: string }> => {
  if (!channelToken || !userId) return { ok: false, error: 'LINE設定不足' };

  const leadLines = Object.entries(lead)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');

  const text = `【Bot】${shopName}に新しい問い合わせ
買う気度: ${score}/5

◆訪問者情報
${leadLines || '(詳細未入力)'}

◆会話の要約
${summary.slice(0, 800)}
`.slice(0, 4900);

  try {
    const res = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${channelToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: userId,
        messages: [{ type: 'text', text }],
      }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return { ok: false, error: `LINE ${res.status}: ${errText.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'line error' };
  }
};

/**
 * 汎用Webhook（Slack/Discord/カスタム）
 */
const sendWebhook = async (
  url: string,
  shopName: string,
  summary: string,
  lead: Record<string, any>,
  conversationUrl: string,
  score: number,
): Promise<{ ok: boolean; error?: string }> => {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `【${shopName}】新しいBotリード（買う気度 ${score}/5）\n${summary.slice(0, 500)}`,
        shopName,
        score,
        lead,
        summary,
        conversationUrl,
      }),
    });
    if (!res.ok) {
      return { ok: false, error: `Webhook ${res.status}` };
    }
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'webhook error' };
  }
};

/**
 * 通知を送信（enabledなチャンネル全てに並列送信）
 */
export const sendBotNotifications = async (params: {
  config: BotConfig;
  session: BotSession;
  conversationUrl: string;
}): Promise<NotifyResult> => {
  const notify = params.config.goals?.notify;
  if (!notify || !notify.enabled) return {};

  const shopName = params.config.basic?.shopName || 'お客様';
  const lead = params.session.lead || {};
  const score = params.session.buyIntentScore || 1;

  // 要約生成（1回だけ）
  const summary = await summarizeConversation(params.session, params.config);

  const tasks: Array<Promise<void>> = [];
  const result: NotifyResult = {};

  if (notify.emailAddress) {
    tasks.push(
      sendEmail(notify.emailAddress, shopName, summary, lead, params.conversationUrl, score).then((r) => {
        result.email = r;
      }),
    );
  }
  if (notify.lineChannelToken && notify.lineUserId) {
    tasks.push(
      sendLineMessage(notify.lineChannelToken, notify.lineUserId, shopName, summary, lead, score).then((r) => {
        result.line = r;
      }),
    );
  }
  if (notify.webhookUrl) {
    tasks.push(
      sendWebhook(notify.webhookUrl, shopName, summary, lead, params.conversationUrl, score).then((r) => {
        result.webhook = r;
      }),
    );
  }

  await Promise.allSettled(tasks);
  return result;
};
