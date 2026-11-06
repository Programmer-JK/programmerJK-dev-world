'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { marked } from 'marked';
import { ISLANDS, type IslandId } from '@/lib/islands';
import { CONCEPT_BY_ID, extractConcepts } from '@/lib/concepts';
import { jaccard } from '@/lib/ontology';
import type { EditablePost } from '@/lib/store';
import Zora from '@/components/Zora';

interface Lite { slug: string; title: string; concepts: string[] }
type Toast = { kind: 'ok' | 'error'; title: string; msg: string; href?: string; hrefLabel?: string };

const TOOLS: [string, string, string][] = [
  ['H2', '제목 2', '\n## 소제목\n'], ['H3', '제목 3', '\n### 작은 제목\n'], ['B', '굵게', '**강조**'],
  ['“ ”', '인용', '\n> 인용문\n'], ['•', '목록', '\n- 항목\n'], ['</>', '코드 블록', '\n```ts\ncode\n```\n'], ['↗', '링크', '[텍스트](https://)'],
];
const IMG_RE = /!\[([^\]]*)\]\((\/uploads\/[^)\s]+)(?:\s+"[^"]*")?\)/g;
const escRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export default function Editor({ posts, initial }: { posts: Lite[]; initial: EditablePost | null }) {
  const router = useRouter();
  const editing = !!initial;
  const [island, setIsland] = useState<IslandId>((initial?.island as IslandId) ?? 'library');
  const [room, setRoom] = useState(initial?.room ?? 'ai');
  const [title, setTitle] = useState(initial?.title ?? '');
  const [summary, setSummary] = useState(initial?.summary ?? '');
  const [tags, setTags] = useState(initial?.tags.join(', ') ?? '');
  const [body, setBody] = useState(initial?.content ?? '## 왜 이 글을 쓰나\n\n');
  const [preview, setPreview] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [uploading, setUploading] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [confirmImg, setConfirmImg] = useState<string | null>(null);
  const ta = useRef<HTMLTextAreaElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const cur = ISLANDS.find((i) => i.id === island)!;
  const chars = body.replace(/\s/g, '').length;
  const concepts = useMemo(() => extractConcepts(`${title}\n${summary}\n${body}`).map((c) => c.id), [title, summary, body]);
  const related = useMemo(() => posts
    .map((p) => ({ ...p, score: jaccard(p.concepts, concepts), shared: p.concepts.filter((c) => concepts.includes(c)) }))
    .filter((p) => p.shared.length > 0).sort((a, b) => b.score - a.score).slice(0, 3), [posts, concepts]);
  const images = useMemo(() => {
    const seen = new Map<string, string>();
    for (const m of body.matchAll(IMG_RE)) if (!seen.has(m[2])) seen.set(m[2], m[1]);
    return [...seen.entries()].map(([url, alt]) => ({ url, alt }));
  }, [body]);
  const html = useMemo(() => (preview ? (marked.parse(body, { async: false }) as string) : ''), [body, preview]);

  // 저장하지 않은 변경이 있으면 나가기 전에 확인
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  const change = <T,>(set: (v: T) => void) => (v: T) => { set(v); setDirty(true); };

  const checks = [
    { label: '섬과 방을 골랐어요', ok: !!room, opt: false },
    { label: '제목이 있어요', ok: title.trim().length > 1, opt: false },
    { label: '한 줄 요약이 있어요', ok: summary.trim().length > 5, opt: true },
    { label: '본문이 300자를 넘었어요', ok: chars >= 300, opt: true },
  ];
  const ready = checks.filter((c) => !c.opt && c.ok).length;
  const reqTotal = checks.filter((c) => !c.opt).length;

  /** 커서 위치에 텍스트 넣기 */
  const insert = (snip: string) => {
    const el = ta.current;
    setDirty(true);
    if (!el) { setBody((b) => b + snip); return; }
    const s = el.selectionStart, e = el.selectionEnd;
    setBody((b) => b.slice(0, s) + snip + b.slice(e));
    requestAnimationFrame(() => { el.focus(); el.selectionStart = el.selectionEnd = s + snip.length; });
  };

  // ---------------------------------------------------------------- images
  async function upload(files: FileList | File[]) {
    const list = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (list.length === 0) return;
    setUploading((n) => n + list.length);
    for (const f of list) {
      const fd = new FormData();
      fd.append('file', f);
      try {
        const r = await fetch('/api/uploads', { method: 'POST', body: fd });
        const d = (await r.json()) as { ok: boolean; url?: string; error?: string };
        if (d.ok && d.url) {
          const alt = f.name.replace(/\.[^.]+$/, '').replace(/[[\]]/g, '');
          insert(`\n![${alt}](${d.url})\n`);
        } else setToast({ kind: 'error', title: 'UPLOAD FAILED', msg: `${f.name}: ${d.error ?? '올리지 못했어요.'}` });
      } catch {
        setToast({ kind: 'error', title: 'UPLOAD FAILED', msg: `${f.name}: 네트워크 오류` });
      } finally {
        setUploading((n) => n - 1);
      }
    }
  }

  /** 본문에서 이미지 참조만 빼기 */
  const unlink = (url: string) => {
    setBody((b) => b.replace(new RegExp(`\\n?!\\[[^\\]]*\\]\\(${escRe(url)}(?:\\s+"[^"]*")?\\)\\n?`, 'g'), '\n'));
    setDirty(true);
  };

  async function removeImage(url: string) {
    setConfirmImg(null);
    const q = new URLSearchParams({ url, ...(initial ? { slug: initial.slug } : {}) });
    const r = await fetch(`/api/uploads?${q}`, { method: 'DELETE' });
    const d = (await r.json()) as { ok: boolean; deleted?: boolean; usedBy?: string[]; error?: string };
    if (!d.ok) { setToast({ kind: 'error', title: 'OOPS', msg: d.error ?? '이미지를 지우지 못했어요.' }); return; }
    unlink(url);
    if (d.usedBy && d.usedBy.length > 0) {
      setToast({ kind: 'ok', title: 'UNLINKED', msg: `다른 기록(${d.usedBy.length}편)에서도 쓰는 이미지라 파일은 남기고 이 글에서만 뺐어요. 저장해야 반영돼요.` });
    } else {
      setToast({ kind: 'ok', title: 'IMAGE REMOVED', msg: '이미지를 지웠어요. 본문 변경은 저장해야 반영돼요.' });
    }
  }

  // ---------------------------------------------------------------- save / delete
  async function save(draft: boolean) {
    if (ready < reqTotal) { setToast({ kind: 'error', title: 'CHECK', msg: '섬·방과 제목은 꼭 정해주세요.' }); return; }
    setSaving(true);
    const payload = { title, summary, island, room, content: body, draft, tags: tags.split(',').map((t) => t.trim()).filter(Boolean) };
    try {
      const r = await fetch(editing ? `/api/posts/${encodeURIComponent(initial!.slug)}` : '/api/posts', {
        method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      const d = (await r.json()) as { ok: boolean; slug?: string; href?: string; error?: string };
      if (!d.ok) { setToast({ kind: 'error', title: 'OOPS', msg: d.error ?? '저장하지 못했어요.' }); return; }
      setDirty(false);
      if (!editing && d.slug) {
        // 새 글은 저장 직후 수정 모드로 전환 (이후 저장은 같은 글을 덮어씀)
        router.replace(`/write?slug=${encodeURIComponent(d.slug)}`);
      }
      setToast({
        kind: 'ok',
        title: editing ? 'SAVED' : 'QUEST CLEAR · +40 EXP',
        msg: draft ? '초안으로 보관했어요. 목록에는 보이지 않아요.' : editing ? '변경 사항을 저장했어요.' : `“${title}”이(가) ${cur.name}에 꽂혔어요.`,
        href: draft ? undefined : d.href, hrefLabel: '읽으러 가기 →',
      });
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function removePost(withImages: boolean) {
    if (!initial) return;
    setConfirmDel(false);
    setSaving(true);
    const r = await fetch(`/api/posts/${encodeURIComponent(initial.slug)}?images=${withImages ? 1 : 0}`, { method: 'DELETE' });
    const d = (await r.json()) as { ok: boolean; redirect?: string; error?: string };
    setSaving(false);
    if (!d.ok) { setToast({ kind: 'error', title: 'OOPS', msg: d.error ?? '지우지 못했어요.' }); return; }
    setDirty(false);
    router.replace(`${d.redirect ?? '/'}?deleted=1`);
    router.refresh();
  }

  const label: React.CSSProperties = { fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.14em', color: 'var(--muted2)' };

  return (
    <>
      <div style={{ position: 'sticky', top: 0, zIndex: 5, background: 'color-mix(in srgb, var(--bg) 94%, transparent)', borderBottom: '1px solid var(--line2)' }}>
        <div className="wrap" style={{ maxWidth: 1280, paddingTop: 12, paddingBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span className="pixel-label" style={{ fontSize: 12 }}>SCRIBE&apos;S DESK · {editing ? '기록 수정' : '새 기록'}</span>
            {editing && !initial!.draft && <Link href={`/posts/${encodeURIComponent(initial!.slug)}`} style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>글 보기 ↗</Link>}
            {initial?.draft && <span className="pixel-label" style={{ fontSize: 10, padding: '3px 7px', border: '1px dashed var(--line3)', color: 'var(--muted2)' }}>DRAFT</span>}
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--muted2)' }}>{dirty ? '저장하지 않은 변경 있음' : '저장됨'}</span>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {editing && <button type="button" className="danger-btn" onClick={() => setConfirmDel(true)} disabled={saving}>삭제</button>}
            <button type="button" className="chip" style={{ minHeight: 44 }} onClick={() => setPreview((p) => !p)} aria-pressed={preview}>{preview ? '미리보기 끄기' : '미리보기 켜기'}</button>
            <button type="button" className="chip" style={{ minHeight: 44 }} onClick={() => save(true)} disabled={saving}>초안으로 저장</button>
            <button type="button" className="pixel-btn" style={{ fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 800 }} onClick={() => save(false)} disabled={saving}>
              {saving ? '저장 중…' : editing ? `변경 저장 · ${ready}/${reqTotal}` : `발행하기 · ${ready}/${reqTotal}`}
            </button>
          </div>
        </div>
      </div>

      <main className="wrap" style={{ maxWidth: 1280, paddingTop: 32, paddingBottom: 120, display: 'flex', flexWrap: 'wrap', gap: 28, alignItems: 'flex-start' }}>
        <section aria-label="작성" style={{ flex: '999 1 640px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 22 }}>
          <fieldset style={{ margin: 0, padding: 0, border: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <legend style={{ ...label, padding: 0, marginBottom: 10 }}>01 · 어느 섬에 꽂을까요</legend>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
              {ISLANDS.map((i) => {
                const on = i.id === island;
                return (
                  <button key={i.id} type="button" aria-pressed={on} onClick={() => { setIsland(i.id); setRoom(i.rooms[0].id); setDirty(true); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 72, padding: '10px 14px', cursor: 'pointer', textAlign: 'left', background: on ? `color-mix(in srgb, ${i.palette[1]} 18%, var(--surface))` : 'var(--surface)', border: `2px solid ${on ? i.palette[1] : 'var(--line)'}`, color: 'var(--text)' }}>
                    <img className="px" src={i.icon} alt="" width={32} height={32} />
                    <span style={{ display: 'flex', flexDirection: 'column' }}><strong>{i.name}</strong><span className="pixel-label" style={{ fontSize: 9, color: 'var(--muted2)' }}>{i.en}</span></span>
                  </button>
                );
              })}
            </div>
            <div role="group" aria-label={`${cur.name} · ${cur.roomLabel} 고르기`} style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {cur.rooms.map((r) => (
                <button key={r.id} type="button" aria-pressed={room === r.id} onClick={() => { setRoom(r.id); setDirty(true); }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minHeight: 40, padding: '0 12px 0 6px', cursor: 'pointer', background: room === r.id ? 'var(--surface3)' : 'transparent', border: `1px solid ${room === r.id ? cur.palette[1] : 'var(--line)'}`, color: room === r.id ? 'var(--strong)' : 'var(--text2)', fontSize: 13 }}>
                  <img className="px" src={r.icon} alt="" width={32} height={32} />{r.name}
                </button>
              ))}
            </div>
          </fieldset>

          <label style={label} htmlFor="wtitle">02 · 제목</label>
          <input id="wtitle" value={title} onChange={(e) => change(setTitle)(e.target.value)} placeholder="한 문장으로 결론을 먼저"
            style={{ marginTop: -14, minHeight: 64, padding: '0 18px', background: 'var(--surface)', border: '2px solid var(--line3)', color: 'var(--text)', fontSize: 'clamp(22px, 2.6vw, 30px)', fontWeight: 900 }} />
          <label style={label} htmlFor="wsum">03 · 한 줄 요약 (선택)</label>
          <input id="wsum" value={summary} onChange={(e) => change(setSummary)(e.target.value)} placeholder="적으면 목록과 추천 카드에 보여요"
            style={{ marginTop: -14, minHeight: 52, padding: '0 16px', background: 'var(--surface)', border: '1px solid var(--line3)', color: 'var(--text)', fontSize: 16 }} />
          <label style={label} htmlFor="wtags">04 · 태그 (쉼표로 구분, 선택)</label>
          <input id="wtags" value={tags} onChange={(e) => change(setTags)(e.target.value)} placeholder="RAG, 평가"
            style={{ marginTop: -14, minHeight: 44, padding: '0 14px', background: 'var(--surface)', border: '1px solid var(--line3)', color: 'var(--text)', fontSize: 14 }} />

          <label style={label} htmlFor="wbody">05 · 본문 · Markdown · 이미지는 끌어다 놓거나 붙여넣어도 돼요</label>
          <div style={{ marginTop: -14, border: '2px solid var(--line3)', background: 'var(--surface)' }}>
            <div role="toolbar" aria-label="서식" style={{ display: 'flex', flexWrap: 'wrap', gap: 2, padding: 6, borderBottom: '1px solid var(--line)', background: 'var(--surface2)' }}>
              {TOOLS.map(([l, aria, snip]) => (
                <button key={l} type="button" aria-label={`${aria} 넣기`} title={aria} onClick={() => insert(snip)}
                  style={{ minWidth: 40, minHeight: 40, padding: '0 10px', cursor: 'pointer', background: 'transparent', border: 0, color: 'var(--text2)', fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700 }}>{l}</button>
              ))}
              <button type="button" aria-label="이미지 올리기" title="이미지 올리기" onClick={() => fileInput.current?.click()}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: 40, padding: '0 12px', cursor: 'pointer', background: 'transparent', border: '1px solid var(--line3)', color: 'var(--text2)', fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700 }}>
                <ImageGlyph /> 이미지
              </button>
              <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/gif,image/webp,image/avif" multiple hidden
                onChange={(e) => { if (e.target.files) upload(e.target.files); e.target.value = ''; }} />
              {uploading > 0 && <span className="busy" style={{ alignSelf: 'center', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent-text)' }}>올리는 중 {uploading}</span>}
              <span style={{ marginLeft: 'auto', alignSelf: 'center', paddingRight: 8, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted2)' }}>{chars}자 · 약 {Math.max(1, Math.round(chars / 500))}분</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap' }}>
              <textarea
                ref={ta} id="wbody" value={body} spellCheck={false}
                className={dragOver ? 'dropzone-on' : undefined}
                onChange={(e) => change(setBody)(e.target.value)}
                onDragOver={(e) => { if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); setDragOver(true); } }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { if (e.dataTransfer.files.length) { e.preventDefault(); setDragOver(false); upload(e.dataTransfer.files); } }}
                onPaste={(e) => { const f = Array.from(e.clipboardData.files); if (f.length) { e.preventDefault(); upload(f); } }}
                style={{ flex: '1 1 360px', minWidth: 0, minHeight: 560, resize: 'vertical', padding: 20, background: 'transparent', border: 0, outline: 'none', color: 'var(--text)', fontFamily: 'var(--font-mono)', fontSize: 14, lineHeight: 1.85 }} />
              {preview && (
                <article aria-label="미리보기" className="prose" style={{ flex: '1 1 360px', minWidth: 0, minHeight: 560, padding: '24px 28px', borderLeft: '1px solid var(--line)', background: 'var(--bg)', fontSize: 16 }}>
                  <h1 style={{ margin: '0 0 8px', fontSize: 28, fontWeight: 900, color: 'var(--text)' }}>{title || '제목 없음'}</h1>
                  {summary && <p style={{ color: 'var(--muted)' }}>{summary}</p>}
                  <div dangerouslySetInnerHTML={{ __html: html }} />
                </article>
              )}
            </div>
          </div>
        </section>

        <aside aria-label="ZORA 작성 도우미" style={{ flex: '1 1 340px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16, position: 'sticky', top: 84 }}>
          <div className="card" style={{ padding: 20, display: 'flex', gap: 16 }}>
            <Zora scale={4} hop />
            <p aria-live="polite" style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: 'var(--text2)' }}>
              {concepts.length >= 2 ? `개념이 ${concepts.length}개 잡혔어요. 저장하면 지식 지도에 ${concepts.length + related.length}개의 연결로 들어가요.` : '본문을 쓰면 개념을 찾아 지식 지도와 이어드릴게요.'}
            </p>
          </div>

          <div className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span className="pixel-label" style={{ fontSize: 12 }}>이미지 · {images.length}</span>
              <button type="button" onClick={() => fileInput.current?.click()} style={{ background: 'none', border: 0, cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent-text)', padding: '6px 0' }}>+ 추가</button>
            </div>
            {images.length === 0 && <span style={{ fontSize: 13, color: 'var(--muted2)' }}>본문에 넣은 이미지가 여기 모여요. 5MB 이하 PNG·JPG·GIF·WEBP.</span>}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(92px, 1fr))', gap: 8 }}>
              {images.map((img) => (
                <figure key={img.url} style={{ margin: 0, position: 'relative', border: '1px solid var(--line)', background: 'var(--surface2)' }}>
                  <img src={img.url} alt={img.alt} style={{ display: 'block', width: '100%', aspectRatio: '1 / 1', objectFit: 'cover' }} />
                  <figcaption style={{ padding: '4px 6px', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{img.alt || '이미지'}</figcaption>
                  {confirmImg === img.url ? (
                    <div className="dark-zone pop" style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, background: 'rgba(11,13,18,.88)' }}>
                      <span style={{ fontSize: 12 }}>지울까요?</span>
                      <button type="button" onClick={() => removeImage(img.url)} style={{ minHeight: 32, padding: '0 10px', cursor: 'pointer', background: '#c2410c', border: 0, color: '#fff', fontSize: 12, fontWeight: 700 }}>파일 삭제</button>
                      <button type="button" onClick={() => { unlink(img.url); setConfirmImg(null); }} style={{ minHeight: 28, padding: '0 8px', cursor: 'pointer', background: 'transparent', border: '1px solid var(--line3)', color: 'var(--text2)', fontSize: 11 }}>글에서만 빼기</button>
                      <button type="button" onClick={() => setConfirmImg(null)} style={{ background: 'none', border: 0, cursor: 'pointer', color: 'var(--muted)', fontSize: 11 }}>취소</button>
                    </div>
                  ) : (
                    <button type="button" aria-label={`${img.alt || '이미지'} 삭제`} onClick={() => setConfirmImg(img.url)}
                      style={{ position: 'absolute', top: 4, right: 4, width: 26, height: 26, cursor: 'pointer', background: '#111', border: '1px solid #3a4555', color: '#fff', fontSize: 12 }}>✕</button>
                  )}
                </figure>
              ))}
            </div>
          </div>

          <div className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <span className="pixel-label" style={{ fontSize: 12 }}>찾아낸 개념</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {concepts.map((c) => <span key={c} className="pop" style={{ fontFamily: 'var(--font-mono)', fontSize: 12, padding: '5px 9px', border: '1px solid var(--line3)' }}>{CONCEPT_BY_ID.get(c)?.label}</span>)}
              {concepts.length === 0 && <span style={{ fontSize: 13, color: 'var(--muted2)' }}>아직 아는 개념이 없어요.</span>}
            </div>
          </div>
          <div className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span className="pixel-label" style={{ fontSize: 12 }}>이어질 기록</span>
            {related.map((r) => (
              <div key={r.slug} style={{ minWidth: 0, padding: '10px 12px', background: 'var(--surface2)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <strong style={{ fontSize: 14, lineHeight: 1.5 }}>{r.title}</strong>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted2)' }}>공통 {r.shared.map((c) => CONCEPT_BY_ID.get(c)?.label).join(' · ')}</span>
              </div>
            ))}
            {related.length === 0 && <span style={{ fontSize: 13, color: 'var(--muted2)' }}>개념이 잡히면 비슷한 기록을 찾아드릴게요.</span>}
          </div>
          <div className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span className="pixel-label" style={{ fontSize: 12 }}>저장 전 체크 <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted2)' }}>· 필수 2 · 선택 2</span></span>
            {checks.map((c) => (
              <span key={c.label} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: c.ok ? 'var(--text)' : 'var(--muted2)' }}>
                <span aria-hidden style={{ flex: '0 0 auto', width: 16, height: 16, border: c.opt && !c.ok ? '2px dashed var(--line3)' : '2px solid var(--ink)', background: c.ok ? 'var(--lime)' : 'transparent', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#111', fontWeight: 900 }}>{c.ok ? '✓' : ''}</span>
                {c.label}
                {c.opt && <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 10, padding: '2px 6px', border: '1px solid var(--line3)', color: 'var(--muted2)' }}>선택</span>}
              </span>
            ))}
          </div>
        </aside>
      </main>

      {confirmDel && initial && <DeleteDialog title={title || initial.title} imageCount={images.length} onCancel={() => setConfirmDel(false)} onConfirm={removePost} />}

      {toast && (
        <div role="status" className="dark-zone pop" style={{ position: 'fixed', left: '50%', bottom: 32, zIndex: 20, transform: 'translateX(-50%)', width: 'min(520px, calc(100% - 32px))', display: 'flex', alignItems: 'center', gap: 16, padding: '18px 20px', background: '#111', border: `3px solid ${toast.kind === 'ok' ? 'var(--lime)' : '#f4a08a'}`, boxShadow: '6px 6px 0 rgba(0,0,0,.4)' }}>
          <Zora scale={3} hop />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span className="pixel-label" style={{ fontSize: 12, color: toast.kind === 'ok' ? 'var(--lime)' : '#f4a08a' }}>{toast.title}</span>
            <span style={{ fontSize: 14, color: '#e6ebf2' }}>{toast.msg} {toast.href && <Link href={toast.href}>{toast.hrefLabel}</Link>}</span>
          </div>
          <button type="button" aria-label="알림 닫기" onClick={() => setToast(null)} style={{ width: 40, height: 40, cursor: 'pointer', background: 'transparent', border: '1px solid #3a4555', color: '#fff' }}>✕</button>
        </div>
      )}
    </>
  );
}

function DeleteDialog({ title, imageCount, onCancel, onConfirm }: { title: string; imageCount: number; onCancel: () => void; onConfirm: (withImages: boolean) => void }) {
  const [withImages, setWithImages] = useState(true);
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    cancelRef.current?.focus();
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onCancel]);

  return (
    <div className="dark-zone" onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
      style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(6,4,14,.72)' }}>
      <div role="alertdialog" aria-modal="true" aria-labelledby="del-title" aria-describedby="del-desc" className="pop"
        style={{ width: 'min(460px, 100%)', display: 'flex', flexDirection: 'column', gap: 16, padding: '26px 26px 22px', background: '#1a0f0c', border: '4px solid #f4c095', boxShadow: 'inset 0 0 0 4px #7a2e14, 8px 8px 0 rgba(0,0,0,.45)', color: '#edf1f7' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <img className="px" src="/pixel/icon-ruins.png" alt="" width={64} height={64} />
          <div>
            <span className="pixel-label" style={{ fontSize: 10, color: '#f4a08a' }}>DELETE RECORD</span>
            <h2 id="del-title" style={{ margin: 0, fontSize: 21, fontWeight: 900 }}>이 기록을 지울까요?</h2>
          </div>
        </div>
        <p id="del-desc" style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: '#f0dcc4' }}>
          「{title}」이(가) 섬에서 사라지고, 지식 지도의 연결도 함께 없어져요. 되돌릴 수 없어요.
        </p>
        {imageCount > 0 && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, cursor: 'pointer' }}>
            <input type="checkbox" checked={withImages} onChange={(e) => setWithImages(e.target.checked)} style={{ width: 18, height: 18, accentColor: '#c2410c' }} />
            이 글에 쓴 이미지 {imageCount}개도 지우기 <span style={{ fontSize: 12, color: '#aeb7c6' }}>(다른 글이 쓰는 이미지는 남겨요)</span>
          </label>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button ref={cancelRef} type="button" onClick={onCancel} style={{ minHeight: 44, padding: '0 16px', cursor: 'pointer', background: 'transparent', border: '1px solid #7a4a2a', color: '#f0dcc4' }}>취소</button>
          <button type="button" onClick={() => onConfirm(withImages)} style={{ minHeight: 44, padding: '0 18px', cursor: 'pointer', background: '#c2410c', border: '2px solid #111', color: '#fff', fontWeight: 800, boxShadow: '3px 3px 0 #111' }}>삭제하기</button>
        </div>
      </div>
    </div>
  );
}

function ImageGlyph() {
  return (
    <svg aria-hidden width="16" height="16" viewBox="0 0 16 16" fill="currentColor" shapeRendering="crispEdges">
      <rect x="1" y="2" width="14" height="1" /><rect x="1" y="13" width="14" height="1" /><rect x="1" y="2" width="1" height="12" /><rect x="14" y="2" width="1" height="12" />
      <rect x="4" y="5" width="2" height="2" /><rect x="3" y="11" width="10" height="1" /><rect x="5" y="10" width="3" height="1" /><rect x="6" y="9" width="1" height="1" /><rect x="9" y="8" width="2" height="3" /><rect x="10" y="7" width="1" height="1" />
    </svg>
  );
}
