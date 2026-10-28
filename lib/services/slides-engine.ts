/**
 * Slides 引擎服务
 *
 * 基于分享报告大纲执行一次可选的 PPT 预生成流程。
 * 这是项目内对 slides skill 工作流的轻量封装：
 * - 使用现有 PptxGenJS builder 生成 PPTX
 * - 输出可用于前端展示/日志记录的生成摘要
 * - 不在创建分享报告阶段持久化二进制文件，避免拉重主链路
 *
 * @module lib/services/slides-engine
 */

import { existsSync } from 'node:fs';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { promisify } from 'node:util';

import type { PPTOutlineContent } from '@/lib/types/ppt-outline';
import { buildPPTXWithPptxGenJS } from './pptx-builder';
import { generateAllSlideImages } from './slide-image-generator';

const execFileAsync = promisify(execFile);

export type SlidesEngineMode = 'native' | 'slides';

export interface SlidesPreflightOptions {
  mode: SlidesEngineMode;
  includeImages?: boolean;
  enableGemini?: boolean;
  persistArtifact?: boolean;
}

export interface SlidesPreflightResult {
  success: boolean;
  mode: SlidesEngineMode;
  slideCount: number;
  imageCount: number;
  blobSizeBytes: number;
  generatedAt: string;
  skillResourceAvailable: boolean;
  skillResourcePath: string;
  warnings: string[];
  artifactPath?: string;
  artifactDir?: string;
  renderedSlidePaths?: string[];
  error?: string;
}

const SLIDES_SKILL_PATH = resolve(
  process.cwd(),
  '.claude/skills/slides/slides/SKILL.md'
);
const SLIDES_RENDER_SCRIPT_PATH = resolve(
  process.cwd(),
  '.claude/skills/slides/slides/scripts/render_slides.py'
);
const SLIDES_VENV_PYTHON = resolve(
  process.cwd(),
  '.claude/skills/slides/venv/bin/python'
);
const FALLBACK_PYTHON = '/opt/python-venv/bin/python';

function resolveSlidesPython(): string {
  if (existsSync(SLIDES_VENV_PYTHON)) {
    return SLIDES_VENV_PYTHON;
  }

  if (existsSync(FALLBACK_PYTHON)) {
    return FALLBACK_PYTHON;
  }

  return 'python3';
}

async function renderSlidesArtifact(
  artifactPath: string,
  artifactDir: string
): Promise<string[]> {
  if (!existsSync(SLIDES_RENDER_SCRIPT_PATH)) {
    return [];
  }

  const outputDir = resolve(artifactDir, 'rendered');
  const pythonBin = resolveSlidesPython();
  console.log(`[Slides Engine] Step E: rendering slides to PNG (python=${pythonBin})`);

  await execFileAsync(
    pythonBin,
    [
      SLIDES_RENDER_SCRIPT_PATH,
      artifactPath,
      '--output_dir',
      outputDir,
      '--width',
      '2400',
      '--height',
      '1350',
    ],
    {
      cwd: process.cwd(),
      maxBuffer: 20 * 1024 * 1024,
    }
  );

  const { readdir } = await import('node:fs/promises');
  const files = await readdir(outputDir);
  const rendered = files
    .filter((file) => /^slide-\d+\.png$/i.test(file))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .map((file) => resolve(outputDir, file));
  console.log(`[Slides Engine] Step E completed: rendered ${rendered.length} slide PNGs`);
  return rendered;
}

/**
 * 执行一次基于 slides 工作流的预生成。
 *
 * 说明：
 * - `slides` 模式当前仍复用项目内 PptxGenJS builder；
 * - 该封装先把“大模型决定是否触发 slides 能力”接入主流程；
 * - 后续可以在这里继续接入 slides skill 的 helper / 校验脚本。
 */
export async function runSlidesPreflight(
  outline: PPTOutlineContent,
  options: SlidesPreflightOptions
): Promise<SlidesPreflightResult> {
  const includeImages = options.includeImages ?? true;
  const skillResourceAvailable = existsSync(SLIDES_SKILL_PATH);
  const warnings: string[] = [];

  if (options.mode === 'slides' && !skillResourceAvailable) {
    warnings.push('slides skill 目录不存在，已回退到项目内 PPTX builder');
  }

  try {
    console.log(`[Slides Engine] Starting preflight (mode=${options.mode}, includeImages=${includeImages})`);
    const imageResults = await generateAllSlideImages(outline.slides, {
      includeImages,
      enableGemini: options.enableGemini ?? false,
      width: 1600,
      height: 1200,
      paletteName: outline.metadata.paletteName || 'tech-light',
    });

    console.log(`[Slides Engine] Step D: building PPT deck with local builder`);
    const buildResult = await buildPPTXWithPptxGenJS(outline, {
      includeImages,
      imageResults,
      paletteName: outline.metadata.paletteName,
      outputType: 'buffer',
    });

    if (!buildResult.success || !buildResult.buffer) {
      return {
        success: false,
        mode: options.mode,
        slideCount: buildResult.slideCount,
        imageCount: buildResult.imageCount,
        blobSizeBytes: 0,
        generatedAt: new Date().toISOString(),
        skillResourceAvailable,
        skillResourcePath: SLIDES_SKILL_PATH,
        warnings,
        error: buildResult.error || 'PPT 预生成失败',
      };
    }
    console.log(
      `[Slides Engine] Step D completed: deck built (slides=${buildResult.slideCount}, images=${buildResult.imageCount}, bytes=${buildResult.buffer.length})`
    );

    if (options.mode === 'slides') {
      warnings.push('当前 slides 模式已接入触发与封装层，底层仍使用项目内 PptxGenJS builder');
    }

    let artifactPath: string | undefined;
    let artifactDir: string | undefined;
    let renderedSlidePaths: string[] | undefined;
    if (options.persistArtifact || options.mode === 'slides') {
      artifactDir = await mkdtemp(resolve(tmpdir(), 'share-report-slides-'));
      artifactPath = resolve(artifactDir, 'preflight-deck.pptx');
      await writeFile(artifactPath, buildResult.buffer);

      if (options.mode === 'slides') {
        try {
          renderedSlidePaths = await renderSlidesArtifact(artifactPath, artifactDir);
        } catch (error) {
          warnings.push(
            `slides 实际渲染失败，已保留 deck 产物：${error instanceof Error ? error.message : '未知错误'}`
          );
        }
      }
    }

    return {
      success: true,
      mode: options.mode,
      slideCount: buildResult.slideCount,
      imageCount: buildResult.imageCount,
      blobSizeBytes: buildResult.buffer.length,
      generatedAt: new Date().toISOString(),
      skillResourceAvailable,
      skillResourcePath: SLIDES_SKILL_PATH,
      warnings,
      artifactPath,
      artifactDir,
      renderedSlidePaths,
    };
  } catch (error) {
    return {
      success: false,
      mode: options.mode,
      slideCount: outline.slides.length,
      imageCount: 0,
      blobSizeBytes: 0,
      generatedAt: new Date().toISOString(),
      skillResourceAvailable,
      skillResourcePath: SLIDES_SKILL_PATH,
      warnings,
      error: error instanceof Error ? error.message : 'PPT 预生成失败',
    };
  }
}
