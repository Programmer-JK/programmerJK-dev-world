import { createPost, type PostInput } from '@/lib/store';
import { getIsland } from '@/lib/islands';
import { handle, refreshPages } from '@/lib/api';

/** 새 기록 저장 (proxy.ts가 로그인 쿠키를 먼저 확인합니다) */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as PostInput;
  return handle(() => {
    const slug = createPost({ ...body, content: body.content ?? '' });
    refreshPages();
    return { slug, href: `/posts/${slug}`, island: getIsland(body.island)?.name };
  });
}
