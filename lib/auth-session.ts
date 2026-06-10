export type SessionRole = 'admin' | 'customer' | 'agency';

export type SessionPayload = {
  role: SessionRole;
  customerId?: string;
  paletteId?: string;
  /** role==='agency' のとき: crm_customers.id（代理店自身）*/
  agencyId?: string;
  /** role==='agency' のとき: 表示用の代理店名 */
  agencyName?: string;
  exp: number;
};

export const SESSION_COOKIE_NAME = 'palette_session';

import { signCookie, verifyCookie } from './cookie-sign';

export const createSessionValue = (payload: SessionPayload): Promise<string> =>
  signCookie(payload);

export const parseSessionValue = (value?: string | null): Promise<SessionPayload | null> =>
  verifyCookie<SessionPayload>(value, (p) => !!p.role && !!p.exp);

export const isExpired = (payload: SessionPayload): boolean => {
  return Date.now() > payload.exp;
};
