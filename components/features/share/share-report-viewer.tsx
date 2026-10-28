'use client';

/**
 * 分享报告翻页浏览组件
 *
 * 使用PPT大纲格式展示14页报告内容
 *
 * @module components/features/share/share-report-viewer
 */

import type { ShareReportContent } from '@/lib/services/share-report-storage';
import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import { PPTOutlineViewer } from './ppt-outline-viewer';
import { Button } from '@/components/ui/button';

// ============================================
// 类型定义
// ============================================

interface ShareReportViewerProps {
  report: ShareReportContent;
  className?: string;
}

// ============================================
// 主组件
// ============================================

export function ShareReportViewer({ report, className }: ShareReportViewerProps) {
  const hasRenderedSlides = Boolean(
    report.slidesArtifact?.hasRenderedSlides && report.slidesArtifact.slideCount > 0
  );

  // 检查是否有PPT大纲数据
  if (!report.pptOutline) {
    return (
      <div className="min-h-screen bg-[#1a2332] text-[#f1faee] flex items-center justify-center">
        <div className="text-center text-[#a8dadc]">
          <p>报告数据格式不正确，请重新生成</p>
        </div>
      </div>
    );
  }

  if (hasRenderedSlides) {
    return <RenderedSlidesViewer report={report} className={className} />;
  }

  return <PPTOutlineViewer outline={report.pptOutline} />;
}

function RenderedSlidesViewer({
  report,
  className,
}: ShareReportViewerProps) {
  const slideCount = report.slidesArtifact?.slideCount ?? 0;
  const [currentSlide, setCurrentSlide] = useState(1);

  const currentImageUrl = useMemo(
    () => `/api/share/${report.meta.token}/rendered-slides/${currentSlide}`,
    [currentSlide, report.meta.token]
  );

  return (
    <div className={`min-h-screen bg-[#07111f] text-white ${className ?? ''}`}>
      <div className="sticky top-0 z-10 border-b border-white/10 bg-[#07111f]/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-2xl font-semibold">{report.interview.title}</h1>
            <p className="mt-1 text-sm text-slate-300">
              {report.customer.name}
              {report.interview.interviewDate ? ` • ${new Date(report.interview.interviewDate).toLocaleDateString('zh-CN')}` : ''}
            </p>
          </div>
          <div className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-1 text-sm text-cyan-200">
            slides skill 渲染预览
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-[1600px] items-center justify-center gap-4 px-6 py-4">
        <Button
          variant="outline"
          size="icon"
          className="border-white/15 bg-white/5 text-white hover:bg-white/10"
          onClick={() => setCurrentSlide((value) => Math.max(1, value - 1))}
          disabled={currentSlide <= 1}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="text-sm text-slate-300">
          第 {currentSlide} / {slideCount} 页
        </div>
        <Button
          variant="outline"
          size="icon"
          className="border-white/15 bg-white/5 text-white hover:bg-white/10"
          onClick={() => setCurrentSlide((value) => Math.min(slideCount, value + 1))}
          disabled={currentSlide >= slideCount}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      <div className="mx-auto max-w-[1600px] px-6 pb-10">
        <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[#0b1729] shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
          <div className="relative aspect-[16/9] w-full bg-[#0f1c31]">
            <Image
              key={currentImageUrl}
              src={currentImageUrl}
              alt={`Slide ${currentSlide}`}
              fill
              sizes="100vw"
              className="object-contain"
              priority
              unoptimized
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {Array.from({ length: slideCount }, (_, index) => index + 1).map((slideNumber) => (
            <button
              key={slideNumber}
              type="button"
              onClick={() => setCurrentSlide(slideNumber)}
              className={`h-2.5 rounded-full transition-all ${
                slideNumber === currentSlide
                  ? 'w-8 bg-cyan-400'
                  : 'w-2.5 bg-white/20 hover:bg-white/35'
              }`}
              aria-label={`查看第 ${slideNumber} 页`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default ShareReportViewer;
