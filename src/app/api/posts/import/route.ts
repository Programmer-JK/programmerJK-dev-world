import matter from 'gray-matter';
import { handle, refreshPages } from '@/lib/api';
import { createPost, StoreError } from '@/lib/store';
import { classify } from '@/lib/classify';
import { getRoom } from '@/lib/islands';

const MAX_BYTES = 1024 * 1024;

/**
 * .md/.mdx 파일 가져오기 (multipart/form-data, 필드명 file). 로그인은 proxy가 확인합니다.
 * frontmatter에 island/room이 있으면 그대로, 없으면 AI(또는 규칙)로 분류합니다.
 * ?dry=1 이면 저장하지 않고 분류 결과와 본문만 돌려줘서 글쓰기 폼을 채우게 합니다.
 */
export async function POST(request: Request) {
  return handle(async () => {
    const dry = new URL(request.url).searchParams.get('dry') === '1';
    const form = await request.formData().catch(() => null);
    const file = form?.get('file');
    if (!(file instanceof File)) throw new StoreError('가져올 .md 파일을 골라주세요.');
    if (!/\.mdx?$/i.test(file.name)) throw new StoreError('.md 또는 .mdx 파일만 가져올 수 있어요.', 415);
    if (file.size > MAX_BYTES) throw new StoreError('파일은 1MB까지 가져올 수 있어요.', 413);
    const raw = await file.text();
    if (/[\u0000�]/.test(raw)) throw new StoreError('UTF-8 텍스트 파일만 가져올 수 있어요.', 415);

    let parsed: matter.GrayMatterFile<string>;
    try { parsed = matter(raw); } catch { throw new StoreError('frontmatter를 읽지 못했어요.'); }
    const { data, content } = parsed;
    if (!content.trim()) throw new StoreError('본문이 비어 있어요.');

    const name = file.name.replace(/\.mdx?$/i, '');
    const fmTitle = typeof data.title === 'string' ? data.title.trim() : '';
    const fmSummary = typeof data.summary === 'string' ? data.summary.trim() : '';
    const fmTags = Array.isArray(data.tags) ? data.tags.map(String).filter(Boolean) : [];

    let result: { island: string; room: string; title: string; summary: string; tags: string[]; classifiedBy: 'frontmatter' | 'llm' | 'rule' };
    if (typeof data.island === 'string' && typeof data.room === 'string' && getRoom(data.island, data.room)) {
      result = { island: data.island, room: data.room, title: fmTitle || /^#\s+(.+)$/m.exec(content)?.[1]?.trim() || name, summary: fmSummary, tags: fmTags, classifiedBy: 'frontmatter' };
    } else {
      const c = await classify(content, fmTitle || name);
      result = { island: c.island, room: c.room, title: fmTitle || c.title, summary: fmSummary || c.summary, tags: fmTags.length ? fmTags : c.tags, classifiedBy: c.by };
    }

    if (dry) return { ...result, content };
    const { classifiedBy: _by, ...input } = result;
    const slug = createPost({ ...input, content });
    refreshPages();
    return { ...result, slug, href: `/posts/${slug}` };
  });
}
