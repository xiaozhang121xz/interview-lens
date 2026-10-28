import { z } from 'zod';

// ============= 用户相关 Schemas =============

// 用户状态枚举
const UserStatusSchema = z.enum(['active', 'inactive', 'suspended']);

// 基础用户 Schema（不包含敏感信息）
export const UserDTO = z.object({
  id: z.string().uuid().describe('用户唯一标识'),
  username: z.string().describe('用户名'),
  displayName: z.string().describe('显示名称'),
  email: z.string().email().describe('邮箱地址'),
  phone: z.string().optional().describe('手机号码'),
  department: z.string().optional().describe('所属部门'),
  status: UserStatusSchema.describe('用户状态'),
  avatar: z.string().optional().describe('头像URL'),
  createdAt: z.string().datetime().describe('创建时间'),
  updatedAt: z.string().datetime().describe('更新时间'),
});

// 创建用户请求 Schema
export const CreateUserDTO = z.object({
  username: z
    .string()
    .min(3, '用户名至少3个字符')
    .max(50, '用户名不能超过50个字符')
    .regex(/^[a-zA-Z0-9_]+$/, '用户名只能包含字母、数字和下划线')
    .describe('用户名'),
  password: z
    .string()
    .min(6, '密码至少6个字符')
    .max(100, '密码不能超过100个字符')
    .describe('密码'),
  displayName: z
    .string()
    .min(1, '显示名称不能为空')
    .max(50, '显示名称不能超过50个字符')
    .describe('显示名称'),
  email: z
    .string()
    .email('请输入有效的邮箱地址')
    .max(100, '邮箱地址不能超过100个字符')
    .describe('邮箱地址'),
  phone: z
    .string()
    .regex(/^[0-9-+()\s]*$/, '手机号码格式不正确')
    .max(20, '手机号码不能超过20个字符')
    .optional()
    .describe('手机号码'),
  department: z
    .string()
    .max(50, '部门名称不能超过50个字符')
    .optional()
    .describe('所属部门'),
  status: UserStatusSchema.default('active').describe('用户状态'),
});

// 更新用户请求 Schema
export const UpdateUserDTO = z
  .object({
    displayName: z
      .string()
      .min(1, '显示名称不能为空')
      .max(50, '显示名称不能超过50个字符')
      .optional()
      .describe('显示名称'),
    email: z
      .string()
      .email('请输入有效的邮箱地址')
      .max(100, '邮箱地址不能超过100个字符')
      .optional()
      .describe('邮箱地址'),
    phone: z
      .string()
      .regex(/^[0-9-+()\s]*$/, '手机号码格式不正确')
      .max(20, '手机号码不能超过20个字符')
      .optional()
      .describe('手机号码'),
    department: z
      .string()
      .max(50, '部门名称不能超过50个字符')
      .optional()
      .describe('所属部门'),
    status: UserStatusSchema.optional().describe('用户状态'),
  })
  .strict();

// 获取用户列表查询参数 Schema
export const GetUsersQueryDTO = z.object({
  keyword: z.string().optional().describe('搜索关键词'),
  page: z.string().optional().describe('页码'),
  pageSize: z.string().optional().describe('每页数量'),
});

// API 响应包装 Schema
export const createApiResponseSchema = <T extends z.ZodTypeAny>(
  dataSchema: T
) =>
  z.object({
    success: z.boolean().describe('请求是否成功'),
    data: dataSchema.optional().describe('响应数据'),
    message: z.string().optional().describe('响应消息'),
  });

// 分页响应 Schema
export const createPaginatedResponseSchema = <T extends z.ZodTypeAny>(
  itemSchema: T
) =>
  z.object({
    users: z.array(itemSchema).describe('用户列表'),
    total: z.number().describe('总记录数'),
    page: z.number().describe('当前页码'),
    pageSize: z.number().describe('每页数量'),
    totalPages: z.number().describe('总页数'),
  });

// 错误响应 Schema
export const ErrorResponseSchema = z.object({
  success: z.literal(false).describe('请求是否成功'),
  message: z.string().describe('错误消息'),
  error: z.string().optional().describe('错误详情'),
});

// ============= defineRoute 专用响应 Schemas =============

// 分页数据 Schema
export const PaginatedUsersData = z.object({
  users: z.array(UserDTO).describe('用户列表'),
  total: z.number().describe('总记录数'),
  page: z.number().describe('当前页码'),
  pageSize: z.number().describe('每页数量'),
  totalPages: z.number().describe('总页数'),
});

// 成功响应 Schema（用于 defineRoute）
export const GetUsersSuccessSchema = z.object({
  success: z.literal(true),
  data: PaginatedUsersData,
});

export const CreateUserSuccessSchema = z.object({
  success: z.literal(true),
  data: UserDTO,
  message: z.string().optional(),
});

// ============= 导出类型 =============

export type User = z.infer<typeof UserDTO>;
export type CreateUser = z.infer<typeof CreateUserDTO>;
export type UpdateUser = z.infer<typeof UpdateUserDTO>;
export type GetUsersQuery = z.infer<typeof GetUsersQueryDTO>;

// 便捷类型创建函数
export type ApiResponse<T> = z.infer<
  ReturnType<typeof createApiResponseSchema<z.ZodType<T>>>
>;
export type PaginatedResponse<T> = z.infer<
  ReturnType<typeof createPaginatedResponseSchema<z.ZodType<T>>>
>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
