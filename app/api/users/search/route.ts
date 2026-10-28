import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { userDataManager } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { ApiResponse, ExtendedUser } from '@/types/user';

// 定义搜索查询参数验证Schema
const SearchUsersQuerySchema = z.object({
  q: z.string().min(1, '搜索关键词不能为空').max(100, '搜索关键词过长'),
  fields: z.array(z.string()).optional(),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 10)),
});

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

class ForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ForbiddenError';
  }
}

class ValidationError extends Error {
  constructor(
    message: string,
    public details?: string
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

// 检查用户权限的辅助函数
async function checkUserPermission(
  request: NextRequest,
  requiredRole: string = 'admin'
): Promise<ExtendedUser> {
  try {
    // 从Authorization header获取token
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('缺少有效的授权令牌');
    }

    const token = authHeader.substring(7);
    const payload = await verifyToken(token);

    if (!payload || !payload.id) {
      throw new UnauthorizedError('无效的授权令牌');
    }

    // 获取当前用户信息
    const currentUser = await userDataManager.getExtendedUserById(payload.id);
    if (!currentUser) {
      throw new UnauthorizedError('用户不存在');
    }

    // 检查用户状态
    if (currentUser.status !== 'active') {
      throw new UnauthorizedError('用户状态异常');
    }

    return currentUser;
  } catch (error) {
    if (error instanceof UnauthorizedError || error instanceof ForbiddenError) {
      throw error;
    }
    throw new UnauthorizedError('令牌验证失败');
  }
}

// GET - 模糊搜索用户
export async function GET(request: NextRequest) {
  try {
    // 移除权限验证，直接处理搜索

    // 获取查询参数
    const { searchParams } = new URL(request.url);
    const queryObject = Object.fromEntries(searchParams.entries());

    // 验证查询参数
    const validationResult = SearchUsersQuerySchema.safeParse(queryObject);
    if (!validationResult.success) {
      const errorMessages = validationResult.error.issues
        .map((err: z.ZodIssue) => `${err.path}: ${err.message}`)
        .join(', ');
      throw new ValidationError('查询参数验证失败', errorMessages);
    }

    const { q: keyword, fields, limit } = validationResult.data;

    // 验证限制参数
    if (limit < 1 || limit > 50) {
      throw new ValidationError('搜索结果数量必须在1-50之间');
    }

    // 执行模糊搜索
    const searchResults = await userDataManager.fuzzySearch(keyword, limit);

    // 如果指定了搜索字段，进行结果过滤
    let filteredResults = searchResults;
    if (fields && fields.length > 0) {
      const keywordLower = keyword.toLowerCase();
      filteredResults = searchResults.filter((user) => {
        return fields.some((field) => {
          const value = (user as any)[field];
          return (
            value &&
            typeof value === 'string' &&
            value.toLowerCase().includes(keywordLower)
          );
        });
      });
    }

    // 构造成功响应
    const successResponse: ApiResponse<ExtendedUser[]> = {
      success: true,
      data: filteredResults,
    };

    return NextResponse.json(successResponse, { status: 200 });
  } catch (error) {
    console.error('搜索用户API错误:', error);

    // 处理权限错误
    if (error instanceof UnauthorizedError) {
      const errorResponse: ErrorResponse = {
        success: false,
        message: error.message,
      };
      return NextResponse.json(errorResponse, { status: 401 });
    }

    if (error instanceof ForbiddenError) {
      const errorResponse: ErrorResponse = {
        success: false,
        message: error.message,
      };
      return NextResponse.json(errorResponse, { status: 403 });
    }

    // 处理验证错误
    if (error instanceof ValidationError) {
      const errorResponse: ErrorResponse = {
        success: false,
        message: error.message,
        error: error.details,
      };
      return NextResponse.json(errorResponse, { status: 400 });
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
