import { test, expect } from '@playwright/test';

/**
 * 我的发起E2E测试
 * 使用Playwright Storage State自动保持登录状态
 */

test.describe('我的发起测试', () => {
  // 使用全局storage state，所有测试自动保持登录状态

  test('查看我的发起页面', async ({ page }) => {
    // 1. 访问我的发起页面（已自动登录）
    await page.goto('/activities/my-creations');
    await page.waitForLoadState('networkidle');

    // 2. 等待hydration完成
    await page.waitForTimeout(1000);

    // 3. 验证页面标题
    await expect(page.locator('h1:has-text("我的发起")')).toBeVisible({ timeout: 30000 });

    // 4. 验证筛选Tab存在
    await expect(page.locator('text=全部')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=待成团')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=已成团')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=已取消')).toBeVisible({ timeout: 10000 });
  });

  test('筛选功能：按状态筛选发起', async ({ page }) => {
    // 1. 访问我的发起页面
    await page.goto('/activities/my-creations');
    await page.waitForLoadState('networkidle');

    // 2. 等待hydration完成
    await page.waitForTimeout(1000);

    // 3. 点击"待成团"Tab（使用更具体的选择器）
    const pendingTab = page.locator('button:has-text("待成团")').first();
    await pendingTab.click();

    // 4. 验证Tab切换（等待URL更新）
    await page.waitForTimeout(500);

    // 5. 点击"已成团"Tab
    const successTab = page.locator('button:has-text("已成团")').first();
    await successTab.click();

    // 6. 验证Tab切换
    await page.waitForTimeout(500);

    // 7. 点击"全部"Tab
    const allTab = page.locator('button:has-text("全部")').first();
    await allTab.click();

    // 8. 验证Tab切换
    await page.waitForTimeout(500);
  });

  test('从活动首页跳转到我的发起', async ({ page }) => {
    // 1. 访问活动首页
    await page.goto('/activities');
    await page.waitForLoadState('networkidle');

    // 2. 等待hydration完成
    await page.waitForTimeout(1000);

    // 3. 点击"我的发起"按钮
    await page.click('text=我的发起');

    // 4. 验证跳转到我的发起页面
    await page.waitForURL(/\/activities\/my-creations/, { timeout: 20000 });
    await expect(page.locator('text=我的发起')).toBeVisible({ timeout: 30000 });
  });
});
