import { NextResponse } from 'next/server';
import { SCRIBE_COOKIE, SCRIBE_TTL_SECONDS, issueToken, timingSafeEqual } from '@/lib/auth';

// 아주 단순한 무차별 대입 완화: 인스턴스 메모리 기준 IP당 1분 10회
const attempts = new Map<string, { n: number; t: number }>();

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local';
  const now = Date.now();
  const a = attempts.get(ip);
  if (a && now - a.t < 60_000 && a.n >= 10) {
    return NextResponse.json({ ok: false, error: '잠시 후 다시 시도해 주세요.' }, { status: 429 });
  }

  const expected = process.env.SCRIBE_PASSWORD;
  if (!expected) return NextResponse.json({ ok: false, error: 'SCRIBE_PASSWORD가 설정되지 않았어요.' }, { status: 500 });

  const body = (await request.json().catch(() => ({}))) as { password?: string };
  if (!body.password || !timingSafeEqual(body.password, expected)) {
    attempts.set(ip, { n: a && now - a.t < 60_000 ? a.n + 1 : 1, t: a && now - a.t < 60_000 ? a.t : now });
    return NextResponse.json({ ok: false, error: '비밀번호가 맞지 않아요.' }, { status: 401 });
  }

  attempts.delete(ip);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SCRIBE_COOKIE, await issueToken(), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SCRIBE_TTL_SECONDS,
  });
  return res;
}
