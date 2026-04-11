const crmBase =
  process.env.PAL_DB_BASE_URL || 'http://localhost:3107';

export const SERVICE_URLS: Record<string, string> = {
  palette_crm: crmBase,
  pal_studio:
    process.env.PAL_STUDIO_BASE_URL || 'http://localhost:3001',
  pal_trust:
    process.env.PAL_TRUST_BASE_URL || 'http://localhost:3102',
  pal_video:
    process.env.PAL_VIDEO_BASE_URL || 'http://localhost:3103',
  pal_opt:
    process.env.PAL_OPT_BASE_URL || 'http://localhost:3104',
  pal_base:
    process.env.PAL_BASE_BASE_URL || 'http://localhost:3105',
};

export const getServiceUrl = (service: string): string | null =>
  SERVICE_URLS[service] || null;
