import { NextResponse } from 'next/server';
import { getSession, updateSession, getBotConfigOrDefault } from '../../_lib/bot-store';
import { sendBotNotifications } from '../../_lib/notification-sender';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

const syncLeadToCrm = async (params: {
  paletteId: string;
  sessionId: string;
  score: number;
  lead: Record<string, any>;
  selectedServiceId?: string | null;
  closedAction?: string | null;
}) => {
  const crmUrl = process.env.PALETTE_CRM_URL?.trim();
  const appUrl = process.env.APP_URL?.trim() || 'https://ai.palette-lab.com';
  if (!crmUrl) {
    console.warn('PALETTE_CRM_URL not set; skipping CRM sync');
    return false;
  }
  try {
    const noteLines = [
      `【Bot経由リード】顧客ID: ${params.paletteId}`,
      `買う気度スコア: ${params.score}/5`,
      params.selectedServiceId ? `選択サービスID: ${params.selectedServiceId}` : '',
      params.closedAction ? `クロージングアクション: ${params.closedAction}` : '',
      params.lead.preferredTime ? `希望日時: ${params.lead.preferredTime}` : '',
      params.lead.note ? `備考: ${params.lead.note}` : '',
      `会話ログ: ${appUrl}/admin/bot-settings/${params.paletteId}/sessions/${params.sessionId}`,
    ].filter(Boolean).join('\n');

    const res = await fetch(`${crmUrl.replace(/\/$/, '')}/api/crm/leads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.CRM_API_KEY ? { 'x-api-key': process.env.CRM_API_KEY } : {}),
      },
      body: JSON.stringify({
        companyName: params.lead.name || `Bot訪問者 (${params.paletteId})`,
        contactName: params.lead.name || '',
        email: params.lead.email || '',
        phone1: params.lead.phone || '',
        source: 'bot',
        status: params.closedAction ? 'contacted' : 'new',
        notes: noteLines,
      }),
    });
    return res.ok;
  } catch (err: any) {
    console.error('CRM sync error:', err?.message || err);
    return false;
  }
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const sessionId = String(body.sessionId || '').trim();
    const lead = body.lead && typeof body.lead === 'object' ? body.lead : {};
    const closedAction = body.closedAction ? String(body.closedAction) : null;

    if (!sessionId) {
      return NextResponse.json({ success: false, error: 'sessionId is required' }, { status: 400, headers: corsHeaders });
    }

    const session = await getSession(sessionId);
    if (!session) {
      return NextResponse.json({ success: false, error: 'session not found' }, { status: 404, headers: corsHeaders });
    }

    // Merge with existing lead data (partial updates allowed)
    const mergedLead = { ...(session.lead || {}), ...lead };

    // Fire and forget CRM sync
    const hasMeaningfulLead = Boolean(mergedLead.name || mergedLead.email || mergedLead.phone);
    let synced = session.syncedToCrm;
    if (hasMeaningfulLead && !synced) {
      synced = await syncLeadToCrm({
        paletteId: session.paletteId,
        sessionId,
        score: session.buyIntentScore,
        lead: mergedLead,
        selectedServiceId: session.selectedServiceId,
        closedAction,
      });
    }

    const updatedSession = await updateSession(sessionId, {
      lead: mergedLead,
      closedAction,
      closed: Boolean(closedAction) || session.closed,
      syncedToCrm: synced,
    });

    // Palette AIX: ヒアリング完了通知（メール/LINE/Webhook）
    let notifyResult: Record<string, { ok: boolean; error?: string }> | null = null;
    try {
      if (updatedSession && hasMeaningfulLead) {
        const config = await getBotConfigOrDefault(session.paletteId);
        if (config.goals?.notify?.enabled) {
          const appUrl = process.env.APP_URL?.trim() || 'https://ai.palette-lab.com';
          notifyResult = await sendBotNotifications({
            config,
            session: updatedSession,
            conversationUrl: `${appUrl}/admin/bot-settings/${session.paletteId}/sessions/${sessionId}`,
          });
        }
      }
    } catch (err: any) {
      console.warn('notification error:', err?.message || err);
    }

    return NextResponse.json(
      { success: true, syncedToCrm: synced, sessionId, notify: notifyResult },
      { headers: corsHeaders },
    );
  } catch (error: any) {
    console.error('bot lead error:', error?.message || error);
    return NextResponse.json(
      { success: false, error: 'internal error' },
      { status: 500, headers: corsHeaders },
    );
  }
}
