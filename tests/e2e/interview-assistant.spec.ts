import { test, expect } from '@playwright/test';

/**
 * 客户需求洞察助手 - E2E测试
 * 核心 P0 测试：页面访问验证
 */

test.describe('客户需求洞察助手 - E2E测试', () => {
  // ============================================
  // P0强制测试：页面访问测试
  // ============================================
  test('P0-页面访问 - 所有页面无404错误', async ({ page }) => {
    const routes = [
      '/dashboard',
      '/dashboard/customers',
      '/dashboard/customers/new',
      '/dashboard/interviews',
      '/dashboard/interviews/new',
    ];

    for (const route of routes) {
      await page.goto(route);
      await page.waitForLoadState('domcontentloaded');

      // 验证没有404错误
      const notFound = await page.locator('text=404').count();
      expect(notFound).toBe(0);

      // 验证页面有内容
      const pageContent = await page.content();
      expect(pageContent.length).toBeGreaterThan(500);
    }
  });

  // ============================================
  // 首页工作台测试
  // ============================================
  test('J3-首页工作台 - 页面内容验证', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    // 验证页面标题
    const title = await page.locator('text=工作台').count();
    expect(title).toBeGreaterThan(0);

    // 验证统计卡片区域
    const stats = await page.locator('text=客户总数').count();
    expect(stats).toBeGreaterThan(0);
  });

  // ============================================
  // 客户管理页面测试
  // ============================================
  test('J1-客户管理 - 列表页访问', async ({ page }) => {
    await page.goto('/dashboard/customers');
    await page.waitForLoadState('domcontentloaded');

    // 验证页面标题
    const title = await page.locator('text=客户管理').count();
    expect(title).toBeGreaterThan(0);

    // 验证新建按钮
    const newButton = await page.locator('text=新建客户').count();
    expect(newButton).toBeGreaterThan(0);
  });

  test('J1-客户管理 - 新建页访问', async ({ page }) => {
    await page.goto('/dashboard/customers/new');
    await page.waitForLoadState('domcontentloaded');

    // 验证页面有内容（不检查具体元素）
    const pageContent = await page.content();
    expect(pageContent.length).toBeGreaterThan(500);

    // 验证页面标题
    const title = await page.locator('text=新建客户').count();
    expect(title).toBeGreaterThan(0);
  });

  // ============================================
  // 访谈管理页面测试
  // ============================================
  test('J2-访谈管理 - 列表页访问', async ({ page }) => {
    await page.goto('/dashboard/interviews');
    await page.waitForLoadState('domcontentloaded');

    // 验证页面标题
    const title = await page.locator('text=访谈管理').count();
    expect(title).toBeGreaterThan(0);

    // 验证新建按钮
    const newButton = await page.locator('text=新建访谈').count();
    expect(newButton).toBeGreaterThan(0);
  });

  test('J2-访谈管理 - 新建页访问', async ({ page }) => {
    await page.goto('/dashboard/interviews/new');
    await page.waitForLoadState('domcontentloaded');

    // 验证页面有内容（布局已渲染）
    const pageContent = await page.content();
    expect(pageContent.length).toBeGreaterThan(500);

    // 验证没有404错误
    const notFound = await page.locator('text=404').count();
    expect(notFound).toBe(0);

    // 验证导航栏存在（侧边栏）
    const sidebar = await page.locator('text=访谈管理').count();
    expect(sidebar).toBeGreaterThan(0);
  });

  // ============================================
  // API 端点验证
  // ============================================
  test('API-端点验证 - 所有API路由注册', async ({ page }) => {
    // 验证关键 API 端点可访问
    const apiEndpoints = [
      '/api/customers',
      '/api/interviews',
      '/api/dashboard/stats',
    ];

    for (const endpoint of apiEndpoints) {
      const response = await page.request.get(`http://localhost:3001${endpoint}`);
      // API 应该返回响应（不一定是200，但不应是404）
      expect(response.status()).not.toBe(404);
    }
  });
});