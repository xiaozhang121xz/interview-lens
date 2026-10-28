/**
 * API Middleware
 *
 * Provides middleware functions for Next.js API routes
 * Handles error responses, authentication, and standard API response format
 */

import { NextApiHandler, NextApiResponse } from 'next';

/**
 * Standard API response format
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

/**
 * API error class
 */
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Create success response
 */
export function createSuccessResponse<T>(
  data: T,
  message?: string
): ApiResponse<T> {
  return {
    success: true,
    data,
    ...(message && { message }),
  };
}

/**
 * Create error response
 */
export function createErrorResponse(
  statusCode: number,
  message: string
): ApiResponse {
  return {
    success: false,
    error: message,
  };
}

/**
 * Send API response helper
 */
export function sendApiResponse<T>(
  res: NextApiResponse,
  response: ApiResponse<T>,
  statusCode: number = 200
): void {
  res.status(statusCode).json(response);
}

/**
 * API handler wrapper with error handling
 * Wraps API handlers with try-catch and standard error response format
 *
 * @param handler - The API handler function to wrap
 * @returns Wrapped API handler with error handling
 */
export function withApiHandler<T = any>(
  handler: (req: any, res: NextApiResponse) => Promise<ApiResponse<T>>
): NextApiHandler {
  return async (req, res) => {
    try {
      // Call the actual handler
      const result = await handler(req, res);

      // Send success response
      sendApiResponse(res, result);
    } catch (error) {
      console.error('[API Error]', error);

      // Handle different error types
      if (error instanceof ApiError) {
        sendApiResponse(
          res,
          createErrorResponse(error.statusCode, error.message),
          error.statusCode
        );
      } else if (error instanceof Error) {
        // Known error with message
        sendApiResponse(res, createErrorResponse(400, error.message), 400);
      } else {
        // Unknown error
        sendApiResponse(
          res,
          createErrorResponse(500, 'Internal server error'),
          500
        );
      }
    }
  };
}

/**
 * Authenticated API handler wrapper
 * Wraps API handlers with JWT authentication check
 *
 * NOTE: In POC phase, authentication is optional and doesn't enforce permissions
 * JWT token is only used to maintain login state
 *
 * @param handler - The API handler function to wrap
 * @returns Wrapped API handler with optional authentication
 */
export function withAuthApiHandler<T = any>(
  handler: (
    req: any,
    res: NextApiResponse,
    userId: string | null
  ) => Promise<ApiResponse<T>>
): NextApiHandler {
  return async (req, res) => {
    try {
      // Extract userId from Authorization header (POC simplified)
      // Format: "Bearer {base64_encoded_user_id}"
      const authHeader = req.headers.authorization;
      let userId: string | null = null;

      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const token = authHeader.substring(7);
          // Decode base64 token (POC simplified approach)
          const decoded = Buffer.from(token, 'base64').toString('utf-8');
          const parsed = JSON.parse(decoded);
          userId = parsed.userId || null;
        } catch (error) {
          // Invalid token format, continue with userId = null
          console.warn('[Auth] Invalid token format');
        }
      }

      // Call the actual handler with userId (may be null in POC phase)
      const result = await handler(req, res, userId);

      // Send success response
      sendApiResponse(res, result);
    } catch (error) {
      console.error('[API Error]', error);

      // Handle different error types
      if (error instanceof ApiError) {
        sendApiResponse(
          res,
          createErrorResponse(error.statusCode, error.message),
          error.statusCode
        );
      } else if (error instanceof Error) {
        // Known error with message
        sendApiResponse(res, createErrorResponse(400, error.message), 400);
      } else {
        // Unknown error
        sendApiResponse(
          res,
          createErrorResponse(500, 'Internal server error'),
          500
        );
      }
    }
  };
}

/**
 * HTTP method validation middleware
 * Validates request HTTP method
 */
export function withMethodValidation(allowedMethods: string[]) {
  return function (handler: NextApiHandler): NextApiHandler {
    return async (req, res) => {
      if (!allowedMethods.includes(req.method || '')) {
        return sendApiResponse(
          res,
          createErrorResponse(
            405,
            `Method ${req.method} not allowed. Use ${allowedMethods.join(', ')}`
          ),
          405
        );
      }
      return handler(req, res);
    };
  };
}

/**
 * Request validation middleware
 * Validates required request body fields
 */
export function withRequestBodyValidation(requiredFields: string[]) {
  return function (handler: NextApiHandler): NextApiHandler {
    return async (req, res) => {
      if (
        req.method === 'POST' ||
        req.method === 'PUT' ||
        req.method === 'PATCH'
      ) {
        const body = req.body;

        for (const field of requiredFields) {
          if (!body || body[field] === undefined || body[field] === null) {
            return sendApiResponse(
              res,
              createErrorResponse(400, `Missing required field: ${field}`),
              400
            );
          }
        }
      }

      return handler(req, res);
    };
  };
}

/**
 * Query parameter validation middleware
 * Validates required query parameters
 */
export function withQueryValidation(requiredParams: string[]) {
  return function (handler: NextApiHandler): NextApiHandler {
    return async (req, res) => {
      const query = req.query;

      for (const param of requiredParams) {
        if (!query || query[param] === undefined || query[param] === null) {
          return sendApiResponse(
            res,
            createErrorResponse(
              400,
              `Missing required query parameter: ${param}`
            ),
            400
          );
        }
      }

      return handler(req, res);
    };
  };
}

/**
 * Pagination parameter parser
 * Extracts and validates page and pageSize from query
 */
export function getPaginationParams(req: any): {
  page: number;
  pageSize: number;
} {
  const page = parseInt(req.query.page as string, 10) || 1;
  const pageSize = parseInt(req.query.pageSize as string, 10) || 10;

  if (page < 1 || pageSize < 1 || pageSize > 100) {
    throw new ApiError(
      400,
      'Invalid pagination parameters. Page >= 1, pageSize between 1 and 100'
    );
  }

  return { page, pageSize };
}

/**
 * Search parameter parser
 * Extracts search keyword from query
 */
export function getSearchKeyword(req: any): string | undefined {
  const keyword = req.query.keyword as string;
  return keyword?.trim();
}

/**
 * Filter parameter parser
 * Extracts filter values from query
 */
export function getFilterParams(
  req: any,
  allowedFilters: string[]
): Record<string, string> {
  const filters: Record<string, string> = {};

  for (const filter of allowedFilters) {
    const value = req.query[filter];
    if (value !== undefined && value !== null && value !== '') {
      filters[filter] = value as string;
    }
  }

  return filters;
}
