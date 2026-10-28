/**
 * 验证码登录API
 *
 * POST /api/auth/verify-code
 *
 * 验证码登录/注册（首次登录自动创建用户）
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyCodeSchema } from '@/lib/schemas/auth';
import { verifyAndConsumeCode } from '@/lib/services/verification-code';
import { createAccessToken, issueRefreshToken } from '@/lib/auth';
import { prisma, UserDataManager } from '@/lib/db';
import { setAuthCookies } from '@/lib/auth-cookies';

export async function POST(request: NextRequest) {
  try {
    // 解析请求体
    const body = await request.json();

    // 验证请求数据
    const validatedData = verifyCodeSchema.parse(body);

    // 验证验证码
    if (!(await verifyAndConsumeCode(validatedData.phone, validatedData.code))) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_CODE',
            message: '验证码错误',
          },
        },
        { status: 400 }
      );
    }

    // 查找或创建用户
    let user = await UserDataManager.getByPhone(validatedData.phone);

    if (!user) {
      // 首次登录，自动创建用户
      user = await UserDataManager.create({
        phone: validatedData.phone,
        nickname: `用户${validatedData.phone.substring(7)}`, // 默认昵称：用户+手机号后4位
        status: 'active',
      });
    }

    if (!user) {
      throw new Error('Failed to create or retrieve user');
    }

    // 生成JWT Token（使用旧系统lib/auth.ts，确保与业务API兼容）
    const token = await createAccessToken({
      id: user.id,
      name: user.nickname || `用户${user.phone?.substring(7) || '0000'}`,
      username: user.phone || '',
    });
    const issuedRefreshToken = await issueRefreshToken({
      id: user.id,
      name: user.nickname || `用户${user.phone?.substring(7) || '0000'}`,
      username: user.phone || '',
    });
    await prisma.refreshSession.create({
      data: {
        jti: issuedRefreshToken.jti,
        userId: user.id,
        expiresAt: issuedRefreshToken.expiresAt,
        revokedAt: null,
      },
    });

    // 返回成功响应
    const response = NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          phone: user.phone,
          nickname: user.nickname,
          createdAt: user.createdAt,
        },
      },
      { status: 200 }
    );
    setAuthCookies(response, token, issuedRefreshToken.token);
    return response;
  } catch (error) {
    // Zod验证错误
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: error.message,
          },
        },
        { status: 400 }
      );
    }

    // 其他错误
    console.error('Verify code error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '登录失败',
        },
      },
      { status: 500 }
    );
  }
}
