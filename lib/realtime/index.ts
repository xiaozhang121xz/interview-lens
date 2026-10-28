/**
 * 实时转写模块导出
 */

// 类型定义
export type {
  TranscriptionMode,
  TranscriptionModel,
  ConnectionStatus,
  TranscriptionResult,
  RealtimeEventType,
  RealtimeEvent,
  RealtimeSession,
  RealtimeItem,
  RealtimeError,
  ClientEvent,
  OnTranscriptionCallback,
  OnStatusChangeCallback,
  OnErrorCallback,
  OnEventCallback,
  RealtimeTranscriptionConfig,
} from './types';

// 配置
export {
  TRANSCRIPTION_MODELS,
  DEFAULT_MODEL,
  DEFAULT_CONFIG,
  AUDIO_CONFIG,
  CONNECTION_CONFIG,
  getModelById,
  isLanguageSupported,
  getDefaultLanguage,
} from './config';

// 客户端
export { RealtimeTranscriptionClient } from './client';