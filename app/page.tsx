'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, Code, Sparkles } from 'lucide-react';
import MainLayout from '@/components/layout/main-layout';
import { useUserStore } from '@/stores/core/useUserStore';
import { PROJECT_NAME } from '@/lib/config/project';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated } = useUserStore();

  const handleStartUse = () => {
    if (isAuthenticated) {
      // 已登录，跳转到仪表板
      router.push('/dashboard');
    } else {
      // 未登录，跳转到登录页面
      router.push('/login');
    }
  };

  return (
    <MainLayout>
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/10 rounded-full mix-blend-multiply filter blur-xl opacity-40 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-cyan-100 rounded-full mix-blend-multiply filter blur-xl opacity-40 animate-pulse"></div>
      </div>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center p-2 md:p-4 lg:p-6 relative w-full">
        <div className="relative z-10 text-center w-full max-w-screen-2xl px-2 md:px-4 lg:px-6">
          {/* Logo/Brand + Headline */}
          <div className="mb-12">
            <div className="flex items-center justify-center gap-4 md:gap-6 mb-8">
              {/* Logo Icon */}
              <div className="flex-shrink-0">
                <div className="inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-cyan-100 rounded-2xl transform rotate-6"></div>
                  <div className="relative bg-white rounded-2xl w-full h-full flex items-center justify-center shadow-lg">
                    <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center">
                      <svg
                        className="w-5 h-5 md:w-6 md:h-6 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 10V3L4 14h7v7l9-11h-7z"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Headline */}
              <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold leading-tight bg-gradient-to-r from-primary via-primary/90 to-cyan-600 bg-clip-text text-transparent text-left">
                欢迎来到{PROJECT_NAME}
              </h1>
            </div>
          </div>

          {/* Description */}
          <p className="text-lg md:text-xl lg:text-2xl text-gray-600 font-medium mb-12 md:mb-16 leading-relaxed max-w-3xl mx-auto px-4">
            智能客户访谈与需求洞察平台，助力销售、产品、研发高效完成客户访谈与需求采集
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-12">
            <Button size="lg" className="px-8 py-4" onClick={handleStartUse}>
              <span className="flex items-center gap-3">
                <span>开始使用</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </span>
            </Button>
            <Button variant="outline" size="lg" className="px-8 py-4" asChild>
              <Link href="/login">登录账户</Link>
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-3 max-w-4xl mx-auto w-full">
            <Card className="p-8 bg-primary/5 border-primary/10 hover:bg-primary/10 transition-colors">
              <CardContent className="p-0">
                <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-xl mb-4 mx-auto">
                  <Code className="w-6 h-6 text-primary" />
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-2">1M+</div>
                <div className="text-gray-600">代码生成</div>
              </CardContent>
            </Card>

            <Card className="p-8 bg-cyan-50 border-cyan-200 hover:bg-cyan-100 transition-colors">
              <CardContent className="p-0">
                <div className="flex items-center justify-center w-12 h-12 bg-cyan-100 rounded-xl mb-4 mx-auto">
                  <Sparkles className="w-6 h-6 text-cyan-600" />
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-2">
                  50M+
                </div>
                <div className="text-gray-600">Token消耗</div>
              </CardContent>
            </Card>

            <Card className="p-8 bg-green-50 border-green-200 hover:bg-green-100 transition-colors">
              <CardContent className="p-0">
                <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-xl mb-4 mx-auto">
                  <ArrowRight className="w-6 h-6 text-green-600" />
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-2">80%</div>
                <div className="text-gray-600">提效比</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-gray-200 bg-white/50 backdrop-blur-sm">
        <div className="w-full max-w-screen-2xl mx-auto px-2 md:px-4 lg:px-6 py-6 md:py-8">
          <div className="text-center text-gray-600">
            <p>&copy; 2026 {PROJECT_NAME}. 保留所有权利.</p>
          </div>
        </div>
      </footer>
    </MainLayout>
  );
}
