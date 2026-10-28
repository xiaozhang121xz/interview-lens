/**
 * AI遗漏检测 API
 *
 * @module app/api/ai/analyze/outline-gaps/route
 * @description 分析当前提纲与访谈目标的覆盖度，识别缺失的重要问题（提纲生成优化 - 阶段4）
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAIClient } from '@/lib/ai/client';
import { verifyToken } from '@/lib/auth';
import {
  analyzeOutlineGapsSchema,
  outlineGapsResponseSchema,
  type AnalyzeOutlineGapsInput,
  type OutlineGapsResponse,
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
): Promise<string | null> {
  // 优先从Authorization header获取
  const headerUserId = await getCurrentUserId(request);
  if (headerUserId) {
    return headerUserId;
  }

  // 尝试从 X-User-Id header 获取（前端备用方案）
  const xUserId = request.headers.get('X-User-Id');
  if (xUserId) {
    return xUserId;
  }

  // 从请求体获取
  if (body && typeof body.userId === 'string') {
    return body.userId;
  }

  return null;
}

// ============================================
// 系统提示词
// ============================================

const OUTLINE_GAPS_SYSTEM_PROMPT = `你是一位资深的客户访谈专家，专门帮助团队确保访谈提纲的完整性。

你的任务是：
1. 分析当前提纲与访谈目标的匹配度
2. 识别可能遗漏的重要问题
3. 为每个缺失问题说明重要性和严重程度
4. 给出整体覆盖度评分和改进建议

输出要求：
- 输出必须是有效的JSON格式
- 不要包含任何其他解释或说明
- 严格按照指定的JSON结构输出

输出JSON结构：
{
  "missingCriticalQuestions": [
    {
      "suggestedQuestion": "建议问题",
      "reason": "为什么这个问题重要",
      "category": "问题分类",
      "severity": "high|medium"
    }
  ],
  "overallCoverage": 0-100,
  "recommendations": ["改进建议1", "改进建议2"]
}

判断标准：
- 如果访谈目标的核心要素未被覆盖 → high severity
- 如果行业通用问题缺失 → medium severity
- 如果探索性问题缺失 → 不计入缺失

分析原则：
- 客观评估，不要过度焦虑
- 关注访谈目标的核心要素
- 考虑行业特性和客户背景`;

// ============================================
// POST - 分析提纲遗漏
// ============================================

/**
 * @swagger
 * /api/ai/analyze/outline-gaps:
 *   post:
 *     summary: AI遗漏检测
 *     description: 分析当前提纲与访谈目标的覆盖度，识别缺失的重要问题。
 *     tags: [AI]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - interviewId
 *               - currentOutline
 *               - objective
 *               - customerInfo
 *             properties:
 *               interviewId:
 *                 type: string
 *                 description: 访谈ID
 *               currentOutline:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     question:
 *                       type: string
 *                     isCore:
 *                       type: boolean
 *               objective:
 *                 type: string
 *                 description: 访谈目标
 *               customerInfo:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                   industry:
 *                     type: string
 *                   description:
 *                     type: string
 *               insightReport:
 *                 type: object
 *                 description: 分析报告（可选）
 *     responses:
 *       200:
 *         description: 遗漏检测成功
 *       400:
 *         description: 请求参数验证失败
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
    const body: AnalyzeOutlineGapsInput = await request.json();

    // 获取用户ID（可选验证）
    const userId = await extractUserId(request, body);

    // 验证请求体
    const validationResult = analyzeOutlineGapsSchema.safeParse(body);
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

    const { currentOutline, objective, customerInfo, insightReport } = validationResult.data;

    // 构建当前提纲摘要
    const outlineSummary = currentOutline
      .map((o, i) => `${i + 1}. ${o.question}${o.isCore ? ' (核心)' : ''}`)
      .join('\n');

    // 构建用户提示词
    const userPrompt = `请分析以下访谈提纲的覆盖度，识别缺失的重要问题：

## 客户信息
- 客户名称：${customerInfo.name}
${customerInfo.industry ? `- 所属行业：${customerInfo.industry}` : ''}
${customerInfo.description ? `- 公司描述：${customerInfo.description}` : ''}

## 访谈目标
${objective}

## 当前提纲（共${currentOutline.length}个问题）
${outlineSummary || '暂无问题'}

${insightReport ? `## 分析报告参考
业务场景: ${insightReport.businessScenario.summary}
痛点假设: ${insightReport.painPointHypotheses.map(p => p.hypothesis).join('、')}
优先领域: ${insightReport.interviewStrategy.priorityAreas.join('、')}` : ''}

请分析遗漏问题，输出JSON格式。`;

    // 调用AI服务
    const aiClient = getAIClient();
    const response = await aiClient.generateCompletion(OUTLINE_GAPS_SYSTEM_PROMPT, [
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
    let gapsData: OutlineGapsResponse;
    try {
      // 提取JSON内容
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('AI返回的内容不包含有效的JSON');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      gapsData = outlineGapsResponseSchema.parse(parsed);
    } catch (parseError) {
      console.error('[AI Outline Gaps] JSON解析失败:', parseError);
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

    return NextResponse.json<ApiResponse<OutlineGapsResponse>>(
      {
        success: true,
        data: gapsData,
        message: '遗漏检测完成',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[AI Outline Gaps API] 服务器错误:', error);

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