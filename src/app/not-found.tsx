import Link from 'next/link';
import Zora from '@/components/Zora';

export default function NotFound() {
  return (
    <main className="wrap" style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, textAlign: 'center' }}>
      <Zora scale={6} hop />
      <span className="pixel-label t-lime" style={{ fontSize: 14 }}>404 · LOST IN THE WORLD</span>
      <p style={{ margin: 0, color: 'var(--muted)' }}>지도에 없는 곳이에요. 다른 길로 가볼까요?</p>
      <Link href="/world" className="pixel-btn">월드맵 열기</Link>
    </main>
  );
}
