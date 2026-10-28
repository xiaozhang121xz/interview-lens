/**
 * 访谈模板管理 API - 列表与创建
 *
 * @module app/api/templates/route
 * @description 模板列表查询和创建模板API
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db/prisma';
import { verifyToken } from '@/lib/auth';
import {
  templateCreateSchema,
  templateQuerySchema,
  type TemplateCreateInput,
} from '@/lib/validations/template';
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

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
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

// ============================================
// GET - 获取模板列表
// ============================================

/**
 * @swagger
 * /api/templates:
 *   get:
 *     summary: 获取访谈模板列表
 *     description: 获取访谈模板列表，支持分页和搜索。返回用户自己的模板和公开模板。
 *     tags: [Templates]
 *     parameters:
 *       - name: page
 *         in: query
 *         required: false
 *         schema:
 *           type: integer
 *           default: 1
 *         description: 页码
 *       - name: pageSize
 *         in: query
 *         required: false
 *         schema:
 *           type: integer
 *           default: 10
 *         description: 每页数量
 *       - name: search
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *         description: 搜索关键词
 *       - name: category
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *         description: 分类筛选
 *       - name: isPublic
 *         in: query
 *         required: false
 *         schema:
 *           type: boolean
 *         description: 是否只显示公开模板
 *     responses:
 *       200:
 *         description: 成功获取模板列表
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     items:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/InterviewTemplate'
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     pageSize:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
export async function GET(request: NextRequest) {
  try {
    // 解析查询参数
    const { searchParams } = new URL(request.url);
    const queryObject = Object.fromEntries(searchParams.entries());

    // 验证查询参数
    const validationResult = templateQuerySchema.safeParse(queryObject);
    if (!validationResult.success) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          message: '查询参数验证失败',
          errors: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const { page, pageSize, search, category, isPublic } = validationResult.data;

    // 验证分页参数范围
    if (page < 1 || pageSize < 1 || pageSize > 100) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          message: '分页参数无效',
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

    // 构建查询条件
    const where: Record<string, unknown> = {
      OR: [{ userId }, { isPublic: true }],
    };

    // 如果明确指定了 isPublic 参数
    if (isPublic !== undefined) {
      if (isPublic) {
        // 只显示公开模板
        delete where.OR;
        where.isPublic = true;
      }
    }

    // 添加搜索条件
    if (search && search.trim()) {
      const searchKeyword = search.trim();
      where.AND = [
        {
          OR: [
            { name: { contains: searchKeyword, mode: 'insensitive' } },
            { description: { contains: searchKeyword, mode: 'insensitive' } },
            { category: { contains: searchKeyword, mode: 'insensitive' } },
          ],
        },
      ];
    }

    // 添加分类筛选
    if (category && category.trim()) {
      where.category = category.trim();
    }

    // 并行执行查询（性能优化：消除瀑布流）
    const [templates, total] = await Promise.all([
      prisma.interviewTemplate.findMany({
        where,
        orderBy: [{ isPublic: 'asc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.interviewTemplate.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pageSize);

    return NextResponse.json<ApiResponse<{
      templates: InterviewTemplate[];
      pagination: { total: number; page: number; pageSize: number; totalPages: number };
    }>>(
      {
        success: true,
        data: {
          templates,
          pagination: { total, page, pageSize, totalPages },
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('获取模板列表API错误:', error);

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
// POST - 创建模板
// ============================================

/**
 * @swagger
 * /api/templates:
 *   post:
 *     summary: 创建访谈模板
 *     description: 创建新的访谈模板。模板名称在同一用户下必须唯一。
 *     tags: [Templates]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - outline
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 100
 *                 description: 模板名称
 *                 example: "B端产品访谈模板"
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
 *                 example: "B端产品"
 *               isPublic:
 *                 type: boolean
 *                 default: false
 *                 description: 是否公开
 *     responses:
 *       201:
 *         description: 模板创建成功
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
 *                   example: "模板创建成功"
 *       400:
 *         description: 请求参数验证失败
 *       401:
 *         description: 未授权
 *       409:
 *         description: 模板名称已存在
 *       500:
 *         description: 服务器错误
 */
export async function POST(request: NextRequest) {
  try {
    // 解析请求体
    const body: TemplateCreateInput & { userId?: string } = await request.json();

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
    const validationResult = templateCreateSchema.safeParse(body);
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

    // 验证 outline 是否为有效的 JSON
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

    // 检查模板名称是否已存在（同一用户下）
    const existingTemplate = await prisma.interviewTemplate.findFirst({
      where: {
        name: validatedData.name,
        userId,
      },
    });

    if (existingTemplate) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          message: `模板名称 "${validatedData.name}" 已存在`,
        },
        { status: 409 }
      );
    }

    // 创建模板
    const template = await prisma.interviewTemplate.create({
      data: {
        name: validatedData.name,
        description: validatedData.description || null,
        outline: validatedData.outline,
        category: validatedData.category || null,
        isPublic: validatedData.isPublic ?? false,
        userId,
      },
    });

    return NextResponse.json<ApiResponse<InterviewTemplate>>(
      {
        success: true,
        data: template,
        message: '模板创建成功',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('创建模板API错误:', error);

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