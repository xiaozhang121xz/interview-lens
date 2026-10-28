/**
 * 实时转写服务配置
 */

import type { TranscriptionModel, RealtimeTranscriptionConfig } from './types';

// ============== 模型配置 ==============

/**
 * 支持的实时转写模型列表
 */
export const TRANSCRIPTION_MODELS: TranscriptionModel[] = [
  {
    id: 'gpt-4o-realtime-preview',
    name: 'GPT-4o 实时转写',
    description: '高精度实时转写，支持多语言，适合正式访谈',
    supportedLanguages: ['zh-CN', 'en-US', 'ja-JP', 'ko-KR'],
  },
  {
    id: 'gpt-4o-mini-realtime-preview',
    name: 'GPT-4o Mini 实时转写',
    description: '轻量级实时转写，响应更快，成本更低',
    supportedLanguages: ['zh-CN', 'en-US'],
  },
];

/**
 * 默认模型
 */
export const DEFAULT_MODEL = 'gpt-4o-realtime-preview';

// ============== 默认配置 ==============

/**
 * 默认客户端配置
 */
export const DEFAULT_CONFIG: RealtimeTranscriptionConfig = {
  model: DEFAULT_MODEL,
  language: 'zh-CN',
  autoReconnect: true,
  maxReconnectAttempts: 3,
  reconnectDelay: 1000,
};

// ============== 音频配置 ==============

/**
 * 音频采样配置
 * OpenAI Realtime API 要求 PCM16 格式，24kHz 采样率
 */
export const AUDIO_CONFIG = {
  sampleRate: 24000,
  channels: 1,
  mimeType: 'audio/webm;codecs=opus', // 浏览器录音格式
  targetFormat: 'pcm16', // 目标格式
} as const;

// ============== 连接配置 ==============

/**
 * WebSocket 连接超时配置
 */
export const CONNECTION_CONFIG = {
  connectTimeout: 10000, // 10秒连接超时
  pingInterval: 30000, // 30秒心跳间隔
  maxMessageSize: 1024 * 1024, // 1MB 最大消息大小
} as const;

// ============== 辅助函数 ==============

/**
 * 根据ID获取模型配置
 */
export function getModelById(modelId: string): TranscriptionModel | undefined {
  return TRANSCRIPTION_MODELS.find((model) => model.id === modelId);
}

/**
 * 检查模型是否支持指定语言
 */
export function isLanguageSupported(modelId: string, language: string): boolean {
  const model = getModelById(modelId);
  return model?.supportedLanguages.includes(language) ?? false;
}

/**
 * 获取模型的默认语言
 */
export function getDefaultLanguage(modelId: string): string {
  const model = getModelById(modelId);
  return model?.supportedLanguages[0] ?? 'zh-CN';
}