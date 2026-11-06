import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { compileMDX } from 'next-mdx-remote/rsc';
import rehypePrettyCode from 'rehype-pretty-code';
import remarkGfm from 'remark-gfm';
import ReadingProgress from '@/components/ReadingProgress';
import EditButton from '@/components/EditButton';
import Zora from '@/components/Zora';
import { getAllPosts, getHeadings, getPost, slugify } from '@/lib/content';
import { recommend } from '@/lib/ontology';
import { getIsland, getRoom } from '@/lib/islands';

type Params = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return getAllPosts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const post = getPost((await params).slug);
  return post ? { title: post.title, description: post.summary } : {};
}

const text = (children: React.ReactNode): string =>
  typeof children === 'string' ? children : Array.isArray(children) ? children.map(text).join('') : '';

export default async function PostPage({ params }: Params) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  const { content } = await compileMDX({
    source: post.body,
    options: { mdxOptions: { remarkPlugins: [remarkGfm], rehypePlugins: [[rehypePrettyCode, { theme: 'github-dark-dimmed', keepBackground: false }]] } },
    components: {
      img: (p) => <img {...p} loading="lazy" alt={p.alt ?? ''} />,
      h2: (p) => <h2 id={slugify(text(p.children))} {...p} />,
      h3: (p) => <h3 id={slugify(text(p.children))} {...p} />,
    },
  });

  const island = getIsland(post.island);
  const room = getRoom(post.island, post.room);
  const headings = getHeadings(post.body);
  const recs = recommend(post, getAllPosts());

  return (
    <main>
      <div className="wrap" style={{ paddingTop: 64 }}>
        <div style={{ maxWidth: 820 }}>
          <nav aria-label="현재 위치" className="rise" style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '.08em', color: 'var(--muted2)' }}>
            {island && <Link href={island.href} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><img className="px" src={island.icon} alt="" width={32} height={32} />{island.name}</Link>}
            <span aria-hidden>/</span>
            {room && <Link href={`${island?.href}?room=${room.id}`} style={{ color: 'var(--text2)' }}>{room.name}</Link>}
          </nav>
          <h1 className="h-display px-in d1" style={{ marginTop: 20, fontSize: 'clamp(34px, 5vw, 60px)', lineHeight: 1.15 }}>{post.title}</h1>
          {post.summary && <p className="rise d2" style={{ margin: '24px 0 0', fontSize: 19, lineHeight: 1.8, color: 'var(--muted)' }}>{post.summary}</p>}
          <div className="rise d3" style={{ marginTop: 28, display: 'flex', gap: 20, flexWrap: 'wrap', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--muted2)' }}>
            <span>ZORA</span><span>{post.date.replaceAll('-', '.')}</span><span>약 {post.minutes}분</span>
            {post.tags.map((t) => <span key={t}>#{t}</span>)}
          </div>
          <div style={{ marginTop: 20 }}><EditButton slug={post.slug} /></div>
        </div>
      </div>

      <div className="wrap" style={{ paddingTop: 56, paddingBottom: 120, display: 'flex', flexWrap: 'wrap', gap: 64, alignItems: 'flex-start' }}>
        <article className="prose" style={{ flex: '999 1 600px', minWidth: 0, maxWidth: 760 }}>
          {content}

          {recs.length > 0 && (
            <aside className="card" style={{ marginTop: 64, padding: 22, display: 'flex', flexDirection: 'column', gap: 16, borderColor: '#3a2466' }}>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <Zora scale={3} hop />
                <div>
                  <span className="pixel-label t-lime" style={{ fontSize: 11 }}>ZORA · NEXT PATH</span>
                  <p style={{ margin: 0, fontSize: 15, color: 'var(--text2)' }}>이 기록과 개념을 나누는 다음 기록들이에요.</p>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
                {recs.map((r) => (
                  <Link key={r.slug} href={`/posts/${r.slug}`} className="card lift" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8, color: 'var(--text)', background: 'var(--surface2)' }}>
                    <span style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.5 }}>{r.title}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted2)' }}>공통 · {r.shared.join(', ') || '—'} · {Math.round(r.score * 100)}%</span>
                  </Link>
                ))}
              </div>
            </aside>
          )}
        </article>
        <aside style={{ flex: '1 1 240px', position: 'sticky', top: 24 }}>
          <ReadingProgress headings={headings} />
        </aside>
      </div>
    </main>
  );
}
