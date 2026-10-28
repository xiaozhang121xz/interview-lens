/**
 * AI Chat系统 - 数据类型定义
 *
 * 该文件定义了所有与对话相关的TypeScript类型
 * 确保全链路类型安全
 */

/**
 * 消息角色类型
 */
export type MessageRole = 'user' | 'assistant' | 'system';

/**
 * 单条消息
 */
export interface Message {
  id: string; // 消息ID（UUID）
  role: MessageRole; // 消息角色
  content: string; // 消息内容
  tokens?: number; // Token数量（可选）
  cost?: number; // 成本（可选）
  timestamp: string; // 时间戳（ISO 8601）
}

/**
 * 对话/会话
 */
export interface Conversation {
  id: string; // 唯一ID（UUID）
  userId?: string; // 用户ID（可选，POC阶段为null）
  title: string; // 对话标题
  model: string; // 使用的模型（glm-4）
  messages: Message[]; // 消息列表
  tags: string[]; // 标签（可选）
  createdAt: string; // 创建时间（ISO 8601）
  updatedAt: string; // 更新时间（ISO 8601）
}

/**
 * JSON文件存储格式
 */
export interface ConversationsData {
  conversations: Conversation[];
  metadata: {
    totalConversations: number;
    lastBackup: string;
  };
}

/**
 * API请求类型
 */

// 聊天请求
export interface ChatRequest {
  messages: Array<{
    role: MessageRole;
    content: string;
  }>;
  conversationId?: string; // 可选，用于保存对话历史
  stream?: boolean; // 默认true，是否使用流式响应
}

// 聊天流式响应块
export interface ChatStreamChunk {
  content: string; // 增量内容片段
}

// 创建对话请求
export interface CreateConversationRequest {
  title?: string; // 可选，默认"新对话"
  model?: string; // 可选，默认"glm-4"
}

// 更新对话请求
export interface UpdateConversationRequest {
  title?: string; // 更新标题
  tags?: string[]; // 更新标签
}

// 导出请求
export interface ExportRequest {
  conversationId: string; // 对话ID
  format: 'markdown' | 'json'; // 导出格式
}

/**
 * API响应类型
 */

// 通用成功响应
export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
}

// 通用错误响应
export interface ApiErrorResponse {
  success: false;
  error: string;
}

// 搜索响应
export interface SearchResponse {
  query: string;
  count: number;
  results: Conversation[];
}
