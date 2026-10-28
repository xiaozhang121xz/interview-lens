import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { apiInstance } from '@/lib/apiCreator';
import type { UserRolePersona } from '@/lib/constants/user-journey-config';

// 用户登录信息（JWT内存储）
export interface UserLoginInfo {
  id: string;
  name: string;
  username: string;
  email: string;
  role: string;
  avatar?: string;
  displayName?: string;
  // 扩展字段
  phone?: string;
  gender?: 'male' | 'female' | 'other';
  preferences?: string[];
  // 用户角色画像
  rolePersona?: UserRolePersona;
  [key: string]: unknown;
}

// 用户响应类型（API返回）
export interface UserResponse {
  id: string;
  username?: string;
  displayName?: string;
  nickname?: string;
  email?: string;
  role?: string;
  phone?: string;
  avatar?: string;
}

interface UserStore {
  user: UserLoginInfo | null; // 用户信息
  isAuthenticated: boolean; // 是否已认证
  rolePersona: UserRolePersona | null; // 用户角色画像
  setUser: (user: UserResponse | null) => void;
  clearUser: () => void; // 清除用户信息
  updateUser: (updates: Partial<UserLoginInfo>) => void; // 更新用户信息
  updateRolePersona: (role: UserRolePersona) => Promise<void>; // 更新角色画像
  fetchRolePersona: () => Promise<void>; // 获取角色画像
}

// 用户信息Store
// persist为异步storage存储
export const useUserStore = create<UserStore>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      rolePersona: null,
      setUser: (userResponse: UserResponse | null) => {
        if (userResponse) {
          // 将UserResponse转换为UserLoginInfo格式
          const userInfo: UserLoginInfo = {
            id: userResponse.id,
            name:
              userResponse.displayName ||
              userResponse.nickname ||
              userResponse.username ||
              userResponse.phone ||
              '用户',
            username: userResponse.username || userResponse.phone || '',
            email: userResponse.email || '',
            role: userResponse.role || 'user',
            displayName:
              userResponse.displayName || userResponse.nickname || '用户',
            phone: userResponse.phone,
            avatar: userResponse.avatar,
          };

          set({ user: userInfo, isAuthenticated: true });
        } else {
          set({ user: null, isAuthenticated: false });
        }
      },
      clearUser: () => {
        set({ user: null, isAuthenticated: false, rolePersona: null });
        // 清除localStorage中的相关数据
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('isLoggedIn');
          localStorage.removeItem('username');
          localStorage.removeItem('interview-realtime-state');
          localStorage.removeItem('realtime-transcription-state');
        }
      },
      updateUser: (updates: Partial<UserLoginInfo>) => {
        const currentUser = get().user;
        if (currentUser) {
          set({
            user: { ...currentUser, ...updates },
          });
        }
      },
      updateRolePersona: async (role: UserRolePersona) => {
        try {
          const response = await apiInstance.patch('/users/me/role-persona', {
            rolePersona: role,
          });

          if (response.data?.success) {
            set({ rolePersona: role });
            // 同时更新 user 对象中的 rolePersona
            const currentUser = get().user;
            if (currentUser) {
              set({
                user: { ...currentUser, rolePersona: role },
              });
            }
          }
        } catch (error) {
          console.error('更新角色画像失败:', error);
          throw error;
        }
      },
      fetchRolePersona: async () => {
        try {
          const response = await apiInstance.get('/users/me/role-persona');

          if (response.data?.success && response.data.data?.rolePersona) {
            set({ rolePersona: response.data.data.rolePersona as UserRolePersona });
          }
        } catch (error) {
          // 401错误是正常的（未登录或token过期），静默处理
          // Axios 错误在 error.response.status 中存储状态码
          const axiosError = error as { response?: { status?: number } };
          if (axiosError.response?.status === 401) {
            return; // 静默返回，不打印任何错误
          }
          // 其他错误才打印日志
          console.error('获取角色画像失败:', error);
        }
      },
    }),
    {
      name: 'az-user-info', // 存储键名
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        rolePersona: state.rolePersona,
      }),
    }
  )
);
