import type { Metadata } from 'next';
import Link from 'next/link';
import IslandBanner, { type BannerFx } from '@/components/IslandBanner';
import { getAllPosts, getProjects } from '@/lib/content';
import ForestGrid from './ForestGrid';

const RAY = 'linear-gradient(#efffd066, transparent)';
const FX: BannerFx[] = [
  { x: 29, y: 0, w: 2.5, h: 60, c: RAY, k: 'ray', r: -36 },
  { x: 47, y: 0, w: 2.5, h: 50, c: RAY, k: 'ray', r: -36, d: 2 },
  { x: 66, y: 0, w: 2.5, h: 85, c: RAY, k: 'ray', r: -36, d: 4 },
  ...Array.from({ length: 12 }, (_, i) => ({ x: 6 + ((i * 37) % 88), y: 40 + ((i * 23) % 45), w: 0.5, h: 1.66, c: i % 3 ? '#d7f36b' : '#ffd77e', k: 'fly', d: (i * 0.7) % 5 })),
];

export const metadata: Metadata = { title: '프로젝트 숲' };

export default function ForestPage() {
  const posts = getAllPosts();
  const projects = getProjects();
  const ruinsPosts = posts.filter((p) => p.island === 'forest' && p.room === 'ruins');
  const records: Record<string, number> = {};
  const ruins: Record<string, number> = {};
  for (const p of posts) if (p.project) records[p.project] = (records[p.project] ?? 0) + 1;
  for (const p of ruinsPosts) if (p.project) ruins[p.project] = (ruins[p.project] ?? 0) + 1;
  const projectName = (slug?: string) => projects.find((p) => p.slug === slug)?.name;

  return (
    <main>
      <IslandBanner fx={FX} image="/pixel/banner-forest.png" bg="#1d3a3a" kicker="ISLAND 03 · PROJECT FOREST" title="프로젝트 숲"
        desc="직접 만든 것들이 나무가 되어 자라는 숲. 깊은 곳의 유적에는 무너졌던 순간과 거기서 배운 것이 남아 있습니다."
        frame={{ border: '#d8f3dc', inset: '#2f6a43', box: 'rgba(10,24,16,.9)', text: '#cfe6d4' }} />
      <div className="wrap" style={{ paddingTop: 40, paddingBottom: 120 }}>
        <ForestGrid projects={projects} records={records} ruins={ruins} />

        <section id="ruins" aria-label="유적" style={{ marginTop: 56 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            <img className="px" src="/pixel/icon-ruins.png" alt="" width={64} height={64} />
            <div>
              <span className="pixel-label t-sand" style={{ fontSize: 11 }}>PROJECT RUINS</span>
              <h2 className="h-display" style={{ fontSize: 'clamp(26px, 3.2vw, 40px)' }}>무너진 자리에서 배운 것</h2>
            </div>
          </div>
          <div style={{ borderTop: '2px solid var(--line3)' }}>
            {ruinsPosts.length === 0 && <p style={{ margin: 0, padding: '28px 12px', color: 'var(--muted2)' }}>아직 남겨진 유적이 없어요.</p>}
            {ruinsPosts.map((r) => {
              const sev = r.severity ?? 1;
              return (
                <Link key={r.slug} href={`/posts/${r.slug}`} className="post-row" style={{ display: 'flex', gap: 20, flexWrap: 'wrap', padding: '22px 12px', borderBottom: '1px solid var(--line)', color: 'var(--text)' }}>
                  <div style={{ flex: '0 0 120px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted2)' }}>붕괴 규모</span>
                    <span aria-label={`붕괴 규모 ${sev} / 3`} style={{ display: 'flex', gap: 3 }}>
                      {[0, 1, 2].map((k) => <span key={k} style={{ width: 18, height: 18, background: k < sev ? '#e08a4f' : 'var(--line2)', border: '2px solid var(--ink)' }} />)}
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted2)' }}>{r.date.replaceAll('-', '.')}</span>
                  </div>
                  <div style={{ flex: '999 1 420px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 18, fontWeight: 800 }}>{r.title}</span>
                      {projectName(r.project) && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, padding: '3px 8px', border: '1px solid var(--line3)', color: 'var(--muted)' }}>{projectName(r.project)}</span>}
                    </span>
                    {r.summary && <span style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text2)' }}>{r.summary}</span>}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
