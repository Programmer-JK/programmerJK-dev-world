import type { Metadata } from 'next';
import { getAllPosts, getProjects } from '@/lib/content';
import { buildGraph } from '@/lib/ontology';
import KnowledgeMap3D from './KnowledgeMap3D';

export const metadata: Metadata = { title: 'Knowledge Map' };

const STEPS = [
  ['01 수집', 'Markdown 본문과 태그를 읽는다'],
  ['02 개념 추출', '온톨로지 사전(또는 LLM)으로 개념을 뽑는다'],
  ['03 정규화', '별칭을 같은 개념으로 합친다'],
  ['04 관계 추론', '정해진 관계 타입 안에서 신뢰도와 함께 남긴다'],
  ['05 유사도', '공유 개념으로 비슷한 기록을 잇는다'],
  ['06 검토', '낮은 신뢰도의 관계는 점선으로 두고 확인한다'],
];

export default function KnowledgePage() {
  const graph = buildGraph(getAllPosts(), getProjects());
  return (
    <main className="wrap" style={{ maxWidth: 1320, paddingTop: 48, paddingBottom: 96 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 24, flexWrap: 'wrap', marginBottom: 28 }}>
        <div>
          <div className="eyebrow">KNOWLEDGE MAP / ONTOLOGY 3D</div>
          <h1 className="h-display" style={{ marginTop: 12, fontSize: 'clamp(36px, 5vw, 64px)' }}>모든 기록이 연결되는 지도</h1>
        </div>
        <p style={{ margin: 0, maxWidth: 480, color: 'var(--muted)', fontSize: 15, lineHeight: 1.75 }}>
          서가 → 개념 → 기록 → 프로젝트가 층을 이루고, 비슷한 기록끼리는 추천 경로로 이어집니다. 노드 {graph.nodes.length}개 · 연결 {graph.edges.length}개
        </p>
      </div>
      <KnowledgeMap3D graph={graph} />
      <section aria-label="지도가 자라는 방식" className="card" style={{ marginTop: 20, padding: 24 }}>
        <h2 className="pixel-label" style={{ margin: '0 0 18px', fontSize: 14, fontWeight: 400 }}>HOW THE MAP GROWS</h2>
        <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 10 }}>
          {STEPS.map(([t, d]) => (
            <li key={t} style={{ padding: 14, border: '1px solid var(--line2)', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span className="pixel-label t-lime" style={{ fontSize: 11 }}>{t}</span>
              <span style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text2)' }}>{d}</span>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
