import type { Metadata } from 'next';
import { getAllPosts } from '@/lib/content';
import WorldMap from './WorldMap';

export const metadata: Metadata = { title: 'World Map' };

export default function WorldPage() {
  const counts: Record<string, number> = {};
  for (const p of getAllPosts()) counts[`${p.island}/${p.room}`] = (counts[`${p.island}/${p.room}`] ?? 0) + 1;
  return (
    <main className="wrap" style={{ maxWidth: 1280, paddingTop: 56, paddingBottom: 96 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 24, flexWrap: 'wrap', marginBottom: 36 }}>
        <div>
          <div className="eyebrow">WORLD MAP / 세 개의 섬</div>
          <h1 className="h-display" style={{ marginTop: 12, fontSize: 'clamp(36px, 5vw, 64px)' }}>어디로 떠날까</h1>
        </div>
        <p style={{ margin: 0, maxWidth: 460, color: 'var(--muted)', fontSize: 15, lineHeight: 1.75 }}>
          세 섬은 가운데 호수의 수정구로 이어지고, 수정구는 모든 기록의 관계를 보여주는 Knowledge Map으로 통합니다.
        </p>
      </div>
      <WorldMap counts={counts} />
    </main>
  );
}
