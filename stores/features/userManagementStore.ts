'use client';

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import {
  ExtendedUser,
  UserSearchParams,
  UserSearchResult,
  UpdateUserBody,
} from '@/types/user';
import { apiInstance } from '@/lib/apiCreator';

// API 接口函数
const api = {
  // 获取用户列表
  async getUsers(params: UserSearchParams): Promise<UserSearchResult> {
    const searchParams = new URLSearchParams();
    if (params.keyword) searchParams.append('keyword', params.keyword);
    if (params.page) searchParams.append('page', params.page.toString());
    if (params.pageSize)
      searchParams.append('pageSize', params.pageSize.toString());

    const response = await apiInstance.get<UserSearchResult>(
      `/users?${searchParams.toString()}`
    );
    return response.data;
  },

  // 获取单个用户
  async getUser(id: string): Promise<ExtendedUser> {
    const response = await apiInstance.get<ExtendedUser>(`/users/${id}`);
    return response.data;
  },

  // 更新用户
  async updateUser(id: string, data: UpdateUserBody): Promise<ExtendedUser> {
    const response = await apiInstance.put<ExtendedUser>(`/users/${id}`, data);
    return response.data;
  },

  // 删除用户
  async deleteUser(id: string): Promise<void> {
    await apiInstance.delete(`/users/${id}`);
  },

  // 搜索用户
  async searchUsers(keyword: string): Promise<ExtendedUser[]> {
    const response = await apiInstance.get<ExtendedUser[]>(
      `/users/search?q=${encodeURIComponent(keyword)}&limit=10`
    );
    return response.data;
  },

  // 获取当前用户
  async getCurrentUser(): Promise<ExtendedUser> {
    const response = await fetch('/api/users/current', {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || '获取当前用户失败');
    }

    const result = await response.json();
    return result.data as ExtendedUser;
  },
};

// 状态接口定义
interface UserManagementState {
  // 状态
  users: ExtendedUser[];
  currentUser: ExtendedUser | null;
  loading: boolean;
  error: string | null;

  // 分页状态
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };

  // 搜索状态
  searchFilters: UserSearchParams;

  // 编辑状态
  editingUser: ExtendedUser | null;
  editDialogOpen: boolean;
  editLoading: boolean;

  // 操作
  fetchUsers: (params?: UserSearchParams) => Promise<void>;
  fetchCurrentUser: () => Promise<void>;
  searchUsers: (keyword: string) => Promise<void>;
  updateUser: (id: string, data: UpdateUserBody) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;

  // 分页操作
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;

  // 搜索操作
  setSearchFilters: (filters: UserSearchParams) => void;
  clearSearchFilters: () => void;

  // 编辑操作
  openEditDialog: (user: ExtendedUser) => void;
  closeEditDialog: () => void;
  setEditingUser: (user: ExtendedUser | null) => void;

  // 状态管理
  setError: (error: string | null) => void;
  clearError: () => void;
  reset: () => void;
}

// 初始状态
const initialState = {
  users: [],
  currentUser: null,
  loading: false,
  error: null,
  pagination: {
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 0,
  },
  searchFilters: {
    keyword: '',
    page: 1,
    pageSize: 10,
  },
  editingUser: null,
  editDialogOpen: false,
  editLoading: false,
};

// 创建 store
export const useUserManagementStore = create<UserManagementState>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // 获取用户列表
      fetchUsers: async (params) => {
        const currentParams = params || get().searchFilters;

        set({ loading: true, error: null });

        try {
          const result = await api.getUsers(currentParams);

          set({
            users: result.users,
            pagination: {
              page: result.page,
              pageSize: result.pageSize,
              total: result.total,
              totalPages: result.totalPages,
            },
            loading: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : '获取用户列表失败',
            loading: false,
          });
        }
      },

      // 获取当前用户
      fetchCurrentUser: async () => {
        try {
          const currentUser = await api.getCurrentUser();
          set({ currentUser });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : '获取当前用户失败',
          });
        }
      },

      // 搜索用户
      searchUsers: async (keyword) => {
        set({ loading: true, error: null });

        try {
          const users = await api.searchUsers(keyword);
          set({
            users,
            loading: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : '搜索用户失败',
            loading: false,
          });
        }
      },

      // 更新用户
      updateUser: async (id, data) => {
        const { users } = get();

        try {
          const updatedUser = await api.updateUser(id, data);

          // 更新列表中的用户数据
          const updatedUsers = users.map((user) =>
            user.id === id ? updatedUser : user
          );

          set({
            users: updatedUsers,
            editingUser: null,
            editDialogOpen: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : '更新用户失败',
          });
          throw error;
        }
      },

      // 删除用户
      deleteUser: async (id) => {
        const { users } = get();

        try {
          await api.deleteUser(id);

          // 从列表中移除用户
          const updatedUsers = users.filter((user) => user.id !== id);

          set({
            users: updatedUsers,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : '删除用户失败',
          });
          throw error;
        }
      },

      // 分页操作
      setPage: (page) => {
        const { searchFilters, fetchUsers } = get();
        const newFilters = { ...searchFilters, page };
        set({
          searchFilters: newFilters,
          pagination: { ...get().pagination, page },
        });
        fetchUsers(newFilters);
      },

      setPageSize: (pageSize) => {
        const { searchFilters, fetchUsers } = get();
        const newFilters = { ...searchFilters, page: 1, pageSize };
        set({
          searchFilters: newFilters,
          pagination: { ...get().pagination, page: 1, pageSize },
        });
        fetchUsers(newFilters);
      },

      // 搜索操作
      setSearchFilters: (filters) => {
        const newFilters = { ...filters, page: 1 };
        set({
          searchFilters: newFilters,
          pagination: { ...get().pagination, page: 1 },
        });
      },

      clearSearchFilters: () => {
        const clearFilters: UserSearchParams = {
          keyword: '',
          page: 1,
          pageSize: get().pagination.pageSize,
        };
        set({
          searchFilters: clearFilters,
          pagination: { ...get().pagination, page: 1 },
        });
      },

      // 编辑操作
      openEditDialog: (user) => {
        set({
          editingUser: user,
          editDialogOpen: true,
        });
      },

      closeEditDialog: () => {
        set({
          editingUser: null,
          editDialogOpen: false,
          editLoading: false,
        });
      },

      setEditingUser: (user) => {
        set({ editingUser: user });
      },

      // 状态管理
      setError: (error) => {
        set({ error });
      },

      clearError: () => {
        set({ error: null });
      },

      // 重置状态
      reset: () => {
        set(initialState);
      },
    }),
    {
      name: 'user-management-store',
    }
  )
);

// 导出 store
export default useUserManagementStore;
