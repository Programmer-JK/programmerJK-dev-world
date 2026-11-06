'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ISLANDS, icon, type IslandId } from '@/lib/islands';

/** 삼각형 세 섬 지도. 표식을 가리키면 섬 테두리가 빛나고 오른쪽 패널이 바뀝니다. */
const POS: Record<IslandId, { x: number; y: number }> = {
  library: { x: 384, y: 300 },
  inn: { x: 150, y: 620 },
  forest: { x: 618, y: 620 },
};

export default function WorldMap({ counts }: { counts: Record<string, number> }) {
  const [sel, setSel] = useState<IslandId>('library');
  const [hov, setHov] = useState<IslandId | null>(null);
  const shownId = hov ?? sel;
  const shown = ISLANDS.find((i) => i.id === shownId)!;

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'stretch' }}>
      <div className="dark-zone" style={{ flex: '999 1 640px', minWidth: 0, overflowX: 'auto', border: '1px solid var(--line)', backgroundColor: '#0d1118', backgroundImage: 'radial-gradient(#1a2130 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
        <div style={{ position: 'relative', width: 768, height: 696, margin: '32px auto 40px' }}>
          <img className="px" src="/pixel/map.png" alt="세 개의 삼각형 섬 지도. 위는 지식 도서관, 왼쪽 아래 여관, 오른쪽 아래 프로젝트 숲, 가운데 호수에 수정구 섬" width={768} height={696} style={{ position: 'absolute', inset: 0 }} />
          {ISLANDS.map((i) => (
            <img key={i.id} className={`px${shownId === i.id ? ' beacon-hl' : ''}`} src={`/pixel/hl-${i.id}.png`} alt="" aria-hidden width={768} height={696}
              style={{ position: 'absolute', inset: 0, opacity: shownId === i.id ? 1 : 0, transition: 'opacity .3s', pointerEvents: 'none' }} />
          ))}
          {ISLANDS.map((i) => {
            const on = shownId === i.id;
            return (
              <div key={i.id} style={{ position: 'absolute', left: POS[i.id].x, top: POS[i.id].y, transform: 'translate(-50%, -50%)' }}>
                <button type="button" aria-pressed={sel === i.id} onClick={() => { setSel(i.id); setHov(null); }}
                  onMouseEnter={() => setHov(i.id)} onMouseLeave={() => setHov(null)} onFocus={() => setHov(i.id)} onBlur={() => setHov(null)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 14px 6px 6px', cursor: 'pointer', background: on ? 'var(--lime)' : 'rgba(11,13,18,.88)', border: `2px solid ${on ? '#0b0d12' : i.palette[1]}`, color: on ? '#0b0d12' : '#edf1f7', boxShadow: '4px 4px 0 rgba(10,7,24,.6)' }}>
                  <img className={`px${on ? ' hop' : ''}`} src={i.icon} alt="" width={32} height={32} />
                  <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: 15, fontWeight: 900 }}>{i.name}</span>
                    <span className="pixel-label" style={{ fontSize: 9, opacity: 0.8 }}>{i.en}</span>
                  </span>
                </button>
              </div>
            );
          })}
          <Link href="/knowledge" style={{ position: 'absolute', left: 384, top: 500, transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px 6px 6px', background: '#120f22', border: '2px solid #7b2cbf', color: '#e0aaff', boxShadow: '4px 4px 0 rgba(10,7,24,.6)', whiteSpace: 'nowrap' }}>
            <img className="px" src={icon('knowledge')} alt="" width={32} height={32} />
            <span className="pixel-label" style={{ fontSize: 11 }}>KNOWLEDGE MAP ↗</span>
          </Link>
        </div>
      </div>

      <aside aria-live="polite" className="card" style={{ flex: '1 1 340px', display: 'flex', flexDirection: 'column', borderColor: shown.palette[1] }}>
        <div key={shown.id} className="px-down" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div aria-hidden style={{ display: 'flex' }}>{shown.palette.map((c) => <span key={c} style={{ flex: 1, height: 14, background: c }} />)}</div>
          <div style={{ padding: '28px 24px 24px', display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <img className="px" src={shown.icon} alt="" width={64} height={64} />
              <div>
                <span className="pixel-label" style={{ fontSize: 11, color: 'var(--muted2)' }}>{shown.en}</span>
                <h2 style={{ margin: 0, fontSize: 32, fontWeight: 900, letterSpacing: '-0.035em' }}>{shown.name}</h2>
              </div>
            </div>
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.75, color: 'var(--text2)' }}>{shown.desc}</p>
            <div style={{ display: 'flex', flexDirection: 'column', borderTop: '1px solid var(--line)' }}>
              {shown.rooms.map((r) => (
                <Link key={r.id} href={`${shown.href}?room=${r.id}`} className="post-row" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 4px', borderBottom: '1px solid var(--line)', color: 'var(--text)' }}>
                  <img className="px" src={r.icon} alt="" width={32} height={32} />
                  <span style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: 15, fontWeight: 700 }}>{r.name}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--muted2)' }}>{r.desc}</span>
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--muted2)' }}>{counts[`${shown.id}/${r.id}`] ?? 0}편</span>
                </Link>
              ))}
            </div>
            <Link href={shown.href} className="pixel-btn" style={{ marginTop: 'auto', justifyContent: 'center', fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 700 }}>{shown.name}로 가기 →</Link>
          </div>
        </div>
      </aside>
    </div>
  );
}
