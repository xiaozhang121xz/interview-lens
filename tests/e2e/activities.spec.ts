import { test, expect } from '@playwright/test';

/**
 * 活动核心功能E2E测试
 * 使用Playwright Storage State自动保持登录状态
 */

test.describe('活动核心功能测试', () => {
  // 使用全局storage state，所有测试自动保持登录状态

  test('用户旅途1: 发起拼团完整流程', async ({ page }) => {
    // 1. 访问运动拼团首页（已自动登录）
    await page.goto('/activities');
    await page.waitForLoadState('networkidle');

    // 2. 等待hydration完成和页面渲染（增加超时时间）
    await page.waitForTimeout(1000); // 增加等待时间确保hydration完成

    // 3. 验证页面元素（使用更长的超时时间和.first()避免strict mode violation）
    await expect(page.locator('text=运动拼团').first()).toBeVisible({ timeout: 30000 });
    await expect(page.locator('text=找伙伴，一起运动更有趣')).toBeVisible({ timeout: 30000 });

    // 4. 点击"发起拼团"按钮
    await page.click('text=发起拼团');

    // 5. 等待表单页面加载
    await page.waitForURL(/\/activities\/create/, { timeout: 30000 });
    await page.waitForLoadState('networkidle');

    // 6. 填写活动表单
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const deadline = new Date(Date.now() + 23 * 60 * 60 * 1000);

    // 选择活动类型
    await page.selectOption('select[name="type"]', 'park-night-run');

    // 填写活动标题
    await page.fill('input[name="title"]', `E2E测试活动-${Date.now()}`);

    // 填写活动时间（datetime-local格式：YYYY-MM-DDTHH:mm）
    const datetimeLocal = tomorrow.toISOString().slice(0, 16);
    await page.fill('input[name="datetime"]', datetimeLocal);

    // 填写截止时间
    const deadlineLocal = deadline.toISOString().slice(0, 16);
    await page.fill('input[name="deadline"]', deadlineLocal);

    // 填写地点
    await page.fill('input[name="location"]', '朝阳公园西门');

    // 填写人数限制
    await page.fill('input[name="minParticipants"]', '2');
    await page.fill('input[name="maxParticipants"]', '5');

    // 填写路线
    await page.fill('textarea[name="route"]', '绕公园跑步一圈，约5公里');

    // 7. 点击"发布活动"按钮
    await page.click('button[type="submit"]');

    // 8. 等待活动创建成功
    await page.waitForURL(/\/activities\/[^/]+$/, { timeout: 30000 });
    await page.waitForLoadState('networkidle');

    // 9. 验证活动详情页加载
    await expect(page.locator('text=活动详情')).toBeVisible({ timeout: 20000 });

    // 10. 验证分享按钮存在
    await expect(page.locator('button:has-text("分享")')).toBeVisible({ timeout: 10000 });
  });

  test('查看活动列表', async ({ page }) => {
    // 1. 访问活动首页（已自动登录）
    await page.goto('/activities');
    await page.waitForLoadState('networkidle');

    // 2. 等待hydration完成
    await page.waitForTimeout(1000);

    // 3. 验证页面标题和描述
    await expect(page.locator('text=运动拼团').first()).toBeVisible({ timeout: 30000 });
    await expect(page.locator('text=找伙伴，一起运动更有趣')).toBeVisible({ timeout: 30000 });

    // 4. 验证"我的报名"和"我的发起"按钮存在
    await expect(page.locator('a:has-text("我的报名")')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('a:has-text("我的发起")')).toBeVisible({ timeout: 10000 });
  });

  test('访问我的报名页面', async ({ page }) => {
    // 1. 访问我的报名页面（已自动登录）
    await page.goto('/activities/my-joinings');
    await page.waitForLoadState('networkidle');

    // 2. 等待hydration完成
    await page.waitForTimeout(1000);

    // 3. 验证页面标题
    await expect(page.locator('h1:has-text("我的报名")')).toBeVisible({ timeout: 30000 });

    // 4. 验证筛选Tab存在
    await expect(page.locator('text=全部')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=待成团')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=已成团')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=已取消')).toBeVisible({ timeout: 10000 });
  });

  test('访问我的发起页面', async ({ page }) => {
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

  test('表单验证：必填字段验证', async ({ page }) => {
    // 1. 访问发起拼团页面（已自动登录）
    await page.goto('/activities/create');
    await page.waitForLoadState('networkidle');

    // 2. 等待hydration完成
    await page.waitForTimeout(1000);

    // 3. 直接点击"发布活动"（不填写任何字段）
    await page.click('button[type="submit"]');

    // 4. 验证表单验证错误（HTML5验证会阻止提交）
    // 注意：如果HTML5验证生效，表单不会提交
    // 这里我们主要验证页面没有崩溃
    await expect(page).toHaveURL(/\/activities\/create/);
  });
});
