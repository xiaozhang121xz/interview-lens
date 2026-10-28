/**
 * AI生成访谈纪要 API
 *
 * @module app/api/ai/generate/summary/route
 * @description 根据访谈记录，AI自动生成结构化的访谈纪要
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAIClient } from '@/lib/ai/client';
import { verifyToken } from '@/lib/auth';
import prisma from '@/lib/db/prisma';
import { buildInterviewEvidence } from '@/lib/ai/interview-evidence';
import { RESULT_SUMMARY_SYSTEM_PROMPT } from '@/lib/ai/prompts/interview-results';
import { validateSummaryQuality } from '@/lib/ai/result-quality';
import { repairStructuredResult } from '@/lib/ai/structured-result';
import {
  generateSummarySchema,
  summaryResponseSchema,
  type GenerateSummaryInput,
  type SummaryResponse,
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
// POST - 生成访谈纪要
// ============================================

/**
 * @swagger
 * /api/ai/generate/summary:
 *   post:
 *     summary: AI生成访谈纪要
 *     description: 根据访谈记录，AI自动生成结构化的访谈纪要，包括核心内容总结、痛点分析、需求整理和风险识别。结果会保存到数据库。
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
 *         description: 访谈纪要生成成功
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
 *                     summary:
 *                       type: string
 *                       description: 访谈核心内容总结
 *                     painPoints:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: 客户痛点列表
 *                     requirements:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: 客户需求列表
 *                     risks:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: 识别的风险列表
 *                 message:
 *                   type: string
 *                   example: "访谈纪要生成成功"
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
    const body: GenerateSummaryInput = await request.json();

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
    const validationResult = generateSummarySchema.safeParse(body);
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
    const [interview, records, transcripts] = await Promise.all([
      prisma.interviewProject.findFirst({
        where: {
          id: interviewId,
          userId,
        },
        include: {
          customer: true,
          outlines: {
            orderBy: { order: 'asc' },
          },
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
          message: '该访谈暂无记录，无法生成纪要',
        },
        { status: 400 }
      );
    }

    const evidence = buildInterviewEvidence(records, transcripts);

    // 构建用户提示词
    const userPrompt = `## 访谈信息
- 访谈主题：${interview.title}
- 访谈目标：${interview.objective || '未设定'}
- 客户：${interview.customer?.name || '未知'}
- 行业：${interview.customer?.industry || '未知'}

## 访谈提纲
${interview.outlines.map((o, i) => `${i + 1}. ${o.question}`).join('\n') || '无预设提纲'}

## 访谈记录
${evidence.text}

请根据以上访谈记录，生成结构化的访谈纪要，输出JSON格式。`;

    // 调用AI服务
    const aiClient = getAIClient();
    const response = await aiClient.generateCompletion(RESULT_SUMMARY_SYSTEM_PROMPT, [
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
    let summaryData: SummaryResponse;
    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('AI返回的内容不包含有效的JSON');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      summaryData = await repairStructuredResult({
        aiClient,
        systemPrompt: RESULT_SUMMARY_SYSTEM_PROMPT,
        userPrompt,
        initialContent: response.content,
        initialValue: parsed,
        schema: summaryResponseSchema,
        validateQuality: validateSummaryQuality,
        maxTokens: 3000,
      });
    } catch (parseError) {
      console.error('[AI Summary] JSON解析失败:', parseError);
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

    // 保存AI洞察到数据库
    await Promise.all([
      // 保存摘要
      prisma.aIInsight.create({
        data: {
          type: 'summary',
          content: summaryData.summary,
          projectId: interviewId,
        },
      }),
      ...summaryData.keyPoints.map((point) =>
        prisma.aIInsight.create({
          data: {
            type: 'key_point',
            content: point,
            projectId: interviewId,
          },
        })
      ),
      // 保存痛点
      ...summaryData.painPoints.map((point) =>
        prisma.aIInsight.create({
          data: {
            type: 'pain_point',
            content: point,
            projectId: interviewId,
          },
        })
      ),
      // 保存需求
      ...summaryData.requirements.map((req) =>
        prisma.aIInsight.create({
          data: {
            type: 'requirement',
            content: req,
            projectId: interviewId,
          },
        })
      ),
      // 保存风险
      ...summaryData.risks.map((risk) =>
        prisma.aIInsight.create({
          data: {
            type: 'risk',
            content: risk,
            projectId: interviewId,
          },
        })
      ),
      ...summaryData.nextSteps.map((step) =>
        prisma.aIInsight.create({
          data: {
            type: 'next_step',
            content: step,
            projectId: interviewId,
          },
        })
      ),
    ]);

    return NextResponse.json<ApiResponse<SummaryResponse>>(
      {
        success: true,
        data: summaryData,
        message: '访谈纪要生成成功',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[AI Summary API] 服务器错误:', error);

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
