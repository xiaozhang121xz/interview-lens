/**
 * Common Types
 *
 * Type definitions for user authentication and API responses
 */

// ===========================================
// User Types
// ===========================================

export interface User {
  id: string; // User ID (UUID)
  phone: string; // Phone number (11 digits, unique identifier)
  nickname: string; // Nickname (default "User + last 4 digits of phone")
  gender?: 'male' | 'female'; // Gender (optional)
  preferences: string[]; // Sports preferences (night run, morning run, cycling, etc.)
  createdAt: string; // Creation time (ISO 8601)
  lastLoginAt: string; // Last login time (ISO 8601)
}

export interface UserCreateInput {
  phone: string;
  nickname?: string;
  gender?: 'male' | 'female';
  preferences?: string[];
}

// ===========================================
// API Request/Response Types
// ===========================================

export interface SendCodeRequest {
  phone: string;
}

export interface VerifyCodeRequest {
  phone: string;
  code: string;
}

export interface LoginResponse {
  user: User;
  token: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

// ===========================================
// Error Codes
// ===========================================

export type ErrorCode =
  | 'INVALID_PHONE'
  | 'INVALID_CODE'
  | 'UNAUTHORIZED'
  | 'USER_NOT_FOUND'
  | 'INTERNAL_ERROR';
