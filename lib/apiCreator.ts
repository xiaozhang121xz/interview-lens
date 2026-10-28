import {
  InternalAxiosRequestConfig,
  AxiosResponse,
  AxiosInstance,
} from 'axios';
import axios from 'axios';
import { VALIDATED_API_TIMEOUT } from '@/lib/config/timeout';

declare module 'axios' {
  export interface InternalAxiosRequestConfig {
    withAuth?: boolean;
    _retry?: boolean;
  }
}

// 公开API路径（不需要token验证）
const PUBLIC_API_PATHS = [
  '/api/auth/login',
  '/api/auth/send-code',
  '/api/auth/verify-code',
  '/api/auth/register',
  '/api/auth/refresh', // 刷新API自身不需要触发刷新
];

// 刷新状态管理（防止并发刷新）
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: Error) => void;
}> = [];

// 处理等待队列
const processQueue = (error: Error | null, token: string | null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve(token!);
    }
  });
  failedQueue = [];
};

const setupInterceptors = (
  instance: AxiosInstance,
  options: {
    unwrapResponseData?: boolean;
  } = {}
) => {
  const { unwrapResponseData = true } = options;

  // 请求拦截
  instance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    // 登录态由同源 HttpOnly Cookie 承载，浏览器脚本不接触令牌。
    return config;
  });

  // 响应拦截
  instance.interceptors.response.use(
    (response) => {
      // 统一处理axios响应格式
      if (
        unwrapResponseData &&
        response.data &&
        typeof response.data === 'object'
      ) {
        return {
          ...response,
          data: response.data?.data || response.data, // 提取嵌套的data或使用原始data
          meta: response.data?.meta, // 提取嵌套的meta（如果存在）
          error: response.data?.error, // 提取嵌套的error（如果存在）
        };
      }
      return response;
    },
    // axios错误处理
    async (error) => {
      const originalRequest = error.config;

      // 401错误处理 - 自动刷新Token
      if (error.response?.status === 401 && originalRequest) {
        // 排除公开API（登录、注册、刷新等）
        const isPublicApi = PUBLIC_API_PATHS.some((path) =>
          originalRequest.url?.includes(path)
        );

        if (isPublicApi) {
          // 公开API的401错误直接返回
          return Promise.reject(error);
        }

        // 检查是否已重试（防止循环）
        if (originalRequest._retry) {
          // 已重试过，清除登录状态并跳转
          clearAuthAndRedirect();
          return Promise.reject(error);
        }

        // 如果正在刷新，将请求加入等待队列
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          })
            .then(() => {
              delete originalRequest.headers.Authorization;
              return instance(originalRequest);
            })
            .catch((err) => Promise.reject(err));
        }

        // 开始刷新流程
        originalRequest._retry = true;
        isRefreshing = true;

        try {
          // 调用刷新API
          const response = await axios.post('/api/auth/refresh', {});
          if (!response.data?.success) throw new Error('Refresh failed');

          // 处理等待队列
          processQueue(null, 'cookie-authenticated');

          // 重试原请求
          delete originalRequest.headers.Authorization;
          return instance(originalRequest);
        } catch (refreshError) {
          // 刷新失败，清除登录状态
          processQueue(
            refreshError instanceof Error
              ? refreshError
              : new Error('Refresh failed'),
            null
          );
          clearAuthAndRedirect();
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      }

      if (axios.isCancel(error) || error?.name === 'CanceledError') {
        return Promise.reject(error);
      }

      // 其他错误处理
      let msg = '';

      // 静默处理401错误（未登录或token过期是正常情况）
      if (error.response?.status === 401) {
        // 未登录状态的401错误，静默返回，不打印日志
        return Promise.reject(error);
      }

      console.error('API请求错误:', error);

      if (error.response) {
        // 正确提取错误信息：处理error可能是对象的情况
        const errorData = error.response.data?.error;
        if (errorData && typeof errorData === 'object' && errorData.message) {
          msg = errorData.message;
        } else if (errorData && typeof errorData === 'string') {
          msg = errorData;
        } else {
          msg =
            error.response.data?.errMsg ||
            error.response.data?.message;
        }

        switch (error.response.status) {
          case 400:
            msg = msg || '请求参数错误 (400)';
            break;
          case 401:
            msg = msg || '请求失败 (401)';
            break;
          case 403:
            msg = msg || '请求失败 (403)';
            break;
          case 404:
            msg = msg || '资源未找到 (404)';
            break;
          case 500:
            msg = msg || '服务器内部错误 (500)';
            break;
          case 502:
            msg = msg || '网关错误 (502)';
            break;
          case 503:
            msg = msg || '服务不可用 (503)';
            break;
          default:
            msg = msg || `请求失败 (${error.response.status})`;
        }
      } else {
        msg = '网络异常或服务器无响应';
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('global-error', { detail: msg }));
      }

      error.errMsg = msg;
      return Promise.reject(error);
    }
  );
};

/**
 * 清除登录状态并跳转到登录页
 */
function clearAuthAndRedirect() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    // 触发全局登出事件（其他组件可监听）
    window.dispatchEvent(new CustomEvent('auth-expired'));
    // 跳转登录页
    const currentPath = `${window.location.pathname}${window.location.search}`;
    const redirect = currentPath.startsWith('/login')
      ? '/dashboard'
      : currentPath;
    window.location.href = `/login?redirect=${encodeURIComponent(redirect)}`;
  }
}

// 创建API实例的工厂函数
const createApi = (baseURL?: string) => {
  const instance = axios.create({
    baseURL: baseURL || '/api/',
    timeout: VALIDATED_API_TIMEOUT,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  setupInterceptors(instance);
  return instance;
};

// 默认API实例
const apiInstance = createApi();

export { apiInstance, createApi };
export { setupInterceptors };

// 导出类型
export type { AxiosResponse, InternalAxiosRequestConfig };
