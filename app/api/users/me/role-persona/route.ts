/**
 * 用户角色画像 API
 *
 * @module app/api/users/me/role-persona/route
 * @description 用户角色画像的获取和更新接口
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { verifyToken } from '@/lib/auth';
import { updateRolePersonaSchema } from '@/lib/validations/user-journey';
import { isValidRolePersona } from '@/lib/constants/user-journey-config';

// ============================================
// 类型定义
// ============================================

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// ============================================
// 辅助函数
// ============================================

/**
 * 从请求中获取用户ID
 */
async function getUserIdFromRequest(request: NextRequest): Promise<string> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('UNAUTHORIZED');
  }

  const token = authHeader.substring(7);
  const payload = await verifyToken(token);

  if (!payload || !payload.id) {
    throw new Error('UNAUTHORIZED');
  }

  return payload.id;
}

// ============================================
// GET - 获取用户角色画像
// ============================================

/**
 * @swagger
 * /api/users/me/role-persona:
 *   get:
 *     summary: 获取用户角色画像
 *     description: 获取当前登录用户的角色画像设置
 *     tags: [User]
 *     responses:
 *       200:
 *         description: 成功获取角色画像
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     rolePersona:
 *                       type: string
 *                       enum: [sales, product, developer, manager]
 *       401:
 *         description: 未授权
 *       404:
 *         description: 用户不存在
 *       500:
 *         description: 服务器内部错误
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);

    const user = await prisma.loginUser.findUnique({
      where: { id: userId },
      select: { rolePersona: true },
    });

    if (!user) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: '用户不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse<{ rolePersona: string | null }>>(
      {
        success: true,
        data: { rolePersona: user.rolePersona },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('获取用户角色画像API错误:', error);

    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: '未授权访问' },
        { status: 401 }
      );
    }

    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

// ============================================
// PATCH - 更新用户角色画像
// ============================================

/**
 * @swagger
 * /api/users/me/role-persona:
 *   patch:
 *     summary: 更新用户角色画像
 *     description: 更新当前登录用户的角色画像设置
 *     tags: [User]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rolePersona
 *             properties:
 *               rolePersona:
 *                 type: string
 *                 enum: [sales, product, developer, manager]
 *     responses:
 *       200:
 *         description: 角色画像更新成功
 *       400:
 *         description: 请求参数验证失败
 *       401:
 *         description: 未授权
 *       404:
 *         description: 用户不存在
 *       500:
 *         description: 服务器内部错误
 */
export async function PATCH(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);

    // 解析请求体
    const body = await request.json();

    // 验证请求体
    const validationResult = updateRolePersonaSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          error: '请求参数验证失败',
        },
        { status: 400 }
      );
    }

    const { rolePersona } = validationResult.data;

    // 更新用户角色画像
    const updatedUser = await prisma.loginUser.update({
      where: { id: userId },
      data: { rolePersona },
      select: { rolePersona: true },
    });

    return NextResponse.json<ApiResponse<{ rolePersona: string }>>(
      {
        success: true,
        data: { rolePersona: updatedUser.rolePersona || rolePersona },
        message: '角色画像更新成功',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('更新用户角色画像API错误:', error);

    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: '未授权访问' },
        { status: 401 }
      );
    }

    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: '服务器内部错误' },
      { status: 500 }
    );
  }
}