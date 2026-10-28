import { test, expect } from '@playwright/test';

/**
 * 角色画像认证修复测试
 * 测试目标：验证未登录和已登录用户的角色画像更新功能
 *
 * 背景：修复了用户未登录时调用角色画像更新 API 返回 401 的错误
 * 修复内容：添加了多层防御（登录状态检查 + token 检查 + 401 错误处理）
 */

test.describe('角色画像认证测试', () => {
  /**
   * 场景1：未登录用户访问设置页面
   * 预期：尝试更新角色画像时，跳转到登录页，不出现 401 错误
   */
  test.describe('未登录用户', () => {
    // 禁用全局 storage state，模拟未登录状态
    test.use({ storageState: undefined });

    test('访问设置页面应跳转到登录页', async ({ page }) => {
      // 1. 访问设置页面
      await page.goto('/dashboard/settings');

      // 2. 验证被重定向到登录页
      await page.waitForURL(/\/login/, { timeout: 15000 });
      await expect(page).toHaveURL(/\/login/);

      // 3. 验证登录页面加载成功
      await expect(page.locator('input#username')).toBeVisible({ timeout: 10000 });
    });

    test('尝试选择角色画像时应跳转到登录页', async ({ page }) => {
      // 1. 先清除 localStorage
      await page.goto('/');
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });

      // 2. 访问设置页面
      await page.goto('/dashboard/settings');

      // 3. 验证被重定向到登录页
      await page.waitForURL(/\/login/, { timeout: 15000 });
      await expect(page).toHaveURL(/\/login/);
    });

    test('不应出现401错误提示', async ({ page }) => {
      // 1. 清除存储
      await page.goto('/');
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });

      // 2. 监听控制台错误
      const errors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });

      // 3. 访问设置页面（应被重定向）
      await page.goto('/dashboard/settings');
      await page.waitForURL(/\/login/, { timeout: 15000 });

      // 4. 等待一段时间确保没有异步错误
      await page.waitForTimeout(2000);

      // 5. 验证没有 401 相关的错误日志
      const has401Error = errors.some(
        (err) => err.includes('401') || err.includes('Unauthorized') || err.includes('认证失败')
      );
      expect(has401Error).toBe(false);
    });
  });

  /**
   * 场景2：已登录用户更新角色画像
   * 预期：可以正常更新角色画像，更新后角色状态正确
   */
  test.describe('已登录用户', () => {
    // 使用全局 storage state 进行登录状态复用

    test('应能正常访问设置页面', async ({ page }) => {
      // 1. 访问设置页面
      const response = await page.goto('/dashboard/settings');

      // 2. 验证返回 200 状态码
      expect(response?.status()).toBe(200);

      // 3. 验证页面加载成功
      await page.waitForLoadState('networkidle');
      await expect(page.locator('text=系统设置')).toBeVisible({ timeout: 15000 });
    });

    test('应能看到角色画像选择器', async ({ page }) => {
      // 1. 访问设置页面
      await page.goto('/dashboard/settings');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // 2. 验证角色画像卡片标题存在
      await expect(page.locator('[data-slot="card-title"]:has-text("角色画像")').first()).toBeVisible({
        timeout: 10000,
      });

      // 3. 验证有角色选项可供选择
      const roleCards = page.locator('[class*="cursor-pointer"][class*="hover:shadow-md"]');
      const count = await roleCards.count();
      expect(count).toBeGreaterThan(0);
    });

    test('应能选择并更新角色画像', async ({ page }) => {
      // 1. 访问设置页面
      await page.goto('/dashboard/settings');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // 2. 获取角色卡片
      const roleCards = page.locator('[class*="cursor-pointer"][class*="hover:shadow-md"]');
      const count = await roleCards.count();
      expect(count).toBeGreaterThan(0);

      // 3. 记录初始选中的角色（如果有）
      let initialSelectedIndex = -1;
      for (let i = 0; i < count; i++) {
        const card = roleCards.nth(i);
        const hasRing = await card.evaluate((el) => el.classList.contains('ring-2'));
        if (hasRing) {
          initialSelectedIndex = i;
          break;
        }
      }

      // 4. 选择另一个角色（如果存在）
      const targetIndex = initialSelectedIndex === 0 ? 1 : 0;
      if (targetIndex < count) {
        await roleCards.nth(targetIndex).click();
        await page.waitForTimeout(500);

        // 5. 验证选中状态变化
        await expect(roleCards.nth(targetIndex)).toHaveClass(/ring-2/);
      }
    });

    test('更新角色画像后不应出现错误', async ({ page }) => {
      // 1. 访问设置页面
      await page.goto('/dashboard/settings');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // 2. 监听控制台错误
      const errors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });

      // 3. 选择角色
      const roleCards = page.locator('[class*="cursor-pointer"][class*="hover:shadow-md"]');
      const count = await roleCards.count();
      if (count > 0) {
        await roleCards.first().click();
        await page.waitForTimeout(1000);

        // 4. 验证没有错误
        const hasError = errors.some((err) => err.includes('401') || err.includes('Unauthorized'));
        expect(hasError).toBe(false);
      }
    });
  });
});