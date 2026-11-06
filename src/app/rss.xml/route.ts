import { getAllPosts } from '@/lib/content';

const SITE = process.env.SITE_URL ?? 'http://localhost:3000';
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function GET() {
  const items = getAllPosts().slice(0, 30).map((p) => `
    <item>
      <title>${esc(p.title)}</title>
      <link>${SITE}/posts/${p.slug}</link>
      <guid>${SITE}/posts/${p.slug}</guid>
      <pubDate>${new Date(p.date).toUTCString()}</pubDate>
      ${p.summary ? `<description>${esc(p.summary)}</description>` : ''}
    </item>`).join('');
  const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>PJK / DEV WORLD</title><link>${SITE}</link><description>개발 블로그</description>${items}</channel></rss>`;
  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
}
