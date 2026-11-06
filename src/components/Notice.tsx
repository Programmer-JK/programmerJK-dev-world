'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Zora from './Zora';

/** 삭제 후 이동한 화면에서 한 번 보여주는 알림 (?deleted=1) */
export default function Notice() {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (params.get('deleted') === '1') {
      setMsg('기록을 지웠어요. 지식 지도에서도 연결이 빠졌어요.');
      router.replace(pathname, { scroll: false });
    }
  }, [params, pathname, router]);

  // 별도 effect: replace로 params가 바뀌어도 타이머가 cleanup되지 않게
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 4000);
    return () => clearTimeout(t);
  }, [msg]);

  if (!msg) return null;
  return (
    <div role="status" className="dark-zone pop" style={{ position: 'fixed', left: '50%', bottom: 32, zIndex: 30, transform: 'translateX(-50%)', width: 'min(460px, calc(100% - 32px))', display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', background: '#111', border: '3px solid var(--lime)', boxShadow: '6px 6px 0 rgba(0,0,0,.4)' }}>
      <Zora scale={2} />
      <span style={{ fontSize: 14, color: '#e6ebf2' }}>{msg}</span>
    </div>
  );
}
