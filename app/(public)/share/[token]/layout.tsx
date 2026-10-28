/**
 * 公开分享页面布局
 * 无需认证的简洁布局
 */

import { ReactNode } from 'react';

export default function PublicShareLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部品牌栏 */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-semibold text-gray-900">
              客户需求洞察助手
            </span>
            <span className="text-sm text-gray-500">分享预览</span>
          </div>
        </div>
      </header>

      {/* 主内容区域 */}
      <main className="max-w-5xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {children}
      </main>

      {/* 页脚 */}
      <footer className="bg-white border-t border-gray-200 px-6 py-4 mt-8">
        <div className="max-w-5xl mx-auto text-center text-sm text-gray-500">
          © {new Date().getFullYear()} 客户需求洞察助手 - AI辅助访谈分析平台
        </div>
      </footer>
    </div>
  );
}