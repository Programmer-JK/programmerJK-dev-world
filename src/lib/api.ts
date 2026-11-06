import 'server-only';
import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { StoreError } from './store';

/** 라우트 핸들러 공통 에러 처리 */
export async function handle<T>(fn: () => Promise<T> | T): Promise<NextResponse> {
  try {
    return NextResponse.json({ ok: true, ...(await fn()) });
  } catch (e) {
    if (e instanceof StoreError) return NextResponse.json({ ok: false, error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ ok: false, error: '저장 중 문제가 생겼어요.' }, { status: 500 });
  }
}

/** 글 목록이 바뀌면 정적으로 만든 화면들을 다시 그리게 합니다. */
export function refreshPages() {
  revalidatePath('/', 'layout');
}
