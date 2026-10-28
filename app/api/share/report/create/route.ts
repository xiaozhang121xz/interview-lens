/**
 * 创建分享报告API
 * POST /api/share/report/create
 *
 * 功能：
 * - 聚合访谈数据
 * - 调用大模型生成PPT大纲内容（14页结构）
 * - 创建分享记录
 * - 返回分享链接
 * - 支持版本管理（新建/覆盖模式）
 * - 支持生成方案选择（模板/LLM）
 * - 支持PPT大纲结构模式（经典14页 / 客户沟通10页）
 */

import { NextRequest, NextResponse } from 'next/server';
import { rm } from 'node:fs/promises';
import { extractUserId } from '@/lib/auth';
import {
  aggregateShareReportData,
  validateDataCompleteness,
} from '@/lib/services/share-report-aggregator';
import { generatePPTOutline } from '@/lib/services/ppt-outline-generator';
import { generatePPTOutlineWithLLM } from '@/lib/services/ppt-outline-generator-llm';
import {
  createShareReport,
  getShareReportHistory,
  updateShareReportSlidesArtifact,
} from '@/lib/services/share-report-storage';
import { persistShareReportSlidesArtifacts } from '@/lib/services/share-report-artifacts';
import type { PPTOutlineMode } from '@/lib/types/ppt-outline';
import { runShareReportAgent } from '@/lib/agent/share-report-agent';
import { executeSkill } from '@/lib/skills/registry';

// 统一的API响应类型
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
  };
  warnings?: string[];
}

interface PptGenerationSummary {
  requested: boolean;
  requestedEngine: 'native' | 'slides' | 'auto';
  agent: {
    action: 'invoke_skill' | 'skip';
    skill?: 'slides';
    reason: string;
    source: 'rule' | 'llm' | 'fallback';
    warnings: string[];
  };
  triggered: boolean;
  execution?: {
    skill: string;
    success: boolean;
    mode: 'native' | 'slides';
    slideCount: number;
    imageCount: number;
    blobSizeBytes: number;
    generatedAt: string;
    skillResourceAvailable: boolean;
    skillResourcePath: string;
    warnings: string[];
    validation?: {
      enabled: boolean;
      executed: boolean;
      warnings: string[];
    };
    error?: string;
  };
}

/**
 * POST - 创建分享报告
 *
 * @swagger
 * /api/share/report/create:
 *   post:
 *     summary: 创建分享报告
 *     description: 聚合访谈数据，调用大模型生成报告内容，创建分享记录。支持新建或覆盖模式。
 *     tags: [ShareReports]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               interviewId:
 *                 type: string
 *                 description: 访谈项目ID
 *               expiresIn:
 *                 type: integer
 *                 nullable: true
 *                 description: 有效期（小时数）
 *               generationType:
 *                 type: string
 *                 enum: [template, llm]
 *                 default: template
 *                 description: 生成方案（模板方案快速稳定，LLM方案智能有洞察力）
 *               mode:
 *                 type: string
 *                 enum: [new, overwrite]
 *                 default: new
 *                 description: 创建模式（新建或覆盖上次报告）
 *               outlineMode:
 *                 type: string
 *                 enum: [classic, customer_next_meeting]
 *                 default: classic
 *                 description: PPT大纲结构模式
 *     responses:
 *       200:
 *         description: 创建成功
 *       400:
 *         description: 参数错误或数据不完整
 *       401:
 *         description: 未授权访问
 *       500:
 *         description: 服务器内部错误
 */
export async function POST(request: NextRequest) {
  try {
    // 1. 验证用户认证（使用统一认证函数）
    let currentUserId: string;
    try {
      currentUserId = await extractUserId(request);
    } catch {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          message: '未授权访问',
          error: { code: 'UNAUTHORIZED', message: '请先登录' },
        },
        { status: 401 }
      );
    }

    // 2. 解析请求体
    const body = await request.json();
    const {
      interviewId,
      expiresIn,
      generationType = 'template',
      mode = 'new',
      outlineMode = 'classic',
      generatePpt = false,
      pptEngine = 'auto',
    } = body as {
      interviewId?: string;
      expiresIn?: number;
      generationType?: 'template' | 'llm';
      mode?: 'new' | 'overwrite';
      outlineMode?: PPTOutlineMode;
      generatePpt?: boolean;
      pptEngine?: 'native' | 'slides' | 'auto';
    };

    if (!interviewId) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          message: '参数错误',
          error: { code: 'MISSING_ID', message: '缺少访谈ID' },
        },
        { status: 400 }
      );
    }

    // 验证 mode 参数
    if (mode !== 'new' && mode !== 'overwrite') {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          message: '参数错误',
          error: { code: 'INVALID_MODE', message: '无效的创建模式，可选值：new, overwrite' },
        },
        { status: 400 }
      );
    }

    // 验证 generationType 参数
    if (generationType !== 'template' && generationType !== 'llm') {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          message: '参数错误',
          error: { code: 'INVALID_GENERATION_TYPE', message: '无效的生成方案，可选值：template, llm' },
        },
        { status: 400 }
      );
    }

    if (outlineMode !== 'classic' && outlineMode !== 'customer_next_meeting') {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          message: '参数错误',
          error: {
            code: 'INVALID_OUTLINE_MODE',
            message: '无效的大纲模式，可选值：classic, customer_next_meeting',
          },
        },
        { status: 400 }
      );
    }

    if (pptEngine !== 'native' && pptEngine !== 'slides' && pptEngine !== 'auto') {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          message: '参数错误',
          error: {
            code: 'INVALID_PPT_ENGINE',
            message: '无效的 PPT 引擎，可选值：native, slides, auto',
          },
        },
        { status: 400 }
      );
    }

    // 3. 检查历史报告（用于提示用户）
    const historyReports = await getShareReportHistory(interviewId, currentUserId);
    const hasHistory = historyReports.length > 0;

    // 如果选择覆盖但没有历史报告，自动切换为新建模式
    const actualMode = mode === 'overwrite' && !hasHistory ? 'new' : mode;

    // 4. 聚合数据
    console.log(`[ShareReport] Preparing data for interview: ${interviewId}`);
    const aggregatedData = await aggregateShareReportData(interviewId);

    // 5. 验证数据完整性
    const validation = validateDataCompleteness(aggregatedData);
    if (!validation.isValid) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          message: '数据不完整',
          error: { code: 'INCOMPLETE_DATA', message: validation.missingData.join('、') },
          warnings: validation.warnings,
        },
        { status: 400 }
      );
    }

    // 6. 根据生成方案选择生成方式
    console.log(`[ShareReport] Step A: generating outline (generationType=${generationType}, outlineMode=${outlineMode})`);
    let pptOutline;
    let actualGenerationType = generationType;
    const warnings: string[] = [];

    if (generationType === 'llm') {
      try {
        // 使用LLM方案（更智能、有洞察力）
        if (outlineMode === 'classic') {
          pptOutline = await generatePPTOutlineWithLLM(aggregatedData);
        } else {
          pptOutline = await generatePPTOutline(aggregatedData, outlineMode);
          actualGenerationType = 'template';
          warnings.push('客户沟通型大纲当前仅支持模板方案，已自动切换为模板生成');
        }
      } catch (llmError) {
        // LLM失败时自动fallback到模板方案
        const errorMessage = llmError instanceof Error ? llmError.message : String(llmError);
        console.warn('[ShareReport] LLM generation failed, falling back to template:', errorMessage);
        // 使用模板方案作为fallback
        pptOutline = await generatePPTOutline(aggregatedData, outlineMode);
        actualGenerationType = 'template';
        // 添加警告信息，通知用户发生了fallback
        warnings.push(`AI智能方案生成失败（${errorMessage}），已自动切换为模板方案`);
      }
    } else {
      // 使用模板方案（快速、稳定）
      pptOutline = await generatePPTOutline(aggregatedData, outlineMode);
    }
    console.log(`[ShareReport] Step A completed: outline generated (actualGenerationType=${actualGenerationType})`);

    // 7. 创建分享记录
    console.log(`[ShareReport] Step B/C: storing report and share record (createMode=${actualMode})`);
    const { token, shareUrl, reportId } = await createShareReport({
      interviewId,
      userId: currentUserId,
      aggregatedData,
      pptOutline,
      expiresIn,
      generationType: actualGenerationType,
      mode: actualMode,
    });
    console.log(`[ShareReport] Step B/C completed: report stored and share record ready (reportId=${reportId}, token=${token})`);

    let pptGeneration: PptGenerationSummary | undefined;
    if (generatePpt) {
      console.log(`[ShareReport] PPT generation requested (engine=${pptEngine})`);
      const agentAction = await runShareReportAgent({
        interviewId,
        generationType: actualGenerationType,
        requestedEngine: pptEngine,
        outline: pptOutline,
      });

      pptGeneration = {
        requested: true,
        requestedEngine: pptEngine,
        agent: {
          action: agentAction.action,
          skill: agentAction.action === 'invoke_skill' ? agentAction.skill : undefined,
          reason: agentAction.reason,
          source: agentAction.source,
          warnings: agentAction.warnings,
        },
        triggered: agentAction.action === 'invoke_skill',
      };

      if (agentAction.warnings.length > 0) {
        warnings.push(...agentAction.warnings);
      }

      if (agentAction.action === 'invoke_skill') {
        console.log(`[ShareReport] Step D: building slides deck via skill (engine=${agentAction.payload.mode})`);
        const execution = await executeSkill(agentAction.skill, {
          outline: pptOutline,
          ...agentAction.payload,
        });

        if (execution.result) {
          pptGeneration.execution = {
            skill: execution.skill,
            ...execution.result,
          };
        }

        if (execution.result?.success) {
          console.log(
            `[ShareReport] Step D completed: slides deck built (slides=${execution.result.slideCount}, images=${execution.result.imageCount})`
          );
          if (execution.result.mode === 'slides') {
            console.log(
              `[ShareReport] Step E: slides rendered (${execution.result.renderedSlidePaths?.length ?? 0} PNG files)`
            );
            console.log(
              `[ShareReport] Step E completed: slides rendered (${execution.result.renderedSlidePaths?.length ?? 0} PNG files)`
            );
          }
        }

        try {
          if (execution.result?.artifactDir && execution.result?.artifactPath) {
            if (execution.result.success) {
              console.log(`[ShareReport] Step F: persisting slides artifacts (reportId=${reportId})`);
              const slidesArtifact = await persistShareReportSlidesArtifacts({
                reportId,
                mode: execution.result.mode,
                generatedAt: execution.result.generatedAt,
                deckPath: execution.result.artifactPath,
                renderedSlidePaths: execution.result.renderedSlidePaths,
              });

              const updated = await updateShareReportSlidesArtifact(reportId, slidesArtifact);
              if (!updated) {
                warnings.push('slides 真实产物已生成，但写回报告内容失败，公开页将继续使用 outline 渲染');
              } else {
                console.log(
                  `[ShareReport] Step F completed: artifacts persisted (deck=${slidesArtifact.hasDeck}, renderedSlides=${slidesArtifact.slideCount})`
                );
              }
            }

            await rm(execution.result.artifactDir, { recursive: true, force: true });
          }
        } catch (artifactError) {
          warnings.push(
            `slides 真实产物持久化失败（${artifactError instanceof Error ? artifactError.message : '未知错误'}）`
          );
        }

        if (!execution.success || !execution.result?.success) {
          warnings.push(
            `PPT预生成失败（${execution.error || execution.result?.error || '未知错误'}），分享报告已正常创建`
          );
        } else if (execution.result.warnings.length > 0) {
          warnings.push(...execution.result.warnings);
        }
      }
    }

    // 8. 返回结果
    return NextResponse.json({
      success: true,
      data: {
        token,
        shareUrl,
        reportId,
        expiresAt: expiresIn
          ? new Date(Date.now() + expiresIn * 3600000).toISOString()
          : null,
        generationType: actualGenerationType,
        outlineMode,
        mode: actualMode,
        hasHistory,
        historyCount: historyReports.length,
        pptGeneration,
        warnings: warnings.length > 0 ? warnings : (validation.warnings.length > 0 ? validation.warnings : undefined),
      },
    });
  } catch (error) {
    console.error('[ShareReport/Create] Error:', error);
    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        message: '服务器内部错误',
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : '创建分享报告失败',
        },
      },
      { status: 500 }
    );
  }
}
