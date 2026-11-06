import { NextResponse, type NextRequest } from 'next/server';
import { SCRIBE_COOKIE, verifyToken } from '@/lib/auth';

/**
 * Next.js 16 proxy (구 middleware).
 * 필사실(/write)과 글 저장 API는 서명 쿠키가 있어야만 통과합니다.
 * 쿠키가 없으면 홈으로 돌려보내고 ?scribe=locked 로 열쇠 창을 띄웁니다.
 */
export async function proxy(request: NextRequest) {
  const ok = await verifyToken(request.cookies.get(SCRIBE_COOKIE)?.value);
  if (ok) return NextResponse.next();

  if (request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const url = request.nextUrl.clone();
  url.pathname = '/';
  url.search = '?scribe=locked';
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/write/:path*', '/api/posts/:path*', '/api/uploads/:path*', '/api/projects/:path*'],
};
