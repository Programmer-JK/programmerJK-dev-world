'use client';

import { useEffect, useRef, useState } from 'react';

/** 숨은 미니게임. 홈 hero의 등대를 세 번 두드리면(HeroScene이 'zora:run' 이벤트를 쏨) 열립니다. */
const W = 480, H = 160, GROUND = 140, ZW = 32, ZH = 30, ZX = 40;
const BEST_KEY = 'zora-run-best';

export default function ZoraRun() {
  const [open, setOpen] = useState(false);
  const [over, setOver] = useState(false);
  const [round, setRound] = useState(0);
  const canvas = useRef<HTMLCanvasElement>(null);
  const jump = useRef<() => void>(() => {});

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    const onRun = () => { setOver(false); setRound((r) => r + 1); setOpen(true); };
    window.addEventListener('keydown', onKey);
    window.addEventListener('zora:run', onRun);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('zora:run', onRun); };
  }, []);

  useEffect(() => {
    if (!open || over) return;
    const ctx = canvas.current?.getContext('2d');
    if (!ctx) return;
    const img = new Image();
    img.src = '/pixel/zora.png';
    const css = getComputedStyle(document.documentElement);
    const lime = css.getPropertyValue('--lime').trim() || '#d7f36b';
    const muted = css.getPropertyValue('--muted').trim() || '#8a8fa3';
    let best = 0;
    try { best = Number(localStorage.getItem(BEST_KEY)) || 0; } catch {}

    let y = GROUND - ZH, vy = 0, frame = 0, speed = 4, nextBug = 60, raf = 0;
    const bugs: { x: number; h: number }[] = [];
    jump.current = () => { if (y >= GROUND - ZH) vy = -9; };

    // shortcut: 프레임 단위 물리라 120Hz 모니터에선 2배 빨라짐, 문제 되면 dt 기반으로.
    const tick = () => {
      frame++;
      speed = 4 + frame / 600;
      vy += 0.5; y = Math.min(GROUND - ZH, y + vy);
      if (--nextBug <= 0) { bugs.push({ x: W, h: 14 + Math.random() * 14 }); nextBug = 50 + Math.random() * 70; }
      for (const b of bugs) b.x -= speed;
      while (bugs.length && bugs[0].x < -20) bugs.shift();
      const score = Math.floor(frame / 10);
      const hit = bugs.some((b) => ZX + 4 < b.x + 14 && ZX + ZW - 4 > b.x && y + ZH > GROUND - b.h);

      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = muted; ctx.fillRect(0, GROUND, W, 2);
      ctx.fillStyle = '#f4a08a';
      for (const b of bugs) { ctx.fillRect(b.x, GROUND - b.h, 14, b.h); ctx.fillRect(b.x - 3, GROUND - b.h + 3, 20, 3); }
      if (img.complete) ctx.drawImage(img, ZX, y, ZW, ZH);
      ctx.fillStyle = lime; ctx.font = '12px Silkscreen, monospace'; ctx.textAlign = 'right';
      ctx.fillText(`HI ${String(best).padStart(5, '0')}  ${String(score).padStart(5, '0')}`, W - 8, 18);

      if (hit) {
        if (score > best) try { localStorage.setItem(BEST_KEY, String(score)); } catch {}
        ctx.textAlign = 'center'; ctx.fillText('BUG! GAME OVER', W / 2, H / 2 - 10);
        setOver(true);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const onKey = (e: KeyboardEvent) => { if (e.key === ' ' || e.key === 'ArrowUp') { e.preventDefault(); jump.current(); } };
    window.addEventListener('keydown', onKey);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('keydown', onKey); };
  }, [open, over, round]);

  useEffect(() => {
    if (!over) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === ' ') { e.preventDefault(); setOver(false); setRound((r) => r + 1); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [over]);

  if (!open) return null;

  return (
    <div className="dark-zone" onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
      style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(6,4,14,.72)' }}>
      <div role="dialog" aria-modal="true" aria-label="ZORA RUN 미니게임" className="dialog-box pop" style={{ width: 'min(540px, 100%)', display: 'flex', flexDirection: 'column', gap: 12, padding: '22px 22px 18px' }}>
        <span className="pixel-label t-lime" style={{ fontSize: 10 }}>ZORA RUN · 버그를 피해요</span>
        <canvas ref={canvas} width={W} height={H} onPointerDown={() => jump.current()}
          style={{ width: '100%', height: 'auto', background: '#0b0d12', imageRendering: 'pixelated', touchAction: 'manipulation', cursor: 'pointer' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>Space · ↑ · 탭 = 점프 / Esc = 닫기</span>
          {over && <button type="button" className="pixel-btn" onClick={() => { setOver(false); setRound((r) => r + 1); }} style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 800 }}>다시하기</button>}
        </div>
      </div>
    </div>
  );
}
