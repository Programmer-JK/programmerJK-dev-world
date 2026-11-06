'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type { PostMeta } from '@/lib/content';
import { ISLANDS } from '@/lib/islands';

const inn = ISLANDS.find((i) => i.id === 'inn')!;
const ROT = [-2.5, 1.8, -1.2, 2.4, -1.8];
const STAMP = { clear: { t: 'CLEAR', c: '#2f7a58', pin: '#40916c' }, doing: { t: '진행 중', c: '#b8452f', pin: '#d0463c' }, hold: { t: '보류', c: '#7a6e6a', pin: '#7a6e6a' } };

export default function InnRooms({ posts }: { posts: PostMeta[] }) {
  const params = useSearchParams();
  const [room, setRoom] = useState(params.get('room') ?? 'log');
  const list = posts.filter((p) => p.room === room);

  return (
    <>
      <div role="tablist" aria-label="여관의 방" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12, margin: '36px 0 28px' }}>
        {inn.rooms.map((r) => {
          const on = room === r.id;
          return (
            <button key={r.id} type="button" role="tab" aria-selected={on} onClick={() => setRoom(r.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 16, minHeight: 84, padding: '14px 18px', cursor: 'pointer', textAlign: 'left', background: on ? 'color-mix(in srgb, #c0623a 16%, var(--surface))' : 'var(--surface)', border: `2px solid ${on ? '#c0623a' : 'var(--line)'}`, color: 'var(--text)' }}>
              <img className="px" src={r.icon} alt="" width={64} height={64} />
              <span style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span className="pixel-label" style={{ fontSize: 13 }}>{r.name.toUpperCase()}</span>
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>{r.desc} · {posts.filter((p) => p.room === r.id).length}편</span>
              </span>
            </button>
          );
        })}
      </div>

      <section role="tabpanel" key={room} className="px-down">
        {room === 'sidequest' ? (
          <div className="dark-zone" style={{ padding: 28, backgroundColor: '#6b4a32', backgroundImage: 'repeating-linear-gradient(90deg, rgba(0,0,0,.18) 0 2px, transparent 2px 48px)', border: '8px solid #3e2818' }}>
            <span className="pixel-label" style={{ display: 'block', marginBottom: 20, fontSize: 14, color: '#f4e2c4', textAlign: 'center' }}>— QUEST BOARD —</span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 22 }}>
              {list.map((q, i) => {
                const st = STAMP[q.status ?? 'doing'];
                return (
                  <Link key={q.slug} href={`/posts/${q.slug}`} className="note" style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 10, padding: '26px 18px 18px', background: '#f4e7c8', color: '#2a1f16', boxShadow: '4px 4px 0 rgba(0,0,0,.35)', transform: `rotate(${ROT[i % ROT.length]}deg)` }}>
                    <span aria-hidden style={{ position: 'absolute', left: '50%', top: 8, width: 10, height: 10, marginLeft: -5, background: st.pin, border: '2px solid #111' }} />
                    <span style={{ fontSize: 16, fontWeight: 900, lineHeight: 1.4 }}>{q.title}</span>
                    {q.summary && <span style={{ fontSize: 13, lineHeight: 1.6, color: '#4a3a2a' }}>{q.summary}</span>}
                    <span className="pixel-label" style={{ alignSelf: 'flex-start', fontSize: 10, padding: '4px 8px', border: `2px solid ${st.c}`, color: st.c, transform: 'rotate(-4deg)' }}>{st.t}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ) : (
          <ol style={{ margin: 0, padding: 0, listStyle: 'none' }}>
            {list.map((l) => (
              <li key={l.slug} style={{ display: 'flex', gap: 18 }}>
                <span className="pixel-label" style={{ flex: '0 0 64px', paddingTop: 18, fontSize: 11, color: 'var(--muted2)', textAlign: 'right' }}>{l.date.slice(5).replace('-', '.')}</span>
                <span aria-hidden style={{ flex: '0 0 14px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ width: 2, height: 20, background: 'var(--line)' }} />
                  <span style={{ width: 12, height: 12, background: room === 'log' ? 'var(--lime)' : 'var(--blue)', border: '2px solid var(--ink)' }} />
                  <span style={{ width: 2, flex: 1, background: 'var(--line)' }} />
                </span>
                <Link href={`/posts/${l.slug}`} className="card post-row" style={{ flex: 1, margin: '8px 0', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 8, color: 'var(--text)' }}>
                  <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{l.tags.map((t) => <span key={t} style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted2)' }}>#{t}</span>)}</span>
                  <span style={{ fontSize: 17, fontWeight: 800 }}>{l.title}</span>
                  {l.summary && <span style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text2)' }}>{l.summary}</span>}
                </Link>
              </li>
            ))}
          </ol>
        )}
        {list.length === 0 && <p style={{ color: 'var(--muted)' }}>아직 이 방에 남긴 이야기가 없어요.</p>}
      </section>
    </>
  );
}
