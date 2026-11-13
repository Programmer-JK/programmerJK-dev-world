/**
 * LLM 답변 텍스트에서 문장 끝 출처 번호 [n]을 잘라 AskSegment로 만듭니다.
 * 스트리밍 중에도 쓰므로, 끝나지 않은 조각(마커가 아직 안 온 문장, 잘린 "[1")은 rest로 돌려줍니다.
 * 의존성 없는 순수 함수 — scripts/check-cite.mjs에서 바로 검사합니다.
 */
export interface AskSegment { text: string; cite: number }

export const MAX_SEG = 300;
const MARK = /\[(\d{1,2})(?:\s*,\s*\d{1,2})*\]/g;

/** n = 이번 출처 개수. 번호가 범위 밖이면 그 문장을 버립니다. */
export function parseCited(buf: string, n: number, first: boolean): { segs: AskSegment[]; rest: string } {
  const segs: AskSegment[] = [];
  let last = 0;
  for (const m of buf.matchAll(MARK)) {
    const cite = Number(m[1]);
    const text = clean(buf.slice(last, m.index), first && segs.length === 0 && last === 0);
    last = m.index! + m[0].length;
    if (cite >= 1 && cite <= n && text.trim()) segs.push({ text, cite });
  }
  return { segs, rest: buf.slice(last) };
}

function clean(s: string, isFirst: boolean): string {
  let t = s.replace(/\*\*|__|^#+\s*/gm, '').replace(/\s+/g, ' ').trimEnd();
  if (isFirst) t = t.trimStart();
  else if (t && !t.startsWith(' ')) t = ' ' + t;
  return t.length > MAX_SEG ? t.slice(0, MAX_SEG - 1) + '…' : t;
}
