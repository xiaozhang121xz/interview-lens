import { NextRequest, NextResponse } from 'next/server';
import { userDataManager, UserDataManager } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

// 定义错误响应类型
interface ErrorResponse {
  success: false;
  message: string;
  error?: string;
}

// 自定义错误类
class UnauthorizedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

class UserNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UserNotFoundError';
  }
}

// GET - 获取当前登录用户信息
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedError('缺少有效的授权令牌');
    }

    const payload = await verifyToken(authHeader.substring(7));
    if (!payload?.id) throw new UnauthorizedError('无效的授权令牌');
    const userId = payload.id as string;

    // 兼容用户名密码账号和手机号账号，统一成前端所需的身份结构
    const loginUser = await userDataManager.getExtendedUserById(userId);
    const phoneUser = loginUser ? null : await UserDataManager.getById(userId);
    if (!loginUser && !phoneUser) {
      throw new UserNotFoundError('用户不存在');
    }
    if ((loginUser?.status ?? phoneUser?.status) !== 'active') {
      throw new UnauthorizedError('用户状态异常');
    }

    const user = loginUser
      ? {
          ...loginUser,
          name: loginUser.displayName,
          role: 'user',
          accountType: 'password' as const,
        }
      : {
          id: phoneUser!.id,
          username: phoneUser!.phone,
          displayName: phoneUser!.nickname,
          name: phoneUser!.nickname,
          email: '',
          role: 'user',
          phone: phoneUser!.phone,
          status: phoneUser!.status,
          avatar: phoneUser!.avatar,
          createdAt: phoneUser!.createdAt.toISOString(),
          updatedAt: phoneUser!.updatedAt.toISOString(),
          accountType: 'phone' as const,
        };

    // 返回成功响应
    const successResponse = {
      success: true,
      data: user,
    };

    return NextResponse.json(successResponse, { status: 200 });
  } catch (error) {
    console.error('获取当前用户信息API错误:', error);

    // 处理未授权错误
    if (error instanceof UnauthorizedError) {
      const errorResponse: ErrorResponse = {
        success: false,
        message: error.message,
      };
      return NextResponse.json(errorResponse, { status: 401 });
    }

    // 处理用户不存在错误
    if (error instanceof UserNotFoundError) {
      const errorResponse: ErrorResponse = {
        success: false,
        message: error.message,
      };
      return NextResponse.json(errorResponse, { status: 404 });
    }

    // 处理其他未知错误
    const errorResponse: ErrorResponse = {
      success: false,
      message: '服务器内部错误',
      error: process.env.NODE_ENV === 'development' ? String(error) : undefined,
    };
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
