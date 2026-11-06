'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ISLANDS, icon } from '@/lib/islands';
import ThemeSwitch from './ThemeSwitch';
import { PenIcon } from './PixelGlyphs';

const UTIL = [
  { href: '/world', label: 'WORLD MAP', icon: icon('worldmap') },
  { href: '/knowledge', label: 'KNOWLEDGE MAP', icon: icon('knowledge') },
  { href: '/status', label: 'STATUS', icon: icon('status') },
];

export default function Header() {
  const pathname = usePathname();
  const [canWrite, setCanWrite] = useState(false);

  useEffect(() => {
    fetch('/api/scribe/me').then((r) => r.json()).then((d: { ok: boolean }) => setCanWrite(d.ok)).catch(() => {});
    const onUnlock = () => setCanWrite(true);
    window.addEventListener('zora:scribe-unlocked', onUnlock);
    return () => window.removeEventListener('zora:scribe-unlocked', onUnlock);
  }, []);

  const isHome = pathname === '/';
  const active = (href: string) => pathname === href || pathname.startsWith(href + '/');

  return (
    <header style={{ borderBottom: '1px solid var(--line2)', background: 'var(--bg)' }}>
      <div className="wrap" style={{ paddingTop: 16, paddingBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--text)', fontWeight: 900, fontSize: 16, minHeight: 44 }}>
          <span aria-hidden style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 7px)', gap: 2 }}>
            <span style={{ width: 7, height: 7, background: 'var(--lime)' }} />
            <span style={{ width: 7, height: 7, background: '#8db5d4' }} />
            <span style={{ width: 7, height: 7, background: '#a65d2a' }} />
          </span>
          <span>ZORA <span style={{ color: 'var(--faint)', fontWeight: 500 }}>/</span> DEV WORLD</span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {canWrite && (
            <Link href="/write" className="pixel-btn"><PenIcon /> 새 기록</Link>
          )}
          {isHome && <ThemeSwitch />}
        </div>
      </div>
      <nav aria-label="주요 메뉴" style={{ borderTop: '1px solid var(--line2)' }}>
        <div className="wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', paddingLeft: 16, paddingRight: 16 }}>
          <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            {ISLANDS.map((i) => (
              <Link key={i.id} href={i.href} className="menu" aria-current={active(i.href) ? 'page' : undefined}>
                <img className="px" src={i.icon} alt="" width={32} height={32} />
                <span style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <span style={{ fontSize: 15, fontWeight: 900, whiteSpace: 'nowrap' }}>{i.name}</span>
                  <span className="pixel-label" style={{ fontSize: 9, color: 'var(--muted2)', whiteSpace: 'nowrap' }}>{i.en}</span>
                </span>
              </Link>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            {UTIL.map((u) => (
              <Link key={u.href} href={u.href} className="menu pixel-label" aria-current={active(u.href) ? 'page' : undefined} style={{ fontSize: 10, padding: '8px 10px', gap: 8, color: active(u.href) ? undefined : 'var(--muted)' }}>
                <img className="px" src={u.icon} alt="" width={32} height={32} />{u.label}
              </Link>
            ))}
          </div>
        </div>
      </nav>
    </header>
  );
}
