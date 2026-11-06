import { deleteUpload, saveUpload, StoreError } from '@/lib/store';
import { handle } from '@/lib/api';

/** 이미지 올리기 (multipart/form-data, 필드명 file) */
export async function POST(request: Request) {
  return handle(async () => {
    const form = await request.formData().catch(() => null);
    const file = form?.get('file');
    if (!(file instanceof File)) throw new StoreError('이미지 파일을 골라주세요.');
    return await saveUpload(file);
  });
}

/** 이미지 지우기 (?url=/uploads/...&slug=수정중인글) — 다른 글이 쓰는 이미지는 지우지 않고 usedBy로 알려줍니다 */
export async function DELETE(request: Request) {
  const sp = new URL(request.url).searchParams;
  return handle(() => deleteUpload(sp.get('url') ?? '', sp.get('slug') ?? undefined));
}
