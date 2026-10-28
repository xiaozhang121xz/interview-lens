/**
 * 创建分享链接API
 * POST /api/share/create
 *
 * 功能：
 * - 验证用户权限和访谈所有权
 * - 生成唯一分享token
 * - 创建分享记录
 * - 返回分享链接
 */

import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { prisma } from '@/lib/db';
import { createShareSchema, ShareStatus } from '@/lib/validations/share';
import { verifyToken } from '@/lib/auth';

// 分享链接基础URL
const SHARE_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || '';

/**
 * POST - 创建分享链接
 */
export async function POST(request: NextRequest) {
  try {
    // 1. 验证用户认证
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: '未授权访问' },
        { status: 401 }
      );
    }

    const jwtToken = authHeader.substring(7);
    const payload = await verifyToken(jwtToken);
    if (!payload) {
      return NextResponse.json(
        { success: false, error: 'Token无效或已过期' },
        { status: 401 }
      );
    }

    const currentUserId = payload.id as string;

    // 2. 解析请求体
    const body = await request.json();
    const validationResult = createShareSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: '请求参数验证失败',
          details: validationResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { interviewId, userId, config, expiresIn } = validationResult.data;

    // 3. 验证用户ID一致性
    if (currentUserId !== userId) {
      return NextResponse.json(
        { success: false, error: '用户ID不匹配' },
        { status: 403 }
      );
    }

    // 4. 验证访谈所有权
    const interview = await prisma.interviewProject.findFirst({
      where: {
        id: interviewId,
        userId: userId,
      },
      include: {
        prdDocuments: true,
        personas: true,
        journeyMaps: true,
        insights: true,
      },
    });

    if (!interview) {
      return NextResponse.json(
        { success: false, error: '访谈不存在或无权限访问' },
        { status: 404 }
      );
    }

    // 5. 检查访谈状态（必须已完成）
    if (interview.status !== 'completed') {
      return NextResponse.json(
        { success: false, error: '访谈尚未完成，无法分享' },
        { status: 400 }
      );
    }

    // 6. 检查是否有AI生成内容
    const hasContent =
      interview.prdDocuments.length > 0 ||
      interview.personas.length > 0 ||
      interview.journeyMaps.length > 0 ||
      interview.insights.length > 0;

    if (!hasContent) {
      return NextResponse.json(
        { success: false, error: '访谈尚未生成任何内容，请先生成PRD、画像或旅程图' },
        { status: 400 }
      );
    }

    // 7. 生成分享token（12位URL安全字符串）
    const shareToken = nanoid(12);

    // 8. 计算过期时间
    const expiresAt = expiresIn
      ? new Date(Date.now() + expiresIn * 60 * 60 * 1000)
      : null;

    // 9. 合并默认配置和用户配置
    const shareConfig = {
      includePRD: config?.includePRD ?? true,
      includePersona: config?.includePersona ?? true,
      includeJourneyMap: config?.includeJourneyMap ?? true,
      includeInsights: config?.includeInsights ?? true,
      includeRecords: config?.includeRecords ?? false,
    };

    // 10. 创建分享记录
    const shareRecord = await prisma.shareRecord.create({
      data: {
        token: shareToken,
        interviewId,
        userId,
        includePRD: shareConfig.includePRD,
        includePersona: shareConfig.includePersona,
        includeJourneyMap: shareConfig.includeJourneyMap,
        includeInsights: shareConfig.includeInsights,
        includeRecords: shareConfig.includeRecords,
        status: ShareStatus.ACTIVE,
        expiresAt,
        viewCount: 0,
      },
    });

    // 11. 构建分享URL
    const shareUrl = `${SHARE_BASE_URL}/share/${shareToken}`;

    // 12. 返回结果
    return NextResponse.json({
      success: true,
      data: {
        token: shareRecord.token,
        shareUrl,
        expiresAt: shareRecord.expiresAt?.toISOString() || null,
        config: shareConfig,
      },
    });
  } catch (error) {
    console.error('[Share/Create] Error:', error);
    return NextResponse.json(
      { success: false, error: '创建分享链接失败' },
      { status: 500 }
    );
  }
}