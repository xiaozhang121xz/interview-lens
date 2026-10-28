# 可配置表格组件 (ConfigurableTable)

一个高度可配置的表格组件，专为管理界面设计，支持搜索、筛选、排序、分页、操作按钮等功能。

## 特性

- 🎯 **配置驱动**: 通过配置对象快速定制表格行为
- 🔍 **搜索筛选**: 内置搜索和多种筛选器支持
- 📊 **统计卡片**: 自动生成数据统计卡片
- 🎛️ **操作按钮**: 可配置的操作按钮，支持确认对话框
- 📱 **响应式**: 移动端友好的响应式设计
- ♿ **无障碍**: 完整的键盘导航和屏幕阅读器支持
- 🎨 **主题集成**: 与 shadcn/ui 设计系统集成

## 快速开始

### 基础用法

```tsx
import {
  ConfigurableTable,
  createDefaultTableConfig,
} from '@/components/ui/configurable-table';

const config = createDefaultTableConfig({
  title: '用户管理',
  dataSource: [
    { id: 1, name: '张三', email: 'zhangsan@example.com', status: 'active' },
    { id: 2, name: '李四', email: 'lisi@example.com', status: 'inactive' },
  ],
  columns: [
    { key: 'name', title: '姓名', sortable: true },
    { key: 'email', title: '邮箱' },
    { key: 'status', title: '状态' },
  ],
});

function MyComponent() {
  return <ConfigurableTable config={config} />;
}
```

## 配置选项

### TableConfig

完整的表格配置对象：

```tsx
interface TableConfig<T extends BaseRecord> {
  // 基础配置
  title: string; // 表格标题
  description?: string; // 表格描述
  className?: string; // 自定义类名

  // 数据配置
  dataSource: (() => Promise<T[]>) | T[]; // 数据源（函数或数组）
  dataKey?: string; // 存储数据的key

  // 列配置
  columns: ColumnConfig<T>[]; // 列配置数组

  // 搜索和筛选
  search?: SearchConfig; // 搜索配置

  // 操作按钮
  actions?: ActionConfig<T>[]; // 操作按钮配置

  // 统计卡片
  statsCards?: StatsCardConfig[]; // 统计卡片配置

  // 分页配置
  pagination?: {
    enabled?: boolean; // 是否启用分页
    pageSize?: number; // 每页条数
    showSizeChanger?: boolean; // 显示页面大小选择器
    pageSizeOptions?: number[]; // 页面大小选项
  };

  // 功能开关
  selection?: {
    enabled?: boolean; // 是否启用选择
    type?: 'checkbox' | 'radio'; // 选择类型
  };

  // 样式配置
  size?: 'small' | 'middle' | 'large'; // 表格尺寸
  bordered?: boolean; // 是否显示边框
  striped?: boolean; // 是否显示斑马纹
  hover?: boolean; // 是否显示悬停效果

  // 状态配置
  loading?: boolean; // 加载状态
  empty?: {
    // 空状态配置
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
```

### 列配置 (ColumnConfig)

```tsx
interface ColumnConfig<T extends BaseRecord> {
  key: keyof T; // 数据字段
  title: string; // 列标题
  width?: string | number; // 列宽度
  sortable?: boolean; // 是否可排序
  searchable?: boolean; // 是否可搜索
  render?: (value: any, record: T, index: number) => React.ReactNode; // 自定义渲染
  className?: string; // 单元格类名
  headerClassName?: string; // 表头类名
  hidden?: boolean; // 是否隐藏
}
```

### 搜索配置 (SearchConfig)

```tsx
interface SearchConfig {
  placeholder?: string; // 搜索框占位符
  fields?: string[]; // 搜索字段
  showAdvancedToggle?: boolean; // 显示高级搜索切换
  defaultAdvanced?: boolean; // 默认展开高级搜索
  filters?: FilterConfig[]; // 筛选器配置
}
```

### 操作按钮配置 (ActionConfig)

```tsx
interface ActionConfig<T extends BaseRecord> {
  key: string; // 唯一标识
  label: string | ((record: T) => string); // 按钮标签
  icon?: React.ComponentType<{ className?: string }>; // 图标
  onClick: (record: T, index: number) => void | Promise<void>; // 点击回调
  variant?:
    | 'default'
    | 'destructive'
    | 'outline'
    | 'secondary'
    | 'ghost'
    | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  disabled?: (record: T) => boolean; // 禁用条件
  hidden?: (record: T) => boolean; // 隐藏条件
  confirm?: {
    // 确认对话框
    title?: string;
    description?: string;
  };
  className?: string; // 自定义类名
}
```

## 高级用法

### 异步数据源

```tsx
const config = createDefaultTableConfig({
  title: '产品列表',
  dataSource: async () => {
    const response = await fetch('/api/products');
    return response.json();
  },
  columns: [
    { key: 'name', title: '产品名称' },
    { key: 'price', title: '价格' },
  ],
});
```

### 自定义列渲染

```tsx
const columns = [
  {
    key: 'status',
    title: '状态',
    render: (value) => (
      <Badge variant={value === 'active' ? 'default' : 'secondary'}>
        {value === 'active' ? '启用' : '禁用'}
      </Badge>
    ),
  },
  {
    key: 'avatar',
    title: '头像',
    render: (value) => <Avatar src={value} size="sm" />,
  },
];
```

### 操作按钮示例

```tsx
const actions = [
  {
    key: 'view',
    label: '查看',
    icon: Eye,
    onClick: (record) => {
      navigate(`/users/${record.id}`);
    },
  },
  {
    key: 'edit',
    label: '编辑',
    icon: Edit,
    onClick: (record) => {
      setEditingUser(record);
      setShowEditDialog(true);
    },
  },
  {
    key: 'delete',
    label: '删除',
    icon: Trash,
    variant: 'destructive',
    onClick: async (record) => {
      await deleteUser(record.id);
      refreshData();
    },
    confirm: {
      title: '确认删除',
      description: '此操作不可撤销，请确认是否继续？',
    },
    disabled: (record) => record.isAdmin, // 管理员不能删除
  },
];
```

### 统计卡片配置

```tsx
const statsCards = [
  {
    key: 'total',
    title: '总用户数',
    getValue: (data) => data.length,
    color: 'blue',
  },
  {
    key: 'active',
    title: '活跃用户',
    getValue: (data) => data.filter((user) => user.status === 'active').length,
    color: 'green',
  },
  {
    key: 'growth',
    title: '增长率',
    getValue: (data) => {
      const thisMonth = data.filter(
        (user) => new Date(user.createdAt).getMonth() === new Date().getMonth()
      ).length;
      const lastMonth = data.filter(
        (user) =>
          new Date(user.createdAt).getMonth() === new Date().getMonth() - 1
      ).length;
      return lastMonth > 0
        ? `${Math.round(((thisMonth - lastMonth) / lastMonth) * 100)}%`
        : '0%';
    },
    color: 'cyan',
  },
];
```

## 最佳实践

1. **类型安全**: 使用 TypeScript 确保类型安全
2. **性能优化**: 大数据集时使用服务端分页和搜索
3. **无障碍**: 确保所有交互元素都有合适的 ARIA 标签
4. **错误处理**: 在数据源函数中添加错误处理
5. **加载状态**: 使用 loading 属性提供用户反馈

## 扩展

组件设计为可扩展的，你可以：

- 创建自定义的筛选器类型
- 添加新的操作按钮样式
- 实现自定义的统计卡片
- 扩展主题颜色

## 示例项目

查看 `page-new.tsx` 文件，了解完整的用户管理页面实现示例。
