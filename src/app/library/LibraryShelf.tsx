'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type { PostMeta } from '@/lib/content';
import { ISLANDS, icon } from '@/lib/islands';
import { CONCEPT_BY_ID } from '@/lib/concepts';
import { SearchIcon } from '@/components/PixelGlyphs';
import Zora from '@/components/Zora';

const library = ISLANDS.find((i) => i.id === 'library')!;
const SHELVES = [{ id: 'all', name: 'ALL', icon: icon('library'), color: '#5b3fa8', desc: '도서관의 모든 책. 서가를 가로질러 최신 기록부터 둘러봅니다.' }, ...library.rooms];

export default function LibraryShelf({ posts }: { posts: PostMeta[] }) {
  const params = useSearchParams();
  const [shelf, setShelf] = useState(params.get('room') ?? 'all');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<'new' | 'links'>('new');

  const cur = SHELVES.find((s) => s.id === shelf) ?? SHELVES[0];
  const inShelf = posts.filter((p) => shelf === 'all' || p.room === shelf);
  const list = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return inShelf
      .filter((p) => !ql || `${p.title} ${p.summary ?? ''} ${p.tags.join(' ')}`.toLowerCase().includes(ql))
      .sort((a, b) => (sort === 'new' ? (a.date < b.date ? 1 : -1) : b.concepts.length - a.concepts.length));
  }, [inShelf, q, sort]);

  const topConcepts = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of inShelf) for (const c of p.concepts) m.set(c, (m.get(c) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([c]) => CONCEPT_BY_ID.get(c)?.label ?? c);
  }, [inShelf]);

  return (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end', marginBottom: 32 }}>
        <div style={{ flex: '999 1 420px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label htmlFor="libq" className="eyebrow" style={{ fontSize: 11 }}>서가 검색</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px', border: '2px solid var(--line3)', background: 'var(--surface)', color: 'var(--muted2)' }}>
            <SearchIcon />
            <input id="libq" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="LangGraph, 트랜잭션, RAG…"
              style={{ flex: 1, minWidth: 0, minHeight: 52, background: 'transparent', border: 0, outline: 'none', color: 'var(--text)', fontSize: 16 }} />
          </div>
        </div>
        <div role="group" aria-label="정렬" style={{ display: 'flex', border: '1px solid var(--line3)' }}>
          {([['new', '최신순'], ['links', '연결 많은 순']] as const).map(([id, label]) => (
            <button key={id} type="button" aria-pressed={sort === id} onClick={() => setSort(id)}
              style={{ minHeight: 52, padding: '0 16px', cursor: 'pointer', border: 0, background: sort === id ? 'var(--lime)' : 'transparent', color: sort === id ? '#0b0d12' : 'var(--text2)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{label}</button>
          ))}
        </div>
      </div>

      <div role="group" aria-label="서가 선택" style={{ display: 'flex', alignItems: 'flex-end', gap: 6, padding: '18px 16px 0', overflowX: 'auto', borderBottom: '10px solid #6b4a32', background: 'var(--surface2)' }}>
        {SHELVES.map((s, i) => {
          const on = shelf === s.id;
          return (
            <button key={s.id} type="button" className="spine" aria-pressed={on} onClick={() => setShelf(s.id)}
              style={{ flex: '0 0 auto', width: 64, height: 150 + (i % 3) * 14, transform: `translateY(${on ? -16 : 0}px)`, cursor: 'pointer', padding: '10px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, background: s.color, border: '2px solid var(--ink)', boxShadow: 'inset 4px 0 0 rgba(255,255,255,.18), inset -4px 0 0 rgba(0,0,0,.22)', color: '#fff' }}>
              <img className="px" src={s.icon} alt="" width={32} height={32} />
              <span className="pixel-label" style={{ writingMode: 'vertical-rl', fontSize: 11, whiteSpace: 'nowrap', textShadow: '1px 1px 0 #111' }}>{s.name.toUpperCase()}</span>
              <span aria-hidden style={{ marginTop: 'auto', width: 36, height: 4, background: '#f2c14e' }} />
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 28, marginTop: 36, alignItems: 'flex-start' }}>
        <aside style={{ flex: '1 1 280px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <img className="px" src={cur.icon} alt="" width={64} height={64} />
              <div>
                <span className="pixel-label" style={{ fontSize: 10, color: 'var(--muted2)' }}>SHELF</span>
                <h2 style={{ margin: 0, fontSize: 24, fontWeight: 900 }}>{cur.id === 'all' ? '전체 서가' : cur.name}</h2>
              </div>
            </div>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: 'var(--text2)' }}>{cur.desc}</p>
            <div style={{ padding: 12, background: 'var(--surface2)' }}><span style={{ fontSize: 24, fontWeight: 900 }}>{inShelf.length}</span> <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted2)' }}>권의 기록</span></div>
            {topConcepts.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {topConcepts.map((t) => <span key={t} style={{ fontFamily: 'var(--font-mono)', fontSize: 12, padding: '5px 9px', border: '1px solid var(--line3)', color: 'var(--text2)' }}>{t}</span>)}
              </div>
            )}
          </div>
          <div className="card" style={{ padding: 20, display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            <Zora scale={4} hop />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span className="pixel-label t-lime" style={{ fontSize: 11 }}>ZORA의 순례 경로</span>
              <span style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text2)' }}>비슷한 기록끼리의 연결은 지식 지도에서 한눈에 볼 수 있어요.</span>
              <Link href="/knowledge" style={{ fontFamily: 'var(--font-mono)', fontSize: 12, padding: '8px 0' }}>지식 지도에서 보기 →</Link>
            </div>
          </div>
        </aside>

        <section aria-label="기록 목록" style={{ flex: '999 1 600px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--muted2)' }}>{cur.id === 'all' ? '전체 서가' : cur.name}{q.trim() ? ` · “${q.trim()}” 검색` : ''} · {list.length}권</span>
          {list.map((b) => {
            const room = library.rooms.find((r) => r.id === b.room);
            return (
              <Link key={b.slug} href={`/posts/${b.slug}`} className="book card" style={{ display: 'flex', color: 'var(--text)' }}>
                <span aria-hidden style={{ flex: '0 0 14px', background: room?.color, boxShadow: 'inset -3px 0 0 rgba(0,0,0,.25)' }} />
                <span style={{ flex: 1, minWidth: 0, padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted2)' }}>
                    {room && <img className="px" src={room.icon} alt="" width={32} height={32} />}
                    <span>ARCHIVE › {room?.name}</span><span aria-hidden>·</span><span>{b.date.replaceAll('-', '.')}</span><span aria-hidden>·</span><span>약 {b.minutes}분</span>
                  </span>
                  <span style={{ fontSize: 19, fontWeight: 800, lineHeight: 1.45 }}>{b.title}</span>
                  {b.summary && <span style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text2)' }}>{b.summary}</span>}
                  <span style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {b.tags.map((t) => <span key={t} style={{ fontFamily: 'var(--font-mono)', fontSize: 11, padding: '3px 8px', background: 'var(--surface2)', color: 'var(--muted)' }}>#{t}</span>)}
                  </span>
                </span>
              </Link>
            );
          })}
          {list.length === 0 && <div style={{ padding: '40px 24px', border: '1px dashed var(--line3)', textAlign: 'center', color: 'var(--muted)' }}>이 서가에는 아직 그 주제의 책이 없어요.</div>}
        </section>
      </div>
    </>
  );
}
