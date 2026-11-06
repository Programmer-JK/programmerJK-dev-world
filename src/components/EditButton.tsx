'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { PenIcon } from './PixelGlyphs';

/** 로그인(필사실 열쇠)한 상태에서만 글 화면에 "수정하기"를 보여줍니다. */
export default function EditButton({ slug }: { slug: string }) {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    fetch('/api/scribe/me').then((r) => r.json()).then((d: { ok: boolean }) => setOk(d.ok)).catch(() => {});
  }, []);
  if (!ok) return null;
  return (
    <Link href={`/write?slug=${encodeURIComponent(slug)}`} className="pixel-btn" style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 800 }}>
      <PenIcon /> 수정하기
    </Link>
  );
}
