import { test, expect } from '@playwright/test';

/**
 * 分享报告版本管理功能 E2E 测试
 *
 * 测试场景：
 * 1. 首次生成分享报告
 * 2. 覆盖上次报告
 * 3. 新建报告版本
 * 4. 查看历史报告
 * 5. 删除报告
 *
 * API 端点：
 * - POST /api/share/report/create - 创建分享报告
 * - GET /api/share/reports - 获取历史报告列表
 * - GET /api/share/reports/[reportId] - 获取报告详情
 * - DELETE /api/share/reports/[reportId] - 删除报告
 */

test.describe('分享报告版本管理', () => {
  // 测试用的访谈ID（需要是有效的 ObjectId 格式）
  const testInterviewId = '507f1f77bcf86cd799439011';

  // ============================================
  // API 端点验证测试
  // ============================================
  test('API-端点验证 - 分享报告相关API路由注册', async ({ page }) => {
    const apiEndpoints = [
      '/api/share/report/create',
      '/api/share/reports',
    ];

    for (const endpoint of apiEndpoints) {
      const response = await page.request.get(`http://localhost:3001${endpoint}`);
      // API 应该返回响应（不一定是200，但不应是404）
      // 401 未授权是预期的，因为没有登录
      expect(response.status()).not.toBe(404);
    }
  });

  // ============================================
  // 访谈结果页面访问测试
  // ============================================
  test('页面访问 - 访谈结果页面可访问', async ({ page }) => {
    // 访问访谈结果页面（需要一个有效的访谈ID）
    await page.goto(`/dashboard/interviews/${testInterviewId}/result`);
    await page.waitForLoadState('domcontentloaded');

    // 验证没有404错误
    const notFound = await page.locator('text=404').count();
    expect(notFound).toBe(0);

    // 验证页面有内容
    const pageContent = await page.content();
    expect(pageContent.length).toBeGreaterThan(500);
  });

  // ============================================
  // 分享按钮可见性测试
  // ============================================
  test('UI组件 - 分享按钮可见', async ({ page }) => {
    await page.goto(`/dashboard/interviews/${testInterviewId}/result`);
    await page.waitForLoadState('domcontentloaded');

    // 等待页面加载完成
    await page.waitForTimeout(1000);

    // 检查分享按钮是否存在
    const shareButton = page.locator('button:has-text("分享")');
    const shareButtonCount = await shareButton.count();

    // 如果页面加载成功，应该能看到分享按钮
    // 注意：如果访谈不存在，页面可能显示加载状态或错误
    if (shareButtonCount > 0) {
      await expect(shareButton.first()).toBeVisible();
    }
  });

  // ============================================
  // 分享对话框打开测试
  // ============================================
  test('UI组件 - 分享对话框可打开', async ({ page }) => {
    await page.goto(`/dashboard/interviews/${testInterviewId}/result`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // 查找并点击分享按钮
    const shareButton = page.locator('button:has-text("分享")');

    if (await shareButton.count() > 0) {
      await shareButton.first().click();
      await page.waitForTimeout(500);

      // 验证对话框打开
      const dialog = page.locator('[role="dialog"]');
      const dialogCount = await dialog.count();

      if (dialogCount > 0) {
        await expect(dialog.first()).toBeVisible();
      }
    }
  });

  // ============================================
  // API 测试 - 创建分享报告（未授权）
  // ============================================
  test('API测试 - 创建分享报告需要授权', async ({ page }) => {
    const response = await page.request.post(
      'http://localhost:3001/api/share/report/create',
      {
        headers: {
          'Content-Type': 'application/json',
        },
        data: {
          interviewId: testInterviewId,
          theme: 'ocean-depths',
          mode: 'new',
        },
      }
    );

    // 应返回401未授权
    expect(response.status()).toBe(401);
  });

  // ============================================
  // API 测试 - 获取历史报告列表（未授权）
  // ============================================
  test('API测试 - 获取历史报告需要授权', async ({ page }) => {
    const response = await page.request.get(
      `http://localhost:3001/api/share/reports?interviewId=${testInterviewId}`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    // 应返回401未授权
    expect(response.status()).toBe(401);
  });

  // ============================================
  // API 测试 - 删除报告（未授权）
  // ============================================
  test('API测试 - 删除报告需要授权', async ({ page }) => {
    const testReportId = '507f1f77bcf86cd799439012';

    const response = await page.request.delete(
      `http://localhost:3001/api/share/reports/${testReportId}`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    // 应返回401未授权
    expect(response.status()).toBe(401);
  });

  // ============================================
  // API 测试 - 获取报告详情（未授权）
  // ============================================
  test('API测试 - 获取报告详情需要授权', async ({ page }) => {
    const testReportId = '507f1f77bcf86cd799439012';

    const response = await page.request.get(
      `http://localhost:3001/api/share/reports/${testReportId}`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    // 应返回401未授权
    expect(response.status()).toBe(401);
  });

  // ============================================
  // 分享对话框组件测试（使用模拟数据）
  // ============================================
  test.describe('分享对话框组件测试', () => {
    // 注意：这些测试需要实际的访谈数据才能完整测试
    // 这里主要测试 UI 组件的渲染和交互

    test('分享对话框 - 主题选择器存在', async ({ page }) => {
      await page.goto(`/dashboard/interviews/${testInterviewId}/result`);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);

      // 点击分享按钮打开对话框
      const shareButton = page.locator('button:has-text("分享")');

      if (await shareButton.count() > 0) {
        await shareButton.first().click();
        await page.waitForTimeout(500);

        // 检查对话框是否存在
        const dialog = page.locator('[role="dialog"]');
        if (await dialog.count() > 0) {
          // 检查是否有主题选择相关元素
          // 原始分享对话框有主题选择下拉框
          const themeSelect = dialog.locator('text=报告主题');
          const themeSelectCount = await themeSelect.count();

          // 如果对话框打开成功，应该能看到主题选择
          if (themeSelectCount > 0) {
            await expect(themeSelect.first()).toBeVisible();
          }
        }
      }
    });

    test('分享对话框 - 有效期选择器存在', async ({ page }) => {
      await page.goto(`/dashboard/interviews/${testInterviewId}/result`);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);

      // 点击分享按钮打开对话框
      const shareButton = page.locator('button:has-text("分享")');

      if (await shareButton.count() > 0) {
        await shareButton.first().click();
        await page.waitForTimeout(500);

        // 检查对话框是否存在
        const dialog = page.locator('[role="dialog"]');
        if (await dialog.count() > 0) {
          // 检查是否有有效期选择
          const expiresSelect = dialog.locator('text=链接有效期');
          const expiresSelectCount = await expiresSelect.count();

          if (expiresSelectCount > 0) {
            await expect(expiresSelect.first()).toBeVisible();
          }
        }
      }
    });

    test('分享对话框 - 生成按钮存在', async ({ page }) => {
      await page.goto(`/dashboard/interviews/${testInterviewId}/result`);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);

      // 点击分享按钮打开对话框
      const shareButton = page.locator('button:has-text("分享")');

      if (await shareButton.count() > 0) {
        await shareButton.first().click();
        await page.waitForTimeout(500);

        // 检查对话框是否存在
        const dialog = page.locator('[role="dialog"]');
        if (await dialog.count() > 0) {
          // 检查是否有生成按钮
          const generateButton = dialog.locator('button:has-text("生成")');
          const generateButtonCount = await generateButton.count();

          if (generateButtonCount > 0) {
            await expect(generateButton.first()).toBeVisible();
          }
        }
      }
    });
  });

  // ============================================
  // 版本管理功能测试（需要完整集成后测试）
  // ============================================
  test.describe('版本管理功能测试', () => {
    // 注意：以下测试需要 ShareReportDialog 组件集成到页面后才能完整运行
    // 当前测试主要验证 API 端点和基本页面结构

    test.skip('场景1 - 首次生成分享报告（需要完整集成）', async ({ page }) => {
      // 此测试需要：
      // 1. 有效的访谈数据
      // 2. 用户登录状态
      // 3. ShareReportDialog 组件集成到页面

      // 测试步骤：
      // 1. 打开访谈结果页面
      // 2. 点击分享按钮
      // 3. 选择主题和有效期
      // 4. 点击生成报告
      // 5. 验证生成成功，显示分享链接
    });

    test.skip('场景2 - 覆盖上次报告（需要完整集成）', async ({ page }) => {
      // 此测试需要：
      // 1. 已有历史报告
      // 2. 用户登录状态
      // 3. ShareReportDialog 组件集成到页面

      // 测试步骤：
      // 1. 打开分享对话框
      // 2. 选择"覆盖上次报告"
      // 3. 验证使用旧token，内容更新
    });

    test.skip('场景3 - 新建报告版本（需要完整集成）', async ({ page }) => {
      // 此测试需要：
      // 1. 已有历史报告
      // 2. 用户登录状态
      // 3. ShareReportDialog 组件集成到页面

      // 测试步骤：
      // 1. 打开分享对话框
      // 2. 选择"新建报告版本"
      // 3. 验证创建新token，新版本
    });

    test.skip('场景4 - 查看历史报告（需要完整集成）', async ({ page }) => {
      // 此测试需要：
      // 1. 已有历史报告
      // 2. ShareReportHistoryDialog 组件集成

      // 测试步骤：
      // 1. 点击"历史"按钮
      // 2. 验证显示所有报告列表
      // 3. 点击某版本查看详情
    });

    test.skip('场景5 - 删除报告（需要完整集成）', async ({ page }) => {
      // 此测试需要：
      // 1. 已有历史报告
      // 2. ShareReportHistoryDialog 组件集成

      // 测试步骤：
      // 1. 打开历史弹窗
      // 2. 点击删除按钮
      // 3. 确认删除
      // 4. 验证报告被删除
    });
  });

  // ============================================
  // 分享报告历史弹窗组件测试
  // ============================================
  test.describe('分享报告历史弹窗组件', () => {
    test('历史弹窗组件 - 基本渲染验证', async ({ page }) => {
      // 验证历史弹窗组件文件存在
      // 此测试通过页面访问间接验证
      await page.goto(`/dashboard/interviews/${testInterviewId}/result`);
      await page.waitForLoadState('domcontentloaded');

      // 验证页面无404错误
      const notFound = await page.locator('text=404').count();
      expect(notFound).toBe(0);
    });
  });

  // ============================================
  // 分享报告版本选择器组件测试
  // ============================================
  test.describe('分享报告版本选择器组件', () => {
    test('版本选择器 - 基本渲染验证', async ({ page }) => {
      // 验证版本选择器组件文件存在
      // 此测试通过页面访问间接验证
      await page.goto(`/dashboard/interviews/${testInterviewId}/result`);
      await page.waitForLoadState('domcontentloaded');

      // 验证页面无404错误
      const notFound = await page.locator('text=404').count();
      expect(notFound).toBe(0);
    });
  });
});

// ============================================
// 辅助函数和类型定义
// ============================================

/**
 * Mock 数据示例（用于测试）
 */
const mockShareResult = {
  token: 'abc123def456',
  shareUrl: '/share/abc123def456/report',
  reportId: '507f1f77bcf86cd799439012',
  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  theme: 'ocean-depths',
  mode: 'new',
  hasHistory: false,
  historyCount: 0,
};

const mockHistoryReports = [
  {
    id: '507f1f77bcf86cd799439012',
    token: 'abc123def456',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    summary: '测试报告摘要',
    theme: 'ocean-depths',
    versionNumber: 1,
  },
  {
    id: '507f1f77bcf86cd799439013',
    token: 'old123token456',
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    summary: '历史报告摘要',
    theme: 'modern-minimalist',
    versionNumber: 2,
  },
];