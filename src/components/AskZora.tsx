'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import Zora from './Zora';
import type { AskResult } from '@/lib/ask';

const SUGGEST = ['RAG는 어떤 순서로 읽으면 좋아?', 'LangGraph는 왜 도입했어?', '최근엔 어떤 프로젝트를 했어?', '요즘 관심사가 뭐야?'];

/**
 * 히어로의 "궁금한 걸 물어보세요".
 * /api/ask 결과를 단계 → 출처 → 출처 번호가 붙은 답 순서로 보여줍니다. (스트리밍처럼 보이게 클라이언트에서 한 글자씩 노출)
 */
export default function AskZora() {
  const [draft, setDraft] = useState('');
  const [res, setRes] = useState<AskResult | null>(null);
  const [tick, setTick] = useState(0);
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const total = res ? res.answer.reduce((n, s) => n + s.text.length, 0) : 0;
  const stepN = Math.min(3, Math.floor(tick / 12));
  const budget = Math.max(0, (tick - 36) * 2);

  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  async function ask(q: string) {
    const question = q.trim();
    if (!question || loading) return;
    setLoading(true);
    setDraft('');
    try {
      const r = await fetch('/api/ask', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ q: question }) });
      const data = (await r.json()) as AskResult;
      setRes(data);
      setTick(0);
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (timer.current) clearInterval(timer.current);
      if (reduce) { setTick(9999); return; }
      const end = 36 + data.answer.reduce((n, s) => n + s.text.length, 0) / 2 + 2;
      timer.current = setInterval(() => setTick((t) => { if (t >= end && timer.current) clearInterval(timer.current); return t + 1; }), 40);
    } finally {
      setLoading(false);
    }
  }

  let left = budget;
  const segs = (res?.answer ?? []).flatMap((s) => {
    if (left <= 0) return [];
    const text = s.text.slice(0, left);
    left -= s.text.length;
    return [{ ...s, text, done: text.length === s.text.length }];
  });
  const done = !!res && budget >= total;

  return (
    <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <form onSubmit={(e) => { e.preventDefault(); ask(draft); }}
        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 8px 8px 14px', background: '#0b0d12', border: '2px solid #6b5aa6' }}>
        <Zora scale={2} />
        <label htmlFor="ask" className="sr-only">ZORA에게 묻기</label>
        <input id="ask" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="궁금한 걸 물어보세요" autoComplete="off"
          style={{ flex: '1 1 auto', minWidth: 0, minHeight: 48, padding: '0 6px', background: 'transparent', border: 0, outline: 'none', color: '#edf1f7', fontSize: 16 }} />
        <button type="submit" className="pixel-btn" disabled={loading}>{loading ? '읽는 중…' : '묻기 ↵'}</button>
      </form>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {SUGGEST.map((s) => <button key={s} type="button" className="chip" style={{ borderColor: '#4a3d7a', color: '#cfc6e6' }} onClick={() => ask(s)}>{s}</button>)}
      </div>

      {res && (
        <div aria-live="polite" aria-busy={!done} className="pop" style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '16px 18px', background: '#0b0d12', border: '2px solid #3b2a74' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 700 }}><span className="pixel-label" style={{ fontSize: 10, color: 'var(--muted2)', marginRight: 6 }}>Q.</span>{res.question}</span>
            <button type="button" aria-label="답변 닫기" onClick={() => setRes(null)} style={{ width: 32, height: 32, cursor: 'pointer', background: 'transparent', border: '1px solid var(--line3)', color: 'var(--muted)' }}>✕</button>
          </div>
          <ol aria-label="ZORA가 한 일" style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexWrap: 'wrap', gap: '4px 14px' }}>
            {res.steps.map((t, i) => {
              const dn = i < stepN, run = i === stepN;
              return (
                <li key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-mono)', fontSize: 11, color: dn ? 'var(--text2)' : run ? 'var(--text)' : 'var(--faint)' }}>
                  <span aria-hidden className={run ? 'busy' : undefined} style={{ width: 8, height: 8, background: dn ? 'var(--lime)' : 'transparent', border: `1px solid ${dn || run ? 'var(--lime)' : 'var(--line3)'}` }} />{t}
                </li>
              );
            })}
          </ol>
          <p style={{ margin: 0, minHeight: 52, fontSize: 15, lineHeight: 1.8 }}>
            {segs.map((s, i) => (
              <span key={i}>{s.text}{s.cite > 0 && s.done && (
                <a href={res.sources[s.cite - 1]?.href} aria-label={`출처 ${s.cite}`} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 16, height: 16, margin: '0 2px', padding: '0 4px', verticalAlign: 2, fontFamily: 'var(--font-mono)', fontSize: 10, background: 'var(--line)', color: 'var(--text2)' }}>{s.cite}</a>
              )}</span>
            ))}
            {stepN >= 3 && !done && <span className="caret" aria-hidden style={{ display: 'inline-block', width: 7, height: '1em', marginLeft: 2, verticalAlign: '-0.12em', background: 'var(--lime)' }} />}
          </p>
          {stepN >= 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {res.sources.map((s, i) => (
                <Link key={s.slug} href={s.href} className="pop" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', background: 'var(--surface)', border: '1px solid var(--line2)', color: 'var(--text)', fontSize: 13, animationDelay: `${i * 0.12}s` }}>
                  <span className="pixel-label" style={{ flex: '0 0 18px', height: 18, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, background: 'var(--line2)' }}>{s.n}</span>
                  <img className="px" src={s.icon} alt="" width={16} height={16} />
                  <span style={{ flex: '1 1 auto', minWidth: 0 }}>{s.title}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted2)', whiteSpace: 'nowrap' }}>{s.place}</span>
                </Link>
              ))}
            </div>
          )}
          {done && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {res.follow.map((f) => <button key={f} type="button" className="chip" style={{ borderColor: '#4a3d7a', color: '#cfc6e6', fontSize: 12 }} onClick={() => ask(f)}>↳ {f}</button>)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
