// 扩展用户数据模型（从 lib/db 重新导出）
export type {
  ExtendedUser,
  ExtendedUserWithPassword,
  UserSearchParams,
  UserSearchResult,
} from '@/lib/db';

// 用户状态枚举
export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

// 部门枚举 (示例)
export enum Department {
  IT = 'IT部门',
  HR = '人力资源',
  FINANCE = '财务部',
  MARKETING = '市场部',
  OPERATIONS = '运营部',
}

// API响应类型
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// API错误类型
export interface ApiError {
  success: false;
  message: string;
  error?: string;
}

// 用户更新请求体
export interface UpdateUserBody {
  displayName?: string;
  email?: string;
  phone?: string;
  department?: Department;
  status?: UserStatus;
}

// 用户创建请求体
export interface CreateUserBody {
  username: string;
  password: string;
  displayName: string;
  email: string;
  phone?: string;
  department?: Department;
  status?: UserStatus;
}

// 当前用户信息
export interface CurrentUser {
  id: string;
  username: string;
  displayName: string;
  department?: Department;
}
