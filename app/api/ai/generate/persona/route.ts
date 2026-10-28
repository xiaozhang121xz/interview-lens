/**
 * AI生成用户画像 API
 *
 * @module app/api/ai/generate/persona/route
 * @description 根据访谈记录，AI自动生成用户画像(Persona)
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAIClient } from '@/lib/ai/client';
import { verifyToken } from '@/lib/auth';
import prisma from '@/lib/db/prisma';
import { buildInterviewEvidence } from '@/lib/ai/interview-evidence';
import { RESULT_PERSONA_SYSTEM_PROMPT } from '@/lib/ai/prompts/interview-results';
import { validatePersonaQuality } from '@/lib/ai/result-quality';
import { repairStructuredResult } from '@/lib/ai/structured-result';
import {
  generatePersonaSchema,
  personaResponseSchema,
  type GeneratePersonaInput,
  type PersonaResponse,
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
// POST - 生成用户画像
// ============================================

/**
 * @swagger
 * /api/ai/generate/persona:
 *   post:
 *     summary: AI生成用户画像
 *     description: 根据访谈记录和AI洞察分析，AI自动生成用户画像(Persona)，包含用户基本信息、目标、痛点和行为特征。结果会保存到数据库。
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
 *         description: 用户画像生成成功
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
 *                       description: 保存的用户画像ID
 *                     name:
 *                       type: string
 *                       description: 虚构的用户姓名
 *                     role:
 *                       type: string
 *                       description: 用户角色/职位
 *                     demographics:
 *                       type: object
 *                       properties:
 *                         age:
 *                           type: string
 *                         experience:
 *                           type: string
 *                         department:
 *                           type: string
 *                         company_size:
 *                           type: string
 *                     goals:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: 用户目标列表
 *                     painPoints:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: 用户痛点列表
 *                     behaviors:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: 用户行为特征列表
 *                 message:
 *                   type: string
 *                   example: "用户画像生成成功"
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
    const body: GeneratePersonaInput = await request.json();

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
    const validationResult = generatePersonaSchema.safeParse(body);
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
    const [interview, records, transcripts, insights] = await Promise.all([
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
          message: '该访谈暂无记录，无法生成用户画像',
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

    // 构建用户提示词
    const userPrompt = `## 访谈信息
- 访谈主题：${interview.title}
- 访谈目标：${interview.objective || '未设定'}
- 客户：${interview.customer?.name || '未知'}
- 行业：${interview.customer?.industry || '未知'}

## AI洞察分析
${formattedInsights || '暂无AI分析'}

## 访谈记录
${evidence.text}

请根据以上访谈信息，生成一个典型的用户画像，输出JSON格式。`;

    // 调用AI服务
    const aiClient = getAIClient();
    const response = await aiClient.generateCompletion(RESULT_PERSONA_SYSTEM_PROMPT, [
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
    let personaData: PersonaResponse;
    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('AI返回的内容不包含有效的JSON');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      personaData = await repairStructuredResult({
        aiClient,
        systemPrompt: RESULT_PERSONA_SYSTEM_PROMPT,
        userPrompt,
        initialContent: response.content,
        initialValue: parsed,
        schema: personaResponseSchema,
        validateQuality: validatePersonaQuality,
        maxTokens: 3000,
      });
    } catch (parseError) {
      console.error('[AI Persona] JSON解析失败:', parseError);
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

    // 保存用户画像到数据库
    const savedPersona = await prisma.userPersona.create({
      data: {
        name: personaData.name,
        role: personaData.role,
        demographics: JSON.stringify(personaData.demographics),
        goals: JSON.stringify(personaData.goals),
        painPoints: JSON.stringify(personaData.painPoints),
        behaviors: JSON.stringify(personaData.behaviors),
        quotes: JSON.stringify(personaData.quotes),
        projectId: interviewId,
      },
    });

    // 将结构化数据转换为 Markdown 格式
    const personaMarkdown = `# 用户画像：${personaData.name}

## 基本信息
- **角色/职位**：${personaData.role}
${personaData.demographics ? Object.entries(personaData.demographics).map(([key, value]) => `- **${key}**：${value}`).join('\n') : ''}

## 目标
${personaData.goals.map((g, i) => `${i + 1}. ${g}`).join('\n')}

## 痛点
${personaData.painPoints.map((p, i) => `${i + 1}. ${p}`).join('\n')}

## 行为特征
${personaData.behaviors.map((b, i) => `${i + 1}. ${b}`).join('\n')}

## 访谈原话
${personaData.quotes.map((quote, i) => `${i + 1}. ${quote}`).join('\n')}
`;

    return NextResponse.json<ApiResponse<{ persona: string; id: string }>>(
      {
        success: true,
        data: {
          persona: personaMarkdown,
          id: savedPersona.id,
        },
        message: '用户画像生成成功',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[AI Persona API] 服务器错误:', error);

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
