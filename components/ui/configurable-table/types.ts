/**
 * 可配置表格组件的类型定义文件
 */

// 基础数据类型
export interface BaseRecord {
  id: string | number;
  [key: string]: any;
}

// 排序配置
export interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

// 分页配置
export interface PaginationConfig {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

// 搜索配置
export interface SearchConfig {
  placeholder?: string;
  fields?: string[];
  showAdvancedToggle?: boolean;
  defaultAdvanced?: boolean;
  filters?: FilterConfig[];
}

// 筛选配置
export interface FilterConfig {
  key: string;
  label: string;
  type: 'select' | 'multiSelect' | 'date' | 'dateRange';
  options?: Array<{ label: string; value: any }>;
  placeholder?: string;
  className?: string;
}

// 列配置
export interface ColumnConfig<T extends BaseRecord> {
  key: keyof T;
  title: string;
  width?: string | number;
  sortable?: boolean;
  searchable?: boolean;
  render?: (value: any, record: T, index: number) => React.ReactNode;
  className?: string;
  headerClassName?: string;
  hidden?: boolean;
}

// 确认对话框配置
export type ConfirmConfig<T extends BaseRecord> = {
  title?: string | ((record: T) => string);
  description?: string | ((record: T) => string);
};

// 操作按钮配置
export interface ActionConfig<T extends BaseRecord> {
  key: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick: (record: T, index: number) => void | Promise<void>;
  variant?:
    | 'default'
    | 'destructive'
    | 'outline'
    | 'secondary'
    | 'ghost'
    | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  disabled?: (record: T) => boolean;
  hidden?: (record: T) => boolean;
  confirm?: ConfirmConfig<T>;
  className?: string;
}

// 表格主配置
export interface TableConfig<T extends BaseRecord> {
  // 基础配置
  title?: string; // 可选的表格内部标题
  className?: string;

  // 数据配置
  dataSource: (() => Promise<T[]>) | T[];
  dataKey?: string; // 用于存储数据的key

  // 列配置
  columns: ColumnConfig<T>[];

  // 搜索和筛选
  search?: SearchConfig;

  // 操作按钮
  actions?: ActionConfig<T>[];

  // 分页配置
  pagination?: {
    enabled?: boolean;
    pageSize?: number;
    showSizeChanger?: boolean;
    pageSizeOptions?: number[];
  };

  // 其他功能
  selection?: {
    enabled?: boolean;
    type?: 'checkbox' | 'radio';
    getRowKey?: (record: T) => string | number;
  };

  // 样式配置
  size?: 'small' | 'middle' | 'large';
  bordered?: boolean;
  striped?: boolean;
  hover?: boolean;

  // 加载状态
  loading?: boolean;

  // 空状态
  empty?: {
    description?: string;
    image?: string;
  };

  // 回调函数
  onDataChange?: (data: T[]) => void;
  onSelectionChange?: (
    selectedRows: T[],
    selectedRowKeys: (string | number)[]
  ) => void;
  onRowClick?: (record: T, index: number, event: React.MouseEvent) => void;
}

// 表格状态
export interface TableState<T extends BaseRecord> {
  data: T[];
  loading: boolean;
  pagination: PaginationConfig;
  searchValue: string;
  filters: Record<string, any>;
  sort: SortConfig | null;
  selectedRows: T[];
  selectedRowKeys: (string | number)[];
}

// 组件 Props
export interface ConfigurableTableProps<T extends BaseRecord> {
  config: TableConfig<T>;
  className?: string;
  // 外部分页数据（用于使用自定义分页系统）
  externalPagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  };
  onDataUpdate?: (data: T[]) => void;
}
