import { userDataManager } from './db';
import { PasswordHasher } from './crypto';

/**
 * 可选的首次部署管理员引导。
 * 默认关闭，且绝不覆盖现有账户密码。
 */
export async function ensureDefaultUser(): Promise<void> {
  if (process.env.ENABLE_DEFAULT_USER_BOOTSTRAP !== 'true') return;

  const username = process.env.DEFAULT_USER_USERNAME;
  const password = process.env.DEFAULT_USER_PASSWORD;
  const email = process.env.DEFAULT_USER_EMAIL;
  if (!username || !password || password.length < 12 || !email) {
    throw new Error(
      'Default user bootstrap requires username, email and a password of at least 12 characters'
    );
  }

  try {
    const existingUser = await userDataManager.getUserByUsername(username);

    if (existingUser) return;

    await userDataManager.addUser({
      username,
      password: await PasswordHasher.hash(password),
      displayName: process.env.DEFAULT_USER_DISPLAY_NAME || username,
      email,
      avatar: '',
      status: 'active',
      department: process.env.DEFAULT_USER_DEPARTMENT,
      phone: process.env.DEFAULT_USER_PHONE,
    });
  } catch (error) {
    console.error('初始化默认用户失败:', error);
    throw error;
  }
}

/**
 * 重置默认用户密码（仅用于开发/调试）
 */
export async function resetDefaultUserPassword(): Promise<void> {
  throw new Error('Automatic default-user password reset is disabled');
}
