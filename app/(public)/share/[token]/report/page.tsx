'use client';

/**
 * 分享报告页面
 *
 * 公开访问的分享报告查看页面
 *
 * @module app/(public)/share/[token]/report/page
 */

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Loader2, AlertCircle, Link2Off } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ShareReportViewer } from '@/components/features/share/share-report-viewer';
import type { ShareReportContent } from '@/lib/services/share-report-storage';

type PageState = 'loading' | 'success' | 'error' | 'expired';

export default function ShareReportPage() {
  const params = useParams();
  const token = params.token as string;

  const [state, setState] = useState<PageState>('loading');
  const [report, setReport] = useState<ShareReportContent | null>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    fetchReport();
  }, [token]);

  const fetchReport = async () => {
    try {
      setState('loading');

      const response = await fetch(`/api/share/${token}/report`);
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 404) {
          setState('expired');
          setError(data.error || '分享链接不存在或已过期');
        } else {
          setState('error');
          setError(data.error || '获取报告失败');
        }
        return;
      }

      if (data.success && data.data) {
        setReport(data.data);
        setState('success');
      } else {
        setState('error');
        setError(data.error || '获取报告失败');
      }
    } catch (err) {
      setState('error');
      setError(err instanceof Error ? err.message : '网络错误');
    }
  };

  // 加载状态
  if (state === 'loading') {
    return (
      <div className="min-h-screen bg-[#1a2332] flex items-center justify-center">
        <div className="text-center text-[#a8dadc]">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-[#2d8b8b]" />
          <p>正在加载报告...</p>
        </div>
      </div>
    );
  }

  // 链接过期状态
  if (state === 'expired') {
    return (
      <div className="min-h-screen bg-[#1a2332] flex items-center justify-center">
        <div className="text-center text-[#a8dadc] max-w-md px-4">
          <Link2Off className="w-16 h-16 mx-auto mb-4 text-[#a8dadc]/50" />
          <h1 className="text-xl font-semibold text-[#f1faee] mb-2">
            链接已失效
          </h1>
          <p className="mb-4">{error}</p>
          <p className="text-sm text-[#a8dadc]/70">
            请联系分享者获取新的分享链接
          </p>
        </div>
      </div>
    );
  }

  // 错误状态
  if (state === 'error') {
    return (
      <div className="min-h-screen bg-[#1a2332] flex items-center justify-center">
        <div className="text-center text-[#a8dadc] max-w-md px-4">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-500/50" />
          <h1 className="text-xl font-semibold text-[#f1faee] mb-2">
            加载失败
          </h1>
          <p className="mb-4">{error}</p>
          <Button onClick={fetchReport} variant="outline">
            重试
          </Button>
        </div>
      </div>
    );
  }

  // 成功状态 - 显示报告
  if (state === 'success' && report) {
    return <ShareReportViewer report={report} />;
  }

  return null;
}