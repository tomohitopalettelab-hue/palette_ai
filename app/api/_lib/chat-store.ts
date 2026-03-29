import { sql } from '@vercel/postgres';

if (!process.env.POSTGRES_URL) {
  process.env.POSTGRES_URL =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    '';
}

export type ChatSessionRecord = {
  id: string;
  paletteId: string;
  title: string;
  serviceMode: string;
  messages: any[];
  createdAt: string;
  updatedAt: string;
};

let initialized = false;

const ensureTable = async () => {
  if (initialized) return;

  await sql`
    CREATE TABLE IF NOT EXISTS chat_sessions (
      id TEXT PRIMARY KEY,
      palette_id TEXT NOT NULL,
      title TEXT NOT NULL DEFAULT '',
      service_mode TEXT NOT NULL DEFAULT 'none',
      messages JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS chat_sessions_palette_id_idx ON chat_sessions (palette_id, updated_at DESC)`;
  initialized = true;
};

const normalizeRow = (row: any): ChatSessionRecord => {
  return {
    id: row.id,
    paletteId: row.palette_id,
    title: row.title || '',
    serviceMode: row.service_mode || 'none',
    messages: Array.isArray(row.messages) ? row.messages : [],
    createdAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at || new Date().toISOString()),
    updatedAt:
      row.updated_at instanceof Date
        ? row.updated_at.toISOString()
        : String(row.updated_at || new Date().toISOString()),
  };
};

export const getChatSessions = async (
  paletteId: string,
): Promise<Omit<ChatSessionRecord, 'messages'>[]> => {
  await ensureTable();
  const result = await sql`
    SELECT id, palette_id, title, service_mode, created_at, updated_at
    FROM chat_sessions
    WHERE palette_id = ${paletteId}
    ORDER BY updated_at DESC
    LIMIT 50
  `;
  return result.rows.map((row) => {
    const full = normalizeRow({ ...row, messages: [] });
    const { messages: _, ...rest } = full;
    return rest;
  });
};

export const getChatSession = async (
  id: string,
): Promise<ChatSessionRecord | null> => {
  await ensureTable();
  const result = await sql`
    SELECT id, palette_id, title, service_mode, messages, created_at, updated_at
    FROM chat_sessions
    WHERE id = ${id}
    LIMIT 1
  `;
  if (!result.rows.length) return null;
  return normalizeRow(result.rows[0]);
};

export const upsertChatSession = async (
  session: Partial<ChatSessionRecord> & { id: string; paletteId: string },
): Promise<ChatSessionRecord> => {
  await ensureTable();

  const id = session.id;
  const paletteId = session.paletteId;
  const title = session.title || '';
  const serviceMode = session.serviceMode || 'none';
  const messages = Array.isArray(session.messages) ? session.messages : [];
  const messagesJson = JSON.stringify(messages);
  const now = new Date().toISOString();

  const result = await sql`
    INSERT INTO chat_sessions (id, palette_id, title, service_mode, messages, created_at, updated_at)
    VALUES (
      ${id},
      ${paletteId},
      ${title},
      ${serviceMode},
      ${messagesJson}::jsonb,
      ${now}::timestamptz,
      ${now}::timestamptz
    )
    ON CONFLICT (id)
    DO UPDATE SET
      title = EXCLUDED.title,
      service_mode = EXCLUDED.service_mode,
      messages = EXCLUDED.messages,
      updated_at = EXCLUDED.updated_at
    RETURNING id, palette_id, title, service_mode, messages, created_at, updated_at
  `;

  return normalizeRow(result.rows[0]);
};

export const deleteChatSession = async (id: string): Promise<void> => {
  await ensureTable();
  await sql`DELETE FROM chat_sessions WHERE id = ${id}`;
};
