/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // 启用 standalone 输出（Docker 友好）
  output: 'standalone',
  
  // 生产环境禁用 source map
  productionBrowserSourceMaps: false,
  
  // 图片优化
  images: {
    domains: ['localhost'],
    unoptimized: true,
  },
};

module.exports = nextConfig;
