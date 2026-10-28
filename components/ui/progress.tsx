/**
 * Progress 组件
 * 基于 shadcn/ui 设计系统和 THEME.md 设计风格指南
 */

import * as React from 'react';
import * as ProgressPrimitive from '@radix-ui/react-progress';
import { cn } from '@/lib/utils';

interface ProgressProps extends React.ComponentPropsWithoutRef<
  typeof ProgressPrimitive.Root
> {
  value?: number;
  max?: number;
  indicatorClassName?: string;
}

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  ProgressProps
>(({ className, value, max = 100, indicatorClassName, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn(
      // THEME.md 标准样式 - 必须遵循
      'relative h-4 w-full overflow-hidden rounded-xl',
      'bg-gray-200 dark:bg-gray-800',
      className
    )}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className={cn(
        // THEME.md 进度条样式
        'h-full w-full flex-1 bg-primary transition-all duration-300 ease-in-out',
        // 悬停效果 - 符合 THEME.md 规范
        'hover:shadow-sm',
        indicatorClassName
      )}
      style={{
        transform: `translateX(-${100 - (value || 0)}%)`,
      }}
    />
  </ProgressPrimitive.Root>
));
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };
