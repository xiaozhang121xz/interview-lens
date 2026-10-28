/**
 * 企查查模糊搜索 API
 *
 * @module app/api/ai/search/fuzzy/route
 * @description 使用企查查API根据关键词模糊搜索公司列表
 *
 * 功能：
 * - 根据公司简称或关键词搜索匹配的公司列表
 * - 返回公司全称、信用代码、法人等基本信息
 * - 用于让用户选择正确的目标公司
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  fuzzySearchCompany,
  type FuzzySearchResultItem,
} from '@/lib/services/qichacha-service';
import {
  fuzzySearchSchema,
  type FuzzySearchInput,
} from '@/lib/validations/search';

// ============================================
// 类型定义
// ============================================

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
  };
  errors?: z.ZodIssue[];
}

// ============================================
// POST - 模糊搜索公司列表
// ============================================

/**
 * @swagger
 * /api/ai/search/fuzzy:
 *   post:
 *     summary: 企查查模糊搜索
 *     description: 根据公司名称关键词模糊搜索匹配的公司列表，返回公司全称供用户选择
 *     tags: [AI, Search]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - searchKey
 *             properties:
 *               searchKey:
 *                 type: string
 *                 maxLength: 100
 *                 description: 搜索关键词（公司名称或简称）
 *               pageIndex:
 *                 type: integer
 *                 default: 1
 *                 description: 页码
 *               pageSize:
 *                 type: integer
 *                 default: 5
 *                 description: 每页数量
 *     responses:
 *       200:
 *         description: 搜索成功
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
 *                     items:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           keyNo:
 *                             type: string
 *                           name:
 *                             type: string
 *                           creditCode:
 *                             type: string
 *                           establishDate:
 *                             type: string
 *                           legalPerson:
 *                             type: string
 *                           status:
 *                             type: string
 *                           address:
 *                             type: string
 *                           province:
 *                             type: string
 *                           city:
 *                             type: string
 *                     totalRecords:
 *                       type: integer
 *                     pageIndex:
 *                       type: integer
 *                     pageSize:
 *                       type: integer
 *       400:
 *         description: 请求参数验证失败
 *       500:
 *         description: API配置错误或服务不可用
 */
export async function POST(request: NextRequest) {
  try {
    // 解析请求体
    const body: FuzzySearchInput = await request.json();

    // 验证请求体
    const validationResult = fuzzySearchSchema.safeParse(body);
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

    const { searchKey, pageIndex, pageSize } = validationResult.data;

    console.log(`[Fuzzy Search API] 开始搜索: "${searchKey}"`);

    // 调用企查查模糊搜索
    const result = await fuzzySearchCompany(searchKey, pageIndex, pageSize);

    if (!result.success) {
      // 判断错误类型
      if (result.error?.includes('未配置') || result.error?.includes('已禁用')) {
        return NextResponse.json<ApiResponse<never>>(
          {
            success: false,
            message: '搜索服务未配置，请联系管理员',
            error: { code: 'CONFIG_ERROR', message: result.error },
          },
          { status: 500 }
        );
      }

      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          message: result.error || '搜索失败',
          error: { code: 'SEARCH_ERROR', message: result.error || '搜索失败' },
        },
        { status: 500 }
      );
    }

    console.log(`[Fuzzy Search API] 搜索成功: 找到${result.data?.totalRecords || 0}条记录`);

    return NextResponse.json<ApiResponse<typeof result.data>>(
      {
        success: true,
        data: result.data,
        message: `搜索成功，找到${result.data?.totalRecords || 0}条匹配记录`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Fuzzy Search API] Error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        message: '服务器内部错误',
        error: { code: 'INTERNAL_ERROR', message: errorMessage },
      },
      { status: 500 }
    );
  }
}
