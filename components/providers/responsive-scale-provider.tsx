'use client';

/**
 * 响应式缩放提供者
 *
 * @module components/providers/responsive-scale-provider
 * @description 提供全局响应式缩放支持，通过 CSS 变量和 transform 实现自适应
 */

import { useEffect, useMemo } from 'react';
import { useResponsiveScale } from '@/hooks/use-responsive-scale';

interface ResponsiveScaleProviderProps {
  children: React.ReactNode;
  /** 是否启用全局缩放（默认开启） */
  enabled?: boolean;
  /** 是否使用 CSS 变量模式（推荐） */
  useCSSVariables?: boolean;
  /** 是否使用 transform 缩放模式 */
  useTransformScale?: boolean;
}

/**
 * 响应式缩放提供者组件
 *
 * 两种缩放模式：
 * 1. CSS 变量模式（推荐）：通过 --scale-* 变量控制各元素大小
 * 2. Transform 模式：对根容器应用 scale 变换
 */
export function ResponsiveScaleProvider({
  children,
  enabled = true,
  useCSSVariables = true,
  useTransformScale = false,
}: ResponsiveScaleProviderProps) {
  const {
    scale,
    viewportWidth,
    viewportHeight,
    isMobile,
    isTablet,
    isDesktop,
    isLargeScreen,
  } = useResponsiveScale({ enabled });

  // 设置 CSS 变量
  useEffect(() => {
    if (!useCSSVariables) return;

    const root = document.documentElement;

    // 缩放比例变量
    root.style.setProperty('--scale-ratio', String(scale));
    root.style.setProperty('--scale-font', String(scale));
    root.style.setProperty('--scale-spacing', String(scale));

    // 视口尺寸变量
    root.style.setProperty('--viewport-width', `${viewportWidth}px`);
    root.style.setProperty('--viewport-height', `${viewportHeight}px`);

    // 设备类型变量
    root.style.setProperty('--is-mobile', isMobile ? '1' : '0');
    root.style.setProperty('--is-tablet', isTablet ? '1' : '0');
    root.style.setProperty('--is-desktop', isDesktop ? '1' : '0');
    root.style.setProperty('--is-large-screen', isLargeScreen ? '1' : '0');

    // 断点类名
    root.classList.toggle('viewport-mobile', isMobile);
    root.classList.toggle('viewport-tablet', isTablet);
    root.classList.toggle('viewport-desktop', isDesktop);
    root.classList.toggle('viewport-large', isLargeScreen);
  }, [scale, viewportWidth, viewportHeight, isMobile, isTablet, isDesktop, isLargeScreen, useCSSVariables]);

  // Transform 缩放模式
  const containerStyle = useMemo(() => {
    if (!useTransformScale || !enabled) return undefined;

    return {
      transform: `scale(${scale})`,
      transformOrigin: 'top left',
      width: `${100 / scale}%`,
      height: `${100 / scale}%`,
    };
  }, [scale, useTransformScale, enabled]);

  if (useTransformScale && enabled) {
    return (
      <div
        id="responsive-scale-container"
        style={containerStyle}
        className="responsive-scale-container"
      >
        {children}
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * 用于获取当前响应式状态的 Hook（方便组件内部使用）
 */
export function useResponsiveState() {
  return useResponsiveScale();
}