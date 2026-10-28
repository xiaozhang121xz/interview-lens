import { test, expect } from '@playwright/test';

/**
 * 登录系统验证测试
 * 注意：此测试文件不使用全局storage state，专门测试登录功能
 */

test.describe('登录系统验证', () => {
  // 禁用全局storage state，专门测试登录流程
  test.use({ storageState: undefined });

  test('用户名密码登录', async ({ page }) => {
    // 1. 访问登录页面
    await page.goto('/login');

    // 2. 等待页面完全加载
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('input[id="username"]', { timeout: 15000 });

    // 3. 填写用户名
    await page.fill('input#username', 'az');

    // 4. 填写密码
    await page.fill('input#password', '888');

    // 5. 点击登录按钮
    await page.click('button[type="submit"]');

    // 6. 等待登录成功并跳转
    await page.waitForURL(/\/dashboard/, { timeout: 20000 });

    // 7. 验证登录成功
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('登录后访问活动页面', async ({ page }) => {
    // 1. 先登录（不使用storage state）
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('input[id="username"]', { timeout: 15000 });
    await page.fill('input#username', 'az');
    await page.fill('input#password', '888');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/, { timeout: 20000 });

    // 2. 等待hydration完成
    await page.waitForTimeout(1000);

    // 3. 访问活动首页
    await page.goto('/activities');
    await page.waitForLoadState('networkidle');

    // 4. 等待页面完全渲染
    await page.waitForTimeout(1000);

    // 5. 验证页面加载成功
    await expect(page.locator('text=运动拼团').first()).toBeVisible({ timeout: 30000 });
    await expect(page.locator('text=找伙伴，一起运动更有趣')).toBeVisible({ timeout: 30000 });
  });
});
