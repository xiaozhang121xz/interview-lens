/**
 * E2E测试数据准备脚本
 * 用于在测试前准备必要的测试数据（使用 MongoDB/Prisma）
 */

import prisma from '@/lib/db/prisma';

// 测试用户数据
const testUsers = [
  {
    id: 'test-user-creator-001',
    phone: '13800000001',
    nickname: '发起者测试用户',
    avatar: '',
    status: 'active',
  },
  {
    id: 'test-user-participant-001',
    phone: '13800000002',
    nickname: '参与者测试用户',
    avatar: '',
    status: 'active',
  },
];

/**
 * 准备测试数据
 */
export async function prepareTestData() {
  console.log('📝 准备E2E测试数据...');

  // 准备测试用户（使用 upsert 避免重复）
  for (const user of testUsers) {
    await prisma.user.upsert({
      where: { id: user.id },
      update: user,
      create: user,
    });
  }
  console.log('✅ 测试用户数据已准备');

  console.log('🎉 测试数据准备完成！');

  return {
    users: testUsers,
  };
}

/**
 * 清理测试数据
 */
export async function cleanupTestData() {
  console.log('🧹 清理E2E测试数据...');

  // 清理测试用户
  await prisma.user.deleteMany({
    where: {
      id: { startsWith: 'test-user-' },
    },
  });
  console.log('✅ 测试用户数据已清理');

  console.log('🎉 测试数据清理完成！');
}

// CLI支持
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2];
  if (command === 'prepare') {
    prepareTestData()
      .then(() => process.exit(0))
      .catch((e) => {
        console.error(e);
        process.exit(1);
      });
  } else if (command === 'cleanup') {
    cleanupTestData()
      .then(() => process.exit(0))
      .catch((e) => {
        console.error(e);
        process.exit(1);
      });
  } else {
    console.log('Usage: npx tsx tests/e2e/test-data-setup.ts [prepare|cleanup]');
    process.exit(1);
  }
}
