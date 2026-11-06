/** ZORA — 블로그의 AI 안내자. 16×15 픽셀 원본(외곽선 포함)을 정수배로 키워 씁니다. */
export default function Zora({ scale = 3, hop = false, label }: { scale?: number; hop?: boolean; label?: string }) {
  const w = 16 * scale, h = 15 * scale;
  const eye = { position: 'absolute' as const, top: '33.33%', width: '12.5%', height: '20%', background: 'var(--lime)' };
  return (
    <div className={hop ? 'hop' : undefined} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}
      style={{ position: 'relative', flex: '0 0 auto', width: w, height: h }}>
      <img className="px" src="/pixel/zora.png" alt="" width={w} height={h} style={{ display: 'block' }} />
      <span className="zblink" style={{ ...eye, left: '31.25%' }} />
      <span className="zblink" style={{ ...eye, left: '56.25%' }} />
    </div>
  );
}
