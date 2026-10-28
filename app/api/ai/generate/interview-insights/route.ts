/**
 * AI生成访谈分析报告 API
 *
 * @module app/api/ai/generate/interview-insights/route
 * @description 根据客户信息和访谈目标，AI生成访谈分析报告（提纲生成优化 - 阶段1）
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAIClient } from '@/lib/ai/client';
import { verifyToken } from '@/lib/auth';
import prisma from '@/lib/db/prisma';
import {
  generateInsightReportSchema,
  insightReportResponseSchema,
  type GenerateInsightReportInput,
  type InsightReportResponse,
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
  reportId?: string; // 保存到数据库后的报告ID
  isOverwrite?: boolean; // 是否为覆盖操作（版本管理）
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

/**
 * 根据角色画像生成差异化的系统提示词
 */
function getInsightSystemPrompt(focusAreas?: string[]): string {
  // 根据关注领域判断角色类型
  const roleType = getRoleTypeFromFocusAreas(focusAreas);

  const basePrompt = `你是一位资深的客户访谈专家，专门帮助团队在访谈前进行深入分析。

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

  const roleSpecificPrompts: Record<string, string> = {
    sales: `

## 销售角色特别关注

在分析时特别关注以下因素：
- **决策链条**：谁参与决策？决策流程是怎样的？
- **预算周期**：预算审批流程、预算周期时间点
- **竞品对比**：客户正在考虑哪些竞品？选择标准是什么？
- **ROI期望**：客户对投资回报的期望是什么？

高置信度痛点判定标准：
- 直接影响客户购买决策的因素
- 竞品已经解决但客户尚未解决的问题
- 客户明确表达的预算和时间压力`,
    product: `

## 产品角色特别关注

在分析时特别关注以下因素：
- **用户场景**：目标用户是谁？使用场景是什么？
- **功能优先级**：哪些功能是必须的？哪些是锦上添花？
- **用户体验痛点**：当前方案的体验问题在哪里？
- **技术约束**：技术架构对产品设计的限制

高置信度痛点判定标准：
- 直接影响用户体验的问题
- 导致用户流失或满意度下降的问题
- 产品核心功能路径上的障碍`,
    developer: `

## 技术角色特别关注

在分析时特别关注以下因素：
- **技术架构**：当前使用什么技术栈？架构有什么特点？
- **集成兼容性**：需要与哪些系统集成？兼容性要求是什么？
- **技术债务**：当前存在哪些技术债务？影响有多大？
- **开发资源**：团队规模、技术能力、开发周期

高置信度痛点判定标准：
- 直接影响系统稳定性和性能的问题
- 增加维护成本的技术债务
- 阻碍业务扩展的架构瓶颈`,
    manager: `

## 管理角色特别关注

在分析时特别关注以下因素：
- **团队协作**：团队协作流程是否顺畅？有哪些协作障碍？
- **资源效率**：资源分配是否合理？利用率如何？
- **风险管控**：业务风险点在哪里？如何管控？
- **业绩指标**：KPI考核指标是什么？如何衡量成功？

高置信度痛点判定标准：
- 直接影响团队效率的问题
- 导致资源浪费或成本上升的问题
- 影响业务目标达成的障碍`,
  };

  const rolePrompt = roleSpecificPrompts[roleType] || '';

  return `${basePrompt}${rolePrompt}

分析原则：
- 基于行业特性推断痛点，但保持开放心态
- 高置信度痛点必须有明确的行业依据
- 访谈策略要具体可操作
- 风险提示要考虑客户可能的敏感点`;
}

/**
 * 根据关注领域推断角色类型
 */
function getRoleTypeFromFocusAreas(focusAreas?: string[]): string {
  if (!focusAreas || focusAreas.length === 0) return 'default';

  const areaLower = focusAreas.join(' ').toLowerCase();

  if (areaLower.includes('销售') || areaLower.includes('决策') || areaLower.includes('预算') || areaLower.includes('竞品')) {
    return 'sales';
  }
  if (areaLower.includes('产品') || areaLower.includes('功能') || areaLower.includes('用户') || areaLower.includes('体验')) {
    return 'product';
  }
  if (areaLower.includes('技术') || areaLower.includes('架构') || areaLower.includes('开发') || areaLower.includes('集成')) {
    return 'developer';
  }
  if (areaLower.includes('管理') || areaLower.includes('团队') || areaLower.includes('流程') || areaLower.includes('效率')) {
    return 'manager';
  }

  return 'default';
}

// ============================================
// POST - 生成访谈分析报告
// ============================================

/**
 * @swagger
 * /api/ai/generate/interview-insights:
 *   post:
 *     summary: AI生成访谈分析报告
 *     description: 根据客户信息和访谈目标，AI生成结构化的访谈分析报告，包括业务场景分析、痛点假设和访谈策略。
 *     tags: [AI]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - customerInfo
 *               - objective
 *             properties:
 *               customerInfo:
 *                 type: object
 *                 required:
 *                   - name
 *                 properties:
 *                   name:
 *                     type: string
 *                     description: 客户名称
 *                     example: "阿里巴巴"
 *                   industry:
 *                     type: string
 *                     description: 所属行业（可选）
 *                     example: "互联网"
 *                   description:
 *                     type: string
 *                     description: 公司描述
 *               objective:
 *                 type: string
 *                 maxLength: 500
 *                 description: 访谈目标
 *                 example: "了解客户的数字化转型需求和痛点"
 *               background:
 *                 type: string
 *                 maxLength: 1000
 *                 description: 访谈背景
 *               focusAreas:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: 重点关注领域
 *                 example: ["业务流程", "技术架构", "组织架构"]
 *     responses:
 *       200:
 *         description: 访谈分析报告生成成功
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
 *                     businessScenario:
 *                       type: object
 *                       properties:
 *                         summary:
 *                           type: string
 *                         keyCharacteristics:
 *                           type: array
 *                           items:
 *                             type: string
 *                         potentialChallenges:
 *                           type: array
 *                           items:
 *                             type: string
 *                     painPointHypotheses:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           hypothesis:
 *                             type: string
 *                           reasoning:
 *                             type: string
 *                           confidence:
 *                             type: string
 *                             enum: [high, medium, low]
 *                           relatedArea:
 *                             type: string
 *                     interviewStrategy:
 *                       type: object
 *                       properties:
 *                         approach:
 *                           type: string
 *                         priorityAreas:
 *                           type: array
 *                           items:
 *                             type: string
 *                         timeAllocation:
 *                           type: string
 *                         riskAlerts:
 *                           type: array
 *                           items:
 *                             type: string
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
    const body: GenerateInsightReportInput = await request.json();

    // 获取用户ID（可选验证）
    const userId = await extractUserId(request, body);

    // 验证请求体
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

    // 构建用户提示词（使用扩展的客户信息）
    const customerBackgroundSection = customerInfo.background
      ? `\n\n## 客户公司背景\n${customerInfo.background}`
      : '';
    const contactBackgroundSection = customerInfo.contactBackground
      ? `\n\n## 联系人背景\n${customerInfo.contactBackground}`
      : '';
    const websiteSection = customerInfo.website
      ? `\n- 官网：${customerInfo.website}`
      : '';
    const notesSection = customerInfo.notes
      ? `\n\n## 历史备注\n${customerInfo.notes}`
      : '';

    const userPrompt = `请为以下访谈场景生成分析报告：

## 客户信息
- 客户名称：${customerInfo.name}${customerInfo.industry ? `\n- 所属行业：${customerInfo.industry}` : ''}${websiteSection}
${customerInfo.description ? `- 公司描述：${customerInfo.description}` : ''}${customerBackgroundSection}${contactBackgroundSection}${notesSection}

## 访谈目标
${objective}

${background ? `## 访谈背景\n${background}` : ''}

${focusAreas && focusAreas.length > 0 ? `## 重点关注领域\n${focusAreas.map((area, i) => `${i + 1}. ${area}`).join('\n')}` : ''}

请生成访谈分析报告，输出JSON格式。`;

    // 调用AI服务（使用角色差异化的系统提示词）
    const aiClient = getAIClient();
    const response = await aiClient.generateCompletion(getInsightSystemPrompt(focusAreas), [
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
    let insightData: InsightReportResponse;
    try {
      // 提取JSON内容
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('AI返回的内容不包含有效的JSON');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      insightData = insightReportResponseSchema.parse(parsed);
    } catch (parseError) {
      console.error('[AI Interview Insights] JSON解析失败:', parseError);
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

    // 保存到数据库（如果提供了 interviewId）
    let savedReportId: string | undefined;
    let storageWarning: string | undefined;
    let isOverwrite = false; // 是否为覆盖操作

    if (validationResult.data.interviewId) {
      try {
        const { interviewId, overwrite = false } = validationResult.data;

        // 使用事务确保数据一致性
        await prisma.$transaction(async (tx) => {
          if (overwrite) {
            // overwrite=true: 先删除最新报告，再创建新报告
            // 查询最新报告（按createdAt降序）
            const latestReport = await tx.interviewInsightReport.findFirst({
              where: { projectId: interviewId! },
              orderBy: { createdAt: 'desc' },
            });

            if (latestReport) {
              // 删除最新报告
              await tx.interviewInsightReport.delete({
                where: { id: latestReport.id },
              });
              isOverwrite = true;
              console.log(`[AI Interview Insights] 已删除最新报告 ID: ${latestReport.id}（覆盖模式）`);
            }
          }

          // 创建新报告（追加模式或覆盖模式）
          const savedReport = await tx.interviewInsightReport.create({
            data: {
              projectId: interviewId!,
              content: JSON.stringify(insightData),
            },
          });

          savedReportId = savedReport.id;
        });

        console.log(
          `[AI Interview Insights] 分析报告已保存到数据库，ID: ${savedReportId}，模式: ${isOverwrite ? '覆盖' : '追加'}`
        );
      } catch (saveError) {
        console.error('[AI Interview Insights] 保存到数据库失败:', saveError);
        storageWarning = '分析报告生成成功，但保存失败，下次访问时需要重新生成';
      }
    }

    return NextResponse.json<ApiResponse<InsightReportResponse>>(
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
    console.error('[AI Interview Insights API] 服务器错误:', error);

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
