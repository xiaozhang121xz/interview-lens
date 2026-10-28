import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { userDataManager } from '@/lib/db';
import { PasswordHasher } from '@/lib/crypto';

// 定义注册请求体验证Schema
const RegisterRequestSchema = z.object({
  username: z
    .string()
    .min(3, '用户名至少需要3个字符')
    .max(20, '用户名不能超过20个字符')
    .regex(/^[a-zA-Z0-9_]+$/, '用户名只能包含字母、数字和下划线'),
  password: z
    .string()
    .min(8, '密码至少需要8个字符')
    .max(100, '密码不能超过100个字符'),
  displayName: z
    .string()
    .min(1, '显示名称不能为空')
    .max(50, '显示名称不能超过50个字符')
    .optional(), // 可选字段
  email: z
    .string()
    .email('请输入有效的邮箱地址')
    .max(100, '邮箱地址不能超过100个字符'),
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
}

// 定义注册成功响应接口
interface RegisterSuccessResponse {
  user: UserResponse;
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

class UserExistsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UserExistsError';
  }
}

export async function POST(request: NextRequest) {
  try {
    // 解析请求体
    const requestBody = await request.json();

    // 验证请求数据
    const validationResult = RegisterRequestSchema.safeParse(requestBody);

    if (!validationResult.success) {
      const errorMessages = validationResult.error.issues
        .map((err: z.ZodIssue) => err.message)
        .join(', ');
      throw new ValidationError('请求参数验证失败', errorMessages);
    }

    const { username, password, displayName, email } = validationResult.data;

    // 如果没有提供displayName，则使用username
    const finalDisplayName = displayName || username;

    // 检查用户名是否已存在
    const existingUser = await userDataManager.getUserByUsername(username);
    if (existingUser) {
      throw new UserExistsError(`用户名 "${username}" 已存在`);
    }

    // 检查邮箱是否已存在
    const existingEmail = await userDataManager.emailExists(email);
    if (existingEmail) {
      throw new UserExistsError(`邮箱 "${email}" 已被注册`);
    }

    // 创建新用户
    const newUser = await userDataManager.addUser({
      username,
      password: await PasswordHasher.hash(password),
      displayName: finalDisplayName,
      email,
      avatar: '', // 默认空头像
      status: 'active', // 默认激活状态
    });

    // 构造用户响应对象（不包含密码）
    const userResponse: UserResponse = {
      id: newUser.id,
      username: newUser.username,
      displayName: newUser.displayName,
      email: newUser.email,
      avatar: newUser.avatar,
      status: newUser.status,
      createdAt: newUser.createdAt,
    };

    // 构造成功响应
    const successResponse: RegisterSuccessResponse = {
      user: userResponse,
      message: '用户注册成功',
    };

    // 返回成功响应
    return NextResponse.json(successResponse, { status: 201 });
  } catch (error) {
    console.error('注册API错误:', error);

    // 处理用户已存在错误
    if (error instanceof UserExistsError) {
      const errorResponse: ErrorResponse = {
        error: error.message,
      };
      return NextResponse.json(errorResponse, { status: 409 });
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
