/**
 * 客户管理 API - 详情、更新、删除
 *
 * @module app/api/customers/[id]/route
 * @description 客户详情查询、更新和删除API
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db/prisma';
import { verifyToken } from '@/lib/auth';
import {
  customerUpdateSchema,
  customerIdSchema,
  type CustomerUpdateInput,
} from '@/lib/validations/customer';
import type { Customer, InterviewProject } from '@prisma/client';

// ============================================
// 类型定义
// ============================================

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: z.ZodIssue[];
}

interface CustomerWithInterviews extends Customer {
  interviews: InterviewProject[];
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
 * 验证资源所有权
 */
async function validateOwnership(
  customerId: string,
  userId: string
): Promise<Customer | null> {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
  });

  if (!customer) {
    return null;
  }

  if (customer.userId !== userId) {
    throw new Error('FORBIDDEN');
  }

  return customer;
}

// ============================================
// GET - 获取客户详情
// ============================================

/**
 * @swagger
 * /api/customers/{id}:
 *   get:
 *     summary: 获取客户详情
 *     description: 获取客户完整信息，包含关联的访谈项目列表。支持简单权限验证，非所有者只能查看公开信息。
 *     tags: [Customers]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: 客户ID
 *     responses:
 *       200:
 *         description: 成功获取客户详情
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
 *                     id:
 *                       type: string
 *                       description: 客户ID
 *                     name:
 *                       type: string
 *                       description: 客户名称
 *                     industry:
 *                       type: string
 *                       description: 所属行业
 *                     contact:
 *                       type: string
 *                       nullable: true
 *                       description: 联系人姓名
 *                     phone:
 *                       type: string
 *                       nullable: true
 *                       description: 联系人电话
 *                     email:
 *                       type: string
 *                       nullable: true
 *                       description: 联系人邮箱
 *                     interviews:
 *                       type: array
 *                       items:
 *                         type: object
 *                       description: 关联的访谈项目列表
 *       400:
 *         description: 无效的客户ID格式
 *       403:
 *         description: 无权访问此客户信息
 *       404:
 *         description: 客户不存在
 *       500:
 *         description: 服务器内部错误
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 验证ID格式
    const idValidation = customerIdSchema.safeParse({ id });
    if (!idValidation.success) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          message: '无效的客户ID格式',
          errors: idValidation.error.issues,
        },
        { status: 400 }
      );
    }

    // 获取用户ID（支持多种认证方式）
    let userId: string | null = null;
    try {
      userId = await extractUserId(request);
    } catch {
      // 未登录用户可以查看，但需要后续权限检查
    }

    // 并行获取客户详情和访谈列表（性能优化）
    const customerPromise = prisma.customer.findUnique({
      where: { id },
    });

    const interviewsPromise = prisma.interviewProject.findMany({
      where: { customerId: id },
      orderBy: { createdAt: 'desc' },
    });

    const [customer, interviews] = await Promise.all([
      customerPromise,
      interviewsPromise,
    ]);

    // 检查客户是否存在
    if (!customer) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          message: '客户不存在',
        },
        { status: 404 }
      );
    }

    // 权限检查
    if (userId && customer.userId !== userId) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          message: '无权访问此客户信息',
        },
        { status: 403 }
      );
    }

    // 返回客户详情及关联访谈
    const responseData: CustomerWithInterviews = {
      ...customer,
      interviews,
    };

    return NextResponse.json<ApiResponse<CustomerWithInterviews>>(
      {
        success: true,
        data: responseData,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('获取客户详情API错误:', error);

    if (error instanceof Error && error.message === 'FORBIDDEN') {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          message: '无权访问此资源',
        },
        { status: 403 }
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
// PUT - 更新客户信息
// ============================================

/**
 * @swagger
 * /api/customers/{id}:
 *   put:
 *     summary: 更新客户信息
 *     description: 更新客户的详细信息。只有资源所有者才能更新。客户名称在同一用户下必须唯一。
 *     tags: [Customers]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: 客户ID
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
 *                 description: 客户名称
 *                 example: "阿里巴巴集团"
 *               industry:
 *                 type: string
 *                 description: 所属行业
 *                 example: "互联网"
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
 *               address:
 *                 type: string
 *                 maxLength: 200
 *                 description: 地址
 *               description:
 *                 type: string
 *                 maxLength: 1000
 *                 description: 客户简介
 *               notes:
 *                 type: string
 *                 maxLength: 500
 *                 description: 备注信息
 *     responses:
 *       200:
 *         description: 客户更新成功
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
 *                   example: "客户更新成功"
 *       400:
 *         description: 请求参数验证失败
 *       401:
 *         description: 未授权访问
 *       403:
 *         description: 无权操作此客户
 *       404:
 *         description: 客户不存在
 *       409:
 *         description: 客户名称已存在
 *       500:
 *         description: 服务器内部错误
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 验证ID格式
    const idValidation = customerIdSchema.safeParse({ id });
    if (!idValidation.success) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          message: '无效的客户ID格式',
          errors: idValidation.error.issues,
        },
        { status: 400 }
      );
    }

    // 解析请求体
    const body: CustomerUpdateInput & { userId?: string } = await request.json();

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
    const validationResult = customerUpdateSchema.safeParse(body);
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

    // 验证资源所有权
    const existingCustomer = await validateOwnership(id, userId);
    if (!existingCustomer) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          message: '客户不存在',
        },
        { status: 404 }
      );
    }

    // 检查客户名称是否与其他客户冲突
    if (validatedData.name && validatedData.name !== existingCustomer.name) {
      const duplicateCustomer = await prisma.customer.findFirst({
        where: {
          name: validatedData.name,
          userId,
          id: { not: id },
        },
      });

      if (duplicateCustomer) {
        return NextResponse.json<ApiResponse<never>>(
          {
            success: false,
            message: `客户名称 "${validatedData.name}" 已添加过，请使用其他名称或查看已存在的客户`,
          },
          { status: 409 }
        );
      }
    }

    // 检查联系人是否与其他客户冲突
    if (validatedData.contactName && validatedData.contactName.trim() && validatedData.contactName !== existingCustomer.contact) {
      const duplicateContact = await prisma.customer.findFirst({
        where: {
          contact: validatedData.contactName,
          userId,
          id: { not: id },
        },
      });

      if (duplicateContact) {
        return NextResponse.json<ApiResponse<never>>(
          {
            success: false,
            message: `联系人 "${validatedData.contactName}" 已添加过，该联系人可能已在客户 "${duplicateContact.name}" 中记录`,
          },
          { status: 409 }
        );
      }
    }

    // 构建更新数据
    const updateData: Record<string, unknown> = {};
    if (validatedData.name !== undefined) updateData.name = validatedData.name;
    if (validatedData.companyFullName !== undefined)
      updateData.companyFullName = validatedData.companyFullName || null;
    if (validatedData.industry !== undefined)
      updateData.industry = validatedData.industry;
    if (validatedData.contactName !== undefined)
      updateData.contact = validatedData.contactName || null;
    if (validatedData.contactPhone !== undefined)
      updateData.phone = validatedData.contactPhone || null;
    if (validatedData.contactEmail !== undefined)
      updateData.email = validatedData.contactEmail || null;
    if (validatedData.address !== undefined)
      updateData.address = validatedData.address || null;
    if (validatedData.description !== undefined)
      updateData.description = validatedData.description || null;
    if (validatedData.background !== undefined)
      updateData.background = validatedData.background || null;
    if (validatedData.contactBackground !== undefined)
      updateData.contactBackground = validatedData.contactBackground || null;
    if (validatedData.notes !== undefined)
      updateData.notes = validatedData.notes || null;
    if (validatedData.website !== undefined)
      updateData.website = validatedData.website || null;

    // 更新客户
    const updatedCustomer = await prisma.customer.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json<ApiResponse<Customer>>(
      {
        success: true,
        data: updatedCustomer,
        message: '客户更新成功',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('更新客户API错误:', error);

    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          message: '未授权访问',
        },
        { status: 401 }
      );
    }

    if (error instanceof Error && error.message === 'FORBIDDEN') {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          message: '无权操作此客户',
        },
        { status: 403 }
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
// DELETE - 删除客户
// ============================================

/**
 * @swagger
 * /api/customers/{id}:
 *   delete:
 *     summary: 删除客户
 *     description: 删除指定客户及其关联的所有访谈项目。此操作不可逆，请谨慎操作。只有资源所有者才能删除。
 *     tags: [Customers]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: 客户ID
 *     responses:
 *       200:
 *         description: 客户删除成功
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
 *                     message:
 *                       type: string
 *                       example: "客户删除成功"
 *                 message:
 *                   type: string
 *                   example: "客户删除成功"
 *       400:
 *         description: 无效的客户ID格式
 *       401:
 *         description: 未授权访问
 *       403:
 *         description: 无权删除此客户
 *       404:
 *         description: 客户不存在
 *       500:
 *         description: 服务器内部错误
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 验证ID格式
    const idValidation = customerIdSchema.safeParse({ id });
    if (!idValidation.success) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          message: '无效的客户ID格式',
          errors: idValidation.error.issues,
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
          message: '未授权访问，请先登录',
        },
        { status: 401 }
      );
    }

    // 验证资源所有权
    const existingCustomer = await validateOwnership(id, userId);
    if (!existingCustomer) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          message: '客户不存在',
        },
        { status: 404 }
      );
    }

    // 显式清理关联访谈和其衍生数据，避免 Mongo/Prisma 级联删除链路不稳定导致 500
    const interviews = await prisma.interviewProject.findMany({
      where: { customerId: id },
      select: { id: true },
    });
    const interviewIds = interviews.map((interview) => interview.id);

    if (interviewIds.length > 0) {
      console.log(`删除客户 ${id} 将同时删除 ${interviewIds.length} 个关联访谈项目`);

      await prisma.$transaction([
        prisma.interviewRecord.deleteMany({
          where: { projectId: { in: interviewIds } },
        }),
        prisma.interviewOutline.deleteMany({
          where: { projectId: { in: interviewIds } },
        }),
        prisma.realtimeTranscript.deleteMany({
          where: { projectId: { in: interviewIds } },
        }),
        prisma.aIInsight.deleteMany({
          where: { projectId: { in: interviewIds } },
        }),
        prisma.requirementItem.deleteMany({
          where: { projectId: { in: interviewIds } },
        }),
        prisma.pRDDocument.deleteMany({
          where: { projectId: { in: interviewIds } },
        }),
        prisma.userPersona.deleteMany({
          where: { projectId: { in: interviewIds } },
        }),
        prisma.userJourneyMap.deleteMany({
          where: { projectId: { in: interviewIds } },
        }),
        prisma.stageSummary.deleteMany({
          where: { projectId: { in: interviewIds } },
        }),
        prisma.interviewInsightReport.deleteMany({
          where: { projectId: { in: interviewIds } },
        }),
        prisma.shareRecord.deleteMany({
          where: { interviewId: { in: interviewIds } },
        }),
        prisma.shareReportContent.deleteMany({
          where: { interviewId: { in: interviewIds } },
        }),
        prisma.interviewProject.deleteMany({
          where: { id: { in: interviewIds } },
        }),
      ]);
    }

    await prisma.customer.delete({
      where: { id },
    });

    return NextResponse.json<ApiResponse<{ message: string }>>(
      {
        success: true,
        data: { message: '客户删除成功' },
        message: '客户删除成功',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('删除客户API错误:', error);

    if (error instanceof Error && error.message === 'FORBIDDEN') {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          message: '无权删除此客户',
        },
        { status: 403 }
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
