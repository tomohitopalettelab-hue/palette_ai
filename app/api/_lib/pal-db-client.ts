const getBaseUrl = (): string => {
  return process.env.PAL_DB_BASE_URL?.trim() || 'http://localhost:3100';
};

export const buildPalDbUrl = (path: string): string => {
  const base = getBaseUrl().replace(/\/$/, '');
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
};

export const palDbGet = async (path: string): Promise<Response> => {
  return fetch(buildPalDbUrl(path), {
    method: 'GET',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
    },
  });
};

export const palDbPost = async (path: string, body: unknown): Promise<Response> => {
  return fetch(buildPalDbUrl(path), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body || {}),
  });
};
