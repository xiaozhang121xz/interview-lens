import { NextRequest, NextResponse } from 'next/server';
import { verifyRefreshToken } from '@/lib/auth';
import { prisma } from '@/lib/db';
import {
  clearAuthCookies,
  getRefreshToken,
} from '@/lib/auth-cookies';

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as
    | { token?: unknown }
    | null;
  const token =
    getRefreshToken(request) ||
    (body && typeof body.token === 'string' ? body.token : null);

  const payload = token ? await verifyRefreshToken(token) : null;
  if (payload?.jti && payload.id) {
    await prisma.refreshSession.updateMany({
      where: {
        jti: payload.jti,
        userId: payload.id as string,
        OR: [
          { revokedAt: null },
          { revokedAt: { isSet: false } },
        ],
      },
      data: { revokedAt: new Date() },
    });
  }

  // 登出保持幂等，不暴露令牌是否曾存在
  const response = NextResponse.json({ success: true });
  clearAuthCookies(response);
  return response;
}
