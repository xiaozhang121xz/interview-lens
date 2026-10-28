/**
 * 图表生成服务
 *
 * 根据图表配置生成实际的图片
 * 支持：人物卡片、流程图、痛点矩阵、方案映射图等
 *
 * @module lib/services/chart-generator
 */

import type {
  VisualConfig,
  VisualType,
  CharacterCardConfig,
  FlowChartConfig,
  PainPointDetailCardConfig,
  PriorityMatrixConfig,
  MappingDiagramConfig,
  ROIChartConfig,
  TimelineConfig,
  CauseEffectConfig,
  TreeDiagramConfig,
  SolutionDetailCardConfig,
  RiskMatrixConfig,
  TechLightPalette,
  PaletteName,
} from '@/lib/types/ppt-outline';
import { PALETTE_PRESETS } from '@/lib/types/ppt-outline';

// ============================================
// 类型定义
// ============================================

/**
 * 图表生成结果
 */
export interface ChartGenerationResult {
  success: boolean;
  imageUrl?: string;
  imageType: 'url' | 'base64' | 'svg';
  error?: string;
}

/**
 * 图表生成选项
 */
export interface ChartGenerationOptions {
  width?: number;
  height?: number;
  theme?: 'modern' | 'classic' | 'minimal';
  format?: 'png' | 'svg' | 'pdf';
  /** 配色方案对象 */
  palette?: TechLightPalette;
  /** 配色方案名称 */
  paletteName?: PaletteName;
}

/**
 * 获取配色方案
 */
function getPalette(options: ChartGenerationOptions): TechLightPalette {
  if (options.palette) return options.palette;
  if (options.paletteName) return PALETTE_PRESETS[options.paletteName];
  return PALETTE_PRESETS['tech-light'];
}

// ============================================
// SVG 字号体系（汇报型图表标准）
// ============================================

/**
 * 统一 SVG 字号配置
 *
 * 原则：任何标签不低于 14px，任何正文不低于 16px
 */
const SVG_FONT_SIZES = {
  // 最小字号（安全下限）
  min: 14,

  // 标签/图注
  label: 16,
  caption: 16,
  axis: 16,

  // 正文
  body: 18,
  bodySmall: 16,
  bullet: 18,

  // 标题
  blockTitle: 20,
  cardTitle: 22,
  sectionTitle: 24,
  pageTitle: 26,

  // 特殊元素
  avatarInitial: 40, // 头像首字母
  bigNumber: 28, // 核心数字/指标
  quote: 16, // 引用文字
};

/**
 * 字号安全下限函数
 */
function clampSvgFontSize(size: number, min = SVG_FONT_SIZES.min): number {
  return Math.max(min, size);
}

function escapeSvgText(value: string | undefined): string {
  return (value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function truncateText(value: string | undefined, max: number): string {
  const text = value || '';
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function renderForeignObjectText(params: {
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  color: string;
  fontSize?: number;
  fontWeight?: number | string;
  lineHeight?: number;
  align?: 'left' | 'center';
}): string {
  const {
    x,
    y,
    width,
    height,
    text,
    color,
    fontSize = SVG_FONT_SIZES.body,
    fontWeight = 400,
    lineHeight = 1.45,
    align = 'left',
  } = params;

  return `
  <foreignObject x="${x}" y="${y}" width="${width}" height="${height}">
    <div xmlns="http://www.w3.org/1999/xhtml" style="
      width:${width}px;
      height:${height}px;
      color:${color};
      font-size:${fontSize}px;
      font-weight:${fontWeight};
      line-height:${lineHeight};
      font-family:Arial, sans-serif;
      text-align:${align};
      word-break:break-word;
      overflow:hidden;
    ">
      ${escapeSvgText(text)}
    </div>
  </foreignObject>`;
}

// ============================================
// 主入口函数
// ============================================

/**
 * 根据图表配置生成图片
 */
export async function generateChartImage(
  visual: VisualConfig,
  options: ChartGenerationOptions = {}
): Promise<ChartGenerationResult> {
  const { width = 800, height = 600, theme = 'modern' } = options;

  try {
    switch (visual.type) {
      case 'character-card':
        return await generateCharacterCard(visual.config, {
          width,
          height,
          theme,
        });

      case 'flow-chart':
        return await generateFlowChart(visual.config, { width, height, theme });

      case 'painpoint-detail':
        return await generatePainPointDetailCard(visual.config, {
          width,
          height,
          theme,
        });

      case 'priority-matrix':
        return await generatePriorityMatrix(visual.config, {
          width,
          height,
          theme,
        });

      case 'cause-effect':
        return await generateCauseEffectDiagram(visual.config, {
          width,
          height,
          theme,
        });

      case 'tree-diagram':
        return await generateTreeDiagram(visual.config, {
          width,
          height,
          theme,
        });

      case 'solution-detail':
        return await generateSolutionDetailCard(visual.config, {
          width,
          height,
          theme,
        });

      case 'mapping-diagram':
        return await generateMappingDiagram(visual.config, {
          width,
          height,
          theme,
        });

      case 'roi-chart':
        return await generateROIChart(visual.config, { width, height, theme });

      case 'timeline':
        return await generateTimeline(visual.config, { width, height, theme });

      case 'risk-matrix':
        return await generateRiskMatrix(visual.config, {
          width,
          height,
          theme,
        });

      case 'infographic':
        return await generateInfographic(visual.config, {
          width,
          height,
          theme,
        });

      case 'scene-illustration':
        return await generateSceneIllustration(visual.config, {
          width,
          height,
          theme,
        });

      case 'logo-placeholder':
        return generateLogoPlaceholder(
          visual.config as { companyName: string }
        );

      default: {
        // TypeScript穷尽检查
        const _exhaustiveCheck: never = visual;
        return {
          success: false,
          imageType: 'url' as const,
          error: `不支持的图表类型`,
        };
      }
    }
  } catch (error) {
    console.error('[Chart Generator] Error:', error);
    return {
      success: false,
      imageType: 'url',
      error: error instanceof Error ? error.message : '图表生成失败',
    };
  }
}

/**
 * 批量生成图表
 */
export async function generateAllCharts(
  visuals: VisualConfig[],
  options: ChartGenerationOptions = {}
): Promise<Map<number, ChartGenerationResult>> {
  const results = new Map<number, ChartGenerationResult>();

  for (let i = 0; i < visuals.length; i++) {
    const result = await generateChartImage(visuals[i], options);
    results.set(i, result);
  }

  return results;
}

// ============================================
// 各类型图表生成函数
// ============================================

/**
 * 生成人物卡片
 */
async function generateCharacterCard(
  config: CharacterCardConfig,
  options: ChartGenerationOptions
): Promise<ChartGenerationResult> {
  // 生成SVG格式的人物卡片
  const svg = generateCharacterCardSVG(config, options);

  return {
    success: true,
    imageUrl: `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`,
    imageType: 'svg',
  };
}

/**
 * 生成流程图
 */
async function generateFlowChart(
  config: FlowChartConfig,
  options: ChartGenerationOptions
): Promise<ChartGenerationResult> {
  const svg = generateFlowChartSVG(config, options);

  return {
    success: true,
    imageUrl: `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`,
    imageType: 'svg',
  };
}

/**
 * 生成痛点详情卡片
 */
async function generatePainPointDetailCard(
  config: PainPointDetailCardConfig,
  options: ChartGenerationOptions
): Promise<ChartGenerationResult> {
  const svg = generatePainPointDetailSVG(config, options);

  return {
    success: true,
    imageUrl: `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`,
    imageType: 'svg',
  };
}

/**
 * 生成优先级矩阵
 */
async function generatePriorityMatrix(
  config: PriorityMatrixConfig,
  options: ChartGenerationOptions
): Promise<ChartGenerationResult> {
  const svg = generatePriorityMatrixSVG(config, options);

  return {
    success: true,
    imageUrl: `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`,
    imageType: 'svg',
  };
}

/**
 * 生成因果关系图
 */
async function generateCauseEffectDiagram(
  config: CauseEffectConfig,
  options: ChartGenerationOptions
): Promise<ChartGenerationResult> {
  const svg = generateCauseEffectSVG(config, options);

  return {
    success: true,
    imageUrl: `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`,
    imageType: 'svg',
  };
}

/**
 * 生成树状图
 */
async function generateTreeDiagram(
  config: TreeDiagramConfig,
  options: ChartGenerationOptions
): Promise<ChartGenerationResult> {
  const svg = generateTreeDiagramSVG(config, options);

  return {
    success: true,
    imageUrl: `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`,
    imageType: 'svg',
  };
}

/**
 * 生成方案详情卡片
 */
async function generateSolutionDetailCard(
  config: SolutionDetailCardConfig,
  options: ChartGenerationOptions
): Promise<ChartGenerationResult> {
  const svg = generateSolutionDetailSVG(config, options);

  return {
    success: true,
    imageUrl: `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`,
    imageType: 'svg',
  };
}

/**
 * 生成方案-痛点映射图
 */
async function generateMappingDiagram(
  config: MappingDiagramConfig,
  options: ChartGenerationOptions
): Promise<ChartGenerationResult> {
  const svg = generateMappingDiagramSVG(config, options);

  return {
    success: true,
    imageUrl: `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`,
    imageType: 'svg',
  };
}

/**
 * 生成ROI图表
 */
async function generateROIChart(
  config: ROIChartConfig,
  options: ChartGenerationOptions
): Promise<ChartGenerationResult> {
  const svg = generateROIChartSVG(config, options);

  return {
    success: true,
    imageUrl: `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`,
    imageType: 'svg',
  };
}

/**
 * 生成时间轴
 */
async function generateTimeline(
  config: TimelineConfig,
  options: ChartGenerationOptions
): Promise<ChartGenerationResult> {
  const svg = generateTimelineSVG(config, options);

  return {
    success: true,
    imageUrl: `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`,
    imageType: 'svg',
  };
}

/**
 * 生成风险矩阵
 */
async function generateRiskMatrix(
  config: RiskMatrixConfig,
  options: ChartGenerationOptions
): Promise<ChartGenerationResult> {
  const svg = generateRiskMatrixSVG(config, options);

  return {
    success: true,
    imageUrl: `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`,
    imageType: 'svg',
  };
}

/**
 * 生成信息图
 */
async function generateInfographic(
  config: Record<string, unknown>,
  options: ChartGenerationOptions
): Promise<ChartGenerationResult> {
  const svg = generateInfographicSVG(config, options);

  return {
    success: true,
    imageUrl: `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`,
    imageType: 'svg',
  };
}

/**
 * 生成场景示意图
 */
async function generateSceneIllustration(
  config: { description: string },
  options: ChartGenerationOptions
): Promise<ChartGenerationResult> {
  const svg = generateSceneIllustrationSVG(config, options);
  return {
    success: true,
    imageUrl: `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`,
    imageType: 'svg',
  };
}

/**
 * 生成Logo占位图
 */
function generateLogoPlaceholder(config: {
  companyName: string;
}): ChartGenerationResult {
  const svg = generateLogoPlaceholderSVG(config);
  return {
    success: true,
    imageUrl: `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`,
    imageType: 'svg',
  };
}

// ============================================
// SVG生成函数
// ============================================

function generateCharacterCardSVG(
  config: CharacterCardConfig,
  options: ChartGenerationOptions
): string {
  const { width = 800, height = 400 } = options;
  const palette = getPalette(options);
  const goals = config.keyGoals?.slice(0, 3) || [];
  const painPoints = config.keyPainPoints?.slice(0, 3) || [];

  return `
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="cardGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${palette.primary.gradient.start};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${palette.primary.gradient.end};stop-opacity:1" />
    </linearGradient>
    <filter id="cardShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="${palette.neutral.textPrimary}" flood-opacity="0.1"/>
    </filter>
  </defs>

  <!-- 背景卡片 -->
  <rect x="20" y="20" width="${width - 40}" height="${height - 40}" rx="16"
        fill="${palette.neutral.surface}" stroke="${palette.primary.light}" stroke-width="2" filter="url(#cardShadow)"/>

  <!-- 顶部装饰条 -->
  <rect x="20" y="20" width="${width - 40}" height="8" rx="4" fill="url(#cardGradient)"/>

  <!-- 头像区域 -->
  <circle cx="120" cy="120" r="60" fill="${palette.neutral.background}" stroke="${palette.primary.main}" stroke-width="3"/>
  <text x="120" y="130" text-anchor="middle" font-size="40" fill="${palette.primary.main}" font-weight="bold">${config.name?.charAt(0) || '用'}</text>

  <!-- 用户信息 -->
  <text x="200" y="80" font-size="28" font-weight="bold" fill="${palette.neutral.textPrimary}">${config.name || '目标用户'}</text>
  <text x="200" y="120" font-size="20" fill="${palette.neutral.textSecondary}">${config.role || '用户角色'}</text>
  ${config.department ? `<text x="200" y="150" font-size="16" fill="${palette.neutral.textSecondary}" opacity="0.8">${config.department}</text>` : ''}

  <!-- 分隔线 -->
  <line x1="40" y1="180" x2="${width - 40}" y2="180" stroke="${palette.neutral.border}" stroke-width="1"/>

  <!-- 目标区域 -->
  <rect x="40" y="205" width="320" height="118" rx="14" fill="${palette.neutral.background}" stroke="${palette.neutral.border}" stroke-width="1.2"/>
  <text x="60" y="232" font-size="16" font-weight="bold" fill="${palette.primary.main}">核心目标</text>
  ${goals
    .map(
      (goal, i) => `
    <circle cx="64" cy="${257 + i * 26}" r="4" fill="${palette.secondary.main}"/>
    ${renderForeignObjectText({
      x: 76,
      y: 244 + i * 26,
      width: 260,
      height: 22,
      text: goal,
      color: palette.neutral.textPrimary,
      fontSize: 13,
    })}
  `
    )
    .join('')}

  <!-- 痛点区域 -->
  <rect x="390" y="205" width="370" height="118" rx="14" fill="${palette.neutral.background}" stroke="${palette.neutral.border}" stroke-width="1.2"/>
  <text x="410" y="232" font-size="16" font-weight="bold" fill="${palette.accent.main}">主要痛点</text>
  ${painPoints
    .map(
      (pp, i) => `
    <circle cx="414" cy="${257 + i * 26}" r="4" fill="${palette.status.high}"/>
    ${renderForeignObjectText({
      x: 426,
      y: 244 + i * 26,
      width: 300,
      height: 22,
      text: pp,
      color: palette.neutral.textPrimary,
      fontSize: 13,
    })}
  `
    )
    .join('')}

  <!-- 引用区域 -->
  <rect x="40" y="${height - 80}" width="${width - 80}" height="40" rx="8" fill="${palette.neutral.background}" stroke="${palette.neutral.border}"/>
  ${renderForeignObjectText({
    x: 60,
    y: height - 72,
    width: width - 120,
    height: 24,
    text: `"${truncateText(config.quoteSnippet, 90)}"`,
    color: palette.neutral.textSecondary,
    fontSize: 12,
  })}
</svg>`;
}

function generateFlowChartSVG(
  config: FlowChartConfig,
  options: ChartGenerationOptions
): string {
  const { width = 800, height = 400 } = options;
  const palette = getPalette(options);
  const stages = config.stages || [];
  const stageWidth = (width - 80) / Math.max(stages.length, 1);

  return `
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
      <polygon points="0 0, 10 3.5, 0 7" fill="${palette.primary.main}"/>
    </marker>
    <filter id="nodeShadow">
      <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="${palette.neutral.textPrimary}" flood-opacity="0.1"/>
    </filter>
  </defs>

  <!-- 背景 -->
  <rect x="0" y="0" width="${width}" height="${height}" fill="${palette.neutral.background}"/>

  <!-- 标题 -->
  <text x="${width / 2}" y="30" text-anchor="middle" font-size="20" font-weight="bold" fill="${palette.neutral.textPrimary}">用户工作流程</text>

  <!-- 阶段节点 -->
  ${stages
    .map((stage, i) => {
      const x = 40 + i * stageWidth + stageWidth / 2;
      const isHighlight =
        stage.isHighlight || config.highlightStage === stage.name;
      return `
      <rect x="${40 + i * stageWidth}" y="60" width="${stageWidth - 10}" height="80" rx="8"
            fill="${isHighlight ? palette.primary.main : palette.neutral.surface}"
            stroke="${isHighlight ? palette.primary.dark : palette.neutral.border}"
            stroke-width="2" filter="url(#nodeShadow)"/>
      <text x="${x}" y="105" text-anchor="middle" font-size="16" font-weight="bold"
            fill="${isHighlight ? palette.neutral.surface : palette.neutral.textPrimary}">${stage.name}</text>
      ${
        stage.tasks
          ?.slice(0, 2)
          .map(
            (task, j) =>
              `<text x="${x}" y="${125 + j * 15}" text-anchor="middle" font-size="16" fill="${isHighlight ? palette.neutral.surface : palette.neutral.textSecondary}">${task.substring(0, 10)}</text>`
          )
          .join('') || ''
      }

      ${i < stages.length - 1 ? `<line x1="${40 + (i + 1) * stageWidth - 5}" y1="100" x2="${40 + (i + 1) * stageWidth + 5}" y2="100" stroke="${palette.primary.main}" stroke-width="2" marker-end="url(#arrowhead)"/>` : ''}
    `;
    })
    .join('')}

  <!-- 图例 -->
  <rect x="40" y="${height - 60}" width="20" height="20" rx="4" fill="${palette.primary.main}"/>
  <text x="70" y="${height - 45}" font-size="16" fill="${palette.neutral.textSecondary}">关键阶段</text>
</svg>`;
}

function generatePainPointDetailSVG(
  config: PainPointDetailCardConfig,
  options: ChartGenerationOptions
): string {
  const { width = 800, height = 600 } = options;
  const palette = getPalette(options);
  const severityColors = {
    high: palette.status.high,
    medium: palette.status.medium,
    low: palette.status.low,
  };

  return `
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="cardShadow">
      <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="${palette.neutral.textPrimary}" flood-opacity="0.1"/>
    </filter>
  </defs>

  <!-- 背景 -->
  <rect x="0" y="0" width="${width}" height="${height}" fill="${palette.neutral.background}"/>

  <!-- 标题区 -->
  <rect x="20" y="20" width="${width - 40}" height="80" rx="8" fill="${palette.neutral.surface}" stroke="${severityColors[config.severity]}" stroke-width="2" filter="url(#cardShadow)"/>
  <rect x="20" y="20" width="6" height="80" rx="3" fill="${severityColors[config.severity]}"/>
  ${renderForeignObjectText({
    x: 40,
    y: 38,
    width: width - 80,
    height: 34,
    text: config.title,
    color: palette.neutral.textPrimary,
    fontSize: 24,
    fontWeight: 700,
  })}
  <text x="40" y="85" font-size="14" fill="${palette.neutral.textSecondary}">TOP1 痛点详情</text>

  <!-- 严重程度标签 -->
  <rect x="40" y="110" width="100" height="30" rx="15" fill="${severityColors[config.severity]}"/>
  <text x="90" y="130" text-anchor="middle" font-size="14" fill="${palette.neutral.surface}">${config.severity === 'high' ? '高严重' : config.severity === 'medium' ? '中严重' : '低严重'}</text>

  <rect x="150" y="110" width="80" height="30" rx="15" fill="${severityColors[config.frequency]}"/>
  <text x="190" y="130" text-anchor="middle" font-size="14" fill="${palette.neutral.surface}">${config.frequency === 'high' ? '高频' : config.frequency === 'medium' ? '中频' : '低频'}</text>

  <!-- 原话佐证 -->
  <rect x="40" y="160" width="${width - 80}" height="100" rx="8" fill="${palette.neutral.surface}" stroke="${palette.neutral.border}" filter="url(#cardShadow)"/>
  <text x="60" y="190" font-size="14" font-weight="bold" fill="${palette.primary.main}">💬 原话佐证</text>
  ${renderForeignObjectText({
    x: 60,
    y: 204,
    width: width - 120,
    height: 42,
    text: `"${truncateText(config.quote, 120)}"`,
    color: palette.neutral.textPrimary,
    fontSize: 15,
    lineHeight: 1.5,
  })}

  <!-- 影响指标 -->
  <text x="40" y="290" font-size="16" font-weight="bold" fill="${palette.neutral.textPrimary}">影响指标</text>
  ${
    config.metrics
      ?.slice(0, 3)
      .map(
        (m, i) => `
    <rect x="${40 + i * 240}" y="308" width="220" height="42" rx="14" fill="${palette.neutral.surface}" stroke="${palette.neutral.border}" stroke-width="1"/>
    <circle cx="${62 + i * 240}" cy="329" r="5" fill="${palette.accent.main}"/>
    ${renderForeignObjectText({
      x: 76 + i * 240,
      y: 317,
      width: 170,
      height: 22,
      text: m,
      color: palette.neutral.textPrimary,
      fontSize: 13,
    })}
  `
      )
      .join('') || ''
  }

  <!-- 根因分析 -->
  <text x="40" y="${height - 180}" font-size="16" font-weight="bold" fill="${palette.neutral.textPrimary}">根因分析</text>
  <rect x="40" y="${height - 160}" width="220" height="98" rx="12" fill="${palette.neutral.surface}" stroke="${palette.neutral.border}"/>
  <rect x="290" y="${height - 160}" width="220" height="98" rx="12" fill="${palette.neutral.surface}" stroke="${palette.neutral.border}"/>
  <rect x="540" y="${height - 160}" width="220" height="98" rx="12" fill="${palette.neutral.surface}" stroke="${palette.neutral.border}"/>
  <text x="58" y="${height - 134}" font-size="14" font-weight="bold" fill="${palette.status.medium}">表层原因</text>
  <text x="308" y="${height - 134}" font-size="14" font-weight="bold" fill="${palette.accent.main}">深层原因</text>
  <text x="558" y="${height - 134}" font-size="14" font-weight="bold" fill="${palette.primary.main}">已有应对</text>
  ${renderForeignObjectText({
    x: 58,
    y: height - 124,
    width: 184,
    height: 52,
    text: config.rootCause?.surface?.join('、') || '待补充',
    color: palette.neutral.textSecondary,
    fontSize: 13,
  })}
  ${renderForeignObjectText({
    x: 308,
    y: height - 124,
    width: 184,
    height: 52,
    text: config.rootCause?.deep?.join('、') || '待补充',
    color: palette.neutral.textSecondary,
    fontSize: 13,
  })}
  ${renderForeignObjectText({
    x: 558,
    y: height - 124,
    width: 184,
    height: 52,
    text: config.rootCause?.attempted?.join('、') || '无',
    color: palette.neutral.textSecondary,
    fontSize: 13,
  })}
</svg>`;
}

function generatePriorityMatrixSVG(
  config: PriorityMatrixConfig,
  options: ChartGenerationOptions
): string {
  const { width = 800, height = 500 } = options;
  const palette = getPalette(options);
  const cellWidth = 200;
  const cellHeight = 120;
  const startX = 150;
  const startY = 80;

  // 矩阵网格
  const items = config.items || [];
  const matrix: Record<string, typeof items> = {
    'high-high': [],
    'high-medium': [],
    'high-low': [],
    'medium-high': [],
    'medium-medium': [],
    'medium-low': [],
    'low-high': [],
    'low-medium': [],
    'low-low': [],
  };

  items.forEach((item) => {
    matrix[`${item.impact}-${item.frequency}`]?.push(item);
  });

  return `
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <!-- 背景 -->
  <rect x="0" y="0" width="${width}" height="${height}" fill="${palette.neutral.background}"/>

  <!-- 标题 -->
  <text x="${width / 2}" y="30" text-anchor="middle" font-size="20" font-weight="bold" fill="${palette.neutral.textPrimary}">${config.title || '痛点优先级矩阵'}</text>

  <!-- Y轴标签 -->
  <text x="30" y="${startY + cellHeight / 2}" font-size="14" fill="${palette.neutral.textSecondary}" transform="rotate(-90, 30, ${startY + cellHeight / 2})">${config.yAxisLabel || '影响程度'}</text>
  <text x="80" y="${startY + 30}" font-size="16" fill="${palette.neutral.textSecondary}">高</text>
  <text x="80" y="${startY + cellHeight + 30}" font-size="16" fill="${palette.neutral.textSecondary}">中</text>
  <text x="80" y="${startY + 2 * cellHeight + 30}" font-size="16" fill="${palette.neutral.textSecondary}">低</text>

  <!-- X轴标签 -->
  <text x="${startX + cellWidth / 2}" y="${height - 20}" text-anchor="middle" font-size="16" fill="${palette.neutral.textSecondary}">高频</text>
  <text x="${startX + cellWidth + cellWidth / 2}" y="${height - 20}" text-anchor="middle" font-size="16" fill="${palette.neutral.textSecondary}">中频</text>
  <text x="${startX + 2 * cellWidth + cellWidth / 2}" y="${height - 20}" text-anchor="middle" font-size="16" fill="${palette.neutral.textSecondary}">低频</text>
  <text x="${width / 2}" y="${height}" text-anchor="middle" font-size="14" fill="${palette.neutral.textSecondary}">${config.xAxisLabel || '出现频率'}</text>

  <!-- 矩阵单元格 -->
  ${[0, 1, 2]
    .map((row) =>
      [0, 1, 2]
        .map((col) => {
          const x = startX + col * cellWidth;
          const y = startY + row * cellHeight;
          const levels = ['high', 'medium', 'low'];
          const key = `${levels[row]}-${levels[col]}`;
          const cellItems = matrix[key] || [];
          const isHighlight = cellItems.some((item) =>
            config.highlightIds?.includes(item.id)
          );

          return `
      <rect x="${x}" y="${y}" width="${cellWidth}" height="${cellHeight}"
            fill="${isHighlight ? palette.accent.light + '20' : palette.neutral.surface}"
            stroke="${palette.neutral.border}" stroke-width="1"/>
      ${cellItems
        .slice(0, 2)
        .map(
          (item, i) => `
        <rect x="${x + 10}" y="${y + 12 + i * 42}" width="${cellWidth - 20}" height="34" rx="10"
              fill="${isHighlight ? palette.accent.light + '25' : palette.neutral.background}" />
        <text x="${x + 22}" y="${y + 32 + i * 42}" font-size="16"
              fill="${isHighlight ? palette.accent.main : palette.neutral.textPrimary}"
              font-weight="700">${item.label}</text>
        ${renderForeignObjectText({
          x: x + 72,
          y: y + 18 + i * 42,
          width: cellWidth - 92,
          height: 24,
          text: truncateText(item.description, 26),
          color: palette.neutral.textSecondary,
          fontSize: 11,
        })}
      `
        )
        .join('')}
    `;
        })
        .join('')
    )
    .join('')}
</svg>`;
}

function generateMappingDiagramSVG(
  config: MappingDiagramConfig,
  options: ChartGenerationOptions
): string {
  const { width = 800, height = 400 } = options;
  const palette = getPalette(options);
  const mappings = config.mappings || [];

  return `
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <marker id="arrow" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
      <polygon points="0 0, 10 3.5, 0 7" fill="${palette.primary.main}"/>
    </marker>
    <filter id="cardShadow">
      <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="${palette.neutral.textPrimary}" flood-opacity="0.1"/>
    </filter>
  </defs>

  <!-- 背景 -->
  <rect x="0" y="0" width="${width}" height="${height}" fill="${palette.neutral.background}"/>

  <!-- 标题 -->
  <text x="${width / 2}" y="30" text-anchor="middle" font-size="20" font-weight="bold" fill="${palette.neutral.textPrimary}">${config.title || '方案-痛点映射'}</text>

  <!-- 左侧：痛点 -->
  <text x="100" y="60" text-anchor="middle" font-size="16" font-weight="bold" fill="${palette.status.high}">痛点</text>

  <!-- 右侧：方案 -->
  <text x="${width - 100}" y="60" text-anchor="middle" font-size="16" font-weight="bold" fill="${palette.status.low}">方案</text>

  ${mappings
    .map((m, i) => {
      const y = 100 + i * 80;
      return `
      <!-- 痛点卡片 -->
      <rect x="30" y="${y}" width="160" height="64" rx="10" fill="${palette.neutral.surface}" stroke="${palette.status.high}" stroke-width="2" filter="url(#cardShadow)"/>
      <text x="100" y="${y + 25}" text-anchor="middle" font-size="16" font-weight="bold" fill="${palette.status.high}">TOP${m.painPointRank}</text>
      ${renderForeignObjectText({
        x: 48,
        y: y + 28,
        width: 124,
        height: 24,
        text: m.painPointLabel,
        color: palette.neutral.textSecondary,
        fontSize: 10,
        align: 'center',
      })}

      <!-- 连接线 -->
      <line x1="190" y1="${y + 32}" x2="${width - 190}" y2="${y + 32}" stroke="${palette.primary.main}" stroke-width="2" marker-end="url(#arrow)"/>

      <!-- 方案卡片 -->
      <rect x="${width - 190}" y="${y}" width="160" height="64" rx="10" fill="${palette.neutral.surface}" stroke="${palette.status.low}" stroke-width="2" filter="url(#cardShadow)"/>
      ${renderForeignObjectText({
        x: width - 176,
        y: y + 18,
        width: 132,
        height: 28,
        text: m.solutionLabel,
        color: palette.status.low,
        fontSize: 12,
        fontWeight: 700,
        align: 'center',
      })}
    `;
    })
    .join('')}
</svg>`;
}

function generateROIChartSVG(
  config: ROIChartConfig,
  options: ChartGenerationOptions
): string {
  const { width = 800, height = 400 } = options;
  const palette = getPalette(options);

  return `
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <!-- 背景 -->
  <rect x="0" y="0" width="${width}" height="${height}" fill="${palette.neutral.background}"/>

  <!-- 标题 -->
  <text x="${width / 2}" y="30" text-anchor="middle" font-size="20" font-weight="bold" fill="${palette.neutral.textPrimary}">预期价值评估</text>

  <!-- 直接价值 -->
  <text x="60" y="70" font-size="16" font-weight="bold" fill="${palette.neutral.textPrimary}">直接价值</text>
  ${
    config.directValue
      ?.map(
        (dv, i) => `
    <rect x="60" y="${90 + i * 60}" width="300" height="50" rx="8" fill="${palette.neutral.surface}" stroke="${palette.status.low}" stroke-width="2"/>
    <text x="80" y="${120 + i * 60}" font-size="14" font-weight="bold" fill="${palette.neutral.textPrimary}">${dv.metric}</text>
    <text x="80" y="${135 + i * 60}" font-size="16" fill="${palette.status.low}">提升: ${dv.improvement}</text>
  `
      )
      .join('') || ''
  }

  <!-- 长期价值 -->
  <text x="420" y="70" font-size="16" font-weight="bold" fill="${palette.neutral.textPrimary}">长期价值</text>
  ${
    config.longTermValue
      ?.map(
        (lv, i) => `
    <circle cx="430" cy="${95 + i * 25}" r="4" fill="${palette.secondary.main}"/>
    <text x="440" y="${100 + i * 25}" font-size="14" fill="${palette.neutral.textPrimary}">${lv}</text>
  `
      )
      .join('') || ''
  }

  <!-- ROI预估值 -->
  <rect x="${width - 200}" y="${height - 80}" width="180" height="60" rx="8" fill="${palette.primary.light}20" stroke="${palette.primary.main}" stroke-width="2"/>
  <text x="${width - 110}" y="${height - 50}" text-anchor="middle" font-size="16" font-weight="bold" fill="${palette.primary.main}">${config.estimatedROI || '预计ROI: 3-5倍'}</text>
</svg>`;
}

function generateTimelineSVG(
  config: TimelineConfig,
  options: ChartGenerationOptions
): string {
  const { width = 800, height = 300 } = options;
  const palette = getPalette(options);
  const phases = config.phases || [];
  const phaseWidth = (width - 100) / Math.max(phases.length, 1);

  return `
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <!-- 背景 -->
  <rect x="0" y="0" width="${width}" height="${height}" fill="${palette.neutral.background}"/>

  <!-- 标题 -->
  <text x="${width / 2}" y="30" text-anchor="middle" font-size="20" font-weight="bold" fill="${palette.neutral.textPrimary}">实施路径</text>

  <!-- 时间轴线 -->
  <line x1="50" y1="80" x2="${width - 50}" y2="80" stroke="${palette.primary.main}" stroke-width="3"/>

  ${phases
    .map((phase, i) => {
      const x = 50 + i * phaseWidth + phaseWidth / 2;
      const statusColors = {
        planned: palette.neutral.textSecondary,
        ongoing: palette.primary.main,
        completed: palette.status.low,
      };
      return `
      <!-- 节点 -->
      <circle cx="${x}" cy="80" r="12" fill="${statusColors[phase.status]}" stroke="${palette.neutral.surface}" stroke-width="2"/>
      <text x="${x}" y="84" text-anchor="middle" font-size="16" fill="${palette.neutral.surface}" font-weight="bold">${i + 1}</text>

      <!-- 阶段信息 -->
      <text x="${x}" y="60" text-anchor="middle" font-size="14" font-weight="bold" fill="${palette.neutral.textPrimary}">${phase.name}</text>
      <text x="${x}" y="110" text-anchor="middle" font-size="16" fill="${palette.neutral.textSecondary}">${phase.duration}</text>

      <!-- 行动项 -->
      ${
        phase.actions
          ?.slice(0, 2)
          .map(
            (action, j) => `
        <text x="${x}" y="${140 + j * 20}" text-anchor="middle" font-size="16" fill="${palette.neutral.textSecondary}">• ${action}</text>
      `
          )
          .join('') || ''
      }
    `;
    })
    .join('')}
</svg>`;
}

function generateCauseEffectSVG(
  config: CauseEffectConfig,
  options: ChartGenerationOptions
): string {
  const { width = 800, height = 400 } = options;
  const palette = getPalette(options);

  return `
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <marker id="arrowCE" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
      <polygon points="0 0, 10 3.5, 0 7" fill="${palette.primary.main}"/>
    </marker>
  </defs>

  <!-- 背景 -->
  <rect x="0" y="0" width="${width}" height="${height}" fill="${palette.neutral.background}"/>

  <text x="${width / 2}" y="30" text-anchor="middle" font-size="20" font-weight="bold" fill="${palette.neutral.textPrimary}">根因分析</text>
  ${
    config.rootCauses
      ?.map(
        (rc, i) => `
    <rect x="50" y="${60 + i * 100}" width="200" height="60" rx="8" fill="${palette.neutral.surface}" stroke="${palette.status.high}" stroke-width="2"/>
    <text x="150" y="${95 + i * 100}" text-anchor="middle" font-size="14" fill="${palette.status.high}">${rc.cause}</text>

    <line x1="250" y1="${90 + i * 100}" x2="350" y2="${90 + i * 100}" stroke="${palette.primary.main}" stroke-width="2" marker-end="url(#arrowCE)"/>

    <rect x="350" y="${60 + i * 100}" width="200" height="60" rx="8" fill="${palette.neutral.surface}" stroke="${palette.status.low}" stroke-width="2"/>
    <text x="450" y="${95 + i * 100}" text-anchor="middle" font-size="14" fill="${palette.status.low}">${rc.effects?.[0] || ''}</text>
  `
      )
      .join('') || ''
  }
</svg>`;
}

function generateTreeDiagramSVG(
  config: TreeDiagramConfig,
  options: ChartGenerationOptions
): string {
  const { width = 800, height = 400 } = options;
  const palette = getPalette(options);

  return `
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <!-- 背景 -->
  <rect x="0" y="0" width="${width}" height="${height}" fill="${palette.neutral.background}"/>

  <text x="${width / 2}" y="30" text-anchor="middle" font-size="20" font-weight="bold" fill="${palette.neutral.textPrimary}">${config.root || '需求分类'}</text>

  ${
    config.branches
      ?.map((branch, i) => {
        const x = 100 + i * 200;
        return `
      <line x1="${width / 2}" y1="50" x2="${x + 50}" y2="100" stroke="${palette.primary.main}" stroke-width="2"/>
      <rect x="${x}" y="100" width="100" height="40" rx="8" fill="${palette.primary.main}"/>
      <text x="${x + 50}" y="125" text-anchor="middle" font-size="14" fill="${palette.neutral.surface}">${branch.category}</text>

      ${
        branch.items
          ?.slice(0, 3)
          .map(
            (item, j) => `
        <line x1="${x + 50}" y1="140" x2="${x + 50}" y2="${170 + j * 40}" stroke="${palette.neutral.border}" stroke-width="1"/>
        <circle cx="${x + 50}" cy="${175 + j * 40}" r="3" fill="${palette.secondary.main}"/>
        <text x="${x + 60}" y="${180 + j * 40}" font-size="16" fill="${palette.neutral.textPrimary}">${item.substring(0, 12)}</text>
      `
          )
          .join('') || ''
      }
    `;
      })
      .join('') || ''
  }
</svg>`;
}

function generateSolutionDetailSVG(
  config: SolutionDetailCardConfig,
  options: ChartGenerationOptions
): string {
  const { width = 800, height = 600 } = options;
  const palette = getPalette(options);

  return `
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="cardShadow">
      <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="${palette.neutral.textPrimary}" flood-opacity="0.1"/>
    </filter>
  </defs>

  <!-- 背景 -->
  <rect x="0" y="0" width="${width}" height="${height}" fill="${palette.neutral.background}"/>

  <!-- 标题区 -->
  <rect x="20" y="20" width="${width - 40}" height="80" rx="8" fill="${palette.neutral.surface}" stroke="${palette.status.low}" stroke-width="2" filter="url(#cardShadow)"/>
  <rect x="20" y="20" width="6" height="80" rx="3" fill="${palette.status.low}"/>
  ${renderForeignObjectText({
    x: 40,
    y: 38,
    width: width - 80,
    height: 32,
    text: config.title,
    color: palette.neutral.textPrimary,
    fontSize: 24,
    fontWeight: 700,
  })}
  ${renderForeignObjectText({
    x: 40,
    y: 72,
    width: width - 80,
    height: 20,
    text: `针对: ${config.targetPainPoint}`,
    color: palette.neutral.textSecondary,
    fontSize: 14,
  })}

  <!-- 解决原理 -->
  <text x="40" y="140" font-size="16" font-weight="bold" fill="${palette.neutral.textPrimary}">解决原理</text>
  ${renderForeignObjectText({
    x: 60,
    y: 150,
    width: width - 120,
    height: 40,
    text: config.howItWorks,
    color: palette.neutral.textSecondary,
    fontSize: 14,
  })}

  <!-- 实施步骤 -->
  <text x="40" y="220" font-size="16" font-weight="bold" fill="${palette.neutral.textPrimary}">实施步骤</text>
  ${
    config.steps
      ?.slice(0, 3)
      .map(
        (s, i) => `
    <rect x="60" y="${240 + i * 64}" width="${width - 120}" height="52" rx="12" fill="${palette.neutral.surface}" stroke="${palette.neutral.border}" stroke-width="1"/>
    <rect x="74" y="${251 + i * 64}" width="30" height="30" rx="15" fill="${palette.primary.main}"/>
    <text x="89" y="${271 + i * 64}" text-anchor="middle" font-size="14" fill="${palette.neutral.surface}" font-weight="bold">${s.step}</text>
    <text x="120" y="${262 + i * 64}" font-size="18" font-weight="700" fill="${palette.neutral.textPrimary}">${truncateText(s.action, 18)}</text>
    ${renderForeignObjectText({
      x: 120,
      y: 266 + i * 64,
      width: width - 200,
      height: 20,
      text: truncateText(s.details, 54),
      color: palette.neutral.textSecondary,
      fontSize: 12,
    })}
  `
      )
      .join('') || ''
  }

  <!-- 预期价值 -->
  <text x="40" y="${height - 150}" font-size="16" font-weight="bold" fill="${palette.neutral.textPrimary}">预期价值</text>
  <rect x="40" y="${height - 136}" width="220" height="70" rx="12" fill="${palette.neutral.surface}" stroke="${palette.status.low}" stroke-width="1.5"/>
  <rect x="290" y="${height - 136}" width="220" height="70" rx="12" fill="${palette.neutral.surface}" stroke="${palette.status.low}" stroke-width="1.5"/>
  <rect x="540" y="${height - 136}" width="220" height="70" rx="12" fill="${palette.neutral.surface}" stroke="${palette.status.low}" stroke-width="1.5"/>
  <text x="58" y="${height - 108}" font-size="18" font-weight="700" fill="${palette.status.low}">效率提升</text>
  <text x="308" y="${height - 108}" font-size="18" font-weight="700" fill="${palette.status.low}">成本降低</text>
  <text x="558" y="${height - 108}" font-size="18" font-weight="700" fill="${palette.status.low}">业务收益</text>
  ${renderForeignObjectText({
    x: 58,
    y: height - 98,
    width: 184,
    height: 28,
    text: config.expectedValue?.efficiency || '待补充',
    color: palette.neutral.textPrimary,
    fontSize: 14,
  })}
  ${renderForeignObjectText({
    x: 308,
    y: height - 98,
    width: 184,
    height: 28,
    text: config.expectedValue?.cost || '待补充',
    color: palette.neutral.textPrimary,
    fontSize: 14,
  })}
  ${renderForeignObjectText({
    x: 558,
    y: height - 102,
    width: 184,
    height: 34,
    text: config.expectedValue?.business?.join('、') || '待补充',
    color: palette.neutral.textPrimary,
    fontSize: 13,
  })}
</svg>`;
}

function generateRiskMatrixSVG(
  config: RiskMatrixConfig,
  options: ChartGenerationOptions
): string {
  const { width = 800, height = 400 } = options;
  const palette = getPalette(options);

  return `
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <!-- 背景 -->
  <rect x="0" y="0" width="${width}" height="${height}" fill="${palette.neutral.background}"/>

  <text x="${width / 2}" y="30" text-anchor="middle" font-size="20" font-weight="bold" fill="${palette.neutral.textPrimary}">风险提示</text>

  ${
    config.risks
      ?.map(
        (r, i) => `
    <rect x="40" y="${60 + i * 78}" width="${width - 80}" height="68" rx="12" fill="${palette.neutral.surface}" stroke="${palette.status.high}" stroke-width="1.5"/>
    <rect x="40" y="${60 + i * 78}" width="6" height="68" rx="3" fill="${palette.status.high}"/>
    ${renderForeignObjectText({
      x: 60,
      y: 72 + i * 78,
      width: width - 260,
      height: 24,
      text: r.risk,
      color: palette.status.high,
      fontSize: 14,
      fontWeight: 700,
    })}
    <rect x="${width - 210}" y="${74 + i * 78}" width="72" height="22" rx="11" fill="${palette.primary.light}20"/>
    <rect x="${width - 128}" y="${74 + i * 78}" width="72" height="22" rx="11" fill="${palette.accent.light}20"/>
    <text x="${width - 174}" y="${89 + i * 78}" text-anchor="middle" font-size="16" fill="${palette.primary.main}">概率 ${r.probability}</text>
    <text x="${width - 92}" y="${89 + i * 78}" text-anchor="middle" font-size="16" fill="${palette.accent.main}">影响 ${r.impact}</text>
    ${renderForeignObjectText({
      x: 60,
      y: 96 + i * 78,
      width: width - 120,
      height: 20,
      text: `应对：${r.mitigation}`,
      color: palette.neutral.textSecondary,
      fontSize: 12,
    })}
  `
      )
      .join('') || ''
  }
</svg>`;
}

function generateInfographicSVG(
  config: Record<string, unknown>,
  options: ChartGenerationOptions
): string {
  const { width = 800, height = 300 } = options;
  const palette = getPalette(options);

  return `
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${palette.primary.gradient.start};stop-opacity:0.1" />
      <stop offset="100%" style="stop-color:${palette.primary.gradient.end};stop-opacity:0.1" />
    </linearGradient>
  </defs>

  <!-- 背景 -->
  <rect x="0" y="0" width="${width}" height="${height}" fill="${palette.neutral.background}"/>
  <rect x="0" y="0" width="${width}" height="${height}" fill="url(#bgGradient)"/>

  <!-- 标题 -->
  <text x="${width / 2}" y="${height / 2 - 20}" text-anchor="middle" font-size="28" font-weight="bold" fill="${palette.primary.main}">访谈分析完成</text>
  <text x="${width / 2}" y="${height / 2 + 20}" text-anchor="middle" font-size="16" fill="${palette.neutral.textSecondary}">感谢聆听</text>

  <!-- 装饰元素 -->
  <circle cx="100" cy="50" r="30" fill="${palette.primary.light}" opacity="0.3"/>
  <circle cx="${width - 100}" cy="${height - 50}" r="40" fill="${palette.secondary.light}" opacity="0.3"/>
</svg>`;
}

function generateSceneIllustrationSVG(
  config: { description: string },
  options: ChartGenerationOptions
): string {
  const { width = 800, height = 450 } = options;
  const palette = getPalette(options);
  const lines = (config.description || '聚焦关键业务流程、研究边界与核心观察')
    .split(/[，。,；;]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 3);

  const cards = [
    {
      title: '业务场景',
      body: lines[0] || '聚焦关键业务流程中的效率与体验问题',
      x: 70,
      y: 170,
    },
    {
      title: '研究范围',
      body: lines[1] || '覆盖从认知、比较到决策的关键节点',
      x: 290,
      y: 120,
    },
    {
      title: '当前关注',
      body: lines[2] || '优先识别高频高影响阻碍并提炼验证方向',
      x: 510,
      y: 170,
    },
  ];

  return `
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="sceneBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${palette.primary.gradient.start};stop-opacity:0.18" />
      <stop offset="100%" style="stop-color:${palette.secondary.light};stop-opacity:0.08" />
    </linearGradient>
    <filter id="sceneShadow">
      <feDropShadow dx="0" dy="8" stdDeviation="18" flood-color="${palette.neutral.textPrimary}" flood-opacity="0.08"/>
    </filter>
  </defs>

  <rect x="0" y="0" width="${width}" height="${height}" rx="28" fill="${palette.neutral.background}"/>
  <rect x="24" y="24" width="${width - 48}" height="${height - 48}" rx="24" fill="url(#sceneBg)" stroke="${palette.primary.light}" stroke-width="1.5"/>

  <text x="56" y="76" font-size="18" font-weight="700" fill="${palette.primary.main}">RESEARCH SCOPE</text>
  <text x="56" y="122" font-size="30" font-weight="700" fill="${palette.neutral.textPrimary}">研究范围与关键场景</text>
  <text x="56" y="148" font-size="15" fill="${palette.neutral.textSecondary}">用结构化业务图替代插画，统一汇报风格并提升稳定性</text>

  <line x1="150" y1="270" x2="${width - 150}" y2="270" stroke="${palette.primary.main}" stroke-width="3" stroke-linecap="round"/>
  ${cards
    .map(
      (card) => `
    <g filter="url(#sceneShadow)">
      <rect x="${card.x}" y="${card.y}" width="180" height="120" rx="18" fill="${palette.neutral.surface}" stroke="${palette.neutral.border}" stroke-width="1.2"/>
      <circle cx="${card.x + 28}" cy="${card.y + 28}" r="10" fill="${palette.primary.main}"/>
      <text x="${card.x + 48}" y="${card.y + 34}" font-size="15" font-weight="700" fill="${palette.neutral.textPrimary}">${card.title}</text>
      <foreignObject x="${card.x + 18}" y="${card.y + 52}" width="144" height="52">
        <div xmlns="http://www.w3.org/1999/xhtml" style="font-size:13px; line-height:1.45; color:${palette.neutral.textSecondary}; font-family:Arial, sans-serif;">
          ${card.body}
        </div>
      </foreignObject>
    </g>
  `
    )
    .join('')}

  <circle cx="${width / 2}" cy="270" r="18" fill="${palette.primary.main}"/>
  <text x="${width / 2}" y="276" text-anchor="middle" font-size="18" font-weight="700" fill="${palette.neutral.surface}">范围</text>
</svg>`;
}

function generateLogoPlaceholderSVG(config: { companyName: string }): string {
  const palette = PALETTE_PRESETS['tech-light'];
  const companyName = config.companyName || '客户';
  const initials = companyName.replace(/\s+/g, '').slice(0, 2);

  return `
<svg width="1200" height="675" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="coverGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${palette.primary.gradient.start};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${palette.primary.gradient.end};stop-opacity:1" />
    </linearGradient>
  </defs>

  <rect width="1200" height="675" rx="36" fill="${palette.neutral.background}"/>
  <rect x="40" y="40" width="1120" height="595" rx="32" fill="url(#coverGradient)" opacity="0.08"/>
  <rect x="72" y="72" width="1056" height="531" rx="28" fill="${palette.neutral.surface}" stroke="${palette.neutral.border}" stroke-width="2"/>

  <circle cx="220" cy="220" r="92" fill="url(#coverGradient)"/>
  <text x="220" y="247" text-anchor="middle" font-size="72" font-weight="700" fill="${palette.neutral.surface}">${initials || '客'}</text>

  <text x="360" y="180" font-size="28" font-weight="700" fill="${palette.primary.main}">EXECUTIVE SUMMARY</text>
  <text x="360" y="248" font-size="62" font-weight="700" fill="${palette.neutral.textPrimary}">${companyName}</text>
  <text x="360" y="300" font-size="26" fill="${palette.neutral.textSecondary}">访谈洞察与关键建议</text>

  <rect x="128" y="380" width="260" height="132" rx="24" fill="${palette.neutral.background}" stroke="${palette.neutral.border}"/>
  <rect x="470" y="380" width="260" height="132" rx="24" fill="${palette.neutral.background}" stroke="${palette.neutral.border}"/>
  <rect x="812" y="380" width="260" height="132" rx="24" fill="${palette.neutral.background}" stroke="${palette.neutral.border}"/>

  <text x="158" y="422" font-size="16" font-weight="700" fill="${palette.primary.main}">研究主题</text>
  <text x="158" y="462" font-size="28" font-weight="700" fill="${palette.neutral.textPrimary}">关键决策摘要</text>

  <text x="500" y="422" font-size="16" font-weight="700" fill="${palette.primary.main}">交付形式</text>
  <text x="500" y="462" font-size="28" font-weight="700" fill="${palette.neutral.textPrimary}">结构化汇报稿</text>

  <text x="842" y="422" font-size="16" font-weight="700" fill="${palette.primary.main}">页面风格</text>
  <text x="842" y="462" font-size="28" font-weight="700" fill="${palette.neutral.textPrimary}">无需插画依赖</text>
</svg>`;
}
