import type { Metadata } from 'next';
import Link from 'next/link';
import Zora from '@/components/Zora';
import { getAllPosts, getProjects } from '@/lib/content';
import { buildGraph } from '@/lib/ontology';
import { computeStats } from '@/lib/stats';
import { ISLANDS, icon, placeLabel } from '@/lib/islands';

export const metadata: Metadata = { title: 'Status' };
// 오늘 날짜 기준 통계라 매 요청마다 다시 계산합니다.
export const dynamic = 'force-dynamic';

const HEAT = ['var(--line2)', '#3d4a1f', '#6f8a2c', '#a8c94a', '#d7f36b'];

export default function StatusPage() {
  const posts = getAllPosts();
  const graph = buildGraph(posts, getProjects());
  const s = computeStats(posts, graph);
  const library = ISLANDS[0];

  const kpis = [
    { label: '총 탐험 기록', value: s.total, unit: '편', sub: `이번 달 +${s.thisMonth}`, icon: icon('archive') },
    { label: '연속 기록', value: s.streak, unit: '일', sub: `최장 ${s.longestStreak}일`, icon: icon('chronicles') },
    { label: '지식 연결', value: s.links, unit: '개', sub: `노드 ${s.nodes}개`, icon: icon('knowledge') },
    { label: '방문한 섬', value: s.islandsVisited, unit: '/ 3', sub: '도서관 · 여관 · 숲', icon: icon('worldmap') },
  ];

  return (
    <main className="wrap" style={{ paddingTop: 56, paddingBottom: 120, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ marginBottom: 20 }}>
        <div className="eyebrow">STATUS / 모험가 상태창</div>
        <h1 className="h-display" style={{ marginTop: 12, fontSize: 'clamp(36px, 5vw, 64px)' }}>얼마나 탐험했나</h1>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
        <section aria-label="모험가 프로필" className="card rise" style={{ flex: '1 1 340px', padding: 28, display: 'flex', flexDirection: 'column', gap: 22, borderColor: '#3b2a74' }}>
          <div style={{ display: 'flex', gap: 22, alignItems: 'center' }}>
            <Zora scale={6} hop />
            <div>
              <span className="pixel-label t-lilac" style={{ fontSize: 12 }}>KNOWLEDGE EXPLORER</span>
              <div style={{ fontSize: 32, fontWeight: 900 }}>ZORA</div>
              <span className="pixel-label t-lime" style={{ fontSize: 20 }}>LV.{s.level}</span>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--muted)' }}><span>EXP</span><span>{s.xpInLevel} / {s.xpForNext}</span></div>
            <div role="progressbar" aria-label="다음 레벨까지 경험치" aria-valuemin={0} aria-valuemax={s.xpForNext} aria-valuenow={s.xpInLevel} style={{ height: 18, background: 'var(--surface2)', border: '2px solid #3b2a74' }}>
              <div className="px-in" style={{ height: '100%', width: `${(s.xpInLevel / s.xpForNext) * 100}%`, background: 'repeating-linear-gradient(90deg, #d7f36b 0 10px, #b8d454 10px 12px)' }} />
            </div>
            <span style={{ fontSize: 13, color: 'var(--muted2)' }}>기록 1편 = 40 EXP · 연결 1개 = 5 EXP</span>
          </div>
        </section>

        <div style={{ flex: '999 1 600px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
          {kpis.map((k, i) => (
            <div key={k.label} className={`card rise d${i + 1}`} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: 14, color: 'var(--muted)' }}>{k.label}</span><img className="px" src={k.icon} alt="" width={32} height={32} /></div>
              <span style={{ fontSize: 44, lineHeight: 1, fontWeight: 900 }}>{k.value}<span style={{ fontSize: 18, color: 'var(--muted2)', marginLeft: 4 }}>{k.unit}</span></span>
              <span className="t-lime" style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{k.sub}</span>
            </div>
          ))}
        </div>
      </div>

      <section aria-label="기록 활동" className="card" style={{ padding: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
          <h2 className="pixel-label" style={{ margin: 0, fontSize: 15, fontWeight: 400 }}>ADVENTURE CALENDAR</h2>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--muted)' }}>최근 26주</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <div style={{ display: 'flex', gap: 4, width: 'max-content' }}>
            {s.heatmap.map((w, wi) => (
              <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {w.map((d) => <span key={d.date} title={`${d.date} · ${d.count}편`} className="pop" style={{ width: 30, height: 18, background: HEAT[d.level], animationDelay: `${wi * 0.03}s` }} />)}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section aria-label="서가별 기록" className="card" style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 18 }}>
        <h2 className="pixel-label" style={{ margin: 0, fontSize: 15, fontWeight: 400 }}>LIBRARY SHELVES · 서가별 기록</h2>
        {library.rooms.map((r, i) => {
          const count = s.byRoom.find((b) => b.island === 'library' && b.room === r.id)?.count ?? 0;
          const filled = Math.min(20, count * 2);
          return (
            <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <img className="px" src={r.icon} alt="" width={32} height={32} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}><strong>{r.name}</strong><span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--muted)' }}>{count}편</span></div>
                <div aria-hidden style={{ display: 'grid', gridTemplateColumns: 'repeat(20, minmax(0, 1fr))', gap: 2 }}>
                  {Array.from({ length: 20 }, (_, k) => <span key={k} className="seg" style={{ height: 12, background: k < filled ? r.color : 'var(--line2)', animationDelay: `${0.3 + i * 0.08 + k * 0.03}s` }} />)}
                </div>
              </div>
            </div>
          );
        })}
      </section>

      <section aria-label="최근 활동" className="card" style={{ padding: 28 }}>
        <h2 className="pixel-label" style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 400 }}>ADVENTURER&apos;S LOG<span className="caret t-lime" aria-hidden> _</span></h2>
        {posts.slice(0, 6).map((p) => (
          <Link key={p.slug} href={`/posts/${p.slug}`} className="post-row" style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', padding: '14px 8px', borderBottom: '1px solid var(--line2)', color: 'var(--text)' }}>
            <span style={{ flex: '0 0 90px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--muted2)' }}>{p.date.replaceAll('-', '.')}</span>
            <span style={{ flex: '0 0 auto', fontFamily: 'var(--font-mono)', fontSize: 11, padding: '3px 8px', border: '1px solid var(--line3)', color: 'var(--text2)' }}>{placeLabel(p.island, p.room)}</span>
            <span style={{ flex: '1 1 260px', fontSize: 15 }}>{p.title}</span>
            <span className="t-lime" style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>+40 EXP</span>
          </Link>
        ))}
      </section>
    </main>
  );
}
