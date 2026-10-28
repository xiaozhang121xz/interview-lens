/**
 * 实时转写 WebSocket 客户端
 *
 * 安全设计：
 * - 连接到后端代理 API，不直接连接第三方服务
 * - API 密钥由后端管理，前端无法访问
 */

import type {
  RealtimeEvent,
  TranscriptionResult,
  ConnectionStatus,
  OnTranscriptionCallback,
  OnStatusChangeCallback,
  OnErrorCallback,
  OnEventCallback,
  RealtimeTranscriptionConfig,
  ClientEvent,
} from './types';
import { DEFAULT_CONFIG, AUDIO_CONFIG, CONNECTION_CONFIG } from './config';

export class RealtimeTranscriptionClient {
  private ws: WebSocket | null = null;
  private status: ConnectionStatus = 'idle';
  private reconnectAttempts = 0;
  private config: RealtimeTranscriptionConfig;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private isRecording = false;
  private currentTranscriptId: string | null = null;
  private accumulatedText = '';

  // 回调函数
  private onTranscriptionCallback?: OnTranscriptionCallback;
  private onStatusChangeCallback?: OnStatusChangeCallback;
  private onErrorCallback?: OnErrorCallback;
  private onEventCallback?: OnEventCallback;

  constructor(config: Partial<RealtimeTranscriptionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ============== 回调设置 ==============

  onTranscription(callback: OnTranscriptionCallback): void {
    this.onTranscriptionCallback = callback;
  }

  onStatusChange(callback: OnStatusChangeCallback): void {
    this.onStatusChangeCallback = callback;
  }

  onError(callback: OnErrorCallback): void {
    this.onErrorCallback = callback;
  }

  onEvent(callback: OnEventCallback): void {
    this.onEventCallback = callback;
  }

  // ============== 状态管理 ==============

  private setStatus(status: ConnectionStatus): void {
    this.status = status;
    this.onStatusChangeCallback?.(status);
  }

  getStatus(): ConnectionStatus {
    return this.status;
  }

  // ============== 连接管理 ==============

  /**
   * 连接到实时转写服务
   */
  async connect(): Promise<void> {
    if (this.status === 'connected' || this.status === 'connecting') {
      return;
    }

    this.setStatus('connecting');

    try {
      // 构建 WebSocket URL（连接到后端代理）
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${wsProtocol}//${window.location.host}/api/realtime?model=${this.config.model}`;

      this.ws = new WebSocket(wsUrl);

      // 设置超时
      const timeoutId = setTimeout(() => {
        if (this.status === 'connecting') {
          this.handleConnectionError(new Error('连接超时'));
        }
      }, CONNECTION_CONFIG.connectTimeout);

      this.ws.onopen = () => {
        clearTimeout(timeoutId);
        this.handleOpen();
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event);
      };

      this.ws.onerror = (error) => {
        clearTimeout(timeoutId);
        this.handleConnectionError(new Error('WebSocket 连接错误'));
      };

      this.ws.onclose = (event) => {
        clearTimeout(timeoutId);
        this.handleClose(event);
      };
    } catch (error) {
      this.handleConnectionError(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    this.setStatus('disconnecting');
    this.stopRecording();
    this.ws?.close();
    this.ws = null;
    this.setStatus('idle');
  }

  // ============== 音频处理 ==============

  /**
   * 开始录音并转写
   */
  async startRecording(): Promise<void> {
    if (!this.ws || this.status !== 'connected') {
      throw new Error('WebSocket 未连接');
    }

    if (this.isRecording) {
      return;
    }

    try {
      // 获取麦克风权限
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: AUDIO_CONFIG.sampleRate,
          channelCount: AUDIO_CONFIG.channels,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      // 创建 AudioContext 用于处理音频
      this.audioContext = new AudioContext({
        sampleRate: AUDIO_CONFIG.sampleRate,
      });

      // 创建 MediaRecorder
      this.mediaRecorder = new MediaRecorder(this.mediaStream, {
        mimeType: MediaRecorder.isTypeSupported(AUDIO_CONFIG.mimeType)
          ? AUDIO_CONFIG.mimeType
          : 'audio/webm',
      });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.sendAudioData(event.data);
        }
      };

      // 每100ms发送一次音频数据
      this.mediaRecorder.start(100);
      this.isRecording = true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.onErrorCallback?.(new Error(`录音启动失败: ${errorMessage}`));
      throw error;
    }
  }

  /**
   * 停止录音
   */
  stopRecording(): void {
    if (!this.isRecording) {
      return;
    }

    this.mediaRecorder?.stop();
    this.mediaRecorder = null;

    this.mediaStream?.getTracks().forEach((track) => track.stop());
    this.mediaStream = null;

    this.audioContext?.close();
    this.audioContext = null;

    this.isRecording = false;

    // 提交最后的音频缓冲区
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.sendEvent({ type: 'input_audio_buffer.commit' });
    }
  }

  /**
   * 发送音频数据到服务器
   */
  private async sendAudioData(audioBlob: Blob): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    try {
      // 将 Blob 转换为 ArrayBuffer
      const arrayBuffer = await audioBlob.arrayBuffer();

      // 转换为 PCM16 格式（如果需要）
      const pcmData = await this.convertToPcm16(arrayBuffer);

      // Base64 编码
      const base64Audio = this.arrayBufferToBase64(pcmData);

      // 发送音频数据
      const event: ClientEvent = {
        type: 'input_audio_buffer.append',
        audio: base64Audio,
      };

      this.sendEvent(event);
    } catch (error) {
      console.error('发送音频数据失败:', error);
    }
  }

  /**
   * 将音频转换为 PCM16 格式
   */
  private async convertToPcm16(arrayBuffer: ArrayBuffer): Promise<ArrayBuffer> {
    if (!this.audioContext) {
      return arrayBuffer;
    }

    try {
      // 解码音频数据
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

      // 获取声道数据（单声道）
      const channelData = audioBuffer.getChannelData(0);

      // 转换为 PCM16
      const pcm16 = new Int16Array(channelData.length);
      for (let i = 0; i < channelData.length; i++) {
        // 将浮点数 [-1, 1] 转换为 16 位整数 [-32768, 32767]
        const sample = Math.max(-1, Math.min(1, channelData[i]));
        pcm16[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      }

      return pcm16.buffer;
    } catch {
      // 如果解码失败，返回原始数据
      return arrayBuffer;
    }
  }

  /**
   * ArrayBuffer 转 Base64
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  // ============== 事件处理 ==============

  private handleOpen(): void {
    this.setStatus('connected');
    this.reconnectAttempts = 0;

    // 发送会话配置
    this.sendEvent({
      type: 'session.update',
      session: {
        modalities: ['text'],
        input_audio_transcription: {
          model: 'whisper-1',
        },
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 500,
        },
      },
    });
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const data: RealtimeEvent = JSON.parse(event.data);
      this.onEventCallback?.(data);
      this.processEvent(data);
    } catch (error) {
      console.error('解析消息失败:', error);
    }
  }

  private processEvent(event: RealtimeEvent): void {
    switch (event.type) {
      case 'session.created':
        console.log('实时转写会话已创建:', event.session?.id);
        break;

      case 'input_audio_buffer.speech_started':
        // 语音开始检测
        this.currentTranscriptId = `transcript-${Date.now()}`;
        this.accumulatedText = '';
        break;

      case 'response.audio_transcript.delta':
        // 增量文本
        if (event.delta) {
          this.accumulatedText += event.delta;
          this.emitTranscript(this.accumulatedText, false);
        }
        break;

      case 'response.audio_transcript.done':
        // 最终文本
        if (event.item?.content?.[0]?.transcript) {
          this.emitTranscript(event.item.content[0].transcript, true);
        }
        this.currentTranscriptId = null;
        this.accumulatedText = '';
        break;

      case 'error':
        this.onErrorCallback?.(new Error(event.error?.message || '未知错误'));
        break;
    }
  }

  private emitTranscript(text: string, isFinal: boolean): void {
    if (!text.trim()) return;

    const result: TranscriptionResult = {
      id: this.currentTranscriptId || `temp-${Date.now()}`,
      text,
      isFinal,
      timestamp: new Date(),
      language: this.config.language,
    };

    this.onTranscriptionCallback?.(result);
  }

  private handleConnectionError(error: Error): void {
    this.setStatus('error');
    this.onErrorCallback?.(error);

    // 尝试重连
    if (this.config.autoReconnect && this.reconnectAttempts < (this.config.maxReconnectAttempts || 3)) {
      this.reconnectAttempts++;
      setTimeout(() => this.connect(), this.config.reconnectDelay || 1000);
    }
  }

  private handleClose(event: CloseEvent): void {
    if (this.status !== 'disconnecting') {
      // 意外断开
      const reason = event.reason || this.getCloseReason(event.code);
      console.warn(`[Realtime] 连接关闭: ${reason}`);
      // 不再作为错误抛出，仅记录警告
      this.setStatus('idle');
    }
    this.ws = null;
    this.setStatus('idle');
  }

  /**
   * 获取 WebSocket 关闭原因
   */
  private getCloseReason(code: number): string {
    const reasons: Record<number, string> = {
      1000: '正常关闭',
      1001: '端点离开',
      1002: '协议错误',
      1003: '不支持的数据类型',
      1005: '无状态码',
      1006: '连接异常断开',
      1007: '数据类型不一致',
      1008: '策略违规',
      1009: '消息过大',
      1010: '缺少扩展',
      1011: '内部错误',
      1012: '服务重启',
      1013: '稍后重试',
      1015: 'TLS握手失败',
    };
    return reasons[code] || `未知错误码: ${code}`;
  }

  // ============== 工具方法 ==============

  /**
   * 发送事件到服务器
   */
  private sendEvent(event: ClientEvent): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(event));
    }
  }

  /**
   * 清空音频缓冲区
   */
  clearAudioBuffer(): void {
    this.sendEvent({ type: 'input_audio_buffer.clear' });
  }

  /**
   * 检查是否正在录音
   */
  isCurrentlyRecording(): boolean {
    return this.isRecording;
  }
}