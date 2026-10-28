/**
 * AI阶段总结 API
 *
 * @module app/api/ai/analyze/stage-summary/route
 * @description 访谈进行中的阶段性总结，帮助访谈者把握方向
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAIClient } from '@/lib/ai/client';
import { verifyToken } from '@/lib/auth';
import prisma from '@/lib/db/prisma';
import {
  generateStageSummarySchema,
  stageSummaryResponseSchema,
  type GenerateStageSummaryInput,
  type StageSummaryResponse,
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

const STAGE_SUMMARY_SYSTEM_PROMPT = `你是一位资深的客户访谈分析专家，擅长从访谈内容中快速提炼关键信息。

你的任务是：
1. 分析当前阶段的访谈内容
2. 提炼关键发现和洞察
3. 识别痛点和需求
4. 给出后续访谈建议

输出要求：
- 输出必须是有效的JSON格式
- 不要包含任何其他解释或说明
- 严格按照指定的JSON结构输出

输出JSON结构：
{
  "summary": "当前阶段的总结（2-3句话）",
  "keyFindings": ["关键发现1", "关键发现2"],
  "painPoints": ["发现的痛点1", "发现的痛点2"],
  "requirements": ["识别的需求1", "识别的需求2"],
  "suggestions": ["建议追问方向1", "建议追问方向2"]
}

分析原则：
- 关注客户的核心关注点
- 识别潜在的问题和机会
- 给出有针对性的后续建议
- 保持简洁，突出重点`;

// ============================================
// POST - 生成阶段总结
// ============================================

/**
 * @swagger
 * /api/ai/analyze/stage-summary:
 *   post:
 *     summary: AI生成阶段总结
 *     description: 分析当前阶段的访谈内容，生成关键发现、痛点、需求和后续建议。
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
 *               currentTranscripts:
 *                 type: array
 *                 description: 当前对话内容（可选，不传则从数据库获取）
 *                 items:
 *                   type: object
 *                   properties:
 *                     text:
 *                       type: string
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *     responses:
 *       200:
 *         description: 阶段总结生成成功
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
 *                       description: 当前阶段总结
 *                     keyFindings:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: 关键发现
 *                     painPoints:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: 发现的痛点
 *                     requirements:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: 识别的需求
 *                     suggestions:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: 后续建议
 *       400:
 *         description: 请求参数验证失败
 *       401:
 *         description: 未授权访问
 *       404:
 *         description: 访谈项目不存在或无权访问
 *       500:
 *         description: AI服务配置错误或服务器内部错误
 */
export async function POST(request: NextRequest) {
  try {
    // 解析请求体
    const body: GenerateStageSummaryInput = await request.json();

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
    const validationResult = generateStageSummarySchema.safeParse(body);
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

    const { interviewId, currentTranscripts } = validationResult.data;

    // 验证访谈项目存在且属于当前用户
    const interview = await prisma.interviewProject.findFirst({
      where: {
        id: interviewId,
        userId,
      },
      include: {
        customer: true,
        outlines: {
          orderBy: { order: 'asc' },
        },
        records: {
          where: { type: 'pain_point' },
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!interview) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          message: '访谈项目不存在或无权访问',
        },
        { status: 404 }
      );
    }

    // 获取对话内容
    let transcriptsToAnalyze = currentTranscripts;

    // 如果没有传入对话内容，从数据库获取
    if (!transcriptsToAnalyze || transcriptsToAnalyze.length === 0) {
      const dbTranscripts = await prisma.realtimeTranscript.findMany({
        where: { projectId: interviewId },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });
      transcriptsToAnalyze = dbTranscripts.map((t) => ({
        text: t.content,
        timestamp: t.createdAt.toISOString(),
      }));
    }

    // 如果没有对话内容，返回空总结
    if (!transcriptsToAnalyze || transcriptsToAnalyze.length === 0) {
      return NextResponse.json<ApiResponse<StageSummaryResponse>>(
        {
          success: true,
          data: {
            summary: '暂无访谈内容，开始访谈后将自动生成阶段总结。',
            keyFindings: [],
            painPoints: [],
            requirements: [],
            suggestions: ['点击"开始访谈"按钮开始录音'],
          },
        },
        { status: 200 }
      );
    }

    // 计算提纲进度
    const outlineProgress = {
      total: interview.outlines.length,
      asked: interview.outlines.filter((o) => o.status === 'asked').length,
      pending: interview.outlines.filter((o) => o.status === 'pending').length,
    };

    // 构建用户提示词
    const userPrompt = `## 访谈背景
- 访谈主题：${interview.title}
- 访谈目标：${interview.objective || '未设定'}
- 客户：${interview.customer?.name || '未知'}
- 客户行业：${interview.customer?.industry || '未知'}

## 提纲进度
- 总问题数：${outlineProgress.total}
- 已完成：${outlineProgress.asked}
- 待问：${outlineProgress.pending}

## 当前对话内容
${transcriptsToAnalyze.map((t, i) => `${i + 1}. ${t.text}`).join('\n')}

${interview.records.length > 0 ? `## 已记录的痛点\n${interview.records.map((r) => `- ${r.content}`).join('\n')}` : ''}

请根据以上信息，生成当前阶段的总结分析，输出JSON格式。`;

    // 调用AI服务
    const aiClient = getAIClient();
    const response = await aiClient.generateCompletion(STAGE_SUMMARY_SYSTEM_PROMPT, [
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
    let summaryData: StageSummaryResponse;
    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('AI返回的内容不包含有效的JSON');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      summaryData = stageSummaryResponseSchema.parse(parsed);
    } catch (parseError) {
      console.error('[AI Stage Summary] JSON解析失败:', parseError);
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

    return NextResponse.json<ApiResponse<StageSummaryResponse>>(
      {
        success: true,
        data: summaryData,
        message: '阶段总结生成成功',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[AI Stage Summary API] 服务器错误:', error);

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