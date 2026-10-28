/**
 * AI核心问题识别 API
 *
 * @module app/api/ai/analyze/key-points/route
 * @description 分析转写内容，识别核心问题（痛点、需求、洞察）并自动创建记录
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAIClient } from '@/lib/ai/client';
import { verifyToken } from '@/lib/auth';
import prisma from '@/lib/db/prisma';
import {
  analyzeKeyPointsSchema,
  keyPointsResponseSchema,
  type AnalyzeKeyPointsInput,
  type KeyPointsResponse,
  type KeyPointsFullResponse,
  type KeyPointItem,
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

const KEY_POINTS_SYSTEM_PROMPT = `你是一位资深的客户访谈分析师，擅长从访谈转写内容中识别关键信息。

你的任务是：
1. 分析访谈转写内容，识别核心问题
2. 将识别出的问题分为三类：
   - pain_point（痛点）：客户明确表达的困难、不满或问题
   - requirement（需求）：客户期望的解决方案或功能需求
   - insight（洞察）：有价值的业务洞察或潜在机会

输出要求：
- 输出必须是有效的JSON格式
- 不要包含任何其他解释或说明
- 严格按照指定的JSON结构输出

输出JSON结构：
{
  "keyPoints": [
    {
      "content": "问题内容描述",
      "type": "pain_point|requirement|insight",
      "confidence": 0.85,
      "transcriptIds": ["转写ID1", "转写ID2"]
    }
  ]
}

识别原则：
- confidence（置信度）范围 0-1，表示判断的可信程度
- 只识别明确表达的内容，不要过度推断
- 每个关键点必须关联到相关的转写ID
- 避免重复识别相同的内容
- 优先识别客户明确提及的问题和需求`;

// ============================================
// POST - AI识别核心问题
// ============================================

/**
 * @swagger
 * /api/ai/analyze/key-points:
 *   post:
 *     summary: AI核心问题识别
 *     description: 分析转写内容，自动识别痛点、需求和关键洞察，并创建访谈记录。
 *     tags: [AI]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - interviewId
 *               - transcripts
 *             properties:
 *               interviewId:
 *                 type: string
 *                 description: 访谈项目ID
 *               sessionId:
 *                 type: string
 *                 description: 会话ID（可选）
 *               transcripts:
 *                 type: array
 *                 description: 转写内容列表
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: 转写ID
 *                     content:
 *                       type: string
 *                       description: 转写内容
 *                     timestamp:
 *                       type: string
 *                       description: 时间戳
 *               customerContext:
 *                 type: object
 *                 description: 客户上下文（可选）
 *                 properties:
 *                   industry:
 *                     type: string
 *                     description: 客户行业
 *                   background:
 *                     type: string
 *                     description: 客户背景
 *     responses:
 *       200:
 *         description: 核心问题识别成功
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
 *                     keyPoints:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           content:
 *                             type: string
 *                           type:
 *                             type: string
 *                             enum: [pain_point, requirement, insight]
 *                           confidence:
 *                             type: number
 *                           transcriptIds:
 *                             type: array
 *                             items:
 *                               type: string
 *                     createdRecords:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           content:
 *                             type: string
 *                           type:
 *                             type: string
 *                           source:
 *                             type: string
 *                 message:
 *                   type: string
 *                   example: "核心问题识别成功"
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
    const body: AnalyzeKeyPointsInput = await request.json();

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
    const validationResult = analyzeKeyPointsSchema.safeParse(body);
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

    const { interviewId, sessionId, transcripts, customerContext } = validationResult.data;

    // 验证访谈项目存在且属于当前用户
    const interview = await prisma.interviewProject.findFirst({
      where: {
        id: interviewId,
        userId,
      },
      include: {
        customer: true,
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

    // 构建转写内容部分
    const transcriptsSection = transcripts
      .map((t, idx) => `[${t.id}] ${t.content}`)
      .join('\n');

    // 构建用户提示词
    const userPrompt = `## 访谈背景
- 访谈主题：${interview.title}
- 访谈目标：${interview.objective || '未设定'}
- 客户：${interview.customer?.name || '未知'}
${customerContext?.industry ? `- 客户行业：${customerContext.industry}` : ''}
${customerContext?.background ? `- 客户背景：${customerContext.background}` : ''}

## 转写内容（共 ${transcripts.length} 条）
${transcriptsSection}

请分析以上转写内容，识别核心问题（痛点、需求、洞察），输出JSON格式。`;

    // 调用AI服务
    const aiClient = getAIClient();
    const response = await aiClient.generateCompletion(KEY_POINTS_SYSTEM_PROMPT, [
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
    let keyPointsData: KeyPointsResponse;
    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('AI返回的内容不包含有效的JSON');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      keyPointsData = keyPointsResponseSchema.parse(parsed);
    } catch (parseError) {
      console.error('[AI Key Points] JSON解析失败:', parseError);
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

    // 使用事务创建记录并更新转写
    const createdRecords: Array<{
      id: string;
      content: string;
      type: string;
      source: string;
    }> = [];

    await prisma.$transaction(async (tx) => {
      for (const keyPoint of keyPointsData.keyPoints) {
        // 创建访谈记录
        const record = await tx.interviewRecord.create({
          data: {
            content: keyPoint.content,
            type: mapKeyPointTypeToRecordType(keyPoint.type),
            isHighlight: true,
            projectId: interviewId,
            sessionId: sessionId || null,
            source: 'ai',
          },
        });

        createdRecords.push({
          id: record.id,
          content: record.content,
          type: record.type,
          source: record.source,
        });

        // 标记关联的转写为关键点
        if (keyPoint.transcriptIds && keyPoint.transcriptIds.length > 0) {
          await tx.realtimeTranscript.updateMany({
            where: {
              id: { in: keyPoint.transcriptIds },
              projectId: interviewId,
            },
            data: {
              isKeyPoint: true,
            },
          });
        }
      }
    });

    return NextResponse.json<ApiResponse<KeyPointsFullResponse>>(
      {
        success: true,
        data: {
          keyPoints: keyPointsData.keyPoints,
          createdRecords,
        },
        message: '核心问题识别成功',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[AI Key Points API] 服务器错误:', error);

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

/**
 * 将核心问题类型映射到记录类型
 */
function mapKeyPointTypeToRecordType(type: KeyPointItem['type']): string {
  const typeMap: Record<string, string> = {
    pain_point: 'pain_point',
    requirement: 'requirement',
    insight: 'note',
  };
  return typeMap[type] || 'note';
}