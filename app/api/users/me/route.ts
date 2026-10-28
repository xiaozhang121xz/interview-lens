/**
 * @tag Users
 * @description 获取当前用户信息
 *
 * @security BearerAuth
 *
 * @response {200} 成功获取用户信息
 * @response {401} 未认证
 *
 * @example GET /api/users/me
 *
 * @response 200
 * {
 *   "success": true,
 *   "data": {
 *     "id": "user-1735647890123",
 *     "phone": "13800138000",
 *     "nickname": "用户8000",
 *     "createdAt": "2025-12-30T10:00:00.000Z",
 *     "updatedAt": "2025-12-30T15:30:00.000Z"
 *   }
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { userDataManager } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // 从Authorization header获取token
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        {
          success: false,
          error: 'UNAUTHORIZED',
          message: '缺少有效的授权令牌',
        },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const payload = await verifyToken(token);

    if (!payload || !payload.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'UNAUTHORIZED',
          message: '无效的授权令牌',
        },
        { status: 401 }
      );
    }

    // 获取用户信息
    const user = await userDataManager.getUserById(payload.id);
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'NOT_FOUND',
          message: '用户不存在',
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: user,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('获取用户信息API错误:', error);

    if (error instanceof Error) {
      return NextResponse.json(
        {
          success: false,
          error: 'INTERNAL_ERROR',
          message: '服务器内部错误',
          details:
            process.env.NODE_ENV === 'development' ? error.message : undefined,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: '服务器内部错误',
      },
      { status: 500 }
    );
  }
}

/**
 * @tag Users
 * @description 更新当前用户信息
 *
 * @security BearerAuth
 *
 * @param {object} body - 更新数据
 * @param {string} [body.displayName] - 显示名称（1-50个字符）
 * @param {string} [body.email] - 邮箱地址
 *
 * @response {200} 成功更新用户信息
 * @response {400} 输入数据格式错误
 * @response {401} 未认证
 *
 * @example PATCH /api/users/me
 * {
 *   "displayName": "新昵称",
 *   "email": "new@example.com"
 * }
 *
 * @response 200
 * {
 *   "success": true,
 *   "data": {
 *     "id": "user-1735647890123",
 *     "displayName": "新昵称",
 *     "email": "new@example.com"
 *   }
 * }
 */

export async function PATCH(request: NextRequest) {
  try {
    // 从Authorization header获取token
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        {
          success: false,
          error: 'UNAUTHORIZED',
          message: '缺少有效的授权令牌',
        },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const payload = await verifyToken(token);

    if (!payload || !payload.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'UNAUTHORIZED',
          message: '无效的授权令牌',
        },
        { status: 401 }
      );
    }

    // 解析请求体
    const body = await request.json();

    // 更新用户信息
    const updatedUser = await userDataManager.updateUser(payload.id, body);
    if (!updatedUser) {
      return NextResponse.json(
        {
          success: false,
          error: 'NOT_FOUND',
          message: '用户不存在',
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: updatedUser,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('更新用户信息API错误:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: '服务器内部错误',
        details:
          process.env.NODE_ENV === 'development'
            ? (error as Error).message
            : undefined,
      },
      { status: 500 }
    );
  }
}
