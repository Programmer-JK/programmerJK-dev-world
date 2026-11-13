'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import type { PostMeta, Project } from '@/lib/content';
import PostRow from '@/components/PostRow';

const ST = {
  growing: { label: '자라는 중', tag: 'GROWING', c: '#d7f36b', icon: '/pixel/icon-forest.png', dim: false },
  grown: { label: '다 자란 나무', tag: 'GROWN', c: '#40916c', icon: '/pixel/icon-forest.png', dim: false },
  stopped: { label: '중도에 멈춘 나무', tag: 'STOPPED', c: '#a39a8c', icon: '/pixel/icon-forest.png', dim: true },
  ruins: { label: '유적이 된 것', tag: 'RUINS', c: '#e08a4f', icon: '/pixel/icon-ruins.png', dim: false },
} as const;

export default function ForestGrid({ projects, related, ruins }: { projects: Project[]; related: Record<string, PostMeta[]>; ruins: Record<string, number> }) {
  const [filter, setFilter] = useState<'all' | Project['status']>('all');
  const [open, setOpen] = useState<Project | null>(null); // "관련 기록" 팝업
  const opts = [{ id: 'all' as const, label: '전체', c: '#8d9bb3' }, ...(Object.keys(ST) as Project['status'][]).map((k) => ({ id: k, label: ST[k].label, c: ST[k].c }))];
  const list = projects.filter((p) => filter === 'all' || p.status === filter);
  const router = useRouter();
  const [canEdit, setCanEdit] = useState(false);
  const [editing, setEditing] = useState<string | null>(null); // slug, 또는 새 나무는 NEW
  const [error, setError] = useState('');
  useEffect(() => {
    fetch('/api/scribe/me').then((r) => r.json()).then((d: { ok: boolean }) => setCanEdit(d.ok)).catch(() => { });
  }, []);

  async function save(next: Project[]) {
    setError('');
    const res = await fetch('/api/projects', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(next) });
    const d = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    if (!res.ok || !d.ok) { setError(d.error ?? '저장하지 못했어요.'); return false; }
    setEditing(null);
    router.refresh();
    return true;
  }
  const replace = (slug: string, p: Project) => save(slug === NEW ? [...projects, p] : projects.map((x) => (x.slug === slug ? p : x)));
  const remove = (p: Project) => { if (confirm(`"${p.name}" 나무를 숲에서 지울까요?`)) save(projects.filter((x) => x.slug !== p.slug)); };

  return (
    <>
      <div role="group" aria-label="나무 상태로 거르기" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
        {opts.map((o) => (
          <button key={o.id} type="button" aria-pressed={filter === o.id} onClick={() => setFilter(o.id)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minHeight: 44, padding: '0 14px', cursor: 'pointer', background: filter === o.id ? 'var(--surface3)' : 'transparent', border: `1px solid ${filter === o.id ? o.c : 'var(--line)'}`, color: 'var(--text2)', fontFamily: 'var(--font-mono)', fontSize: 13 }}>
            <span aria-hidden style={{ width: 10, height: 10, background: o.c, border: '1px solid var(--ink)' }} />{o.label} · {o.id === 'all' ? projects.length : projects.filter((p) => p.status === o.id).length}
          </button>
        ))}
      </div>
      {error && <p role="alert" style={{ margin: '0 0 16px', color: '#e08a4f' }}>{error}</p>}
      {canEdit && editing !== NEW && (
        <button type="button" className="pixel-btn" onClick={() => setEditing(NEW)} style={{ marginBottom: 20 }}>+ 새 나무 심기</button>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
        {editing === NEW && <ProjectForm onSave={(p) => replace(NEW, p)} onCancel={() => setEditing(null)} />}
        {list.length === 0 && editing !== NEW && (
          <p style={{ gridColumn: '1 / -1', margin: 0, padding: '40px 0', textAlign: 'center', color: 'var(--muted2)', border: '1px dashed var(--line3)' }}>
            {filter === 'all' ? '아직 심은 나무가 없어요.' : `'${ST[filter].label}' 상태인 나무가 없어요.`}
          </p>
        )}
        {list.map((p, i) => {
          const st = ST[p.status];
          if (editing === p.slug) return <ProjectForm key={p.slug} initial={p} onSave={(n) => replace(p.slug, n)} onCancel={() => setEditing(null)} />;
          return (
            <article key={p.slug} className="card lift" style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, padding: '20px 22px 16px', borderBottom: '1px solid var(--line)', background: `color-mix(in srgb, ${st.c} 12%, var(--surface))` }}>
                <img className="px" src={st.icon} alt="" width={64} height={64} style={st.dim ? { filter: 'grayscale(1)', opacity: 0.6 } : undefined} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span className="pixel-label" style={{ alignSelf: 'flex-start', fontSize: 10, padding: '3px 8px', background: st.c, color: '#111' }}>{st.tag} · {st.label}</span>
                  <h2 style={{ margin: 0, fontSize: 21, fontWeight: 900 }}>{p.name}</h2>
                </div>
                <div aria-label={`성장도 ${p.growth} / 5`} style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 40 }}>
                  {[0, 1, 2, 3, 4].map((k) => <span key={k} className="seg" style={{ width: 7, height: 8 + k * 7, background: k < p.growth ? st.c : 'var(--line2)', border: '1px solid var(--ink)', animationDelay: `${0.2 + i * 0.08 + k * 0.08}s` }} />)}
                </div>
              </div>
              <div style={{ padding: '18px 22px 20px', display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
                <p style={{ margin: 0, fontSize: 15, lineHeight: 1.7, color: 'var(--text2)' }}>{p.summary || <Empty />}</p>
                <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px 14px', fontSize: 13 }}>
                  <dt style={{ fontFamily: 'var(--font-mono)', color: 'var(--muted2)' }}>역할</dt><dd style={{ margin: 0 }}>{p.role || <Empty />}</dd>
                  <dt style={{ fontFamily: 'var(--font-mono)', color: 'var(--muted2)' }}>기간</dt><dd style={{ margin: 0 }}>{p.period || <Empty />}</dd>
                </dl>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{p.stack.length === 0 && <Empty label="기술 없음" />}{p.stack.map((s) => <span key={s} style={{ fontFamily: 'var(--font-mono)', fontSize: 11, padding: '4px 8px', background: 'var(--surface2)', color: 'var(--muted)' }}>{s}</span>)}</div>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {p.outcomes.length === 0 && <li><Empty label="성과 없음" /></li>}
                  {p.outcomes.map((o) => <li key={o} style={{ display: 'flex', gap: 10, fontSize: 14, lineHeight: 1.6, color: 'var(--text2)' }}><span aria-hidden style={{ flex: '0 0 8px', height: 8, marginTop: 7, background: st.c, border: '1px solid var(--ink)' }} />{o}</li>)}
                </ul>
                <div style={{ marginTop: 'auto', paddingTop: 12, borderTop: '1px solid var(--line2)', display: 'flex', gap: 16, fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                  {(related[p.slug]?.length ?? 0) > 0
                    ? <button type="button" onClick={() => setOpen(p)} aria-haspopup="dialog" style={{ ...linkBtn, color: 'var(--accent-text)' }}>관련 기록 {related[p.slug].length}편 →</button>
                    : <span style={{ color: 'var(--muted2)' }}>관련 기록 0편</span>}
                  {(ruins[p.slug] ?? 0) > 0 && <a href="#ruins" className="t-sand" style={{ alignSelf: 'center' }}>유적 {ruins[p.slug]}곳 →</a>}
                {canEdit && <span style={{ marginLeft: 'auto', display: 'flex', gap: 12 }}>
                  <button type="button" onClick={() => setEditing(p.slug)} style={linkBtn}>수정</button>
                  <button type="button" onClick={() => remove(p)} style={{ ...linkBtn, color: '#e08a4f' }}>삭제</button>
                </span>}
              </div>
            </div>
            </article>
      );
        })}
    </div >
      { open && <RecordsDialog project={open} posts={related[open.slug] ?? []} onClose={() => setOpen(null)} />
}
    </>
  );
}

/** 프로젝트 카드의 "관련 기록" 팝업: Esc · 바깥 클릭 · ✕로 닫고, 닫으면 누른 버튼으로 포커스를 돌려줍니다. */
function RecordsDialog({ project, posts, onClose }: { project: Project; posts: PostMeta[]; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const back = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k);
    return () => { window.removeEventListener('keydown', k); document.body.style.overflow = overflow; back?.focus(); };
  }, [onClose]);

  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(6,14,10,.72)' }}>
      <div role="dialog" aria-modal="true" aria-labelledby="rec-title" className="pop"
        style={{ width: 'min(760px, 100%)', maxHeight: 'min(80vh, 720px)', display: 'flex', flexDirection: 'column', background: 'var(--bg)', border: '3px solid #40916c', boxShadow: '8px 8px 0 rgba(0,0,0,.45)', color: 'var(--text)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '18px 20px', borderBottom: '2px solid var(--line3)' }}>
          <img className="px" src="/pixel/icon-forest.png" alt="" width={40} height={40} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <span className="pixel-label t-lime" style={{ fontSize: 10 }}>RELATED RECORDS · {posts.length}</span>
            <h2 id="rec-title" style={{ margin: 0, fontSize: 20, fontWeight: 900 }}>「{project.name}」 관련 기록</h2>
          </div>
          <button ref={closeRef} type="button" aria-label="닫기" onClick={onClose} style={{ width: 40, height: 40, flex: '0 0 auto', cursor: 'pointer', background: 'transparent', border: '1px solid var(--line3)', color: 'var(--muted)' }}>✕</button>
        </div>
        <div style={{ overflowY: 'auto', padding: '0 8px 8px' }}>
          {posts.map((p) => <PostRow key={p.slug} post={p} />)}
        </div>
      </div>
    </div>
  );
}

const NEW = '__new__';
const Empty = ({ label = '없음' }: { label?: string }) => <span style={{ color: 'var(--muted2)', fontSize: 13 }}>{label}</span>;
const linkBtn: React.CSSProperties = { background: 'none', border: 0, padding: 0, minHeight: 24, cursor: 'pointer', color: 'var(--muted)', font: 'inherit' };
const field: React.CSSProperties = { width: '100%', minHeight: 40, padding: '6px 10px', background: 'var(--surface)', border: '1px solid var(--line3)', color: 'var(--text)', fontSize: 14, font: 'inherit' };
const lines = (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean);

function ProjectForm({ initial, onSave, onCancel }: { initial?: Project; onSave: (p: Project) => Promise<boolean>; onCancel: () => void }) {
  const [p, setP] = useState<Project>(initial ?? { slug: '', name: '', status: 'growing', growth: 1, summary: '', role: '', period: '', stack: [], outcomes: [] });
  const [stack, setStack] = useState((initial?.stack ?? []).join(', '));
  const [outcomes, setOutcomes] = useState((initial?.outcomes ?? []).join('\n'));
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof Project>(k: K) => (v: Project[K]) => setP((x) => ({ ...x, [k]: v }));
  const row = (label: string, el: React.ReactNode) => <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--muted2)' }}>{label}{el}</label>;

  return (
    <form className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 20 }}
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        await onSave({ ...p, stack: stack.split(',').map((x) => x.trim()).filter(Boolean), outcomes: lines(outcomes) });
        setBusy(false);
      }}>
      {row('이름', <input required value={p.name} onChange={(e) => set('name')(e.target.value)} style={field} />)}
      {row('id (주소용 · 글의 project: 값)', <input required value={p.slug} readOnly={!!initial} onChange={(e) => set('slug')(e.target.value)} placeholder="my-project" style={{ ...field, opacity: initial ? 0.6 : 1 }} />)}
      <div style={{ display: 'flex', gap: 12 }}>
        {row('상태', <select value={p.status} onChange={(e) => set('status')(e.target.value as Project['status'])} style={field}>
          {(Object.keys(ST) as Project['status'][]).map((k) => <option key={k} value={k}>{ST[k].label}</option>)}
        </select>)}
        {row('성장도 0~5', <input type="number" min={0} max={5} value={p.growth} onChange={(e) => set('growth')(Number(e.target.value))} style={field} />)}
      </div>
      {row('소개', <textarea rows={3} value={p.summary} onChange={(e) => set('summary')(e.target.value)} style={field} />)}
      {row('역할', <input value={p.role} onChange={(e) => set('role')(e.target.value)} style={field} />)}
      {row('기간', <input value={p.period} onChange={(e) => set('period')(e.target.value)} placeholder="2026.01 – 2026.03" style={field} />)}
      {row('기술 (쉼표로 구분)', <input value={stack} onChange={(e) => setStack(e.target.value)} style={field} />)}
      {row('성과 (한 줄에 하나)', <textarea rows={3} value={outcomes} onChange={(e) => setOutcomes(e.target.value)} style={field} />)}
      <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
        <button type="submit" className="pixel-btn" disabled={busy}>{busy ? '저장 중…' : '저장'}</button>
        <button type="button" onClick={onCancel} style={{ ...linkBtn, padding: '0 12px' }}>취소</button>
      </div>
    </form>
  );
}
