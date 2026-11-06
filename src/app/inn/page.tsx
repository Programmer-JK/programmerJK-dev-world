import type { Metadata } from 'next';
import { Suspense } from 'react';
import IslandBanner, { type BannerFx } from '@/components/IslandBanner';
import Zora from '@/components/Zora';
import { getPostsByIsland } from '@/lib/content';
import InnRooms from './InnRooms';

const LAMP = 'radial-gradient(closest-side, #ffd77e99, transparent)';
const FX: BannerFx[] = [
  { x: 26, y: 0, w: 10, h: 26, c: LAMP, k: 'glow' },
  { x: 76, y: 0, w: 10, h: 26, c: LAMP, k: 'glow', d: 2 },
  { x: 38, y: 30, w: 24, h: 60, c: 'radial-gradient(closest-side, #ff9a3c88, transparent)', k: 'flicker' },
  ...Array.from({ length: 7 }, (_, i) => ({ x: 46 + ((i * 13) % 8), y: 62, w: 0.4, h: 1.33, c: i % 2 ? '#ff7a3c' : '#ffcf5a', k: 'ember', d: i * 0.37 })),
  ...[26, 31.5, 75.5, 81.5].map((x, i) => ({ x, y: 70, w: 0.4, h: 1.33, c: '#ffffffaa', k: 'steam', d: i * 0.8 })),
];

export const metadata: Metadata = { title: '여관' };

export default function InnPage() {
  const posts = getPostsByIsland('inn');
  return (
    <main>
      <IslandBanner fx={FX} image="/pixel/banner-inn.png" bg="#5a3a26" kicker="ISLAND 02 · THE INN" title="여관"
        desc="회고와 일지, 개발 밖의 이야기가 난롯가에 모입니다."
        frame={{ border: '#f4e2c4', inset: '#7a4a2a', box: 'rgba(30,18,10,.94)', text: '#f0dcc4' }} />
      <div className="wrap" style={{ paddingTop: 28, paddingBottom: 120 }}>
        <div className="card" style={{ display: 'flex', gap: 20, alignItems: 'center', padding: '18px 22px' }}>
          <Zora scale={4} hop />
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.7, color: 'var(--text2)' }}>
            “어서 와요, 모험가님. 일지는 이쪽, 회고는 2층, 퀘스트 게시판은 벽에 있어요. 지식 도서관에 꽂힐 만큼 자란 이야기는 나중에 서가로 옮겨져요.”
          </p>
        </div>
        <Suspense fallback={null}><InnRooms posts={posts} /></Suspense>
      </div>
    </main>
  );
}
