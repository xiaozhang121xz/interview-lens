/**
 * Slides 触发决策服务
 *
 * 负责在分享报告创建阶段，让大模型判断是否值得触发 slides 预生成能力。
 *
 * @module lib/services/slides-decision
 */

import { getAIClient } from '@/lib/ai/client';
import type { PPTOutlineContent } from '@/lib/types/ppt-outline';

export type SlidesDecisionEngine = 'native' | 'slides' | 'auto';

export interface SlidesDecisionInput {
  interviewId: string;
  generationType: 'template' | 'llm';
  engine: SlidesDecisionEngine;
  outline: PPTOutlineContent;
}

export interface SlidesDecisionResult {
  shouldGenerate: boolean;
  recommendedEngine: 'native' | 'slides';
  reason: string;
  source: 'rule' | 'llm' | 'fallback';
  warnings: string[];
}

interface SlidesDecisionLLMResponse {
  shouldGenerate?: boolean;
  recommendedEngine?: 'native' | 'slides';
  reason?: string;
}

export async function decideSlidesGeneration(
  input: SlidesDecisionInput
): Promise<SlidesDecisionResult> {
  if (input.engine === 'native') {
    return {
      shouldGenerate: true,
      recommendedEngine: 'native',
      reason: '请求已明确指定 native 引擎，直接执行预生成',
      source: 'rule',
      warnings: [],
    };
  }

  if (input.engine === 'slides') {
    return {
      shouldGenerate: true,
      recommendedEngine: 'slides',
      reason: '请求已明确指定 slides 引擎，直接执行预生成',
      source: 'rule',
      warnings: [],
    };
  }

  const aiClient = getAIClient();
  if (!aiClient.isConfigured()) {
    return {
      shouldGenerate: false,
      recommendedEngine: 'native',
      reason: 'AI 服务未配置，auto 模式下跳过 PPT 预生成',
      source: 'fallback',
      warnings: ['ANTHROPIC_API_KEY 未配置，slides 自动决策已跳过'],
    };
  }

  const response = await aiClient.generateCompletion(
    buildSystemPrompt(),
    [
      {
        role: 'user',
        content: buildUserPrompt(input),
      },
    ],
    {
      maxTokens: 400,
      temperature: 0.1,
    }
  );

  if (!response.success) {
    return {
      shouldGenerate: false,
      recommendedEngine: 'native',
      reason: response.error || 'AI 决策失败，已跳过 PPT 预生成',
      source: 'fallback',
      warnings: ['slides 自动决策失败，已回退为不触发预生成'],
    };
  }

  try {
    const parsed = parseDecisionResponse(response.content);
    return {
      shouldGenerate: parsed.shouldGenerate ?? false,
      recommendedEngine: parsed.recommendedEngine === 'slides' ? 'slides' : 'native',
      reason: parsed.reason || '模型未提供原因说明',
      source: 'llm',
      warnings: [],
    };
  } catch {
    return {
      shouldGenerate: false,
      recommendedEngine: 'native',
      reason: '模型返回格式不符合预期，已跳过 PPT 预生成',
      source: 'fallback',
      warnings: ['slides 自动决策返回非 JSON，已跳过'],
    };
  }
}

function buildSystemPrompt(): string {
  return [
    '你是分享报告 PPT 触发决策器。',
    '你的任务是根据分享报告大纲质量与完整度，决定是否在创建阶段额外触发 slides 预生成。',
    '只输出 JSON，不要输出 Markdown，不要输出解释性前后缀。',
    'JSON 格式必须为：',
    '{"shouldGenerate": boolean, "recommendedEngine": "native" | "slides", "reason": string}',
    '决策原则：',
    '1. 当大纲页数完整、标题明确、内容点充分时，可返回 shouldGenerate=true。',
    '2. 当 generationType=llm，且页面叙事较完整时，优先推荐 slides。',
    '3. 当内容明显不完整、引用和要点过少时，返回 shouldGenerate=false。',
    '4. reason 用中文，控制在 40 字以内。',
  ].join('\n');
}

function buildUserPrompt(input: SlidesDecisionInput): string {
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
      requestedEngine: input.engine,
      totalSlides: input.outline.slides.length,
      paletteName: input.outline.metadata.paletteName || null,
      outlineSummary,
    },
    null,
    2
  );
}

function parseDecisionResponse(content: string): SlidesDecisionLLMResponse {
  const trimmed = content.trim();
  const match = trimmed.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error('No JSON found');
  }

  return JSON.parse(match[0]) as SlidesDecisionLLMResponse;
}
