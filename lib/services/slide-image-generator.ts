/**
 * PPT 幻灯片配图生成服务
 *
 * 整合多种配图引擎：
 * - chart-generator.ts：结构化 SVG 图表
 * - smart-illustrator：Gemini 创意配图、Excalidraw 手绘图、Mermaid 流程图
 *
 * @module lib/services/slide-image-generator
 */

import type {
  PPTSlide,
  VisualConfig,
  SlideImageAsset,
} from '@/lib/types/ppt-outline';
import {
  generateChartImage,
  type ChartGenerationResult,
} from './chart-generator';

// ============================================
// 类型定义
// ============================================

/**
 * 配图引擎类型
 */
export type ImageEngine =
  | 'gemini'
  | 'excalidraw'
  | 'mermaid'
  | 'svg'
  | 'placeholder';

/**
 * 配图生成结果
 */
export interface SlideImageResult {
  slideIndex: number;
  success: boolean;
  imageUrl?: string;
  imageType: 'url' | 'base64' | 'svg' | 'file';
  engine: ImageEngine;
  error?: string;
}

/**
 * 配图生成选项
 */
export interface SlideImageOptions {
  /** 是否生成创意配图（需要 API Key） */
  enableGemini?: boolean;
  /** 是否包含配图 */
  includeImages?: boolean;
  /** Gemini API Key（可选，默认从环境变量读取） */
  geminiApiKey?: string;
  /** OpenRouter API Key（可选，默认从环境变量读取） */
  openrouterApiKey?: string;
  /** 图片宽度 */
  width?: number;
  /** 图片高度 */
  height?: number;
  /** 输出目录（用于保存生成的图片文件） */
  outputDir?: string;
  /** 配色方案 */
  paletteName?: 'tech-light' | 'tech-dark-consulting';
}

type SlideRenderPreset = {
  width: number;
  height: number;
};

/**
 * 默认图像生成尺寸
 *
 * 原则：源图尺寸必须足够大，避免在 PPT 中二次放大导致模糊
 */
const DEFAULT_SLIDE_RENDER_PRESET: SlideRenderPreset = {
  width: 2400,
  height: 1350,
};

/**
 * 各布局的图像生成尺寸预设
 *
 * 对于信息承载图（流程图、矩阵、仪表板等），需要更高的基础像素
 */
const SLIDE_RENDER_PRESETS: Record<string, SlideRenderPreset> = {
  // 封面页：更大的高分辨率
  'cover-hero': { width: 2560, height: 1440 },

  // 左右分栏类布局：增加宽度以容纳更多信息
  'context-split': { width: 1800, height: 1600 },
  'persona-spotlight': { width: 1800, height: 1600 },
  'analysis-board': { width: 1800, height: 1600 },
  'evidence-focus': { width: 1800, height: 1600 },
  'solution-spotlight': { width: 1800, height: 1600 },

  // 流程图/矩阵类：需要更宽的画布
  'journey-flow': { width: 3000, height: 1350 },
  'matrix-compare': { width: 3000, height: 1350 },
  'requirement-tree': { width: 3000, height: 1350 },
  'mapping-board': { width: 3000, height: 1350 },
  'timeline-roadmap': { width: 3000, height: 1350 },

  // 仪表板：宽而矮
  'value-dashboard': { width: 3000, height: 900 },
  'risk-board': { width: 3000, height: 1200 },
};

// ============================================
// 主入口函数
// ============================================

/**
 * 为所有幻灯片生成配图
 *
 * @param slides PPT 幻灯片数组
 * @param options 配图生成选项
 * @returns Map<幻灯片索引, 图片URL>
 */
export async function generateAllSlideImages(
  slides: PPTSlide[],
  options: SlideImageOptions = {}
): Promise<Map<number, SlideImageResult>> {
  const results = new Map<number, SlideImageResult>();

  // 并行生成（提升效率）
  // 注意：Gemini API 有速率限制，建议分批处理
  const batchSize = options.enableGemini ? 3 : slides.length; // Gemini 每批 3 个

  for (
    let batchStart = 0;
    batchStart < slides.length;
    batchStart += batchSize
  ) {
    const batchEnd = Math.min(batchStart + batchSize, slides.length);
    const batchPromises: Promise<SlideImageResult>[] = [];

    for (let i = batchStart; i < batchEnd; i++) {
      batchPromises.push(generateSlideImage(slides[i], i, options));
    }

    const batchResults = await Promise.all(batchPromises);
    batchResults.forEach((result) => {
      results.set(result.slideIndex, result);
    });

    // 如果使用 Gemini，每批之间暂停 1 秒（避免速率限制）
    if (options.enableGemini && batchEnd < slides.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  return results;
}

/**
 * 为单个幻灯片生成配图
 */
export async function generateSlideImage(
  slide: PPTSlide,
  slideIndex: number,
  options: SlideImageOptions = {}
): Promise<SlideImageResult> {
  const imageAsset = slide.presentation?.imageAsset;
  const visual = slide.visual;

  // 如果没有配图配置，返回占位图
  if (!imageAsset && !visual) {
    return {
      slideIndex,
      success: false,
      imageType: 'url',
      engine: 'placeholder',
      error: '幻灯片未提供可生成的配图配置',
    };
  }

  // 根据 visual.type 选择引擎
  const engine = selectImageEngine(visual?.type, imageAsset?.style);

  try {
    switch (engine) {
      case 'svg':
        // 使用 chart-generator.ts 生成 SVG 图表
        return await generateWithSVG(slide, slideIndex, options);

      case 'gemini':
        // 使用 Gemini API 生成创意配图
        if (!options.enableGemini) {
          return {
            slideIndex,
            success: false,
            imageType: 'url',
            engine: 'gemini',
            error: 'Gemini 配图生成未启用',
          };
        }
        return await generateWithGemini(slide, slideIndex, options);

      case 'excalidraw':
        return {
          slideIndex,
          success: false,
          imageType: 'url',
          engine: 'excalidraw',
          error: 'Excalidraw 配图引擎尚未实现',
        };

      case 'mermaid':
        return {
          slideIndex,
          success: false,
          imageType: 'url',
          engine: 'mermaid',
          error: 'Mermaid 配图引擎尚未实现',
        };

      default:
        return {
          slideIndex,
          success: false,
          imageType: 'url',
          engine: 'placeholder',
          error: '没有可用的配图引擎',
        };
    }
  } catch (error) {
    console.error(
      `[Slide Image Generator] Error for slide ${slideIndex}:`,
      error
    );
    return {
      slideIndex,
      success: false,
      imageType: 'url',
      engine,
      error: error instanceof Error ? error.message : '配图生成失败',
    };
  }
}

// ============================================
// 引擎选择逻辑
// ============================================

/**
 * 根据 visual.type 和 style 选择配图引擎
 */
function selectImageEngine(
  visualType?: string,
  imageStyle?: string
): ImageEngine {
  const localSvgOverrides = [
    'flow-chart',
    'scene-illustration',
    'logo-placeholder',
  ];
  if (localSvgOverrides.includes(visualType || '')) {
    return 'svg';
  }

  // 结构化图表优先走本地 SVG 生成，不要被 imageAsset.style 误导到 Gemini
  const svgTypes = [
    'character-card',
    'priority-matrix',
    'roi-chart',
    'timeline',
    'risk-matrix',
    'painpoint-detail',
    'solution-detail',
    'mapping-diagram',
    'cause-effect',
    'tree-diagram',
  ];

  if (svgTypes.includes(visualType || '')) {
    return 'svg';
  }

  // 创意配图 → Gemini
  const geminiTypes = [
    'abstract',
    'illustration',
    'infographic',
    'ui-mockup',
    'persona-spotlight',
    'cover-hero',
  ];
  const geminiStyles = ['abstract', 'illustration', 'ui-mockup', 'creative'];

  if (
    geminiTypes.includes(visualType || '') ||
    geminiStyles.includes(imageStyle || '')
  ) {
    return 'gemini';
  }

  // 流程图 → Excalidraw 或 Mermaid
  if (visualType === 'flow-chart') {
    // 复杂流程图用 Mermaid，简单的用 Excalidraw
    return 'excalidraw'; // 暂时用 placeholder
  }

  // 默认使用 Gemini（如果启用）或 SVG
  return 'gemini';
}

// ============================================
// 各引擎生成函数
// ============================================

/**
 * 使用 chart-generator 生成 SVG 图表
 */
async function generateWithSVG(
  slide: PPTSlide,
  slideIndex: number,
  options: SlideImageOptions
): Promise<SlideImageResult> {
  const visual = slide.visual;
  if (!visual) {
    return {
      slideIndex,
      success: false,
      imageType: 'url',
      engine: 'svg',
      error: '无 visual 配置',
    };
  }

  const renderSize = getSlideRenderSize(slide, options);
  const result: ChartGenerationResult = await generateChartImage(visual, {
    width: renderSize.width,
    height: renderSize.height,
    paletteName: options.paletteName || 'tech-light',
  });

  if (result.success && result.imageUrl) {
    return {
      slideIndex,
      success: true,
      imageUrl: result.imageUrl,
      imageType: result.imageType,
      engine: 'svg',
    };
  }

  return {
    slideIndex,
    success: false,
    imageType: 'url',
    engine: 'svg',
    error: result.error || 'SVG 图表生成失败',
  };
}

function getSlideRenderSize(
  slide: PPTSlide,
  options: SlideImageOptions
): SlideRenderPreset {
  if (typeof options.width === 'number' && typeof options.height === 'number') {
    return { width: options.width, height: options.height };
  }

  const layout = slide.presentation?.layout;
  return layout
    ? SLIDE_RENDER_PRESETS[layout] || DEFAULT_SLIDE_RENDER_PRESET
    : DEFAULT_SLIDE_RENDER_PRESET;
}

/**
 * 使用 Gemini API 生成创意配图
 *
 * 注意：这是简化版实现，完整版需要调用 smart-illustrator skill
 */
async function generateWithGemini(
  slide: PPTSlide,
  slideIndex: number,
  options: SlideImageOptions
): Promise<SlideImageResult> {
  const imageAsset = slide.presentation?.imageAsset;
  if (!imageAsset?.prompt) {
    return {
      slideIndex,
      success: false,
      imageType: 'url',
      engine: 'gemini',
      error: '无 imageAsset.prompt 配置',
    };
  }

  // 获取 API Key
  const apiKey =
    options.geminiApiKey ||
    process.env.GEMINI_API_KEY ||
    process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    return {
      slideIndex,
      success: false,
      imageType: 'url',
      engine: 'gemini',
      error: '未配置 GEMINI_API_KEY 或 OPENROUTER_API_KEY',
    };
  }

  return {
    slideIndex,
    success: false,
    imageType: 'url',
    engine: 'gemini',
    error: 'Gemini 配图 API 尚未接入，未生成虚假的占位图片地址',
  };
}

// ============================================
// 辅助函数
// ============================================

/**
 * 从幻灯片提取配图提示词
 */
export function extractImagePrompt(slide: PPTSlide): string | null {
  const imageAsset = slide.presentation?.imageAsset;
  if (!imageAsset?.prompt) return null;

  // 组合 prompt 和 emphasisKeywords
  let prompt = imageAsset.prompt;
  if (imageAsset.emphasisKeywords?.length) {
    prompt += `\n强调关键词：${imageAsset.emphasisKeywords.join('、')}`;
  }

  return prompt;
}

/**
 * 计算配图生成统计
 */
export function calculateImageStats(results: Map<number, SlideImageResult>): {
  total: number;
  success: number;
  failed: number;
  byEngine: Record<ImageEngine, number>;
} {
  const stats = {
    total: results.size,
    success: 0,
    failed: 0,
    byEngine: {
      gemini: 0,
      excalidraw: 0,
      mermaid: 0,
      svg: 0,
      placeholder: 0,
    } as Record<ImageEngine, number>,
  };

  results.forEach((result) => {
    if (result.success) {
      stats.success++;
    } else {
      stats.failed++;
    }
    stats.byEngine[result.engine]++;
  });

  return stats;
}
