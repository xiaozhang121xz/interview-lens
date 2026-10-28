'use client';

/**
 * 滚动轮盘选择器组件 (Wheel Picker)
 *
 * 类似 iOS 时间选择器的滚动轮盘效果
 * 支持鼠标滚轮滑动和触摸滑动
 *
 * @module components/ui/wheel-picker
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

// ============================================
// 类型定义
// ============================================

interface WheelPickerOption {
  value: string;
  label: string;
  description?: string;
}

interface WheelPickerProps {
  options: WheelPickerOption[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
  height?: number; // 可见高度，默认显示 3-5 个选项
  itemHeight?: number; // 单个选项高度
  className?: string;
}

// ============================================
// 组件实现
// ============================================

export function WheelPicker({
  options,
  value,
  onChange,
  label,
  height = 180,
  itemHeight = 40,
  className,
}: WheelPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const [scrollOffset, setScrollOffset] = useState(0);
  const animationRef = useRef<number | null>(null);
  const velocityRef = useRef(0);
  const lastScrollTimeRef = useRef(0);
  const lastScrollYRef = useRef(0);

  // 当前选中索引
  const currentIndex = options.findIndex((opt) => opt.value === value);

  // 计算可见范围（通常显示 5 个选项）
  const visibleCount = Math.floor(height / itemHeight);
  const halfVisible = Math.floor(visibleCount / 2);

  // 初始化滚动偏移
  useEffect(() => {
    setScrollOffset(currentIndex * itemHeight);
  }, [currentIndex, itemHeight]);

  // 滚动到指定索引
  const scrollToIndex = useCallback(
    (index: number) => {
      const targetOffset = index * itemHeight;
      const maxOffset = (options.length - 1) * itemHeight;
      const clampedOffset = Math.max(0, Math.min(maxOffset, targetOffset));

      // 平滑滚动动画
      const startOffset = scrollOffset;
      const distance = clampedOffset - startOffset;
      const duration = 300; // ms
      const startTime = performance.now();

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // 使用 ease-out 曲线
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const currentOffset = startOffset + distance * easeOut;

        setScrollOffset(currentOffset);

        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate);
        } else {
          // 动画结束，更新选中值
          setIsScrolling(false);
          const finalIndex = Math.round(currentOffset / itemHeight);
          if (options[finalIndex] && options[finalIndex].value !== value) {
            onChange(options[finalIndex].value);
          }
        }
      };

      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      animationRef.current = requestAnimationFrame(animate);
    },
    [scrollOffset, itemHeight, options, value, onChange]
  );

  // 鼠标滚轮处理
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();

      const delta = e.deltaY > 0 ? 1 : -1;
      const newIndex = Math.max(0, Math.min(options.length - 1, currentIndex + delta));

      if (newIndex !== currentIndex) {
        scrollToIndex(newIndex);
      }
    },
    [currentIndex, options.length, scrollToIndex]
  );

  // 触摸/鼠标拖拽处理
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    setIsScrolling(true);
    lastScrollTimeRef.current = e.timeStamp;
    lastScrollYRef.current = e.clientY;
    velocityRef.current = 0;

    if (containerRef.current) {
      containerRef.current.setPointerCapture(e.pointerId);
    }
  }, []);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isScrolling) return;

      const deltaY = e.clientY - lastScrollYRef.current;
      const deltaTime = e.timeStamp - lastScrollTimeRef.current;

      // 计算速度
      if (deltaTime > 0) {
        velocityRef.current = deltaY / deltaTime;
      }

      // 更新偏移（反向，向上拖动向下滚动）
      const newOffset = scrollOffset - deltaY;
      const maxOffset = (options.length - 1) * itemHeight;
      const clampedOffset = Math.max(0, Math.min(maxOffset, newOffset));

      setScrollOffset(clampedOffset);
      lastScrollYRef.current = e.clientY;
      lastScrollTimeRef.current = e.timeStamp;
    },
    [isScrolling, scrollOffset, options.length, itemHeight]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!isScrolling) return;

      if (containerRef.current) {
        containerRef.current.releasePointerCapture(e.pointerId);
      }

      // 根据速度继续滚动（惯性滚动）
      const finalOffset = scrollOffset + velocityRef.current * 100 * itemHeight;
      const snappedIndex = Math.round(finalOffset / itemHeight);
      const clampedIndex = Math.max(0, Math.min(options.length - 1, snappedIndex));

      scrollToIndex(clampedIndex);
    },
    [isScrolling, scrollOffset, velocityRef, itemHeight, options.length, scrollToIndex]
  );

  // 清理动画
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // 渲染选项
  const renderOptions = () => {
    const centerOffset = height / 2 - itemHeight / 2;

    return options.map((option, index) => {
      // 计算相对于当前位置的偏移
      const relativeOffset = index * itemHeight - scrollOffset;
      const visualOffset = centerOffset + relativeOffset;

      // 计算与中心的距离（用于缩放和透明度）
      const distanceFromCenter = Math.abs(visualOffset - centerOffset) / itemHeight;

      // 缩放和透明度渐变
      const scale = Math.max(0.6, 1 - distanceFromCenter * 0.15);
      const opacity = Math.max(0.3, 1 - distanceFromCenter * 0.3);

      // 是否为当前选中项
      const isSelected = Math.abs(index - Math.round(scrollOffset / itemHeight)) < 0.5;

      return (
        <div
          key={option.value}
          className={cn(
            'absolute w-full flex flex-col items-center justify-center transition-all',
            'pointer-events-none select-none',
            isSelected && 'font-semibold'
          )}
          style={{
            top: visualOffset,
            height: itemHeight,
            transform: `scale(${scale})`,
            opacity,
          }}
        >
          <span className={cn('text-base', isSelected ? 'text-primary' : 'text-muted-foreground')}>
            {option.label}
          </span>
          {option.description && isSelected && (
            <span className="text-xs text-muted-foreground mt-1 max-w-[200px] text-center truncate">
              {option.description}
            </span>
          )}
        </div>
      );
    });
  };

  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      {label && (
        <label className="text-sm font-medium text-muted-foreground">{label}</label>
      )}

      {/* 滚动轮盘容器 */}
      <div
        ref={containerRef}
        className={cn(
          'relative overflow-hidden rounded-xl bg-muted/50 border border-muted',
          'cursor-grab active:cursor-grabbing',
          isScrolling && 'cursor-grabbing'
        )}
        style={{ height, width: '100%' }}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {/* 中心高亮指示器 */}
        <div
          className="absolute left-0 right-0 pointer-events-none border-2 border-primary rounded-lg bg-primary/5"
          style={{
            top: height / 2 - itemHeight / 2,
            height: itemHeight,
          }}
        />

        {/* 滚动选项 */}
        {renderOptions()}

        {/* 顶部和底部渐变遮罩 */}
        <div
          className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-muted/50 to-transparent pointer-events-none"
        />
        <div
          className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-muted/50 to-transparent pointer-events-none"
        />
      </div>

      {/* 当前值显示 */}
      <div className="text-center">
        <span className="text-sm text-muted-foreground">当前选择：</span>
        <span className="text-sm font-medium ml-1">
          {options[currentIndex]?.label}
        </span>
      </div>
    </div>
  );
}

export default WheelPicker;