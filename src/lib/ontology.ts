/**
 * 지식 지도(온톨로지) 그래프.
 *
 * 층(Layer):  DOMAIN(서가) → CONCEPT(개념) → DOCUMENT(기록) → PROJECT(맥락)
 * 관계(Pred): BELONGS(분류) · RELATES(연관) · ABOUT(다룬다) · PART_OF(속한다) · SIMILAR(비슷하다, AI 추론)
 *
 * 지금은 키워드 사전(concepts.ts) 기반으로 관계를 만들고, 비슷한 기록은 공유 개념의 Jaccard 유사도로 추론합니다.
 * LLM을 붙일 때는 `RelationExtractor`를 구현해 buildGraph의 extractor 인자로 넘기면 됩니다.
 *   - 정해진 관계 타입 안에서만 추출 (자유 서술 금지)
 *   - 근거 문장(evidence)과 신뢰도(conf)를 함께 저장
 *   - 신뢰도가 낮은 관계는 inferred=true 로 두고 화면에서 점선 + 검토 대상으로 표시
 */
import { CONCEPTS, CONCEPT_BY_ID } from './concepts';
import { ISLANDS } from './islands';
import type { PostMeta, Project } from './content';

export type Layer = 'domain' | 'concept' | 'doc' | 'project';
export type Pred = 'BELONGS' | 'RELATES' | 'ABOUT' | 'PART_OF' | 'SIMILAR';

export interface GraphNode {
  id: string;
  layer: Layer;
  label: string;
  title?: string;
  href?: string;
  color?: string;
  icon?: string;
}

export interface GraphEdge {
  from: string;
  to: string;
  pred: Pred;
  conf: number;
  inferred?: boolean;
  evidence?: string;
}

export interface Graph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface RelationExtractor {
  (doc: PostMeta): GraphEdge[];
}

const libraryRooms = ISLANDS.find((i) => i.id === 'library')!.rooms;

/** 기본 추출기: frontmatter/본문에서 찾은 개념을 ABOUT 관계로 만듭니다. */
export const keywordExtractor: RelationExtractor = (doc) =>
  doc.concepts
    .filter((c) => CONCEPT_BY_ID.has(c))
    .map((c, i) => ({ from: `doc:${doc.slug}`, to: `concept:${c}`, pred: 'ABOUT' as const, conf: Math.max(0.6, 0.97 - i * 0.06) }));

export function jaccard(a: string[], b: string[]): number {
  const A = new Set(a), B = new Set(b);
  const inter = [...A].filter((x) => B.has(x)).length;
  const uni = new Set([...A, ...B]).size;
  return uni === 0 ? 0 : inter / uni;
}

export function buildGraph(posts: PostMeta[], projects: Project[], extractor: RelationExtractor = keywordExtractor): Graph {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  for (const r of libraryRooms) nodes.push({ id: `domain:${r.id}`, layer: 'domain', label: r.name, color: r.color, icon: r.icon });

  const usedConcepts = new Set(posts.flatMap((p) => p.concepts));
  for (const c of CONCEPTS) {
    if (!usedConcepts.has(c.id)) continue;
    nodes.push({ id: `concept:${c.id}`, layer: 'concept', label: c.label, color: libraryRooms.find((r) => r.id === c.domain)?.color });
    edges.push({ from: `concept:${c.id}`, to: `domain:${c.domain}`, pred: 'BELONGS', conf: 1 });
    for (const rel of c.related ?? []) {
      if (usedConcepts.has(rel)) edges.push({ from: `concept:${c.id}`, to: `concept:${rel}`, pred: 'RELATES', conf: 0.85 });
    }
  }

  for (const p of posts) {
    nodes.push({ id: `doc:${p.slug}`, layer: 'doc', label: p.title.length > 16 ? p.title.slice(0, 15) + '…' : p.title, title: p.title, href: `/posts/${p.slug}` });
    edges.push(...extractor(p));
    // 개념이 없는 서가 글도 지도에서 떠다니지 않게 자기 서가에 직접 붙인다
    if (p.island === 'library' && (p.room === 'ref' || p.concepts.length === 0)) edges.push({ from: `doc:${p.slug}`, to: `domain:${p.room}`, pred: 'BELONGS', conf: 1 });
    if (p.project) edges.push({ from: `doc:${p.slug}`, to: `project:${p.project}`, pred: 'PART_OF', conf: 0.95 });
  }

  for (const pr of projects) nodes.push({ id: `project:${pr.slug}`, layer: 'project', label: pr.name, href: '/forest' });

  // AI 추론: 공유 개념이 많은 기록끼리 SIMILAR
  for (let i = 0; i < posts.length; i++) {
    for (let j = i + 1; j < posts.length; j++) {
      const s = jaccard(posts[i].concepts, posts[j].concepts);
      if (s >= 0.25) edges.push({ from: `doc:${posts[i].slug}`, to: `doc:${posts[j].slug}`, pred: 'SIMILAR', conf: Math.round(s * 100) / 100, inferred: true });
    }
  }

  const ids = new Set(nodes.map((n) => n.id));
  return { nodes, edges: edges.filter((e) => ids.has(e.from) && ids.has(e.to)) };
}

export interface Recommendation {
  slug: string;
  title: string;
  score: number;
  shared: string[];
}

/** 비슷한 기록 추천: 유사도 60% + 공유 개념 수 40% */
export function recommend(target: PostMeta, posts: PostMeta[], k = 3): Recommendation[] {
  return posts
    .filter((p) => p.slug !== target.slug)
    .map((p) => {
      const shared = p.concepts.filter((c) => target.concepts.includes(c));
      const score = jaccard(p.concepts, target.concepts) * 0.6 + Math.min(1, shared.length / 2) * 0.4;
      return { slug: p.slug, title: p.title, score, shared: shared.map((c) => CONCEPT_BY_ID.get(c)?.label ?? c) };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}
