import { expect, test } from '@playwright/test';

test.describe('当前应用基础能力', () => {
  test('公共页面可以访问', async ({ request }) => {
    for (const route of ['/', '/login', '/signup']) {
      const response = await request.get(route);
      expect(response.status(), route).toBeLessThan(400);
      expect((await response.text()).length, route).toBeGreaterThan(500);
      await response.dispose();
    }
  });

  test('受保护 API 拒绝匿名访问', async ({ request }) => {
    for (const endpoint of [
      '/api/users/current',
      '/api/customers',
      '/api/interviews',
      '/api/share/reports',
    ]) {
      const response = await request.get(endpoint);
      expect(response.status(), endpoint).toBe(401);
      await response.dispose();
    }
  });

  test('基础安全响应头已启用', async ({ request }) => {
    const response = await request.get('/login');
    expect(response.headers()['x-frame-options']).toBe('DENY');
    expect(response.headers()['x-content-type-options']).toBe('nosniff');
    expect(response.headers()['referrer-policy']).toBe(
      'strict-origin-when-cross-origin'
    );
    await response.dispose();
  });
});
