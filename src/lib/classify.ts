import 'server-only';
import { ISLANDS, getRoom, type IslandId } from './islands';
import { CONCEPT_BY_ID, extractConcepts } from './concepts';
import { generateJSON, hasLLM } from './llm';

/**
 * 업로드한 마크다운을 읽고 섬/방(카테고리)과 제목·요약·태그를 정합니다.
 * place는 ISLANDS에서 만든 enum이라 LLM이 없는 카테고리를 고를 수 없고, 받은 값도 getRoom()으로 한 번 더 확인합니다.
 * 키가 없거나 실패하면 개념 사전 규칙으로 대체합니다.
 */
export interface Classified { island: IslandId; room: string; title: string; summary: string; tags: string[]; by: 'llm' | 'rule' }

const PLACES = ISLANDS.flatMap((i) => i.rooms.map((r) => ({ id: `${i.id}/${r.id}`, text: `${i.name} › ${r.name} : ${r.desc}` })));

const SYSTEM = [
  '너는 개발 블로그 ZORA의 사서다. 글을 읽고 꽂을 자리(place)와 제목, 한 줄 요약, 태그를 정한다.',
  '섬:',
  ...ISLANDS.map((i) => `- ${i.name}: ${i.desc}`),
  'place 목록 (id = 섬 › 방 : 설명):',
  ...PLACES.map((p) => `- ${p.id} = ${p.text}`),
  'title: 60자 이하, 글의 결론이 드러나게. summary: 120자 이하 한 문장. tags: 1~5개, 짧은 키워드.',
].join('\n');

const SCHEMA = {
  type: 'object',
  properties: {
    place: { type: 'string', enum: PLACES.map((p) => p.id) },
    title: { type: 'string' },
    summary: { type: 'string' },
    tags: { type: 'array', items: { type: 'string' } },
  },
  required: ['place', 'title', 'summary', 'tags'],
};

const str = (v: unknown, n: number) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, n) : '');

/** 규칙 기반: 가장 많이 나온 개념의 서가, 개념이 없으면 여관 › Adventurer's Log */
export function ruleClassify(markdown: string, fallbackTitle: string): Classified {
  const found = extractConcepts(markdown);
  const top = found[0] && CONCEPT_BY_ID.get(found[0].id);
  const heading = /^#\s+(.+)$/m.exec(markdown)?.[1];
  return {
    island: top ? 'library' : 'inn',
    room: top ? top.domain : 'log',
    title: str(heading, 60) || str(fallbackTitle, 60),
    summary: '',
    tags: found.slice(0, 3).map((c) => CONCEPT_BY_ID.get(c.id)!.label),
    by: 'rule',
  };
}

export async function classify(markdown: string, fallbackTitle: string): Promise<Classified> {
  if (!hasLLM()) return ruleClassify(markdown, fallbackTitle);
  try {
    const o = (await generateJSON(SYSTEM, `파일 이름: ${fallbackTitle}\n\n${markdown.slice(0, 6000)}`, SCHEMA, 10000)) as Record<string, unknown>;
    const [island, room] = String(o.place ?? '').split('/');
    if (!getRoom(island, room)) throw new Error(`없는 place: ${String(o.place)}`);
    const tags = Array.isArray(o.tags) ? [...new Set(o.tags.map((t) => str(t, 30)).filter(Boolean))].slice(0, 5) : [];
    return { island: island as IslandId, room, title: str(o.title, 60) || ruleClassify(markdown, fallbackTitle).title, summary: str(o.summary, 120), tags, by: 'llm' };
  } catch (e) {
    console.warn('[classify] LLM 분류 실패 → 규칙 기반', e);
    return ruleClassify(markdown, fallbackTitle);
  }
}
