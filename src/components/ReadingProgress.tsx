'use client';

import { useEffect, useState } from 'react';

/** 읽은 만큼 차오르는 상단 진행 바 + 현재 장(목차) 하이라이트 */
export default function ReadingProgress({ headings }: { headings: { id: string; text: string; depth: number }[] }) {
  const [p, setP] = useState(0);
  const [cur, setCur] = useState<string | null>(null);

  useEffect(() => {
    let raf = 0;
    const on = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
        setP(Math.min(100, Math.round((window.scrollY / max) * 100)));
        let c: string | null = null;
        for (const h of headings) { const el = document.getElementById(h.id); if (el && el.getBoundingClientRect().top < 140) c = h.id; }
        setCur(c);
      });
    };
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => { window.removeEventListener('scroll', on); cancelAnimationFrame(raf); };
  }, [headings]);

  return (
    <>
      <div aria-hidden style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 3, zIndex: 40, background: 'var(--line2)' }}>
        <div style={{ height: 3, width: `${p}%`, background: 'var(--lime)', transition: 'width .12s linear' }} />
      </div>
      {headings.length > 0 && (
        <nav aria-label="목차" style={{ display: 'flex', flexDirection: 'column' }}>
          <span className="eyebrow" style={{ fontSize: 11, marginBottom: 12 }}>CHAPTERS · {p}%</span>
          {headings.filter((h) => h.depth === 2).map((h, i) => {
            const on = cur === h.id;
            return (
              <a key={h.id} href={`#${h.id}`} style={{ display: 'flex', gap: 12, alignItems: 'baseline', padding: `10px 0 10px ${on ? 18 : 14}px`, borderLeft: `2px solid ${on ? 'var(--lime)' : 'var(--line)'}`, color: on ? 'var(--text)' : 'var(--muted2)', fontSize: 14, lineHeight: 1.5, transition: 'padding-left .25s' }}>
                <span className="pixel-label" style={{ fontSize: 10, color: on ? undefined : 'var(--faint)' }}>{String(i + 1).padStart(2, '0')}</span>{h.text}
              </a>
            );
          })}
        </nav>
      )}
    </>
  );
}
