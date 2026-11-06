import fs from 'node:fs';
import { MIME_BY_EXT, uploadPathFromUrl } from '@/lib/store';

/** 업로드한 이미지 서빙. (배포 시 오브젝트 스토리지 URL을 쓰면 이 라우트는 필요 없어요) */
export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: parts } = await params;
  const file = uploadPathFromUrl('/uploads/' + parts.map(encodeURIComponent).join('/'));
  if (!file || !fs.existsSync(/*turbopackIgnore: true*/ file)) return new Response('Not found', { status: 404 });
  const ext = file.split('.').pop()?.toLowerCase() ?? '';
  const type = MIME_BY_EXT[ext];
  if (!type) return new Response('Not found', { status: 404 });
  return new Response(fs.readFileSync(/*turbopackIgnore: true*/ file), {
    headers: { 'Content-Type': type, 'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff' },
  });
}
