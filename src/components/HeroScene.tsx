'use client';

import { useRef } from 'react';

/**
 * 노을 지는 픽셀 풍경. 레이어: 하늘 → 흐르는 구름 → 지형/호수 → 앞쪽 언덕(좌·우).
 * 마우스를 따라 구름과 앞쪽 언덕이 조금씩 움직입니다(리렌더 없이 CSS 변수만 갱신).
 */
const SHIMS = [
  { x: 30, y: 70, w: 4, c: '#a993e6', d: 0 }, { x: 44, y: 74, w: 2.5, c: '#ffcf96', d: 0.6 },
  { x: 50, y: 68, w: 3, c: '#ffcf96', d: 1.2 }, { x: 60, y: 79, w: 5, c: '#a993e6', d: 1.8 },
  { x: 48, y: 86, w: 3, c: '#ffcf96', d: 0.9 }, { x: 55, y: 94, w: 2.5, c: '#ffcf96', d: 0.3 },
];
const FLIES = Array.from({ length: 12 }, (_, i) => ({
  x: 18 + ((i * 37) % 60), y: 58 + ((i * 23) % 32), d: (i * 0.7) % 5, c: i % 3 ? '#d7f36b' : '#ffd77e',
}));

export default function HeroScene({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLElement>(null);

  const onMove = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const mx = ((e.clientX - r.left) / r.width) * 2 - 1;
    el.style.setProperty('--px', String(mx));
  };

  const layer: React.CSSProperties = { position: 'absolute', left: 0, top: 0, width: '100%', height: '100%' };

  return (
    <section
      ref={ref}
      id="top"
      className="dark-zone"
      onPointerMove={onMove}
      onPointerLeave={() => ref.current?.style.setProperty('--px', '0')}
      style={{ position: 'relative', overflow: 'hidden', minHeight: 'max(860px, 56.25vw)', background: '#261a58', borderBottom: '1px solid var(--line2)', ['--px' as string]: 0 }}
    >
      <div aria-hidden style={{ position: 'absolute', left: '50%', bottom: 0, width: 'max(100%, 1530px)', aspectRatio: '480 / 270', transform: 'translateX(-50%)', overflow: 'hidden', pointerEvents: 'none' }}>
        <img className="px" src="/pixel/sky.png" alt="" style={layer} />
        <div style={{ ...layer, transform: 'translate3d(calc(var(--px) * -14px), 0, 0)', transition: 'transform .6s ease-out' }}>
          <div className="cloudrun" style={{ position: 'absolute', left: 0, top: 0, width: '200%', height: '100%' }}>
            <img className="px" src="/pixel/clouds.png" alt="" style={{ width: '100%', height: '100%', display: 'block' }} />
          </div>
        </div>
        <img className="px" src="/pixel/land.png" alt="" style={layer} />
        <span className="beacon" style={{ position: 'absolute', left: '80.4%', top: '29.4%', width: '0.9%', aspectRatio: '1 / 1', background: '#f4ffc2' }} />
        {SHIMS.map((s, i) => (
          <span key={i} className="shim" style={{ position: 'absolute', left: `${s.x}%`, top: `${s.y}%`, width: `${s.w}%`, height: '0.4%', background: s.c, animationDelay: `${s.d}s` }} />
        ))}
        {FLIES.map((f, i) => (
          <span key={i} className="fly" style={{ position: 'absolute', left: `${f.x}%`, top: `${f.y}%`, width: 4, height: 4, background: f.c, animationDelay: `${f.d}s` }} />
        ))}
      </div>
      <div aria-hidden style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', transform: 'translate3d(calc(var(--px) * -18px), 0, 0)', transition: 'transform .5s ease-out' }}>
        <img className="px fg-side" src="/pixel/fg-left.png" alt="" style={{ position: 'absolute', left: -24, bottom: 0, height: 'max(56.25vw, 860px)', width: 'auto' }} />
        <img className="px fg-side" src="/pixel/fg-right.png" alt="" style={{ position: 'absolute', right: -24, bottom: 0, height: 'max(56.25vw, 860px)', width: 'auto' }} />
      </div>
      <div className="wrap hero-pad" style={{ position: 'relative', zIndex: 2, paddingTop: 96, paddingBottom: 160 }}>
        {children}
      </div>
      <style>{`@media (max-width:720px){.hero-pad{padding-top:40px !important;padding-bottom:260px !important}.fg-side{height:520px !important}}`}</style>
    </section>
  );
}
