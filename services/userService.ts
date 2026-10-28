import axios, { AxiosError } from 'axios';
import {
  ExtendedUser,
  CreateUserBody,
  UpdateUserBody,
  ApiResponse,
} from '@/types/user';

/**
 * 用户服务类
 * 提供用户相关的 API 调用方法
 */
class UserService {
  private readonly baseURL = '/api/users';

  /**
   * 获取用户列表
   * @param params 查询参数
   * @returns 用户列表和分页信息
   */
  async getUsers(params?: {
    keyword?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{
    users: ExtendedUser[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    try {
      const response = await axios.get<
        ApiResponse<{
          users: ExtendedUser[];
          total: number;
          page: number;
          pageSize: number;
          totalPages: number;
        }>
      >(this.baseURL, { params });

      if (!response.data.success) {
        throw new Error(response.data.message || '获取用户列表失败');
      }

      return response.data.data;
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  /**
   * 根据ID获取用户详情
   * @param id 用户ID
   * @returns 用户详情
   */
  async getUserById(id: number): Promise<ExtendedUser> {
    try {
      const response = await axios.get<ApiResponse<ExtendedUser>>(
        `${this.baseURL}/${id}`
      );

      if (!response.data.success) {
        throw new Error(response.data.message || '获取用户详情失败');
      }

      return response.data.data;
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  /**
   * 创建新用户
   * @param data 创建用户数据
   * @returns 新创建的用户信息
   */
  async createUser(data: CreateUserBody): Promise<ExtendedUser> {
    try {
      const response = await axios.post<ApiResponse<ExtendedUser>>(
        this.baseURL,
        data
      );

      if (!response.data.success) {
        throw new Error(response.data.message || '创建用户失败');
      }

      return response.data.data;
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  /**
   * 更新用户信息
   * @param id 用户ID
   * @param data 更新用户数据
   * @returns 更新后的用户信息
   */
  async updateUser(
    id: number,
    data: UpdateUserBody
  ): Promise<ExtendedUser> {
    try {
      const response = await axios.put<ApiResponse<ExtendedUser>>(
        `${this.baseURL}/${id}`,
        data
      );

      if (!response.data.success) {
        throw new Error(response.data.message || '更新用户失败');
      }

      return response.data.data;
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  /**
   * 删除用户
   * @param id 用户ID
   * @returns 是否删除成功
   */
  async deleteUser(id: number): Promise<boolean> {
    try {
      const response = await axios.delete<ApiResponse<void>>(
        `${this.baseURL}/${id}`
      );

      if (!response.data.success) {
        throw new Error(response.data.message || '删除用户失败');
      }

      return true;
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  /**
   * 搜索用户
   * @param params 搜索参数
   * @returns 搜索结果
   */
  async searchUsers(params?: {
    keyword?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{
    users: ExtendedUser[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    try {
      const response = await axios.get<
        ApiResponse<{
          users: ExtendedUser[];
          total: number;
          page: number;
          pageSize: number;
          totalPages: number;
        }>
      >(`${this.baseURL}/search`, { params });

      if (!response.data.success) {
        throw new Error(response.data.message || '搜索用户失败');
      }

      return response.data.data;
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  /**
   * 统一错误处理
   * @param error 错误对象
   */
  private handleError(error: unknown): void {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{
        success: false;
        message: string;
        error?: string;
      }>;

      // 服务器返回的错误信息
      if (axiosError.response?.data) {
        const { message, error: errorDetail } = axiosError.response.data;
        throw new Error(errorDetail || message);
      }

      // 网络错误
      if (axiosError.request) {
        throw new Error('网络连接失败，请检查网络设置');
      }
    }

    // 未知错误
    if (error instanceof Error) {
      throw error;
    }
  }
}

// 导出单例
export const userService = new UserService();
