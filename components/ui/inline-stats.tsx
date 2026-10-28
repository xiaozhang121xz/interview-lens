import { Badge } from '@/components/ui/badge';
import { LucideIcon } from 'lucide-react';
import React from 'react';

interface InlineStatsProps {
  stats: Array<{
    label: string;
    value: number | string;
    icon?: LucideIcon;
    variant?: 'default' | 'secondary' | 'outline' | 'destructive';
  }>;
  className?: string;
  compact?: boolean;
  showIcons?: boolean;
}

export function InlineStats({
  stats,
  className = '',
  compact = false,
  showIcons = true,
}: InlineStatsProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {stats.map((stat, index) => (
        <div key={index} className="flex items-center gap-1.5">
          {showIcons && stat.icon && (
            <stat.icon className="w-3.5 h-3.5 text-gray-500" />
          )}
          <Badge
            variant={stat.variant || 'secondary'}
            className={`${compact ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1'} whitespace-nowrap`}
          >
            {stat.value} {stat.label}
          </Badge>
        </div>
      ))}
    </div>
  );
}

// 针对组件管理页面的专门统计组件
interface ComponentStatsProps {
  totalComponents: number;
  totalCategories: number;
  totalUsage: number;
  popularComponents: number;
  className?: string;
}

export function ComponentStats({
  totalComponents,
  totalCategories,
  totalUsage,
  popularComponents,
  className = '',
}: ComponentStatsProps) {
  const stats = [
    {
      label: '个组件',
      value: totalComponents,
      variant: 'default' as const,
    },
    {
      label: '个分类',
      value: totalCategories,
      variant: 'outline' as const,
    },
    {
      label: '次使用',
      value: totalUsage,
      variant: 'secondary' as const,
    },
    {
      label: '个常用',
      value: popularComponents,
      variant: 'outline' as const,
    },
  ];

  return <InlineStats stats={stats} compact={true} className={className} />;
}
