import { apiInstance } from '@/lib/apiCreator';
import { useUserStore, UserResponse } from '@/stores/core/useUserStore';

// API响应类型定义
export interface ApiResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: any;
  config: any;
  request?: any;
  meta?: any;
  error?: any;
}

// 用户相关API
export const userApi = {
  // 登录
  login: (username: string, password: string) =>
    apiInstance.post('/auth/login', { username, password }),

  // 获取用户信息
  getUserInfo: () => apiInstance.get('/user/info'),

  // 更新用户信息
  updateUserInfo: (data: any) => apiInstance.put('/user/info', data),

  // 退出登录
  logout: async () => {
    try {
      await apiInstance.post('/auth/logout', {});
    } finally {
      useUserStore.getState().clearUser();
    }
  },

  // 更新用户信息到store
  updateUserToStore: (userResponse: UserResponse) => {
    const userStore = useUserStore.getState();
    userStore.setUser(userResponse);
  },
};

// 示例：其他API模块
export const dashboardApi = {
  // 获取仪表板统计数据
  getStats: () => apiInstance.get('/dashboard/stats'),

  // 获取最近活动
  getRecentActivity: () => apiInstance.get('/dashboard/activity'),
};

export const projectApi = {
  // 获取项目列表
  getProjects: (params?: any) => apiInstance.get('/projects', { params }),

  // 创建项目
  createProject: (data: any) => apiInstance.post('/projects', data),

  // 更新项目
  updateProject: (id: string, data: any) =>
    apiInstance.put(`/projects/${id}`, data),

  // 删除项目
  deleteProject: (id: string) => apiInstance.delete(`/projects/${id}`),
};

// 统一的错误处理函数
export const handleApiError = (error: any) => {
  const errorMsg = error.errMsg || error.message || '未知错误';
  console.error('API错误:', errorMsg);
  return errorMsg;
};

// 统一的成功处理函数
export const handleApiResponse = <T>(response: ApiResponse<T>): T => {
  if (response.error) {
    throw new Error(response.error);
  }
  return response.data;
};
