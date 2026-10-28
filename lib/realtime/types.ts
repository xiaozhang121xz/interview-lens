/**
 * 实时转写服务类型定义
 * 基于 OpenAI Realtime API 格式
 */

// ============== 转写模式 ==============

/** 转写模式类型 */
export type TranscriptionMode = 'web-speech' | 'realtime-api';

// ============== 模型配置 ==============

export type TranscriptionModel = {
  id: string;
  name: string;
  description: string;
  supportedLanguages: string[];
};

// ============== 客户端状态 ==============

export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'disconnecting' | 'error';

export interface TranscriptionResult {
  id: string;
  text: string;
  isFinal: boolean;
  confidence?: number;
  timestamp: Date;
  language?: string;
}

// ============== OpenAI Realtime API 事件类型 ==============

export type RealtimeEventType =
  | 'session.created'
  | 'session.updated'
  | 'conversation.item.created'
  | 'input_audio_buffer.committed'
  | 'input_audio_buffer.speech_started'
  | 'input_audio_buffer.speech_stopped'
  | 'response.created'
  | 'response.output_item.added'
  | 'response.content_part.added'
  | 'response.audio_transcript.delta'
  | 'response.audio_transcript.done'
  | 'response.output_item.done'
  | 'response.done'
  | 'error';

// ============== OpenAI Realtime API 数据结构 ==============

export interface RealtimeSession {
  id: string;
  object: 'realtime.session';
  model: string;
  modalities: ('text' | 'audio')[];
  instructions?: string;
  voice?: 'alloy' | 'echo' | 'shimmer';
  input_format?: 'pcm16' | 'g711_ulaw' | 'g711_alaw';
  output_format?: 'pcm16' | 'g711_ulaw' | 'g711_alaw';
  input_audio_transcription?: {
    model: string;
  };
  output_audio_transcription?: {
    model: string;
  };
  turn_detection?: {
    type: 'server_vad' | 'null';
    threshold?: number;
    prefix_padding_ms?: number;
    silence_duration_ms?: number;
  };
  tools?: RealtimeTool[];
  tool_choice?: 'auto' | 'none' | { type: 'function'; name: string };
  temperature?: number;
  max_response_output_tokens?: number | 'inf';
}

export interface RealtimeItem {
  id: string;
  object: 'realtime.item';
  type: 'message' | 'function_call' | 'function_call_output';
  status?: 'in_progress' | 'completed' | 'incomplete';
  role?: 'user' | 'assistant' | 'system';
  content?: RealtimeContent[];
  call_id?: string;
  name?: string;
  arguments?: string;
  output?: string;
}

export interface RealtimeContent {
  type: 'input_text' | 'input_audio' | 'text' | 'audio';
  text?: string;
  audio?: string; // Base64 encoded audio
  transcript?: string;
}

export interface RealtimeError {
  type: string;
  code?: string;
  message: string;
  param?: string;
  event_id?: string;
}

// ============== 事件接口 ==============

export interface RealtimeEvent {
  type: RealtimeEventType;
  event_id?: string;
  session?: RealtimeSession;
  item?: RealtimeItem;
  content_index?: number;
  delta?: string;
  output_index?: number;
  audio_start_ms?: number;
  audio_end_ms?: number;
  error?: RealtimeError;
  previous_item_id?: string;
}

// ============== 客户端发送事件 ==============

export interface SessionUpdateEvent {
  type: 'session.update';
  session: Partial<RealtimeSession>;
}

export interface InputAudioBufferAppendEvent {
  type: 'input_audio_buffer.append';
  audio: string; // Base64 encoded audio
}

export interface InputAudioBufferCommitEvent {
  type: 'input_audio_buffer.commit';
}

export interface InputAudioBufferClearEvent {
  type: 'input_audio_buffer.clear';
}

export interface ConversationItemCreateEvent {
  type: 'conversation.item.create';
  previous_item_id?: string;
  item: Omit<RealtimeItem, 'id' | 'object'>;
}

export interface ConversationItemDeleteEvent {
  type: 'conversation.item.delete';
  item_id: string;
}

export interface ResponseCreateEvent {
  type: 'response.create';
  response?: {
    modalities?: ('text' | 'audio')[];
    instructions?: string;
    voice?: 'alloy' | 'echo' | 'shimmer';
    output_audio_format?: 'pcm16' | 'g711_ulaw' | 'g711_alaw';
    tools?: RealtimeTool[];
    tool_choice?: 'auto' | 'none' | { type: 'function'; name: string };
    temperature?: number;
    max_response_output_tokens?: number | 'inf';
  };
}

export interface ResponseCancelEvent {
  type: 'response.cancel';
}

export type ClientEvent =
  | SessionUpdateEvent
  | InputAudioBufferAppendEvent
  | InputAudioBufferCommitEvent
  | InputAudioBufferClearEvent
  | ConversationItemCreateEvent
  | ConversationItemDeleteEvent
  | ResponseCreateEvent
  | ResponseCancelEvent;

// ============== 工具定义 ==============

export interface RealtimeTool {
  type: 'function';
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

// ============== 回调函数类型 ==============

export type OnTranscriptionCallback = (result: TranscriptionResult) => void;
export type OnStatusChangeCallback = (status: ConnectionStatus) => void;
export type OnErrorCallback = (error: Error) => void;
export type OnEventCallback = (event: RealtimeEvent) => void;

// ============== 客户端配置 ==============

export interface RealtimeTranscriptionConfig {
  model: string;
  language?: string;
  prompt?: string;
  autoReconnect?: boolean;
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
}

// ============== API 配置 ==============

export interface RealtimeApiConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}