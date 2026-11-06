import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // 픽셀 아트는 원본 그대로(최근접 확대) 보여야 해서 next/image 최적화 대신 <img>를 씁니다.
  images: { unoptimized: true },
  // MDX 원문(content/)은 서버 컴포넌트에서 fs로 읽습니다.
  outputFileTracingIncludes: { '/**': ['./content/**/*'] },
};

export default nextConfig;
