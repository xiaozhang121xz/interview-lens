/**
 * AI服务模块 - 处理所有AI相关操作
 */

import axios from 'axios';

export type AIOperation =
  | 'polish' // 润色
  | 'expand' // 扩写
  | 'shorten' // 缩写
  | 'translate' // 翻译
  | 'summarize' // 总结
  | 'rewrite' // 重写
  | 'continue'; // 续写

export interface AIRequest {
  operation: AIOperation;
  content: string;
  options?: {
    language?: string; // 用于翻译
    tone?: string; // 语气：formal, casual, professional
    length?: 'short' | 'medium' | 'long'; // 用于扩写/缩写
  };
}

export interface AIResponse {
  success: boolean;
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
  };
  error?: string;
}

/**
 * AI操作提示词模板
 */
const AI_PROMPTS: Record<AIOperation, string> = {
  polish: '请润色以下文本，改善其表达流畅度和专业性，保持原意不变：',
  expand: '请扩写以下文本，添加更多细节和深度内容：',
  shorten: '请精简以下文本，保留核心信息：',
  translate: '请将以下文本翻译成{language}：',
  summarize: '请总结以下文本的要点：',
  rewrite: '请重写以下文本，使用不同的表达方式：',
  continue: '请根据以下文本内容继续写作，保持风格一致：',
};

/**
 * AI服务类
 */
export class AIService {
  private apiBaseUrl: string;

  constructor(apiBaseUrl: string = '/api/ai') {
    this.apiBaseUrl = apiBaseUrl;
  }

  /**
   * 执行AI操作
   */
  async executeAI(request: AIRequest): Promise<AIResponse> {
    try {
      // 构建提示词
      const prompt = this.buildPrompt(request);

      // 调用后端AI API
      const response = await axios.post(this.apiBaseUrl, {
        prompt,
        operation: request.operation,
        options: request.options,
      });

      return {
        success: true,
        content: response.data.content,
        usage: response.data.usage,
      };
    } catch (error) {
      console.error('AI operation failed:', error);
      return {
        success: false,
        content: '',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 构建AI提示词
   */
  private buildPrompt(request: AIRequest): string {
    const template = AI_PROMPTS[request.operation];
    let prompt = template;

    // 替换模板变量
    if (request.options?.language) {
      prompt = prompt.replace('{language}', request.options.language);
    }

    return `${prompt}\n\n${request.content}`;
  }

  /**
   * 流式AI操作（返回流式响应）
   */
  async *streamAI(request: AIRequest): AsyncGenerator<string, void, unknown> {
    try {
      const prompt = this.buildPrompt(request);
      const response = await fetch(this.apiBaseUrl + '/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          operation: request.operation,
          options: request.options,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No reader available');
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        yield chunk;
      }
    } catch (error) {
      console.error('AI streaming failed:', error);
      throw error;
    }
  }

  /**
   * 模拟AI操作（用于开发测试）
   */
  async mockAI(request: AIRequest): Promise<AIResponse> {
    // 模拟网络延迟
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const mockResponses: Record<AIOperation, string> = {
      polish: `这是经过润色的文本：${request.content}`,
      expand: `这是扩写后的文本：${request.content}\n\n添加了更多详细信息和深度内容，使文章更加丰富和完整。`,
      shorten: request.content.split(' ').slice(0, 5).join(' ') + '...',
      translate: `[Translated] ${request.content}`,
      summarize: `总结：${request.content.substring(0, 50)}...`,
      rewrite: `这是重写后的版本：${request.content}`,
      continue: `${request.content}\n\n这是续写的内容，延续了前面的风格和思路。`,
    };

    return {
      success: true,
      content: mockResponses[request.operation],
      usage: {
        promptTokens: request.content.length,
        completionTokens: mockResponses[request.operation].length,
      },
    };
  }

  /**
   * 模拟流式AI操作
   */
  async *mockStreamAI(
    request: AIRequest
  ): AsyncGenerator<string, void, unknown> {
    const responses: Record<AIOperation, string> = {
      polish: `这是经过润色的文本：${request.content}`,
      expand: `这是扩写后的文本。`,
      shorten: '精简文本...',
      translate: '[翻译中]',
      summarize: '总结要点...',
      rewrite: '重写内容...',
      continue: '续写内容...',
    };

    const fullResponse = responses[request.operation];

    // 模拟流式输出
    for (let i = 0; i < fullResponse.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 50));
      yield fullResponse[i];
    }
  }
}

// 导出单例实例
export const aiService = new AIService();
