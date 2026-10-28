import * as React from "react"

/**
 * 移动设备断点（像素）
 * 默认使用 768px（Tailwind CSS 的 md 断点）
 */
const MOBILE_BREAKPOINT = 768

/**
 * 检测当前设备是否为移动设备的 Hook
 *
 * 基于窗口宽度判断，宽度 < 768px 时认为是移动设备
 *
 * @returns {boolean} 是否为移动设备
 *
 * @example
 * ```tsx
 * const isMobile = useIsMobile()
 *
 * return (
 *   <div>
 *     {isMobile ? <MobileView /> : <DesktopView />}
 *   </div>
 * )
 * ```
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)

    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }

    // 添加媒体查询监听器
    mql.addEventListener("change", onChange)

    // 初始化状态
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)

    // 清理函数：移除监听器
    return () => mql.removeEventListener("change", onChange)
  }, [])

  // 在服务端渲染时返回 false（避免 hydration mismatch）
  // 在客户端首次渲染前返回 false
  return !!isMobile
}
