import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), geolocation=(), payment=(), usb=()',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
        ],
      },
    ];
  },
  // Webpack 配置：精简文件监视范围，避免 inotify 限制
  webpack: (config, { dev }) => {
    if (dev) {
      // 只监视源代码目录，忽略其他所有内容
      config.watchOptions = {
        // 使用轮询模式（不依赖 inotify）
        poll: 3000, // 每3秒轮询一次，减少CPU使用
        aggregateTimeout: 1000,
        // 忽略所有文件，然后只包含源代码
        ignored: [
          // 忽略所有非源代码目录
          '**/node_modules/**',
          '**/.git/**',
          '**/.claude/**',
          '**/.az/**',
          '**/.next/**',
          '**/test-results/**',
          '**/playwright-report/**',
          '**/coverage/**',
          '**/dist/**',
          '**/logs/**',
          '**/tmp/**',
          // 忽略配置文件
          '**/*.json',
          '**/*.md',
          '**/*.lock',
          // 忽略静态资源
          '**/public/**',
          // 忽略父目录
          '../**',
        ],
      };
    }
    return config;
  },
};

export default nextConfig;
