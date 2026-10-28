import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: LucideIcon;
  badge?: string;
  className?: string;
  variant?: 'default' | 'compact';
  compact?: boolean;
  showIcon?: boolean; // 新增：控制是否显示图标
}

export function StatsCard({
  title,
  value,
  description,
  icon: Icon,
  badge,
  className = '',
  variant = 'compact', // 默认改为 compact
  compact = true, // 默认改为 true
  showIcon = false, // 默认不显示图标
}: StatsCardProps) {
  const isCompact = variant === 'compact' || compact;

  // 默认样式（参考首页统计卡片）
  const defaultClassName = isCompact
    ? 'p-4 bg-primary/5 border-primary/10 hover:bg-primary/10 transition-colors'
    : 'p-8 bg-primary/5 border-primary/10 hover:bg-primary/10 transition-colors';

  // 如果有自定义 className，使用自定义样式；否则使用默认样式
  const cardClassName = className || defaultClassName;

  // 根据背景色推断图标颜色
  const getIconColor = () => {
    if (className?.includes('bg-blue-50')) return 'text-blue-600';
    if (className?.includes('bg-green-50')) return 'text-green-600';
    if (className?.includes('bg-purple-50')) return 'text-purple-600';
    if (className?.includes('bg-orange-50')) return 'text-orange-600';
    if (className?.includes('bg-cyan-50')) return 'text-cyan-600';
    if (className?.includes('bg-gray-50')) return 'text-gray-600';
    return 'text-primary';
  };

  // 根据背景色推断图标背景色
  const getIconBgColor = () => {
    if (className?.includes('bg-blue-50')) return 'bg-blue-100';
    if (className?.includes('bg-green-50')) return 'bg-green-100';
    if (className?.includes('bg-purple-50')) return 'bg-purple-100';
    if (className?.includes('bg-orange-50')) return 'bg-orange-100';
    if (className?.includes('bg-cyan-50')) return 'bg-cyan-100';
    if (className?.includes('bg-gray-50')) return 'bg-gray-200';
    return 'bg-primary/10';
  };

  const iconColor = getIconColor();
  const iconBgColor = getIconBgColor();

  return (
    <Card className={cardClassName}>
      <CardContent className="p-0">
        {/* 图标容器 - 仅在非 compact 模式且 showIcon 为 true 时显示 */}
        {!isCompact && Icon && showIcon && (
          <div
            className={`flex items-center justify-center w-12 h-12 ${iconBgColor} rounded-xl mb-4 mx-auto`}
          >
            <Icon className={`w-6 h-6 ${iconColor}`} />
          </div>
        )}

        {/* 数值 */}
        <div
          className={`${isCompact ? 'text-2xl' : 'text-3xl'} font-bold text-gray-900 ${isCompact ? 'mb-1' : 'mb-2'} text-center`}
        >
          {value}
        </div>

        {/* 标题 */}
        <div
          className={`${isCompact ? 'text-xs' : 'text-sm'} text-gray-600 text-center`}
        >
          {title}
          {badge && (
            <Badge variant="secondary" className="ml-2 text-xs">
              {badge}
            </Badge>
          )}
        </div>

        {/* 描述 */}
        {description && !isCompact && (
          <p className="text-xs text-muted-foreground mt-2 text-center">
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
