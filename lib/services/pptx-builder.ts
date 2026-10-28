/**
 * PPTX 构建服务
 *
 * 使用 PptxGenJS 将 PPTOutlineContent 转化为实际的 PPTX 文件
 * 遵循 slides skill 规范：
 * - 使用 16:9 尺寸
 * - 设置主题字体
 * - 保持输出可编辑
 *
 * @module lib/services/pptx-builder
 */

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import PptxGenJS from 'pptxgenjs';
import type {
  PPTOutlineContent,
  PPTSlide,
  PPTMetadata,
  SlidePresentation,
  TechLightPalette,
  PaletteName,
} from '@/lib/types/ppt-outline';
import { PALETTE_PRESETS } from '@/lib/types/ppt-outline';
import type { SlideImageResult } from './slide-image-generator';

// ============================================
// 类型定义
// ============================================

/**
 * PPTX 构建选项
 */
export interface PPTXBuildOptions {
  /** 是否包含配图 */
  includeImages?: boolean;
  /** 配图结果 Map */
  imageResults?: Map<number, SlideImageResult>;
  /** 配色方案名称 */
  paletteName?: PaletteName;
  /** 输出格式 */
  outputType?: 'blob' | 'buffer' | 'file';
  /** 输出文件路径（outputType='file' 时使用） */
  outputPath?: string;
}

/**
 * PPTX 构建结果
 */
export interface PPTXBuildResult {
  success: boolean;
  blob?: Blob;
  buffer?: Buffer;
  filePath?: string;
  slideCount: number;
  imageCount: number;
  error?: string;
}

// ============================================
// 配色方案
// ============================================

/**
 * 深色咨询风格配色（用于 PPTX）
 */
const DARK_CONSULTING_PALETTE = {
  background: '0B1F3A',
  surface: '0F172A',
  primary: '2F80ED',
  primaryLight: '3B82F6',
  secondary: '00C2FF',
  accent: '7B61FF',
  textPrimary: 'E6EEF8',
  textSecondary: '9FB3C8',
  success: '10B981',
  warning: 'F59E0B',
  danger: 'EF4444',
};

/**
 * 浅色技术风格配色（用于 PPTX）
 */
const LIGHT_TECH_PALETTE = {
  background: 'F8FAFC',
  surface: 'FFFFFF',
  primary: '3B82F6',
  primaryLight: '60A5FA',
  secondary: '06B6D4',
  accent: 'F97316',
  textPrimary: '1E293B',
  textSecondary: '64748B',
  success: '10B981',
  warning: 'F59E0B',
  danger: 'EF4444',
};

/**
 * 获取配色方案
 */
function getPalette(name?: PaletteName): typeof DARK_CONSULTING_PALETTE {
  if (name === 'tech-light') return LIGHT_TECH_PALETTE;
  return DARK_CONSULTING_PALETTE;
}

// ============================================
// 字号体系（汇报型 PPT 标准）
// ============================================

/**
 * 统一字号配置
 *
 * 原则：任何正文不低于 16pt，任何辅助字不低于 14pt
 */
const FONT_SIZES = {
  // 封面页
  coverTitle: 30, // 大标题
  coverSubtitle: 22, // 副标题
  coverBody: 18, // 封面正文

  // 章节页/目录页
  sectionTitle: 26, // 章节名
  sectionLabel: 16, // 章节说明

  // 内容页
  pageTitle: 24, // 页内标题
  blockTitle: 20, // 二级标题/卡片标题
  body: 17, // 正文（核心）
  bodySmall: 15, // 辅助正文
  caption: 14, // 图注/说明
  captionSmall: 12, // 极小辅助字（最小值）

  // 特殊元素
  sectionTag: 14, // Section 标签（如 "用户画像"、"核心痛点"）
  bulletText: 16, // 列表项文字
  quoteText: 16, // 引用文字
};

/**
 * 字号安全下限
 */
const FONT_MIN = {
  body: 16,
  caption: 14,
  svg: 14,
};

// ============================================
// 间距体系（汇报型 PPT 标准）
// ============================================

const SPACING = {
  sectionGap: 28, // 大模块间距
  blockGap: 20, // 小模块间距
  cardPadding: 28, // 卡片内边距
  titleBodyGap: 12, // 标题和正文间距
  bulletGap: 0.6, // 列表项间距（PPT 单位）
  lineHeight: 1.4, // 行高倍数
};

// ============================================
// 布局常量
// ============================================

const LEFT_COLUMN_X = 0.3;
const LEFT_COLUMN_W = 4.9;
const LEFT_COLUMN_TEXT_W = 4.5;
const FULL_CONTENT_W = 9.5;

// ============================================
// 主入口函数
// ============================================

/**
 * 构建 PPTX 文件
 */
export async function buildPPTXWithPptxGenJS(
  outline: PPTOutlineContent,
  options: PPTXBuildOptions = {}
): Promise<PPTXBuildResult> {
  try {
    const pptx = new PptxGenJS();

    // 设置尺寸（16:9）
    pptx.defineLayout({ name: 'SHARE_REPORT', width: 10, height: 5.625 });
    pptx.layout = 'SHARE_REPORT';

    // 设置作者信息
    pptx.author = 'Claude Code AI';
    pptx.company = outline.metadata.customerName || '客户需求洞察助手';
    pptx.title = outline.metadata.projectTitle;
    pptx.subject = '访谈汇报';

    // 获取配色
    const palette = getPalette(
      outline.metadata.paletteName || options.paletteName
    );

    // 构建每页幻灯片
    const imageResults = options.imageResults || new Map();
    let imageCount = 0;

    for (const slide of outline.slides) {
      const imageResult = imageResults.get(slide.slideNumber - 1);
      addSlideByLayout(pptx, slide, palette, imageResult);
      if (imageResult?.success && imageResult.imageUrl) {
        imageCount++;
      }
    }

    // 生成输出
    const outputType = options.outputType || 'blob';
    const arrayBuffer = await pptx.write({ outputType: 'arraybuffer' });

    if (outputType === 'blob') {
      return {
        success: true,
        blob: new Blob([arrayBuffer as ArrayBuffer], {
          type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        }),
        slideCount: outline.slides.length,
        imageCount,
      };
    }

    if (outputType === 'buffer') {
      // 在 Node.js 环境中使用 Buffer
      const nodeBuffer = Buffer.from(arrayBuffer as ArrayBuffer);
      return {
        success: true,
        buffer: nodeBuffer,
        slideCount: outline.slides.length,
        imageCount,
      };
    }

    return {
      success: true,
      slideCount: outline.slides.length,
      imageCount,
    };
  } catch (error) {
    console.error('[PPTX Builder] Error:', error);
    return {
      success: false,
      slideCount: 0,
      imageCount: 0,
      error: error instanceof Error ? error.message : 'PPTX 构建失败',
    };
  }
}

// ============================================
// 幻灯片布局构建
// ============================================

/**
 * 根据布局类型添加幻灯片
 */
function addSlideByLayout(
  pptx: PptxGenJS,
  slide: PPTSlide,
  palette: typeof DARK_CONSULTING_PALETTE,
  imageResult?: SlideImageResult
) {
  const pptxSlide = pptx.addSlide();
  const presentation = slide.presentation;
  const layout = presentation?.layout || 'context-split';

  // 设置背景
  pptxSlide.background = { color: palette.background };

  // 根据布局类型构建
  switch (layout) {
    case 'cover-hero':
      buildCoverSlide(pptxSlide, slide, palette, imageResult);
      break;
    case 'context-split':
      buildContextSplitSlide(pptxSlide, slide, palette, imageResult);
      break;
    case 'persona-spotlight':
      buildPersonaSlide(pptxSlide, slide, palette, imageResult);
      break;
    case 'journey-flow':
      buildJourneySlide(pptxSlide, slide, palette, imageResult);
      break;
    case 'evidence-focus':
      buildEvidenceSlide(pptxSlide, slide, palette, imageResult);
      break;
    case 'matrix-compare':
      buildMatrixSlide(pptxSlide, slide, palette, imageResult);
      break;
    case 'analysis-board':
      buildAnalysisSlide(pptxSlide, slide, palette, imageResult);
      break;
    case 'requirement-tree':
      buildRequirementSlide(pptxSlide, slide, palette, imageResult);
      break;
    case 'solution-spotlight':
      buildSolutionSlide(pptxSlide, slide, palette, imageResult);
      break;
    case 'mapping-board':
      buildMappingSlide(pptxSlide, slide, palette, imageResult);
      break;
    case 'value-dashboard':
      buildValueSlide(pptxSlide, slide, palette, imageResult);
      break;
    case 'timeline-roadmap':
      buildTimelineSlide(pptxSlide, slide, palette, imageResult);
      break;
    case 'risk-board':
      buildRiskSlide(pptxSlide, slide, palette, imageResult);
      break;
    case 'closing-summary':
      buildClosingSlide(pptxSlide, slide, palette, imageResult);
      break;
    default:
      buildDefaultSlide(pptxSlide, slide, palette, imageResult);
  }

  // 添加演讲者备注
  if (slide.speakerNotes) {
    pptxSlide.addNotes(slide.speakerNotes);
  }
}

// ============================================
// 各布局构建函数
// ============================================

/**
 * 封面页布局（cover-hero）
 */
function buildCoverSlide(
  slide: PptxGenJS.Slide,
  pptSlide: PPTSlide,
  palette: typeof DARK_CONSULTING_PALETTE,
  imageResult?: SlideImageResult
) {
  const presentation = pptSlide.presentation;
  const content = pptSlide.content;

  // 顶部装饰条
  slide.addShape('rect', {
    x: 0,
    y: 0,
    w: '100%',
    h: 0.1,
    fill: { color: palette.primary },
  });

  // 主标题
  slide.addText(presentation?.headline || pptSlide.slideTitle, {
    x: 0.5,
    y: 1.5,
    w: 9,
    h: 1,
    fontSize: FONT_SIZES.coverTitle,
    bold: true,
    color: palette.textPrimary,
    align: 'center',
    fontFace: 'Liberation Sans',
  });

  // 副标题
  if (presentation?.subheadline) {
    slide.addText(presentation.subheadline, {
      x: 0.5,
      y: 2.5,
      w: 9,
      h: 0.5,
      fontSize: FONT_SIZES.coverSubtitle,
      color: palette.textSecondary,
      align: 'center',
      fontFace: 'Liberation Sans',
    });
  }

  // 关键信息点
  content.mainPoints?.forEach((point, i) => {
    slide.addText(point, {
      x: 1,
      y: 3.5 + i * SPACING.bulletGap,
      w: 8,
      h: 0.4,
      fontSize: FONT_SIZES.coverBody,
      color: palette.textSecondary,
      bullet: { type: 'bullet' },
      fontFace: 'Liberation Sans',
    });
  });

  // 配图（如果有）
  if (imageResult?.success && imageResult.imageUrl) {
    addImageToSlide(slide, imageResult, 'hero');
  }
}

/**
 * 内容分割布局（context-split）
 */
function buildContextSplitSlide(
  slide: PptxGenJS.Slide,
  pptSlide: PPTSlide,
  palette: typeof DARK_CONSULTING_PALETTE,
  imageResult?: SlideImageResult
) {
  const presentation = pptSlide.presentation;
  const content = pptSlide.content;

  // 左侧：标题区
  slide.addShape('rect', {
    x: 0,
    y: 0,
    w: 5,
    h: '100%',
    fill: { color: palette.surface },
  });

  // Section 标签
  if (presentation?.sectionLabel) {
    slide.addText(presentation.sectionLabel, {
      x: 0.3,
      y: 0.3,
      w: 2,
      h: 0.3,
      fontSize: FONT_SIZES.sectionTag,
      color: palette.primary,
      fontFace: 'Liberation Sans',
    });
  }

  // 主标题
  slide.addText(presentation?.headline || pptSlide.slideTitle, {
    x: 0.3,
    y: 1,
    w: 4.5,
    h: 0.8,
    fontSize: FONT_SIZES.pageTitle,
    bold: true,
    color: palette.textPrimary,
    fontFace: 'Liberation Sans',
  });

  // 副标题
  if (presentation?.subheadline) {
    slide.addText(presentation.subheadline, {
      x: 0.3,
      y: 1.8,
      w: 4.5,
      h: 0.4,
      fontSize: FONT_SIZES.bodySmall,
      color: palette.textSecondary,
      fontFace: 'Liberation Sans',
    });
  }

  // 关键信息
  content.mainPoints?.forEach((point, i) => {
    slide.addText(point, {
      x: 0.3,
      y: 2.5 + i * SPACING.bulletGap,
      w: 4.5,
      h: 0.5,
      fontSize: FONT_SIZES.bulletText,
      color: palette.textPrimary,
      bullet: { type: 'bullet' },
      fontFace: 'Liberation Sans',
    });
  });

  // 右侧：配图区
  if (imageResult?.success && imageResult.imageUrl) {
    addImageToSlide(slide, imageResult, 'right-panel');
  } else {
    // 占位图
    slide.addShape('rect', {
      x: 5.2,
      y: 0.5,
      w: 4.5,
      h: 4.5,
      fill: { color: palette.background },
      line: { color: palette.surface, width: 1 },
    });
  }
}

/**
 * 人物卡片布局（persona-spotlight）
 */
function buildPersonaSlide(
  slide: PptxGenJS.Slide,
  pptSlide: PPTSlide,
  palette: typeof DARK_CONSULTING_PALETTE,
  imageResult?: SlideImageResult
) {
  const presentation = pptSlide.presentation;
  const content = pptSlide.content;
  const hasRightPanelImage = Boolean(
    imageResult?.success && imageResult.imageUrl
  );
  const titleWidth = hasRightPanelImage ? LEFT_COLUMN_W : FULL_CONTENT_W;
  const quoteWidth = hasRightPanelImage ? LEFT_COLUMN_W : FULL_CONTENT_W;
  const quoteTextWidth = hasRightPanelImage ? LEFT_COLUMN_TEXT_W : 9.3;

  // Section 标签
  if (presentation?.sectionLabel) {
    slide.addText(presentation.sectionLabel, {
      x: 0.3,
      y: 0.3,
      w: 2,
      h: 0.3,
      fontSize: FONT_SIZES.sectionTag,
      color: palette.primary,
      fontFace: 'Liberation Sans',
    });
  }

  // 主标题
  slide.addText(presentation?.headline || pptSlide.slideTitle, {
    x: LEFT_COLUMN_X,
    y: 0.8,
    w: titleWidth,
    h: 0.6,
    fontSize: FONT_SIZES.pageTitle,
    bold: true,
    color: palette.textPrimary,
    fit: 'shrink',
    fontFace: 'Liberation Sans',
  });

  // 关键信息卡片
  content.mainPoints?.forEach((point, i) => {
    slide.addShape('rect', {
      x: LEFT_COLUMN_X,
      y: 1.8 + i * 0.8,
      w: LEFT_COLUMN_TEXT_W,
      h: 0.6,
      fill: { color: palette.surface },
      line: { color: palette.primary, width: 1 },
    });
    slide.addText(point, {
      x: 0.5,
      y: 1.9 + i * 0.8,
      w: 4.3,
      h: 0.5,
      fontSize: FONT_SIZES.body,
      color: palette.textPrimary,
      fontFace: 'Liberation Sans',
    });
  });

  // 配图区
  if (imageResult?.success && imageResult.imageUrl) {
    addImageToSlide(slide, imageResult, 'right-panel');
  }

  // 引用证据
  if (content.quoteEvidence?.length) {
    slide.addShape('rect', {
      x: LEFT_COLUMN_X,
      y: 4.5,
      w: quoteWidth,
      h: 0.8,
      fill: { color: palette.background },
      line: { color: palette.accent, width: 1 },
    });
    slide.addText(`"${content.quoteEvidence[0].substring(0, 100)}"`, {
      x: 0.5,
      y: 4.6,
      w: quoteTextWidth,
      h: 0.6,
      fontSize: FONT_SIZES.quoteText,
      color: palette.textSecondary,
      italic: true,
      fontFace: 'Liberation Sans',
    });
  }
}

/**
 * 用户旅程布局（journey-flow）
 */
function buildJourneySlide(
  slide: PptxGenJS.Slide,
  pptSlide: PPTSlide,
  palette: typeof DARK_CONSULTING_PALETTE,
  imageResult?: SlideImageResult
) {
  const presentation = pptSlide.presentation;
  const content = pptSlide.content;

  // 标题区
  if (presentation?.sectionLabel) {
    slide.addText(presentation.sectionLabel, {
      x: 0.3,
      y: 0.3,
      w: 2,
      h: 0.3,
      fontSize: FONT_SIZES.sectionTag,
      color: palette.primary,
      fontFace: 'Liberation Sans',
    });
  }

  slide.addText(presentation?.headline || pptSlide.slideTitle, {
    x: 0.3,
    y: 0.8,
    w: 9.5,
    h: 0.5,
    fontSize: FONT_SIZES.pageTitle,
    bold: true,
    color: palette.textPrimary,
    fontFace: 'Liberation Sans',
  });

  // 配图（流程图）
  if (imageResult?.success && imageResult.imageUrl) {
    addImageToSlide(slide, imageResult, 'center-large');
  } else {
    // 流程节点占位
    const stages = content.mainPoints || [];
    const stageWidth = 2;
    stages.forEach((stage, i) => {
      slide.addShape('roundRect', {
        x: 0.5 + i * stageWidth,
        y: 2,
        w: 1.8,
        h: 1.2,
        fill: { color: palette.surface },
        line: { color: palette.primary, width: 2 },
      });
      slide.addText(stage.substring(0, 20), {
        x: 0.5 + i * stageWidth,
        y: 2.4,
        w: 1.8,
        h: 0.4,
        fontSize: FONT_SIZES.caption,
        color: palette.textPrimary,
        align: 'center',
        fontFace: 'Liberation Sans',
      });
      // 连接线
      if (i < stages.length - 1) {
        slide.addShape('line', {
          x: 2.3 + i * stageWidth,
          y: 2.6,
          w: 0.3,
          h: 0,
          line: { color: palette.primary, width: 2, endArrowType: 'triangle' },
        });
      }
    });
  }
}

/**
 * 证据聚焦布局（evidence-focus）
 */
function buildEvidenceSlide(
  slide: PptxGenJS.Slide,
  pptSlide: PPTSlide,
  palette: typeof DARK_CONSULTING_PALETTE,
  imageResult?: SlideImageResult
) {
  const presentation = pptSlide.presentation;
  const content = pptSlide.content;
  const hasRightPanelImage = Boolean(
    imageResult?.success && imageResult.imageUrl
  );
  const titleWidth = hasRightPanelImage ? 5.2 : FULL_CONTENT_W;
  const quoteWidth = hasRightPanelImage ? 5.2 : 6;
  const quoteTextWidth = hasRightPanelImage ? 5.0 : 5.8;

  // 标题
  if (presentation?.sectionLabel) {
    slide.addText(presentation.sectionLabel, {
      x: 0.3,
      y: 0.3,
      w: 2,
      h: 0.3,
      fontSize: FONT_SIZES.sectionTag,
      color: palette.danger,
      fontFace: 'Liberation Sans',
    });
  }

  slide.addText(presentation?.headline || pptSlide.slideTitle, {
    x: LEFT_COLUMN_X,
    y: 0.8,
    w: titleWidth,
    h: 0.6,
    fontSize: FONT_SIZES.pageTitle,
    bold: true,
    color: palette.textPrimary,
    fit: 'shrink',
    fontFace: 'Liberation Sans',
  });

  // 关键信息
  content.mainPoints?.forEach((point, i) => {
    slide.addText(point, {
      x: LEFT_COLUMN_X,
      y: 1.8 + i * 0.5,
      w: 5,
      h: 0.4,
      fontSize: FONT_SIZES.bodySmall,
      color: palette.textPrimary,
      bullet: { type: 'bullet' },
      fontFace: 'Liberation Sans',
    });
  });

  // 引用证据
  if (content.quoteEvidence?.length) {
    slide.addShape('rect', {
      x: LEFT_COLUMN_X,
      y: 3.5,
      w: quoteWidth,
      h: 1.2,
      fill: { color: palette.surface },
      line: { color: palette.accent, width: 2 },
    });
    slide.addText(`"${content.quoteEvidence[0]}"`, {
      x: 0.5,
      y: 3.7,
      w: quoteTextWidth,
      h: 0.8,
      fontSize: FONT_SIZES.bulletText,
      color: palette.textPrimary,
      italic: true,
      fontFace: 'Liberation Sans',
    });
  }

  // 配图
  if (imageResult?.success && imageResult.imageUrl) {
    addImageToSlide(slide, imageResult, 'right-panel');
  }
}

/**
 * 矩阵对比布局（matrix-compare）
 */
function buildMatrixSlide(
  slide: PptxGenJS.Slide,
  pptSlide: PPTSlide,
  palette: typeof DARK_CONSULTING_PALETTE,
  imageResult?: SlideImageResult
) {
  const presentation = pptSlide.presentation;

  // 标题
  if (presentation?.sectionLabel) {
    slide.addText(presentation.sectionLabel, {
      x: 0.3,
      y: 0.3,
      w: 2,
      h: 0.3,
      fontSize: FONT_SIZES.sectionTag,
      color: palette.primary,
      fontFace: 'Liberation Sans',
    });
  }

  slide.addText(presentation?.headline || pptSlide.slideTitle, {
    x: 0.3,
    y: 0.8,
    w: 9.5,
    h: 0.5,
    fontSize: FONT_SIZES.pageTitle,
    bold: true,
    color: palette.textPrimary,
    fontFace: 'Liberation Sans',
  });

  // 配图（矩阵）
  if (imageResult?.success && imageResult.imageUrl) {
    addImageToSlide(slide, imageResult, 'center-large');
  }
}

/**
 * 分析板布局（analysis-board）
 */
function buildAnalysisSlide(
  slide: PptxGenJS.Slide,
  pptSlide: PPTSlide,
  palette: typeof DARK_CONSULTING_PALETTE,
  imageResult?: SlideImageResult
) {
  const presentation = pptSlide.presentation;
  const content = pptSlide.content;
  const hasRightPanelImage = Boolean(
    imageResult?.success && imageResult.imageUrl
  );
  const titleWidth = hasRightPanelImage ? LEFT_COLUMN_W : FULL_CONTENT_W;

  // 标题
  if (presentation?.sectionLabel) {
    slide.addText(presentation.sectionLabel, {
      x: 0.3,
      y: 0.3,
      w: 2,
      h: 0.3,
      fontSize: FONT_SIZES.sectionTag,
      color: palette.accent,
      fontFace: 'Liberation Sans',
    });
  }

  slide.addText(presentation?.headline || pptSlide.slideTitle, {
    x: LEFT_COLUMN_X,
    y: 0.8,
    w: titleWidth,
    h: 0.6,
    fontSize: FONT_SIZES.pageTitle,
    bold: true,
    color: palette.textPrimary,
    fit: 'shrink',
    fontFace: 'Liberation Sans',
  });

  // 分析内容
  content.mainPoints?.forEach((point, i) => {
    slide.addShape('rect', {
      x: LEFT_COLUMN_X,
      y: 1.8 + i * 0.8,
      w: LEFT_COLUMN_TEXT_W,
      h: 0.6,
      fill: { color: palette.surface },
      line: { color: palette.accent, width: 1 },
    });
    slide.addText(point, {
      x: 0.5,
      y: 1.9 + i * 0.8,
      w: 4.3,
      h: 0.5,
      fontSize: FONT_SIZES.sectionTag,
      color: palette.textPrimary,
      fontFace: 'Liberation Sans',
    });
  });

  // 配图（因果图）
  if (imageResult?.success && imageResult.imageUrl) {
    addImageToSlide(slide, imageResult, 'right-panel');
  }
}

/**
 * 需求树布局（requirement-tree）
 */
function buildRequirementSlide(
  slide: PptxGenJS.Slide,
  pptSlide: PPTSlide,
  palette: typeof DARK_CONSULTING_PALETTE,
  imageResult?: SlideImageResult
) {
  const presentation = pptSlide.presentation;

  // 标题
  if (presentation?.sectionLabel) {
    slide.addText(presentation.sectionLabel, {
      x: 0.3,
      y: 0.3,
      w: 2,
      h: 0.3,
      fontSize: FONT_SIZES.sectionTag,
      color: palette.success,
      fontFace: 'Liberation Sans',
    });
  }

  slide.addText(presentation?.headline || pptSlide.slideTitle, {
    x: 0.3,
    y: 0.8,
    w: 9.5,
    h: 0.5,
    fontSize: FONT_SIZES.pageTitle,
    bold: true,
    color: palette.textPrimary,
    fontFace: 'Liberation Sans',
  });

  // 配图（树状图）
  if (imageResult?.success && imageResult.imageUrl) {
    addImageToSlide(slide, imageResult, 'center-large');
  }
}

/**
 * 方案聚焦布局（solution-spotlight）
 */
function buildSolutionSlide(
  slide: PptxGenJS.Slide,
  pptSlide: PPTSlide,
  palette: typeof DARK_CONSULTING_PALETTE,
  imageResult?: SlideImageResult
) {
  const presentation = pptSlide.presentation;
  const content = pptSlide.content;
  const hasRightPanelImage = Boolean(
    imageResult?.success && imageResult.imageUrl
  );
  const titleWidth = hasRightPanelImage ? LEFT_COLUMN_W : FULL_CONTENT_W;

  // 标题
  if (presentation?.sectionLabel) {
    slide.addText(presentation.sectionLabel, {
      x: 0.3,
      y: 0.3,
      w: 2,
      h: 0.3,
      fontSize: FONT_SIZES.sectionTag,
      color: palette.success,
      fontFace: 'Liberation Sans',
    });
  }

  slide.addText(presentation?.headline || pptSlide.slideTitle, {
    x: LEFT_COLUMN_X,
    y: 0.8,
    w: titleWidth,
    h: 0.6,
    fontSize: FONT_SIZES.pageTitle,
    bold: true,
    color: palette.textPrimary,
    fit: 'shrink',
    fontFace: 'Liberation Sans',
  });

  // 方案内容
  content.mainPoints?.forEach((point, i) => {
    slide.addText(point, {
      x: LEFT_COLUMN_X,
      y: 1.8 + i * 0.5,
      w: 5,
      h: 0.4,
      fontSize: FONT_SIZES.bodySmall,
      color: palette.textPrimary,
      bullet: { type: 'bullet' },
      fontFace: 'Liberation Sans',
    });
  });

  // 配图（方案图）
  if (imageResult?.success && imageResult.imageUrl) {
    addImageToSlide(slide, imageResult, 'right-panel');
  }
}

/**
 * 映射板布局（mapping-board）
 */
function buildMappingSlide(
  slide: PptxGenJS.Slide,
  pptSlide: PPTSlide,
  palette: typeof DARK_CONSULTING_PALETTE,
  imageResult?: SlideImageResult
) {
  const presentation = pptSlide.presentation;

  // 标题
  if (presentation?.sectionLabel) {
    slide.addText(presentation.sectionLabel, {
      x: 0.3,
      y: 0.3,
      w: 2,
      h: 0.3,
      fontSize: FONT_SIZES.sectionTag,
      color: palette.primary,
      fontFace: 'Liberation Sans',
    });
  }

  slide.addText(presentation?.headline || pptSlide.slideTitle, {
    x: 0.3,
    y: 0.8,
    w: 9.5,
    h: 0.5,
    fontSize: FONT_SIZES.pageTitle,
    bold: true,
    color: palette.textPrimary,
    fontFace: 'Liberation Sans',
  });

  // 配图（映射图）
  if (imageResult?.success && imageResult.imageUrl) {
    addImageToSlide(slide, imageResult, 'center-large');
  }
}

/**
 * 价值仪表板布局（value-dashboard）
 */
function buildValueSlide(
  slide: PptxGenJS.Slide,
  pptSlide: PPTSlide,
  palette: typeof DARK_CONSULTING_PALETTE,
  imageResult?: SlideImageResult
) {
  const presentation = pptSlide.presentation;
  const content = pptSlide.content;

  // 标题
  if (presentation?.sectionLabel) {
    slide.addText(presentation.sectionLabel, {
      x: 0.3,
      y: 0.3,
      w: 2,
      h: 0.3,
      fontSize: FONT_SIZES.sectionTag,
      color: palette.success,
      fontFace: 'Liberation Sans',
    });
  }

  slide.addText(presentation?.headline || pptSlide.slideTitle, {
    x: 0.3,
    y: 0.8,
    w: 9.5,
    h: 0.5,
    fontSize: FONT_SIZES.pageTitle,
    bold: true,
    color: palette.textPrimary,
    fontFace: 'Liberation Sans',
  });

  // 价值指标卡片
  content.mainPoints?.forEach((point, i) => {
    slide.addShape('rect', {
      x: 0.3 + i * 3,
      y: 1.8,
      w: 2.8,
      h: 1.5,
      fill: { color: palette.surface },
      line: { color: palette.success, width: 2 },
    });
    slide.addText(point, {
      x: 0.5 + i * 3,
      y: 2.2,
      w: 2.6,
      h: 1,
      fontSize: FONT_SIZES.bodySmall,
      color: palette.textPrimary,
      align: 'center',
      fontFace: 'Liberation Sans',
    });
  });

  // 配图（ROI图表）
  if (imageResult?.success && imageResult.imageUrl) {
    addImageToSlide(slide, imageResult, 'bottom-panel');
  }
}

/**
 * 时间轴布局（timeline-roadmap）
 */
function buildTimelineSlide(
  slide: PptxGenJS.Slide,
  pptSlide: PPTSlide,
  palette: typeof DARK_CONSULTING_PALETTE,
  imageResult?: SlideImageResult
) {
  const presentation = pptSlide.presentation;

  // 标题
  if (presentation?.sectionLabel) {
    slide.addText(presentation.sectionLabel, {
      x: 0.3,
      y: 0.3,
      w: 2,
      h: 0.3,
      fontSize: FONT_SIZES.sectionTag,
      color: palette.secondary,
      fontFace: 'Liberation Sans',
    });
  }

  slide.addText(presentation?.headline || pptSlide.slideTitle, {
    x: 0.3,
    y: 0.8,
    w: 9.5,
    h: 0.5,
    fontSize: FONT_SIZES.pageTitle,
    bold: true,
    color: palette.textPrimary,
    fontFace: 'Liberation Sans',
  });

  // 配图（时间轴）
  if (imageResult?.success && imageResult.imageUrl) {
    addImageToSlide(slide, imageResult, 'center-large');
  }
}

/**
 * 风险板布局（risk-board）
 */
function buildRiskSlide(
  slide: PptxGenJS.Slide,
  pptSlide: PPTSlide,
  palette: typeof DARK_CONSULTING_PALETTE,
  imageResult?: SlideImageResult
) {
  const presentation = pptSlide.presentation;
  const content = pptSlide.content;

  // 标题
  if (presentation?.sectionLabel) {
    slide.addText(presentation.sectionLabel, {
      x: 0.3,
      y: 0.3,
      w: 2,
      h: 0.3,
      fontSize: FONT_SIZES.sectionTag,
      color: palette.warning,
      fontFace: 'Liberation Sans',
    });
  }

  slide.addText(presentation?.headline || pptSlide.slideTitle, {
    x: 0.3,
    y: 0.8,
    w: 9.5,
    h: 0.5,
    fontSize: FONT_SIZES.pageTitle,
    bold: true,
    color: palette.textPrimary,
    fontFace: 'Liberation Sans',
  });

  // 风险项
  content.mainPoints?.forEach((point, i) => {
    slide.addShape('rect', {
      x: 0.3,
      y: 1.8 + i * 1,
      w: 9.5,
      h: 0.8,
      fill: { color: palette.surface },
      line: { color: palette.warning, width: 2 },
    });
    slide.addText(point, {
      x: 0.5,
      y: 1.9 + i * 1,
      w: 9.3,
      h: 0.6,
      fontSize: FONT_SIZES.bodySmall,
      color: palette.textPrimary,
      fontFace: 'Liberation Sans',
    });
  });
}

/**
 * 结束页布局（closing-summary）
 */
function buildClosingSlide(
  slide: PptxGenJS.Slide,
  pptSlide: PPTSlide,
  palette: typeof DARK_CONSULTING_PALETTE,
  imageResult?: SlideImageResult
) {
  const presentation = pptSlide.presentation;
  const content = pptSlide.content;

  // 顶部装饰条
  slide.addShape('rect', {
    x: 0,
    y: 0,
    w: '100%',
    h: 0.1,
    fill: { color: palette.primary },
  });

  // 标题
  if (presentation?.sectionLabel) {
    slide.addText(presentation.sectionLabel, {
      x: 0.3,
      y: 0.3,
      w: 2,
      h: 0.3,
      fontSize: FONT_SIZES.sectionTag,
      color: palette.primary,
      fontFace: 'Liberation Sans',
    });
  }

  slide.addText(presentation?.headline || pptSlide.slideTitle, {
    x: 0.5,
    y: 1.5,
    w: 9,
    h: 0.8,
    fontSize: FONT_SIZES.sectionTitle,
    bold: true,
    color: palette.textPrimary,
    align: 'center',
    fontFace: 'Liberation Sans',
  });

  // 下一步行动
  content.mainPoints?.forEach((point, i) => {
    slide.addText(point, {
      x: 1,
      y: 2.8 + i * 0.5,
      w: 8,
      h: 0.4,
      fontSize: FONT_SIZES.bulletText,
      color: palette.textSecondary,
      bullet: { type: 'number' },
      fontFace: 'Liberation Sans',
    });
  });
}

/**
 * 默认布局
 */
function buildDefaultSlide(
  slide: PptxGenJS.Slide,
  pptSlide: PPTSlide,
  palette: typeof DARK_CONSULTING_PALETTE,
  imageResult?: SlideImageResult
) {
  const presentation = pptSlide.presentation;
  const content = pptSlide.content;

  // 标题
  slide.addText(presentation?.headline || pptSlide.slideTitle, {
    x: 0.3,
    y: 0.5,
    w: 9.5,
    h: 0.6,
    fontSize: FONT_SIZES.pageTitle,
    bold: true,
    color: palette.textPrimary,
    fontFace: 'Liberation Sans',
  });

  // 内容
  content.mainPoints?.forEach((point, i) => {
    slide.addText(point, {
      x: 0.3,
      y: 1.5 + i * 0.5,
      w: 9.5,
      h: 0.4,
      fontSize: FONT_SIZES.bodySmall,
      color: palette.textPrimary,
      bullet: { type: 'bullet' },
      fontFace: 'Liberation Sans',
    });
  });
}

// ============================================
// 图片添加辅助函数
// ============================================

/**
 * 图片位置类型
 */
type ImagePlacement = 'hero' | 'right-panel' | 'center-large' | 'bottom-panel';

const PPTX_IMAGE_TMP_DIR = join(tmpdir(), 'talkagent-pptx-images');

function ensurePptxImageTmpDir(): string {
  if (!existsSync(PPTX_IMAGE_TMP_DIR)) {
    mkdirSync(PPTX_IMAGE_TMP_DIR, { recursive: true });
  }
  return PPTX_IMAGE_TMP_DIR;
}

function addImagePlaceholder(
  slide: PptxGenJS.Slide,
  pos: { x: number; y: number; w: number; h: number },
  fillColor = '1E293B',
  lineColor = '3B82F6'
) {
  slide.addShape('rect', {
    x: pos.x,
    y: pos.y,
    w: pos.w,
    h: pos.h,
    fill: { color: fillColor },
    line: { color: lineColor, width: 2 },
  });
  slide.addText('配图区域', {
    x: pos.x,
    y: pos.y + pos.h / 2 - 0.2,
    w: pos.w,
    h: 0.4,
    fontSize: FONT_SIZES.bodySmall,
    color: '64748B',
    align: 'center',
    fontFace: 'Liberation Sans',
  });
}

function materializeSvgDataUrl(imageUrl: string): string | null {
  const match = imageUrl.match(
    /^data:image\/svg\+xml(?:;charset=[^;,]+)?(?:;base64)?,(.*)$/i
  );
  if (!match) return null;

  try {
    const encoded = match[1];
    const svgContent = /;base64,/i.test(imageUrl)
      ? Buffer.from(encoded, 'base64').toString('utf-8')
      : decodeURIComponent(encoded);

    const fileName = `${createHash('sha1').update(svgContent).digest('hex')}.svg`;
    const filePath = join(ensurePptxImageTmpDir(), fileName);

    if (!existsSync(filePath)) {
      writeFileSync(filePath, svgContent, 'utf-8');
    }

    return filePath;
  } catch (error) {
    console.warn('[PPTX Builder] Failed to materialize SVG data URL:', error);
    return null;
  }
}

function resolveLocalImagePath(imageUrl: string): string | null {
  if (!imageUrl.startsWith('/')) return null;

  const cleanPath = imageUrl.split('?')[0]?.split('#')[0];
  if (!cleanPath) return null;

  const absolutePath = resolve(process.cwd(), 'public', `.${cleanPath}`);
  return existsSync(absolutePath) ? absolutePath : null;
}

/**
 * 添加图片到幻灯片
 *
 * 注意：pptxgenjs 只支持 PNG/JPEG 格式的 base64，不支持 SVG
 * SVG 格式的 data URL 需要跳过或转换
 *
 * 原则：展示区域尺寸与源图比例匹配，避免过度裁剪/缩放
 */
function addImageToSlide(
  slide: PptxGenJS.Slide,
  imageResult: SlideImageResult,
  placement: ImagePlacement
) {
  const imageUrl = imageResult.imageUrl;
  if (!imageUrl) return;

  // 根据位置设置尺寸和坐标（已优化以匹配源图比例）
  // PPT 幻灯片尺寸：10" × 5.625" (16:9)
  // 源图尺寸参考：DEFAULT 2400×1350, context-split 1800×1600 等
  const placements: Record<
    ImagePlacement,
    { x: number; y: number; w: number; h: number }
  > = {
    // 整页铺满：源图 2560×1440 (16:9)
    hero: { x: 0, y: 0, w: 10, h: 5.625 },

    // 右侧面板：匹配 context-split 源图比例 (1800×1600 ≈ 1.125)
    // 调整宽度：4.15 × 1.125 = 4.67"
    'right-panel': { x: 5.08, y: 0.35, w: 4.67, h: 4.15 },

    // 中央大图：匹配 journey-flow 源图比例 (3000×1350 ≈ 2.22)
    // 展示区域：宽度占 80%，高度适配
    'center-large': { x: 0.9, y: 1.2, w: 8.2, h: 4.0 },

    // 底部面板：匹配 value-dashboard 源图比例 (3000×900 ≈ 3.33)
    // 展示区域：宽度占 90%，高度适配
    'bottom-panel': { x: 0.5, y: 3.3, w: 9, h: 2.7 },
  };

  const pos = placements[placement];
  const sizing = getImageSizingForPlacement(placement, pos);

  try {
    // 处理不同类型的图片 URL
    if (imageUrl.startsWith('data:image/svg+xml')) {
      const svgPath = materializeSvgDataUrl(imageUrl);
      if (svgPath) {
        slide.addImage({
          x: pos.x,
          y: pos.y,
          w: pos.w,
          h: pos.h,
          path: svgPath,
          sizing,
        });
        return;
      }

      console.warn(
        '[PPTX Builder] SVG data URL could not be converted, using placeholder'
      );
      addImagePlaceholder(slide, pos);
      return;
    }

    if (
      imageUrl.startsWith('data:image/png') ||
      imageUrl.startsWith('data:image/jpeg')
    ) {
      // PNG/JPEG base64 格式 - pptxgenjs 支持
      slide.addImage({
        x: pos.x,
        y: pos.y,
        w: pos.w,
        h: pos.h,
        data: imageUrl,
        sizing,
      });
      return;
    }

    if (imageUrl.startsWith('/') || imageUrl.startsWith('http')) {
      const localPath = resolveLocalImagePath(imageUrl);
      if (localPath) {
        slide.addImage({
          x: pos.x,
          y: pos.y,
          w: pos.w,
          h: pos.h,
          path: localPath,
          sizing,
        });
        return;
      }

      console.warn(
        '[PPTX Builder] URL images need to be downloaded first:',
        imageUrl.substring(0, 50)
      );
      addImagePlaceholder(slide, pos);
      return;
    }

    // 其他格式 - 使用占位图
    addImagePlaceholder(slide, pos);
  } catch (error) {
    console.error('[PPTX Builder] Failed to add image:', error);
    // 图片添加失败时，添加占位矩形
    addImagePlaceholder(slide, pos, '333333', '666666');
  }
}

function getImageSizingForPlacement(
  placement: ImagePlacement,
  pos: { x: number; y: number; w: number; h: number }
) {
  if (placement === 'hero') {
    return { type: 'cover' as const, w: pos.w, h: pos.h };
  }

  return { type: 'cover' as const, w: pos.w, h: pos.h };
}
