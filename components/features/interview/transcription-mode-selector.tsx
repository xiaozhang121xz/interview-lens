/**
 * 转写模式选择器组件（已简化）
 *
 * 模式选择功能已移除，默认使用 Web Speech API
 * 保留组件导出以保持向后兼容
 */

'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Mic } from 'lucide-react';

// ============== 转写模式选择器（已弃用） ==============

interface TranscriptionModeSelectorProps {
  /** 是否禁用 */
  disabled?: boolean;
  /** 紧凑模式 */
  compact?: boolean;
}

/**
 * @deprecated 模式选择功能已移除，默认使用 Web Speech API
 */
export function TranscriptionModeSelector({
  disabled = false,
  compact = false,
}: TranscriptionModeSelectorProps) {
  // 模式选择已移除，直接显示当前模式
  return (
    <Badge variant="secondary" className="gap-1">
      <Mic className="h-3 w-3" />
      {!compact && 'Web Speech'}
    </Badge>
  );
}

// ============== 模型选择器（已弃用） ==============

interface TranscriptionModelSelectorProps {
  /** 是否禁用 */
  disabled?: boolean;
}

/**
 * @deprecated 实时 API 模型选择功能已移除
 */
export function TranscriptionModelSelector({
  disabled = false,
}: TranscriptionModelSelectorProps) {
  // 模型选择已移除
  return null;
}

// ============== 转写控制面板（已弃用） ==============

interface TranscriptionControlPanelProps {
  /** 是否正在录音 */
  isRecording?: boolean;
  /** 连接状态 */
  status?: string;
  /** 开始录音回调 */
  onStartRecording?: () => void;
  /** 停止录音回调 */
  onStopRecording?: () => void;
  /** 连接回调 */
  onConnect?: () => void;
  /** 断开连接回调 */
  onDisconnect?: () => void;
}

/**
 * @deprecated 控制面板已简化，请直接使用 TranscriptionPanel
 */
export function TranscriptionControlPanel({
  isRecording = false,
  status = 'idle',
  onStartRecording,
  onStopRecording,
  onConnect,
  onDisconnect,
}: TranscriptionControlPanelProps) {
  // 控制面板已移除，返回 null
  return null;
}

// ============== 导出 ==============

export default TranscriptionModeSelector;