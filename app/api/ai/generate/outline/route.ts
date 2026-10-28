/**
 * AI生成访谈提纲 API
 *
 * @module app/api/ai/generate/outline/route
 * @description 根据客户信息和访谈目标，AI自动生成访谈提纲
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAIClient } from '@/lib/ai/client';
import { verifyToken } from '@/lib/auth';
import {
  generateOutlineSchema,
  coreQuestionsResponseSchema,
  type GenerateOutlineInput,
  type CoreQuestionsResponse,
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

const OUTLINE_SYSTEM_PROMPT = `你是一位资深记者级别的访谈专家，设计高质量、有深度的访谈问题。

## 任务定义
1. 基于访谈分析报告（如有），识别核心问题（必问问题）
2. 生成补充问题（可选问题）
3. 为每个问题说明重要性和关联分析
4. **为每个问题建立精确的分析点引用关系**

## 问题设计标准（强制执行）

### 1. 问题必须满足以下标准之一
- **中性开放**：不带有任何预设答案或倾向性暗示
- **具体可答**：客户能够给出具体、可量化的回答
- **逻辑衔接**：与前后问题有清晰的逻辑关系
- **价值导向**：能获取关键业务信息或验证重要假设

### 2. 痛点剖析型问题模板（优先使用）
- "请详细描述您目前[某业务]的完整流程是怎样的？"
- "在这个流程中，通常需要花费多少时间？哪个环节耗时最长？"
- "在[某环节]中，最常遇到的问题或困难是什么？能举个具体例子吗？"
- "这个问题对整体工作效率有多大的影响？能估算一下吗？"
- "如果这个问题能够解决，您预计能节省多少时间或成本？"

### 3. 问题逻辑排序原则
**开场阶段（1-2个问题）**：
- 建立信任，了解背景
- 例："请介绍一下您负责的主要工作内容是什么？"

**探索阶段（3-5个问题）**：
- 深入了解现状，挖掘痛点
- 按业务流程顺序提问，形成完整画面
- 例："您是如何处理[某任务]的？具体步骤是什么？"

**确认阶段（2-3个问题）**：
- 验证核心假设，确认关键需求
- 例："刚才提到的[某问题]，是否是您最希望解决的？"

**收尾阶段（1-2个问题）**：
- 总结发现，明确下一步
- 例："如果我们要推进这个项目，您最关心的三个要点是什么？"

### 4. 避免引导式提问检查清单
生成每个问题时，必须检查：
- 是否带有"是不是"、"是否"等引导词？
- 是否暗示了某种解决方案？
- 是否预设了客户的感受或需求？
- 如果是，必须重新设计为中性开放问题

## 输出要求
- 输出必须是有效的JSON格式
- 每个问题必须包含 isCore 字段（true 或 false）
- 核心问题的 isCore 必须为 true，补充问题的 isCore 必须为 false
- 不要包含任何其他解释或说明
- 严格按照指定的JSON结构输出

## 输出JSON结构
{
  "coreQuestions": [
    {
      "question": "问题内容（中性开放、具体可答）",
      "priority": 1-5,
      "isCore": true,  // 核心问题必须为true
      "reasoning": "为什么重要",
      "relatedInsight": "关联分析点的文本描述（用于显示）",
      "relatedPainPointIndex": 0,  // 数字索引，对应痛点假设数组的位置（如有）
      "relatedPriorityAreaIndex": 1,  // 数字索引，对应优先领域数组的位置（如有）
      "relatedBusinessScenarioKey": "特征文本",  // 关联的业务场景特征（如有）
      "insightReferenceType": "pain_point",  // 引用类型：pain_point, priority_area, business_scenario, mixed
      "designInfo": {
        "stage": "opening|exploration|confirmation|closing",
        "painPointFocus": "聚焦的痛点方向",
        "expectedInsight": "预期获取的关键信息",
        "followUpHint": "追问方向提示"
      }
    }
  ],
  "supplementaryQuestions": [
    {
      "question": "问题内容",
      "priority": 1-5,
      "isCore": false,  // 补充问题必须为false
      "reasoning": "为什么值得补充追问",
      "relatedInsight": "关联分析（显示文本）",
      "relatedPainPointIndex": null,  // 可选
      "relatedPriorityAreaIndex": null,  // 可选
      "insightReferenceType": null,  // 可选：pain_point, priority_area, mixed
      "designInfo": {
        "stage": "opening|exploration|confirmation|closing",
        "expectedInsight": "预期获取的信息"
      }
    }
  ]
}

## 引用关系建立规则（强制执行）
当有访谈分析报告时，必须为每个问题建立精确引用：

1. **痛点验证问题**：
   - 设置 relatedPainPointIndex 为对应痛点假设的数组索引（如0、1、2...）
   - 设置 insightReferenceType = "pain_point"
   - relatedInsight 填写痛点假设的文本摘要

2. **领域探索问题**：
   - 设置 relatedPriorityAreaIndex 为对应优先领域的数组索引
   - 设置 insightReferenceType = "priority_area"
   - relatedInsight 填写领域描述

3. **场景理解问题**：
   - 设置 relatedBusinessScenarioKey 为对应业务场景特征文本
   - 设置 insightReferenceType = "business_scenario"
   - relatedInsight 填写场景特征描述

4. **综合问题**：
   - 如同时涉及多个分析点，设置 insightReferenceType = "mixed"
   - 在 relatedInsight 中说明涉及的多个分析点

## 核心问题判定标准（强制设置 isCore 字段）
- 直接验证高置信度痛点假设的问题 → 核心问题（isCore: true，必须设置 relatedPainPointIndex）
- 获取访谈目标关键信息的问题 → 核心问题（isCore: true）
- 验证业务场景关键特征的问题 → 核心问题（isCore: true，设置 relatedBusinessScenarioKey）
- 深入了解具体操作步骤和时间卡点 → 核心问题（isCore: true）
- 探索性、细节追问类问题 → 补充问题（isCore: false）
- 行业通用背景了解问题 → 补充问题（isCore: false）

**强制要求**：每个问题必须明确设置 isCore 字段（true 或 false）。`;

// ============================================
// POST - 生成访谈提纲
// ============================================

/**
 * @swagger
 * /api/ai/generate/outline:
 *   post:
 *     summary: AI生成访谈提纲
 *     description: 根据客户信息和访谈目标，AI自动生成结构化的访谈提纲，包括业务场景分析、业务流程梳理和问题列表。
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
 *         description: 访谈提纲生成成功
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
 *                       type: string
 *                       description: 业务场景分析
 *                     businessFlow:
 *                       type: string
 *                       description: 业务流程梳理
 *                     outline:
 *                       type: object
 *                       properties:
 *                         sections:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               name:
 *                                 type: string
 *                               questions:
 *                                 type: array
 *                                 items:
 *                                   type: string
 *                 message:
 *                   type: string
 *                   example: "访谈提纲生成成功"
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
    const body: GenerateOutlineInput = await request.json();

    // 获取用户ID（可选验证）
    const userId = await extractUserId(request, body);

    // 验证请求体
    const validationResult = generateOutlineSchema.safeParse(body);
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

    const { customerInfo, objective, background, focusAreas, insightReport } = validationResult.data;

    // 构建用户提示词
    // 如果有分析报告，优先使用分析报告中的洞察，并添加索引标注
    const insightSection = insightReport ? `
## 已完成的访谈分析报告（索引标注版）

### 业务场景分析
${insightReport.businessScenario.summary}

**关键特征**（用于引用）：
${insightReport.businessScenario.keyCharacteristics.map((c, i) => `[特征${i}] ${c}`).join('\n')}

**潜在挑战**：
${insightReport.businessScenario.potentialChallenges.map(c => `- ${c}`).join('\n')}

### 痛点假设（索引标注 - 必须使用索引建立引用）
${insightReport.painPointHypotheses
  .map((p, i) => `[痛点${i}] **${p.hypothesis}**（置信度：${p.confidence}，领域：${p.relatedArea}）\n  推断依据：${p.reasoning}`)
  .join('\n')}

### 访谈策略建议
${insightReport.interviewStrategy.approach}

**优先关注领域**（索引标注 - 必须使用索引建立引用）：
${insightReport.interviewStrategy.priorityAreas.map((a, i) => `[领域${i}] ${a}`).join('\n')}

**时间分配建议**：${insightReport.interviewStrategy.timeAllocation}

---

请基于以上分析，设计验证性的访谈问题。**强制要求**：
1. 每个核心问题必须设置 relatedPainPointIndex 或 relatedPriorityAreaIndex 或 relatedBusinessScenarioKey
2. 使用上述索引标注（如[痛点0]、[领域1]）建立精确引用关系
3. insightReferenceType 必须设置为：pain_point / priority_area / business_scenario / mixed
4. relatedInsight 填写对应分析点的文本摘要（用于前端显示）

确保核心问题能够：
- 验证高置信度痛点假设（设置 relatedPainPointIndex）
- 深入了解业务场景的关键特征（设置 relatedBusinessScenarioKey）
- 获取具体的步骤、时间和卡点信息
` : '';

    const userPrompt = `请为以下访谈场景生成核心问题和补充问题：

## 客户信息
- 客户名称：${customerInfo.name}${customerInfo.industry ? `\n- 所属行业：${customerInfo.industry}` : ''}
${customerInfo.description ? `- 公司描述：${customerInfo.description}` : ''}

## 访谈目标
${objective}

${background ? `## 访谈背景\n${background}` : ''}

${focusAreas && focusAreas.length > 0 ? `## 重点关注领域\n${focusAreas.map((area, i) => `${i + 1}. ${area}`).join('\n')}` : ''}

${insightSection}

请生成访谈问题，输出JSON格式。确保核心问题控制在3-7个。`;

    // 调用AI服务
    const aiClient = getAIClient();
    const response = await aiClient.generateCompletion(OUTLINE_SYSTEM_PROMPT, [
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
    let outlineData: CoreQuestionsResponse;
    try {
      // 提取JSON内容
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('AI返回的内容不包含有效的JSON');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      outlineData = coreQuestionsResponseSchema.parse(parsed);
    } catch (parseError) {
      console.error('[AI Outline] JSON解析失败:', parseError);
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

    return NextResponse.json<ApiResponse<CoreQuestionsResponse>>(
      {
        success: true,
        data: outlineData,
        message: '访谈问题生成成功',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[AI Outline API] 服务器错误:', error);

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
