import type { Metadata } from 'next';
import { Suspense } from 'react';
import IslandBanner, { type BannerFx } from '@/components/IslandBanner';
import { getPostsByIsland } from '@/lib/content';
import LibraryShelf from './LibraryShelf';

const LAMP = 'radial-gradient(closest-side, #ffd77e99, transparent)';
const FX: BannerFx[] = [
  { x: 14, y: 0, w: 10, h: 26, c: LAMP, k: 'glow' },
  { x: 82.5, y: 0, w: 10, h: 26, c: LAMP, k: 'glow', d: 1.5 },
  { x: 71, y: 55, w: 14, h: 40, c: 'radial-gradient(closest-side, #d7f36b77, transparent)', k: 'glow', d: 0.7 },
  { x: 52.3, y: 12, w: 0.6, h: 2, c: '#fff', k: 'shim' },
  ...Array.from({ length: 9 }, (_, i) => ({ x: 44 + ((i * 29) % 12), y: 28 + ((i * 17) % 42), w: 0.4, h: 1.33, c: '#ffcf96', k: 'mote', d: (i * 0.8) % 7 })),
];

export const metadata: Metadata = { title: '지식 도서관' };

export default function LibraryPage() {
  const posts = getPostsByIsland('library');
  return (
    <main>
      <IslandBanner fx={FX} image="/pixel/banner-library.png" bg="#221c3a" kicker="ISLAND 01 · KNOWLEDGE LIBRARY" title="지식 도서관"
        desc="모든 개발 지식이 서가에 꽂혀 있습니다. 책등을 뽑아 서가를 고르고, 찾는 주제를 검색해 보세요."
        frame={{ border: '#efe2ff', inset: '#3b2a74', box: 'rgba(17,12,38,.9)', text: '#cfc6e6' }} />
      <div className="wrap" style={{ paddingTop: 40, paddingBottom: 120 }}>
        <Suspense fallback={null}><LibraryShelf posts={posts} /></Suspense>
      </div>
    </main>
  );
}
