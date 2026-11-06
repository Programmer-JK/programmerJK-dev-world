import { deletePost, readPostForEdit, updatePost, StoreError, type PostInput } from '@/lib/store';
import { getIsland } from '@/lib/islands';
import { handle, refreshPages } from '@/lib/api';

type Ctx = { params: Promise<{ slug: string }> };

const decode = (s: string) => { try { return decodeURIComponent(s); } catch { return s; } };

/** 기록 수정 — 주소와 작성일은 유지 */
export async function PUT(request: Request, { params }: Ctx) {
  const slug = decode((await params).slug);
  const body = (await request.json().catch(() => ({}))) as PostInput;
  return handle(() => {
    updatePost(slug, { ...body, content: body.content ?? '' });
    refreshPages();
    return { slug, href: `/posts/${encodeURIComponent(slug)}` };
  });
}

/** 기록 삭제 — ?images=1 이면 이 글에서만 쓰던 이미지도 함께 삭제 */
export async function DELETE(request: Request, { params }: Ctx) {
  const slug = decode((await params).slug);
  const withImages = new URL(request.url).searchParams.get('images') === '1';
  return handle(() => {
    const post = readPostForEdit(slug);
    if (!post) throw new StoreError('그 기록을 찾을 수 없어요.', 404);
    const result = deletePost(slug, withImages);
    refreshPages();
    return { ...result, redirect: getIsland(post.island)?.href ?? '/' };
  });
}
