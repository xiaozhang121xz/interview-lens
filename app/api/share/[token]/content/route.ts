/**
 * 获取分享内容API
 * GET /api/share/[token]/content
 *
 * 功能：
 * - 验证token有效性
 * - 根据配置获取访谈内容
 * - 返回分享的内容数据
 * - 公开访问，无需认证
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { ShareStatus } from '@/lib/validations/share';

interface RouteParams {
  params: Promise<{ token: string }>;
}

/**
 * GET - 获取分享内容
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params;

    // 1. 基本token验证
    if (!token || token.length < 8 || token.length > 32) {
      return NextResponse.json(
        { success: false, error: '无效的分享链接格式' },
        { status: 400 }
      );
    }

    // 2. 查询并验证分享记录
    const shareRecord = await prisma.shareRecord.findUnique({
      where: { token },
    });

    if (!shareRecord) {
      return NextResponse.json(
        { success: false, error: '分享链接不存在' },
        { status: 404 }
      );
    }

    // 3. 检查状态和过期
    if (shareRecord.status !== ShareStatus.ACTIVE) {
      const error =
        shareRecord.status === ShareStatus.EXPIRED
          ? '分享链接已过期'
          : '分享链接已被撤销';
      return NextResponse.json(
        { success: false, error },
        { status: 403 }
      );
    }

    if (shareRecord.expiresAt && shareRecord.expiresAt < new Date()) {
      return NextResponse.json(
        { success: false, error: '分享链接已过期' },
        { status: 403 }
      );
    }

    // 4. 获取访谈基本信息
    const interview = await prisma.interviewProject.findUnique({
      where: { id: shareRecord.interviewId },
      include: {
        customer: true,
      },
    });

    if (!interview) {
      return NextResponse.json(
        { success: false, error: '访谈项目不存在' },
        { status: 404 }
      );
    }

    // 5. 根据配置获取内容
    const content: Record<string, unknown> = {
      interview: {
        id: interview.id,
        title: interview.title,
        objective: interview.objective,
        background: interview.background,
        interviewDate: interview.interviewDate,
        customer: interview.customer
          ? {
              name: interview.customer.name,
              industry: interview.customer.industry,
              description: interview.customer.description,
            }
          : null,
      },
    };

    // 获取PRD文档
    if (shareRecord.includePRD) {
      const prdDocuments = await prisma.pRDDocument.findMany({
        where: { projectId: shareRecord.interviewId },
        orderBy: { createdAt: 'desc' },
        take: 1,
      });
      if (prdDocuments.length > 0) {
        content.prd = {
          title: prdDocuments[0].title,
          content: prdDocuments[0].content,
          version: prdDocuments[0].version,
        };
      }
    }

    // 获取用户画像
    if (shareRecord.includePersona) {
      const personas = await prisma.userPersona.findMany({
        where: { projectId: shareRecord.interviewId },
        orderBy: { createdAt: 'desc' },
        take: 1,
      });
      if (personas.length > 0) {
        content.persona = {
          name: personas[0].name,
          role: personas[0].role,
          demographics: personas[0].demographics
            ? JSON.parse(personas[0].demographics)
            : null,
          goals: personas[0].goals ? JSON.parse(personas[0].goals) : [],
          painPoints: personas[0].painPoints
            ? JSON.parse(personas[0].painPoints)
            : [],
          behaviors: personas[0].behaviors
            ? JSON.parse(personas[0].behaviors)
            : [],
          quotes: personas[0].quotes ? JSON.parse(personas[0].quotes) : [],
        };
      }
    }

    // 获取用户旅程图
    if (shareRecord.includeJourneyMap) {
      const journeyMaps = await prisma.userJourneyMap.findMany({
        where: { projectId: shareRecord.interviewId },
        orderBy: { createdAt: 'desc' },
        take: 1,
      });
      if (journeyMaps.length > 0) {
        const jm = journeyMaps[0];
        const stages = jm.stages ? JSON.parse(jm.stages) : [];
        const actions = jm.actions ? JSON.parse(jm.actions) : null;
        const emotions = jm.emotions ? JSON.parse(jm.emotions) : null;
        const painPoints = jm.painPoints ? JSON.parse(jm.painPoints) : null;
        const opportunities = jm.opportunities
          ? JSON.parse(jm.opportunities)
          : null;

        content.journeyMap = {
          id: jm.id,
          title: jm.title,
          // 确保stages有必需的description字段
          stages: stages.map((s: any) => ({
            name: s.name,
            description: s.description || '',
          })),
          // 确保actions有必需的detail字段
          actions: actions
            ? actions.map((a: any) => ({
                stage: a.stage,
                action: a.action,
                detail: a.detail || '',
              }))
            : null,
          // 确保emotions有必需的reason字段
          emotions: emotions
            ? emotions.map((e: any) => ({
                stage: e.stage,
                emotion: e.emotion,
                intensity: e.intensity || 3,
                reason: e.reason || '',
              }))
            : null,
          // 确保painPoints使用正确的frequency值
          painPoints: painPoints
            ? painPoints.map((p: any) => ({
                stage: p.stage,
                painPoint: p.painPoint,
                severity: p.severity || 'medium',
                frequency:
                  p.frequency === 'rare'
                    ? 'rarely'
                    : p.frequency === 'occasional'
                      ? 'sometimes'
                      : p.frequency === 'frequent'
                        ? 'often'
                        : p.frequency || 'sometimes',
              }))
            : null,
          opportunities: opportunities
            ? opportunities.map((o: any) => ({
                stage: o.stage,
                opportunity: o.opportunity,
                potential: o.potential || 'medium',
                effort: o.effort || 'medium',
              }))
            : null,
        };
      }
    }

    // 获取AI洞察
    if (shareRecord.includeInsights) {
      const insights = await prisma.aIInsight.findMany({
        where: { projectId: shareRecord.interviewId },
        orderBy: { createdAt: 'desc' },
      });
      if (insights.length > 0) {
        content.insights = insights.map((insight) => ({
          type: insight.type,
          content: insight.content,
          createdAt: insight.createdAt,
        }));
      }
    }

    // 获取访谈记录
    if (shareRecord.includeRecords) {
      const records = await prisma.interviewRecord.findMany({
        where: { projectId: shareRecord.interviewId },
        orderBy: { createdAt: 'asc' },
      });
      if (records.length > 0) {
        content.records = records.map((record) => ({
          content: record.content,
          type: record.type,
          isHighlight: record.isHighlight,
          source: record.source,
          createdAt: record.createdAt,
        }));
      }
    }

    // 6. 更新访问统计
    await prisma.shareRecord.update({
      where: { token },
      data: {
        viewCount: shareRecord.viewCount + 1,
        lastViewedAt: new Date(),
      },
    });

    // 7. 返回内容
    return NextResponse.json({
      success: true,
      content,
      config: {
        includePRD: shareRecord.includePRD,
        includePersona: shareRecord.includePersona,
        includeJourneyMap: shareRecord.includeJourneyMap,
        includeInsights: shareRecord.includeInsights,
        includeRecords: shareRecord.includeRecords,
      },
    });
  } catch (error) {
    console.error('[Share/Content] Error:', error);
    return NextResponse.json(
      { success: false, error: '获取分享内容失败' },
      { status: 500 }
    );
  }
}