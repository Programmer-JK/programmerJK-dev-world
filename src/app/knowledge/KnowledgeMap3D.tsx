'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Graph, GraphNode, Layer, Pred } from '@/lib/ontology';

/**
 * 온톨로지 3D 지도 — 라이브러리 없이 DOM + 원근 투영으로 그립니다.
 * 층마다 링(고리) 위에 노드를 놓고 y축 회전(자동/드래그) + x축 기울기를 적용합니다.
 * 노드가 수백 개로 늘면 react-three-fiber나 react-force-graph-3d로 교체하는 것을 권장합니다.
 */
const LAYERS: { id: Layer; name: string; y: number; r: number; c: string }[] = [
  { id: 'domain', name: 'DOMAIN · 서가', y: -200, r: 150, c: '#e0aaff' },
  { id: 'concept', name: 'CONCEPT · 개념', y: -60, r: 300, c: '#8db5d4' },
  { id: 'doc', name: 'DOCUMENT · 기록', y: 80, r: 250, c: '#d7f36b' },
  { id: 'project', name: 'PROJECT · 맥락', y: 200, r: 120, c: '#f4c095' },
];
const PRED: Record<Pred, { name: string; c: string; dash?: boolean }> = {
  BELONGS: { name: '분류', c: '#6b7686' },
  RELATES: { name: '연관', c: '#8db5d4' },
  ABOUT: { name: '다룬다', c: '#e0aaff' },
  PART_OF: { name: '속한다', c: '#f4c095' },
  SIMILAR: { name: '비슷하다', c: '#d7f36b', dash: true },
};
const W = 900, H = 640;

export default function KnowledgeMap3D({ graph }: { graph: Graph }) {
  const [yaw, setYaw] = useState(0.4);
  const [pitch, setPitch] = useState(-0.42);
  const [auto, setAuto] = useState(true);
  // 계층형: 처음엔 최상위 층만 보이고, 펼친(open) 노드의 이웃만 드러납니다.
  const [focus, setFocus] = useState('');
  const [open, setOpen] = useState<Set<string>>(new Set());
  const select = (id: string) => { setFocus(id); setOpen((s) => new Set(s).add(id)); };
  const toggle = (id: string) => {
    if (focus === id && open.has(id)) setOpen((s) => { const t = new Set(s); t.delete(id); return t; });
    else select(id);
  };
  const [layers, setLayers] = useState<Record<Layer, boolean>>({ domain: true, concept: true, doc: true, project: true });
  const [preds, setPreds] = useState<Record<Pred, boolean>>({ BELONGS: true, RELATES: true, ABOUT: true, PART_OF: true, SIMILAR: true });
  const drag = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setAuto(false); return; }
    let raf = 0, prev = 0;
    const tick = (t: number) => {
      if (t - prev > 33) { const dt = prev ? t - prev : 16; prev = t; if (auto && !drag.current) setYaw((y) => y + dt * 0.00018); }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [auto]);

  // 층별 각도 배치 (같은 서가의 개념/기록이 가까이 모이도록 정렬)
  const angle = useMemo(() => {
    const m = new Map<string, number>();
    for (const L of LAYERS) {
      const ns = graph.nodes.filter((n) => n.layer === L.id).sort((a, b) => (a.color ?? '').localeCompare(b.color ?? '') || a.id.localeCompare(b.id));
      ns.forEach((n, i) => m.set(n.id, (i / Math.max(1, ns.length)) * Math.PI * 2));
    }
    return m;
  }, [graph]);

  const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
  const proj = (x: number, y: number, z: number) => {
    const x1 = x * cy - z * sy, z1 = x * sy + z * cy;
    const y2 = y * cp - z1 * sp, z2 = y * sp + z1 * cp;
    const k = 820 / (1000 + z2);
    return { x: W / 2 + x1 * k, y: H / 2 + 10 + y2 * k, z: z2, k };
  };
  const L = (id: Layer) => LAYERS.find((l) => l.id === id)!;
  const P = new Map(graph.nodes.map((n) => { const l = L(n.layer), a = angle.get(n.id) ?? 0; return [n.id, proj(Math.cos(a) * l.r, l.y, Math.sin(a) * l.r)]; }));
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const visN = (id: string) => layers[byId.get(id)!.layer];
  const baseE = graph.edges.filter((e) => preds[e.pred] && visN(e.from) && visN(e.to));
  // 켜진 층 중 가장 위 층에서 시작해, 펼친 노드를 따라 보이는 노드를 넓혀 갑니다 (접으면 그 아래도 같이 사라짐).
  const top = LAYERS.find((l) => layers[l.id])?.id;
  const shown = new Set(graph.nodes.filter((n) => n.layer === top).map((n) => n.id));
  for (let grew = true; grew;) {
    grew = false;
    for (const e of baseE) for (const [a, b] of [[e.from, e.to], [e.to, e.from]]) {
      if (open.has(a) && shown.has(a) && !shown.has(b)) { shown.add(b); grew = true; }
    }
  }
  const visE = baseE.filter((e) => shown.has(e.from) && shown.has(e.to));
  const nb = new Set(visE.flatMap((e) => (e.from === focus ? [e.to] : e.to === focus ? [e.from] : [])));
  const fNode = byId.get(focus);
  const rels = graph.edges.filter((e) => e.from === focus || e.to === focus).sort((a, b) => b.conf - a.conf);

  return (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12, alignItems: 'center' }}>
        <span className="eyebrow" style={{ fontSize: 11 }}>LAYERS</span>
        {LAYERS.map((l) => (
          <button key={l.id} type="button" aria-pressed={layers[l.id]} onClick={() => setLayers((s) => ({ ...s, [l.id]: !s[l.id] }))} style={togStyle(layers[l.id], l.c)}>
            <span aria-hidden style={{ width: 10, height: 10, background: l.c }} />{l.name}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20, alignItems: 'center' }}>
        <span className="eyebrow" style={{ fontSize: 11 }}>RELATIONS</span>
        {(Object.keys(PRED) as Pred[]).map((k) => (
          <button key={k} type="button" aria-pressed={preds[k]} onClick={() => setPreds((s) => ({ ...s, [k]: !s[k] }))} style={togStyle(preds[k], PRED[k].c)}>
            <span aria-hidden style={{ width: 18, height: 3, background: PRED[k].dash ? `repeating-linear-gradient(90deg, ${PRED[k].c} 0 5px, transparent 5px 8px)` : PRED[k].c }} />
            {PRED[k].name}{k === 'SIMILAR' ? ' (AI 추론)' : ''}
          </button>
        ))}
        <button type="button" onClick={() => setAuto((a) => !a)} aria-pressed={auto} style={{ ...togStyle(true, '#3a4555'), marginLeft: 'auto' }}>{auto ? '❚❚ 회전 멈춤' : '▶ 자동 회전'}</button>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'stretch' }}>
        <div className="dark-zone" style={{ flex: '999 1 640px', minWidth: 0, overflowX: 'auto', border: '1px solid var(--line)', backgroundColor: '#0a0c12', backgroundImage: 'radial-gradient(#171c28 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
          <div
            onPointerDown={(e) => { drag.current = { x: e.clientX, y: e.clientY }; }}
            onPointerMove={(e) => {
              if (!drag.current) return;
              const dx = e.clientX - drag.current.x, dy = e.clientY - drag.current.y;
              drag.current = { x: e.clientX, y: e.clientY };
              setYaw((y) => y + dx * 0.008);
              setPitch((p) => Math.max(-1.2, Math.min(0.3, p - dy * 0.006)));
            }}
            onPointerUp={() => { drag.current = null; }}
            onPointerLeave={() => { drag.current = null; }}
            style={{ position: 'relative', width: W, height: H, margin: '0 auto', cursor: drag.current ? 'grabbing' : 'grab', touchAction: 'none', userSelect: 'none' }}
          >
            {LAYERS.filter((l) => layers[l.id]).flatMap((l) => Array.from({ length: 36 }, (_, i) => {
              const a = (i / 36) * Math.PI * 2, p = proj(Math.cos(a) * l.r, l.y, Math.sin(a) * l.r);
              return <span key={`${l.id}${i}`} aria-hidden style={{ position: 'absolute', left: p.x, top: p.y, width: 3, height: 3, background: l.c, opacity: Math.max(0.12, Math.min(0.6, (p.k - 0.6) * 1.2)) }} />;
            }))}
            {visE.map((e, i) => {
              const a = P.get(e.from)!, b = P.get(e.to)!, pr = PRED[e.pred];
              const on = e.from === focus || e.to === focus;
              const dashed = pr.dash || e.inferred;
              return (
                <div key={i} aria-hidden style={{
                  position: 'absolute', left: a.x, top: a.y, width: Math.hypot(b.x - a.x, b.y - a.y), height: on ? 3 : 2,
                  transform: `rotate(${Math.atan2(b.y - a.y, b.x - a.x)}rad)`, transformOrigin: '0 50%',
                  background: dashed ? `repeating-linear-gradient(90deg, ${pr.c} 0 6px, transparent 6px 11px)` : pr.c,
                  opacity: on ? 1 : e.pred === 'BELONGS' ? 0.06 : 0.12,
                }} />
              );
            })}
            {graph.nodes.filter((n) => shown.has(n.id)).map((n) => {
              const p = P.get(n.id)!;
              const isF = n.id === focus, isN = nb.has(n.id);
              return (
                <div key={n.id} style={{ position: 'absolute', left: p.x, top: p.y, zIndex: Math.round(2000 - p.z) + (isF ? 3000 : 0), transform: `translate(-50%, -50%) scale(${Math.max(0.55, Math.min(1.25, p.k * (isF ? 1.15 : 1)))})`, opacity: !focus || isF || isN ? 1 : 0.55 }}>
                  <button type="button" className={isF ? 'ring' : undefined} aria-pressed={isF} aria-label={`${n.label} 노드 선택`} onClick={() => toggle(n.id)} style={nodeStyle(n, isF, isN)}>
                    {n.icon && <img className="px" src={n.icon} alt="" width={32} height={32} />}
                    {!n.icon && <span aria-hidden style={{ width: 8, height: 8, background: n.layer === 'doc' ? '#d7f36b' : n.layer === 'project' ? '#a65d2a' : n.color, transform: n.layer === 'concept' ? 'rotate(45deg)' : undefined }} />}
                    {n.label}
                    <span aria-hidden style={{ opacity: 0.6 }}>{open.has(n.id) ? '−' : '+'}</span>
                  </button>
                </div>
              );
            })}
            <div aria-hidden style={{ position: 'absolute', left: 16, bottom: 14, fontFamily: 'var(--font-mono)', fontSize: 11, color: '#5d6878' }}>드래그해서 회전 · 노드를 누르면 아래 층이 펼쳐지고, 다시 누르면 접힙니다</div>
          </div>
        </div>

        <aside aria-live="polite" className="card" style={{ flex: '1 1 360px', padding: 24, display: 'flex', flexDirection: 'column', gap: 14, borderColor: fNode ? L(fNode.layer).c : undefined }}>
          {open.size > 0 && <button type="button" onClick={() => { setOpen(new Set()); setFocus(''); }} style={{ ...togStyle(true, '#3a4555'), alignSelf: 'flex-end' }}>전체 접기</button>}
          {!fNode && <p style={{ margin: 0, color: 'var(--muted)', fontSize: 14, lineHeight: 1.7 }}>서가를 눌러 개념과 기록을 펼쳐 보세요.</p>}
          {fNode && (
            <div key={fNode.id} className="px-down" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <span className="pixel-label" style={{ alignSelf: 'flex-start', fontSize: 10, padding: '4px 8px', background: L(fNode.layer).c, color: '#0b0d12' }}>{L(fNode.layer).name}</span>
              <h2 style={{ margin: 0, fontSize: 24, lineHeight: 1.3, fontWeight: 900 }}>{fNode.title ?? fNode.label}</h2>
              <span className="eyebrow" style={{ fontSize: 11 }}>ONTOLOGY RELATIONS · {rels.length}</span>
              <div style={{ display: 'flex', flexDirection: 'column', borderTop: '1px solid var(--line2)', maxHeight: 420, overflowY: 'auto' }}>
                {rels.map((e, i) => {
                  const out = e.from === fNode.id, other = byId.get(out ? e.to : e.from)!, pr = PRED[e.pred];
                  return (
                    <button key={i} type="button" className="post-row" onClick={() => select(other.id)} style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '10px 4px', border: 0, borderBottom: '1px solid var(--line2)', background: 'transparent', color: 'var(--text)', cursor: 'pointer', textAlign: 'left' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 14 }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: `color-mix(in srgb, ${pr.c} var(--tint), var(--text))` }}>{out ? '' : '← '}{pr.name}{out ? ' →' : ''}</span>
                        <strong>{other.label}</strong>
                        {(e.inferred || e.pred === 'SIMILAR') && <span className="pixel-label t-lime" style={{ fontSize: 9, padding: '2px 6px', border: '1px dashed var(--lime)' }}>AI 추론</span>}
                      </span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted2)' }}>신뢰도 {e.conf.toFixed(2)}</span>
                    </button>
                  );
                })}
              </div>
              {fNode.href && <Link href={fNode.href} className="pixel-btn" style={{ justifyContent: 'center', fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 700 }}>이 노드의 기록 읽기 →</Link>}
            </div>
          )}
        </aside>
      </div>
    </>
  );
}

function togStyle(on: boolean, c: string): React.CSSProperties {
  return { display: 'inline-flex', alignItems: 'center', gap: 8, minHeight: 40, padding: '0 12px', cursor: 'pointer', background: on ? 'var(--surface3)' : 'transparent', border: `1px solid ${on ? c : 'var(--line)'}`, color: on ? 'var(--text)' : 'var(--faint)', fontFamily: 'var(--font-mono)', fontSize: 12 };
}

function nodeStyle(n: GraphNode, f: boolean, nb: boolean): React.CSSProperties {
  const base: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 8, minHeight: 36, padding: n.layer === 'domain' ? '4px 12px 4px 4px' : '0 12px', cursor: 'pointer', whiteSpace: 'nowrap', border: '2px solid', fontSize: n.layer === 'doc' ? 13 : 12 };
  const bg = { domain: '#120f22', concept: '#0f141c', doc: '#151a10', project: '#2a1a10' }[n.layer];
  const col = { domain: '#edf1f7', concept: '#dfe5ee', doc: '#edf1f7', project: '#f4c095' }[n.layer];
  const bd = { domain: n.color ?? '#7b2cbf', concept: nb ? '#8db5d4' : '#2a3442', doc: nb ? '#d7f36b' : '#3b4a1f', project: '#a65d2a' }[n.layer];
  return {
    ...base,
    fontFamily: n.layer === 'domain' ? 'var(--font-pixel)' : n.layer === 'doc' ? 'var(--font-sans)' : 'var(--font-mono)',
    fontWeight: n.layer === 'doc' ? 700 : 500,
    background: f ? '#d7f36b' : bg, color: f ? '#0b0d12' : col, borderColor: f ? '#d7f36b' : bd,
  };
}
