import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';
import React from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  leftContent?: React.ReactNode;
  rightContent?: React.ReactNode;
  className?: string;
  variant?: 'default' | 'minimal' | 'card' | 'gradient';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  actions?: React.ReactNode;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  badge?: string;
}

const variants = {
  default: {
    container:
      'p-6 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl',
    title: 'text-3xl font-semibold text-gray-900',
    description: 'text-base text-gray-600',
    icon: 'w-8 h-8 text-primary',
  },
  minimal: {
    container: 'pb-4 mb-6 border-b border-gray-200',
    title: 'text-2xl font-semibold text-gray-900',
    description: 'text-sm text-gray-600',
    icon: 'w-6 h-6 text-primary',
  },
  card: {
    container:
      'p-4 md:p-6 bg-gradient-to-br from-blue-50/90 via-blue-100/50 to-transparent backdrop-blur-sm border border-blue-200/50 rounded-xl shadow-sm',
    title: 'text-xl md:text-2xl lg:text-3xl font-semibold text-gray-900',
    description: 'text-sm md:text-base text-gray-600',
    icon: 'w-5 h-5 md:w-6 md:h-6 lg:w-8 lg:h-8 text-primary',
  },
  compact: {
    container:
      'px-4 py-3 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-lg',
    title: 'text-xl font-semibold text-gray-900',
    description: 'text-sm text-gray-600 max-w-2xl',
    icon: 'w-5 h-5 text-primary',
  },
  inline: {
    container:
      'flex items-center justify-between px-0 py-2 border-b border-gray-200/80',
    title: 'text-lg font-semibold text-gray-900',
    description: 'text-sm text-gray-600 inline ml-2',
    icon: 'w-4 h-4 text-primary',
  },
  gradient: {
    container:
      'p-6 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl',
    title: 'text-3xl font-bold text-gray-900',
    description: 'text-base text-gray-700',
    icon: 'w-10 h-10 text-primary',
  },
};

const sizes = {
  sm: {
    container: 'p-3 md:p-4',
    title: 'text-lg md:text-xl font-semibold',
    description: 'text-xs md:text-sm',
    icon: 'w-4 h-4 md:w-5 md:h-5',
  },
  md: {
    container: 'p-4 md:p-6',
    title: 'text-xl md:text-2xl font-semibold',
    description: 'text-sm md:text-base',
    icon: 'w-5 h-5 md:w-6 md:h-6',
  },
  lg: {
    container: 'p-4 md:p-6',
    title: 'text-xl md:text-2xl lg:text-3xl font-semibold',
    description: 'text-sm md:text-base',
    icon: 'w-6 h-6 md:w-7 md:h-7 lg:w-8 lg:h-8',
  },
  xl: {
    container: 'p-6 md:p-8',
    title: 'text-2xl md:text-3xl lg:text-4xl font-bold',
    description: 'text-base md:text-lg',
    icon: 'w-8 h-8 md:w-9 md:h-9 lg:w-10 lg:h-10',
  },
};

export function PageHeader({
  title,
  description,
  icon: Icon,
  leftContent,
  rightContent,
  className = '',
  variant = 'card',
  size = 'lg',
  actions,
  breadcrumbs,
  badge,
}: PageHeaderProps) {
  const variantStyles = variants[variant];
  const sizeStyles = sizes[size];

  return (
    <div
      className={cn(variantStyles.container, sizeStyles.container, className)}
    >
      {/* Left Content (e.g., Return Button) - Above title */}
      {leftContent && (
        <div className="mb-2 md:mb-4">
          {leftContent}
        </div>
      )}

      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center space-x-2 text-xs md:text-sm text-gray-500 mb-3 md:mb-4 overflow-x-auto">
          {breadcrumbs.map((item, index) => (
            <React.Fragment key={index}>
              {index > 0 && <span>/</span>}
              {item.href ? (
                <a
                  href={item.href}
                  className="hover:text-primary transition-colors whitespace-nowrap"
                >
                  {item.label}
                </a>
              ) : (
                <span
                  className={cn(
                    'whitespace-nowrap',
                    index === breadcrumbs.length - 1
                      ? 'text-gray-900 font-medium'
                      : ''
                  )}
                >
                  {item.label}
                </span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}

      {/* 响应式布局：大屏幕横向排列，小屏幕纵向排列 */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 md:gap-4">
        {/* 左侧：标题和描述 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 md:gap-3 mb-1 md:mb-2">
            {Icon && (
              <Icon className={cn(variantStyles.icon, sizeStyles.icon, 'shrink-0')} />
            )}
            <h1
              className={cn(
                variantStyles.title,
                sizeStyles.title,
                'flex items-center gap-2 md:gap-3 truncate'
              )}
            >
              <span className="truncate">{title}</span>
              {badge && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary shrink-0">
                  {badge}
                </span>
              )}
            </h1>
          </div>
          {description && (
            <p
              className={cn(
                variantStyles.description,
                sizeStyles.description,
                'max-w-3xl'
              )}
            >
              {description}
            </p>
          )}
        </div>

        {/* 右侧：操作按钮区域 */}
        {(actions || rightContent) && (
          <div className="flex items-center gap-2 md:gap-4 shrink-0 overflow-x-auto pb-1 md:pb-0 -mx-1 px-1 md:mx-0 md:px-0">
            {actions}
            {rightContent}
          </div>
        )}
      </div>
    </div>
  );
}