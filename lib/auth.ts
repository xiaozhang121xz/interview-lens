import { jwtVerify, SignJWT } from 'jose';
import { NextRequest } from 'next/server';
import { randomUUID } from 'node:crypto';
import { getAccessToken } from '@/lib/auth-cookies';

// 用户登录信息（JWT内存储）
export interface UserLoginInfo {
  id: string;
  name: string;
  username: string;
  [key: string]: unknown;
}

function getRequiredSecret(name: 'JWT_SECRET' | 'REFRESH_SECRET'): Uint8Array {
  const value = process.env[name];
  if (!value || value.length < 32) {
    throw new Error(`${name} must be configured with at least 32 characters`);
  }
  return new TextEncoder().encode(value);
}

/**
 * 创建访问令牌
 * @param payload 用户信息
 */
export async function createAccessToken(payload: UserLoginInfo) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('24h') // 24小时过期（触发自动刷新机制）
    .sign(getRequiredSecret('JWT_SECRET'));
}

/**
 * 创建刷新令牌
 * @param payload 用户信息
 */
export async function issueRefreshToken(payload: UserLoginInfo) {
  const jti = randomUUID();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setJti(jti)
    .setExpirationTime('30d') // 30天过期（给用户足够续期时间）
    .sign(getRequiredSecret('REFRESH_SECRET'));

  return { token, jti, expiresAt };
}

/**
 * 验证访问令牌
 * @param token JWT token
 * @returns payload 或 null（token 无效或过期）
 */
export const verifyToken = async (token: string): Promise<any> => {
  try {
    const { payload } = await jwtVerify(token, getRequiredSecret('JWT_SECRET'));
    return payload;
  } catch (err: any) {
    // 区分不同类型的错误
    if (err?.code === 'ERR_JWT_EXPIRED') {
      console.log('Token已过期，请重新登录');
    } else if (err?.code === 'ERR_JWS_INVALID') {
      console.log('Token格式无效');
    } else {
      console.log('Token验证失败:', err?.message || err);
    }
    return null;
  }
};

/**
 * 验证刷新令牌
 * @param token 刷新令牌
 */
export const verifyRefreshToken = async (token: string) => {
  try {
    const { payload } = await jwtVerify(token, getRequiredSecret('REFRESH_SECRET'));
    return payload;
  } catch (err) {
    console.log('RefreshToken验证失败:', err);
    return null;
  }
};

/**
 * 从请求中获取当前用户ID（通过 JWT Token）
 */
async function getCurrentUserId(
  request: NextRequest
): Promise<string | null> {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.substring(7)
      : getAccessToken(request);
    if (!token) {
      return null;
    }
    const payload = await verifyToken(token);

    return payload?.id || null;
  } catch {
    return null;
  }
}

/**
 * 从请求头或请求体获取用户ID
 *
 * 只接受经过签名验证的 Authorization Bearer Token。
 *
 * @param request Next.js 请求对象
 * @param body 可选的请求体对象
 * @returns 用户ID
 * @throws Error('UNAUTHORIZED') 如果无法获取用户ID
 */
export async function extractUserId(
  request: NextRequest,
  _body?: Record<string, unknown>
): Promise<string> {
  const headerUserId = await getCurrentUserId(request);
  if (headerUserId) {
    return headerUserId;
  }
  throw new Error('UNAUTHORIZED');
}
