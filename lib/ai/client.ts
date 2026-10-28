/**
 * AI客户端模块 - 默认封装神通 OpenAI-compatible 调用
 *
 * @module lib/ai/client
 * @description 保留既有 getAIClient() 入口，内部默认走神通实现，
 *              以便上层业务和 skill 决策逻辑无需改动。
 */

import { AxiosError } from 'axios';

export interface AIClientConfig {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  timeout?: number;
  maxRetries?: number;
}

export interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AICompletionResponse {
  success: boolean;
  content: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
  error?: string;
  errorType?: 'rate_limit' | 'service_unavailable' | 'config_error' | 'validation_error' | 'model_error' | 'unknown';
}

function parseTimeoutMs(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

export class AIClient {
  private apiKey: string;
  private baseUrl: string;
  private model: string;
  private maxTokens: number;
  private temperature: number;
  private maxRetries: number;
  private timeout: number;

  constructor(config: AIClientConfig = {}) {
    this.apiKey =
      config.apiKey ||
      process.env.AI_API_KEY ||
      process.env.OPENAI_API_KEY ||
      process.env.AZSHENTONG_API_KEY ||
      process.env.ANTHROPIC_API_KEY ||
      process.env.ANTHROPIC_AUTH_TOKEN ||
      '';
    this.baseUrl =
      config.baseUrl ||
      process.env.AI_BASE_URL ||
      process.env.OPENAI_BASE_URL ||
      process.env.AZSHENTONG_BASE_URL ||
      process.env.ANTHROPIC_BASE_URL ||
      'https://api.openai.com';
    this.model =
      config.model ||
      process.env.AI_MODEL ||
      process.env.OPENAI_MODEL ||
      process.env.AZSHENTONG_MODEL ||
      process.env.ANTHROPIC_MODEL ||
      process.env.ANTHROPIC_DEFAULT_SONNET_MODEL ||
      'gpt-4o-mini';
    this.maxTokens = config.maxTokens || 4096;
    this.temperature = config.temperature ?? 0.7;
    this.maxRetries = config.maxRetries || 5;
    this.timeout =
      config.timeout ||
      parseTimeoutMs(process.env.AI_API_TIMEOUT_MS) ||
      parseTimeoutMs(process.env.NEXT_PUBLIC_AI_API_TIMEOUT_MS) ||
      120000;

    if (!this.apiKey) {
      console.warn('[AI Client] 未配置 AI_API_KEY（或兼容密钥），AI功能将不可用');
    }
  }

  isConfigured(): boolean {
    return !!this.apiKey && this.apiKey !== 'dummy-key-for-build';
  }

  getModel(): string {
    return this.model;
  }

  async generateCompletion(
    systemPrompt: string,
    messages: AIMessage[],
    options: {
      maxTokens?: number;
      temperature?: number;
      model?: string;
    } = {}
  ): Promise<AICompletionResponse> {
    const requestId = `req-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const model = options.model || this.model;
    console.log(`[AI Client] 🚀 新请求开始 ${requestId} (model=${model})`);

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
        const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: [
              ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
              ...messages.map((message) => ({
                role: message.role,
                content: message.content,
              })),
            ],
            max_tokens: maxTokens,
            temperature,
          }),
          signal: AbortSignal.timeout(this.timeout),
        });

        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          const errorMessage =
            payload?.error?.message ||
            payload?.message ||
            `HTTP ${response.status}`;
          throw new AIClientHttpError(errorMessage, response.status, payload);
        }

        const content = payload?.choices?.[0]?.message?.content || '';
        const inputTokens = payload?.usage?.prompt_tokens || 0;
        const outputTokens = payload?.usage?.completion_tokens || 0;

        console.log(
          `[AI Client] ✅ 请求成功 ${requestId} (inputTokens=${inputTokens}, outputTokens=${outputTokens})`
        );

        return {
          success: true,
          content,
          usage: {
            inputTokens,
            outputTokens,
          },
        };
      } catch (error) {
        lastError = normalizeError(error);
        const details = this.getErrorDetails(lastError);

        console.error(
          `[AI Client] 原始错误: ${lastError.message}`,
          `\n  状态码: ${this.getErrorStatus(lastError) || '未知'}`,
          `\n  错误类型: ${details.errorType}`,
          `\n  模型: ${model}`,
          `\n  baseURL: ${this.baseUrl}`
        );

        if (details.shouldRetry) {
          const waitTime = Math.min(1000 * Math.pow(2, attempt), 30000);
          console.warn(
            `[AI Client] ${details.logLabel}，等待 ${waitTime}ms 后重试... ` +
              `(尝试 ${attempt + 1}/${this.maxRetries}, ${requestId}, model=${model})`
          );
          await this.sleep(waitTime);
          continue;
        }

        console.error(
          `[AI Client] ${details.logLabel}，停止重试 ` +
            `(${requestId}, model=${model}): ${lastError.message}`
        );
        break;
      }
    }

    const details = this.getErrorDetails(lastError);
    return {
      success: false,
      content: '',
      error: details.friendlyMessage,
      errorType: details.errorType,
    };
  }

  async *streamCompletion(
    systemPrompt: string,
    messages: AIMessage[],
    options: {
      maxTokens?: number;
      temperature?: number;
      model?: string;
    } = {}
  ): AsyncGenerator<string, void, unknown> {
    const response = await this.generateCompletion(systemPrompt, messages, options);
    if (!response.success) {
      throw new Error(response.error || 'AI流式调用失败');
    }

    yield response.content;
  }

  private getErrorDetails(error: Error | null): {
    errorType: AICompletionResponse['errorType'];
    shouldRetry: boolean;
    logLabel: string;
    friendlyMessage: string;
  } {
    if (!error) {
      return {
        errorType: 'unknown',
        shouldRetry: false,
        logLabel: '未知错误',
        friendlyMessage: 'AI服务调用失败，请稍后重试。',
      };
    }

    const errorMessage = error.message.toLowerCase();
    const status = this.getErrorStatus(error);

    if (status === 429 || errorMessage.includes('rate limit') || errorMessage.includes('429')) {
      return {
        errorType: 'rate_limit',
        shouldRetry: true,
        logLabel: '请求限流',
        friendlyMessage: 'AI服务请求过于频繁，请稍后重试。建议：减少请求频率或等待几分钟后再试',
      };
    }

    if (
      status === 401 ||
      status === 403 ||
      errorMessage.includes('api key') ||
      errorMessage.includes('authentication') ||
      errorMessage.includes('permission')
    ) {
      return {
        errorType: 'config_error',
        shouldRetry: false,
        logLabel: '认证失败或权限不足',
        friendlyMessage: 'AI服务认证失败，请检查 API Key、权限配置或网关鉴权设置。',
      };
    }

    if (
      status === 404 ||
      (errorMessage.includes('model') &&
        (errorMessage.includes('not found') ||
          errorMessage.includes('does not exist') ||
          errorMessage.includes('unsupported') ||
          errorMessage.includes('unknown')))
    ) {
      return {
        errorType: 'model_error',
        shouldRetry: false,
        logLabel: '模型不存在或当前网关不支持该模型',
        friendlyMessage: `AI模型不可用，请检查模型配置是否正确。当前模型：${this.model}`,
      };
    }

    if (status === 400 || status === 422) {
      return {
        errorType: 'validation_error',
        shouldRetry: false,
        logLabel: '请求参数无效',
        friendlyMessage: `AI请求参数无效，请检查模型、提示词或请求格式。当前模型：${this.model}`,
      };
    }

    if (
      status === 500 ||
      status === 502 ||
      status === 503 ||
      status === 504 ||
      errorMessage.includes('overloaded') ||
      errorMessage.includes('503') ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('econnreset') ||
      errorMessage.includes('network') ||
      errorMessage.includes('fetch failed')
    ) {
      return {
        errorType: 'service_unavailable',
        shouldRetry: true,
        logLabel: '服务暂时不可用',
        friendlyMessage: 'AI服务暂时不可用，请稍后重试。建议：1) 等待1-2分钟后重试 2) 检查网关服务状态',
      };
    }

    return {
      errorType: 'unknown',
      shouldRetry: false,
      logLabel: '未知错误',
      friendlyMessage: error.message || 'AI服务调用失败，请稍后重试。',
    };
  }

  private getErrorStatus(error: Error): number | undefined {
    const maybeError = error as Error & { status?: number };
    return typeof maybeError.status === 'number' ? maybeError.status : undefined;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

class AIClientHttpError extends Error {
  status?: number;
  payload?: unknown;

  constructor(message: string, status?: number, payload?: unknown) {
    super(message);
    this.name = 'AIClientHttpError';
    this.status = status;
    this.payload = payload;
  }
}

function normalizeError(error: unknown): Error {
  if (error instanceof Error) {
    if (error.name === 'TimeoutError') {
      return new Error('Request timed out.');
    }
    return error;
  }

  if (error instanceof AxiosError) {
    const message =
      (error.response?.data as { error?: { message?: string } } | undefined)?.error?.message ||
      error.message;
    return new AIClientHttpError(message, error.response?.status, error.response?.data);
  }

  return new Error('Unknown error');
}

let aiClientInstance: AIClient | null = null;

export function getAIClient(): AIClient {
  if (!aiClientInstance) {
    aiClientInstance = new AIClient();
  }
  return aiClientInstance;
}

export function resetAIClient(): void {
  aiClientInstance = null;
}
