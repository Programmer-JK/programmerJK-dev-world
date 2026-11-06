'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Zora from './Zora';

/** 홈에서 이 키를 순서대로 치면 필사실 열쇠 창이 열립니다. 바꾸고 싶으면 이 값만 수정하세요. */
const SECRET_SEQ = 'zora';

/**
 * 필사실(글쓰기) 입구. 화면에는 아무 단서가 없고, 키 시퀀스로만 열립니다.
 * 비밀번호 확인과 쿠키 발급은 서버(/api/scribe/login)가 하므로 코드를 봐도 비밀번호는 드러나지 않습니다.
 * /write에 로그인 없이 들어오면 proxy가 /?scribe=locked 로 돌려보내고, 이 창이 자동으로 열립니다.
 */
export default function SecretKey() {
  const params = useSearchParams();
  const [open, setOpen] = useState(false);
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [ok, setOk] = useState(false);
  const seq = useRef('');
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => { if (params.get('scribe') === 'locked') setOpen(true); }, [params]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase();
      if (e.key === 'Escape') { setOpen(false); return; }
      if (tag === 'input' || tag === 'textarea' || e.metaKey || e.ctrlKey || e.altKey || e.key.length !== 1) return;
      seq.current = (seq.current + e.key.toLowerCase()).slice(-SECRET_SEQ.length);
      if (seq.current === SECRET_SEQ) { seq.current = ''; setOpen(true); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => { if (open && !ok) setTimeout(() => input.current?.focus(), 50); }, [open, ok]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    const r = await fetch('/api/scribe/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: pw }) });
    const d = (await r.json()) as { ok: boolean; error?: string };
    setPw('');
    if (d.ok) { setOk(true); window.dispatchEvent(new Event('zora:scribe-unlocked')); }
    else setErr(d.error ?? '비밀번호가 맞지 않아요.');
  }

  if (!open) return null;

  return (
    <div className="dark-zone" onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
      style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(6,4,14,.72)' }}>
      <div role="dialog" aria-modal="true" aria-labelledby="lk-title" className="dialog-box pop" style={{ width: 'min(440px, 100%)', display: 'flex', flexDirection: 'column', gap: 16, padding: '26px 26px 22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Zora scale={3} />
          <div>
            <span className="pixel-label t-lime" style={{ fontSize: 10 }}>SCRIBE&apos;S DESK</span>
            <h2 id="lk-title" style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>필사실 열쇠</h2>
          </div>
        </div>
        {ok ? (
          <>
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.7, color: '#cfc6e6' }}>문이 열렸어요. 12시간 동안은 다시 묻지 않을게요.</p>
            <Link href="/write" className="pixel-btn" style={{ alignSelf: 'flex-start', fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 800 }}>필사실로 들어가기 →</Link>
          </>
        ) : (
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: '#cfc6e6' }}>새 기록은 주인만 쓸 수 있어요. 비밀번호를 입력해 주세요.</p>
            <label htmlFor="lk-pw" style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.12em', color: 'var(--muted)' }}>비밀번호</label>
            <input ref={input} id="lk-pw" type="password" value={pw} onChange={(e) => { setPw(e.target.value); setErr(''); }} autoComplete="current-password"
              style={{ minHeight: 48, padding: '0 14px', background: '#0b0d12', border: `2px solid ${err ? '#f4a08a' : '#4a3d7a'}`, color: '#edf1f7', fontSize: 16, letterSpacing: '.2em', outline: 'none' }} />
            {err && <span role="alert" style={{ fontSize: 13, color: '#f4a08a' }}>{err}</span>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" onClick={() => setOpen(false)} style={{ minHeight: 44, padding: '0 16px', cursor: 'pointer', background: 'transparent', border: '1px solid #4a3d7a', color: '#cfc6e6' }}>취소</button>
              <button type="submit" className="pixel-btn" style={{ fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 800 }}>열기</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
