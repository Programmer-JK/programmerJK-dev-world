/** 배너 위 모션 레이어 하나. x·y·w·h는 원본 이미지(320×96) 기준 %, k는 globals.css 애니메이션 클래스, r은 회전(deg). */
export type BannerFx = { x: number; y: number; w: number; h: number; c: string; k: string; d?: number; r?: number };

/** 섬 화면 상단의 픽셀 배너 + 대화창 제목 */
export default function IslandBanner({ image, bg, kicker, title, desc, frame, fx = [] }: {
  image: string; bg: string; kicker: string; title: string; desc: string;
  frame: { border: string; inset: string; box: string; text: string };
  fx?: BannerFx[];
}) {
  return (
    <section className="dark-zone" aria-label={`${title} 입구`} style={{ position: 'relative', overflow: 'hidden', background: bg }}>
      <img className="px" src={image} alt="" style={{ display: 'block', width: '100%', aspectRatio: '320 / 96', minHeight: 240, objectFit: 'cover' }} />
      {/* object-fit: cover와 같은 박스를 만들어 효과 좌표가 잘려도 그림과 어긋나지 않게 함 */}
      <div aria-hidden style={{ position: 'absolute', inset: 0, containerType: 'size', pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', left: '50%', top: '50%', width: 'max(100cqw, 100cqh * 10 / 3)', aspectRatio: '320 / 96', transform: 'translate(-50%, -50%)' }}>
          {fx.map((f, i) => (
            <span key={i} className={f.k} style={{ position: 'absolute', left: `${f.x}%`, top: `${f.y}%`, width: `${f.w}%`, height: `${f.h}%`, background: f.c, animationDelay: `${f.d ?? 0}s`, rotate: f.r ? `${f.r}deg` : undefined, transformOrigin: 'top' }} />
          ))}
        </div>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingBottom: 28 }}>
        <div className="wrap rise">
          <div style={{ display: 'inline-flex', flexDirection: 'column', gap: 10, maxWidth: 560, padding: '24px 28px', background: frame.box, border: `4px solid ${frame.border}`, boxShadow: `inset 0 0 0 4px ${frame.inset}, 8px 8px 0 rgba(0,0,0,.5)` }}>
            <span className="pixel-label t-lime" style={{ fontSize: 11 }}>{kicker}</span>
            <h1 className="h-display" style={{ fontSize: 'clamp(32px, 4.4vw, 56px)', color: '#fff' }}>{title}</h1>
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.7, color: frame.text }}>{desc}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
