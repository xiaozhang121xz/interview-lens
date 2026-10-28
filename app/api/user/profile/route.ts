import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { userDataManager } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

// 定义更新用户信息请求体验证Schema
const UpdateProfileRequestSchema = z.object({
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
  password: z
    .string()
    .min(6, '密码至少需要6个字符')
    .max(100, '密码不能超过100个字符')
    .optional(),
  avatar: z.string().max(200, '头像URL不能超过200个字符').optional(),
});

// 定义用户响应类型（不包含密码）
interface UserResponse {
  id: string;
  username: string;
  displayName: string;
  email: string;
  avatar: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

// 定义响应接口
interface UserProfileResponse {
  user: UserResponse;
}

interface UpdateProfileResponse {
  user: UserResponse;
  message: string;
}

interface DeleteProfileResponse {
  message: string;
}

// 定义错误响应接口
interface ErrorResponse {
  error: string;
  details?: string;
}

// 自定义错误类
class ValidationError extends Error {
  constructor(
    message: string,
    public details?: string
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

class UserNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UserNotFoundError';
  }
}

class UnauthorizedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

// 从请求中获取用户ID的辅助函数
async function getUserIdFromRequest(request: NextRequest): Promise<string> {
  try {
    // 从Authorization header获取token
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('缺少有效的授权令牌');
    }

    const token = authHeader.substring(7);
    const payload = await verifyToken(token);

    if (!payload || !payload.id) {
      throw new UnauthorizedError('令牌中缺少用户ID');
    }

    return payload.id;
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      throw error;
    }
    throw new UnauthorizedError('无效的授权令牌');
  }
}

// GET - 获取用户信息
export async function GET(request: NextRequest) {
  try {
    // 获取用户ID
    const userId = await getUserIdFromRequest(request);

    // 查找用户
    const user = await userDataManager.getUserById(userId);
    if (!user) {
      throw new UserNotFoundError('用户不存在');
    }

    // 构造用户响应对象（不包含密码）
    const userResponse: UserResponse = {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      email: user.email,
      avatar: user.avatar,
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    // 构造成功响应
    const successResponse: UserProfileResponse = {
      user: userResponse,
    };

    return NextResponse.json(successResponse, { status: 200 });
  } catch (error) {
    console.error('获取用户信息API错误:', error);

    // 处理未授权错误
    if (error instanceof UnauthorizedError) {
      const errorResponse: ErrorResponse = {
        error: error.message,
      };
      return NextResponse.json(errorResponse, { status: 401 });
    }

    // 处理用户不存在错误
    if (error instanceof UserNotFoundError) {
      const errorResponse: ErrorResponse = {
        error: error.message,
      };
      return NextResponse.json(errorResponse, { status: 404 });
    }

    // 处理其他未知错误
    const errorResponse: ErrorResponse = {
      error: '服务器内部错误',
      details:
        process.env.NODE_ENV === 'development' ? String(error) : undefined,
    };
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

// PUT - 更新用户信息
export async function PUT(request: NextRequest) {
  try {
    // 获取用户ID
    const userId = await getUserIdFromRequest(request);

    // 查找用户
    const existingUser = await userDataManager.getUserById(userId);
    if (!existingUser) {
      throw new UserNotFoundError('用户不存在');
    }

    // 解析请求体
    const requestBody = await request.json();

    // 验证请求数据
    const validationResult = UpdateProfileRequestSchema.safeParse(requestBody);

    if (!validationResult.success) {
      const errorMessages = validationResult.error.issues
        .map((err: z.ZodIssue) => err.message)
        .join(', ');
      throw new ValidationError('请求参数验证失败', errorMessages);
    }

    const updates = validationResult.data;

    // 检查邮箱是否已被其他用户使用
    if (updates.email && updates.email !== existingUser.email) {
      const emailExists = await userDataManager.emailExists(updates.email);
      if (emailExists) {
        throw new ValidationError('邮箱已被其他用户使用', updates.email);
      }
    }

    // 更新用户信息
    const updatedUser = await userDataManager.updateUser(userId, updates);

    // 构造用户响应对象（不包含密码）
    const userResponse: UserResponse = {
      id: updatedUser.id,
      username: updatedUser.username,
      displayName: updatedUser.displayName,
      email: updatedUser.email,
      avatar: updatedUser.avatar,
      status: updatedUser.status,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
    };

    // 构造成功响应
    const successResponse: UpdateProfileResponse = {
      user: userResponse,
      message: '用户信息更新成功',
    };

    return NextResponse.json(successResponse, { status: 200 });
  } catch (error) {
    console.error('更新用户信息API错误:', error);

    // 处理未授权错误
    if (error instanceof UnauthorizedError) {
      const errorResponse: ErrorResponse = {
        error: error.message,
      };
      return NextResponse.json(errorResponse, { status: 401 });
    }

    // 处理用户不存在错误
    if (error instanceof UserNotFoundError) {
      const errorResponse: ErrorResponse = {
        error: error.message,
      };
      return NextResponse.json(errorResponse, { status: 404 });
    }

    // 处理验证错误
    if (error instanceof ValidationError) {
      const errorResponse: ErrorResponse = {
        error: error.message,
        details: error.details,
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // 处理用户数据管理器错误
    if (error instanceof Error && error.message.includes('已存在')) {
      const errorResponse: ErrorResponse = {
        error: error.message,
      };
      return NextResponse.json(errorResponse, { status: 409 });
    }

    // 处理JSON解析错误
    if (error instanceof SyntaxError) {
      const errorResponse: ErrorResponse = {
        error: '请求格式错误',
        details: '请求数据不是有效的JSON格式',
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // 处理其他未知错误
    const errorResponse: ErrorResponse = {
      error: '服务器内部错误',
      details:
        process.env.NODE_ENV === 'development' ? String(error) : undefined,
    };
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

// DELETE - 删除用户账户
export async function DELETE(request: NextRequest) {
  try {
    // 获取用户ID
    const userId = await getUserIdFromRequest(request);

    // 查找用户
    const existingUser = await userDataManager.getUserById(userId);
    if (!existingUser) {
      throw new UserNotFoundError('用户不存在');
    }

    // 删除用户
    await userDataManager.deleteUser(userId);

    // 构造成功响应
    const successResponse: DeleteProfileResponse = {
      message: '用户账户删除成功',
    };

    return NextResponse.json(successResponse, { status: 200 });
  } catch (error) {
    console.error('删除用户账户API错误:', error);

    // 处理未授权错误
    if (error instanceof UnauthorizedError) {
      const errorResponse: ErrorResponse = {
        error: error.message,
      };
      return NextResponse.json(errorResponse, { status: 401 });
    }

    // 处理用户不存在错误
    if (error instanceof UserNotFoundError) {
      const errorResponse: ErrorResponse = {
        error: error.message,
      };
      return NextResponse.json(errorResponse, { status: 404 });
    }

    // 处理其他未知错误
    const errorResponse: ErrorResponse = {
      error: '服务器内部错误',
      details:
        process.env.NODE_ENV === 'development' ? String(error) : undefined,
    };
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
