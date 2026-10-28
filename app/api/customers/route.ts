/**
 * 客户管理 API - 列表与创建
 *
 * @module app/api/customers/route
 * @description 客户列表查询和创建客户API
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db/prisma';
import { verifyToken } from '@/lib/auth';
import {
  customerCreateSchema,
  customerQuerySchema,
  type CustomerCreateInput,
} from '@/lib/validations/customer';
import type { Customer } from '@prisma/client';

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
      // 尝试从请求体获取userId（兼容模式）
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
// GET - 获取客户列表
// ============================================

/**
 * @swagger
 * /api/customers:
 *   get:
 *     summary: 获取客户列表
 *     description: 获取客户列表，支持分页和搜索。只返回当前用户创建的客户。
 *     tags: [Customers]
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
 *       - name: industry
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *         description: 行业筛选
 *     responses:
 *       200:
 *         description: 成功获取客户列表
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
 *                         $ref: '#/components/schemas/Customer'
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
    const validationResult = customerQuerySchema.safeParse(queryObject);
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

    const { page, pageSize, search, industry } = validationResult.data;

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

    // 获取用户ID（客户数据需要认证）
    let userId: string;
    try {
      userId = await extractUserId(request);
    } catch {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          message: '未授权访问，请先登录',
        },
        { status: 401 }
      );
    }

    // 构建查询条件
    const where: Record<string, unknown> = {
      userId, // 只返回当前用户的客户
    };

    // 添加搜索条件
    if (search && search.trim()) {
      const searchKeyword = search.trim();
      where.OR = [
        { name: { contains: searchKeyword, mode: 'insensitive' } },
        { industry: { contains: searchKeyword, mode: 'insensitive' } },
        { contact: { contains: searchKeyword, mode: 'insensitive' } },
        { email: { contains: searchKeyword, mode: 'insensitive' } },
      ];
    }

    // 添加行业筛选
    if (industry && industry.trim()) {
      where.industry = industry.trim();
    }

    // 并行执行查询（性能优化：消除瀑布流）
    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.customer.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pageSize);

    return NextResponse.json<ApiResponse<{
      customers: Customer[];
      pagination: { total: number; page: number; pageSize: number; totalPages: number };
    }>>(
      {
        success: true,
        data: {
          customers,
          pagination: { total, page, pageSize, totalPages },
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('获取客户列表API错误:', error);

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
// POST - 创建客户
// ============================================

/**
 * @swagger
 * /api/customers:
 *   post:
 *     summary: 创建客户
 *     description: 创建新客户。客户名称在同一用户下必须唯一。
 *     tags: [Customers]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - industry
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 100
 *                 description: 客户名称
 *                 example: "阿里巴巴"
 *               industry:
 *                 type: string
 *                 description: 所属行业
 *                 example: "互联网"
 *               description:
 *                 type: string
 *                 maxLength: 1000
 *                 description: 客户简介
 *               website:
 *                 type: string
 *                 format: uri
 *                 description: 官网地址
 *               contactName:
 *                 type: string
 *                 maxLength: 50
 *                 description: 联系人姓名
 *               contactPhone:
 *                 type: string
 *                 maxLength: 20
 *                 description: 联系人电话
 *               contactEmail:
 *                 type: string
 *                 format: email
 *                 description: 联系人邮箱
 *     responses:
 *       201:
 *         description: 客户创建成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Customer'
 *                 message:
 *                   type: string
 *                   example: "客户创建成功"
 *       400:
 *         description: 请求参数验证失败
 *       401:
 *         description: 未授权
 *       409:
 *         description: 客户名称已存在
 *       500:
 *         description: 服务器错误
 */
export async function POST(request: NextRequest) {
  try {
    // 解析请求体
    const body: CustomerCreateInput & { userId?: string } = await request.json();

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
    const validationResult = customerCreateSchema.safeParse(body);
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

    // 检查客户名称是否已存在（同一用户下）
    const existingCustomerByName = await prisma.customer.findFirst({
      where: {
        name: validatedData.name,
        userId,
      },
    });

    if (existingCustomerByName) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          message: `客户名称 "${validatedData.name}" 已添加过，请使用其他名称或查看已存在的客户`,
        },
        { status: 409 }
      );
    }

    // 检查联系人是否已存在（同一用户下）
    if (validatedData.contactName && validatedData.contactName.trim()) {
      const existingCustomerByContact = await prisma.customer.findFirst({
        where: {
          contact: validatedData.contactName,
          userId,
        },
      });

      if (existingCustomerByContact) {
        return NextResponse.json<ApiResponse<never>>(
          {
            success: false,
            message: `联系人 "${validatedData.contactName}" 已添加过，该联系人可能已在客户 "${existingCustomerByContact.name}" 中记录`,
          },
          { status: 409 }
        );
      }
    }

    // 创建客户
    const customer = await prisma.customer.create({
      data: {
        name: validatedData.name,
        companyFullName: validatedData.companyFullName || null,
        industry: validatedData.industry,
        description: validatedData.description || null,
        contact: validatedData.contactName || null,
        phone: validatedData.contactPhone || null,
        email: validatedData.contactEmail || null,
        address: validatedData.address || null,
        background: validatedData.background || null,
        contactBackground: validatedData.contactBackground || null,
        notes: validatedData.notes || null,
        userId,
      },
    });

    return NextResponse.json<ApiResponse<Customer>>(
      {
        success: true,
        data: customer,
        message: '客户创建成功',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('创建客户API错误:', error);

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
