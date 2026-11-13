import 'server-only';

/**
 * Gemini REST 호출 (의존성 없이 fetch).
 *   GEMINI_API_KEY      없으면 hasLLM() = false → 호출하는 쪽이 규칙 기반으로 대체
 *   GEMINI_MODEL        답변 생성 (기본 gemini-3.8-flash)
 *   GEMINI_FAST_MODEL   라우팅 · 업로드 분류 (기본 gemini-3.5-flash-lite)
 *   GEMINI_EMBED_MODEL  임베딩 (기본 gemini-embedding-2, 768차원) — scripts/embed.mjs와 같아야 합니다
 */

const BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
export const EMBED_MODEL = process.env.GEMINI_EMBED_MODEL || 'gemini-embedding-2';
export const EMBED_DIMS = 768;

export const hasLLM = () => !!process.env.GEMINI_API_KEY;

async function call(model: string, method: string, body: unknown, ms: number, query = ''): Promise<Response> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY 없음');
  const r = await fetch(`${BASE}/${model}:${method}${query}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(ms),
  });
  if (!r.ok) throw new Error(`Gemini ${method} ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return r;
}

interface GenChunk { candidates?: { content?: { parts?: { text?: string }[] } }[] }
const textOf = (j: GenChunk) => j.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';

/** JSON schema로 모양이 정해진 답 (라우팅, 분류). 결과 검증은 호출하는 쪽에서 합니다. */
export async function generateJSON(system: string, user: string, schema: object, ms = 6000): Promise<unknown> {
  const r = await call(process.env.GEMINI_FAST_MODEL || 'gemini-3.5-flash-lite', 'generateContent', {
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: 'user', parts: [{ text: user }] }],
    generationConfig: { responseMimeType: 'application/json', responseJsonSchema: schema, temperature: 0 },
  }, ms);
  return JSON.parse(textOf((await r.json()) as GenChunk));
}

/** 답변 스트림 (SSE). 텍스트 조각을 차례로 돌려줍니다. */
export async function* streamText(system: string, user: string, signal?: AbortSignal, ms = 25000): AsyncGenerator<string> {
  const r = await call(process.env.GEMINI_MODEL || 'gemini-3.8-flash', 'streamGenerateContent', {
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: 'user', parts: [{ text: user }] }],
    generationConfig: { temperature: 0.3, maxOutputTokens: 1024 },
  }, ms, '?alt=sse');
  const reader = r.body!.pipeThrough(new TextDecoderStream()).getReader();
  let buf = '';
  try {
    for (;;) {
      if (signal?.aborted) return;
      const { value, done } = await reader.read();
      if (done) return;
      buf += value;
      let i: number;
      while ((i = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, i).trim();
        buf = buf.slice(i + 1);
        if (!line.startsWith('data:')) continue;
        const t = textOf(JSON.parse(line.slice(5)) as GenChunk);
        if (t) yield t;
      }
    }
  } finally {
    reader.cancel().catch(() => {});
  }
}

/** 질문 임베딩. 문서 쪽은 scripts/embed.mjs가 "title: … | text: …" 형식으로 만듭니다. */
export async function embedQuery(text: string, ms = 5000): Promise<number[]> {
  const r = await call(EMBED_MODEL, 'embedContent', {
    model: `models/${EMBED_MODEL}`,
    content: { parts: [{ text: `task: search result | query: ${text}` }] },
    output_dimensionality: EMBED_DIMS,
  }, ms);
  const j = (await r.json()) as { embedding?: { values?: number[] }; embeddings?: { values?: number[] }[] };
  const v = j.embedding?.values ?? j.embeddings?.[0]?.values;
  if (!v?.length) throw new Error('임베딩 응답이 비었어요');
  return v;
}

export function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}
