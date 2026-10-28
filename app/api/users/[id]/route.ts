import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { userDataManager } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { ApiResponse, ExtendedUser } from '@/types/user';

// 定义更新用户信息请求体验证Schema
const UpdateUserRequestSchema = z.object({
  displayName: z
    .string()
    .min(1, '显示名称不能为空')
    .max(50, '显示名称不能超过50个字符')
    .optional(),
  email: z
    .string()
    .email('请输入有效的邮箱地址')
    .max(100, '邮箱地址不能超过100个字符')
    .optional(),
  phone: z.string().max(20, '手机号码不能超过20个字符').optional(),
  role: z.enum(['admin', 'user', 'manager']).optional(),
  department: z.string().max(50, '部门名称不能超过50个字符').optional(),
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
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

class UserNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UserNotFoundError';
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

    if (requiredRole === 'admin') {
      const adminUsernames = (process.env.ADMIN_USERNAMES || '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);
      if (!adminUsernames.includes(currentUser.username)) {
        throw new ForbiddenError('需要管理员权限');
      }
    }

    return currentUser;
  } catch (error) {
    if (error instanceof UnauthorizedError || error instanceof ForbiddenError) {
      throw error;
    }
    throw new UnauthorizedError('令牌验证失败');
  }
}

// GET - 获取单个用户详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await checkUserPermission(request);

    const { id } = await params;

    if (!id) {
      throw new ValidationError('用户ID不能为空');
    }

    // 查找用户
    const user = await userDataManager.getExtendedUserById(id);
    if (!user) {
      throw new UserNotFoundError('用户不存在');
    }

    // 构造成功响应
    const successResponse: ApiResponse<ExtendedUser> = {
      success: true,
      data: user,
    };

    return NextResponse.json(successResponse, { status: 200 });
  } catch (error) {
    console.error('获取用户详情API错误:', error);

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

    // 处理用户不存在错误
    if (error instanceof UserNotFoundError) {
      const errorResponse: ErrorResponse = {
        success: false,
        message: error.message,
      };
      return NextResponse.json(errorResponse, { status: 404 });
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

// PUT - 更新用户信息
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await checkUserPermission(request);

    const { id } = await params;

    if (!id) {
      throw new ValidationError('用户ID不能为空');
    }

    // 查找目标用户
    const targetUser = await userDataManager.getUserById(id);
    if (!targetUser) {
      throw new UserNotFoundError('用户不存在');
    }

    // 解析请求体
    const requestBody = await request.json();

    // 验证请求数据
    const validationResult = UpdateUserRequestSchema.safeParse(requestBody);
    if (!validationResult.success) {
      const errorMessages = validationResult.error.issues
        .map((err: z.ZodIssue) => `${err.path}: ${err.message}`)
        .join(', ');
      throw new ValidationError('请求参数验证失败', errorMessages);
    }

    const updates = validationResult.data;

    // 检查邮箱是否已被其他用户使用
    if (updates.email && updates.email !== targetUser.email) {
      const emailExists = await userDataManager.emailExists(updates.email);
      if (emailExists) {
        throw new ValidationError('邮箱已被其他用户使用', updates.email);
      }
    }

    // 更新用户信息
    const updatedUser = await userDataManager.updateUser(id, updates);

    // 构造扩展用户响应
    const extendedUser: ExtendedUser = {
      ...updatedUser,
      department: updatedUser.department || undefined,
      phone: updatedUser.phone || undefined,
    };

    // 构造成功响应
    const successResponse: ApiResponse<ExtendedUser> = {
      success: true,
      data: extendedUser,
    };

    return NextResponse.json(successResponse, { status: 200 });
  } catch (error) {
    console.error('更新用户信息API错误:', error);

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

    // 处理用户不存在错误
    if (error instanceof UserNotFoundError) {
      const errorResponse: ErrorResponse = {
        success: false,
        message: error.message,
      };
      return NextResponse.json(errorResponse, { status: 404 });
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

    // 处理用户数据管理器错误
    if (error instanceof Error && error.message.includes('已存在')) {
      const errorResponse: ErrorResponse = {
        success: false,
        message: error.message,
      };
      return NextResponse.json(errorResponse, { status: 409 });
    }

    // 处理JSON解析错误
    if (error instanceof SyntaxError) {
      const errorResponse: ErrorResponse = {
        success: false,
        message: '请求格式错误',
        error: '请求数据不是有效的JSON格式',
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

// DELETE - 删除用户
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await checkUserPermission(request);

    const { id } = await params;

    if (!id) {
      throw new ValidationError('用户ID不能为空');
    }

    // 查找目标用户
    const targetUser = await userDataManager.getUserById(id);
    if (!targetUser) {
      throw new UserNotFoundError('用户不存在');
    }

    // 删除用户
    await userDataManager.deleteUser(id);

    // 构造成功响应
    const successResponse: ApiResponse<{ message: string }> = {
      success: true,
      data: { message: '用户删除成功' },
    };

    return NextResponse.json(successResponse, { status: 200 });
  } catch (error) {
    console.error('删除用户API错误:', error);

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

    // 处理用户不存在错误
    if (error instanceof UserNotFoundError) {
      const errorResponse: ErrorResponse = {
        success: false,
        message: error.message,
      };
      return NextResponse.json(errorResponse, { status: 404 });
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
