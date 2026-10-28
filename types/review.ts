// ==================== 评价类型定义 ====================

/**
 * 评价信息
 */
export interface Review {
  id: string;
  activityId: string;
  userId: string;
  userNickname?: string; // 用户昵称（冗余字段）
  rating: number; // 评分（1-5）
  comment: string; // 评论内容（1-500字符）
  createdAt: string;
}

/**
 * 创建评价请求体
 */
export interface CreateReviewBody {
  rating: number; // 评分（1-5）
  comment: string; // 评论内容（1-500字符）
}

/**
 * 评价列表响应
 */
export interface ReviewListResponse {
  reviews: Review[];
  averageRating: number; // 平均评分（保留1位小数）
  total: number;
  page: number;
  limit: number;
}
