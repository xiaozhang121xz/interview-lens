/**
 * 数据访问层 - Prisma 实现
 * 完全兼容原有 JSON UserDataManager 的接口
 */

import prisma from "./prisma";
import type { LoginUser, User } from "@prisma/client";
import { PasswordHasher } from "@/lib/crypto";

// 导出 prisma 实例供其他模块使用
export { default as prisma } from "./prisma";

// ============================================
// 类型定义（兼容原有类型）
// ============================================

export interface ExtendedUser {
  id: string;
  username: string;
  displayName: string;
  email: string;
  avatar: string;
  status: string;
  department?: string;
  phone?: string;
  createdAt: string;
  updatedAt: string;
}

// 包含密码的完整用户类型（仅内部使用）
export interface ExtendedUserWithPassword extends ExtendedUser {
  password: string;
}

export interface UserSearchParams {
  keyword?: string;
  page?: number;
  pageSize?: number;
}

export interface UserSearchResult {
  users: ExtendedUser[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export enum UserStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  SUSPENDED = "suspended",
}

export type Department = string;

export interface CreateLoginUserData {
  username: string;
  password: string;
  displayName: string;
  email: string;
  avatar?: string;
  status?: string;
  department?: string;
  phone?: string;
}

export interface UpdateLoginUserData {
  displayName?: string;
  email?: string;
  avatar?: string;
  status?: string;
  department?: string;
  phone?: string;
  password?: string;
}

export interface CreateUserData {
  phone: string;
  nickname: string;
  avatar?: string;
  status?: string;
}

// ============================================
// 登录用户数据管理器（完全兼容原有 UserDataManager）
// ============================================

export class LoginUserDataManager {
  /**
   * 验证登录（兼容原有方法）
   */
  static async validateLogin(
    username: string,
    password: string
  ): Promise<ExtendedUser | null> {
    const user = await prisma.loginUser.findUnique({
      where: { username },
    });

    if (!user || user.status !== "active") {
      return null;
    }

    // 兼容现代 PBKDF2、旧版 salt:hash 和历史明文密码。
    let isPasswordValid = false;

    const isHashedPassword =
      user.password.startsWith("pbkdf2$") || user.password.includes(":");
    if (isHashedPassword) {
      // 哈希密码验证
      isPasswordValid = await PasswordHasher.verify(password, user.password);
    } else {
      // 明文密码验证（向后兼容）
      isPasswordValid = password === user.password;
    }

    if (!isPasswordValid) {
      return null;
    }

    return this.toExtendedUser(user);
  }

  /**
   * 获取所有用户
   */
  static async getAll(): Promise<ExtendedUser[]> {
    const users = await prisma.loginUser.findMany({
      orderBy: { createdAt: "desc" },
    });
    return users.map(this.toExtendedUser);
  }

  /**
   * 获取用户列表（getUsers 别名）
   */
  static async getUsers(): Promise<ExtendedUser[]> {
    return this.getAll();
  }

  /**
   * 根据 ID 获取用户
   */
  static async getById(id: string): Promise<ExtendedUser | null> {
    const user = await prisma.loginUser.findUnique({
      where: { id },
    });
    return user ? this.toExtendedUser(user) : null;
  }

  /**
   * 根据 ID 获取用户（getUserById 别名）
   */
  static async getUserById(id: string): Promise<ExtendedUser | null> {
    return this.getById(id);
  }

  /**
   * 根据用户名获取用户（getUserByUsername 别名）
   * 返回包含密码的用户信息（用于密码验证）
   */
  static async getUserByUsername(username: string): Promise<ExtendedUserWithPassword | null> {
    const user = await prisma.loginUser.findUnique({
      where: { username },
    });
    return user ? this.toExtendedUserWithPassword(user) : null;
  }

  /**
   * 根据用户名获取用户（兼容别名）
   */
  static async getByUsername(username: string): Promise<ExtendedUserWithPassword | null> {
    return this.getUserByUsername(username);
  }

  /**
   * 根据邮箱获取用户
   */
  static async getByEmail(email: string): Promise<ExtendedUser | null> {
    const user = await prisma.loginUser.findUnique({
      where: { email },
    });
    return user ? this.toExtendedUser(user) : null;
  }

  /**
   * 创建用户（兼容原有 addUser 方法）
   * 返回包含密码的完整用户信息
   */
  static async create(data: CreateLoginUserData): Promise<ExtendedUserWithPassword> {
    // 检查用户名是否已存在
    const existingUsername = await prisma.loginUser.findUnique({
      where: { username: data.username },
    });
    if (existingUsername) {
      throw new Error(`用户名 "${data.username}" 已存在`);
    }

    // 检查邮箱是否已存在
    const existingEmail = await prisma.loginUser.findUnique({
      where: { email: data.email },
    });
    if (existingEmail) {
      throw new Error(`邮箱 "${data.email}" 已被注册`);
    }

    const user = await prisma.loginUser.create({
      data: {
        username: data.username,
        password: data.password,
        displayName: data.displayName,
        email: data.email,
        avatar: data.avatar || "",
        status: data.status || "active",
        department: data.department || null,
        phone: data.phone || null,
      },
    });

    return this.toExtendedUserWithPassword(user);
  }

  /**
   * 添加用户（addUser 别名，兼容原有方法）
   * 返回包含密码的完整用户信息
   */
  static async addUser(
    data: Omit<CreateLoginUserData, "id"> & { id?: string }
  ): Promise<ExtendedUserWithPassword> {
    return this.create(data);
  }

  /**
   * 更新用户
   */
  static async update(
    id: string,
    data: UpdateLoginUserData
  ): Promise<ExtendedUser> {
    const user = await prisma.loginUser.update({
      where: { id },
      data,
    });
    return this.toExtendedUser(user);
  }

  /**
   * 更新用户（updateUser 别名）
   */
  static async updateUser(
    id: string,
    data: UpdateLoginUserData
  ): Promise<ExtendedUser> {
    return this.update(id, data);
  }

  /**
   * 删除用户
   */
  static async delete(id: string): Promise<ExtendedUser> {
    const user = await prisma.loginUser.delete({
      where: { id },
    });
    return this.toExtendedUser(user);
  }

  /**
   * 删除用户（deleteUser 别名）
   */
  static async deleteUser(id: string): Promise<boolean> {
    await prisma.loginUser.delete({
      where: { id },
    });
    return true;
  }

  /**
   * 检查用户名是否存在
   */
  static async existsByUsername(username: string): Promise<boolean> {
    const count = await prisma.loginUser.count({
      where: { username },
    });
    return count > 0;
  }

  /**
   * 检查用户名是否存在（usernameExists 别名）
   */
  static async usernameExists(username: string): Promise<boolean> {
    return this.existsByUsername(username);
  }

  /**
   * 检查邮箱是否存在
   */
  static async existsByEmail(email: string): Promise<boolean> {
    const count = await prisma.loginUser.count({
      where: { email },
    });
    return count > 0;
  }

  /**
   * 检查邮箱是否存在（emailExists 别名）
   */
  static async emailExists(email: string): Promise<boolean> {
    return this.existsByEmail(email);
  }

  /**
   * 搜索用户（支持关键字、分页）
   */
  static async searchUsers(params: UserSearchParams): Promise<UserSearchResult> {
    const { keyword = "", page = 1, pageSize = 20 } = params;

    // 构建查询条件
    const where = keyword.trim()
      ? {
          OR: [
            { username: { contains: keyword, mode: "insensitive" as const } },
            { displayName: { contains: keyword, mode: "insensitive" as const } },
            { email: { contains: keyword, mode: "insensitive" as const } },
            { department: { contains: keyword, mode: "insensitive" as const } },
            { phone: { contains: keyword } },
          ],
        }
      : {};

    // 获取总数
    const total = await prisma.loginUser.count({ where });

    // 分页查询
    const users = await prisma.loginUser.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    const totalPages = Math.ceil(total / pageSize);

    return {
      users: users.map(this.toExtendedUser),
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  /**
   * 模糊搜索用户
   */
  static async fuzzySearch(
    keyword: string,
    limit: number = 10
  ): Promise<ExtendedUser[]> {
    if (!keyword.trim()) {
      return [];
    }

    const result = await this.searchUsers({ keyword, pageSize: limit });
    return result.users;
  }

  /**
   * 根据部门获取用户
   */
  static async getUsersByDepartment(department: string): Promise<ExtendedUser[]> {
    const users = await prisma.loginUser.findMany({
      where: { department },
      orderBy: { createdAt: "desc" },
    });
    return users.map(this.toExtendedUser);
  }

  /**
   * 根据状态获取用户
   */
  static async getUsersByStatus(status: string): Promise<ExtendedUser[]> {
    const users = await prisma.loginUser.findMany({
      where: { status },
      orderBy: { createdAt: "desc" },
    });
    return users.map(this.toExtendedUser);
  }

  /**
   * 获取扩展用户信息
   */
  static async getExtendedUserById(id: string): Promise<ExtendedUser | null> {
    return this.getById(id);
  }

  /**
   * 批量更新用户状态
   */
  static async batchUpdateStatus(
    userIds: string[],
    status: string
  ): Promise<void> {
    await prisma.loginUser.updateMany({
      where: { id: { in: userIds } },
      data: { status },
    });
  }

  /**
   * 获取用户统计信息
   */
  static async getUserStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    suspended: number;
    byDepartment: Record<string, number>;
  }> {
    const allUsers = await prisma.loginUser.findMany();

    const stats = {
      total: allUsers.length,
      active: 0,
      inactive: 0,
      suspended: 0,
      byDepartment: {} as Record<string, number>,
    };

    allUsers.forEach((user) => {
      // 按状态统计
      switch (user.status) {
        case "active":
          stats.active++;
          break;
        case "inactive":
          stats.inactive++;
          break;
        case "suspended":
          stats.suspended++;
          break;
      }

      // 按部门统计
      if (user.department) {
        stats.byDepartment[user.department] =
          (stats.byDepartment[user.department] || 0) + 1;
      }
    });

    return stats;
  }

  /**
   * 转换为 ExtendedUser 格式（日期转为字符串以兼容原有类型）
   */
  private static toExtendedUser(user: LoginUser): ExtendedUser {
    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      email: user.email,
      avatar: user.avatar,
      status: user.status,
      department: user.department || undefined,
      phone: user.phone || undefined,
      createdAt: user.createdAt instanceof Date ? user.createdAt.toISOString() : user.createdAt,
      updatedAt: user.updatedAt instanceof Date ? user.updatedAt.toISOString() : user.updatedAt,
    };
  }

  /**
   * 转换为 ExtendedUserWithPassword 格式（包含密码）
   */
  private static toExtendedUserWithPassword(user: LoginUser): ExtendedUserWithPassword {
    return {
      ...this.toExtendedUser(user),
      password: user.password,
    };
  }
}

// ============================================
// 用户数据管理器（手机号登录用户）
// ============================================

export class UserDataManager {
  /**
   * 获取所有用户
   */
  static async getAll(): Promise<User[]> {
    return prisma.user.findMany({
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * 根据 ID 获取用户
   */
  static async getById(id: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id },
    });
  }

  /**
   * 根据手机号获取用户
   */
  static async getByPhone(phone: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { phone },
    });
  }

  /**
   * 创建用户
   */
  static async create(data: CreateUserData): Promise<User> {
    return prisma.user.create({
      data,
    });
  }

  /**
   * 更新用户
   */
  static async update(
    id: string,
    data: Partial<Omit<User, "id" | "createdAt">>
  ): Promise<User> {
    return prisma.user.update({
      where: { id },
      data,
    });
  }

  /**
   * 删除用户
   */
  static async delete(id: string): Promise<User> {
    return prisma.user.delete({
      where: { id },
    });
  }
}

// ============================================
// 导出兼容性别名
// ============================================

// 导出 userDataManager 单例（兼容原有代码）
export const userDataManager = {
  validateLogin: LoginUserDataManager.validateLogin.bind(LoginUserDataManager),
  getUsers: LoginUserDataManager.getUsers.bind(LoginUserDataManager),
  getUserById: LoginUserDataManager.getUserById.bind(LoginUserDataManager),
  getUserByUsername: LoginUserDataManager.getUserByUsername.bind(LoginUserDataManager),
  addUser: LoginUserDataManager.addUser.bind(LoginUserDataManager),
  updateUser: LoginUserDataManager.updateUser.bind(LoginUserDataManager),
  deleteUser: LoginUserDataManager.deleteUser.bind(LoginUserDataManager),
  usernameExists: LoginUserDataManager.usernameExists.bind(LoginUserDataManager),
  emailExists: LoginUserDataManager.emailExists.bind(LoginUserDataManager),
  searchUsers: LoginUserDataManager.searchUsers.bind(LoginUserDataManager),
  fuzzySearch: LoginUserDataManager.fuzzySearch.bind(LoginUserDataManager),
  getUsersByDepartment: LoginUserDataManager.getUsersByDepartment.bind(LoginUserDataManager),
  getUsersByStatus: LoginUserDataManager.getUsersByStatus.bind(LoginUserDataManager),
  getExtendedUserById: LoginUserDataManager.getExtendedUserById.bind(LoginUserDataManager),
  batchUpdateStatus: LoginUserDataManager.batchUpdateStatus.bind(LoginUserDataManager),
  getUserStats: LoginUserDataManager.getUserStats.bind(LoginUserDataManager),
};

// 导出默认的数据管理器
export const DataManager = {
  LoginUser: LoginUserDataManager,
  User: UserDataManager,
};

export default DataManager;
