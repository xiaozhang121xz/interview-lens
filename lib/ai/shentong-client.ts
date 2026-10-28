/**
 * 神通API客户端 - OpenAI兼容格式
 *
 * @module lib/ai/shentong-client
 * @description 提供 OpenAI-compatible 服务调用接口；客户搜索需要模型具备联网能力。
 *
 * 环境变量配置：
 * - AI_API_KEY: API密钥（必填）
 * - AI_BASE_URL: API地址（默认 https://api.openai.com）
 * - AI_MODEL: 模型名称（默认 gpt-4o-mini）
 * 继续兼容历史 AZSHENTONG_* 环境变量。
 */

import axios, { AxiosError } from 'axios';

// ============================================
// 类型定义
// ============================================

export interface ShentongMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ShentongCompletionResponse {
  success: boolean;
  content: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
  error?: string;
  errorType?: 'rate_limit' | 'service_unavailable' | 'config_error' | 'validation_error' | 'unknown';
}

export interface ShentongClientConfig {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  timeout?: number;
  maxRetries?: number;
}

// ============================================
// 错误类型映射
// ============================================

const ERROR_TYPE_MAP: Record<string, ShentongCompletionResponse['errorType']> = {
  'rate_limit_error': 'rate_limit',
  'rate_limit': 'rate_limit',
  '429': 'rate_limit',
  'overloaded_error': 'service_unavailable',
  'api_error': 'service_unavailable',
  '503': 'service_unavailable',
  'invalid_request_error': 'validation_error',
  'authentication_error': 'config_error',
  '401': 'config_error',
  'permission_error': 'config_error',
};

// ============================================
// 神通API客户端类
// ============================================

export class ShentongClient {
  private baseUrl: string;
  private apiKey: string;
  private model: string;
  private maxTokens: number;
  private temperature: number;
  private timeout: number;
  private maxRetries: number;

  constructor(config: ShentongClientConfig = {}) {
    this.baseUrl =
      config.baseUrl ||
      process.env.AI_BASE_URL ||
      process.env.OPENAI_BASE_URL ||
      process.env.AZSHENTONG_BASE_URL ||
      'https://api.openai.com';
    this.apiKey =
      config.apiKey ||
      process.env.AI_API_KEY ||
      process.env.OPENAI_API_KEY ||
      process.env.AZSHENTONG_API_KEY ||
      '';
    this.model =
      config.model ||
      process.env.AI_MODEL ||
      process.env.OPENAI_MODEL ||
      process.env.AZSHENTONG_MODEL ||
      'gpt-4o-mini';
    this.maxTokens = config.maxTokens || 4096;
    this.temperature = config.temperature ?? 0.7;
    this.timeout = config.timeout || 120000; // 120秒超时（联网搜索可能较慢）
    this.maxRetries = config.maxRetries || 3;

    if (!this.apiKey) {
      console.warn('[Search AI Client] AI_API_KEY 未配置，联网搜索功能将不可用');
    }
  }

  /**
   * 检查API密钥是否已配置
   */
  isConfigured(): boolean {
    return !!this.apiKey && this.apiKey.length > 0;
  }

  /**
   * 获取当前使用的模型名称
   */
  getModel(): string {
    return this.model;
  }

  /**
   * 生成AI回复（OpenAI兼容格式）
   */
  async generateCompletion(
    systemPrompt: string,
    messages: ShentongMessage[],
    options: {
      maxTokens?: number;
      temperature?: number;
    } = {}
  ): Promise<ShentongCompletionResponse> {
    // 检查配置
    if (!this.isConfigured()) {
      return {
        success: false,
        content: '',
        error: 'AI服务未配置，请设置 AI_API_KEY 环境变量',
        errorType: 'config_error',
      };
    }

    const maxTokens = options.maxTokens || this.maxTokens;
    const temperature = options.temperature ?? this.temperature;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const response = await axios.post(
          `${this.baseUrl}/v1/chat/completions`,
          {
            model: this.model,
            messages: [
              { role: 'system', content: systemPrompt },
              ...messages.map((m) => ({
                role: m.role,
                content: m.content,
              })),
            ],
            max_tokens: maxTokens,
            temperature: temperature,
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${this.apiKey}`,
            },
            timeout: this.timeout,
          }
        );

        // 提取文本内容
        const content = response.data.choices?.[0]?.message?.content || '';

        return {
          success: true,
          content,
          usage: {
            inputTokens: response.data.usage?.prompt_tokens || 0,
            outputTokens: response.data.usage?.completion_tokens || 0,
          },
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');

        // 检查是否为限流错误
        if (this.isRateLimitError(error)) {
          const waitTime = Math.min(1000 * Math.pow(2, attempt), 30000); // 指数退避，最大30秒
          console.warn(`[Shentong Client] 限流，等待 ${waitTime}ms 后重试... (尝试 ${attempt + 1}/${this.maxRetries})`);
          await this.sleep(waitTime);
          continue;
        }

        // 服务不可用，重试
        if (this.isServiceUnavailableError(error)) {
          const waitTime = Math.min(1000 * Math.pow(2, attempt), 30000);
          console.warn(`[Shentong Client] 服务暂时不可用，等待 ${waitTime}ms 后重试... (尝试 ${attempt + 1}/${this.maxRetries})`);
          await this.sleep(waitTime);
          continue;
        }

        // 其他错误不重试
        break;
      }
    }

    // 返回错误响应
    const errorType = this.getErrorType(lastError);
    const friendlyError = this.getFriendlyErrorMessage(lastError, errorType);

    return {
      success: false,
      content: '',
      error: friendlyError,
      errorType,
    };
  }

  /**
   * 判断是否为限流错误
   */
  private isRateLimitError(error: unknown): boolean {
    if (error instanceof AxiosError) {
      const status = error.response?.status;
      const errorData = error.response?.data as any;
      return status === 429 || errorData?.error?.type === 'rate_limit_error';
    }
    return false;
  }

  /**
   * 判断是否为服务不可用错误
   */
  private isServiceUnavailableError(error: unknown): boolean {
    if (error instanceof AxiosError) {
      const status = error.response?.status;
      return status === 503 || status === 500 || status === 502;
    }
    return false;
  }

  /**
   * 获取错误类型
   */
  private getErrorType(error: Error | null): ShentongCompletionResponse['errorType'] {
    if (!error) return 'unknown';

    if (error instanceof AxiosError) {
      const status = error.response?.status;
      if (status === 429) return 'rate_limit';
      if (status === 503 || status === 500) return 'service_unavailable';
      if (status === 401) return 'config_error';
      if (status === 400) return 'validation_error';
    }

    // 检查错误消息
    const errorMessage = error.message.toLowerCase();
    if (errorMessage.includes('rate limit') || errorMessage.includes('429')) return 'rate_limit';
    if (errorMessage.includes('overloaded') || errorMessage.includes('503')) return 'service_unavailable';
    if (errorMessage.includes('api key') || errorMessage.includes('authentication') || errorMessage.includes('401')) return 'config_error';

    return 'unknown';
  }

  /**
   * 获取友好的错误消息
   */
  private getFriendlyErrorMessage(error: Error | null, errorType: ShentongCompletionResponse['errorType']): string {
    if (!error) return 'Unknown error';

    if (errorType === 'service_unavailable') {
      return 'AI服务暂时不可用，请稍后重试。建议：等待1-2分钟后重试';
    }

    if (errorType === 'rate_limit') {
      return 'AI服务请求过于频繁，请稍后重试。建议：减少请求频率或等待几分钟后再试';
    }

    if (errorType === 'config_error') {
      return 'API密钥无效或未配置，请检查 AI_API_KEY 环境变量';
    }

    if (error instanceof AxiosError) {
      const errorData = error.response?.data as any;
      if (errorData?.error?.message) {
        return errorData.error.message;
      }
    }

    return error.message || 'Unknown error';
  }

  /**
   * 休眠函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ============================================
// 单例实例
// ============================================

let shentongClientInstance: ShentongClient | null = null;

/**
 * 获取神通API客户端实例（单例）
 */
export function getShentongClient(): ShentongClient {
  if (!shentongClientInstance) {
    shentongClientInstance = new ShentongClient();
  }
  return shentongClientInstance;
}

/**
 * 重置神通API客户端实例（用于测试）
 */
export function resetShentongClient(): void {
  shentongClientInstance = null;
}
