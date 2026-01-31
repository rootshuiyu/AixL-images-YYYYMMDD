/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // 启用 standalone 输出（Docker 友好）
  output: 'standalone',
  
  // 实验性功能
  experimental: {
    typedRoutes: true,
    optimizePackageImports: ['framer-motion', '@tanstack/react-query', 'lucide-react'],
  },
  
  // 生产环境禁用 source map（防止反编译）
  productionBrowserSourceMaps: false,
  
  // SWC 编译器配置（使用 Next.js 内置混淆）
  swcMinify: true,
  
  // 环境变量（编译时注入）
  env: {
    BUILD_TIME: new Date().toISOString(),
    BUILD_VERSION: process.env.npm_package_version || '1.0.0',
  },
  
  // 图片优化
  images: {
    domains: ['localhost'],
    unoptimized: process.env.NODE_ENV === 'development',
  },
  
  // 重定向配置
  async redirects() {
    return [];
  },
  
  // 头部配置
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
