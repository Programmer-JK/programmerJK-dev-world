import 'server-only';
import fs from 'node:fs';
import path from 'node:path';
import { getAllPostsWithBody, getProjects, type Post, type Project } from './content';
import { CONCEPTS, CONCEPT_BY_ID, extractConcepts } from './concepts';
import { getIsland, placeLabel } from './islands';
import { buildGraph } from './ontology';
import { cosine, EMBED_MODEL, embedQuery, generateJSON, hasLLM, streamText } from './llm';
import { parseCited, type AskSegment } from './cite';

/**
 * Ask ZORA — 블로그 기록만 근거로 답하는 RAG. (설계: content/posts/ask-zora-design.mdx)
 * ① 라우팅: LLM이 intent · 개념 · 검색용 query를 고름 (실패하면 정규식 + 개념 사전)
 * ② 하이브리드 검색: 온톨로지 그래프 0.6 + 임베딩 코사인 0.4, 개념이 없으면 키워드 점수
 * ③ 답변: doc · order는 LLM 스트림 + 문장마다 [n] 출처, 나머지와 실패 시엔 템플릿
 * 이벤트 순서: meta → delta… → done
 */

export type { AskSegment };
export interface AskSource { n: number; slug: string; title: string; href: string; place: string; icon: string }
export interface AskTurn { q: string; a: string }
export interface AskResult {
  question: string;
  steps: string[];
  sources: AskSource[];
  answer: AskSegment[];
  follow: string[];
  found: boolean;
}
export type AskEvent =
  | ({ type: 'meta' } & Omit<AskResult, 'answer'>)
  | ({ type: 'delta' } & AskSegment)
  | { type: 'done'; answer: AskSegment[] };

const INTENTS = ['doc', 'order', 'project', 'interest', 'out_of_scope'] as const;
type Intent = (typeof INTENTS)[number];
const INTENT_LABEL: Record<Intent, string> = { doc: '문서 탐색', order: '읽는 순서', project: '프로젝트', interest: '관심사', out_of_scope: '기록 밖 질문' };
const label = (c: string) => CONCEPT_BY_ID.get(c)?.label ?? c;

// ---------------------------------------------------------------- ① 라우팅

interface Route { intent: Intent; concepts: string[]; query: string; by: 'llm' | 'rule' }

const ROUTE_SYSTEM = [
  '너는 개발 블로그 ZORA의 질문 라우터다. 질문을 분류하고 검색용 질의를 만든다.',
  'intent: doc=글 내용을 묻는 질문, order=무엇부터·어떤 순서로 읽을지, project=글쓴이가 만든 프로젝트, interest=요즘 관심사·최근에 많이 다룬 주제, out_of_scope=개발·블로그·글쓴이와 무관한 질문(날씨, 잡담, 다른 사람 이야기 등).',
  'concepts: 아래 목록에서 질문과 관련된 id만 0~3개.',
  'query: 이전 대화를 반영해서 혼자 읽어도 뜻이 통하는 검색용 질문으로 다시 쓴다. 예) 이전 질문 "LangGraph는 왜 도입했어?" 다음 "그거 단점은?" → "LangGraph 도입의 단점과 한계"',
  '개념 목록:',
  ...CONCEPTS.map((c) => `- ${c.id}: ${c.label} (${c.aliases.join(', ')})`),
].join('\n');

const ROUTE_SCHEMA = {
  type: 'object',
  properties: {
    intent: { type: 'string', enum: [...INTENTS] },
    concepts: { type: 'array', items: { type: 'string', enum: CONCEPTS.map((c) => c.id) } },
    query: { type: 'string' },
  },
  required: ['intent', 'concepts', 'query'],
};

const historyText = (h: AskTurn[]) => h.map((t, i) => `Q${i + 1}: ${t.q}\nA${i + 1}: ${t.a}`).join('\n');

function ruleRoute(q: string, history: AskTurn[]): Route {
  const intent: Intent = /순서|로드맵|먼저 읽|어떻게 공부/.test(q) ? 'order'
    : /프로젝트|만든|만들었/.test(q) ? 'project'
    : /관심사|요즘/.test(q) ? 'interest' : 'doc';
  let concepts = extractConcepts(q).slice(0, 3).map((c) => c.id);
  let query = q;
  const prev = history.at(-1);
  if (concepts.length === 0 && prev) { // "그거 단점은?" → 직전 질문의 개념을 이어서
    concepts = extractConcepts(prev.q).slice(0, 3).map((c) => c.id);
    query = `${prev.q} ${q}`;
  }
  return { intent, concepts, query, by: 'rule' };
}

async function route(q: string, history: AskTurn[]): Promise<Route> {
  if (!hasLLM()) return ruleRoute(q, history);
  try {
    const user = `${history.length ? `이전 대화:\n${historyText(history)}\n\n` : ''}질문: ${q}`;
    const o = (await generateJSON(ROUTE_SYSTEM, user, ROUTE_SCHEMA)) as Record<string, unknown>;
    const intent = INTENTS.includes(o.intent as Intent) ? (o.intent as Intent) : 'doc';
    const concepts = Array.isArray(o.concepts)
      ? [...new Set(o.concepts.filter((c): c is string => typeof c === 'string' && CONCEPT_BY_ID.has(c)))].slice(0, 3)
      : [];
    const query = typeof o.query === 'string' && o.query.trim() ? o.query.trim().slice(0, 200) : q;
    return { intent, concepts, query, by: 'llm' };
  } catch (e) {
    console.warn('[ask] 라우팅 실패 → 규칙 기반', e);
    return ruleRoute(q, history);
  }
}

// ---------------------------------------------------------------- ② 하이브리드 검색

const EMB_FILE = path.join(process.cwd(), 'content', 'embeddings.json');
let emb: { mtime: number; posts: Record<string, { vec: number[] }> } | null = null;

/** scripts/embed.mjs가 만든 글 벡터. 파일이 없거나 모델이 다르면 빈 객체. */
function embeddings(): Record<string, { vec: number[] }> {
  try {
    const mtime = fs.statSync(EMB_FILE).mtimeMs;
    if (emb?.mtime !== mtime) {
      const j = JSON.parse(fs.readFileSync(EMB_FILE, 'utf8')) as { model?: string; posts?: Record<string, { vec: number[] }> };
      emb = { mtime, posts: j.model === EMBED_MODEL ? (j.posts ?? {}) : {} };
    }
    return emb.posts;
  } catch {
    return {};
  }
}

const tokenize = (s: string) => s.toLowerCase().split(/[^\p{L}\p{N}+#]+/u).filter((t) => t.length > 1);

function tokenScore(qt: Set<string>, p: Post): number {
  let overlap = 0;
  for (const t of tokenize(`${p.title} ${p.summary ?? ''} ${p.tags.join(' ')} ${p.body}`)) if (qt.has(t)) overlap++;
  return Math.min(6, overlap);
}

interface Hit { p: Post; final: number; gn: number; token: number; direct: boolean }

const W_GRAPH = 0.6, W_COS = 0.4, MIN_SCORE = 0.15;
// shortcut: 의미 검색만으로 들어오는 글은 코사인이 상위권(min-max 0.8 이상)일 때만. 실제 점수 분포를 보고 조정
const SEMANTIC_ONLY_MIN = 0.8;

function search(posts: Post[], projects: Project[], query: string, concepts: string[], qvec: number[] | null) {
  const graph = buildGraph(posts, projects);

  // 개념 가중치: 직접 1.0, RELATES 이웃 0.5
  const w = new Map(concepts.map((c) => [c, 1]));
  const expanded: string[] = [];
  for (const e of graph.edges) {
    if (e.pred !== 'RELATES') continue;
    for (const [a, b] of [[e.from, e.to], [e.to, e.from]]) {
      const ca = a.slice('concept:'.length), cb = b.slice('concept:'.length);
      if (w.get(ca) === 1 && !w.has(cb)) { w.set(cb, 0.5); expanded.push(cb); }
    }
  }

  // 개념 → ABOUT → 글
  const g = new Map<string, number>();
  const direct = new Set<string>();
  for (const e of graph.edges) {
    if (e.pred !== 'ABOUT') continue;
    const wt = w.get(e.to.slice('concept:'.length));
    if (!wt) continue;
    const slug = e.from.slice('doc:'.length);
    g.set(slug, (g.get(slug) ?? 0) + wt * e.conf);
    if (wt === 1) direct.add(slug);
  }

  // 상위 글의 SIMILAR 이웃에 보너스
  const top = [...g.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  const bonus = new Map<string, number>();
  for (const e of graph.edges) {
    if (e.pred !== 'SIMILAR') continue;
    for (const [t, s] of top) {
      const id = `doc:${t}`;
      const other = e.from === id ? e.to : e.to === id ? e.from : null;
      if (other) bonus.set(other.slice(4), (bonus.get(other.slice(4)) ?? 0) + 0.3 * e.conf * s);
    }
  }
  for (const [s, b] of bonus) g.set(s, (g.get(s) ?? 0) + b);
  const gMax = Math.max(0, ...g.values());

  // 키워드 점수: 개념이 없을 때 그래프 대신, 그리고 동점 정렬
  const qt = new Set(tokenize(query));
  const tokens = new Map(posts.map((p) => [p.slug, tokenScore(qt, p)]));
  const tMax = Math.max(0, ...tokens.values());

  // 임베딩 코사인 (min-max 정규화)
  const vecs = qvec ? embeddings() : {};
  const cos = new Map<string, number>();
  if (qvec) for (const p of posts) { const v = vecs[p.slug]?.vec; if (v) cos.set(p.slug, cosine(qvec, v)); }
  const cs = [...cos.values()];
  const cMin = Math.min(...cs), cMax = Math.max(...cs);
  const useCos = cs.length > 1 && cMax > cMin;

  const hits: Hit[] = posts.map((p) => {
    const token = tokens.get(p.slug) ?? 0;
    const gn = gMax > 0 ? (g.get(p.slug) ?? 0) / gMax : tMax > 0 ? token / tMax : 0;
    const cn = useCos && cos.has(p.slug) ? (cos.get(p.slug)! - cMin) / (cMax - cMin) : 0;
    const final = useCos ? W_GRAPH * gn + W_COS * cn : gn;
    return { p, final: gn > 0 || cn >= SEMANTIC_ONLY_MIN ? final : 0, gn, token, direct: direct.has(p.slug) };
  })
    .filter((h) => h.final >= MIN_SCORE)
    .sort((a, b) => b.final - a.final || b.token - a.token || (a.p.date < b.p.date ? 1 : -1))
    .slice(0, 3);

  return { hits, expanded, semantic: hits.filter((h) => h.gn === 0).length, useCos };
}

// ---------------------------------------------------------------- ③ 답변

const ANSWER_SYSTEM = [
  '너는 개발 블로그 ZORA의 안내자다. 주어진 [번호] 기록만 근거로 질문에 답한다.',
  '1. 기록에 있는 내용만 말한다. 일반 지식으로 채우지 않는다.',
  '2. 모든 문장은 마침표 뒤에 근거 기록 번호를 하나 붙인다. 예: "BM25를 함께 썼어요. [2]"',
  '3. 기록에 답이 없으면 "그 내용은 기록에 없어요. [1]"처럼 가장 가까운 기록 번호와 함께 짧게 말한다.',
  '4. 존댓말, 3~5문장. 마크다운, 목록, 제목 없이 평문으로.',
  '5. 이전 대화는 흐름을 잇는 데만 쓰고, 번호는 이번 기록 번호만 쓴다.',
].join('\n');

const MAX_ANSWER = 1500;
const CONTEXT_CHARS = 3000; // shortcut: 글 앞부분만 들어감. 긴 글에서 답이 부족하면 ## 단위로 관련 구간을 고르기

async function* llmAnswer(question: string, history: AskTurn[], hits: Hit[], intent: Intent, signal?: AbortSignal): AsyncGenerator<AskSegment> {
  const context = hits.map((h, i) => `[${i + 1}] ${h.p.title} · ${placeLabel(h.p.island, h.p.room)} · ${h.p.date}\n${h.p.body.slice(0, CONTEXT_CHARS)}`).join('\n\n');
  const user = [
    history.length ? `이전 대화:\n${historyText(history)}\n` : '',
    `기록:\n${context}\n`,
    intent === 'order' ? '기록은 읽기 좋은 순서로 놓여 있어요. [1]부터 차례로, 왜 그 순서인지 설명해 주세요.\n' : '',
    `질문: ${question}`,
  ].join('\n');

  let buf = '', total = 0, first = true;
  for await (const t of streamText(ANSWER_SYSTEM, user, signal)) {
    buf += t;
    const { segs, rest } = parseCited(buf, hits.length, first);
    buf = rest;
    for (const s of segs) {
      if (total >= MAX_ANSWER) return;
      total += s.text.length;
      first = false;
      yield s;
    }
  }
}

function firstSentence(p: Post): string {
  if (p.summary) return p.summary;
  const para = p.body.split('\n').map((l) => l.trim()).find((l) => l && !/^(#|```|-|>|\||!\[|<|\d+\.)/.test(l));
  return (para ?? p.title).split(/(?<=[.!?다요])\s/)[0];
}

function templateAnswer(posts: Post[], order: boolean): AskSegment[] {
  const out: AskSegment[] = posts.map((p, i) => ({
    text: (i === 0 ? (order ? '먼저 ' : '') : i === posts.length - 1 ? ' 마지막으로 ' : ' 이어서 ') + `「${p.title}」에서는 ${firstSentence(p).replace(/\.$/, '')}`,
    cite: i + 1,
  }));
  out.push({ text: '.', cite: 0 });
  return out;
}

function toSource(p: Post, n: number): AskSource {
  return { n, slug: p.slug, title: p.title, href: `/posts/${p.slug}`, place: placeLabel(p.island, p.room), icon: getIsland(p.island)?.icon ?? '' };
}

export function suggestions(exclude?: string): string[] {
  const all = ['RAG는 어떤 순서로 읽으면 좋아?', 'LangGraph는 왜 도입했어?', '최근엔 어떤 프로젝트를 했어?', '요즘 관심사가 뭐야?'];
  return all.filter((s) => s !== exclude).slice(0, 3);
}

/** 시작 개념의 RELATES 이웃으로 이어질 질문 */
function follow(question: string, concepts: string[]): string[] {
  const near = new Set<string>();
  for (const c of CONCEPTS) {
    if (concepts.includes(c.id)) for (const r of c.related ?? []) near.add(r);
    if (c.related?.some((r) => concepts.includes(r))) near.add(c.id);
  }
  const qs = [...near].filter((c) => !concepts.includes(c)).slice(0, 2).map((c) => `${label(c)} 관련 기록 있어?`);
  return [...qs, ...suggestions(question)].slice(0, 3);
}

// ---------------------------------------------------------------- ④ 진입점

export async function* askStream(question: string, history: AskTurn[] = [], signal?: AbortSignal): AsyncGenerator<AskEvent> {
  const posts = getAllPostsWithBody();
  const projects = getProjects();
  const r = await route(question, history);
  let simple = hasLLM() && r.by === 'rule';
  const steps = [`의도: ${INTENT_LABEL[r.intent]}`];
  const meta = (sources: AskSource[], found: boolean, fol = follow(question, r.concepts)): AskEvent =>
    ({ type: 'meta', question, steps: simple ? [...steps, '간단 모드로 답변'] : steps, sources, follow: fol, found });

  if (r.intent === 'out_of_scope') {
    yield meta([], false, suggestions());
    yield { type: 'done', answer: [{ text: '저는 이 블로그에 쌓인 기록에 대한 질문만 답할 수 있어요. 아래 질문으로 시작해 보세요.', cite: 0 }] };
    return;
  }

  let hits: Hit[] = [];

  if (r.intent === 'project') {
    const q = `${question} ${r.query}`.toLowerCase();
    const named = projects.find((pr) => {
      const head = pr.name.toLowerCase().split(/\s+/)[0];
      return q.includes(pr.slug) || q.includes(pr.name.toLowerCase()) || (/^[a-z]{3,}$/.test(head) && q.includes(head));
    });
    const related = named ? posts.filter((p) => p.project === named.slug).slice(0, 3) : [];
    if (named && related.length > 0) {
      // 특정 프로젝트를 물으면 그 프로젝트의 기록(PART_OF)으로 문서 답변
      steps.push(`${named.name} → 기록 ${related.length}편 (PART_OF)`);
      hits = related.map((p) => ({ p, final: 1, gn: 1, token: 0, direct: true }));
    } else {
      const list = [...projects].sort((a, b) => Number(b.status === 'growing') - Number(a.status === 'growing')).slice(0, 3);
      steps.push(`프로젝트 숲에서 ${list.length}개 고름`, '핵심만 정리');
      const forest = getIsland('forest');
      yield meta(list.map((pr, i) => ({ n: i + 1, slug: `project:${pr.slug}`, title: pr.name, href: '/forest', place: placeLabel('forest', 'projects'), icon: forest?.icon ?? '' })), list.length > 0);
      yield {
        type: 'done',
        answer: list.map((pr, i) => ({ text: `${i === 0 ? '' : ' '}「${pr.name}」(${pr.period}) — ${pr.summary.replace(/\.$/, '')}. 맡은 일: ${pr.role}.`, cite: i + 1 })),
      };
      return;
    }
  }

  if (r.intent === 'interest') {
    const count = new Map<string, number>();
    for (const p of posts.slice(0, 10)) for (const c of p.concepts) count.set(c, (count.get(c) ?? 0) + 1);
    const top = [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([c]) => c);
    if (top.length > 0) {
      const picked: { c: string; p: Post }[] = [];
      for (const c of top) {
        const p = posts.slice(0, 10).find((x) => x.concepts.includes(c) && !picked.some((y) => y.p.slug === x.slug));
        if (p) picked.push({ c, p });
      }
      steps.push('최근 기록 10편의 개념 빈도', `${top.map(label).join(' · ')} 순`);
      yield meta(picked.map(({ p }, i) => toSource(p, i + 1)), true, follow(question, top));
      yield {
        type: 'done',
        answer: [
          { text: `요즘은 ${top.map(label).join(' · ')} 쪽 기록이 많아요.`, cite: 0 },
          ...picked.map(({ c, p }, i) => ({ text: ` 「${p.title}」에서 ${label(c)} 이야기를 했어요.`, cite: i + 1 })),
        ],
      };
      return;
    }
  }

  if (hits.length === 0) {
    // doc · order (그리고 개념이 안 잡힌 interest)
    let qvec: number[] | null = null;
    if (hasLLM() && Object.keys(embeddings()).length > 0) {
      try { qvec = await embedQuery(r.query); } catch (e) { console.warn('[ask] 질문 임베딩 실패 → 그래프만', e); simple = true; }
    }
    const s = search(posts, projects, r.query, r.concepts, qvec);
    hits = s.hits;
    if (r.concepts.length) steps.push(s.expanded.length ? `${r.concepts.map(label).join(', ')} → ${s.expanded.map(label).join(', ')} 확장 (RELATES)` : `${r.concepts.map(label).join(', ')} 개념으로 검색`);
    else steps.push('키워드로 검색');
    if (hits.length) steps.push(`관련 기록 ${hits.length}편${s.semantic ? ` · 의미 검색으로 ${s.semantic}편 보강` : ''}`);
  }

  if (hits.length === 0) {
    steps.push('딱 맞는 기록 없음');
    const near = posts.slice(0, 2);
    yield meta(near.map((p, i) => toSource(p, i + 1)), false);
    yield { type: 'done', answer: [{ text: '그 주제로 쓴 기록은 아직 없어요. 대신 최근 기록 두 편을 골라뒀어요.', cite: 0 }] };
    return;
  }

  if (r.intent === 'order') {
    // 질문 개념의 글 → 이웃 개념의 글, 같은 단계는 오래된 글부터
    hits = [...hits].sort((a, b) => Number(b.direct) - Number(a.direct) || (a.p.date < b.p.date ? -1 : 1));
  }

  steps.push(hasLLM() ? `기록 ${hits.length}편을 근거로 답변 작성` : '핵심만 정리');
  yield meta(hits.map((h, i) => toSource(h.p, i + 1)), true);

  const answer: AskSegment[] = [];
  if (hasLLM()) {
    try {
      for await (const seg of llmAnswer(question, history, hits, r.intent, signal)) {
        answer.push(seg);
        yield { type: 'delta', ...seg };
      }
    } catch (e) {
      if (!signal?.aborted) console.warn('[ask] 답변 생성 실패 → 템플릿', e);
    }
  }
  yield { type: 'done', answer: answer.length ? answer : templateAnswer(hits.map((h) => h.p), r.intent === 'order') };
}
