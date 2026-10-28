import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { ACCESS_TOKEN_COOKIE } from '@/lib/auth-cookies';

const PUBLIC_AUTH_PATHS = new Set([
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/send-code',
  '/api/auth/verify-code',
  '/api/auth/refresh',
]);
const PUBLIC_HEALTH_PATHS = new Set(['/api/system/db-status']);

function isPublicShareRead(request: NextRequest): boolean {
  if (request.method !== 'GET') return false;
  return /^\/api\/share\/[^/]+\/(content|report|validate|rendered-slides\/\d+)$/.test(
    request.nextUrl.pathname
  );
}

function getClientKey(request: NextRequest): string {
  return (
    request.headers.get('x-real-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  );
}

function rateLimitResponse(retryAfterSeconds: number) {
  return NextResponse.json(
    { error: 'Too many requests' },
    {
      status: 429,
      headers: { 'Retry-After': String(retryAfterSeconds) },
    }
  );
}

export async function proxy(request: NextRequest) {
  if (request.method === 'OPTIONS') return NextResponse.next();

  if (PUBLIC_AUTH_PATHS.has(request.nextUrl.pathname)) {
    const limits: Record<string, { limit: number; windowMs: number }> = {
      '/api/auth/login': { limit: 10, windowMs: 60_000 },
      '/api/auth/register': { limit: 5, windowMs: 60 * 60_000 },
      '/api/auth/send-code': { limit: 5, windowMs: 10 * 60_000 },
      '/api/auth/verify-code': { limit: 10, windowMs: 10 * 60_000 },
      '/api/auth/refresh': { limit: 30, windowMs: 10 * 60_000 },
    };
    const policy = limits[request.nextUrl.pathname];
    if (policy) {
      const result = checkRateLimit(
        `public:${request.nextUrl.pathname}:${getClientKey(request)}`,
        policy.limit,
        policy.windowMs
      );
      if (!result.allowed) return rateLimitResponse(result.retryAfterSeconds);
    }
    return NextResponse.next();
  }

  if (PUBLIC_HEALTH_PATHS.has(request.nextUrl.pathname) && request.method === 'GET') {
    const result = checkRateLimit(
      `health:${getClientKey(request)}`,
      10,
      60_000
    );
    return result.allowed
      ? NextResponse.next()
      : rateLimitResponse(result.retryAfterSeconds);
  }

  if (
    isPublicShareRead(request)
  ) {
    return NextResponse.next();
  }

  const authHeader = request.headers.get('authorization');
  const accessToken = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  if (!accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const payload = await verifyToken(accessToken);
  if (!payload?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (
    request.nextUrl.pathname.startsWith('/api/ai/') ||
    request.nextUrl.pathname.includes('/auto-generate') ||
    request.nextUrl.pathname.includes('/export-ppt') ||
    request.nextUrl.pathname.includes('/ppt-outline')
  ) {
    const result = checkRateLimit(
      `generation:${String(payload.id)}`,
      30,
      10 * 60_000
    );
    if (!result.allowed) return rateLimitResponse(result.retryAfterSeconds);
  }

  // 兼容仍从 Authorization 读取身份的既有路由，同时令牌保持 HttpOnly。
  const requestHeaders = new Headers(request.headers);
  if (!authHeader) requestHeaders.set('authorization', `Bearer ${accessToken}`);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ['/api/:path*'],
};
