import Link from 'next/link';
import { Suspense } from 'react';
import HeroScene from '@/components/HeroScene';
import AskZora from '@/components/AskZora';
import SecretKey from '@/components/SecretKey';
import PostRow from '@/components/PostRow';
import { getAllPosts } from '@/lib/content';
import { ISLANDS, icon, placeLabel } from '@/lib/islands';

export default function HomePage() {
  const posts = getAllPosts();
  const featured = posts.find((p) => p.island === 'library') ?? posts[0];
  const rest = posts.filter((p) => p.slug !== featured?.slug).slice(0, 5);

  return (
    <main>
      <HeroScene>
        <div className="dialog-box rise" style={{ position: 'relative', maxWidth: 700, padding: '40px 44px 44px' }}>
          <div className="pixel-label rise d1 t-lime" style={{ fontSize: 12, letterSpacing: '.18em' }}>DEVELOPER KNOWLEDGE ADVENTURE</div>
          <h1 className="h-display" style={{ marginTop: 22, fontSize: 'clamp(40px, 6vw, 80px)', lineHeight: 1.05 }}>
            <span className="px-in d2" style={{ display: 'block' }}>기술을 탐험하고,</span>
            <span className="px-in d3 t-lime" style={{ display: 'block' }}>지식을 연결한다.</span>
          </h1>
          <p className="rise d4" style={{ margin: '28px 0 0', fontSize: 18, lineHeight: 1.75, color: '#cfc6e6' }}>
            백엔드, AI, 인프라, 프로젝트 회고를 하나의 픽셀 월드로 엮은 기술 블로그. 글을 읽고 끝내지 않고, 연결된 기술과 이전 기록으로 계속 걸어 들어갑니다.
          </p>
          <AskZora />
          <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginTop: 12, fontFamily: 'var(--font-mono)', fontSize: 12 }}>
            <Link href="/world" style={{ padding: '6px 0' }}>월드맵 열기 →</Link>
            <Link href="/library" style={{ padding: '6px 0', color: '#cfc6e6' }}>지식 도서관 둘러보기 →</Link>
          </div>
        </div>
      </HeroScene>

      <section style={{ borderBottom: '1px solid var(--line2)' }}>
        <div className="wrap" style={{ paddingTop: 120, paddingBottom: 120 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 32, flexWrap: 'wrap', marginBottom: 56 }}>
            <div>
              <div className="eyebrow">01 / WORLD SYSTEM</div>
              <h2 className="h-display" style={{ marginTop: 14, fontSize: 'clamp(34px, 4.6vw, 60px)' }}>세 개의 섬으로 된 세계</h2>
            </div>
            <p style={{ margin: 0, maxWidth: 460, color: 'var(--muted)', fontSize: 16, lineHeight: 1.75 }}>개발 지식은 모두 지식 도서관에, 쉬어 가는 이야기는 여관에, 만든 것은 프로젝트 숲에.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {ISLANDS.map((i) => (
              <Link key={i.id} href={i.href} className="card lift" style={{ display: 'flex', flexDirection: 'column', color: 'var(--text)' }}>
                <span aria-hidden style={{ display: 'flex' }}>{i.palette.map((c) => <span key={c} style={{ flex: 1, height: 8, background: c }} />)}</span>
                <span style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 24 }}>
                  <img className="px" src={i.icon} alt="" width={64} height={64} />
                  <span className="pixel-label" style={{ fontSize: 11, color: 'var(--muted2)' }}>{i.en}</span>
                  <span style={{ fontSize: 22, fontWeight: 700 }}>{i.name}</span>
                  <span style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--muted)' }}>{i.desc}</span>
                  <span style={{ marginTop: 8, display: 'flex', flexDirection: 'column', borderTop: '1px solid var(--line)' }}>
                    {i.rooms.map((r) => (
                      <span key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
                        <img className="px" src={r.icon} alt="" width={32} height={32} />
                        <span style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: 14, fontWeight: 700 }}>{r.name}</span>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted2)' }}>{r.desc}</span>
                        </span>
                      </span>
                    ))}
                  </span>
                </span>
              </Link>
            ))}
          </div>
          <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 16 }}>
            <Link href="/knowledge" className="card lift" style={{ flex: '1 1 420px', display: 'flex', alignItems: 'center', gap: 20, padding: '24px 28px', color: 'var(--text)', borderColor: '#3b2a74' }}>
              <img className="px" src={icon('knowledge')} alt="" width={64} height={64} />
              <span style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span className="pixel-label t-lilac" style={{ fontSize: 14 }}>KNOWLEDGE MAP</span>
                <span style={{ fontSize: 15, color: 'var(--text2)' }}>세 섬의 모든 기록이 온톨로지로 연결되는 3D 지식 지도.</span>
              </span>
            </Link>
            <Link href="/status" className="card lift" style={{ flex: '1 1 420px', display: 'flex', alignItems: 'center', gap: 20, padding: '24px 28px', color: 'var(--text)', borderColor: '#3b4a1f' }}>
              <img className="px" src={icon('status')} alt="" width={64} height={64} />
              <span style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span className="pixel-label t-lime" style={{ fontSize: 14 }}>STATUS · 모험가 상태창</span>
                <span style={{ fontSize: 15, color: 'var(--text2)' }}>얼마나 쓰고, 어디까지 탐험했고, 무엇이 연결됐는지.</span>
              </span>
            </Link>
          </div>
        </div>
      </section>

      <section style={{ borderBottom: '1px solid var(--line2)' }}>
        <div className="wrap" style={{ paddingTop: 120, paddingBottom: 120 }}>
          <div className="eyebrow">02 / LATEST RECORDS</div>
          <h2 className="h-display" style={{ margin: '14px 0 48px', fontSize: 'clamp(34px, 4.6vw, 60px)' }}>최근 기록</h2>
          {featured && (
            <Link href={`/posts/${featured.slug}`} className="card lift" style={{ display: 'flex', flexWrap: 'wrap', color: 'var(--text)', marginBottom: 32 }}>
              <span className="dark-zone" style={{ flex: '1 1 420px', minHeight: 300, position: 'relative', background: '#221c3a' }}>
                <img className="px" src="/pixel/feature-library.png" alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
              </span>
              <span style={{ flex: '1 1 420px', padding: 40, display: 'flex', flexDirection: 'column', gap: 18 }}>
                <span className="t-lilac" style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '.12em' }}>FEATURED · {placeLabel(featured.island, featured.room)}</span>
                <span style={{ fontSize: 'clamp(26px, 3vw, 38px)', lineHeight: 1.25, fontWeight: 900, letterSpacing: '-0.035em' }}>{featured.title}</span>
                {featured.summary && <span style={{ fontSize: 16, lineHeight: 1.75, color: 'var(--muted)' }}>{featured.summary}</span>}
                <span style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {featured.tags.map((t) => <span key={t} className="t-lilac" style={{ fontFamily: 'var(--font-mono)', fontSize: 12, padding: '6px 10px', border: '1px solid #3a2466' }}>{t}</span>)}
                </span>
                <span style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--muted2)' }}>
                  <span>ZORA · {featured.date.replaceAll('-', '.')}</span><span className="t-lime">OPEN BOOK →</span>
                </span>
              </span>
            </Link>
          )}
          <div style={{ borderTop: '1px solid var(--line)' }}>
            {rest.map((p) => <PostRow key={p.slug} post={p} />)}
          </div>
        </div>
      </section>

      <footer className="wrap" style={{ paddingTop: 64, paddingBottom: 96, display: 'flex', justifyContent: 'space-between', gap: 32, flexWrap: 'wrap' }}>
        <div style={{ maxWidth: 520 }}>
          <div className="pixel-label t-lime" style={{ fontSize: 12 }}>PJK / DEV WORLD</div>
          <p style={{ margin: '14px 0 0', color: 'var(--muted2)', fontSize: 15, lineHeight: 1.8 }}>Pixel Art로 세계를 만들고, Motion으로 탐험을 만들고, Technical Content로 지식을 남긴다.</p>
        </div>
        <nav aria-label="외부 링크" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontFamily: 'var(--font-mono)', fontSize: 13 }}>
          <a href="https://github.com/Programmer-JK" style={{ padding: '12px 14px', color: 'var(--muted)' }}>GITHUB ↗</a>
          <a href="#" style={{ padding: '12px 14px', color: 'var(--muted)' }}>PORTFOLIO ↗</a>
          <a href="/rss.xml" style={{ padding: '12px 14px', color: 'var(--muted)' }}>RSS</a>
        </nav>
      </footer>

      <Suspense fallback={null}><SecretKey /></Suspense>
    </main>
  );
}
