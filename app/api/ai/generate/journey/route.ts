/**
 * AI生成用户旅程图 API
 *
 * @module app/api/ai/generate/journey/route
 * @description 根据访谈记录，AI自动生成用户旅程图(User Journey Map)
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAIClient } from '@/lib/ai/client';
import { verifyToken } from '@/lib/auth';
import prisma from '@/lib/db/prisma';
import { buildInterviewEvidence } from '@/lib/ai/interview-evidence';
import { RESULT_JOURNEY_SYSTEM_PROMPT } from '@/lib/ai/prompts/interview-results';
import { validateJourneyQuality } from '@/lib/ai/result-quality';
import { repairStructuredResult } from '@/lib/ai/structured-result';
import {
  generateJourneyMapSchema,
  journeyMapResponseSchema,
  type GenerateJourneyMapInput,
  type JourneyMapResponse,
} from '@/lib/validations/ai';

// ============================================
// 类型定义
// ============================================

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
  };
  errors?: z.ZodIssue[];
}

// ============================================
// 辅助函数
// ============================================

/**
 * 从请求中获取当前用户ID
 */
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

/**
 * 从请求头或请求体获取用户ID
 */
async function extractUserId(
  request: NextRequest,
  body?: Record<string, unknown>
): Promise<string> {
  const headerUserId = await getCurrentUserId(request);
  if (headerUserId) {
    return headerUserId;
  }

  // 尝试从 X-User-Id header 获取（前端备用方案）
  const xUserId = request.headers.get('X-User-Id');
  if (xUserId) {
    return xUserId;
  }

  if (body && typeof body.userId === 'string') {
    return body.userId;
  }

  throw new Error('UNAUTHORIZED');
}

// ============================================
// 系统提示词
// ============================================

// ============================================
// POST - 生成用户旅程图
// ============================================

/**
 * @swagger
 * /api/ai/generate/journey:
 *   post:
 *     summary: AI生成用户旅程图
 *     description: 根据访谈记录和AI洞察分析，AI自动生成用户旅程图(User Journey Map)，包含阶段、行为、情绪、痛点和机会点。结果会保存到数据库。
 *     tags: [AI]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - interviewId
 *             properties:
 *               interviewId:
 *                 type: string
 *                 description: 访谈项目ID
 *     responses:
 *       200:
 *         description: 用户旅程图生成成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: 保存的旅程图ID
 *                     title:
 *                       type: string
 *                       description: 旅程图标题
 *                     stages:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                           description:
 *                             type: string
 *                     actions:
 *                       type: array
 *                       items:
 *                         type: object
 *                     emotions:
 *                       type: array
 *                       items:
 *                         type: object
 *                     painPoints:
 *                       type: array
 *                       items:
 *                         type: object
 *                     opportunities:
 *                       type: array
 *                       items:
 *                         type: object
 *                 message:
 *                   type: string
 *                   example: "用户旅程图生成成功"
 *       400:
 *         description: 请求参数验证失败或访谈无记录
 *       401:
 *         description: 未授权访问
 *       404:
 *         description: 访谈项目不存在或无权访问
 *       429:
 *         description: AI服务限流
 *       500:
 *         description: AI服务配置错误或服务器内部错误
 *       503:
 *         description: AI服务不可用
 */
export async function POST(request: NextRequest) {
  try {
    // 解析请求体
    const body: GenerateJourneyMapInput = await request.json();

    // 获取用户ID
    let userId: string;
    try {
      userId = await extractUserId(request, body);
    } catch {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          message: '未授权访问，请先登录',
        },
        { status: 401 }
      );
    }

    // 验证请求体
    const validationResult = generateJourneyMapSchema.safeParse(body);
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

    const { interviewId } = validationResult.data;

    // 并行获取访谈信息和记录
    const [interview, records, transcripts, insights, personas] = await Promise.all([
      prisma.interviewProject.findFirst({
        where: {
          id: interviewId,
          userId,
        },
        include: {
          customer: true,
        },
      }),
      prisma.interviewRecord.findMany({
        where: {
          projectId: interviewId,
        },
        orderBy: {
          createdAt: 'asc',
        },
      }),
      prisma.realtimeTranscript.findMany({
        where: { projectId: interviewId },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.aIInsight.findMany({
        where: {
          projectId: interviewId,
        },
      }),
      prisma.userPersona.findMany({
        where: {
          projectId: interviewId,
        },
      }),
    ]);

    if (!interview) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          message: '访谈项目不存在或无权访问',
        },
        { status: 404 }
      );
    }

    if (records.length === 0 && transcripts.length === 0) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          message: '该访谈暂无记录，无法生成用户旅程图',
        },
        { status: 400 }
      );
    }

    const evidence = buildInterviewEvidence(records, transcripts);

    // 格式化AI洞察
    const formattedInsights = insights
      .map((insight) => {
        const typeLabel: Record<string, string> = {
          summary: '【总结】',
          pain_point: '【痛点】',
          requirement: '【需求】',
          risk: '【风险】',
        };
        return `${typeLabel[insight.type] || '【洞察】'} ${insight.content}`;
      })
      .join('\n');

    // 格式化用户画像
    const formattedPersonas = personas
      .map((persona) => {
        let personaInfo = `**用户画像: ${persona.name}**\n`;
        personaInfo += `- 角色: ${persona.role}\n`;
        if (persona.demographics) {
          try {
            const demo = JSON.parse(persona.demographics);
            personaInfo += `- 人口统计: ${JSON.stringify(demo)}\n`;
          } catch {
            // ignore
          }
        }
        if (persona.goals) {
          try {
            const goals = JSON.parse(persona.goals);
            personaInfo += `- 目标: ${goals.join(', ')}\n`;
          } catch {
            // ignore
          }
        }
        if (persona.painPoints) {
          try {
            const pains = JSON.parse(persona.painPoints);
            personaInfo += `- 痛点: ${pains.join(', ')}\n`;
          } catch {
            // ignore
          }
        }
        return personaInfo;
      })
      .join('\n');

    // 构建用户提示词
    const userPrompt = `## 访谈信息
- 访谈主题：${interview.title}
- 访谈目标：${interview.objective || '未设定'}
- 客户：${interview.customer?.name || '未知'}
- 行业：${interview.customer?.industry || '未知'}

## 用户画像
${formattedPersonas || '暂无用户画像'}

## AI洞察分析
${formattedInsights || '暂无AI分析'}

## 访谈记录
${evidence.text}

请根据以上访谈信息，生成一个完整的用户旅程图，输出JSON格式。`;

    // 调用AI服务
    const aiClient = getAIClient();
    const response = await aiClient.generateCompletion(RESULT_JOURNEY_SYSTEM_PROMPT, [
      { role: 'user', content: userPrompt },
    ]);

    // 处理AI响应
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

    // 解析AI返回的JSON
    let journeyMapData: JourneyMapResponse;
    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('AI返回的内容不包含有效的JSON');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      journeyMapData = await repairStructuredResult({
        aiClient,
        systemPrompt: RESULT_JOURNEY_SYSTEM_PROMPT,
        userPrompt,
        initialContent: response.content,
        initialValue: parsed,
        schema: journeyMapResponseSchema,
        validateQuality: validateJourneyQuality,
        maxTokens: 4000,
      });
    } catch (parseError) {
      console.error('[AI Journey Map] JSON解析失败:', parseError);
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

    // 保存用户旅程图到数据库
    const savedJourneyMap = await prisma.userJourneyMap.create({
      data: {
        title: journeyMapData.title,
        stages: JSON.stringify(journeyMapData.stages),
        actions: journeyMapData.actions ? JSON.stringify(journeyMapData.actions) : null,
        emotions: journeyMapData.emotions ? JSON.stringify(journeyMapData.emotions) : null,
        painPoints: journeyMapData.painPoints ? JSON.stringify(journeyMapData.painPoints) : null,
        opportunities: journeyMapData.opportunities
          ? JSON.stringify(journeyMapData.opportunities)
          : null,
        projectId: interviewId,
      },
    });

    return NextResponse.json<ApiResponse<JourneyMapResponse & { id: string }>>(
      {
        success: true,
        data: {
          ...journeyMapData,
          id: savedJourneyMap.id,
        },
        message: '用户旅程图生成成功',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[AI Journey Map API] 服务器错误:', error);

    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          message: '未授权访问',
        },
        { status: 401 }
      );
    }

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
