#!/usr/bin/env node

/**
 * 自动生成 OpenAPI 3.0 文档
 */

const fs = require('fs');
const path = require('path');

// 加载环境变量
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const ROOT_DIR = path.join(__dirname, '..');
const OUTPUT_FILE = path.join(ROOT_DIR, 'openapi.json');

// 项目配置
const PROJECT_NAME = process.env.NEXT_PUBLIC_PROJECT_NAME || '客户需求洞察助手';

const openApiSpec = {
  openapi: '3.0.0',
  info: {
    title: `${PROJECT_NAME} API`,
    description: `${PROJECT_NAME}平台的API文档`,
    version: '1.0.0',
    contact: { name: `${PROJECT_NAME} Team` }
  },
  servers: [
    { url: 'http://localhost:3000', description: '本地开发服务器' }
  ],
  tags: [
    { name: '认证', description: '用户认证相关接口' },
    { name: '用户管理', description: '用户管理相关接口' },
    { name: '通知', description: '通知系统相关接口' }
  ],
  paths: {
    '/api/auth/login': {
      post: {
        tags: ['认证'],
        summary: '用户名密码登录',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['username', 'password'],
                properties: {
                  username: { type: 'string', example: 'az' },
                  password: { type: 'string', example: '888' }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: '登录成功',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    user: { type: 'object' },
                    accessToken: { type: 'string' },
                    refreshToken: { type: 'string' },
                    expiresIn: { type: 'integer' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/auth/send-code': {
      post: {
        tags: ['认证'],
        summary: '发送手机验证码',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['phone'],
                properties: {
                  phone: { type: 'string', pattern: '^1[3-9]\\\\d{9}$' }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: '成功',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { success: { type: 'boolean' }, code: { type: 'string' } }
                }
              }
            }
          }
        }
      }
    },
    '/api/auth/verify-code': {
      post: {
        tags: ['认证'],
        summary: '验证码登录',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['phone', 'code'],
                properties: {
                  phone: { type: 'string' },
                  code: { type: 'string', length: 4 }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: '成功',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { success: { type: 'boolean' }, user: { type: 'object' }, token: { type: 'string' } }
                }
              }
            }
          }
        }
      }
    },
    '/api/users': {
      get: {
        tags: ['用户管理'],
        summary: '获取用户列表',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'pageSize', in: 'query', schema: { type: 'integer', default: 10 } }
        ],
        responses: {
          '200': {
            description: '成功',
            content: {
              'application/json': {
                schema: { type: 'object', properties: { items: { type: 'array' }, total: { type: 'integer' } } }
              }
            }
          }
        }
      }
    }
  },
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    }
  }
};

fs.writeFileSync(OUTPUT_FILE, JSON.stringify(openApiSpec, null, 2));
console.log('✅ OpenAPI文档生成成功: ' + OUTPUT_FILE);
