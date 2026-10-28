'use client';

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="zh-CN">
      <body>
        <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
          <div style={{ maxWidth: 480, textAlign: 'center' }}>
            <h1>应用启动失败</h1>
            <p>请重试；如果问题持续存在，请检查服务端日志和运行环境配置。</p>
            <button type="button" onClick={reset} style={{ padding: '8px 16px' }}>
              重试
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
