import { NextResponse, type NextRequest } from 'next/server';
import { SCRIBE_COOKIE, verifyToken } from '@/lib/auth';

/** 헤더의 "새 기록" 버튼 노출 여부. 페이지 자체는 정적으로 두고 클라이언트에서 확인합니다. */
export async function GET(request: NextRequest) {
  const ok = await verifyToken(request.cookies.get(SCRIBE_COOKIE)?.value);
  return NextResponse.json({ ok }, { headers: { 'Cache-Control': 'no-store' } });
}
