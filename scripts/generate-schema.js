#!/usr/bin/env node

/**
 * Prisma Schema 生成脚本
 *
 * 功能：
 * 1. 从 .env.local 读取 PROJECT_TABLE_PREFIX
 * 2. 读取 prisma/schema.template.prisma 模板
 * 3. 自动为所有 @@map 指令添加项目前缀
 * 4. 生成 prisma/schema.prisma 文件
 *
 * 使用场景：
 * - 开发新功能添加新表时
 * - 修改项目前缀时
 * - CI/CD 构建时
 *
 * ⚠️ 重要：本脚本不使用 dotenv 依赖
 * -------------------------------
 * 原因：此脚本需要在 npm install 之前运行（az-init 流程中）
 * 解决方案：使用原生 parseEnvFile 函数解析 .env 文件
 *
 * 🚫 请勿添加 require('dotenv') 依赖
 * ✅ 如需修改解析逻辑，请更新 parseEnvFile 函数
 */

const fs = require('fs');
const path = require('path');

// 注意：使用原生的 parseEnvFile 函数解析 .env 文件，无需 dotenv 依赖
// 这样脚本可以在 npm install 之前运行

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// ============================================================================
// 原生 .env 文件解析器（替代 dotenv 依赖）
// ============================================================================
// 🚫 不使用 dotenv 的原因：
//    此脚本需要在 npm install 之前运行，此时 node_modules 中没有 dotenv
//
// ✅ 原生实现的优势：
//    - 无外部依赖，可独立运行
//    - 支持 KEY="value"、KEY='value'、KEY=value 三种格式
//    - 自动跳过注释行和空行
//
// 📝 如需修改解析逻辑，请直接编辑此函数，不要引入 dotenv
// ============================================================================
function parseEnvFile(content) {
  const result = {};
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmedLine = line.trim();
    // 跳过空行和注释
    if (!trimmedLine || trimmedLine.startsWith('#')) {
      continue;
    }
    // 解析 KEY="value" 或 KEY=value 格式
    const match = trimmedLine.match(/^([A-Za-z_][A-Za-z0-9_]*)=(?:"([^"]*)"|(.*)|'([^']*)')$/);
    if (match) {
      const key = match[1];
      const value = match[2] !== undefined ? match[2] :
                   match[4] !== undefined ? match[4] :
                   match[3] || '';
      result[key] = value;
    }
  }

  return result;
}

// 读取环境变量（优先级：系统环境变量 > .env.local）
// 注意：使用上方原生 parseEnvFile 函数，不依赖 dotenv
function loadEnvConfig() {
  const envPath = path.join(process.cwd(), '.env.local');
  let envConfig = {};

  // 从 .env.local 读取
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envConfig = parseEnvFile(envContent);
  }

  // 系统环境变量优先级更高（用于 CI/CD）
  if (process.env.PROJECT_TABLE_PREFIX) {
    envConfig.PROJECT_TABLE_PREFIX = process.env.PROJECT_TABLE_PREFIX;
  }
  if (process.env.DATABASE_URL) {
    envConfig.DATABASE_URL = process.env.DATABASE_URL;
  }

  if (!envConfig.PROJECT_TABLE_PREFIX) {
    log('⚠️  警告：PROJECT_TABLE_PREFIX 未设置（环境变量和 .env.local 都没有）', 'yellow');
  }

  return envConfig;
}

// 生成带前缀的 schema
function generateSchema() {
  log('\n🚀 开始生成 Prisma Schema...\n', 'blue');

  // 1. 读取环境变量
  const envConfig = loadEnvConfig();
  const prefix = envConfig.PROJECT_TABLE_PREFIX || '';

  if (!prefix) {
    log('⚠️  警告：PROJECT_TABLE_PREFIX 未设置，将生成无前缀的表名', 'yellow');
  } else {
    log(`✅ 项目表名前缀：${prefix}`, 'green');
  }

  // 2. 读取模板文件
  const templatePath = path.join(process.cwd(), 'prisma', 'schema.template.prisma');
  const outputPath = path.join(process.cwd(), 'prisma', 'schema.prisma');

  if (!fs.existsSync(templatePath)) {
    log('❌ 错误：prisma/schema.template.prisma 模板文件不存在', 'red');
    process.exit(1);
  }

  const templateContent = fs.readFileSync(templatePath, 'utf-8');
  log('✅ 已读取模板文件', 'green');

  // 3. 替换 @@map 指令，添加前缀
  let generatedContent = templateContent;

  if (prefix) {
    // 按行处理，跳过注释行
    const lines = generatedContent.split('\n');
    const processedLines = lines.map((line) => {
      // 跳过注释行（以 // 开头）
      if (line.trim().startsWith('//')) {
        return line;
      }

      // 匹配 @@map("table_name")
      const mapRegex = /@@map\("([^"]+)"\)/g;
      return line.replace(mapRegex, (match, tableName) => {
        // 如果表名已经有前缀，不再重复添加
        if (tableName.startsWith(`${prefix}-`)) {
          return match;
        }

        const prefixedTableName = `${prefix}-${tableName}`;
        log(`  📝 ${tableName} → ${prefixedTableName}`, 'blue');
        return `@@map("${prefixedTableName}")`;
      });
    });

    generatedContent = processedLines.join('\n');
  }

  // 4. 添加生成信息注释
  const PROJECT_NAME = process.env.NEXT_PUBLIC_PROJECT_NAME || '客户需求洞察助手';
  const header = `// ============================================
// Prisma Schema for MongoDB
// ${PROJECT_NAME} 数据库模型
//
// 🤖 自动生成文件，请勿手动修改
// 📝 源文件：prisma/schema.template.prisma
// 🎯 项目前缀：${prefix || '无'}
// 🕐 生成时间：${new Date().toISOString()}
// ============================================

`;

  generatedContent = header + generatedContent;

  // 5. 写入文件
  fs.writeFileSync(outputPath, generatedContent, 'utf-8');
  log('\n✅ Schema 文件已生成：prisma/schema.prisma\n', 'green');

  // 6. 提示下一步操作
  log('📋 下一步操作：', 'blue');
  log('  1. 运行 npx prisma generate 更新 Prisma Client');
  log('  2. 首次部署运行 npx prisma db push 创建集合和索引');
  log('  3. 确保各环境使用一致的 PROJECT_TABLE_PREFIX\n');
}

// 主函数
function main() {
  try {
    generateSchema();
  } catch (error) {
    log(`\n❌ 生成失败：${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

main();
