// 主组件
export { default as ConfigurableTable } from './ConfigurableTable';

// 子组件
export { SearchFilters } from './SearchFilters';
export { ActionButtons } from './ActionButtons';

// 类型定义
export type {
  BaseRecord,
  SortConfig,
  PaginationConfig,
  SearchConfig,
  FilterConfig,
  ColumnConfig,
  ActionConfig,
  TableConfig,
  TableState,
  ConfigurableTableProps,
} from './types';

// 配置和工具
export {
  createDefaultTableConfig,
  USER_MANAGEMENT_CONFIG,
  DEFAULT_PAGINATION,
  DEFAULT_SEARCH,
  TABLE_SIZE_CONFIG,
} from './config';

// Hooks
export { useTableData } from './hooks/useTableData';
