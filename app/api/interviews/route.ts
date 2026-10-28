/**
 * 访谈项目 API - 列表与创建
 *
 * @module app/api/interviews/route
 * @description 访谈项目列表查询和创建API
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db/prisma';
import { verifyToken } from '@/lib/auth';
import {
  interviewCreateSchema,
  interviewQuerySchema,
  type InterviewCreateInput,
} from '@/lib/validations/interview';
import type { InterviewProject, Customer } from '@prisma/client';
import { getAIClient } from '@/lib/ai/client';

// ============================================
// 类型定义
// ============================================

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: z.ZodIssue[];
}

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface InterviewWithCustomer extends InterviewProject {
  customer: Pick<Customer, 'id' | 'name' | 'industry'> | null;
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

  throw new Error('UNAUTHORIZED');
}

// ============================================
// 异步生成分析报告和问题提纲
// ============================================

/**
 * 触发异步生成分析报告和问题提纲
 * 注意：此函数不阻塞响应，在后台异步执行
 */
async function triggerPreparationGeneration(
  interviewId: string,
  customer: Customer,
  objective: string | null,
  background: string | null
) {
  try {
    console.log(`[Interview] 开始自动生成，访谈ID: ${interviewId}`);

    // 更新状态为 generating
    await prisma.interviewProject.update({
      where: { id: interviewId },
      data: {
        preparationStatus: 'generating',
        preparationStartedAt: new Date(),
      },
    });

    // 1. 生成分析报告
    const aiClient = getAIClient();
    const customerInfo = {
      name: customer.name,
      industry: customer.industry || undefined,
      description: customer.description || undefined,
      background: customer.background || undefined,
      contactBackground: customer.contactBackground || undefined,
      website: customer.website || undefined,
      notes: customer.notes || undefined,
    };

    // 构建分析报告提示词
    const insightPrompt = `请为以下访谈场景生成分析报告：

## 客户信息
- 客户名称：${customerInfo.name}${customerInfo.industry ? `\n- 所属行业：${customerInfo.industry}` : ''}
${customerInfo.description ? `- 公司描述：${customerInfo.description}` : ''}
${customerInfo.background ? `\n## 客户公司背景\n${customerInfo.background}` : ''}
${customerInfo.contactBackground ? `\n## 联系人背景\n${customerInfo.contactBackground}` : ''}

## 访谈目标
${objective || '了解客户需求和痛点'}

${background ? `## 访谈背景\n${background}` : ''}

请生成访谈分析报告，输出JSON格式。`;

    const insightSystemPrompt = `你是一位资深的客户访谈专家，专门帮助团队在访谈前进行深入分析。

你的任务是：
1. 分析客户的业务场景，提炼关键特征和可能挑战
2. 基于行业和目标，推断可能的痛点（标注置信度：high/medium/low）
3. 提炼合理但仍需访谈确认的关键假设，并明确相关风险或信息缺口
4. 给出访谈策略建议，包括优先关注领域和时间分配
5. 提供风险提示，帮助避免敏感问题

输出要求：
- 输出必须是有效的JSON格式
- 不要包含任何其他解释或说明
- 严格按照指定的JSON结构输出

输出JSON结构：
{
  "businessScenario": {
    "summary": "业务场景概述（1-2段）",
    "keyCharacteristics": ["特征1", "特征2", "特征3"],
    "potentialChallenges": ["挑战1", "挑战2"]
  },
  "painPointHypotheses": [
    {
      "hypothesis": "痛点假设描述",
      "reasoning": "推断依据",
      "confidence": "high|medium|low",
      "relatedArea": "相关领域"
    }
  ],
  "hypothesesAndRisks": [
    {
      "assumption": "待验证假设",
      "basis": "形成该假设的依据",
      "confidence": "high|medium|low",
      "riskOrGap": "对应风险、敏感点或信息缺口"
    }
  ],
  "interviewStrategy": {
    "approach": "访谈方法建议",
    "priorityAreas": ["领域1", "领域2", "领域3"],
    "timeAllocation": "时间分配建议",
    "riskAlerts": ["风险1", "风险2"]
  }
}`;

    const insightResponse = await aiClient.generateCompletion(insightSystemPrompt, [
      { role: 'user', content: insightPrompt },
    ]);

    if (!insightResponse.success) {
      throw new Error(`分析报告生成失败: ${insightResponse.error}`);
    }

    // 解析分析报告JSON
    const insightJsonMatch = insightResponse.content.match(/\{[\s\S]*\}/);
    if (!insightJsonMatch) {
      throw new Error('分析报告返回的内容不包含有效的JSON');
    }
    const insightData = JSON.parse(insightJsonMatch[0]);

    // 保存分析报告到数据库
    const savedReport = await prisma.interviewInsightReport.create({
      data: {
        projectId: interviewId,
        content: JSON.stringify(insightData),
      },
    });

    console.log(`[Interview] 分析报告已保存，ID: ${savedReport.id}`);

    // 2. 生成问题提纲（基于分析报告）
    const outlinePrompt = `请为以下访谈场景生成核心问题和补充问题：

## 客户信息
- 客户名称：${customerInfo.name}${customerInfo.industry ? `\n- 所属行业：${customerInfo.industry}` : ''}

## 访谈目标
${objective || '了解客户需求和痛点'}

${background ? `## 访谈背景\n${background}` : ''}

## 已完成的访谈分析报告

### 业务场景分析
${insightData.businessScenario?.summary || ''}

**关键特征**：
${(insightData.businessScenario?.keyCharacteristics || []).map((c: string, i: number) => `[特征${i}] ${c}`).join('\n')}

### 痛点假设
${(insightData.painPointHypotheses || []).map((p: { hypothesis: string; confidence: string; relatedArea: string }, i: number) => `[痛点${i}] **${p.hypothesis}**（置信度：${p.confidence}，领域：${p.relatedArea || ''}）`).join('\n')}

### 访谈策略建议
${insightData.interviewStrategy?.approach || ''}

**优先关注领域**：
${(insightData.interviewStrategy?.priorityAreas || []).map((a: string, i: number) => `[领域${i}] ${a}`).join('\n')}

请生成访谈问题，输出JSON格式。确保核心问题控制在3-7个。`;

    const outlineSystemPrompt = `你是一位资深记者级别的访谈专家，设计高质量、有深度的访谈问题。

## 任务定义
1. 基于访谈分析报告，识别核心问题（必问问题）
2. 生成补充问题（可选问题）
3. 为每个问题说明重要性和关联分析

## 问题设计标准（强制执行）
- **中性开放**：不带有任何预设答案或倾向性暗示
- **具体可答**：客户能够给出具体、可量化的回答
- **逻辑衔接**：与前后问题有清晰的逻辑关系
- **价值导向**：能获取关键业务信息或验证重要假设

## 输出JSON结构
{
  "coreQuestions": [
    {
      "question": "问题内容",
      "priority": 1-5,
      "isCore": true,
      "reasoning": "为什么重要",
      "relatedInsight": "关联分析点的文本描述",
      "relatedPainPointIndex": 0,
      "relatedPriorityAreaIndex": 1,
      "insightReferenceType": "pain_point"
    }
  ],
  "supplementaryQuestions": [
    {
      "question": "问题内容",
      "priority": 1-5,
      "isCore": false,
      "reasoning": "为什么值得补充追问"
    }
  ]
}`;

    const outlineResponse = await aiClient.generateCompletion(outlineSystemPrompt, [
      { role: 'user', content: outlinePrompt },
    ]);

    if (!outlineResponse.success) {
      throw new Error(`问题提纲生成失败: ${outlineResponse.error}`);
    }

    // 解析问题提纲JSON
    const outlineJsonMatch = outlineResponse.content.match(/\{[\s\S]*\}/);
    if (!outlineJsonMatch) {
      throw new Error('问题提纲返回的内容不包含有效的JSON');
    }
    const outlineData = JSON.parse(outlineJsonMatch[0]);

    // 保存核心问题到数据库
    const coreQuestions = outlineData.coreQuestions || [];
    for (let i = 0; i < coreQuestions.length; i++) {
      const q = coreQuestions[i];
      await prisma.interviewOutline.create({
        data: {
          projectId: interviewId,
          question: q.question,
          priority: q.priority ?? 3,
          isCore: true,
          reasoning: q.reasoning,
          relatedInsight: q.relatedInsight,
          relatedPainPointIndex: q.relatedPainPointIndex,
          relatedPriorityAreaIndex: q.relatedPriorityAreaIndex,
          relatedBusinessScenarioKey: q.relatedBusinessScenarioKey,
          insightReferenceType: q.insightReferenceType,
          source: 'ai',
          order: i,
        },
      });
    }

    // 保存补充问题
    const supplementaryQuestions = outlineData.supplementaryQuestions || [];
    for (let i = 0; i < supplementaryQuestions.length; i++) {
      const q = supplementaryQuestions[i];
      await prisma.interviewOutline.create({
        data: {
          projectId: interviewId,
          question: q.question,
          priority: q.priority ?? 3,
          isCore: false,
          reasoning: q.reasoning,
          relatedInsight: q.relatedInsight,
          source: 'ai',
          order: coreQuestions.length + i,
        },
      });
    }

    console.log(`[Interview] 问题提纲已保存，核心问题: ${coreQuestions.length}，补充问题: ${supplementaryQuestions.length}`);

    // 更新状态为 completed
    await prisma.interviewProject.update({
      where: { id: interviewId },
      data: {
        preparationStatus: 'completed',
        preparationCompletedAt: new Date(),
        status: 'prepared', // 自动更新访谈状态为已准备
      },
    });

    console.log(`[Interview] 自动生成完成，访谈ID: ${interviewId}`);
  } catch (error) {
    console.error(`[Interview] 自动生成失败，访谈ID: ${interviewId}`, error);

    // 更新状态为 failed
    await prisma.interviewProject.update({
      where: { id: interviewId },
      data: {
        preparationStatus: 'failed',
        preparationError: error instanceof Error ? error.message : '未知错误',
      },
    });
  }
}

// ============================================
// GET - 获取访谈列表 (T008)
// ============================================

/**
 * @swagger
 * /api/interviews:
 *   get:
 *     summary: 获取访谈列表
 *     description: 获取访谈项目列表，支持分页和按状态、客户筛选。只返回当前用户创建的访谈项目。
 *     tags: [Interviews]
 *     parameters:
 *       - name: page
 *         in: query
 *         required: false
 *         schema:
 *           type: integer
 *           default: 1
 *         description: 页码（从1开始）
 *       - name: pageSize
 *         in: query
 *         required: false
 *         schema:
 *           type: integer
 *           default: 10
 *         description: 每页数量（1-100）
 *       - name: status
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *           enum: [draft, prepared, in_progress, completed, archived]
 *         description: 状态筛选
 *       - name: customerId
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *         description: 客户ID筛选
 *     responses:
 *       200:
 *         description: 成功获取访谈列表
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
 *                     items:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             description: 访谈ID
 *                           title:
 *                             type: string
 *                             description: 访谈标题
 *                           objective:
 *                             type: string
 *                             description: 访谈目标
 *                           status:
 *                             type: string
 *                             enum: [draft, prepared, in_progress, completed, archived]
 *                             description: 访谈状态
 *                           customer:
 *                             type: object
 *                             nullable: true
 *                             properties:
 *                               id:
 *                                 type: string
 *                               name:
 *                                 type: string
 *                               industry:
 *                                 type: string
 *                     total:
 *                       type: integer
 *                       description: 总记录数
 *                     page:
 *                       type: integer
 *                       description: 当前页码
 *                     pageSize:
 *                       type: integer
 *                       description: 每页数量
 *                     totalPages:
 *                       type: integer
 *                       description: 总页数
 *       400:
 *         description: 查询参数验证失败
 *       401:
 *         description: 未授权访问
 *       500:
 *         description: 服务器内部错误
 */
export async function GET(request: NextRequest) {
  try {
    // 解析查询参数
    const { searchParams } = new URL(request.url);

    // 支持查询单个访谈的准备状态
    const preparationStatusOnly = searchParams.get('preparationStatusOnly');
    const queryId = searchParams.get('id');

    if (preparationStatusOnly === 'true' && queryId) {
      let userId: string;
      try {
        userId = await extractUserId(request);
      } catch {
        return NextResponse.json<ApiResponse<never>>(
          { success: false, message: '未授权访问' },
          { status: 401 }
        );
      }

      const interview = await prisma.interviewProject.findFirst({
        where: { id: queryId, userId },
        select: {
          id: true,
          preparationStatus: true,
          preparationError: true,
          preparationStartedAt: true,
          preparationCompletedAt: true,
          status: true,
        },
      });

      if (!interview) {
        return NextResponse.json<ApiResponse<never>>(
          { success: false, message: '访谈不存在' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: interview,
      });
    }

    const queryObject = Object.fromEntries(searchParams.entries());

    // 验证查询参数
    const validationResult = interviewQuerySchema.safeParse(queryObject);
    if (!validationResult.success) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          message: '查询参数验证失败',
          errors: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const { page, pageSize, status, customerId } = validationResult.data;

    // 验证分页参数范围
    if (page < 1 || pageSize < 1 || pageSize > 100) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          message: '分页参数无效',
        },
        { status: 400 }
      );
    }

    // 获取用户ID（访谈数据需要认证）
    let userId: string;
    try {
      userId = await extractUserId(request);
    } catch {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          message: '未授权访问，请先登录',
        },
        { status: 401 }
      );
    }

    // 构建查询条件
    const where: Record<string, unknown> = {
      userId, // 只返回当前用户的访谈
    };

    // 添加状态筛选
    if (status) {
      where.status = status;
    }

    // 添加客户筛选
    if (customerId) {
      where.customerId = customerId;
    }

    // 并行执行查询（性能优化：消除瀑布流）
    const [interviews, total] = await Promise.all([
      prisma.interviewProject.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              industry: true,
            },
          },
        },
      }),
      prisma.interviewProject.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pageSize);

    return NextResponse.json<ApiResponse<{
      interviews: InterviewWithCustomer[];
      pagination: { total: number; page: number; pageSize: number; totalPages: number };
    }>>(
      {
        success: true,
        data: {
          interviews: interviews as InterviewWithCustomer[],
          pagination: { total, page, pageSize, totalPages },
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('获取访谈列表API错误:', error);

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
      },
      { status: 500 }
    );
  }
}

// ============================================
// POST - 创建访谈项目 (T009)
// ============================================

/**
 * @swagger
 * /api/interviews:
 *   post:
 *     summary: 创建访谈项目
 *     description: 创建新的访谈项目。需要关联一个已存在的客户，且客户必须属于当前用户。创建成功后会自动异步生成分析报告和问题提纲。
 *     tags: [Interviews]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - objective
 *               - customerId
 *             properties:
 *               title:
 *                 type: string
 *                 maxLength: 100
 *                 description: 访谈标题
 *                 example: "XX公司数字化转型需求调研"
 *               objective:
 *                 type: string
 *                 maxLength: 500
 *                 description: 访谈目标
 *                 example: "了解客户当前业务流程和数字化转型痛点"
 *               background:
 *                 type: string
 *                 maxLength: 1000
 *                 description: 访谈背景
 *               customerId:
 *                 type: string
 *                 description: 关联的客户ID
 *     responses:
 *       201:
 *         description: 访谈项目创建成功
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
 *                       description: 新创建的访谈ID
 *                     title:
 *                       type: string
 *                       description: 访谈标题
 *                     status:
 *                       type: string
 *                       enum: [draft]
 *                       description: 初始状态为draft
 *                     preparationStatus:
 *                       type: string
 *                       enum: [pending]
 *                       description: 准备状态，pending表示正在后台生成分析报告
 *                     customer:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         industry:
 *                           type: string
 *                 message:
 *                   type: string
 *                   example: "访谈项目创建成功，正在自动生成分析报告和问题提纲..."
 *       400:
 *         description: 请求参数验证失败
 *       401:
 *         description: 未授权访问
 *       403:
 *         description: 无权访问此客户
 *       404:
 *         description: 客户不存在
 *       500:
 *         description: 服务器内部错误
 */
export async function POST(request: NextRequest) {
  try {
    // 解析请求体
    const body: InterviewCreateInput & { userId?: string } = await request.json();

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
    const validationResult = interviewCreateSchema.safeParse(body);
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

    const validatedData = validationResult.data;

    // 验证客户存在且属于当前用户
    const customer = await prisma.customer.findUnique({
      where: { id: validatedData.customerId },
    });

    if (!customer) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          message: '客户不存在',
        },
        { status: 404 }
      );
    }

    if (customer.userId !== userId) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          message: '无权访问此客户',
        },
        { status: 403 }
      );
    }

    // 创建访谈项目
    const interview = await prisma.interviewProject.create({
      data: {
        title: validatedData.title,
        objective: validatedData.objective,
        background: validatedData.background || null,
        interviewDate: validatedData.interviewDate || null,
        status: 'draft', // 初始状态为 draft
        customerId: validatedData.customerId,
        userId,
        preparationStatus: 'pending', // 初始准备状态
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            industry: true,
          },
        },
      },
    });

    // 异步启动生成流程（不阻塞响应）
    triggerPreparationGeneration(
      interview.id,
      customer,
      validatedData.objective,
      validatedData.background || null
    ).catch((error) => {
      console.error('[Interview] Async generation error:', error);
    });

    return NextResponse.json<ApiResponse<InterviewWithCustomer>>(
      {
        success: true,
        data: interview as InterviewWithCustomer,
        message: '访谈项目创建成功，正在自动生成分析报告和问题提纲...',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('创建访谈项目API错误:', error);

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
      },
      { status: 500 }
    );
  }
}
