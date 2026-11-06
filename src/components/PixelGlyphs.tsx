/** 작은 픽셀 글리프(SVG). currentColor로 칠해집니다. */
type R = [number, number, number, number];

function Glyph({ rects, size = 16, view = 16, color = 'currentColor' }: { rects: R[]; size?: number; view?: number; color?: string }) {
  return (
    <svg aria-hidden width={size} height={size} viewBox={`0 0 ${view} ${view}`} fill={color} shapeRendering="crispEdges">
      {rects.map(([x, y, w, h], i) => <rect key={i} x={x} y={y} width={w} height={h} />)}
    </svg>
  );
}

export const PenIcon = (p: { size?: number }) => (
  <Glyph size={p.size} rects={[[11, 1, 3, 3], [9, 3, 3, 3], [7, 5, 3, 3], [5, 7, 3, 3], [3, 9, 3, 3], [2, 12, 3, 2]]} />
);

export const SunIcon = (p: { size?: number; color?: string }) => (
  <Glyph size={p.size ?? 18} view={12} color={p.color}
    rects={[[5, 0, 2, 2], [5, 10, 2, 2], [0, 5, 2, 2], [10, 5, 2, 2], [1, 1, 2, 2], [9, 1, 2, 2], [1, 9, 2, 2], [9, 9, 2, 2], [4, 3, 4, 1], [3, 4, 6, 4], [4, 8, 4, 1]]} />
);

export const MoonIcon = (p: { size?: number; color?: string }) => (
  <Glyph size={p.size ?? 18} view={12} color={p.color}
    rects={[[4, 1, 4, 1], [3, 2, 2, 1], [2, 3, 2, 3], [2, 6, 3, 1], [3, 7, 3, 1], [3, 8, 7, 1], [5, 9, 4, 1], [9, 2, 1, 1], [10, 4, 1, 1]]} />
);

export const SearchIcon = () => (
  <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="square"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>
);
