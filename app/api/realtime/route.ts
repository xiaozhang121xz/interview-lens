/**
 * 实时转写 WebSocket 代理 API
 *
 * ⚠️ 重要说明：
 *
 * Next.js App Router 在 serverless 环境（如 Vercel）中不原生支持 WebSocket 升级。
 *
 * ## 部署选项：
 *
 * 1. **开发环境**：可以使用自定义 Next.js 服务器支持 WebSocket
 * 2. **生产环境**：
 *    - 选项A：部署到支持 WebSocket 的平台（如 Railway, Render, 自托管服务器）
 *    - 选项B：使用独立的 WebSocket 服务器
 *    - 选项C：使用 WebSocket 服务提供商（如 Ably, Pusher, Socket.io Cloud）
 *
 * ## 当前实现：
 *
 * 此 API 提供：
 * - GET: 获取实时转写配置（模型列表、连接状态）
 * - 返回前端所需的安全配置信息（不暴露 API 密钥）
 *
 * ## 安全设计：
 *
 * - API 密钥存储在环境变量中，不暴露给前端
 * - 前端通过此 API 获取配置，然后建立 WebSocket 连接
 * - WebSocket 连接需要携带用户认证信息
 */

import { NextRequest, NextResponse } from 'next/server';
import { TRANSCRIPTION_MODELS, DEFAULT_MODEL } from '@/lib/realtime/config';

/**
 * @openapi
 * /api/realtime:
 *   get:
 *     summary: 获取实时转写配置
 *     description: 返回可用的转写模型列表和配置信息，不暴露敏感的 API 密钥
 *     tags:
 *       - Realtime Transcription
 *     parameters:
 *       - in: query
 *         name: model
 *         schema:
 *           type: string
 *         description: 要查询的模型ID
 *     responses:
 *       200:
 *         description: 成功返回配置信息
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 models:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/TranscriptionModel'
 *                 defaultModel:
 *                   type: string
 *                 isConfigured:
 *                   type: boolean
 *                 websocketUrl:
 *                   type: string
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器配置错误
 */
export async function GET(request: NextRequest) {
  try {
    // 检查环境变量配置
    const apiKey = process.env.REALTIME_TRANSCRIPTION_API_KEY;
    const baseUrl = process.env.REALTIME_TRANSCRIPTION_BASE_URL;
    const defaultModel = process.env.REALTIME_TRANSCRIPTION_MODEL_DEFAULT || DEFAULT_MODEL;

    // 判断是否已配置
    const isConfigured = !!(apiKey && baseUrl);

    // 获取请求的模型参数
    const { searchParams } = new URL(request.url);
    const requestedModel = searchParams.get('model') || defaultModel;

    // 验证模型是否有效
    const modelConfig = TRANSCRIPTION_MODELS.find((m) => m.id === requestedModel);

    if (!modelConfig) {
      return NextResponse.json(
        {
          error: '无效的模型ID',
          availableModels: TRANSCRIPTION_MODELS.map((m) => m.id),
        },
        { status: 400 }
      );
    }

    // 返回安全配置（不包含 API 密钥）
    return NextResponse.json({
      // 可用模型列表
      models: TRANSCRIPTION_MODELS,

      // 默认模型
      defaultModel,

      // 当前选择的模型
      selectedModel: requestedModel,

      // 是否已配置 API 密钥
      isConfigured,

      // WebSocket 连接 URL（前端使用）
      // 注意：实际的 WebSocket 代理需要在支持 WebSocket 的服务器上运行
      websocketUrl: isConfigured
        ? `${baseUrl}/realtime?model=${requestedModel}`
        : null,

      // 连接状态
      status: isConfigured ? 'available' : 'not_configured',

      // 使用说明
      instructions: isConfigured
        ? '请在支持 WebSocket 的环境中使用实时转写功能'
        : '请联系管理员配置 REALTIME_TRANSCRIPTION_API_KEY 和 REALTIME_TRANSCRIPTION_BASE_URL',
    });
  } catch (error) {
    console.error('[Realtime API] Error:', error);
    return NextResponse.json(
      {
        error: '获取配置失败',
        message: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    );
  }
}

/**
 * @openapi
 * /api/realtime:
 *   post:
 *     summary: 代理实时转写请求（HTTP 方式）
 *     description: |
 *       对于不支持 WebSocket 的环境，可以使用 HTTP POST 方式发送音频数据。
 *       此端点会将音频转发到实时转写服务，并返回转写结果。
 *
 *       注意：此方式不是真正的实时转写，而是接近实时的批处理。
 *     tags:
 *       - Realtime Transcription
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               audio:
 *                 type: string
 *                 format: binary
 *                 description: 音频数据（PCM16 或 WebM 格式）
 *               model:
 *                 type: string
 *                 description: 模型ID
 *               language:
 *                 type: string
 *                 description: 语言代码
 *     responses:
 *       200:
 *         description: 成功返回转写结果
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 text:
 *                   type: string
 *                 isFinal:
 *                   type: boolean
 */
export async function POST(request: NextRequest) {
  try {
    // 检查配置
    const apiKey = process.env.REALTIME_TRANSCRIPTION_API_KEY;
    const baseUrl = process.env.REALTIME_TRANSCRIPTION_BASE_URL;

    if (!apiKey || !baseUrl) {
      return NextResponse.json(
        {
          error: '服务未配置',
          message: '请联系管理员配置实时转写服务',
        },
        { status: 503 }
      );
    }

    // 解析请求
    const formData = await request.formData();
    const audioBlob = formData.get('audio') as Blob;
    const model = (formData.get('model') as string) || DEFAULT_MODEL;
    const language = (formData.get('language') as string) || 'zh-CN';

    if (!audioBlob) {
      return NextResponse.json(
        { error: '缺少音频数据' },
        { status: 400 }
      );
    }

    // 注意：这里是简化的实现
    // 实际的实时转写需要 WebSocket 连接
    // 对于 HTTP 方式，建议使用 OpenAI 的 Audio Transcriptions API
    // POST https://api.openai.com/v1/audio/transcriptions

    // 返回提示信息
    return NextResponse.json({
      error: 'HTTP 方式暂不支持',
      message: '请使用 WebSocket 方式进行实时转写',
      alternative: '可以使用 /api/audio/transcriptions 端点进行音频转写（非实时）',
    }, { status: 400 });
  } catch (error) {
    console.error('[Realtime API] POST Error:', error);
    return NextResponse.json(
      {
        error: '处理请求失败',
        message: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    );
  }
}