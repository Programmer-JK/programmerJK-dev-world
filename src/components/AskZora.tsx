'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import Zora from './Zora';
import type { AskEvent, AskResult, AskSegment, AskTurn } from '@/lib/ask';

const SUGGEST = ['RAG는 어떤 순서로 읽으면 좋아?', 'LangGraph는 왜 도입했어?', '최근엔 어떤 프로젝트를 했어?', '요즘 관심사가 뭐야?'];
const HISTORY_KEY = 'zora-ask-history';

/**
 * 히어로의 "궁금한 걸 물어보세요".
 * /api/ask 스트림(meta → delta… → done)을 받아 단계 → 출처 → 출처 번호가 붙은 답 순서로 보여줍니다.
 * 최근 3턴은 sessionStorage에 두고 다음 질문과 함께 보내서 "그거 단점은?" 같은 후속 질문을 이어갑니다.
 */
export default function AskZora() {
  const [draft, setDraft] = useState('');
  const [res, setRes] = useState<AskResult | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [history, setHistory] = useState<AskTurn[]>([]);
  const ctrl = useRef<AbortController | null>(null);

  useEffect(() => {
    try {
      const h = JSON.parse(sessionStorage.getItem(HISTORY_KEY) ?? '[]');
      if (Array.isArray(h)) setHistory(h.slice(-3));
    } catch { /* 저장소를 못 쓰면 기록 없이 시작 */ }
    return () => ctrl.current?.abort();
  }, []);

  const saveHistory = (next: AskTurn[]) => {
    setHistory(next);
    try { sessionStorage.setItem(HISTORY_KEY, JSON.stringify(next)); } catch { /* 무시 */ }
  };

  async function ask(q: string) {
    const question = q.trim();
    if (!question) return;
    ctrl.current?.abort(); // 답변 중에 새 질문을 하면 이전 답변은 멈춤
    const ac = new AbortController();
    ctrl.current = ac;
    setDraft('');
    setStreaming(true);
    setRes({ question, steps: [], sources: [], answer: [], follow: [], found: true });

    let final: AskSegment[] = [];
    const apply = (ev: AskEvent) => {
      if (ev.type === 'meta') {
        const { type: _t, ...meta } = ev;
        setRes({ ...meta, answer: [] });
      } else if (ev.type === 'delta') {
        setRes((p) => p && { ...p, answer: [...p.answer, { text: ev.text, cite: ev.cite }] });
      } else {
        final = ev.answer;
        setRes((p) => p && { ...p, answer: ev.answer });
      }
    };

    try {
      const r = await fetch('/api/ask', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: question, history }), signal: ac.signal,
      });
      if (!r.ok || !r.body) throw new Error(String(r.status));
      const reader = r.body.pipeThrough(new TextDecoderStream()).getReader();
      let buf = '';
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += value;
        let i: number;
        while ((i = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, i).trim();
          buf = buf.slice(i + 1);
          if (line) apply(JSON.parse(line) as AskEvent);
        }
      }
    } catch {
      if (ac.signal.aborted) return;
      setRes((p) => p && { ...p, answer: [{ text: '답을 가져오지 못했어요. 잠시 후 다시 물어봐 주세요.', cite: 0 }] });
    } finally {
      if (ctrl.current === ac) setStreaming(false);
    }
    if (final.length) saveHistory([...history, { q: question, a: final.map((s) => s.text).join('').slice(0, 500) }].slice(-3));
  }

  return (
    <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <form onSubmit={(e) => { e.preventDefault(); ask(draft); }}
        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 8px 8px 14px', background: '#0b0d12', border: '2px solid #6b5aa6' }}>
        <Zora scale={2} />
        <label htmlFor="ask" className="sr-only">ZORA에게 묻기</label>
        <input id="ask" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={history.length ? '이어서 물어보세요' : '궁금한 걸 물어보세요'} autoComplete="off"
          style={{ flex: '1 1 auto', minWidth: 0, minHeight: 48, padding: '0 6px', background: 'transparent', border: 0, outline: 'none', color: '#edf1f7', fontSize: 16 }} />
        <button type="submit" className="pixel-btn">{streaming ? '답하는 중…' : '묻기 ↵'}</button>
      </form>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {SUGGEST.map((s) => <button key={s} type="button" className="chip" style={{ borderColor: '#4a3d7a', color: '#cfc6e6' }} onClick={() => ask(s)}>{s}</button>)}
        {history.length > 0 && (
          <button type="button" className="chip" style={{ borderColor: 'var(--line3)', color: 'var(--muted)' }} onClick={() => saveHistory([])}>새 대화 · 기록 {history.length}턴 지우기</button>
        )}
      </div>

      {res && (
        <div aria-live="polite" aria-busy={streaming} className="pop" style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '16px 18px', background: '#0b0d12', border: '2px solid #3b2a74' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 700 }}><span className="pixel-label" style={{ fontSize: 10, color: 'var(--muted2)', marginRight: 6 }}>Q.</span>{res.question}</span>
            <button type="button" aria-label="답변 닫기" onClick={() => { ctrl.current?.abort(); setStreaming(false); setRes(null); }} style={{ width: 32, height: 32, cursor: 'pointer', background: 'transparent', border: '1px solid var(--line3)', color: 'var(--muted)' }}>✕</button>
          </div>
          <ol aria-label="ZORA가 한 일" style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexWrap: 'wrap', gap: '4px 14px' }}>
            {(res.steps.length ? res.steps : ['질문을 읽는 중']).map((t, i, all) => {
              const run = streaming && i === all.length - 1, dn = !run;
              return (
                <li key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-mono)', fontSize: 11, color: run ? 'var(--text)' : 'var(--text2)' }}>
                  <span aria-hidden className={run ? 'busy' : undefined} style={{ width: 8, height: 8, background: dn ? 'var(--lime)' : 'transparent', border: '1px solid var(--lime)' }} />{t}
                </li>
              );
            })}
          </ol>
          <p style={{ margin: 0, minHeight: 52, fontSize: 15, lineHeight: 1.8 }}>
            {res.answer.map((s, i) => (
              <span key={i}>{s.text}{s.cite > 0 && (
                <a href={res.sources[s.cite - 1]?.href} aria-label={`출처 ${s.cite}`} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 16, height: 16, margin: '0 2px', padding: '0 4px', verticalAlign: 2, fontFamily: 'var(--font-mono)', fontSize: 10, background: 'var(--line)', color: 'var(--text2)' }}>{s.cite}</a>
              )}</span>
            ))}
            {streaming && <span className="caret" aria-hidden style={{ display: 'inline-block', width: 7, height: '1em', marginLeft: 2, verticalAlign: '-0.12em', background: 'var(--lime)' }} />}
          </p>
          {res.sources.length > 0 && (
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
          {!streaming && res.follow.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {res.follow.map((f) => <button key={f} type="button" className="chip" style={{ borderColor: '#4a3d7a', color: '#cfc6e6', fontSize: 12 }} onClick={() => ask(f)}>↳ {f}</button>)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
