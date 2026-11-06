import { NextResponse } from 'next/server';
import { ask } from '@/lib/ask';

export async function POST(request: Request) {
  const { q } = (await request.json().catch(() => ({}))) as { q?: string };
  const question = (q ?? '').trim().slice(0, 200);
  if (!question) return NextResponse.json({ error: '질문을 입력해 주세요.' }, { status: 400 });
  return NextResponse.json(ask(question));
}
