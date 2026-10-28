'use client';

import { useEffect, useState } from 'react';

export default function ApiDocsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 加载 Swagger UI 资源
    const loadSwaggerUI = async () => {
      try {
        // 检查 OpenAPI 文档是否可访问
        const response = await fetch('/openapi.json');
        if (!response.ok) {
          throw new Error('无法加载 OpenAPI 文档');
        }

        setLoading(false);

        // 动态加载 Swagger UI 的脚本和样式
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href =
          'https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css';
        document.head.appendChild(link);

        const script = document.createElement('script');
        script.src =
          'https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js';
        script.onload = () => {
          // 初始化 Swagger UI
          if ((window as any).SwaggerUIBundle) {
            (window as any).ui = new (window as any).SwaggerUIBundle({
              url: '/openapi.json',
              dom_id: '#swagger-ui',
              deepLinking: true,
              presets: [
                (window as any).SwaggerUIBundle.presets.apis,
                (window as any).SwaggerUIBundle.SwaggerUIStandalonePreset,
              ],
              layout: 'BaseLayout',
              defaultModelsExpandDepth: 1,
              defaultModelExpandDepth: 1,
              docExpansion: 'list',
              tryItOutEnabled: true,
              persistAuthorization: true,
              displayRequestDuration: true,
              filter: true,
              syntaxHighlight: {
                activate: true,
                theme: 'monokai',
              },
            });
          }
        };
        document.head.appendChild(script);
      } catch (err) {
        console.error('加载 Swagger UI 失败:', err);
        setError(err instanceof Error ? err.message : '未知错误');
        setLoading(false);
      }
    };

    loadSwaggerUI();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
          <p className="mt-4 text-muted-foreground">加载 API 文档...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="max-w-md p-8 bg-card rounded-lg shadow-lg">
          <h1 className="text-2xl font-bold text-destructive mb-4">加载失败</h1>
          <p className="text-muted-foreground mb-4">{error}</p>
          <p className="text-sm text-muted-foreground">
            请确保{' '}
            <code className="bg-muted px-2 py-1 rounded">
              /public/openapi.json
            </code>{' '}
            文件存在
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="bg-card rounded-lg shadow-lg overflow-hidden">
          <div id="swagger-ui" className="min-h-[600px]" />
        </div>

        <div className="mt-8 p-4 bg-muted rounded-lg">
          <h2 className="text-lg font-semibold mb-2">使用说明</h2>
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
            <li>点击任意 API 端点查看详细信息</li>
            <li>使用 &quot;Try it out&quot; 按钮直接测试 API</li>
            <li>文档会自动更新以反映最新的 API 定义</li>
            <li>
              OpenAPI 规范文件位于{' '}
              <code className="bg-background px-2 py-1 rounded">
                /public/openapi.json
              </code>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
