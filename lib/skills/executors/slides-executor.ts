/**
 * Slides skill 执行器
 *
 * @module lib/skills/executors/slides-executor
 */

import type { PPTOutlineContent } from '@/lib/types/ppt-outline';
import {
  runSlidesPreflight,
  type SlidesEngineMode,
  type SlidesPreflightResult,
} from '@/lib/services/slides-engine';
import { validateSlidesArtifact } from './slides-validator';

export interface SlidesSkillInput {
  outline: PPTOutlineContent;
  mode: SlidesEngineMode;
  includeImages?: boolean;
  validateLayout?: boolean;
}

export interface SlidesSkillResult {
  success: boolean;
  mode: SlidesEngineMode;
  slideCount: number;
  imageCount: number;
  blobSizeBytes: number;
  generatedAt: string;
  skillResourceAvailable: boolean;
  skillResourcePath: string;
  warnings: string[];
  validation: {
    enabled: boolean;
    executed: boolean;
    warnings: string[];
  };
  artifactPath?: string;
  artifactDir?: string;
  renderedSlidePaths?: string[];
  error?: string;
}

export async function executeSlidesSkill(
  input: SlidesSkillInput
): Promise<SlidesSkillResult> {
  const preflight: SlidesPreflightResult = await runSlidesPreflight(input.outline, {
    mode: input.mode,
    includeImages: input.includeImages,
    enableGemini: false,
    persistArtifact: input.validateLayout === true || input.mode === 'slides',
  });

  const validation = await validateSlidesArtifact({
    enabled: input.validateLayout,
    pptxPath: preflight.artifactPath,
  });

  return {
    success: preflight.success,
    mode: preflight.mode,
    slideCount: preflight.slideCount,
    imageCount: preflight.imageCount,
    blobSizeBytes: preflight.blobSizeBytes,
    generatedAt: preflight.generatedAt,
    skillResourceAvailable: preflight.skillResourceAvailable,
    skillResourcePath: preflight.skillResourcePath,
    warnings: [...preflight.warnings, ...validation.warnings],
    validation,
    artifactPath: preflight.artifactPath,
    artifactDir: preflight.artifactDir,
    renderedSlidePaths: preflight.renderedSlidePaths,
    error: preflight.error,
  };
}
