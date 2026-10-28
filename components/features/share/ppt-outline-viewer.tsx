'use client';

/**
 * PPT大纲展示组件（商务汇报版）
 *
 * 展示14页PPT大纲，强调：
 * - 浅色商务版式
 * - 图文双栏结合
 * - 每类页面固定信息结构
 * - 更适合客户汇报的阅读体验
 *
 * @module components/features/share/ppt-outline-viewer
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  FileText,
  ImageIcon,
  Lightbulb,
  ListTree,
  Maximize2,
  Minimize2,
  Presentation,
  Rocket,
  Search,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  UserRound,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import type {
  PaletteName,
  PPTOutlineContent,
  PPTSlide,
  SlideLayout,
  SlideType,
  VisualConfig,
} from '@/lib/types/ppt-outline';

interface PPTEOutlineViewerProps {
  outline: PPTOutlineContent;
  onExportPPT?: () => void;
  onRegenerate?: () => void;
  isExporting?: boolean;
}

interface ViewerSlide extends PPTSlide {
  sourceSlideNumber: number;
  pageNumberWithinSource: number;
  pageCountWithinSource: number;
  originalTitle: string;
}

export function PPTOutlineViewer({
  outline,
  onExportPPT,
  onRegenerate,
  isExporting = false,
}: PPTEOutlineViewerProps) {
  const { showToast } = useToast();
  const viewerRef = useRef<HTMLDivElement | null>(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const viewerSlides = buildViewerSlides(outline);
  const viewerMetadata = {
    ...outline.metadata,
    totalSlides: viewerSlides.length,
  };
  const theme = getViewerTheme(viewerMetadata.paletteName);

  const currentSlide = viewerSlides[currentSlideIndex];
  const totalSlides = viewerSlides.length;

  const handlePrevSlide = useCallback(() => {
    setCurrentSlideIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const handleNextSlide = useCallback(() => {
    setCurrentSlideIndex((prev) => Math.min(totalSlides - 1, prev + 1));
  }, [totalSlides]);

  const handleSlideClick = useCallback((index: number) => {
    setCurrentSlideIndex(index);
  }, []);

  const handleCopyOutline = useCallback(async () => {
    const text = generateOutlineText(outline);
    await navigator.clipboard.writeText(text);
    setCopied(true);
    showToast('已复制到剪贴板');
    setTimeout(() => setCopied(false), 2000);
  }, [outline, showToast]);

  const handleToggleFullscreen = useCallback(async () => {
    if (typeof document === 'undefined') return;

    if (!document.fullscreenElement && viewerRef.current) {
      await viewerRef.current.requestFullscreen();
      return;
    }

    if (document.fullscreenElement) {
      await document.exitFullscreen();
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        handleNextSlide();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        handlePrevSlide();
      } else if (e.key.toLowerCase() === 'f') {
        void handleToggleFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNextSlide, handlePrevSlide, handleToggleFullscreen]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    if (currentSlideIndex > Math.max(0, viewerSlides.length - 1)) {
      setCurrentSlideIndex(Math.max(0, viewerSlides.length - 1));
    }
  }, [currentSlideIndex, viewerSlides.length]);

  return (
    <div ref={viewerRef} className={`flex h-screen ${theme.appShell}`}>
      <aside className={`shrink-0 ${theme.sidebarShell} ${isFullscreen ? 'hidden' : 'hidden xl:block xl:w-72'}`}>
        <div className={`border-b px-5 py-4 ${theme.sidebarDivider}`}>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#2F80ED_0%,#00C2FF_100%)] text-white shadow-[0_10px_30px_rgba(47,128,237,0.35)]">
              <Presentation className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className={`truncate text-sm font-semibold ${theme.sidebarTitle}`}>{outline.metadata.projectTitle}</p>
              <p className={`truncate text-xs ${theme.sidebarSubtitle}`}>{outline.metadata.customerName}</p>
            </div>
          </div>
        </div>

        <div className="space-y-2 overflow-y-auto p-4">
          {viewerSlides.map((slide, index) => (
            <button
              key={`${slide.sourceSlideNumber}-${slide.pageNumberWithinSource}-${index}`}
              onClick={() => handleSlideClick(index)}
              className={`w-full rounded-2xl border p-3 text-left transition ${
                index === currentSlideIndex
                  ? 'border-[#2F80ED] bg-[linear-gradient(135deg,rgba(47,128,237,0.24)_0%,rgba(0,194,255,0.12)_100%)] text-white shadow-[0_18px_38px_rgba(3,8,20,0.45)]'
                  : 'border-[#243247] bg-[rgba(15,23,42,0.82)] text-[#C7D6E6] hover:border-[#2F80ED]/60 hover:bg-[rgba(15,23,42,0.95)]'
              }`}
              >
                <div className="mb-2 flex items-center gap-2">
                <span
                  className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                    index === currentSlideIndex ? 'bg-white/15 text-white' : 'bg-[rgba(255,255,255,0.08)] text-[#E6EEF8]'
                  }`}
                >
                  {slide.slideNumber}
                </span>
                <SlideTypeLabel type={slide.slideType} active={index === currentSlideIndex} />
                </div>
              <p className="line-clamp-2 text-sm font-medium">{getSlideDisplayTitle(slide)}</p>
              {slide.pageCountWithinSource > 1 && (
                <p className={`mt-1 text-xs ${index === currentSlideIndex ? 'text-white/70' : 'text-[#7F93A8]'}`}>
                  原页 {slide.sourceSlideNumber} · 分页 {slide.pageNumberWithinSource}/{slide.pageCountWithinSource}
                </p>
              )}
            </button>
          ))}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className={theme.headerShell}>
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#2F80ED_0%,#00C2FF_100%)] text-white xl:hidden">
                <Presentation className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className={`truncate text-base font-semibold ${theme.headerTitle}`}>{viewerMetadata.projectTitle}</p>
                <div className={`flex flex-wrap items-center gap-2 text-xs ${theme.headerSubtitle}`}>
                  <span>{viewerMetadata.customerName}</span>
                  <span>•</span>
                  <span>{viewerMetadata.interviewDate}</span>
                  {currentSlide?.pageCountWithinSource > 1 && (
                    <>
                      <span>•</span>
                      <span>原页 {currentSlide.sourceSlideNumber} 分页 {currentSlide.pageNumberWithinSource}/{currentSlide.pageCountWithinSource}</span>
                    </>
                  )}
                </div>
              </div>
              <Badge variant="secondary" className={theme.headerBadge}>
                {currentSlideIndex + 1} / {totalSlides}
              </Badge>
              <Badge variant="secondary" className="border border-emerald-400/30 bg-emerald-500/10 text-emerald-200">
                {viewerMetadata.version || 'unknown-version'}
              </Badge>
              {viewerMetadata.version?.includes('llm') && (
                <Badge variant="secondary" className="border border-[#2F80ED]/30 bg-[rgba(47,128,237,0.16)] text-[#8EDBFF]">
                  <Sparkles className="mr-1 h-3 w-3" />
                  AI智能方案
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleCopyOutline}>
                {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                复制大纲
              </Button>
              {onRegenerate && (
                <Button variant="outline" size="sm" onClick={onRegenerate}>
                  <Sparkles className="mr-2 h-4 w-4" />
                  重新生成
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => void handleToggleFullscreen()}>
                {isFullscreen ? <Minimize2 className="mr-2 h-4 w-4" /> : <Maximize2 className="mr-2 h-4 w-4" />}
                {isFullscreen ? '退出全屏' : '全屏放映'}
              </Button>
              {onExportPPT && (
                <Button size="sm" onClick={onExportPPT} disabled={isExporting}>
                  <Download className="mr-2 h-4 w-4" />
                  {isExporting ? '导出中...' : '导出PPT'}
                </Button>
              )}
            </div>
          </div>
        </header>

        <div className={theme.paginationShell}>
          <div className="flex items-center justify-center gap-3">
            <Button variant="ghost" size="icon" onClick={handlePrevSlide} disabled={currentSlideIndex === 0}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-1.5">
              {viewerSlides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => handleSlideClick(index)}
                  className={`h-2.5 rounded-full transition-all ${
                    index === currentSlideIndex ? 'w-8 bg-[linear-gradient(135deg,#7B61FF_0%,#00C2FF_100%)]' : 'w-2.5 bg-[#304257] hover:bg-[#4F6B87]'
                  }`}
                />
              ))}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNextSlide}
              disabled={currentSlideIndex === totalSlides - 1}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <main className={`min-h-0 flex-1 overflow-auto ${isFullscreen ? 'bg-[#020817] p-4' : 'p-6'}`}>
          <div className="flex min-h-full items-start justify-center">
            <div
              className="w-full max-w-[1600px]"
              style={{
                minHeight: isFullscreen ? 'calc(100vh - 32px)' : 'calc(100vh - 220px)',
              }}
            >
              <SlideDisplay slide={currentSlide} metadata={viewerMetadata} isFullscreen={isFullscreen} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function SlideDisplay({
  slide,
  metadata,
  isFullscreen = false,
}: {
  slide: ViewerSlide;
  metadata: PPTOutlineContent['metadata'];
  isFullscreen?: boolean;
}) {
  const accent = getSlideAccent(slide.slideType);
  const displayTitle = getSlideDisplayTitle(slide);
  const displaySubtitle = getSlideDisplaySubtitle(slide);
  const keyMessage = getSlideKeyMessage(slide);
  const sectionLabel = getSlideSectionLabel(slide);

  if (slide.slideType === 'cover') {
    return <CoverSlide slide={slide} metadata={metadata} isFullscreen={isFullscreen} />;
  }

  if (slide.slideType === 'closing') {
    return <ClosingSlide slide={slide} metadata={metadata} isFullscreen={isFullscreen} />;
  }

  const layout = slide.presentation?.layout;
  const theme = getViewerTheme(metadata.paletteName);

  return (
    <section className={`min-h-full overflow-visible rounded-[28px] border ${theme.slideFrame} ${isFullscreen ? 'shadow-[0_24px_80px_rgba(2,8,23,0.55)]' : ''}`}>
      <SlideLayoutRenderer
        slide={slide}
        accent={accent}
        layout={layout}
        displayTitle={displayTitle}
        displaySubtitle={displaySubtitle}
        keyMessage={keyMessage}
        sectionLabel={sectionLabel}
      />
    </section>
  );
}

function SlideLayoutRenderer({
  slide,
  accent,
  layout,
  displayTitle,
  displaySubtitle,
  keyMessage,
  sectionLabel,
}: {
  slide: ViewerSlide;
  accent: ReturnType<typeof getSlideAccent>;
  layout?: SlideLayout;
  displayTitle: string;
  displaySubtitle?: string;
  keyMessage?: string;
  sectionLabel: string;
}) {
  const summaryPanel = (
    <>
      {keyMessage && (
        <ContentSection title="本页结论">
          <CalloutCard accentClass={accent.panel}>{keyMessage}</CalloutCard>
        </ContentSection>
      )}

      <ContentSection title="核心内容">
        <KeyPointList points={slide.content.mainPoints} />
      </ContentSection>

      {slide.content.supportingData && slide.content.supportingData.length > 0 && (
        <ContentSection title="支撑信息">
          <SupportingGrid items={slide.content.supportingData} accentClass={accent.soft} />
        </ContentSection>
      )}

      {slide.content.quoteEvidence && slide.content.quoteEvidence.length > 0 && (
        <ContentSection title="证据原话">
          <QuoteList quotes={slide.content.quoteEvidence} />
        </ContentSection>
      )}
    </>
  );

  const visualPanel = (
    <div className="grid min-h-0 flex-1 grid-rows-[220px_minmax(0,1fr)] gap-4">
      <GeneratedSlideArtwork slide={slide} accent={accent} />
      <div className="min-h-0 overflow-hidden">
        <SlideVisualRenderer slide={slide} accent={accent} />
      </div>
    </div>
  );

  const insightPanel = (
    <div className="flex min-h-0 flex-col gap-4 overflow-hidden">
      {summaryPanel}
    </div>
  );

  const header = (
    <div className="mb-8 flex items-start justify-between gap-4 border-b border-slate-200/80 pb-6">
      <div className="flex items-start gap-3">
        <div className={`mt-1 flex h-11 w-11 items-center justify-center rounded-2xl shadow-sm ${accent.badge}`}>
          <accent.Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
            Slide {slide.slideNumber}
          </p>
          <h2 className="max-w-3xl text-[30px] font-semibold leading-tight text-slate-950">{displayTitle}</h2>
          {displaySubtitle && (
            <p className="mt-3 max-w-2xl text-[15px] leading-7 text-slate-500">{displaySubtitle}</p>
          )}
        </div>
      </div>
      <Badge variant="secondary" className="rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-600 shadow-sm">
        {sectionLabel}
      </Badge>
    </div>
  );

  switch (layout) {
    case 'journey-flow':
    case 'timeline-roadmap':
      if (layout === 'journey-flow') {
        return (
          <div className="grid min-h-full grid-rows-[auto_auto_minmax(0,1fr)] p-6 lg:p-8">
            {header}
            <div className="mb-5 grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
              <div className="space-y-4">
                {keyMessage && (
                  <ContentSection title="流程判断">
                    <CalloutCard accentClass={accent.panel}>{keyMessage}</CalloutCard>
                  </ContentSection>
                )}
                <ContentSection title="阶段摘要">
                  <StageSummaryList items={slide.content.mainPoints} />
                </ContentSection>
              </div>
              <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                <GeneratedSlideArtwork slide={slide} accent={accent} />
              </div>
            </div>
            <div className="grid min-h-0 gap-5 lg:grid-cols-[1.08fr_0.92fr]">
              <div className="min-h-0 overflow-hidden rounded-[28px] border border-slate-200 bg-white p-5">
                <SlideVisualRenderer slide={slide} accent={accent} />
              </div>
              <div className="space-y-4 overflow-auto">
                {slide.content.supportingData && slide.content.supportingData.length > 0 && (
                  <ContentSection title="关键动作">
                    <SupportingGrid items={slide.content.supportingData} accentClass={accent.soft} />
                  </ContentSection>
                )}
                <SpeakerNotesDetails notes={slide.speakerNotes} />
              </div>
            </div>
          </div>
        );
      }

      return (
        <div className="grid min-h-full grid-rows-[auto_minmax(0,1.15fr)_minmax(0,0.85fr)] p-6 lg:p-8">
          {header}
          <div className="min-h-0 overflow-hidden rounded-[28px] border border-slate-200 bg-slate-50 p-5">
            {visualPanel}
          </div>
          <div className="min-h-0 overflow-hidden pt-4">{insightPanel}</div>
        </div>
      );
    case 'evidence-focus':
      return (
        <div className="grid min-h-full grid-cols-1 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="flex min-h-0 flex-col border-b border-slate-200 bg-slate-50 p-6 lg:border-b-0 lg:border-r lg:p-8">
            {header}
            <div className="min-h-0 overflow-hidden">{visualPanel}</div>
          </div>
          <div className="flex min-h-0 flex-col gap-5 overflow-hidden p-6 lg:p-8">
            {keyMessage && (
              <div className="rounded-[28px] border border-rose-200 bg-rose-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-rose-700">核心判断</p>
                <p className="mt-3 text-lg font-semibold leading-8 text-slate-900">{keyMessage}</p>
              </div>
            )}
            <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
              <div className="space-y-4">
                <ContentSection title="为什么必须优先解决">
                  <KeyPointList points={slide.content.mainPoints} />
                </ContentSection>
                <SpeakerNotesDetails notes={slide.speakerNotes} />
              </div>
              <div className="space-y-4">
                {slide.content.quoteEvidence && slide.content.quoteEvidence.length > 0 && (
                  <ContentSection title="用户原话">
                    <QuoteList quotes={slide.content.quoteEvidence} />
                  </ContentSection>
                )}
                {slide.content.supportingData && slide.content.supportingData.length > 0 && (
                  <ContentSection title="影响与根因">
                    <SupportingGrid items={slide.content.supportingData} accentClass={accent.soft} />
                  </ContentSection>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    case 'matrix-compare':
    case 'mapping-board':
    case 'risk-board':
    case 'value-dashboard':
      if (layout === 'value-dashboard') {
        return (
          <div className="grid min-h-full grid-rows-[auto_auto_minmax(0,1fr)] p-6 lg:p-8">
            {header}
            <div className="mb-5 grid gap-4 lg:grid-cols-[0.92fr_1.08fr]">
              {keyMessage && <CalloutCard accentClass={accent.panel}>{keyMessage}</CalloutCard>}
              <div className="grid gap-3 md:grid-cols-2">
                {slide.content.mainPoints.map((point, index) => (
                  <MetricStatementCard key={index} index={index + 1} text={point} />
                ))}
              </div>
            </div>
            <div className="grid min-h-0 gap-5 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="min-h-0 overflow-hidden rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                {visualPanel}
              </div>
              <div className="space-y-4 overflow-auto">
                {slide.content.supportingData && slide.content.supportingData.length > 0 && (
                  <ContentSection title="价值说明">
                    <SupportingGrid items={slide.content.supportingData} accentClass={accent.soft} />
                  </ContentSection>
                )}
                <SpeakerNotesDetails notes={slide.speakerNotes} />
              </div>
            </div>
          </div>
        );
      }

      if (layout === 'risk-board') {
        return (
          <div className="grid min-h-full grid-rows-[auto_minmax(0,1fr)] p-6 lg:p-8">
            {header}
            <div className="grid min-h-0 gap-5 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="min-h-0 overflow-hidden rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                {visualPanel}
              </div>
              <div className="space-y-4 overflow-auto">
                {keyMessage && (
                  <ContentSection title="风险判断">
                    <CalloutCard accentClass={accent.panel}>{keyMessage}</CalloutCard>
                  </ContentSection>
                )}
                <ContentSection title="重点风险">
                  <KeyPointList points={slide.content.mainPoints} />
                </ContentSection>
                {slide.content.supportingData && slide.content.supportingData.length > 0 && (
                  <ContentSection title="缓解动作">
                    <SupportingGrid items={slide.content.supportingData} accentClass={accent.soft} />
                  </ContentSection>
                )}
                <SpeakerNotesDetails notes={slide.speakerNotes} />
              </div>
            </div>
          </div>
        );
      }

      return (
        <div className="grid min-h-full grid-cols-1 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="flex min-h-0 flex-col border-b border-slate-200 bg-slate-50 p-6 lg:border-b-0 lg:border-r lg:p-8">
            {header}
            <div className="min-h-0 overflow-hidden rounded-[28px] border border-slate-200 bg-white p-4">
              {visualPanel}
            </div>
          </div>
          <div className="flex min-h-0 flex-col overflow-hidden p-6 lg:p-8">
            {insightPanel}
            <div className="mt-4">
              <SpeakerNotesDetails notes={slide.speakerNotes} />
            </div>
          </div>
        </div>
      );
    case 'persona-spotlight':
    case 'solution-spotlight':
      if (layout === 'solution-spotlight') {
        return (
          <div className="grid min-h-full grid-rows-[auto_minmax(0,1fr)] p-6 lg:p-8">
            {header}
            <div className="grid min-h-0 gap-5 lg:grid-cols-[0.95fr_1.05fr]">
              <div className="space-y-4 overflow-auto">
                {keyMessage && (
                  <ContentSection title="推荐方案">
                    <CalloutCard accentClass={accent.panel}>{keyMessage}</CalloutCard>
                  </ContentSection>
                )}
                <ContentSection title="为什么是优先方案">
                  <KeyPointList points={slide.content.mainPoints} />
                </ContentSection>
                {slide.content.supportingData && slide.content.supportingData.length > 0 && (
                  <ContentSection title="方案要点">
                    <SupportingGrid items={slide.content.supportingData} accentClass={accent.soft} />
                  </ContentSection>
                )}
                <SpeakerNotesDetails notes={slide.speakerNotes} />
              </div>
              <div className="min-h-0 overflow-hidden rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                {visualPanel}
              </div>
            </div>
          </div>
        );
      }

      if (layout === 'persona-spotlight') {
        return (
          <div className="grid min-h-full grid-rows-[auto_minmax(0,1fr)] p-6 lg:p-8">
            {header}
            <div className="grid min-h-0 gap-5 lg:grid-cols-[0.92fr_1.08fr]">
              <div className="min-h-0 overflow-hidden rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                {visualPanel}
              </div>
              <div className="space-y-4 overflow-auto">
                {keyMessage && (
                  <ContentSection title="人物结论">
                    <CalloutCard accentClass={accent.panel}>{keyMessage}</CalloutCard>
                  </ContentSection>
                )}
                <div className="grid gap-4 md:grid-cols-2">
                  <MiniInfoStack title="角色与目标" items={slide.content.mainPoints.slice(0, 2)} />
                  <MiniInfoStack title="痛点与行为" items={slide.content.mainPoints.slice(2)} />
                </div>
                {slide.content.quoteEvidence && slide.content.quoteEvidence.length > 0 && (
                  <ContentSection title="典型表达">
                    <QuoteList quotes={slide.content.quoteEvidence} />
                  </ContentSection>
                )}
                {slide.content.supportingData && slide.content.supportingData.length > 0 && (
                  <ContentSection title="补充观察">
                    <SupportingGrid items={slide.content.supportingData} accentClass={accent.soft} />
                  </ContentSection>
                )}
                <SpeakerNotesDetails notes={slide.speakerNotes} />
              </div>
            </div>
          </div>
        );
      }

      return (
        <div className="grid min-h-full grid-cols-1 lg:grid-cols-[1fr_1fr]">
          <div className="flex min-h-0 flex-col border-b border-slate-200 bg-slate-50 p-6 lg:border-b-0 lg:border-r lg:p-8">
            {header}
            <div className="min-h-0 overflow-hidden">{visualPanel}</div>
          </div>
          <div className="flex min-h-0 flex-col overflow-hidden p-6 lg:p-8">
            {insightPanel}
            <div className="mt-4">
              <SpeakerNotesDetails notes={slide.speakerNotes} />
            </div>
          </div>
        </div>
      );
    case 'analysis-board':
    case 'requirement-tree':
    case 'context-split':
    default:
      if (layout === 'context-split') {
        return (
          <div className="grid min-h-full grid-rows-[auto_minmax(0,1fr)] p-6 lg:p-8">
            {header}
            <div className="grid min-h-0 gap-5 lg:grid-cols-[0.98fr_1.02fr]">
              <div className="space-y-4 overflow-auto">
                {keyMessage && (
                  <ContentSection title="背景结论">
                    <CalloutCard accentClass={accent.panel}>{keyMessage}</CalloutCard>
                  </ContentSection>
                )}
                <ContentSection title="为什么现在讨论">
                  <KeyPointList points={slide.content.mainPoints} />
                </ContentSection>
                {slide.content.supportingData && slide.content.supportingData.length > 0 && (
                  <ContentSection title="研究范围">
                    <StatStrip items={slide.content.supportingData} />
                  </ContentSection>
                )}
                <SpeakerNotesDetails notes={slide.speakerNotes} />
              </div>
              <div className="grid min-h-0 gap-4 rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                <GeneratedSlideArtwork slide={slide} accent={accent} />
                <div className="min-h-0 overflow-hidden rounded-[24px] border border-slate-200 bg-white p-4">
                  <SlideVisualRenderer slide={slide} accent={accent} />
                </div>
              </div>
            </div>
          </div>
        );
      }

      return (
        <div className="grid min-h-full grid-cols-1 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="flex min-h-0 flex-col border-b border-slate-200 bg-slate-50 p-6 lg:border-b-0 lg:border-r lg:p-8">
            {header}
            {visualPanel}
          </div>
          <div className="flex min-h-0 flex-col overflow-hidden p-6 lg:p-8">
            {insightPanel}
            <div className="mt-4">
              <SpeakerNotesDetails notes={slide.speakerNotes} />
            </div>
          </div>
        </div>
      );
  }
}

function CoverSlide({
  slide,
  metadata,
}: {
  slide: ViewerSlide;
  metadata: PPTOutlineContent['metadata'];
  isFullscreen?: boolean;
}) {
  const headline = getSlideDisplayTitle(slide) || metadata.projectTitle;
  const subheadline =
    getSlideDisplaySubtitle(slide) ||
    slide.content.mainPoints[0] ||
    '聚焦客户痛点、解决方案与业务价值的结构化分享报告。';
  const keyMessage = getSlideKeyMessage(slide);
  const imageAsset = slide.presentation?.imageAsset;

  return (
    <section className="min-h-full overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
      <div className="grid min-h-full grid-cols-1 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="relative flex flex-col justify-between overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(47,128,237,0.18),_transparent_24%),linear-gradient(180deg,#08111F_0%,#0B1F3A_42%,#07111E_100%)] p-10 text-white">
          <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl" />
          <div className="absolute bottom-[-72px] left-[-40px] h-56 w-56 rounded-full bg-blue-500/10 blur-3xl" />
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
              <Presentation className="h-7 w-7" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Customer Insight Report</p>
              <p className="text-sm text-slate-300">{metadata.customerName}</p>
            </div>
          </div>

          <div className="relative space-y-6">
            <Badge variant="secondary" className="bg-white/10 text-white hover:bg-white/10">
              第 {slide.slideNumber} 页
            </Badge>
            <div className="inline-flex items-center rounded-full border border-emerald-300/25 bg-emerald-400/10 px-3 py-1 text-xs font-semibold tracking-[0.18em] text-emerald-100">
              TEMPLATE REFRAME 1.2
            </div>
            <h1 className="max-w-3xl text-5xl font-semibold leading-tight">{headline}</h1>
            <p className="max-w-2xl text-lg leading-8 text-slate-300">{subheadline}</p>
            {keyMessage && (
              <div className="max-w-2xl rounded-3xl border border-white/10 bg-white/5 px-5 py-4 text-sm leading-7 text-white/85">
                {keyMessage}
              </div>
            )}
          </div>

          <div className="relative grid grid-cols-3 gap-4">
            <MetricCard label="客户" value={metadata.customerName} dark />
            <MetricCard label="访谈日期" value={metadata.interviewDate} dark />
            <MetricCard label="页数" value={`${metadata.totalSlides} 页`} dark />
          </div>
        </div>

        <div className="flex flex-col justify-between bg-[linear-gradient(180deg,#f8fafc_0%,#e2e8f0_100%)] p-10">
          <div className="rounded-[28px] border border-white/60 bg-white/85 p-8 shadow-lg backdrop-blur">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
              {slide.presentation?.sectionLabel || 'Executive Summary'}
            </p>
            <StageSummaryList items={slide.content.mainPoints.slice(0, 4)} />
          </div>

          <div className="mt-8 grid grid-cols-1 gap-4">
            <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <p className="text-sm font-medium text-slate-500">报告说明</p>
              <p className="mt-3 text-sm leading-7 text-slate-700">
                {imageAsset?.alt || '本报告围绕背景、痛点、方案、价值和行动建议展开，适合客户汇报与内部同步。'}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-3xl bg-slate-900 p-6 text-white shadow-sm">
                <p className="text-sm font-medium text-slate-400">视觉风格</p>
                <p className="mt-3 text-lg font-semibold">
                  {imageAsset?.style || slide.presentation?.themeVariant || metadata.version}
                </p>
              </div>
              <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                <p className="text-sm font-medium text-slate-500">
                  {imageAsset?.aspectRatio ? '推荐比例' : '生成时间'}
                </p>
                <p className="mt-3 text-lg font-semibold text-slate-900">
                  {imageAsset?.aspectRatio || new Date(metadata.createdAt).toLocaleDateString('zh-CN')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ClosingSlide({
  slide,
  metadata,
}: {
  slide: ViewerSlide;
  metadata: PPTOutlineContent['metadata'];
  isFullscreen?: boolean;
}) {
  const headline = getSlideDisplayTitle(slide);
  const subheadline =
    getSlideDisplaySubtitle(slide) ||
    slide.speakerNotes ||
    '基于本次访谈洞察，建议从优先级最高的方案开始试点，逐步验证价值并迭代推广。';
  const keyMessage = getSlideKeyMessage(slide);

  return (
    <section className="min-h-full overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
      <div className="grid min-h-full grid-cols-1 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="flex flex-col justify-center bg-[linear-gradient(180deg,#0f172a_0%,#1e293b_100%)] p-10 text-white">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-white/10">
            <Check className="h-8 w-8" />
          </div>
          <p className="mb-3 text-xs uppercase tracking-[0.28em] text-slate-400">
            {slide.presentation?.sectionLabel || 'Next Step'}
          </p>
          <h2 className="text-4xl font-semibold leading-tight">{headline}</h2>
          <p className="mt-5 max-w-xl text-base leading-8 text-slate-300">{subheadline}</p>
          {keyMessage && (
            <div className="mt-6 max-w-xl rounded-3xl border border-white/10 bg-white/5 px-5 py-4 text-sm leading-7 text-white/85">
              {keyMessage}
            </div>
          )}
        </div>

        <div className="flex flex-col justify-between gap-8 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-10">
          <div className="space-y-6">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Action Checklist</p>
              <div className="space-y-4">
                {slide.content.mainPoints.slice(0, 5).map((point, index) => (
                  <div key={index} className="flex gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                      {index + 1}
                    </span>
                    <p className="text-sm leading-7 text-slate-700">{point}</p>
                  </div>
                ))}
              </div>
            </div>
            {slide.content.supportingData && slide.content.supportingData.length > 0 && (
              <ContentSection title="落地说明">
                <SupportingGrid items={slide.content.supportingData} accentClass="border-slate-200 bg-slate-50 text-slate-700" />
              </ContentSection>
            )}
          </div>

          <div className="space-y-4">
            <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="grid grid-cols-3 gap-4">
                <MetricCard label="项目" value={metadata.projectTitle} />
                <MetricCard label="客户" value={metadata.customerName} />
                <MetricCard label="访谈日期" value={metadata.interviewDate} />
              </div>
            </div>
            <SpeakerNotesDetails notes={slide.speakerNotes} />
          </div>
        </div>
      </div>
    </section>
  );
}

function ContentSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="min-h-0">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">{title}</p>
      {children}
    </section>
  );
}


function CalloutCard({
  children,
  accentClass,
}: {
  children: React.ReactNode;
  accentClass: string;
}) {
  return (
    <div className={`rounded-[24px] border px-5 py-4 text-sm font-medium leading-7 shadow-sm ${accentClass}`}>
      {children}
    </div>
  );
}

function SpeakerNotesDetails({ notes }: { notes?: string }) {
  if (!notes) return null;

  return (
    <details className="group rounded-2xl border border-slate-200 bg-slate-50/85 p-4">
      <summary className="cursor-pointer list-none text-sm font-medium text-slate-600">
        查看讲稿备注
      </summary>
      <div className="mt-3 border-t border-slate-200 pt-3 text-sm leading-7 text-slate-600">
        {notes}
      </div>
    </details>
  );
}

function KeyPointList({ points }: { points: string[] }) {
  return (
    <div className="space-y-3">
      {points.map((point, index) => (
        <div key={index} className="flex gap-3 rounded-[20px] border border-slate-200/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-4 shadow-[0_10px_25px_rgba(15,23,42,0.05)]">
          <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white shadow-sm">
            {index + 1}
          </span>
          <p className="text-[15px] leading-7 text-slate-700">{point}</p>
        </div>
      ))}
    </div>
  );
}

function SupportingGrid({
  items,
  accentClass,
}: {
  items: string[];
  accentClass: string;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {items.map((item, index) => (
        <div key={index} className={`rounded-[20px] border p-4 text-[14px] leading-7 shadow-sm ${accentClass}`}>
          {item}
        </div>
      ))}
    </div>
  );
}

function QuoteList({ quotes }: { quotes: string[] }) {
  return (
    <div className="space-y-3">
      {quotes.map((quote, index) => (
        <blockquote key={index} className="rounded-[20px] border border-amber-200 bg-[linear-gradient(180deg,#fffaf0_0%,#fff7ed_100%)] px-5 py-4 text-[15px] italic leading-7 text-slate-700 shadow-sm">
          “{quote}”
        </blockquote>
      ))}
    </div>
  );
}

function MetricCard({
  label,
  value,
  dark = false,
}: {
  label: string;
  value: string;
  dark?: boolean;
}) {
  return (
    <div className={`rounded-[24px] p-5 ${dark ? 'bg-white/10 text-white ring-1 ring-white/10' : 'bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] text-slate-900 ring-1 ring-slate-200 shadow-sm'}`}>
      <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${dark ? 'text-slate-300' : 'text-slate-400'}`}>{label}</p>
      <p className={`mt-3 text-sm leading-6 ${dark ? 'text-white' : 'text-slate-700'}`}>{value}</p>
    </div>
  );
}

function MetricStatementCard({ index, text }: { index: number; text: string }) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Metric {index}</p>
      <p className="mt-3 text-sm font-medium leading-7 text-slate-700">{text}</p>
    </div>
  );
}

function StageSummaryList({ items }: { items: string[] }) {
  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div key={`${item}-${index}`} className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
            {index + 1}
          </span>
          <p className="text-sm leading-7 text-slate-700">{item}</p>
        </div>
      ))}
    </div>
  );
}

function MiniInfoStack({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
      <p className="mb-3 text-sm font-semibold text-slate-900">{title}</p>
      <div className="space-y-2">
        {items.length > 0 ? items.map((item, index) => (
          <div key={`${item}-${index}`} className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
            {item}
          </div>
        )) : (
          <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">暂无数据</div>
        )}
      </div>
    </div>
  );
}

function StatStrip({ items }: { items: string[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map((item, index) => (
        <div key={`${item}-${index}`} className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Scope {index + 1}</p>
          <p className="mt-2 text-sm leading-6 text-slate-700">{item}</p>
        </div>
      ))}
    </div>
  );
}

function SlideVisualRenderer({
  slide,
  accent,
}: {
  slide: ViewerSlide;
  accent: ReturnType<typeof getSlideAccent>;
}) {
  switch (slide.visual.type) {
    case 'character-card':
      return <CharacterVisual config={slide.visual} accent={accent} />;
    case 'flow-chart':
      return <FlowChartVisual config={slide.visual} accent={accent} />;
    case 'painpoint-detail':
      return <PainPointDetailVisual config={slide.visual} accent={accent} />;
    case 'priority-matrix':
      return <PriorityMatrixVisual config={slide.visual} accent={accent} />;
    case 'cause-effect':
      return <CauseEffectVisual config={slide.visual} accent={accent} />;
    case 'tree-diagram':
      return <TreeDiagramVisual config={slide.visual} accent={accent} />;
    case 'solution-detail':
      return <SolutionDetailVisual config={slide.visual} accent={accent} />;
    case 'mapping-diagram':
      return <MappingVisual config={slide.visual} accent={accent} />;
    case 'roi-chart':
      return <RoiVisual config={slide.visual} accent={accent} />;
    case 'timeline':
      return <TimelineVisual config={slide.visual} accent={accent} />;
    case 'risk-matrix':
      return <RiskMatrixVisual config={slide.visual} accent={accent} />;
    case 'infographic':
      return <InfographicVisual accent={accent} />;
    case 'scene-illustration':
      return <SceneVisual config={slide.visual} accent={accent} />;
    case 'logo-placeholder':
      return <LogoVisual config={slide.visual} accent={accent} />;
    default:
      return null;
  }
}

function GeneratedSlideArtwork({
  slide,
  accent,
}: {
  slide: ViewerSlide;
  accent: ReturnType<typeof getSlideAccent>;
}) {
  const keywords = extractSlideKeywords(slide);
  const imageAsset = slide.presentation?.imageAsset;
  const gradientMap: Record<string, string> = {
    封面: 'from-slate-900 via-slate-800 to-slate-700',
    背景: 'from-blue-700 via-cyan-600 to-sky-500',
    画像: 'from-violet-600 via-fuchsia-500 to-pink-500',
    流程: 'from-emerald-600 via-teal-500 to-cyan-500',
    痛点: 'from-rose-600 via-red-500 to-orange-400',
    分析: 'from-amber-500 via-orange-500 to-yellow-400',
    需求: 'from-cyan-600 via-sky-500 to-blue-500',
    方案: 'from-emerald-600 via-green-500 to-lime-400',
    价值: 'from-indigo-600 via-blue-600 to-cyan-500',
    实施: 'from-sky-600 via-blue-500 to-indigo-500',
    风险: 'from-orange-600 via-amber-500 to-yellow-400',
    总结: 'from-slate-800 via-slate-700 to-slate-600',
    页面: 'from-slate-800 via-slate-700 to-slate-600',
  };
  const gradient = gradientMap[accent.label] || gradientMap.页面;

  return (
    <div className={`relative overflow-hidden rounded-[28px] bg-gradient-to-br ${gradient} p-6 text-white shadow-lg`}>
      <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-white/10 blur-2xl" />
      <div className="absolute -bottom-12 left-10 h-40 w-40 rounded-full bg-black/10 blur-3xl" />
      <div className="absolute inset-0 opacity-[0.12]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.28) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.28) 1px, transparent 1px)', backgroundSize: '26px 26px' }} />

      <div className="relative flex h-full flex-col justify-between">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-white/70">
              {imageAsset?.placement ? `Visual ${imageAsset.placement}` : 'Visual Story'}
            </p>
            <h3 className="mt-2 max-w-lg text-2xl font-semibold leading-tight">{getSlideDisplayTitle(slide)}</h3>
            {(getSlideDisplaySubtitle(slide) || imageAsset?.alt) && (
              <p className="mt-2 max-w-lg text-sm leading-6 text-white/75">
                {getSlideDisplaySubtitle(slide) || imageAsset?.alt}
              </p>
            )}
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
            <ImageIcon className="h-6 w-6" />
          </div>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
          {keywords.slice(0, 3).map((keyword, index) => (
            <div key={`${keyword}-${index}`} className="rounded-2xl bg-white/12 px-4 py-3 backdrop-blur-sm">
              <p className="text-xs uppercase tracking-[0.18em] text-white/60">重点</p>
              <p className="mt-2 text-sm font-medium leading-5">{keyword}</p>
            </div>
          ))}
          </div>
          {(imageAsset?.style || imageAsset?.aspectRatio || imageAsset?.placement) && (
            <div className="flex flex-wrap gap-2">
              {imageAsset?.style && (
                <span className="rounded-full bg-white/12 px-3 py-1 text-xs font-medium text-white/80">
                  风格 {imageAsset.style}
                </span>
              )}
              {imageAsset?.aspectRatio && (
                <span className="rounded-full bg-white/12 px-3 py-1 text-xs font-medium text-white/80">
                  比例 {imageAsset.aspectRatio}
                </span>
              )}
              {imageAsset?.placement && (
                <span className="rounded-full bg-white/12 px-3 py-1 text-xs font-medium text-white/80">
                  位置 {imageAsset.placement}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CharacterVisual({
  config,
  accent,
}: {
  config: Extract<VisualConfig, { type: 'character-card' }>;
  accent: ReturnType<typeof getSlideAccent>;
}) {
  return (
    <div className="space-y-5">
      <div className={`rounded-[28px] border p-6 ${accent.panel}`}>
        <div className="flex items-start gap-5">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white text-2xl font-semibold text-slate-900 shadow-sm">
            {config.config.name?.charAt(0) || 'U'}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-500">目标角色</p>
            <h3 className="mt-1 text-2xl font-semibold text-slate-900">{config.config.name}</h3>
            <p className="mt-1 text-base text-slate-600">{config.config.role}</p>
            {config.config.department && <p className="mt-2 text-sm text-slate-500">{config.config.department}</p>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <MiniPanel title="核心目标" items={config.config.keyGoals} />
        <MiniPanel title="关键痛点" items={config.config.keyPainPoints} />
      </div>
    </div>
  );
}

function FlowChartVisual({
  config,
  accent,
}: {
  config: Extract<VisualConfig, { type: 'flow-chart' }>;
  accent: ReturnType<typeof getSlideAccent>;
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        {config.config.stages.map((stage, index) => (
          <div key={`${stage.name}-${index}`} className="flex min-w-[120px] flex-1 items-center gap-3">
            <div className={`flex min-h-[72px] flex-1 items-center justify-center rounded-3xl border px-4 text-center text-sm font-medium ${
              stage.isHighlight ? accent.panel : 'border-slate-200 bg-white text-slate-700'
            }`}>
              {stage.name}
            </div>
            {index < config.config.stages.length - 1 && <div className="text-slate-300">→</div>}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {config.config.stages.map((stage, index) => (
          <div key={index} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <p className="font-semibold text-slate-900">{stage.name}</p>
              {stage.isHighlight && <Badge variant="secondary" className="bg-amber-50 text-amber-700">关键阶段</Badge>}
            </div>
            <div className="space-y-2">
              {stage.tasks.slice(0, 3).map((task, taskIndex) => (
                <p key={taskIndex} className="text-sm text-slate-600">{task}</p>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PainPointDetailVisual({
  config,
}: {
  config: Extract<VisualConfig, { type: 'painpoint-detail' }>;
  accent: ReturnType<typeof getSlideAccent>;
}) {
  return (
    <div className="space-y-5">
      <div className="rounded-[28px] border border-rose-200 bg-rose-50 p-6">
        <div className="mb-4 flex flex-wrap gap-2">
          <Badge variant="secondary" className="bg-rose-100 text-rose-700">严重度 {levelLabel(config.config.severity)}</Badge>
          <Badge variant="secondary" className="bg-orange-100 text-orange-700">频率 {levelLabel(config.config.frequency)}</Badge>
        </div>
        <h3 className="text-2xl font-semibold text-slate-900">{config.config.title}</h3>
        <p className="mt-3 text-sm leading-7 text-slate-600">{config.config.scope}</p>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-amber-700">证据原话</p>
        <p className="text-sm italic leading-7 text-slate-700">“{config.config.quote}”</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <MiniPanel title="影响指标" items={config.config.metrics} />
        <MiniPanel title="表层原因" items={config.config.rootCause.surface} />
      </div>
    </div>
  );
}

function PriorityMatrixVisual({
  config,
}: {
  config: Extract<VisualConfig, { type: 'priority-matrix' }>;
  accent: ReturnType<typeof getSlideAccent>;
}) {
  const getGridPosition = (impact: 'high' | 'medium' | 'low', frequency: 'high' | 'medium' | 'low') => {
    const col = frequency === 'high' ? 'col-start-2' : 'col-start-1';
    const row = impact === 'high' ? 'row-start-1' : 'row-start-2';
    return `${col} ${row}`;
  };

  return (
    <div className="space-y-5">
      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-900">{config.config.title || '优先级矩阵'}</p>
          <p className="text-xs text-slate-400">{config.config.yAxisLabel} × {config.config.xAxisLabel}</p>
        </div>

        <div className="grid grid-cols-[72px_1fr_1fr] grid-rows-[1fr_1fr_48px] gap-3">
          <div />
          <div className="rounded-2xl bg-slate-100 px-3 py-2 text-center text-xs font-medium text-slate-500">低频</div>
          <div className="rounded-2xl bg-slate-100 px-3 py-2 text-center text-xs font-medium text-slate-500">高频</div>

          <div className="flex items-center justify-center rounded-2xl bg-slate-100 px-2 text-xs font-medium text-slate-500">
            高影响
          </div>
          <div className="relative rounded-[24px] border border-slate-200 bg-slate-50 p-3" />
          <div className="relative rounded-[24px] border border-slate-200 bg-rose-50 p-3" />

          <div className="flex items-center justify-center rounded-2xl bg-slate-100 px-2 text-xs font-medium text-slate-500">
            中低影响
          </div>
          <div className="relative rounded-[24px] border border-slate-200 bg-slate-50 p-3" />
          <div className="relative rounded-[24px] border border-slate-200 bg-amber-50 p-3" />

          <div />
          <div className="text-center text-xs text-slate-400">{config.config.xAxisLabel}</div>
          <div className="text-center text-xs text-slate-400">{config.config.xAxisLabel}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {config.config.items.map((item, index) => (
          <div
            key={item.id}
            className={`rounded-2xl border p-4 shadow-sm ${
              item.impact === 'high' && item.frequency === 'high'
                ? 'border-rose-200 bg-rose-50'
                : item.frequency === 'high'
                  ? 'border-amber-200 bg-amber-50'
                  : 'border-slate-200 bg-white'
            }`}
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-900">{item.label}</span>
              <span className="text-xs text-slate-500">#{index + 1}</span>
            </div>
            <p className="text-sm leading-6 text-slate-600">{item.description}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant="secondary" className="bg-white text-slate-600">
                影响 {levelLabel(item.impact)}
              </Badge>
              <Badge variant="secondary" className="bg-white text-slate-600">
                频率 {levelLabel(item.frequency)}
              </Badge>
            </div>
          </div>
        ))}
      </div>

      <div className="hidden">
        <p className="text-sm font-semibold text-slate-900">{config.config.title || '优先级矩阵'}</p>
        <p className="text-xs text-slate-400">{config.config.yAxisLabel} × {config.config.xAxisLabel}</p>
      </div>
    </div>
  );
}

function CauseEffectVisual({
  config,
}: {
  config: Extract<VisualConfig, { type: 'cause-effect' }>;
  accent: ReturnType<typeof getSlideAccent>;
}) {
  return (
    <div className="space-y-4">
      {config.config.rootCauses.map((rootCause, index) => (
        <div key={index} className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-900">{rootCause.cause}</p>
          <div className="mt-4 space-y-2">
            {rootCause.effects.map((effect, effectIndex) => (
              <div key={effectIndex} className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                {effect}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function TreeDiagramVisual({
  config,
}: {
  config: Extract<VisualConfig, { type: 'tree-diagram' }>;
  accent: ReturnType<typeof getSlideAccent>;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-[24px] bg-slate-900 px-6 py-4 text-lg font-semibold text-white">
        {config.config.root}
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {config.config.branches.map((branch, index) => (
          <MiniPanel key={index} title={branch.category} items={branch.items} />
        ))}
      </div>
    </div>
  );
}

function SolutionDetailVisual({
  config,
  accent,
}: {
  config: Extract<VisualConfig, { type: 'solution-detail' }>;
  accent: ReturnType<typeof getSlideAccent>;
}) {
  return (
    <div className="space-y-5">
      <div className={`rounded-[28px] border p-6 ${accent.panel}`}>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">方案概览</p>
        <h3 className="mt-2 text-2xl font-semibold text-slate-900">{config.config.title}</h3>
        <p className="mt-3 text-sm leading-7 text-slate-600">{config.config.howItWorks}</p>
      </div>

      <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
        <p className="mb-3 text-sm font-semibold text-slate-900">实施步骤</p>
        <div className="space-y-3">
          {config.config.steps.slice(0, 4).map((step) => (
            <div key={step.step} className="flex gap-3 rounded-2xl bg-slate-50 p-4">
              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                {step.step}
              </span>
              <div>
                <p className="text-sm font-medium text-slate-900">{step.action}</p>
                <p className="mt-1 text-sm text-slate-600">{step.details}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MappingVisual({
  config,
}: {
  config: Extract<VisualConfig, { type: 'mapping-diagram' }>;
  accent: ReturnType<typeof getSlideAccent>;
}) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-900">{config.config.title}</p>
        <Badge variant="secondary" className="bg-slate-100 text-slate-600">
          {config.config.mappings.length} 组映射
        </Badge>
      </div>

      <div className="space-y-4">
        {config.config.mappings.map((mapping, index) => (
          <div key={`${mapping.painPointId}-${mapping.solutionId}`} className="grid grid-cols-[1fr_72px_1fr] items-center gap-4">
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-rose-700">
                Pain Point {mapping.painPointRank}
              </p>
              <p className="text-sm font-medium leading-6 text-slate-700">{mapping.painPointLabel}</p>
            </div>

            <div className="flex items-center justify-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                {index + 1}
              </div>
              <div className="h-[2px] flex-1 bg-slate-300" />
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
                Solution
              </p>
              <p className="text-sm font-medium leading-6 text-slate-700">{mapping.solutionLabel}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RoiVisual({
  config,
}: {
  config: Extract<VisualConfig, { type: 'roi-chart' }>;
  accent: ReturnType<typeof getSlideAccent>;
}) {
  const normalizeWidth = (value: string, fallback: number) => {
    const match = value.match(/(\d+)(%?)/);
    if (!match) return `${fallback}%`;
    const numeric = Number(match[1]);
    if (match[2] === '%') return `${Math.min(numeric, 100)}%`;
    return `${Math.min(Math.max(numeric, 15), 100)}%`;
  };

  return (
    <div className="space-y-5">
      {config.config.directValue.map((value, index) => (
        <div key={index} className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">{value.metric}</p>
              <p className="text-xs text-slate-500">{value.improvement}</p>
            </div>
            {config.config.estimatedROI && (
              <Badge variant="secondary" className="bg-emerald-50 text-emerald-700">{config.config.estimatedROI}</Badge>
            )}
          </div>
          <div className="space-y-3">
            <ValueBar label="现状" width={normalizeWidth(value.before, 38)} tone="bg-slate-300" value={value.before} />
            <ValueBar label="目标" width={normalizeWidth(value.after, 82)} tone="bg-slate-900" value={value.after} />
          </div>
        </div>
      ))}

      {config.config.longTermValue.length > 0 && (
        <div className="rounded-[24px] border border-indigo-200 bg-indigo-50 p-5">
          <p className="mb-3 text-sm font-semibold text-slate-900">长期业务价值</p>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {config.config.longTermValue.slice(0, 3).map((item, index) => (
              <div key={index} className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
                {item}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TimelineVisual({
  config,
}: {
  config: Extract<VisualConfig, { type: 'timeline' }>;
  accent: ReturnType<typeof getSlideAccent>;
}) {
  return (
    <div className="relative space-y-4 before:absolute before:left-5 before:top-4 before:bottom-4 before:w-px before:bg-slate-200">
      {config.config.phases.map((phase, index) => (
        <div key={index} className="relative flex gap-4 rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex w-24 shrink-0 flex-col items-center">
            <div className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
              {index + 1}
            </div>
            <div className="mt-3 text-center text-xs text-slate-500">{phase.duration}</div>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900">{phase.name}</p>
            <div className="mt-2 space-y-1">
              {phase.actions.map((action, actionIndex) => (
                <p key={actionIndex} className="text-sm text-slate-600">{action}</p>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function RiskMatrixVisual({
  config,
}: {
  config: Extract<VisualConfig, { type: 'risk-matrix' }>;
  accent: ReturnType<typeof getSlideAccent>;
}) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-[72px_1fr_1fr] grid-rows-[1fr_1fr] gap-3 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
        <div />
        <div className="rounded-2xl bg-slate-100 px-3 py-2 text-center text-xs font-medium text-slate-500">影响中低</div>
        <div className="rounded-2xl bg-slate-100 px-3 py-2 text-center text-xs font-medium text-slate-500">影响高</div>
        <div className="flex items-center justify-center rounded-2xl bg-slate-100 px-2 text-xs font-medium text-slate-500">
          概率中低
        </div>
        <div className="rounded-[24px] border border-slate-200 bg-slate-50" />
        <div className="rounded-[24px] border border-slate-200 bg-amber-50" />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {config.config.risks.map((risk, index) => (
        <div key={index} className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900">风险 {index + 1}</p>
            <Badge variant="secondary" className="bg-amber-50 text-amber-700">
              {levelLabel(risk.probability)} / {levelLabel(risk.impact)}
            </Badge>
          </div>
          <p className="text-sm leading-7 text-slate-700">{risk.risk}</p>
          <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">{risk.mitigation}</div>
        </div>
      ))}
      </div>
    </div>
  );
}

function InfographicVisual({ accent }: { accent: ReturnType<typeof getSlideAccent> }) {
  return (
    <div className={`flex min-h-[420px] items-center justify-center rounded-[28px] border ${accent.panel}`}>
      <div className="max-w-md text-center">
        <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-white text-slate-900 shadow-sm">
          <Check className="h-9 w-9" />
        </div>
        <h3 className="text-2xl font-semibold text-slate-900">访谈洞察已结构化完成</h3>
        <p className="mt-4 text-sm leading-7 text-slate-600">
          当前页适合作为总结页或信息图收束页，帮助客户快速回顾核心发现、行动方向与优先级。
        </p>
      </div>
    </div>
  );
}

function SceneVisual({
  config,
  accent,
}: {
  config: Extract<VisualConfig, { type: 'scene-illustration' }>;
  accent: ReturnType<typeof getSlideAccent>;
}) {
  return (
    <div className={`flex min-h-[420px] flex-col justify-between rounded-[28px] border p-8 ${accent.panel}`}>
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-3xl bg-white p-6 shadow-sm" />
        <div className="rounded-3xl bg-white p-6 shadow-sm" />
        <div className="rounded-3xl bg-white p-6 shadow-sm" />
      </div>
      <div className="rounded-[24px] bg-white p-6 shadow-sm">
        <p className="text-sm leading-7 text-slate-700">{config.config.description}</p>
      </div>
    </div>
  );
}

function LogoVisual({
  config,
}: {
  config: Extract<VisualConfig, { type: 'logo-placeholder' }>;
  accent: ReturnType<typeof getSlideAccent>;
}) {
  return (
    <div className="flex min-h-[420px] items-center justify-center rounded-[28px] border border-slate-200 bg-white">
      <div className="flex h-40 w-40 items-center justify-center rounded-[32px] bg-slate-900 text-center text-xl font-semibold text-white shadow-lg">
        {config.config.companyName || 'LOGO'}
      </div>
    </div>
  );
}

function MiniPanel({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-5 shadow-sm">
      <p className="mb-3 text-sm font-semibold text-slate-900">{title}</p>
      <div className="space-y-2">
        {items.length > 0 ? (
          items.slice(0, 4).map((item, index) => (
            <div key={index} className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-600 ring-1 ring-slate-100">
              {item}
            </div>
          ))
        ) : (
          <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">暂无数据</div>
        )}
      </div>
    </div>
  );
}

function ValueBar({
  label,
  width,
  tone,
  value,
}: {
  label: string;
  width: string;
  tone: string;
  value: string;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="text-slate-500">{label}</span>
        <span className="font-medium text-slate-700">{value}</span>
      </div>
      <div className="h-3 rounded-full bg-slate-100">
        <div className={`h-3 rounded-full ${tone}`} style={{ width }} />
      </div>
    </div>
  );
}

function SlideTypeLabel({ type, active }: { type: SlideType; active: boolean }) {
  const Icon = getSlideAccent(type).Icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium ${
      active ? 'bg-white/15 text-white' : 'bg-white text-slate-600'
    }`}>
      <Icon className="h-3.5 w-3.5" />
      {getSlideAccent(type).label}
    </span>
  );
}

function getSlideAccent(type: SlideType) {
  switch (type) {
    case 'cover':
      return { label: '封面', Icon: Presentation, badge: 'border border-[#2F80ED]/35 bg-[rgba(47,128,237,0.18)] text-[#D8EEFF]', panel: 'border-[#2F80ED]/30 bg-[rgba(15,23,42,0.88)]', soft: 'border-[#243247] bg-[rgba(15,23,42,0.78)] text-[#C8D6E5]' };
    case 'background':
      return { label: '背景', Icon: FileText, badge: 'border border-[#2F80ED]/35 bg-[rgba(47,128,237,0.16)] text-[#8EDBFF]', panel: 'border-[#2F80ED]/30 bg-[rgba(17,32,53,0.9)]', soft: 'border-[#2A425F] bg-[rgba(20,40,66,0.68)] text-[#C8D6E5]' };
    case 'persona':
      return { label: '画像', Icon: UserRound, badge: 'border border-[#7B61FF]/35 bg-[rgba(123,97,255,0.18)] text-[#D9D1FF]', panel: 'border-[#7B61FF]/25 bg-[rgba(28,24,56,0.86)]', soft: 'border-[#3A315E] bg-[rgba(43,36,77,0.62)] text-[#D8D4F6]' };
    case 'journey':
      return { label: '流程', Icon: ListTree, badge: 'border border-[#27AE60]/35 bg-[rgba(39,174,96,0.18)] text-[#B9F2CE]', panel: 'border-[#27AE60]/28 bg-[rgba(17,45,34,0.82)]', soft: 'border-[#264E3C] bg-[rgba(24,58,43,0.62)] text-[#D3EEDF]' };
    case 'painpoint':
      return { label: '痛点', Icon: AlertTriangle, badge: 'border border-[#EB5757]/35 bg-[rgba(235,87,87,0.18)] text-[#FFD0D0]', panel: 'border-[#EB5757]/25 bg-[rgba(61,25,31,0.84)]', soft: 'border-[#5A2D36] bg-[rgba(70,33,41,0.62)] text-[#F5D7DC]' };
    case 'analysis':
      return { label: '分析', Icon: Search, badge: 'border border-[#F2994A]/35 bg-[rgba(242,153,74,0.18)] text-[#FFE0BE]', panel: 'border-[#F2994A]/25 bg-[rgba(66,42,22,0.86)]', soft: 'border-[#5B452D] bg-[rgba(77,56,31,0.62)] text-[#F5E2C7]' };
    case 'requirement':
      return { label: '需求', Icon: FileText, badge: 'border border-[#00C2FF]/35 bg-[rgba(0,194,255,0.16)] text-[#9DEBFF]', panel: 'border-[#00C2FF]/28 bg-[rgba(12,42,56,0.84)]', soft: 'border-[#244A59] bg-[rgba(14,52,69,0.62)] text-[#D2EDF4]' };
    case 'solution':
      return { label: '方案', Icon: Lightbulb, badge: 'border border-[#2F80ED]/35 bg-[rgba(47,128,237,0.16)] text-[#BFDFFF]', panel: 'border-[#2F80ED]/28 bg-[rgba(15,34,61,0.84)]', soft: 'border-[#27456A] bg-[rgba(18,41,72,0.62)] text-[#D5E6F7]' };
    case 'value':
      return { label: '价值', Icon: TrendingUp, badge: 'border border-[#7B61FF]/35 bg-[rgba(123,97,255,0.18)] text-[#DED6FF]', panel: 'border-[#7B61FF]/28 bg-[rgba(30,27,64,0.84)]', soft: 'border-[#3B356B] bg-[rgba(40,35,82,0.62)] text-[#E3DFF8]' };
    case 'action':
      return { label: '实施', Icon: Rocket, badge: 'border border-[#00C2FF]/35 bg-[rgba(0,194,255,0.16)] text-[#AEF0FF]', panel: 'border-[#00C2FF]/28 bg-[rgba(10,38,58,0.84)]', soft: 'border-[#25465B] bg-[rgba(14,49,71,0.62)] text-[#D4EDF5]' };
    case 'risk':
      return { label: '风险', Icon: ShieldAlert, badge: 'border border-[#F2994A]/35 bg-[rgba(242,153,74,0.16)] text-[#FFE2C4]', panel: 'border-[#F2994A]/28 bg-[rgba(61,39,23,0.84)]', soft: 'border-[#5A452F] bg-[rgba(73,52,32,0.62)] text-[#F7E3CE]' };
    case 'closing':
      return { label: '总结', Icon: Check, badge: 'border border-[#2F80ED]/35 bg-[rgba(47,128,237,0.18)] text-[#D8EEFF]', panel: 'border-[#2F80ED]/30 bg-[rgba(15,23,42,0.88)]', soft: 'border-[#243247] bg-[rgba(15,23,42,0.78)] text-[#C8D6E5]' };
    default:
      return { label: '页面', Icon: FileText, badge: 'border border-[#243247] bg-[rgba(15,23,42,0.82)] text-[#C8D6E5]', panel: 'border-[#243247] bg-[rgba(15,23,42,0.88)]', soft: 'border-[#243247] bg-[rgba(15,23,42,0.78)] text-[#C8D6E5]' };
  }
}

function getViewerTheme(paletteName?: PaletteName) {
  if (paletteName === 'tech-dark-consulting') {
    return {
      appShell: 'bg-[radial-gradient(circle_at_top,_rgba(47,128,237,0.18),_transparent_24%),linear-gradient(180deg,#08111F_0%,#0B1F3A_42%,#07111E_100%)] text-[#E6EEF8]',
      sidebarShell: 'border-r border-[#243247] bg-[rgba(7,17,30,0.88)] backdrop-blur-xl',
      sidebarDivider: 'border-[#243247]',
      sidebarTitle: 'text-[#E6EEF8]',
      sidebarSubtitle: 'text-[#7F93A8]',
      headerShell: 'border-b border-[#243247] bg-[rgba(7,17,30,0.82)] backdrop-blur-xl',
      headerTitle: 'text-[#E6EEF8]',
      headerSubtitle: 'text-[#8FA6BC]',
      headerBadge: 'border border-[#243247] bg-[rgba(255,255,255,0.04)] text-[#C8D6E5]',
      paginationShell: 'border-b border-[#243247] bg-[rgba(7,17,30,0.76)] px-5 py-3',
      slideFrame: 'border-[#243247] bg-[linear-gradient(180deg,rgba(15,23,42,0.98)_0%,rgba(9,18,31,0.98)_100%)] shadow-[0_20px_60px_rgba(2,8,23,0.42)]',
    };
  }

  return {
    appShell: 'bg-[#eef3f8] text-slate-900',
    sidebarShell: 'border-r border-slate-200 bg-white',
    sidebarDivider: 'border-slate-200',
    sidebarTitle: 'text-slate-900',
    sidebarSubtitle: 'text-slate-500',
    headerShell: 'border-b border-slate-200 bg-white',
    headerTitle: 'text-slate-900',
    headerSubtitle: 'text-slate-500',
    headerBadge: 'bg-slate-100 text-slate-700',
    paginationShell: 'border-b border-slate-200 bg-white px-5 py-3',
    slideFrame: 'border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.08)]',
  };
}

function levelLabel(level: 'high' | 'medium' | 'low') {
  return level === 'high' ? '高' : level === 'medium' ? '中' : '低';
}

function buildViewerSlides(outline: PPTOutlineContent): ViewerSlide[] {
  const slides: ViewerSlide[] = [];
  let globalSlideNumber = 1;

  outline.slides.forEach((slide) => {
    slides.push({
      ...slide,
      slideNumber: globalSlideNumber++,
      sourceSlideNumber: slide.slideNumber,
      pageNumberWithinSource: 1,
      pageCountWithinSource: 1,
      originalTitle: slide.slideTitle,
    });
  });

  return slides;
}

function getSlideDisplayTitle(slide: ViewerSlide | PPTSlide): string {
  return slide.presentation?.headline || ('originalTitle' in slide ? slide.originalTitle : '') || slide.slideTitle;
}

function getSlideDisplaySubtitle(slide: ViewerSlide | PPTSlide): string | undefined {
  return slide.presentation?.subheadline;
}

function getSlideKeyMessage(slide: ViewerSlide | PPTSlide): string | undefined {
  return slide.presentation?.keyMessage;
}

function getSlideSectionLabel(slide: ViewerSlide | PPTSlide): string {
  return slide.presentation?.sectionLabel || getSlideAccent(slide.slideType).label;
}

function extractSlideKeywords(slide: ViewerSlide | PPTSlide): string[] {
  const sourceText = [
    getSlideDisplayTitle(slide),
    getSlideDisplaySubtitle(slide),
    getSlideKeyMessage(slide),
    slide.presentation?.imageAsset?.alt,
    ...(slide.presentation?.imageAsset?.emphasisKeywords || []),
    ...slide.content.mainPoints,
    ...(slide.content.supportingData || []),
  ]
    .join(' ')
    .replace(/[：:，,。.!！？；;（）()【】[\]'"“”‘’]/g, ' ');

  const candidates = sourceText
    .split(/\s+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => item.length >= 2)
    .filter((item) => !/^(TOP\d|P\d|ROI|Slide)$/i.test(item));

  const unique = [...new Set(candidates)];
  return unique.slice(0, 3).length > 0 ? unique.slice(0, 3) : ['客户洞察', '重点分析', '行动建议'];
}

function generateOutlineText(outline: PPTOutlineContent): string {
  const lines: string[] = [];

  lines.push(`# ${outline.metadata.projectTitle}`);
  lines.push(`客户：${outline.metadata.customerName}`);
  lines.push(`访谈日期：${outline.metadata.interviewDate}`);
  lines.push('');

  outline.slides.forEach((slide) => {
    lines.push(`## 第${slide.slideNumber}页：${getSlideDisplayTitle(slide)}`);
    slide.content.mainPoints.forEach((point) => {
      lines.push(`- ${point}`);
    });
    lines.push('');
  });

  return lines.join('\n');
}

export default PPTOutlineViewer;
