#!/usr/bin/env node

/**
 * 路由配置验证脚本
 *
 * 目标：自动验证侧边栏配置的路由与实际文件匹配
 * 时机：前端开发完成后立即执行
 * 完成标准：所有配置的路由都有对应的页面文件
 * 阻塞条件：任何路由没有对应的页面文件
 */

const fs = require('fs');
const path = require('path');

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

// 从main-layout.tsx提取的路由配置
const configuredRoutes = [
  '/',
  '/login',
  '/signup',
  '/dashboard',
  '/dashboard/customers',
  '/dashboard/interviews',
];

// 路由到文件路径的映射
function routeToFile(route) {
  // 移除开头的斜杠
  const cleanRoute = route.replace(/^\//, '');

  // 转换为文件路径
  let filePath = cleanRoute
    .split('/')
    .map(segment => {
      // 动态路由参数 (如 [activityId])
      if (segment.startsWith('[') && segment.endsWith(']')) {
        return segment;
      }
      return segment;
    })
    .join('/');

  // 构建完整的页面文件路径
  return path.join(process.cwd(), 'app', filePath, 'page.tsx');
}

// 检查文件是否存在
function routeExists(route) {
  const filePath = routeToFile(route);
  return fs.existsSync(filePath);
}

// 主函数
function main() {
  console.log(`${colors.blue}🔍 开始验证路由配置...${colors.reset}\n`);

  let hasError = false;
  const results = [];

  for (const route of configuredRoutes) {
    const exists = routeExists(route);

    if (exists) {
      const filePath = routeToFile(route);
      console.log(`${colors.green}✅ 路由存在:${colors.reset} ${route}`);
      console.log(`   ${colors.blue}→${colors.reset} ${filePath}`);
      results.push({ route, exists, filePath });
    } else {
      console.error(`${colors.red}❌ 路由不存在:${colors.reset} ${route}`);
      const expectedPath = routeToFile(route);
      console.error(`   ${colors.yellow}期望文件:${colors.reset} ${expectedPath}`);
      hasError = true;
      results.push({ route, exists: false, expectedPath });
    }
  }

  console.log('');

  // 检查是否有未配置路由的页面文件
  console.log(`${colors.blue}🔍 检查未配置的页面文件...${colors.reset}\n`);

  const appDir = path.join(process.cwd(), 'app');
  const unconfiguredRoutes = [];

  function findPageFiles(dir, baseRoute = '') {
    const files = fs.readdirSync(dir, { withFileTypes: true });

    for (const file of files) {
      const fullPath = path.join(dir, file.name);

      if (file.isDirectory()) {
        const newBaseRoute = file.name.startsWith('[')
          ? `${baseRoute}/[${file.name.slice(1, -1)}]`
          : `${baseRoute}/${file.name}`;
        findPageFiles(fullPath, newBaseRoute);
      } else if (file.name === 'page.tsx') {
        const route = baseRoute || '/';
        if (!configuredRoutes.includes(route)) {
          unconfiguredRoutes.push({ route, filePath: fullPath });
        }
      }
    }
  }

  findPageFiles(appDir);

  if (unconfiguredRoutes.length > 0) {
    console.log(`${colors.yellow}⚠️  发现未配置的页面文件:${colors.reset}`);
    for (const { route, filePath } of unconfiguredRoutes) {
      console.log(`   ${colors.yellow}•${colors.reset} ${route}`);
      console.log(`     ${colors.blue}→${colors.reset} ${filePath}`);
    }
  } else {
    console.log(`${colors.green}✅ 所有页面文件都已配置${colors.reset}`);
  }

  console.log('');

  // 输出结果
  if (hasError) {
    console.error(`${colors.red}❌ 路由验证失败${colors.reset}`);
    console.error(`${colors.red}阻塞条件: 路由配置与实际文件不匹配${colors.reset}`);
    process.exit(1);
  } else {
    console.log(`${colors.green}✅ 所有路由验证通过${colors.reset}`);
    console.log(`${colors.green}🎉 可以继续进入Test阶段${colors.reset}`);
    process.exit(0);
  }
}

// 运行
main();
