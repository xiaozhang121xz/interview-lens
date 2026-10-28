import { ensureDefaultUser } from '@/lib/initDefaultUser';

/**
 * 默认用户初始化组件
 *
 * 在应用启动时检查并确保默认用户存在
 * 如果不存在则自动创建，如果密码不匹配则自动修复
 *
 * 此组件使用 'use server' 确保在服务端执行
 */
export async function DefaultUserInitializer() {
  // 只在服务端执行初始化
  try {
    await ensureDefaultUser();
  } catch (error) {
    // 静默失败，不影响应用启动
    console.error('Default user initialization failed:', error);
  }

  // 此组件不渲染任何内容
  return null;
}
