/**
 * Zustand Stores 统一导出
 *
 * 目录结构:
 * - core/ 核心状态管理（用户、UI）
 * - features/ 功能模块状态管理
 */

// Core Stores
export { useUserStore } from './core/useUserStore';
export { useUIStore } from './core/useUIStore';

// Feature Stores
export { useAIEditorStore } from './features/aiEditorStore';
export { default as useUserManagementStore } from './features/userManagementStore';
export { useFactorialCalculatorStore, usePrimeCheckerStore } from './features/math-tools-store';
