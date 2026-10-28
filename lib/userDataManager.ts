/**
 * @deprecated 此文件已废弃，请使用 `@/lib/db` 代替
 *
 * 为保持向后兼容性，此文件重新导出 `@/lib/db` 中的数据管理器
 * 新代码请直接使用:
 *   import { userDataManager, LoginUserDataManager } from '@/lib/db';
 */

// 重新导出新的数据管理器
export {
  userDataManager,
  LoginUserDataManager,
  type ExtendedUser,
  type ExtendedUserWithPassword,
  type UserSearchParams,
  type UserSearchResult,
} from './db';
