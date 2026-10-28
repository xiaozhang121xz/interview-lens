import { FullConfig } from '@playwright/test';

/**
 * Playwright全局setup
 * 在所有测试运行前执行一次，用于创建登录的storage state
 */
async function globalSetup(config: FullConfig) {
  console.log('🚀 开始全局Setup: 创建登录状态的Storage State');

  const { baseURL } = config.projects[0].use;
  if (!baseURL) {
    throw new Error('baseURL未配置');
  }

  // 启动浏览器
  const browser = await (await import('playwright')).chromium.launch({
    headless: true,
  });

  const context = await browser.newContext({
    baseURL: 'http://localhost:3001',
  });

  const page = await context.newPage();

  try {
    // 访问登录页面
    console.log('📍 访问登录页面');
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // 额外等待hydration完成

    // 切换到用户名密码登录tab（如果需要）
    console.log('🔄 切换到用户名密码登录Tab');
    const usernameTab = page.locator('button:has-text("用户名密码")').first();
    if (await usernameTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await usernameTab.click();
      await page.waitForTimeout(500);
    }

    // 填写登录表单（用户名密码登录）
    console.log('📝 填写登录表单');
    await page.waitForSelector('input[id="username"]', { timeout: 20000 });
    await page.fill('input#username', 'az');
    await page.fill('input#password', '888');

    // 提交登录
    console.log('✅ 提交登录表单');
    await page.click('button[type="submit"]');

    // 等待跳转到dashboard（表示登录成功）
    console.log('⏳ 等待跳转到Dashboard');
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    // 验证登录成功
    const url = page.url();
    console.log('✅ 登录成功，当前URL:', url);

    if (!url.includes('/dashboard')) {
      throw new Error(`登录失败，未跳转到dashboard，当前URL: ${url}`);
    }

    // 保存storage state到文件
    const storageStatePath = 'tests/storage-state.json';
    await context.storageState({ path: storageStatePath });
    console.log('💾 Storage State已保存到:', storageStatePath);

  } catch (error) {
    console.error('❌ 全局Setup失败:', error);
    throw error;
  } finally {
    await browser.close();
    console.log('✅ 全局Setup完成');
  }
}

export default globalSetup;
