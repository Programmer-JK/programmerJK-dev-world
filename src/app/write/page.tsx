import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getAllPosts } from '@/lib/content';
import { readPostForEdit, isValidSlug } from '@/lib/store';
import Editor from './Editor';

export const metadata: Metadata = { title: '필사실', robots: { index: false } };
// proxy.ts가 로그인 쿠키를 확인한 뒤에만 이 페이지에 도달합니다.
export const dynamic = 'force-dynamic';

/** /write → 새 기록, /write?slug=<slug> → 기존 기록 수정 */
export default async function WritePage({ searchParams }: { searchParams: Promise<{ slug?: string }> }) {
  const { slug } = await searchParams;
  let initial = null;
  if (slug) {
    if (!isValidSlug(slug)) notFound();
    initial = readPostForEdit(slug);
    if (!initial) notFound();
  }
  const posts = getAllPosts().filter((p) => p.slug !== slug).map(({ slug, title, concepts }) => ({ slug, title, concepts }));
  return <Editor posts={posts} initial={initial} />;
}
