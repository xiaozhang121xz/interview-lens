/**
 * 分享报告 Agent
 *
 * @module lib/agent/share-report-agent
 */

import { getAIClient } from '@/lib/ai/client';
import type { PPTOutlineContent } from '@/lib/types/ppt-outline';
import type { ShareReportAgentAction } from './types';
import {
  buildShareReportAgentSystemPrompt,
  buildShareReportAgentUserPrompt,
} from '@/lib/skills/prompts/share-report-agent';

export async function runShareReportAgent(input: {
  interviewId: string;
  generationType: 'template' | 'llm';
  requestedEngine: 'native' | 'slides' | 'auto';
  outline: PPTOutlineContent;
}): Promise<ShareReportAgentAction> {
  if (input.requestedEngine === 'native') {
    return {
      action: 'invoke_skill',
      skill: 'slides',
      payload: {
        mode: 'native',
        includeImages: true,
        validateLayout: false,
      },
      reason: '请求已明确指定 native 引擎',
      source: 'rule',
      warnings: [],
    };
  }

  if (input.requestedEngine === 'slides') {
    return {
      action: 'invoke_skill',
      skill: 'slides',
      payload: {
        mode: 'slides',
        includeImages: true,
        validateLayout: true,
      },
      reason: '请求已明确指定 slides 引擎',
      source: 'rule',
      warnings: [],
    };
  }

  const aiClient = getAIClient();
  if (!aiClient.isConfigured()) {
    return {
      action: 'skip',
      reason: 'AI 服务未配置，auto 模式下跳过 skill 调用',
      source: 'fallback',
      warnings: ['ANTHROPIC_API_KEY 未配置，share-report agent 已跳过'],
    };
  }

  const response = await aiClient.generateCompletion(
    buildShareReportAgentSystemPrompt(),
    [
      {
        role: 'user',
        content: buildShareReportAgentUserPrompt(input),
      },
    ],
    {
      maxTokens: 500,
      temperature: 0.1,
    }
  );

  if (!response.success) {
    return {
      action: 'skip',
      reason: response.error || 'Agent 决策失败，已跳过 skill 调用',
      source: 'fallback',
      warnings: ['share-report agent 调用失败，已跳过 skill 执行'],
    };
  }

  try {
    return normalizeAgentAction(parseAgentResponse(response.content));
  } catch {
    return {
      action: 'skip',
      reason: 'Agent 返回格式不符合预期，已跳过 skill 调用',
      source: 'fallback',
      warnings: ['share-report agent 返回非 JSON，已跳过'],
    };
  }
}

function parseAgentResponse(content: string): Record<string, unknown> {
  const trimmed = content.trim();
  const match = trimmed.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error('No JSON found');
  }
  return JSON.parse(match[0]) as Record<string, unknown>;
}

function normalizeAgentAction(raw: Record<string, unknown>): ShareReportAgentAction {
  if (
    raw.action === 'invoke_skill' &&
    raw.skill === 'slides' &&
    typeof raw.reason === 'string'
  ) {
    const payload = typeof raw.payload === 'object' && raw.payload
      ? raw.payload as Record<string, unknown>
      : {};

    return {
      action: 'invoke_skill',
      skill: 'slides',
      payload: {
        mode: payload.mode === 'slides' ? 'slides' : 'native',
        includeImages: payload.includeImages !== false,
        validateLayout: payload.validateLayout === true,
      },
      reason: raw.reason,
      source: 'llm',
      warnings: [],
    };
  }

  return {
    action: 'skip',
    reason: typeof raw.reason === 'string' ? raw.reason : 'Agent 判定无需调用 skill',
    source: 'llm',
    warnings: [],
  };
}
