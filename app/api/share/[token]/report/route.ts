/**
 * 获取分享报告内容API
 * GET /api/share/[token]/report
 *
 * 功能：
 * - 验证分享token
 * - 返回报告内容
 */

import { NextRequest, NextResponse } from 'next/server';
import { getShareReport, validateShareToken } from '@/lib/services/share-report-storage';

interface RouteParams {
  params: Promise<{ token: string }>;
}

/**
 * GET - 获取分享报告内容
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json(
        { success: false, error: '缺少分享token' },
        { status: 400 }
      );
    }

    // 1. 验证token
    const validation = await validateShareToken(token);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error || '分享链接无效' },
        { status: 404 }
      );
    }

    // 2. 获取报告内容
    const reportContent = await getShareReport(token);

    if (!reportContent) {
      return NextResponse.json(
        { success: false, error: '报告内容不存在或已过期' },
        { status: 404 }
      );
    }

    // 3. 返回报告内容
    return NextResponse.json({
      success: true,
      data: reportContent,
    });
  } catch (error) {
    console.error('[ShareReport/Get] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '获取报告失败',
      },
      { status: 500 }
    );
  }
}