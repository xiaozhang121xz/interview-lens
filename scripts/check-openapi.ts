/**
 * 手动 OpenAPI 文档更新辅助脚本
 *
 * 由于 @omer-x/next-openapi-json-generator 工具存在兼容性问题，
 * 该脚本提供了一个手动更新 OpenAPI 文档的模板和指南。
 */

import fs from 'fs';
import path from 'path';

// 当前 OpenAPI 文档路径
const OPENAPI_FILE_PATH = path.join(process.cwd(), 'public', 'openapi.json');

// 示例：如何添加新的 API 端点到文档中
function addNewEndpointExample() {
  console.log(`
📝 添加新 API 端点指南：

1. 在 public/openapi.json 中添加路径：

{
  "paths": {
    "/api/your-new-endpoint": {
      "post": {
        "operationId": "yourOperationId",
        "summary": "端点简短描述",
        "description": "端点详细描述",
        "tags": ["YourTag"],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": { "$ref": "#/components/schemas/YourRequestDTO" }
            }
          }
        },
        "responses": {
          "200": {
            "description": "成功",
            "content": {
              "application/json": {
                "schema": { "$ref": "#/components/schemas/YourResponseSchema" }
              }
            }
          },
          "400": { "description": "请求错误" },
          "500": { "description": "服务器错误" }
        }
      }
    }
  },
  "components": {
    "schemas": {
      "YourRequestDTO": {
        "type": "object",
        "properties": {
          "fieldName": { "type": "string", "description": "字段说明" }
        },
        "required": ["fieldName"]
      },
      "YourResponseSchema": {
        "type": "object",
        "properties": {
          "success": { "type": "boolean" },
          "data": { "type": "object" }
        }
      }
    }
  },
  "tags": [
    { "name": "YourTag", "description": "您的标签描述" }
  ]
}

2. 更新服务器 URL（如果需要）：
   - 开发环境：http://localhost:3000
   - 生产环境：https://your-domain.com

3. 验证 OpenAPI 文档：
   - 访问 http://localhost:3000/api-docs
   - 检查新端点是否显示
   - 使用 "Try it out" 测试
`);
}

// 检查当前 OpenAPI 文档
function checkCurrentDocumentation() {
  try {
    const openapiContent = fs.readFileSync(OPENAPI_FILE_PATH, 'utf-8');
    const openapiSpec = JSON.parse(openapiContent);

    console.log('✅ OpenAPI 文档已存在\n');
    console.log('📊 当前统计：');
    console.log(`   - 版本: ${openapiSpec.info.version}`);
    console.log(`   - 标题: ${openapiSpec.info.title}`);
    console.log(`   - 路径数量: ${Object.keys(openapiSpec.paths || {}).length}`);
    console.log(`   - Schema 数量: ${Object.keys(openapiSpec.components?.schemas || {}).length}`);
    console.log(`   - 标签数量: ${openapiSpec.tags?.length || 0}`);
    console.log('\n📋 已注册的 API 端点：');

    Object.entries(openapiSpec.paths || {}).forEach(([path, methods]: [string, any]) => {
      const methodList = Object.keys(methods).map(m => m.toUpperCase()).join(', ');
      console.log(`   ${methodList} ${path}`);
    });

    console.log('\n');
  } catch (error) {
    console.error('❌ 无法读取 OpenAPI 文档:', error);
  }
}

// 验证 OpenAPI 文档格式
function validateOpenAPISpec() {
  try {
    const openapiContent = fs.readFileSync(OPENAPI_FILE_PATH, 'utf-8');
    const spec = JSON.parse(openapiContent);

    // 基本验证
    if (!spec.openapi) {
      console.error('❌ 缺少 openapi 版本字段');
      return false;
    }
    if (!spec.info) {
      console.error('❌ 缺少 info 字段');
      return false;
    }
    if (!spec.paths) {
      console.error('❌ 缺少 paths 字段');
      return false;
    }

    console.log('✅ OpenAPI 文档格式验证通过\n');
    return true;
  } catch (error) {
    console.error('❌ OpenAPI 文档格式错误:', error);
    return false;
  }
}

// 主函数
function main() {
  console.log('📚 OpenAPI 文档管理工具\n');
  console.log('=' .repeat(50));

  checkCurrentDocumentation();
  validateOpenAPISpec();

  console.log('=' .repeat(50));
  console.log('\n🔧 可用命令：');
  console.log('   npm run openapi:check     - 检查 OpenAPI 文档状态');
  console.log('   npm run dev               - 启动开发服务器');
  console.log('\n📖 手动维护指南：');
  console.log('   编辑文件：public/openapi.json');
  console.log('   参考文档：https://swagger.io/specification/\n');

  addNewEndpointExample();
}

// 执行
main();
