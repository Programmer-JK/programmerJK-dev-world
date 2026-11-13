import { NextResponse } from 'next/server';
import { askStream, type AskEvent, type AskTurn } from '@/lib/ask';

/** 브라우저가 보낸 대화 기록: 최대 3턴, 턴당 500자. 형식이 틀리면 버림 */
function cleanHistory(v: unknown): AskTurn[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((t): t is AskTurn => !!t && typeof t.q === 'string' && typeof t.a === 'string')
    .slice(-3)
    .map((t) => ({ q: t.q.slice(0, 500), a: t.a.slice(0, 500) }));
}

/** 응답: NDJSON 스트림 (meta → delta… → done) */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { q?: unknown; history?: unknown };
  const question = (typeof body.q === 'string' ? body.q : '').trim().slice(0, 200);
  if (!question) return NextResponse.json({ error: '질문을 입력해 주세요.' }, { status: 400 });

  const it = askStream(question, cleanHistory(body.history), request.signal);
  const enc = new TextEncoder();
  const line = (e: AskEvent) => enc.encode(JSON.stringify(e) + '\n');

  const stream = new ReadableStream<Uint8Array>({
    async pull(c) {
      try {
        const { value, done } = await it.next();
        if (done) c.close();
        else c.enqueue(line(value));
      } catch (e) {
        console.error('[ask]', e);
        c.enqueue(line({ type: 'done', answer: [{ text: '답을 찾다가 문제가 생겼어요. 잠시 후 다시 물어봐 주세요.', cite: 0 }] }));
        c.close();
      }
    },
    cancel() { it.return(undefined); },
  });

  return new Response(stream, { headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store' } });
}
