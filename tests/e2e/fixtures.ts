import { test as base } from '@playwright/test';

/**
 * E2E测试fixtures
 * 提供测试数据和工具函数
 */

// 测试用户数据
export const testUsers = {
  creator: {
    id: 'test-user-creator-001',
    username: 'creator001',
    nickname: '发起者测试用户',
    phone: '13800000001',
    password: 'password123',
  },
  participant: {
    id: 'test-user-participant-001',
    username: 'participant001',
    nickname: '参与者测试用户',
    phone: '13800000002',
    password: 'password123',
  },
};

// 测试活动数据模板
export const createTestActivityData = (overrides = {}) => ({
  type: 'park-night-run',
  title: `测试活动-${Date.now()}`,
  datetime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 明天这个时候
  deadline: new Date(Date.now() + 23 * 60 * 60 * 1000).toISOString(), // 明天这个时候-1小时
  location: '测试地点',
  minParticipants: 2,
  maxParticipants: 5,
  route: '测试路线描述',
  notes: ['新手友好'],
  emergencyContact: '138****0000',
  ...overrides,
});

// 辅助函数：生成唯一的activityId
export const generateActivityId = () => `test-activity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// 辅助函数：等待指定毫秒数
export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// 扩展test fixture，添加自定义工具
type TestFixtures = {
  testUsers: typeof testUsers;
  createTestActivityData: typeof createTestActivityData;
  generateActivityId: typeof generateActivityId;
  delay: typeof delay;
};

export const test = base.extend<TestFixtures>({
  testUsers: async ({}, use) => {
    await use(testUsers);
  },
  createTestActivityData: async ({}, use) => {
    await use(createTestActivityData);
  },
  generateActivityId: async ({}, use) => {
    await use(generateActivityId);
  },
  delay: async ({}, use) => {
    await use(delay);
  },
});

export { expect } from '@playwright/test';
