/**
 * 访谈模板管理 API - 详情、更新、删除
 *
 * @module app/api/templates/[id]/route
 * @description 模板详情查询、更新和删除API
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db/prisma';
import { verifyToken } from '@/lib/auth';
import { templateUpdateSchema, type TemplateUpdateInput } from '@/lib/validations/template';
import type { InterviewTemplate } from '@prisma/client';

// ============================================
// 类型定义
// ============================================

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: z.ZodIssue[];
}

// ============================================
// 辅助函数
// ============================================

/**
 * 从请求中获取当前用户ID
 */
async function getCurrentUserId(request: NextRequest): Promise<string | null> {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7);
    const payload = await verifyToken(token);

    return payload?.id || null;
  } catch {
    return null;
  }
}

/**
 * 从请求头或请求体获取用户ID
 */
async function extractUserId(
  request: NextRequest,
  body?: Record<string, unknown>
): Promise<string> {
  // 优先从Authorization header获取
  const headerUserId = await getCurrentUserId(request);
  if (headerUserId) {
    return headerUserId;
  }

  // 尝试从 X-User-Id header 获取（前端备用方案）
  const xUserId = request.headers.get('X-User-Id');
  if (xUserId) {
    return xUserId;
  }

  // 从请求体获取
  if (body && typeof body.userId === 'string') {
    return body.userId;
  }

  throw new Error('UNAUTHORIZED');
}

/**
 * 验证模板ID格式
 */
function isValidObjectId(id: string): boolean {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

// ============================================
// GET - 获取模板详情
// ============================================

/**
 * @swagger
 * /api/templates/{id}:
 *   get:
 *     summary: 获取模板详情
 *     description: 获取指定模板的详细信息。用户只能查看自己创建的模板或公开模板。
 *     tags: [Templates]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: 模板ID
 *     responses:
 *       200:
 *         description: 成功获取模板详情
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/InterviewTemplate'
 *       400:
 *         description: 无效的模板ID
 *       401:
 *         description: 未授权
 *       404:
 *         description: 模板不存在或无权访问
 *       500:
 *         description: 服务器错误
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // 验证ID格式
    if (!isValidObjectId(id)) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          message: '无效的模板ID格式',
        },
        { status: 400 }
      );
    }

    // 获取用户ID
    let userId: string;
    try {
      userId = await extractUserId(request);
    } catch {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          message: '未授权访问',
        },
        { status: 401 }
      );
    }

    // 查询模板（只能查看自己的模板或公开模板）
    const template = await prisma.interviewTemplate.findFirst({
      where: {
        id,
        OR: [{ userId }, { isPublic: true }],
      },
    });

    if (!template) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          message: '模板不存在或无权访问',
        },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse<InterviewTemplate>>(
      {
        success: true,
        data: template,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('获取模板详情API错误:', error);

    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          message: '未授权访问',
        },
        { status: 401 }
      );
    }

    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        message: '服务器内部错误',
      },
      { status: 500 }
    );
  }
}

// ============================================
// PUT - 更新模板
// ============================================

/**
 * @swagger
 * /api/templates/{id}:
 *   put:
 *     summary: 更新模板
 *     description: 更新指定模板的信息。只能更新自己创建的模板。
 *     tags: [Templates]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: 模板ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 100
 *                 description: 模板名称
 *               description:
 *                 type: string
 *                 maxLength: 1000
 *                 description: 模板描述
 *               outline:
 *                 type: string
 *                 description: 提纲内容（JSON格式）
 *               category:
 *                 type: string
 *                 maxLength: 50
 *                 description: 分类
 *               isPublic:
 *                 type: boolean
 *                 description: 是否公开
 *     responses:
 *       200:
 *         description: 模板更新成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/InterviewTemplate'
 *                 message:
 *                   type: string
 *                   example: "模板更新成功"
 *       400:
 *         description: 请求参数验证失败
 *       401:
 *         description: 未授权
 *       403:
 *         description: 无权修改此模板
 *       404:
 *         description: 模板不存在
 *       409:
 *         description: 模板名称已存在
 *       500:
 *         description: 服务器错误
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // 验证ID格式
    if (!isValidObjectId(id)) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          message: '无效的模板ID格式',
        },
        { status: 400 }
      );
    }

    // 解析请求体
    const body: TemplateUpdateInput & { userId?: string } = await request.json();

    // 获取用户ID
    let userId: string;
    try {
      userId = await extractUserId(request, body);
    } catch {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          message: '未授权访问，请先登录',
        },
        { status: 401 }
      );
    }

    // 验证请求体
    const validationResult = templateUpdateSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          message: '请求参数验证失败',
          errors: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const validatedData = validationResult.data;

    // 验证 outline 是否为有效的 JSON（如果提供了）
    if (validatedData.outline) {
      try {
        JSON.parse(validatedData.outline);
      } catch {
        return NextResponse.json<ApiResponse<never>>(
          {
            success: false,
            message: '提纲内容必须是有效的JSON格式',
          },
          { status: 400 }
        );
      }
    }

    // 查询模板并验证所有权
    const existingTemplate = await prisma.interviewTemplate.findUnique({
      where: { id },
    });

    if (!existingTemplate) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          message: '模板不存在',
        },
        { status: 404 }
      );
    }

    // 验证所有权
    if (existingTemplate.userId !== userId) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          message: '无权修改此模板',
        },
        { status: 403 }
      );
    }

    // 如果要更新名称，检查是否与其他模板重名
    if (validatedData.name && validatedData.name !== existingTemplate.name) {
      const duplicateTemplate = await prisma.interviewTemplate.findFirst({
        where: {
          name: validatedData.name,
          userId,
          id: { not: id },
        },
      });

      if (duplicateTemplate) {
        return NextResponse.json<ApiResponse<never>>(
          {
            success: false,
            message: `模板名称 "${validatedData.name}" 已存在`,
          },
          { status: 409 }
        );
      }
    }

    // 更新模板
    const updatedTemplate = await prisma.interviewTemplate.update({
      where: { id },
      data: {
        name: validatedData.name,
        description: validatedData.description,
        outline: validatedData.outline,
        category: validatedData.category,
        isPublic: validatedData.isPublic,
      },
    });

    return NextResponse.json<ApiResponse<InterviewTemplate>>(
      {
        success: true,
        data: updatedTemplate,
        message: '模板更新成功',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('更新模板API错误:', error);

    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          message: '未授权访问',
        },
        { status: 401 }
      );
    }

    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        message: '服务器内部错误',
      },
      { status: 500 }
    );
  }
}

// ============================================
// DELETE - 删除模板
// ============================================

/**
 * @swagger
 * /api/templates/{id}:
 *   delete:
 *     summary: 删除模板
 *     description: 删除指定模板。只能删除自己创建的模板。
 *     tags: [Templates]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: 模板ID
 *     responses:
 *       200:
 *         description: 模板删除成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "模板删除成功"
 *       400:
 *         description: 无效的模板ID
 *       401:
 *         description: 未授权
 *       403:
 *         description: 无权删除此模板
 *       404:
 *         description: 模板不存在
 *       500:
 *         description: 服务器错误
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 验证ID格式
    if (!isValidObjectId(id)) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          message: '无效的模板ID格式',
        },
        { status: 400 }
      );
    }

    // 获取用户ID
    let userId: string;
    try {
      userId = await extractUserId(request);
    } catch {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          message: '未授权访问',
        },
        { status: 401 }
      );
    }

    // 查询模板并验证所有权
    const existingTemplate = await prisma.interviewTemplate.findUnique({
      where: { id },
    });

    if (!existingTemplate) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          message: '模板不存在',
        },
        { status: 404 }
      );
    }

    // 验证所有权
    if (existingTemplate.userId !== userId) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          message: '无权删除此模板',
        },
        { status: 403 }
      );
    }

    // 删除模板
    await prisma.interviewTemplate.delete({
      where: { id },
    });

    return NextResponse.json<ApiResponse<never>>(
      {
        success: true,
        message: '模板删除成功',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('删除模板API错误:', error);

    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          message: '未授权访问',
        },
        { status: 401 }
      );
    }

    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        message: '服务器内部错误',
      },
      { status: 500 }
    );
  }
}