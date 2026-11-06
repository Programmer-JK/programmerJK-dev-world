/**
 * 필사실(글쓰기) 인증 — 비밀번호 확인 후 HMAC 서명 쿠키를 발급합니다.
 * Web Crypto만 사용하므로 proxy(미들웨어)와 Route Handler 양쪽에서 동작합니다.
 * 혼자 쓰는 블로그용 최소 구현입니다. 여러 명이 쓰거나 계정이 필요해지면 Auth.js 등으로 교체하세요.
 */
export const SCRIBE_COOKIE = 'zora_scribe';
export const SCRIBE_TTL_SECONDS = 60 * 60 * 12;

const enc = new TextEncoder();

function b64url(buf: ArrayBuffer): string {
  let s = '';
  for (const b of new Uint8Array(buf)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function hmac(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64url(await crypto.subtle.sign('HMAC', key, enc.encode(value)));
}

function secret(): string {
  const s = process.env.SCRIBE_SECRET;
  if (!s || s.length < 16) throw new Error('SCRIBE_SECRET 환경변수를 16자 이상으로 설정하세요 (.env.example 참고)');
  return s;
}

export async function issueToken(now = Date.now()): Promise<string> {
  const payload = `scribe.${now + SCRIBE_TTL_SECONDS * 1000}`;
  return `${payload}.${await hmac(payload, secret())}`;
}

export async function verifyToken(token: string | undefined, now = Date.now()): Promise<boolean> {
  if (!token) return false;
  const i = token.lastIndexOf('.');
  if (i < 0) return false;
  const payload = token.slice(0, i);
  const sig = token.slice(i + 1);
  let expected: string;
  try { expected = await hmac(payload, secret()); } catch { return false; }
  if (!timingSafeEqual(sig, expected)) return false;
  const exp = Number(payload.split('.')[1]);
  return Number.isFinite(exp) && exp > now;
}

/** 길이가 달라도 같은 시간이 걸리도록 비교 */
export function timingSafeEqual(a: string, b: string): boolean {
  const len = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < len; i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}
