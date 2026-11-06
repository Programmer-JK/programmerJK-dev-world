/**
 * 온톨로지의 CONCEPT 사전. 클라이언트(글쓰기 화면)와 서버(지식 지도) 모두에서 씁니다.
 * - domain: 지식 도서관 서가 id (ai, frontend, backend, devops, arch, algo, ref) — CONCEPT → DOMAIN "분류" 관계가 됩니다.
 * - aliases: 본문에서 이 개념을 찾을 때 쓰는 별칭(소문자). "정규화" 단계에서 같은 개념으로 합쳐집니다.
 * - related: 개념끼리의 연관 관계(RELATES).
 *
 * LLM 추출을 붙이면 새 개념은 여기 없더라도 graph에 추가되도록 ontology.ts의 extractor를 바꾸면 됩니다.
 */
export interface Concept {
  id: string;
  label: string;
  domain: 'ai' | 'frontend' | 'backend' | 'devops' | 'arch' | 'algo' | 'ref';
  aliases: string[];
  related?: string[];
}

export const CONCEPTS: Concept[] = [
  { id: 'agent', label: 'Agent', domain: 'ai', aliases: ['agent', '에이전트'], related: ['langgraph'] },
  { id: 'langgraph', label: 'LangGraph', domain: 'ai', aliases: ['langgraph', 'stategraph'], related: ['fsm'] },
  { id: 'rag', label: 'RAG', domain: 'ai', aliases: ['rag', '검색 증강'] },
  { id: 'vector', label: 'Vector Search', domain: 'ai', aliases: ['벡터', 'vector', '임베딩', 'embedding'], related: ['rag'] },
  { id: 'bm25', label: 'BM25', domain: 'ai', aliases: ['bm25', '키워드 검색'], related: ['rag'] },
  { id: 'nl2sql', label: 'NL2SQL', domain: 'ai', aliases: ['nl2sql', 'text-to-sql'], related: ['rag'] },
  { id: 'prompt', label: 'Prompt', domain: 'ai', aliases: ['프롬프트', 'prompt'] },
  { id: 'eval', label: '평가 지표', domain: 'ai', aliases: ['평가 지표', 'recall', 'mrr', 'ndcg'] },
  { id: 'intent', label: 'Intent Router', domain: 'arch', aliases: ['intent', '의도 분류', '라우터'], related: ['fsm'] },
  { id: 'fsm', label: 'State Machine', domain: 'arch', aliases: ['상태 머신', 'state machine', 'fsm'] },
  { id: 'ddd', label: 'DDD', domain: 'arch', aliases: ['ddd', '도메인 주도'] },
  { id: 'spring', label: 'Spring', domain: 'backend', aliases: ['spring', '@transactional'] },
  { id: 'tx', label: 'Transaction', domain: 'backend', aliases: ['트랜잭션', 'transaction'], related: ['spring'] },
  { id: 'jpa', label: 'JPA', domain: 'backend', aliases: ['jpa', 'n+1', '지연 로딩'], related: ['spring'] },
  { id: 'docker', label: 'Docker', domain: 'devops', aliases: ['docker', '컨테이너', 'dockerfile'] },
  { id: 'sllm', label: 'sLLM Serving', domain: 'devops', aliases: ['sllm', '모델 서빙', '폐쇄망'], related: ['docker'] },
  { id: 'paper', label: 'Paper', domain: 'ref', aliases: ['논문', 'paper', 'react 논문'] },
];

export const CONCEPT_BY_ID = new Map(CONCEPTS.map((c) => [c.id, c]));

/** 본문에서 개념을 찾아 등장 횟수와 함께 돌려줍니다. (키워드 기반 기본 추출기) */
export function extractConcepts(text: string): { id: string; hits: number }[] {
  const low = text.toLowerCase();
  const out: { id: string; hits: number }[] = [];
  for (const c of CONCEPTS) {
    let hits = 0;
    for (const a of c.aliases) {
      let i = low.indexOf(a);
      while (i !== -1) { hits++; i = low.indexOf(a, i + a.length); }
    }
    if (hits > 0) out.push({ id: c.id, hits });
  }
  return out.sort((a, b) => b.hits - a.hits);
}
