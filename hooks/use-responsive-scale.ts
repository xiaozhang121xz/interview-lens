'use client';

/**
 * 视口自适应缩放 Hook
 *
 * @module hooks/use-responsive-scale
 * @description 根据视口宽度动态计算缩放比例，实现页面自适应
 *
 * 设计稿基准：1440px（桌面端标准宽度）
 * 缩放范围：0.8 - 1.2（80% - 120%）
 * 断点设计：
 * - < 768px (移动端): 使用最小缩放
 * - 768px - 1024px (平板): 线性缩放
 * - 1024px - 1920px (桌面): 标准缩放
 * - > 1920px (大屏): 使用最大缩放
 */

import { useState, useEffect, useCallback } from 'react';

interface ResponsiveScaleOptions {
  /** 设计稿基准宽度 */
  baseWidth?: number;
  /** 最小缩放比例 */
  minScale?: number;
  /** 最大缩放比例 */
  maxScale?: number;
  /** 是否启用缩放 */
  enabled?: boolean;
}

interface ResponsiveScaleResult {
  /** 当前缩放比例 */
  scale: number;
  /** 当前视口宽度 */
  viewportWidth: number;
  /** 当前视口高度 */
  viewportHeight: number;
  /** 是否为移动端 */
  isMobile: boolean;
  /** 是否为平板 */
  isTablet: boolean;
  /** 是否为桌面端 */
  isDesktop: boolean;
  /** 是否为大屏 */
  isLargeScreen: boolean;
}

/**
 * 计算缩放比例
 */
function calculateScale(
  viewportWidth: number,
  baseWidth: number,
  minScale: number,
  maxScale: number
): number {
  // 移动端：使用最小缩放
  if (viewportWidth < 768) {
    return minScale;
  }

  // 平板：线性插值
  if (viewportWidth < 1024) {
    const progress = (viewportWidth - 768) / (1024 - 768);
    return minScale + progress * (1 - minScale);
  }

  // 标准桌面：接近 1:1 缩放
  if (viewportWidth <= 1920) {
    const progress = (viewportWidth - 1024) / (1920 - 1024);
    return 1 + progress * (maxScale - 1) * 0.5;
  }

  // 大屏：使用最大缩放
  return maxScale;
}

/**
 * 视口自适应缩放 Hook
 */
export function useResponsiveScale(
  options: ResponsiveScaleOptions = {}
): ResponsiveScaleResult {
  const {
    baseWidth = 1440,
    minScale = 0.85,
    maxScale = 1.15,
    enabled = true,
  } = options;

  const [dimensions, setDimensions] = useState<{
    width: number;
    height: number;
  }>({
    width: typeof window !== 'undefined' ? window.innerWidth : 1440,
    height: typeof window !== 'undefined' ? window.innerHeight : 900,
  });

  // 计算缩放比例
  const scale = enabled
    ? calculateScale(dimensions.width, baseWidth, minScale, maxScale)
    : 1;

  // 设备类型判断
  const isMobile = dimensions.width < 768;
  const isTablet = dimensions.width >= 768 && dimensions.width < 1024;
  const isDesktop = dimensions.width >= 1024 && dimensions.width < 1920;
  const isLargeScreen = dimensions.width >= 1920;

  // 监听窗口大小变化
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let rafId: number;
    let timeoutId: NodeJS.Timeout;

    const updateDimensions = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        setDimensions({
          width: window.innerWidth,
          height: window.innerHeight,
        });
      });
    };

    // 防抖处理
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(updateDimensions, 100);
    };

    // 初始化
    updateDimensions();

    // 监听 resize 事件
    window.addEventListener('resize', handleResize);

    // 监听 orientationchange 事件（移动端）
    window.addEventListener('orientationchange', updateDimensions);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', updateDimensions);
      cancelAnimationFrame(rafId);
      clearTimeout(timeoutId);
    };
  }, []);

  return {
    scale,
    viewportWidth: dimensions.width,
    viewportHeight: dimensions.height,
    isMobile,
    isTablet,
    isDesktop,
    isLargeScreen,
  };
}

/**
 * 获取响应式字体大小
 */
export function getResponsiveFontSize(
  baseFontSize: number,
  scale: number,
  minSize?: number,
  maxSize?: number
): number {
  let size = baseFontSize * scale;
  if (minSize !== undefined) size = Math.max(size, minSize);
  if (maxSize !== undefined) size = Math.min(size, maxSize);
  return size;
}

/**
 * 获取响应式间距
 */
export function getResponsiveSpacing(
  baseSpacing: number,
  scale: number,
  minSpacing?: number,
  maxSpacing?: number
): number {
  let spacing = baseSpacing * scale;
  if (minSpacing !== undefined) spacing = Math.max(spacing, minSpacing);
  if (maxSpacing !== undefined) spacing = Math.min(spacing, maxSpacing);
  return spacing;
}