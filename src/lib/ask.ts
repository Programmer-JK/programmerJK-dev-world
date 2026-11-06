import 'server-only';
import { getAllPostsWithBody, type Post } from './content';
import { extractConcepts, CONCEPT_BY_ID } from './concepts';
import { getIsland, placeLabel } from './islands';

/**
 * Ask ZORA — 블로그 기록만 근거로 답하는 RAG.
 * 1) 질문에서 개념/키워드 추출  2) 글 단위 점수화(개념 일치 + 토큰 겹침)  3) 상위 기록을 출처로, 문장마다 출처 번호를 붙여 답 구성
 * LLM_API_KEY가 있으면 3)을 LLM 생성으로 바꾸면 됩니다. (generate 함수 참고)
 */

export interface AskSource { n: number; slug: string; title: string; href: string; place: string; icon: string }
export interface AskSegment { text: string; cite: number }
export interface AskResult {
  question: string;
  steps: string[];
  sources: AskSource[];
  answer: AskSegment[];
  follow: string[];
  found: boolean;
}

const tokenize = (s: string) => s.toLowerCase().split(/[^\p{L}\p{N}+#]+/u).filter((t) => t.length > 1);

function score(q: string, qConcepts: string[], p: Post): number {
  const qt = new Set(tokenize(q));
  const pt = tokenize(`${p.title} ${p.summary ?? ''} ${p.tags.join(' ')} ${p.body}`);
  let overlap = 0;
  for (const t of pt) if (qt.has(t)) overlap++;
  const conceptHits = p.concepts.filter((c) => qConcepts.includes(c)).length;
  return conceptHits * 3 + Math.min(6, overlap) * 0.5;
}

function firstSentence(p: Post): string {
  if (p.summary) return p.summary;
  const para = p.body.split('\n').map((l) => l.trim()).find((l) => l && !l.startsWith('#') && !l.startsWith('```') && !l.startsWith('-') && !l.startsWith('>'));
  return (para ?? p.title).split(/(?<=[.!?다요])\s/)[0];
}

export function ask(question: string): AskResult {
  const posts = getAllPostsWithBody();
  const qConcepts = extractConcepts(question).map((c) => c.id);
  const ranked = posts.map((p) => ({ p, s: score(question, qConcepts, p) })).filter((x) => x.s > 0).sort((a, b) => b.s - a.s).slice(0, 3);
  const islands = Array.from(new Set(ranked.map((r) => getIsland(r.p.island)?.name).filter(Boolean)));

  if (ranked.length === 0) {
    const near = posts.slice(0, 2);
    return {
      question,
      found: false,
      steps: ['세 섬 전체 검색', '딱 맞는 기록 없음', '가까운 기록 고르기'],
      sources: near.map((p, i) => toSource(p, i + 1)),
      answer: [{ text: '그 주제로 쓴 기록은 아직 없어요. 대신 최근 기록 두 편을 골라뒀어요.', cite: 0 }],
      follow: suggestions(),
    };
  }

  const sources = ranked.map((r, i) => toSource(r.p, i + 1));
  const answer: AskSegment[] = ranked.map((r, i) => ({
    text: (i === 0 ? '' : i === ranked.length - 1 ? ' 마지막으로 ' : ' 이어서 ') + `「${r.p.title}」에서는 ${firstSentence(r.p).replace(/\.$/, '')}`,
    cite: i + 1,
  }));
  answer.push({ text: '.', cite: 0 });

  const conceptLabels = qConcepts.map((c) => CONCEPT_BY_ID.get(c)?.label).filter(Boolean);
  return {
    question,
    found: true,
    steps: [`${islands.join(' · ') || '세 섬'} 검색`, `관련 기록 ${ranked.length}편 찾음`, conceptLabels.length ? `${conceptLabels.join(', ')} 중심으로 정리` : '핵심만 정리'],
    sources,
    answer,
    follow: suggestions(question),
  };
}

function toSource(p: Post, n: number): AskSource {
  return { n, slug: p.slug, title: p.title, href: `/posts/${p.slug}`, place: placeLabel(p.island, p.room), icon: getIsland(p.island)?.icon ?? '' };
}

export function suggestions(exclude?: string): string[] {
  const all = ['RAG는 어떤 순서로 읽으면 좋아?', 'LangGraph는 왜 도입했어?', '최근엔 어떤 프로젝트를 했어?', '요즘 관심사가 뭐야?'];
  return all.filter((s) => s !== exclude).slice(0, 3);
}

/**
 * (선택) LLM으로 답을 생성할 때 이 함수를 구현하세요.
 * 프롬프트 규칙: 출처 문맥 밖의 내용은 말하지 않기, 문장마다 [n] 출처 표시, 모르면 모른다고 답하기.
 * 반환은 AskSegment[] 형태로 맞추면 화면은 그대로 동작합니다.
 */
export async function generate(_question: string, _sources: Post[]): Promise<AskSegment[] | null> {
  if (!process.env.LLM_API_KEY) return null;
  // TODO: 사용하는 LLM SDK로 교체
  return null;
}
