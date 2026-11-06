'use client';

import { useEffect, useState } from 'react';
import { MoonIcon, SunIcon } from './PixelGlyphs';

/** 낮/밤 픽셀 스위치. 홈 헤더에만 노출되고, 선택은 localStorage에 저장되어 모든 화면에 적용됩니다. */
export default function ThemeSwitch() {
  const [light, setLight] = useState(false);

  useEffect(() => { setLight(document.documentElement.dataset.theme === 'light'); }, []);

  const toggle = () => {
    const next = !light;
    setLight(next);
    document.documentElement.dataset.theme = next ? 'light' : 'dark';
    try { localStorage.setItem('zora-theme', next ? 'light' : 'dark'); } catch {}
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={light}
      aria-label="라이트 모드"
      title={light ? '다크 모드로 전환' : '라이트 모드로 전환'}
      onClick={toggle}
      style={{
        position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'space-between',
        width: 80, height: 40, padding: '0 9px', cursor: 'pointer', overflow: 'hidden',
        background: light ? '#ffe6a8' : '#241b4a', border: '2px solid var(--ink)', boxShadow: '3px 3px 0 var(--ink)',
        transition: 'background-color .3s steps(3)',
      }}
    >
      <SunIcon color={light ? '#e0b45a' : '#5d5488'} />
      <MoonIcon color={light ? '#c9a86a' : '#6d5fb0'} />
      {!light && (
        <>
          <span aria-hidden style={{ position: 'absolute', left: 30, top: 7, width: 2, height: 2, background: '#efe6ff' }} />
          <span aria-hidden style={{ position: 'absolute', left: 22, top: 26, width: 2, height: 2, background: '#b7a8ee' }} />
        </>
      )}
      <span
        aria-hidden
        style={{
          position: 'absolute', top: 2, left: light ? 2 : 38, width: 32, height: 32,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: light ? '#ffd77e' : '#c9b8ff', border: '2px solid var(--ink)',
          boxShadow: 'inset 3px 3px 0 rgba(255,255,255,.45), inset -3px -3px 0 rgba(0,0,0,.18)',
          transition: 'left .24s steps(4), background-color .24s steps(4)',
        }}
      >
        {light ? <SunIcon size={20} color="#c2410c" /> : <MoonIcon size={20} color="#3b2a74" />}
      </span>
    </button>
  );
}
