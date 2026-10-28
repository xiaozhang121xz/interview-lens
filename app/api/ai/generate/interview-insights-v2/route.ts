/**
 * AI生成访谈分析报告 API（V2）
 *
 * @module app/api/ai/generate/interview-insights-v2/route
 * @description 根据客户信息和访谈目标，生成更偏“访谈准备卡”的分析报告
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAIClient } from '@/lib/ai/client';
import { verifyToken } from '@/lib/auth';
import prisma from '@/lib/db/prisma';
import {
  generateInsightReportSchema,
  insightReportV2ResponseSchema,
  type GenerateInsightReportInput,
  type InsightReportV2Response,
} from '@/lib/validations/ai';
import { wrapInsightReport } from '@/lib/utils/insight-report';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
  };
  errors?: z.ZodIssue[];
  reportId?: string;
  isOverwrite?: boolean;
}

async function getCurrentUserId(request: NextRequest): Promise<string | null> {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7);
    const payload = await verifyToken(token);

    return payload?.id || null;
  } catch {
    return null;
  }
}

async function extractUserId(
  request: NextRequest,
  body?: Record<string, unknown>
): Promise<string | null> {
  const headerUserId = await getCurrentUserId(request);
  if (headerUserId) {
    return headerUserId;
  }

  const xUserId = request.headers.get('X-User-Id');
  if (xUserId) {
    return xUserId;
  }

  if (body && typeof body.userId === 'string') {
    return body.userId;
  }

  return null;
}

function getInsightV2SystemPrompt(focusAreas?: string[]): string {
  const focusInstruction =
    focusAreas && focusAreas.length > 0
      ? `\n请优先结合这些关注方向理解访谈重点：${focusAreas.join('、')}。`
      : '';

  return `你是一位“客户需求洞察助手”，你的职责不是写行业研究报告，也不是替用户下业务结论，而是帮助用户在访谈前理清思路，形成一张可执行的访谈准备卡。${focusInstruction}

你的任务是：
1. 先用清晰语言总结这次访谈最想搞清的事情
2. 区分“已知背景”和“仍待确认的问题”
3. 给出建议优先澄清的问题，帮助用户确定访谈重点
4. 输出合理但需验证的假设，并明确风险或信息缺口
5. 给出更适合真实沟通场景的切入方式

输出原则：
- 输出必须是有效JSON
- 以“访谈准备”而不是“行业结论”为中心
- 不要把推测当成事实
- 尽量少用武断判断，多使用“建议确认”“可能需要澄清”等表达
- 语言要清晰、实用、适合访谈前快速浏览

输出JSON结构：
{
  "interviewGoal": {
    "summary": "本次访谈目标概述",
    "keyObjectives": ["最想搞清的问题1", "最想搞清的问题2", "最想搞清的问题3"],
    "conversationDirection": "本次沟通更偏向的方向",
    "firstPriorityChecks": ["建议优先确认事项1", "建议优先确认事项2"]
  },
  "knownContext": {
    "knownFacts": ["当前已知事实1", "当前已知事实2"],
    "businessScene": "对当前业务场景的简要理解",
    "keyCharacteristics": ["关键特征1", "关键特征2"],
    "openQuestions": ["信息缺口1", "信息缺口2"]
  },
  "priorityClarifications": [
    {
      "question": "建议优先澄清的问题",
      "whyItMatters": "为什么这个问题重要",
      "suggestedFollowUp": "适合继续往下追问的方向"
    }
  ],
  "hypothesesAndRisks": [
    {
      "assumption": "当前合理但需验证的假设",
      "basis": "形成该假设的依据",
      "confidence": "high|medium|low",
      "riskOrGap": "对应的风险、敏感点或信息缺口"
    }
  ],
  "interviewApproach": {
    "recommendedOpening": "建议如何开场",
    "suggestedSequence": ["建议先聊什么", "再聊什么", "最后确认什么"],
    "communicationTips": ["沟通提醒1", "沟通提醒2"],
    "sensitiveTopics": ["不适合一开始直接问的话题1", "敏感点2"]
  }
}`;
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateInsightReportInput = await request.json();
    await extractUserId(request, body);

    const validationResult = generateInsightReportSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          message: '请求参数验证失败',
          errors: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const { customerInfo, objective, background, focusAreas } = validationResult.data;

    const customerBackgroundSection = customerInfo.background
      ? `\n\n## 客户公司背景\n${customerInfo.background}`
      : '';
    const contactBackgroundSection = customerInfo.contactBackground
      ? `\n\n## 联系人背景\n${customerInfo.contactBackground}`
      : '';
    const websiteSection = customerInfo.website ? `\n- 官网：${customerInfo.website}` : '';
    const notesSection = customerInfo.notes ? `\n\n## 历史备注\n${customerInfo.notes}` : '';

    const userPrompt = `请根据以下信息生成一份“访谈前准备卡”风格的分析报告：

## 客户信息
- 客户名称：${customerInfo.name}${customerInfo.industry ? `\n- 所属行业：${customerInfo.industry}` : ''}${websiteSection}
${customerInfo.description ? `- 公司描述：${customerInfo.description}` : ''}${customerBackgroundSection}${contactBackgroundSection}${notesSection}

## 访谈目标
${objective}

${background ? `## 访谈背景\n${background}` : ''}

${focusAreas && focusAreas.length > 0 ? `## 当前关注方向\n${focusAreas.map((area, i) => `${i + 1}. ${area}`).join('\n')}` : ''}

请输出一份更偏“访谈准备”的结构化分析报告，帮助访谈者快速知道这次应该先搞清什么、优先问什么、哪些点要谨慎处理。`;

    const aiClient = getAIClient();
    const response = await aiClient.generateCompletion(getInsightV2SystemPrompt(focusAreas), [
      { role: 'user', content: userPrompt },
    ]);

    if (!response.success) {
      const statusCode =
        response.errorType === 'rate_limit'
          ? 429
          : response.errorType === 'service_unavailable'
            ? 503
            : response.errorType === 'config_error'
              ? 500
              : 400;

      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          message: response.error || 'AI服务错误',
          error: {
            code: response.errorType || 'AI_ERROR',
            message: response.error || 'AI服务错误',
          },
        },
        { status: statusCode }
      );
    }

    let insightData: InsightReportV2Response;
    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('AI返回的内容不包含有效的JSON');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      insightData = insightReportV2ResponseSchema.parse(parsed);
    } catch (parseError) {
      console.error('[AI Interview Insights V2] JSON解析失败:', parseError);
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          message: 'AI返回的数据格式不正确',
          error: {
            code: 'PARSE_ERROR',
            message: 'AI返回的数据格式不正确，请重试',
          },
        },
        { status: 500 }
      );
    }

    let savedReportId: string | undefined;
    let storageWarning: string | undefined;
    let isOverwrite = false;

    if (validationResult.data.interviewId) {
      try {
        const { interviewId, overwrite = false } = validationResult.data;

        await prisma.$transaction(async (tx) => {
          if (overwrite) {
            const latestReport = await tx.interviewInsightReport.findFirst({
              where: { projectId: interviewId! },
              orderBy: { createdAt: 'desc' },
            });

            if (latestReport) {
              await tx.interviewInsightReport.delete({
                where: { id: latestReport.id },
              });
              isOverwrite = true;
            }
          }

          const savedReport = await tx.interviewInsightReport.create({
            data: {
              projectId: interviewId!,
              content: JSON.stringify(wrapInsightReport('v2', insightData)),
            },
          });

          savedReportId = savedReport.id;
        });
      } catch (saveError) {
        console.error('[AI Interview Insights V2] 保存到数据库失败:', saveError);
        storageWarning = '分析报告生成成功，但保存失败，下次访问时需要重新生成';
      }
    }

    return NextResponse.json<ApiResponse<InsightReportV2Response>>(
      {
        success: true,
        data: insightData,
        message: storageWarning || '访谈分析报告生成成功',
        reportId: savedReportId,
        isOverwrite,
        ...(storageWarning && { error: { code: 'STORAGE_WARNING', message: storageWarning } }),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[AI Interview Insights V2 API] 服务器错误:', error);

    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        message: '服务器内部错误',
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : '服务器内部错误',
        },
      },
      { status: 500 }
    );
  }
}
