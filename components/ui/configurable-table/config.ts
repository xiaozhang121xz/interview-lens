import { TableConfig, BaseRecord } from './types';

// 默认分页配置
export const DEFAULT_PAGINATION = {
  page: 1,
  pageSize: 10,
  pageSizeOptions: [5, 10, 20, 50],
};

// 默认搜索配置
export const DEFAULT_SEARCH = {
  placeholder: '搜索...',
  fields: ['name', 'title', 'description'],
  showAdvancedToggle: false,
  defaultAdvanced: false,
};

// 默认表格配置
export function createDefaultTableConfig<T extends BaseRecord>(
  overrides: Partial<TableConfig<T>> = {}
): TableConfig<T> {
  return {
    dataSource: [],
    columns: [],
    pagination: {
      enabled: true,
      pageSize: 10,
      showSizeChanger: false,
      pageSizeOptions: [5, 10, 20, 50],
    },
    search: DEFAULT_SEARCH,
    size: 'middle',
    bordered: false,
    striped: false,
    hover: true,
    loading: false,
    selection: {
      enabled: false,
      type: 'checkbox',
    },
    ...overrides,
  };
}

// 用户管理预设配置
export const USER_MANAGEMENT_CONFIG = createDefaultTableConfig({
  search: {
    placeholder: '搜索用户名、邮箱、部门...',
    fields: ['username', 'displayName', 'email', 'department'],
    showAdvancedToggle: false,
    defaultAdvanced: true,
    filters: [
      {
        key: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部', value: 'all' },
          { label: '正常', value: 'active' },
          { label: '未激活', value: 'inactive' },
          { label: '已暂停', value: 'suspended' },
        ],
      },
      {
        key: 'department',
        label: '部门',
        type: 'select',
        options: [
          { label: '全部', value: 'all' },
          { label: '技术部', value: 'tech' },
          { label: '产品部', value: 'product' },
          { label: '设计部', value: 'design' },
          { label: '运营部', value: 'operations' },
        ],
      },
    ],
  },
});

// 表格尺寸配置
export const TABLE_SIZE_CONFIG = {
  small: {
    padding: 'px-2 py-1',
    fontSize: 'text-sm',
    height: 'h-8',
  },
  middle: {
    padding: 'px-3 py-2',
    fontSize: 'text-sm',
    height: 'h-10',
  },
  large: {
    padding: 'px-4 py-3',
    fontSize: 'text-base',
    height: 'h-12',
  },
};
