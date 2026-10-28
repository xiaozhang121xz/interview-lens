import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { userDataManager } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { ApiResponse, ExtendedUser, CreateUserBody } from '@/types/user';
import { PasswordHasher, generateUserId } from '@/lib/crypto';

// 定义查询参数验证Schema
const GetUsersQuerySchema = z.object({
  keyword: z.string().optional(),
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1)),
  pageSize: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 20)),
});

// 定义创建用户请求体验证Schema
const CreateUserSchema = z.object({
  username: z
    .string()
    .min(3, '用户名至少3个字符')
    .max(50, '用户名不能超过50个字符')
    .regex(/^[a-zA-Z0-9_]+$/, '用户名只能包含字母、数字和下划线'),
  password: z
    .string()
    .min(6, '密码至少6个字符')
    .max(100, '密码不能超过100个字符'),
  displayName: z
    .string()
    .min(1, '显示名称不能为空')
    .max(50, '显示名称不能超过50个字符'),
  email: z
    .string()
    .email('请输入有效的邮箱地址')
    .max(100, '邮箱地址不能超过100个字符'),
  phone: z
    .string()
    .regex(/^[0-9-+()\s]*$/, '手机号码格式不正确')
    .max(20, '手机号码不能超过20个字符')
    .optional()
    .or(z.literal('')),
  department: z.string().max(50, '部门名称不能超过50个字符').optional(),
  status: z.enum(['active', 'inactive', 'suspended']).default('active'),
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

// 检查用户是否已认证的辅助函数（不需要管理员权限）
async function checkUserAuthenticated(
  request: NextRequest
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
    if (error instanceof UnauthorizedError) {
      throw error;
    }
    throw new UnauthorizedError('令牌验证失败');
  }
}

// GET - 获取用户列表（支持搜索和分页）
/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: 获取用户列表
 *     description: 支持关键词搜索和分页查询用户列表。关键词可匹配用户名或邮箱。
 *     tags: [Users]
 *     parameters:
 *       - name: keyword
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *         description: 搜索关键词（可匹配用户名或邮箱）
 *       - name: page
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *           default: "1"
 *         description: 页码（从1开始）
 *       - name: pageSize
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *           default: "20"
 *         description: 每页数量（1-100）
 *     responses:
 *       200:
 *         description: 成功获取用户列表
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
 *                     users:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: number
 *                             example: 1
 *                             description: 用户ID
 *                           username:
 *                             type: string
 *                             example: "john_doe"
 *                             description: 用户名
 *                           displayName:
 *                             type: string
 *                             example: "John Doe"
 *                             description: 显示名称
 *                           email:
 *                             type: string
 *                             example: "john@example.com"
 *                             description: 邮箱地址
 *                           department:
 *                             type: string
 *                             nullable: true
 *                             example: "技术部"
 *                             description: 部门
 *                           status:
 *                             type: string
 *                             enum: [active, inactive, suspended]
 *                             example: "active"
 *                             description: 用户状态
 *                     total:
 *                       type: number
 *                       example: 100
 *                       description: 总用户数
 *                     page:
 *                       type: number
 *                       example: 1
 *                       description: 当前页码
 *                     pageSize:
 *                       type: number
 *                       example: 20
 *                       description: 每页数量
 *                     totalPages:
 *                       type: number
 *                       example: 5
 *                       description: 总页数
 *       400:
 *         description: 请求参数验证失败
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "查询参数验证失败"
 *                 error:
 *                   type: string
 *                   example: "page: 页码必须大于0"
 *       500:
 *         description: 服务器内部错误
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "服务器内部错误"
 */
export async function GET(request: NextRequest) {
  try {
    await checkUserPermission(request);

    // 获取查询参数
    const { searchParams } = new URL(request.url);
    const queryObject = Object.fromEntries(searchParams.entries());

    // 验证查询参数
    const validationResult = GetUsersQuerySchema.safeParse(queryObject);
    if (!validationResult.success) {
      const errorMessages = validationResult.error.issues
        .map((err: z.ZodIssue) => `${err.path}: ${err.message}`)
        .join(', ');
      throw new ValidationError('查询参数验证失败', errorMessages);
    }

    const { keyword, page, pageSize } = validationResult.data;

    // 验证分页参数
    if (page < 1) {
      throw new ValidationError('页码必须大于0');
    }
    if (pageSize < 1 || pageSize > 100) {
      throw new ValidationError('每页数量必须在1-100之间');
    }

    // 搜索用户
    const searchResult = await userDataManager.searchUsers({
      keyword,
      page,
      pageSize,
    });

    // 构造成功响应
    const successResponse: ApiResponse<{
      users: ExtendedUser[];
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    }> = {
      success: true,
      data: searchResult,
    };

    return NextResponse.json(successResponse, { status: 200 });
  } catch (error) {
    console.error('获取用户列表API错误:', error);

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

// POST - 创建新用户
/**
 * @swagger
 * /api/users:
 *   post:
 *     summary: 创建新用户
 *     description: 创建一个新的用户账号。用户名和邮箱必须唯一。
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *               - displayName
 *               - email
 *             properties:
 *               username:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 50
 *                 pattern: '^[a-zA-Z0-9_]+$'
 *                 description: 用户名（3-50个字符，只能包含字母、数字和下划线）
 *                 example: "john_doe"
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 maxLength: 100
 *                 description: 密码（至少6个字符）
 *                 example: "password123"
 *               displayName:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 50
 *                 description: 显示名称
 *                 example: "John Doe"
 *               email:
 *                 type: string
 *                 format: email
 *                 maxLength: 100
 *                 description: 邮箱地址
 *                 example: "john@example.com"
 *               phone:
 *                 type: string
 *                 maxLength: 20
 *                 pattern: '^[0-9-+()\\s]*$'
 *                 description: 手机号码（可选）
 *                 example: "+86 13800138000"
 *               department:
 *                 type: string
 *                 maxLength: 50
 *                 description: 部门名称（可选）
 *                 example: "技术部"
 *               status:
 *                 type: string
 *                 enum: [active, inactive, suspended]
 *                 default: active
 *                 description: 用户状态
 *                 example: "active"
 *     responses:
 *       201:
 *         description: 用户创建成功
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
 *                       type: number
 *                       example: 1
 *                       description: 新创建的用户ID
 *                     username:
 *                       type: string
 *                       example: "john_doe"
 *                       description: 用户名
 *                     displayName:
 *                       type: string
 *                       example: "John Doe"
 *                       description: 显示名称
 *                     email:
 *                       type: string
 *                       example: "john@example.com"
 *                       description: 邮箱地址
 *                     department:
 *                       type: string
 *                       nullable: true
 *                       example: "技术部"
 *                       description: 部门
 *                     phone:
 *                       type: string
 *                       nullable: true
 *                       example: "+86 13800138000"
 *                       description: 手机号码
 *                     status:
 *                       type: string
 *                       enum: [active, inactive, suspended]
 *                       example: "active"
 *                       description: 用户状态
 *                 message:
 *                   type: string
 *                   example: "用户创建成功"
 *                   description: 操作成功消息
 *       400:
 *         description: 请求参数验证失败或用户已存在
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "用户名 \"john_doe\" 已存在"
 *                 error:
 *                   type: string
 *                   example: "username: 用户名至少3个字符"
 *       500:
 *         description: 服务器内部错误
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "服务器内部错误"
 */
export async function POST(request: NextRequest) {
  try {
    await checkUserPermission(request);

    // 获取请求体
    const body = await request.json();

    // 验证请求数据
    const validationResult = CreateUserSchema.safeParse(body);
    if (!validationResult.success) {
      const errorMessages = validationResult.error.issues
        .map((err: z.ZodIssue) => `${err.path}: ${err.message}`)
        .join(', ');
      throw new ValidationError('请求参数验证失败', errorMessages);
    }

    const {
      username,
      password,
      displayName,
      email,
      phone,
      department,
      status,
    } = validationResult.data;

    // 检查用户名是否已存在
    const existingUsername = await userDataManager.getUserByUsername(username);
    if (existingUsername) {
      throw new ValidationError(`用户名 "${username}" 已存在`);
    }

    // 检查邮箱是否已存在
    const existingEmail = await userDataManager.emailExists(email);
    if (existingEmail) {
      throw new ValidationError(`邮箱 "${email}" 已被注册`);
    }

    // 加密密码
    const hashedPassword = await PasswordHasher.hash(password);

    // 创建用户
    const newUser = await userDataManager.addUser({
      username,
      password: hashedPassword,
      displayName,
      email,
      phone: phone || undefined,
      department: department || undefined,
      status,
      avatar: '', // 默认空头像
    });

    // 返回创建的用户信息（不包含密码）
    const { password: _, ...userWithoutPassword } = newUser;
    const extendedUser: ExtendedUser = {
      ...userWithoutPassword,
      department: userWithoutPassword.department || undefined,
      phone: userWithoutPassword.phone || undefined,
    };

    // 构造成功响应
    const successResponse: ApiResponse<ExtendedUser> = {
      success: true,
      data: extendedUser,
      message: '用户创建成功',
    };

    return NextResponse.json(successResponse, { status: 201 });
  } catch (error) {
    console.error('创建用户API错误:', error);

    // 处理验证错误
    if (error instanceof ValidationError) {
      const errorResponse: ErrorResponse = {
        success: false,
        message: error.message,
        error: error.details,
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // 处理其他已知错误
    if (error instanceof Error) {
      const errorResponse: ErrorResponse = {
        success: false,
        message: error.message,
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
