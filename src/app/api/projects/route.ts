import { saveProjects } from '@/lib/store';
import { handle, refreshPages } from '@/lib/api';

/** 프로젝트 숲 전체 저장 — 로그인은 proxy.ts에서 확인 */
export async function PUT(request: Request) {
  const body = await request.json().catch(() => null);
  return handle(() => {
    const projects = saveProjects(body);
    refreshPages();
    return { projects };
  });
}
