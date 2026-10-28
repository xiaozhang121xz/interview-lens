/**
 * Token刷新API
 *
 * POST /api/auth/refresh
 *
 * 使用refreshToken获取新的accessToken和refreshToken
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  verifyRefreshToken,
  createAccessToken,
  issueRefreshToken,
} from '@/lib/auth';
import type { UserLoginInfo } from '@/lib/auth';
import { prisma } from '@/lib/db';
import {
  clearAuthCookies,
  getRefreshToken,
  setAuthCookies,
} from '@/lib/auth-cookies';

/**
 * 验证请求体
 */
function getBodyToken(body: unknown): string | null {
  if (
    body !== null &&
    typeof body === 'object' &&
    'token' in body &&
    typeof (body as { token: unknown }).token === 'string'
  ) {
    return (body as { token: string }).token.trim() || null;
  }
  return null;
}

function unauthorized(code: string, message: string) {
  const response = NextResponse.json(
    { success: false, error: { code, message } },
    { status: 401 }
  );
  clearAuthCookies(response);
  return response;
}

function hasObjectBody(body: unknown): boolean {
  return (
    body !== null &&
    typeof body === 'object'
  );
}

export async function POST(request: NextRequest) {
  try {
    // 解析请求体
    const body = await request.json().catch(() => ({}));
    if (!hasObjectBody(body)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: '请求格式错误',
          },
        },
        { status: 400 }
      );
    }

    const token = getRefreshToken(request) || getBodyToken(body);
    if (!token) return unauthorized('INVALID_TOKEN', 'Refresh token缺失');

    // 使用lib/auth.ts验证refreshToken
    const payload = await verifyRefreshToken(token);

    if (!payload) {
      return unauthorized('INVALID_TOKEN', 'Refresh token无效或已过期');
    }

    const userId = payload.id as string | undefined;
    const jti = payload.jti;
    if (!userId || !jti) {
      return unauthorized('INVALID_TOKEN', 'Refresh token无效');
    }

    // 单次使用刷新令牌：原子撤销，阻止旧令牌重放
    const revoked = await prisma.refreshSession.updateMany({
      where: {
        jti,
        userId,
        OR: [
          { revokedAt: null },
          { revokedAt: { isSet: false } },
        ],
        expiresAt: { gt: new Date() },
      },
      data: { revokedAt: new Date() },
    });
    if (revoked.count !== 1) {
      return unauthorized('TOKEN_REUSED', 'Refresh token已失效');
    }

    // 刷新时重新确认账号仍然存在且处于激活状态
    const [loginUser, phoneUser] = await Promise.all([
      prisma.loginUser.findUnique({ where: { id: userId } }),
      prisma.user.findUnique({ where: { id: userId } }),
    ]);
    const activeUser = loginUser || phoneUser;
    if (!activeUser || activeUser.status !== 'active') {
      return unauthorized('ACCOUNT_DISABLED', '账号不存在或已停用');
    }

    // 构造用户信息用于生成新Token
    const userPayload: UserLoginInfo = {
      id: userId,
      name: payload.name as string,
      username: payload.username as string,
      email: '',
      role: '',
    };

    // 生成新的双Token
    const newAccessToken = await createAccessToken(userPayload);
    const issuedRefreshToken = await issueRefreshToken(userPayload);
    await prisma.refreshSession.create({
      data: {
        jti: issuedRefreshToken.jti,
        userId,
        expiresAt: issuedRefreshToken.expiresAt,
        revokedAt: null,
      },
    });

    // 返回成功响应（与登录API格式一致）
    const response = NextResponse.json(
      {
        success: true,
        expiresIn: 24 * 60 * 60, // 24小时（秒）
      },
      { status: 200 }
    );
    setAuthCookies(response, newAccessToken, issuedRefreshToken.token);
    return response;
  } catch (error) {
    // JSON解析错误
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_JSON',
            message: 'Invalid JSON format',
          },
        },
        { status: 400 }
      );
    }

    // 其他错误
    console.error('[Refresh API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        },
      },
      { status: 500 }
    );
  }
}
