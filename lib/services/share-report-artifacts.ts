import { access, copyFile, mkdir, readdir, readFile } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

export interface ShareReportSlidesArtifactManifest {
  reportId: string;
  source: 'slides-skill';
  mode: 'native' | 'slides';
  generatedAt: string;
  slideCount: number;
  hasDeck: boolean;
  hasRenderedSlides: boolean;
}

const SHARE_REPORT_ARTIFACT_ROOT = resolve(tmpdir(), 'talkagent-share-report-artifacts');

function getReportArtifactDir(reportId: string): string {
  return join(SHARE_REPORT_ARTIFACT_ROOT, reportId);
}

function getReportSlidesDir(reportId: string): string {
  return join(getReportArtifactDir(reportId), 'slides');
}

function getReportDeckPath(reportId: string): string {
  return join(getReportArtifactDir(reportId), 'deck.pptx');
}

export async function persistShareReportSlidesArtifacts(input: {
  reportId: string;
  mode: 'native' | 'slides';
  generatedAt: string;
  deckPath?: string;
  renderedSlidePaths?: string[];
}): Promise<ShareReportSlidesArtifactManifest> {
  console.log(`[ShareReport Artifacts] Step F: persisting artifacts (reportId=${input.reportId})`);
  const reportDir = getReportArtifactDir(input.reportId);
  const slidesDir = getReportSlidesDir(input.reportId);

  await mkdir(reportDir, { recursive: true });
  await mkdir(slidesDir, { recursive: true });

  let hasDeck = false;
  if (input.deckPath) {
    const targetDeckPath = getReportDeckPath(input.reportId);
    await copyFile(input.deckPath, targetDeckPath);
    hasDeck = true;
  }

  let slideCount = 0;
  if (input.renderedSlidePaths?.length) {
    const sorted = [...input.renderedSlidePaths].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    await Promise.all(sorted.map(async (sourcePath, index) => {
      const targetPath = join(slidesDir, `slide-${index + 1}.png`);
      await copyFile(sourcePath, targetPath);
    }));
    slideCount = sorted.length;
  }

  const manifest: ShareReportSlidesArtifactManifest = {
    reportId: input.reportId,
    source: 'slides-skill',
    mode: input.mode,
    generatedAt: input.generatedAt,
    slideCount,
    hasDeck,
    hasRenderedSlides: slideCount > 0,
  };
  console.log(
    `[ShareReport Artifacts] Step F completed: artifacts persisted (deck=${manifest.hasDeck}, renderedSlides=${manifest.slideCount})`
  );
  return manifest;
}

export async function hasShareReportDeckArtifact(reportId: string): Promise<boolean> {
  try {
    await access(getReportDeckPath(reportId), fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export async function readShareReportDeckArtifact(reportId: string): Promise<Buffer | null> {
  try {
    return await readFile(getReportDeckPath(reportId));
  } catch {
    return null;
  }
}

export async function readShareReportRenderedSlide(
  reportId: string,
  slideIndex: number
): Promise<Buffer | null> {
  try {
    const slidePath = join(getReportSlidesDir(reportId), `slide-${slideIndex}.png`);
    return await readFile(slidePath);
  } catch {
    return null;
  }
}

export async function listShareReportRenderedSlides(reportId: string): Promise<string[]> {
  try {
    const files = await readdir(getReportSlidesDir(reportId));
    return files
      .filter((file) => /^slide-\d+\.png$/i.test(file))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  } catch {
    return [];
  }
}
