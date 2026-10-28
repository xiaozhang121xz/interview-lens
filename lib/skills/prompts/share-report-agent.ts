/**
 * 分享报告 Agent Prompt
 *
 * @module lib/skills/prompts/share-report-agent
 */

import type { PPTOutlineContent } from '@/lib/types/ppt-outline';

export function buildShareReportAgentSystemPrompt(): string {
  return [
    '你是分享报告生成流程中的 skill 调度 agent。',
    '你的任务是在创建分享报告后，判断是否需要调用 skill registry 中的 slides。',
    '你只能输出 JSON，不要输出 Markdown，不要输出额外解释。',
    '可用 action 只有两种：invoke_skill 或 skip。',
    '当大纲页数完整、标题明确、每页要点较充分时，可以调用 slides。',
    '当 generationType=llm 且叙事较完整时，优先推荐 mode=slides。',
    'JSON 格式之一：',
    '{"action":"invoke_skill","skill":"slides","payload":{"mode":"native"|"slides","includeImages":true,"validateLayout":true|false},"reason":"中文原因"}',
    '{"action":"skip","reason":"中文原因"}',
    'reason 用中文且控制在 40 字以内。',
  ].join('\n');
}

export function buildShareReportAgentUserPrompt(input: {
  interviewId: string;
  generationType: 'template' | 'llm';
  requestedEngine: 'native' | 'slides' | 'auto';
  outline: PPTOutlineContent;
}): string {
  const outlineSummary = input.outline.slides.map((slide) => ({
    slideNumber: slide.slideNumber,
    title: slide.slideTitle,
    pointCount: slide.content.mainPoints.length,
    evidenceCount: slide.content.quoteEvidence?.length || 0,
    layout: slide.presentation?.layout || null,
  }));

  return JSON.stringify(
    {
      interviewId: input.interviewId,
      generationType: input.generationType,
      requestedEngine: input.requestedEngine,
      totalSlides: input.outline.slides.length,
      paletteName: input.outline.metadata.paletteName || null,
      outlineSummary,
    },
    null,
    2
  );
}
