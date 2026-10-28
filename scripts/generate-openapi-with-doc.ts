import { createSwaggerSpec } from 'next-swagger-doc';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

// 项目配置
const PROJECT_NAME = process.env.NEXT_PUBLIC_PROJECT_NAME || '客户需求洞察助手';

/**
 * 使用 next-swagger-doc 自动生成 OpenAPI 文档
 *
 * 该工具会扫描 app/api 目录下的所有 API 路由，
 * 读取 JSDoc 注释，并生成 OpenAPI 3.1.0 规范的 JSON 文件
 *
 * Swagger UI 使用 CDN 加载，无需复制本地静态资源
 *
 * 使用方式：
 * - 默认生成到根目录：npm run openapi:generate
 * - 自定义输出路径：npm run openapi:generate -- --output=path/to/openapi.json
 */
async function generateOpenApi() {
  try {
    console.log('🚀 开始生成 OpenAPI 文档...');

    // 解析命令行参数
    const args = process.argv.slice(2);
    const outputArg = args.find(arg => arg.startsWith('--output='));

    // 确定输出路径
    let outputPath: string;
    if (outputArg) {
      const customPath = outputArg.split('=')[1];
      // 支持相对路径和绝对路径
      outputPath = path.isAbsolute(customPath)
        ? customPath
        : path.join(process.cwd(), customPath);
      console.log(`📂 自定义输出路径: ${outputPath}`);
    } else {
      // 默认生成到项目根目录
      outputPath = path.join(process.cwd(), 'openapi.json');
      console.log(`📂 使用默认输出路径（项目根目录）`);
    }

    const spec = createSwaggerSpec({
      apiFolder: 'app/api',
      definition: {
        openapi: '3.1.0',
        info: {
          title: `${PROJECT_NAME} API`,
          version: '1.0.0',
          description: `${PROJECT_NAME} 平台的 API 接口文档 - 使用 next-swagger-doc 自动生成`,
        },
        servers: [
          {
            url: '/',
            description: '当前服务器（相对路径）'
          },
          {
            url: 'http://localhost:3000',
            description: '开发服务器'
          }
        ],
        tags: [
          {
            name: 'Users',
            description: '用户管理相关接口'
          },
          {
            name: 'Authentication',
            description: '用户认证相关接口（登录、注册、令牌刷新等）'
          },
          {
            name: 'Customers',
            description: '客户管理相关接口'
          },
          {
            name: 'Interviews',
            description: '访谈项目管理相关接口'
          },
          {
            name: 'Outlines',
            description: '访谈提纲管理相关接口'
          },
          {
            name: 'Records',
            description: '访谈记录管理相关接口'
          },
          {
            name: 'AI',
            description: 'AI辅助功能相关接口'
          },
          {
            name: 'Dashboard',
            description: '首页统计相关接口'
          }
        ],
      },
    });

    // 确保输出目录存在
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
      console.log(`📁 创建目录: ${outputDir}`);
    }

    // 写入 openapi.json 文件（如果存在则覆盖）
    const fileExists = fs.existsSync(outputPath);
    fs.writeFileSync(outputPath, JSON.stringify(spec, null, 2));

    console.log('✅ OpenAPI 文档生成成功！');
    console.log(`📄 文件路径: ${outputPath}`);
    if (fileExists) {
      console.log(`♻️  文件已覆盖`);
    }
    console.log(`\n📊 统计信息:`);
    console.log(`   - 路由数量: ${Object.keys((spec as any).paths || {}).length}`);
    console.log(`   - Schema 数量: ${Object.keys((spec as any).components?.schemas || {}).length}`);
    console.log(`   - 标签数量: ${(spec as any).tags?.length || 0}`);

    // 列出所有生成的端点
    console.log(`\n📋 已生成的 API 端点：`);
    Object.entries((spec as any).paths || {}).forEach(([path, methods]: [string, any]) => {
      const methodList = Object.keys(methods).map(m => m.toUpperCase()).join(', ');
      console.log(`   ${methodList} ${path}`);
    });

    console.log(`\n✨ OpenAPI 文档生成完成！`);
    console.log(`📌 访问地址: http://localhost:3000/api-docs`);
  } catch (error) {
    console.error('❌ 生成 OpenAPI 文档失败:', error);
    process.exit(1);
  }
}

// 执行生成
generateOpenApi();
