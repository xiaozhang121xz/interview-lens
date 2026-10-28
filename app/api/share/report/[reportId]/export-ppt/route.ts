/**
 * 导出PPT API路由
 *
 * POST: 导出PPT文件（支持 Markdown 和 PPTX 格式）
 *
 * @module app/api/share/report/[reportId]/export-ppt/route
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateAllCharts } from '@/lib/services/chart-generator';
import { generateAllSlideImages } from '@/lib/services/slide-image-generator';
import { buildPPTXWithPptxGenJS } from '@/lib/services/pptx-builder';
import type { PPTOutlineContent, PPTOutlineMode } from '@/lib/types/ppt-outline';
import { aggregateShareReportData } from '@/lib/services/share-report-aggregator';
import { generatePPTOutline } from '@/lib/services/ppt-outline-generator';
import { readShareReportDeckArtifact } from '@/lib/services/share-report-artifacts';
import { extractUserId } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ reportId: string }>;
}

interface ReportContentWithPPTOutline {
  pptOutline?: PPTOutlineContent;
  [key: string]: unknown;
}

/**
 * POST /api/share/report/[reportId]/export-ppt
 * 导出PPT文件
 *
 * 参数：
 * - format: 'markdown' | 'pptx'（默认 pptx）
 * - includeCharts: boolean（默认 true）
 * - includeImages: boolean（默认 true，仅 PPTX 格式）
 * - regenerateOutline: boolean（默认 false，是否重新生成大纲）
 * - outlineMode: 'classic' | 'customer_next_meeting'（默认 classic）
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { reportId } = await params;
    const userId = await extractUserId(request);
    const body = await request.json().catch(() => ({}));
    const {
      format = 'pptx',
      includeCharts = true,
      includeImages = true,
      regenerateOutline = false,
      outlineMode = 'classic',
      enableGemini = false, // 是否启用 Gemini 创意配图（需要 API Key）
    } = body;

    // 获取分享报告内容
    const reportContent = await prisma.shareReportContent.findFirst({
      where: { id: reportId, userId },
    });

    if (!reportContent) {
      return NextResponse.json({ error: '报告不存在' }, { status: 404 });
    }

    // 获取或生成 PPT 大纲
    let pptOutline: PPTOutlineContent | undefined;

    if (regenerateOutline) {
      // 重新生成大纲
      const data = await aggregateShareReportData(reportId);
      pptOutline = await generatePPTOutline(data, outlineMode as PPTOutlineMode);
    } else {
      // 从 content 字段解析已有大纲
      const content = reportContent.content
        ? JSON.parse(reportContent.content) as ReportContentWithPPTOutline
        : null;
      pptOutline = content?.pptOutline;
    }

    if (!pptOutline) {
      return NextResponse.json({ error: 'PPT大纲不存在，请先生成或设置 regenerateOutline=true' }, { status: 400 });
    }

    // 根据格式返回不同内容
    if (format === 'markdown') {
      // 生成图表（如果需要）
      const chartUrls: Map<number, string> = new Map();
      if (includeCharts) {
        const visuals = pptOutline.slides.map((slide) => slide.visual);
        const chartResults = await generateAllCharts(visuals);
        chartResults.forEach((result, index) => {
          if (result.success && result.imageUrl) {
            chartUrls.set(index, result.imageUrl);
          }
        });
      }

      // 返回 Markdown 格式
      const markdown = generatePPTMarkdown(pptOutline, chartUrls);
      const fileName = `${pptOutline.metadata.projectTitle}-汇报大纲.md`;
      return new NextResponse(markdown, {
        headers: {
          'Content-Type': 'text/markdown; charset=utf-8',
          'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
        },
      });
    }

    // PPTX 格式
    if (format === 'pptx') {
      if (!regenerateOutline) {
        const cachedDeck = await readShareReportDeckArtifact(reportId);
        if (cachedDeck) {
          const fileName = `${pptOutline.metadata.projectTitle}-汇报.pptx`;
          return new NextResponse(new Uint8Array(cachedDeck), {
            headers: {
              'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
              'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
            },
          });
        }
      }

      // 生成所有配图
      const imageResults = await generateAllSlideImages(pptOutline.slides, {
        enableGemini,
        includeImages,
        width: 800,
        height: 600,
        paletteName: pptOutline.metadata.paletteName || 'tech-light',
      });

      // 构建 PPTX
      const buildResult = await buildPPTXWithPptxGenJS(pptOutline, {
        includeImages,
        imageResults,
        paletteName: pptOutline.metadata.paletteName,
        outputType: 'blob',
      });

      if (!buildResult.success || !buildResult.blob) {
        return NextResponse.json(
          { error: buildResult.error || 'PPTX 构建失败' },
          { status: 500 }
        );
      }

      // 返回 PPTX 文件
      const fileName = `${pptOutline.metadata.projectTitle}-汇报.pptx`;
      return new NextResponse(buildResult.blob, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
        },
      });
    }

    return NextResponse.json({ error: '不支持的格式' }, { status: 400 });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }
    console.error('[Export PPT API] Error:', error);
    return NextResponse.json(
      { error: '导出PPT失败' },
      { status: 500 }
    );
  }
}

/**
 * 生成PPT Markdown格式
 */
function generatePPTMarkdown(
  outline: PPTOutlineContent,
  chartUrls?: Map<number, string>
): string {
  const lines: string[] = [];

  lines.push(`# ${outline.metadata.projectTitle}`);
  lines.push('');
  lines.push(`**客户**: ${outline.metadata.customerName}`);
  lines.push(`**访谈日期**: ${outline.metadata.interviewDate}`);
  lines.push(`**总页数**: ${outline.metadata.totalSlides}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  outline.slides.forEach((slide, index) => {
    lines.push(`## 第${slide.slideNumber}页：${slide.slideTitle}`);
    lines.push('');

    // 主要内容
    slide.content.mainPoints.forEach((point) => {
      lines.push(`- ${point}`);
    });
    lines.push('');

    // 支撑数据
    if (slide.content.supportingData?.length) {
      lines.push('**支撑数据**:');
      slide.content.supportingData.forEach((data) => {
        lines.push(`  - ${data}`);
      });
      lines.push('');
    }

    // 原话佐证
    if (slide.content.quoteEvidence?.length) {
      lines.push('**原话佐证**:');
      slide.content.quoteEvidence.forEach((quote) => {
        lines.push(`  > "${quote}"`);
      });
      lines.push('');
    }

    // 图表链接
    if (chartUrls?.has(index)) {
      lines.push(`**图表**: ${chartUrls.get(index)}`);
      lines.push('');
    }

    // 演讲者备注
    lines.push(`**演讲者备注**: ${slide.speakerNotes}`);
    lines.push('');
    lines.push('---');
    lines.push('');
  });

  return lines.join('\n');
}

/**
 * 生成PPTX文件（待实现）
 *
 * 实际实现需要调用pptx skill
 */
// async function generatePPTX(
//   outline: PPTOutlineContent,
//   chartUrls?: Map<number, string>
// ): Promise<Blob> {
//   // 调用pptx skill生成PPTX
//   // const pptxSkill = await import('@/lib/skills/pptx');
//   // return pptxSkill.generatePPTX(outline, chartUrls);
//   throw new Error('PPTX generation not implemented');
// }
