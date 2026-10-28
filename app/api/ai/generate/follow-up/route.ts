/**
 * AI追问推荐 API
 *
 * @module app/api/ai/generate/follow-up/route
 * @description 根据当前问题和客户回答，AI推荐追问问题
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAIClient } from '@/lib/ai/client';
import { verifyToken } from '@/lib/auth';
import prisma from '@/lib/db/prisma';
import {
  generateFollowUpSchema,
  followUpResponseSchema,
  type GenerateFollowUpInput,
  type FollowUpResponse,
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

const FOLLOW_UP_SYSTEM_PROMPT = `你是一位资深的客户访谈专家，擅长根据对话内容深入挖掘关键信息。

你的任务是：
1. 分析对话内容，理解当前讨论的话题
2. 识别潜在的关注点和痛点
3. 生成3-5个高质量的追问问题

输出要求：
- 输出必须是有效的JSON格式
- 不要包含任何其他解释或说明
- 严格按照指定的JSON结构输出

输出JSON结构：
{
  "questions": [
    "追问问题1",
    "追问问题2",
    "追问问题3"
  ]
}

追问设计原则：
- 问题要有针对性和深度
- 避免简单的是/否问题
- 关注客户的真实需求和痛点
- 问题之间要有逻辑递进
- 保持中立，避免引导性
- 如果有明确的当前问题，追问应该围绕该问题展开
- 如果没有明确的当前问题，根据对话内容推断讨论主题并生成相关追问`;

// ============================================
// POST - 生成追问问题
// ============================================

/**
 * @swagger
 * /api/ai/generate/follow-up:
 *   post:
 *     summary: AI生成追问问题
 *     description: 根据当前问题和客户回答，AI智能推荐3-5个追问问题，帮助深入挖掘客户需求。
 *     tags: [AI]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - interviewId
 *               - currentQuestion
 *             properties:
 *               interviewId:
 *                 type: string
 *                 description: 访谈项目ID
 *               currentQuestion:
 *                 type: string
 *                 description: 当前问题内容
 *                 example: "请介绍一下您当前的业务流程是怎样的？"
 *               customerResponse:
 *                 type: string
 *                 description: 客户的回答内容
 *                 example: "目前我们的审批流程需要3-5个工作日..."
 *               context:
 *                 type: string
 *                 description: 补充上下文信息
 *     responses:
 *       200:
 *         description: 追问问题生成成功
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
 *                     questions:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: 推荐的追问问题列表
 *                       example:
 *                         - "审批流程中最大的瓶颈是什么？"
 *                         - "有没有考虑过自动化审批？"
 *                 message:
 *                   type: string
 *                   example: "追问问题生成成功"
 *       400:
 *         description: 请求参数验证失败
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
    const body: GenerateFollowUpInput = await request.json();

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
    const validationResult = generateFollowUpSchema.safeParse(body);
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

    const { interviewId, currentQuestion, customerResponse, context, transcriptHistory, outlineProgress } = validationResult.data;

    // 验证访谈项目存在且属于当前用户
    const interview = await prisma.interviewProject.findFirst({
      where: {
        id: interviewId,
        userId,
      },
      include: {
        customer: true,
        outlines: {
          where: { status: 'pending' },
          take: 5,
          orderBy: { order: 'asc' },
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

    // 构建对话历史部分
    const historySection = transcriptHistory && transcriptHistory.length > 0
      ? `## 已有对话记录（共 ${transcriptHistory.length} 条）
${transcriptHistory.map((item, idx) => `${idx + 1}. ${item.text}`).join('\n')}`
      : '';

    // 构建提纲进度部分
    const progressSection = outlineProgress
      ? `## 提纲进度
- 已完成问题：${outlineProgress.asked}/${outlineProgress.total}
- 待问问题：${outlineProgress.pending} 个`
      : '';

    // 构建当前问题部分（currentQuestion 可能不存在）
    const currentQuestionSection = currentQuestion
      ? `## 当前问题
${currentQuestion}`
      : '';

    // 检查是否有足够的对话内容生成追问
    const hasTranscriptContent = (transcriptHistory && transcriptHistory.length > 0) || customerResponse;
    if (!hasTranscriptContent && !currentQuestion) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          message: '请先进行对话，有了转写内容后再生成追问',
        },
        { status: 400 }
      );
    }

    // 构建用户提示词
    const userPrompt = `## 访谈背景
- 访谈主题：${interview.title}
- 访谈目标：${interview.objective || '未设定'}
- 客户：${interview.customer?.name || '未知'}
- 客户行业：${interview.customer?.industry || '未知'}

${progressSection}

${currentQuestionSection}

## 客户回答/对话内容
${customerResponse || '（根据对话记录分析）'}

${historySection}

${context ? `## 补充上下文\n${context}` : ''}

${interview.outlines.length > 0 ? `## 待问问题\n${interview.outlines.map((o, i) => `${i + 1}. ${o.question}`).join('\n')}` : ''}

请根据以上信息，生成3-5个追问问题，输出JSON格式。`;

    // 调用AI服务
    const aiClient = getAIClient();
    const response = await aiClient.generateCompletion(FOLLOW_UP_SYSTEM_PROMPT, [
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
    let followUpData: FollowUpResponse;
    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('AI返回的内容不包含有效的JSON');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      followUpData = followUpResponseSchema.parse(parsed);
    } catch (parseError) {
      console.error('[AI Follow-up] JSON解析失败:', parseError);
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

    return NextResponse.json<ApiResponse<FollowUpResponse>>(
      {
        success: true,
        data: followUpData,
        message: '追问问题生成成功',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[AI Follow-up API] 服务器错误:', error);

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