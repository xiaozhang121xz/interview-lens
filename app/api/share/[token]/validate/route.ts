/**
 * 验证分享Token API
 * GET /api/share/[token]/validate
 *
 * 功能：
 * - 验证分享token有效性
 * - 检查状态和过期时间
 * - 更新访问统计
 * - 公开访问，无需认证
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { ShareStatus } from '@/lib/validations/share';

interface RouteParams {
  params: Promise<{ token: string }>;
}

/**
 * GET - 验证分享Token
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params;

    // 1. 基本token验证
    if (!token || token.length < 8 || token.length > 32) {
      return NextResponse.json(
        { valid: false, reason: '无效的分享链接格式' },
        { status: 400 }
      );
    }

    // 2. 查询分享记录
    const shareRecord = await prisma.shareRecord.findUnique({
      where: { token },
    });

    // 3. 检查记录是否存在
    if (!shareRecord) {
      return NextResponse.json(
        { valid: false, reason: '分享链接不存在' },
        { status: 404 }
      );
    }

    // 4. 检查状态
    if (shareRecord.status !== ShareStatus.ACTIVE) {
      const reason =
        shareRecord.status === ShareStatus.EXPIRED
          ? '分享链接已过期'
          : '分享链接已被撤销';
      return NextResponse.json(
        { valid: false, reason },
        { status: 403 }
      );
    }

    // 5. 检查过期时间
    if (shareRecord.expiresAt && shareRecord.expiresAt < new Date()) {
      // 更新状态为过期
      await prisma.shareRecord.update({
        where: { token },
        data: { status: ShareStatus.EXPIRED },
      });
      return NextResponse.json(
        { valid: false, reason: '分享链接已过期' },
        { status: 403 }
      );
    }

    // 6. 更新访问统计
    await prisma.shareRecord.update({
      where: { token },
      data: {
        viewCount: shareRecord.viewCount + 1,
        lastViewedAt: new Date(),
      },
    });

    // 7. 返回验证结果
    return NextResponse.json({
      valid: true,
      interviewId: shareRecord.interviewId,
      config: {
        includePRD: shareRecord.includePRD,
        includePersona: shareRecord.includePersona,
        includeJourneyMap: shareRecord.includeJourneyMap,
        includeInsights: shareRecord.includeInsights,
        includeRecords: shareRecord.includeRecords,
      },
    });
  } catch (error) {
    console.error('[Share/Validate] Error:', error);
    return NextResponse.json(
      { valid: false, reason: '验证分享链接失败' },
      { status: 500 }
    );
  }
}