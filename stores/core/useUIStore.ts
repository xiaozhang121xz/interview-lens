import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

// 通知接口
interface Notification {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  show: boolean;
}

// UI状态接口
interface UIState {
  // 抽屉和模态框状态
  isCartDrawerOpen: boolean;
  isDeliveryModalOpen: boolean;
  isOrderConfirmationModalOpen: boolean;
  isMobileMenuOpen: boolean;

  // 页面状态
  currentView: 'menu' | 'cart' | 'checkout' | 'confirmation';
  isScrolling: boolean;
  scrollTop: number;

  // 加载状态
  globalLoading: boolean;
  loadingMessage?: string;

  // 通知状态
  notification: Notification | null;

  // 主题和布局状态
  isDarkMode: boolean;
  isMobile: boolean;
  screenSize: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

  // Actions
  // 抽屉和模态框控制
  openCartDrawer: () => void;
  closeCartDrawer: () => void;
  toggleCartDrawer: () => void;
  openDeliveryModal: () => void;
  closeDeliveryModal: () => void;
  toggleDeliveryModal: () => void;
  openOrderConfirmationModal: () => void;
  closeOrderConfirmationModal: () => void;
  toggleOrderConfirmationModal: () => void;
  openMobileMenu: () => void;
  closeMobileMenu: () => void;
  toggleMobileMenu: () => void;

  // 关闭所有抽屉和模态框
  closeAllModals: () => void;

  // 页面状态控制
  setCurrentView: (view: UIState['currentView']) => void;
  setScrolling: (scrolling: boolean) => void;
  setScrollTop: (scrollTop: number) => void;

  // 加载状态控制
  setGlobalLoading: (loading: boolean, message?: string) => void;
  showLoading: (message?: string) => void;
  hideLoading: () => void;

  // 通知控制
  showNotification: (notification: Omit<Notification, 'show'>) => void;
  hideNotification: () => void;
  showSuccess: (title: string, message?: string, duration?: number) => void;
  showError: (title: string, message?: string, duration?: number) => void;
  showWarning: (title: string, message?: string, duration?: number) => void;
  showInfo: (title: string, message?: string, duration?: number) => void;

  // 主题和布局控制
  toggleDarkMode: () => void;
  setDarkMode: (dark: boolean) => void;
  setScreenSize: (size: UIState['screenSize']) => void;
  updateScreenSize: () => void;

  // 重置状态
  reset: () => void;
}

// 获取屏幕尺寸的工具函数
const getScreenSize = (): UIState['screenSize'] => {
  if (typeof window === 'undefined') return 'md';

  const width = window.innerWidth;
  if (width < 640) return 'xs';
  if (width < 768) return 'sm';
  if (width < 1024) return 'md';
  if (width < 1280) return 'lg';
  if (width < 1536) return 'xl';
  return '2xl';
};

// 检测是否为移动设备
const getIsMobile = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 768;
};

// 初始状态
const initialState = {
  isCartDrawerOpen: false,
  isDeliveryModalOpen: false,
  isOrderConfirmationModalOpen: false,
  isMobileMenuOpen: false,
  currentView: 'menu' as const,
  isScrolling: false,
  scrollTop: 0,
  globalLoading: false,
  loadingMessage: undefined,
  notification: null,
  isDarkMode: false,
  isMobile: getIsMobile(),
  screenSize: getScreenSize(),
};

// 创建UI store
export const useUIStore = create<UIState>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        // 购物车抽屉控制
        openCartDrawer: () => set({ isCartDrawerOpen: true }),
        closeCartDrawer: () => set({ isCartDrawerOpen: false }),
        toggleCartDrawer: () =>
          set((state) => ({ isCartDrawerOpen: !state.isCartDrawerOpen })),

        // 配送信息模态框控制
        openDeliveryModal: () => set({ isDeliveryModalOpen: true }),
        closeDeliveryModal: () => set({ isDeliveryModalOpen: false }),
        toggleDeliveryModal: () =>
          set((state) => ({ isDeliveryModalOpen: !state.isDeliveryModalOpen })),

        // 订单确认模态框控制
        openOrderConfirmationModal: () =>
          set({ isOrderConfirmationModalOpen: true }),
        closeOrderConfirmationModal: () =>
          set({ isOrderConfirmationModalOpen: false }),
        toggleOrderConfirmationModal: () =>
          set((state) => ({
            isOrderConfirmationModalOpen: !state.isOrderConfirmationModalOpen,
          })),

        // 移动端菜单控制
        openMobileMenu: () => set({ isMobileMenuOpen: true }),
        closeMobileMenu: () => set({ isMobileMenuOpen: false }),
        toggleMobileMenu: () =>
          set((state) => ({ isMobileMenuOpen: !state.isMobileMenuOpen })),

        // 关闭所有抽屉和模态框
        closeAllModals: () =>
          set({
            isCartDrawerOpen: false,
            isDeliveryModalOpen: false,
            isOrderConfirmationModalOpen: false,
            isMobileMenuOpen: false,
          }),

        // 页面状态控制
        setCurrentView: (view) => set({ currentView: view }),
        setScrolling: (scrolling) => set({ isScrolling: scrolling }),
        setScrollTop: (scrollTop) => set({ scrollTop }),

        // 加载状态控制
        setGlobalLoading: (loading, message) =>
          set({
            globalLoading: loading,
            loadingMessage: loading ? message || undefined : undefined,
          }),
        showLoading: (message = '加载中...') =>
          set({
            globalLoading: true,
            loadingMessage: message,
          }),
        hideLoading: () =>
          set({
            globalLoading: false,
            loadingMessage: undefined,
          }),

        // 通知控制
        showNotification: (notification: Omit<Notification, 'show'>) => {
          const notificationWithShow: Notification = {
            ...notification,
            show: true,
          };
          set({ notification: notificationWithShow });

          // 自动隐藏通知
          if (notification.duration !== 0) {
            setTimeout(() => {
              get().hideNotification();
            }, notification.duration || 5000);
          }
        },
        hideNotification: () => set({ notification: null }),

        // 快捷通知方法
        showSuccess: (title, message = '', duration = 3000) =>
          get().showNotification({
            type: 'success',
            title,
            message,
            duration,
          }),
        showError: (title, message = '', duration = 5000) =>
          get().showNotification({
            type: 'error',
            title,
            message,
            duration,
          }),
        showWarning: (title, message = '', duration = 4000) =>
          get().showNotification({
            type: 'warning',
            title,
            message,
            duration,
          }),
        showInfo: (title, message = '', duration = 3000) =>
          get().showNotification({
            type: 'info',
            title,
            message,
            duration,
          }),

        // 主题和布局控制
        toggleDarkMode: () =>
          set((state) => ({ isDarkMode: !state.isDarkMode })),
        setDarkMode: (dark) => set({ isDarkMode: dark }),
        setScreenSize: (size) => set({ screenSize: size }),
        updateScreenSize: () => {
          const screenSize = getScreenSize();
          const isMobile = getIsMobile();
          set({ screenSize, isMobile });
        },

        // 重置状态
        reset: () => {
          // 关闭所有模态框
          get().closeAllModals();
          set({
            currentView: 'menu',
            isScrolling: false,
            scrollTop: 0,
            globalLoading: false,
            loadingMessage: undefined,
            notification: null,
          });
        },
      }),
      {
        name: 'ui-store',
        partialize: (state) => ({
          // 只持久化主题设置
          isDarkMode: state.isDarkMode,
        }),
      }
    ),
    { name: 'ui-store' }
  )
);

// 选择器函数，用于获取特定的状态切片
export const useCartDrawerState = () =>
  useUIStore((state) => state.isCartDrawerOpen);
export const useDeliveryModalState = () =>
  useUIStore((state) => state.isDeliveryModalOpen);
export const useOrderConfirmationModalState = () =>
  useUIStore((state) => state.isOrderConfirmationModalOpen);
export const useMobileMenuState = () =>
  useUIStore((state) => state.isMobileMenuOpen);
export const useCurrentView = () => useUIStore((state) => state.currentView);
// 修复：使用单值选择器避免对象创建问题
export const useScrolling = () => useUIStore((state) => state.isScrolling);
export const useScrollTop = () => useUIStore((state) => state.scrollTop);
export const useLoadingState = () => useUIStore((state) => state.globalLoading);
export const useLoadingMessage = () =>
  useUIStore((state) => state.loadingMessage);

// 组合选择器 - 使用多个独立的单值选择器
export const useScrollState = () => {
  const isScrolling = useScrolling();
  const scrollTop = useScrollTop();

  return {
    isScrolling,
    scrollTop,
  };
};

export const useGlobalLoading = () => {
  const isLoading = useLoadingState();
  const message = useLoadingMessage();

  return {
    isLoading,
    message,
  };
};
export const useNotification = () => useUIStore((state) => state.notification);

// 修复：使用单值选择器避免对象创建问题
export const useDarkMode = () => useUIStore((state) => state.isDarkMode);
export const useMobile = () => useUIStore((state) => state.isMobile);
export const useScreenSize = () => useUIStore((state) => state.screenSize);

// 组合选择器 - 使用多个独立的单值选择器
export const useTheme = () => {
  const isDarkMode = useDarkMode();
  return {
    isDarkMode,
  };
};

export const useResponsive = () => {
  const isMobile = useMobile();
  const screenSize = useScreenSize();

  return {
    isMobile,
    screenSize,
  };
};

// 复合选择器
export const useAnyModalOpen = () => {
  const isCartDrawerOpen = useUIStore((state) => state.isCartDrawerOpen);
  const isDeliveryModalOpen = useUIStore((state) => state.isDeliveryModalOpen);
  const isOrderConfirmationModalOpen = useUIStore(
    (state) => state.isOrderConfirmationModalOpen
  );
  const isMobileMenuOpen = useUIStore((state) => state.isMobileMenuOpen);

  return (
    isCartDrawerOpen ||
    isDeliveryModalOpen ||
    isOrderConfirmationModalOpen ||
    isMobileMenuOpen
  );
};

export const useCanShowNotification = () => {
  const notification = useUIStore((state) => state.notification);
  return notification && notification.show;
};

// 工具函数：响应式断点
export const useBreakpoint = () => {
  const screenSize = useUIStore((state) => state.screenSize);

  return {
    isXs: screenSize === 'xs',
    isSm: screenSize === 'sm',
    isMd: screenSize === 'md',
    isLg: screenSize === 'lg',
    isXl: screenSize === 'xl',
    is2Xl: screenSize === '2xl',
    isSmAndUp: ['sm', 'md', 'lg', 'xl', '2xl'].includes(screenSize),
    isMdAndUp: ['md', 'lg', 'xl', '2xl'].includes(screenSize),
    isLgAndUp: ['lg', 'xl', '2xl'].includes(screenSize),
    isSmAndDown: ['xs', 'sm'].includes(screenSize),
    isMdAndDown: ['xs', 'sm', 'md'].includes(screenSize),
  };
};

// 类型导出
export type { UIState };
