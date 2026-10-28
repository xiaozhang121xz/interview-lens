/**
 * 直接生成 PPTX API 路由
 *
 * POST: 直接生成并下载 PPTX 文件（不保存到数据库）
 * 融合 slides skill (PptxGenJS) + smart-illustrator skill
 *
 * @module app/api/share/report/generate-pptx-direct/route
 */

import { NextRequest, NextResponse } from 'next/server';
import { aggregateShareReportData } from '@/lib/services/share-report-aggregator';
import { generatePPTOutline } from '@/lib/services/ppt-outline-generator';
import { generateAllSlideImages } from '@/lib/services/slide-image-generator';
import { buildPPTXWithPptxGenJS } from '@/lib/services/pptx-builder';
import type { PPTOutlineMode } from '@/lib/types/ppt-outline';

/**
 * POST /api/share/report/generate-pptx-direct
 * 直接生成 PPTX 文件
 *
 * 参数：
 * - interviewId: 访谈项目 ID
 * - generationType: 'template' | 'llm'（暂时都使用模板生成）
 * - outlineMode: 'classic' | 'customer_next_meeting'
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { interviewId, generationType = 'template', outlineMode = 'classic' } = body;

    if (!interviewId) {
      return NextResponse.json({ error: '缺少 interviewId 参数' }, { status: 400 });
    }

    console.log('[Generate PPTX Direct] Starting generation for interview:', interviewId);
    console.log('[Generate PPTX Direct] Options:', { generationType, outlineMode });

    // Step 1: 数据聚合
    console.log('[Generate PPTX Direct] Step 1: Aggregating data...');
    const data = await aggregateShareReportData(interviewId);

    // Step 2: 生成 PPT 大纲
    console.log('[Generate PPTX Direct] Step 2: Generating PPT outline...');
    const pptOutline = await generatePPTOutline(data, outlineMode as PPTOutlineMode);

    console.log('[Generate PPTX Direct] Outline generated:', {
      slideCount: pptOutline.slides.length,
      title: pptOutline.metadata.projectTitle,
    });

    // Step 3: 配图生成（全部生成）
    console.log('[Generate PPTX Direct] Step 3: Generating slide images...');
    const imageResults = await generateAllSlideImages(pptOutline.slides, {
      enableGemini: false, // 暂时禁用 Gemini，使用 SVG 图表
      includeImages: true,
      width: 800,
      height: 600,
      paletteName: pptOutline.metadata.paletteName || 'tech-light',
    });

    // 统计配图生成结果
    const imageStats = {
      total: imageResults.size,
      success: Array.from(imageResults.values()).filter((r) => r.success).length,
      svg: Array.from(imageResults.values()).filter((r) => r.engine === 'svg').length,
      placeholder: Array.from(imageResults.values()).filter((r) => r.engine === 'placeholder').length,
    };
    console.log('[Generate PPTX Direct] Image generation stats:', imageStats);

    // Step 4: 构建 PPTX
    console.log('[Generate PPTX Direct] Step 4: Building PPTX file...');
    const buildResult = await buildPPTXWithPptxGenJS(pptOutline, {
      includeImages: true,
      imageResults,
      paletteName: pptOutline.metadata.paletteName,
      outputType: 'blob',
    });

    if (!buildResult.success || !buildResult.blob) {
      console.error('[Generate PPTX Direct] Build failed:', buildResult.error);
      return NextResponse.json(
        { error: buildResult.error || 'PPTX 构建失败' },
        { status: 500 }
      );
    }

    console.log('[Generate PPTX Direct] Build successful:', {
      slideCount: buildResult.slideCount,
      imageCount: buildResult.imageCount,
      blobSize: `${(buildResult.blob.size / 1024).toFixed(2)} KB`,
    });

    // Step 5: 返回 PPTX 文件
    const fileName = `${pptOutline.metadata.projectTitle || '分享报告'}-${outlineMode === 'classic' ? '14页' : '10页'}.pptx`;
    console.log('[Generate PPTX Direct] Returning file:', fileName);

    return new NextResponse(buildResult.blob, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
        // 添加生成信息作为响应头（可选）
        'X-Slide-Count': String(buildResult.slideCount),
        'X-Image-Count': String(buildResult.imageCount),
      },
    });
  } catch (error) {
    console.error('[Generate PPTX Direct] Error:', error);
    return NextResponse.json(
      {
        error: 'PPTX 生成失败',
        details: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    );
  }
}