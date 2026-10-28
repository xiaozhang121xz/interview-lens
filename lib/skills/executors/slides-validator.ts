/**
 * Slides 校验器
 *
 * 复用 slides skill 自带脚本：
 * - render_slides.py
 * - slides_test.py
 * - detect_font.py
 *
 * 运行策略：
 * - 能执行则返回真实校验结果
 * - 依赖缺失时降级为 warning，不阻断分享报告创建
 *
 * @module lib/skills/executors/slides-validator
 */

import { existsSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const SLIDES_SKILL_ROOT = resolve(process.cwd(), '.claude/skills/slides/slides');
const RENDER_SCRIPT = resolve(SLIDES_SKILL_ROOT, 'scripts/render_slides.py');
const OVERFLOW_SCRIPT = resolve(SLIDES_SKILL_ROOT, 'scripts/slides_test.py');
const FONT_SCRIPT = resolve(SLIDES_SKILL_ROOT, 'scripts/detect_font.py');

export interface SlidesValidationOptions {
  enabled?: boolean;
  pptxPath?: string;
}

export interface SlidesValidationResult {
  enabled: boolean;
  executed: boolean;
  warnings: string[];
  renderSucceeded?: boolean;
  overflowSlides?: number[];
  fontIssues?: {
    missingOverall: string[];
    substitutedOverall: string[];
  };
}

export async function validateSlidesArtifact(
  options: SlidesValidationOptions = {}
): Promise<SlidesValidationResult> {
  if (!options.enabled) {
    return {
      enabled: false,
      executed: false,
      warnings: [],
    };
  }

  if (!options.pptxPath) {
    return {
      enabled: true,
      executed: false,
      warnings: ['未提供 PPTX 临时文件路径，slides 校验已跳过'],
    };
  }

  if (!existsSync(options.pptxPath)) {
    return {
      enabled: true,
      executed: false,
      warnings: ['PPTX 临时文件不存在，slides 校验已跳过'],
    };
  }

  const warnings: string[] = [];
  let executed = false;
  let renderSucceeded = false;
  let overflowSlides: number[] = [];
  let fontIssues = {
    missingOverall: [] as string[],
    substitutedOverall: [] as string[],
  };

  const renderDir = await mkdtemp(resolve(tmpdir(), 'slides-render-'));

  try {
    if (existsSync(RENDER_SCRIPT)) {
      const renderResult = await runPythonScript(RENDER_SCRIPT, [
        options.pptxPath,
        '--output_dir',
        renderDir,
      ]);
      executed = executed || renderResult.executed;
      renderSucceeded = renderResult.success;
      if (!renderResult.success) {
        warnings.push(`slides 渲染检查未通过：${renderResult.message}`);
      }
    } else {
      warnings.push('render_slides.py 不存在，已跳过渲染检查');
    }

    if (existsSync(OVERFLOW_SCRIPT)) {
      const overflowResult = await runPythonScript(OVERFLOW_SCRIPT, [options.pptxPath]);
      executed = executed || overflowResult.executed;
      if (overflowResult.success) {
        overflowSlides = parseOverflowSlides(overflowResult.stdout);
        if (overflowSlides.length > 0) {
          warnings.push(`检测到页面越界风险：第 ${overflowSlides.join('、')} 页`);
        }
      } else {
        warnings.push(`slides 越界检查未通过：${overflowResult.message}`);
      }
    } else {
      warnings.push('slides_test.py 不存在，已跳过越界检查');
    }

    if (existsSync(FONT_SCRIPT)) {
      const fontResult = await runPythonScript(FONT_SCRIPT, [options.pptxPath, '--json']);
      executed = executed || fontResult.executed;
      if (fontResult.success) {
        fontIssues = parseFontIssues(fontResult.stdout);
        if (fontIssues.missingOverall.length > 0) {
          warnings.push(`检测到缺失字体：${fontIssues.missingOverall.join('、')}`);
        }
        if (fontIssues.substitutedOverall.length > 0) {
          warnings.push(`检测到字体替换：${fontIssues.substitutedOverall.join('、')}`);
        }
      } else {
        warnings.push(`slides 字体检查未通过：${fontResult.message}`);
      }
    } else {
      warnings.push('detect_font.py 不存在，已跳过字体检查');
    }

    return {
      enabled: true,
      executed,
      warnings,
      renderSucceeded,
      overflowSlides,
      fontIssues,
    };
  } finally {
    await rm(renderDir, { recursive: true, force: true });
  }
}

async function runPythonScript(
  scriptPath: string,
  args: string[]
): Promise<{
  executed: boolean;
  success: boolean;
  stdout: string;
  stderr: string;
  message: string;
}> {
  try {
    const { stdout, stderr } = await execFileAsync('python3', [scriptPath, ...args], {
      cwd: process.cwd(),
      maxBuffer: 10 * 1024 * 1024,
    });

    return {
      executed: true,
      success: true,
      stdout,
      stderr,
      message: 'ok',
    };
  } catch (error) {
    const execError = error as {
      stdout?: string;
      stderr?: string;
      message?: string;
      code?: string | number;
    };

    const stderr = execError.stderr || '';
    const stdout = execError.stdout || '';
    const message = stderr.trim() || stdout.trim() || execError.message || '执行失败';

    return {
      executed: true,
      success: false,
      stdout,
      stderr,
      message,
    };
  }
}

function parseOverflowSlides(stdout: string): number[] {
  if (!stdout.includes('overflowing original canvas')) {
    return [];
  }

  const match = stdout.match(/indexing\):\s*([0-9,\s]+)/);
  if (!match) {
    return [];
  }

  return match[1]
    .split(',')
    .map((item) => Number(item.trim()))
    .filter((num) => Number.isInteger(num) && num > 0);
}

function parseFontIssues(stdout: string): {
  missingOverall: string[];
  substitutedOverall: string[];
} {
  try {
    const parsed = JSON.parse(stdout) as {
      font_missing_overall?: string[];
      font_substituted_overall?: string[];
    };

    return {
      missingOverall: Array.isArray(parsed.font_missing_overall)
        ? parsed.font_missing_overall.map(String)
        : [],
      substitutedOverall: Array.isArray(parsed.font_substituted_overall)
        ? parsed.font_substituted_overall.map(String)
        : [],
    };
  } catch {
    return {
      missingOverall: [],
      substitutedOverall: [],
    };
  }
}
