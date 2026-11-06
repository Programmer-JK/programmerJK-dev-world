import Link from 'next/link';
import type { PostMeta } from '@/lib/content';
import { getIsland, getRoom, placeLabel } from '@/lib/islands';

/** 목록 한 줄: 섬·방 · 제목 · 태그 · 날짜 */
export default function PostRow({ post }: { post: PostMeta }) {
  const room = getRoom(post.island, post.room);
  const island = getIsland(post.island);
  return (
    <Link href={`/posts/${post.slug}`} className="post-row" style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap', padding: '22px 12px', borderBottom: '1px solid var(--line)', color: 'var(--text)' }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, flex: '0 0 220px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--muted2)' }}>
        <img className="px" src={room?.icon ?? island?.icon} alt="" width={32} height={32} />
        {placeLabel(post.island, post.room)}
      </span>
      <span style={{ flex: '999 1 320px', fontSize: 19, fontWeight: 700, letterSpacing: '-0.02em' }}>{post.title}</span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--muted2)' }}>{post.date.replaceAll('-', '.')}</span>
      <span aria-hidden className="t-lime" style={{ fontFamily: 'var(--font-mono)' }}>→</span>
    </Link>
  );
}
