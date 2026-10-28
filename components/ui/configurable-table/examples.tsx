import {
  ConfigurableTable,
  createDefaultTableConfig,
} from '@/components/ui/configurable-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, Eye, Trash2, UserPlus } from 'lucide-react';

// 示例1: 基础产品管理表格
export function ProductManagementExample() {
  const productConfig = createDefaultTableConfig({
    dataSource: [
      {
        id: 1,
        name: 'iPhone 15',
        category: '手机',
        price: 7999,
        stock: 50,
        status: 'active',
      },
      {
        id: 2,
        name: 'MacBook Pro',
        category: '电脑',
        price: 16999,
        stock: 30,
        status: 'active',
      },
      {
        id: 3,
        name: 'AirPods Pro',
        category: '耳机',
        price: 1999,
        stock: 0,
        status: 'inactive',
      },
    ],
    columns: [
      { key: 'name', title: '产品名称', sortable: true },
      { key: 'category', title: '分类' },
      {
        key: 'price',
        title: '价格',
        sortable: true,
        render: (value) => `¥${value.toLocaleString()}`,
      },
      {
        key: 'stock',
        title: '库存',
        render: (value) => (
          <Badge variant={value > 0 ? 'default' : 'destructive'}>
            {value > 0 ? `${value} 件` : '缺货'}
          </Badge>
        ),
      },
      {
        key: 'status',
        title: '状态',
        render: (value) => (
          <Badge variant={value === 'active' ? 'default' : 'secondary'}>
            {value === 'active' ? '上架' : '下架'}
          </Badge>
        ),
      },
    ],
    actions: [
      {
        key: 'add',
        label: '新增产品',
        icon: UserPlus,
        onClick: () => console.log('新增产品'),
      },
      {
        key: 'view',
        label: '查看',
        icon: Eye,
        onClick: (product) => console.log('查看产品:', product),
      },
      {
        key: 'edit',
        label: '编辑',
        icon: Edit,
        onClick: (product) => console.log('编辑产品:', product),
      },
      {
        key: 'delete',
        label: '删除',
        icon: Trash2,
        variant: 'destructive',
        onClick: (product) => console.log('删除产品:', product),
        confirm: {
          title: '确认删除',
          description: '删除后不可恢复，请确认是否继续？',
        },
      },
    ],
  });

  return <ConfigurableTable config={productConfig} />;
}

// 示例2: 异步数据订单管理表格
export function OrderManagementExample() {
  const orderConfig = createDefaultTableConfig({
    dataSource: async () => {
      // 模拟API调用
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return [
        {
          id: 'ORD-001',
          customer: '张三',
          amount: 2599,
          status: 'pending',
          date: '2024-01-15',
        },
        {
          id: 'ORD-002',
          customer: '李四',
          amount: 8999,
          status: 'completed',
          date: '2024-01-14',
        },
        {
          id: 'ORD-003',
          customer: '王五',
          amount: 1299,
          status: 'cancelled',
          date: '2024-01-13',
        },
      ];
    },
    columns: [
      { key: 'id', title: '订单号' },
      { key: 'customer', title: '客户' },
      {
        key: 'amount',
        title: '金额',
        sortable: true,
        render: (value) => `¥${value.toLocaleString()}`,
      },
      {
        key: 'status',
        title: '状态',
        render: (value) => {
          const statusMap = {
            pending: { label: '待处理', variant: 'secondary' as const },
            completed: { label: '已完成', variant: 'default' as const },
            cancelled: { label: '已取消', variant: 'destructive' as const },
          };
          const config = statusMap[value as keyof typeof statusMap];
          return <Badge variant={config.variant}>{config.label}</Badge>;
        },
      },
      {
        key: 'date',
        title: '日期',
        sortable: true,
      },
    ],
    search: {
      placeholder: '搜索订单号、客户...',
      fields: ['id', 'customer'],
      filters: [
        {
          key: 'status',
          label: '状态',
          type: 'select',
          options: [
            { label: '全部', value: 'all' },
            { label: '待处理', value: 'pending' },
            { label: '已完成', value: 'completed' },
            { label: '已取消', value: 'cancelled' },
          ],
        },
      ],
    },
    pagination: {
      enabled: true,
      pageSize: 5,
    },
  });

  return <ConfigurableTable config={orderConfig} />;
}

// 示例3: 简单的数据展示表格
export function SimpleDataExample() {
  const simpleConfig = createDefaultTableConfig({
    dataSource: [
      { id: 1, month: '2024-01', revenue: 125000, users: 1200, growth: 15.2 },
      { id: 2, month: '2024-02', revenue: 138000, users: 1350, growth: 10.4 },
      { id: 3, month: '2024-03', revenue: 142000, users: 1480, growth: 2.9 },
    ],
    columns: [
      { key: 'month', title: '月份' },
      {
        key: 'revenue',
        title: '营收',
        sortable: true,
        render: (value) => `¥${(value / 1000).toFixed(1)}K`,
      },
      { key: 'users', title: '用户数', sortable: true },
      {
        key: 'growth',
        title: '增长率',
        sortable: true,
        render: (value) => (
          <span className={value > 0 ? 'text-green-600' : 'text-red-600'}>
            {value > 0 ? '+' : ''}
            {value}%
          </span>
        ),
      },
    ],
    actions: [], // 无操作按钮
    pagination: {
      enabled: false, // 禁用分页
    },
  });

  return <ConfigurableTable config={simpleConfig} />;
}

// 使用示例
export default function ExamplePage() {
  return (
    <div className="space-y-8 p-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">产品管理示例</h2>
        <ProductManagementExample />
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-4">订单管理示例</h2>
        <OrderManagementExample />
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-4">简单数据示例</h2>
        <SimpleDataExample />
      </div>
    </div>
  );
}
