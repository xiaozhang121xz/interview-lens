'use client';

/**
 * 右侧滚轮配置选择器组件 (Right Wheel Config Picker)
 *
 * 左侧显示配置项标题，右侧显示滚轮选择器
 * 整体页面上下滚动切换配置项
 *
 * @module components/ui/right-wheel-picker
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

// ============================================
// 类型定义
// ============================================

interface WheelOption {
  value: string;
  label: string;
}

interface ConfigSection {
  id: string;
  title: string;
  description?: string;
  options: WheelOption[];
  value: string;
  onChange: (value: string) => void;
  warning?: string;
}

interface RightWheelPickerProps {
  sections: ConfigSection[];
  height?: number;
  rowHeight?: number; // 每个配置项的高度
  wheelHeight?: number; // 右侧滚轮高度
  className?: string;
}

// ============================================
// 右侧滚轮组件
// ============================================

interface InnerWheelProps {
  options: WheelOption[];
  value: string;
  onChange: (value: string) => void;
  height: number;
  itemHeight: number;
  disabled?: boolean;
}

function InnerWheel({
  options,
  value,
  onChange,
  height,
  itemHeight,
  disabled = false,
}: InnerWheelProps) {
  const wheelRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [scrollOffset, setScrollOffset] = useState(0);
  const animationRef = useRef<number | null>(null);
  const velocityRef = useRef(0);
  const lastTimeRef = useRef(0);
  const lastYRef = useRef(0);

  const currentIndex = options.findIndex((opt) => opt.value === value);

  // 初始化偏移
  useEffect(() => {
    setScrollOffset(currentIndex * itemHeight);
  }, [currentIndex, itemHeight]);

  // 滚动到指定索引
  const scrollToIndex = useCallback(
    (index: number) => {
      const targetOffset = index * itemHeight;
      const maxOffset = (options.length - 1) * itemHeight;
      const clampedOffset = Math.max(0, Math.min(maxOffset, targetOffset));

      const startOffset = scrollOffset;
      const distance = clampedOffset - startOffset;
      const duration = 250;
      const startTime = performance.now();

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const currentOffset = startOffset + distance * easeOut;

        setScrollOffset(currentOffset);

        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate);
        } else {
          setIsDragging(false);
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

  // 鼠标滚轮
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (disabled) return;
      e.preventDefault();
      e.stopPropagation();

      const delta = e.deltaY > 0 ? 1 : -1;
      const newIndex = Math.max(0, Math.min(options.length - 1, currentIndex + delta));

      if (newIndex !== currentIndex) {
        scrollToIndex(newIndex);
      }
    },
    [disabled, currentIndex, options.length, scrollToIndex]
  );

  // 拖拽
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (disabled) return;
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
      lastTimeRef.current = e.timeStamp;
      lastYRef.current = e.clientY;
      velocityRef.current = 0;

      if (wheelRef.current) {
        wheelRef.current.setPointerCapture(e.pointerId);
      }
    },
    [disabled]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;

      const deltaY = e.clientY - lastYRef.current;
      const deltaTime = e.timeStamp - lastTimeRef.current;

      if (deltaTime > 0) {
        velocityRef.current = deltaY / deltaTime;
      }

      const newOffset = scrollOffset - deltaY;
      const maxOffset = (options.length - 1) * itemHeight;
      const clampedOffset = Math.max(0, Math.min(maxOffset, newOffset));

      setScrollOffset(clampedOffset);
      lastYRef.current = e.clientY;
      lastTimeRef.current = e.timeStamp;
    },
    [isDragging, scrollOffset, options.length, itemHeight]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;

      if (wheelRef.current) {
        wheelRef.current.releasePointerCapture(e.pointerId);
      }

      const finalOffset = scrollOffset + velocityRef.current * 80 * itemHeight;
      const snappedIndex = Math.round(finalOffset / itemHeight);
      const clampedIndex = Math.max(0, Math.min(options.length - 1, snappedIndex));

      scrollToIndex(clampedIndex);
    },
    [isDragging, scrollOffset, velocityRef, itemHeight, options.length, scrollToIndex]
  );

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // 渲染选项
  const centerOffset = height / 2 - itemHeight / 2;

  const renderOptions = () => {
    return options.map((option, index) => {
      const relativeOffset = index * itemHeight - scrollOffset;
      const visualOffset = centerOffset + relativeOffset;
      const distanceFromCenter = Math.abs(visualOffset - centerOffset) / itemHeight;

      const scale = Math.max(0.7, 1 - distanceFromCenter * 0.2);
      const opacity = Math.max(0.3, 1 - distanceFromCenter * 0.35);
      const isSelected = Math.abs(index - Math.round(scrollOffset / itemHeight)) < 0.5;

      return (
        <div
          key={option.value}
          className={cn(
            'absolute w-full flex items-center justify-center',
            'pointer-events-none select-none transition-all',
            isSelected && 'font-semibold'
          )}
          style={{
            top: visualOffset,
            height: itemHeight,
            transform: `scale(${scale})`,
            opacity,
          }}
        >
          <span
            className={cn(
              'text-sm truncate max-w-full px-2',
              isSelected ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            {option.label}
          </span>
        </div>
      );
    });
  };

  return (
    <div
      ref={wheelRef}
      className={cn(
        'relative overflow-hidden rounded-lg bg-muted/40 border border-muted',
        disabled ? 'cursor-not-allowed opacity-60' : 'cursor-grab active:cursor-grabbing'
      )}
      style={{ height, width: '100%' }}
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* 中心高亮 */}
      <div
        className="absolute left-0 right-0 pointer-events-none border-y-2 border-primary/30 bg-primary/5"
        style={{
          top: height / 2 - itemHeight / 2,
          height: itemHeight,
        }}
      />

      {renderOptions()}

      {/* 渐变遮罩 */}
      <div className="absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-muted/60 to-transparent pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-muted/60 to-transparent pointer-events-none" />
    </div>
  );
}

// ============================================
// 主组件
// ============================================

export function RightWheelPicker({
  sections,
  height = 300,
  rowHeight = 90,
  wheelHeight = 50,
  className,
}: RightWheelPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const animationRef = useRef<number | null>(null);
  const velocityRef = useRef(0);
  const lastTimeRef = useRef(0);
  const lastYRef = useRef(0);

  useEffect(() => {
    setScrollOffset(0);
    setCurrentSectionIndex(0);
  }, []);

  const scrollToIndex = useCallback(
    (index: number) => {
      const targetOffset = index * rowHeight;
      const maxOffset = (sections.length - 1) * rowHeight;
      const clampedOffset = Math.max(0, Math.min(maxOffset, targetOffset));

      const startOffset = scrollOffset;
      const distance = clampedOffset - startOffset;
      const duration = 300;
      const startTime = performance.now();

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const currentOffset = startOffset + distance * easeOut;

        setScrollOffset(currentOffset);

        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate);
        } else {
          setIsScrolling(false);
          const finalIndex = Math.round(currentOffset / rowHeight);
          setCurrentSectionIndex(finalIndex);
        }
      };

      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      animationRef.current = requestAnimationFrame(animate);
    },
    [scrollOffset, rowHeight, sections.length]
  );

  // 左侧区域滚轮（切换配置项）
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();

      const delta = e.deltaY > 0 ? 1 : -1;
      const newIndex = Math.max(0, Math.min(sections.length - 1, currentSectionIndex + delta));

      if (newIndex !== currentSectionIndex) {
        scrollToIndex(newIndex);
      }
    },
    [currentSectionIndex, sections.length, scrollToIndex]
  );

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    setIsScrolling(true);
    lastTimeRef.current = e.timeStamp;
    lastYRef.current = e.clientY;
    velocityRef.current = 0;

    if (containerRef.current) {
      containerRef.current.setPointerCapture(e.pointerId);
    }
  }, []);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isScrolling) return;

      const deltaY = e.clientY - lastYRef.current;
      const deltaTime = e.timeStamp - lastTimeRef.current;

      if (deltaTime > 0) {
        velocityRef.current = deltaY / deltaTime;
      }

      const newOffset = scrollOffset - deltaY;
      const maxOffset = (sections.length - 1) * rowHeight;
      const clampedOffset = Math.max(0, Math.min(maxOffset, newOffset));

      setScrollOffset(clampedOffset);
      lastYRef.current = e.clientY;
      lastTimeRef.current = e.timeStamp;

      const tempIndex = Math.round(clampedOffset / rowHeight);
      setCurrentSectionIndex(Math.max(0, Math.min(sections.length - 1, tempIndex)));
    },
    [isScrolling, scrollOffset, sections.length, rowHeight]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!isScrolling) return;

      if (containerRef.current) {
        containerRef.current.releasePointerCapture(e.pointerId);
      }

      const finalOffset = scrollOffset + velocityRef.current * 100 * rowHeight;
      const snappedIndex = Math.round(finalOffset / rowHeight);
      const clampedIndex = Math.max(0, Math.min(sections.length - 1, snappedIndex));

      scrollToIndex(clampedIndex);
    },
    [isScrolling, scrollOffset, velocityRef, rowHeight, sections.length, scrollToIndex]
  );

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // 渲染配置行
  const centerOffset = height / 2 - rowHeight / 2;

  const renderSections = () => {
    return sections.map((section, index) => {
      const relativeOffset = index * rowHeight - scrollOffset;
      const visualOffset = centerOffset + relativeOffset;
      const distanceFromCenter = Math.abs(visualOffset - centerOffset) / rowHeight;

      const scale = Math.max(0.75, 1 - distanceFromCenter * 0.15);
      const opacity = Math.max(0.25, 1 - distanceFromCenter * 0.35);
      const isSelected = Math.abs(index - Math.round(scrollOffset / rowHeight)) < 0.5;

      return (
        <div
          key={section.id}
          className={cn(
            'absolute w-full flex items-center gap-4 px-2',
            'pointer-events-none select-none transition-opacity',
            isSelected && 'pointer-events-auto'
          )}
          style={{
            top: visualOffset,
            height: rowHeight,
            transform: `scale(${scale})`,
            opacity,
          }}
        >
          {/* 左侧：标题区域 */}
          <div className="flex-1 min-w-0">
            <h3
              className={cn(
                'text-sm font-semibold truncate',
                isSelected ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              {section.title}
            </h3>
            {section.description && isSelected && (
              <p className="text-xs text-muted-foreground truncate mt-1">
                {section.description}
              </p>
            )}
            {section.warning && isSelected && (
              <p className="text-xs text-amber-600 truncate mt-1">{section.warning}</p>
            )}
          </div>

          {/* 右侧：滚轮选择器 */}
          <div className="w-28 shrink-0">
            <InnerWheel
              options={section.options}
              value={section.value}
              onChange={section.onChange}
              height={wheelHeight}
              itemHeight={28}
              disabled={!isSelected}
            />
          </div>
        </div>
      );
    });
  };

  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      {/* 主容器 */}
      <div
        ref={containerRef}
        className={cn(
          'relative overflow-hidden rounded-xl bg-muted/30 border border-muted',
          'cursor-grab active:cursor-grabbing'
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
          className="absolute left-0 right-0 pointer-events-none border-2 border-primary/40 rounded-lg bg-primary/5"
          style={{
            top: height / 2 - rowHeight / 2,
            height: rowHeight,
          }}
        />

        {renderSections()}

        {/* 渐变遮罩 */}
        <div className="absolute top-0 left-0 right-0 h-10 bg-gradient-to-b from-muted/70 to-transparent pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-muted/70 to-transparent pointer-events-none" />
      </div>

      {/* 当前配置项指示 */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">配置：</span>
        <span className="font-medium text-primary">
          {sections[currentSectionIndex]?.title}
        </span>
        <span className="text-muted-foreground">
          ({currentSectionIndex + 1}/{sections.length})
        </span>
      </div>
    </div>
  );
}

export default RightWheelPicker;