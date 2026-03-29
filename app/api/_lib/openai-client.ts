import OpenAI from 'openai';

let _client: OpenAI | null = null;

export const getOpenAI = (): OpenAI => {
  if (_client) return _client;
  const apiKey =
    process.env.OPENAI_KEY_API ||
    process.env.OPENAI_API_KEY ||
    '';
  _client = new OpenAI({ apiKey });
  return _client;
};

export const CHAT_MODEL =
  process.env.OPENAI_CHAT_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini';

export const GENERATE_MODEL =
  process.env.OPENAI_GENERATE_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini';
