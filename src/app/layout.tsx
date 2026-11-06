import type { Metadata } from 'next';
import { Suspense } from 'react';
import Header from '@/components/Header';
import Notice from '@/components/Notice';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL ?? 'http://localhost:3000'),
  title: { default: 'PJK / DEV WORLD', template: '%s · PJK / DEV WORLD' },
  description: '픽셀 월드와 온톨로지 지식 지도로 엮은 개발 블로그. 지식 도서관 · 여관 · 프로젝트 숲.',
};

// 첫 페인트 전에 저장된 테마를 적용해 깜빡임을 막습니다.
const themeScript = `try{var t=localStorage.getItem('zora-theme');document.documentElement.dataset.theme=t==='light'?'light':'dark'}catch(e){document.documentElement.dataset.theme='dark'}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Noto+Sans+KR:wght@400;500;700;900&family=Silkscreen&display=swap"
        />
      </head>
      <body>
        <Header />
        {children}
        <Suspense fallback={null}><Notice /></Suspense>
      </body>
    </html>
  );
}
