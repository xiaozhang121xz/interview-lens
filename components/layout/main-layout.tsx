'use client';

import { ReactNode, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from '@/components/ui/sidebar';
import {
  Users,
  User,
  Zap,
  LogOut,
  Home,
  ChevronRight,
  Box,
  Sparkles,
  BookOpen,
  Calendar,
  Bell,
  Briefcase,
  MessageSquareQuote,
  Settings,
} from 'lucide-react';
import { useUserStore } from '@/stores/core/useUserStore';
import { userApi } from '@/lib/api';
import NoSSR from '@/components/no-ssr';
// import { CartButton } from '@/components/common/CartButton';
import './main-layout.css';
import { PROJECT_NAME } from '@/lib/config/project';

interface MenuItem {
  title: string;
  description?: string;
  href?: string;
  icon?: any;
  items?: MenuItem[];
}

const menuItems: MenuItem[] = [
  // ==========================================
  // 仪表板
  // ==========================================
  {
    title: '概览',
    icon: Zap,
    href: '/dashboard' as const,
    description: '系统概览和统计',
  },
  // ==========================================
  // 客户需求洞察助手
  // ==========================================
  {
    title: '客户管理',
    icon: Briefcase,
    href: '/dashboard/customers' as const,
    description: '管理客户信息和联系人',
  },
  {
    title: '访谈管理',
    icon: MessageSquareQuote,
    href: '/dashboard/interviews' as const,
    description: '管理访谈项目和记录',
  },
  // ==========================================
  // 其他菜单项（已隐藏，非人工提示不允许打开）
  // ==========================================
  // {
  //   title: 'AI编辑器',
  //   icon: Sparkles,
  //   description: 'AI辅助写作和编辑',
  //   items: [
  //     {
  //       title: '基础演示',
  //       href: '/dashboard/ai-editor-demo' as const,
  //       description: 'Tiptap 基础功能演示',
  //     },
  //     {
  //       title: 'Notion-like',
  //       href: '/dashboard/notion-editor' as const,
  //       description: 'Notion风格协作编辑器',
  //     },
  //     {
  //       title: '简洁版',
  //       href: '/dashboard/simple-ai-editor' as const,
  //       description: '精简实现演示',
  //     },
  //   ],
  // },
  // {
  //   title: '组件管理',
  //   icon: Box,
  //   href: '/dashboard/components' as const,
  //   description: '系统组件管理',
  // },
  // {
  //   title: '用户管理',
  //   icon: Users,
  //   href: '/dashboard/user-management' as const,
  //   description: '登录人员管理',
  // },
];

interface MainLayoutProps {
  children: ReactNode;
  showSidebar?: boolean;
  title?: string;
}

export default function MainLayout({
  children,
  showSidebar = false,
  title,
}: MainLayoutProps) {
  const { user, isAuthenticated, clearUser } = useUserStore();
  const router = useRouter();
  const pathname = usePathname();
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set());

  // 根据当前路径自动展开父菜单
  useEffect(() => {
    const autoExpandParentMenu = () => {
      // 遍历所有菜单项，找到包含当前路径的父菜单
      for (const item of menuItems) {
        if ('items' in item && Array.isArray(item.items)) {
          const subItems = item.items as Array<{ href: string }>;
          // 检查当前路径是否在该父菜单的子菜单中
          const hasActiveChild = subItems.some(
            (subItem) => subItem.href === pathname
          );

          if (hasActiveChild) {
            // 自动展开该父菜单
            setExpandedMenus((prev) => {
              const newSet = new Set(prev);
              if (!newSet.has(item.title)) {
                newSet.add(item.title);
              }
              return newSet;
            });
            break; // 找到一个后就停止
          }
        }
      }
    };

    autoExpandParentMenu();
  }, [pathname]); // 依赖pathname，当路径变化时自动执行

  // 切换菜单展开/折叠
  const toggleMenu = (menuTitle: string) => {
    setExpandedMenus((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(menuTitle)) {
        newSet.delete(menuTitle);
      } else {
        newSet.add(menuTitle);
      }
      return newSet;
    });
  };

  // 检查菜单是否应该展开
  const isMenuExpanded = (menuTitle: string) => {
    return expandedMenus.has(menuTitle);
  };

  // 检查菜单或子菜单是否激活
  const isMenuActive = (item: any) => {
    if (item.href === pathname) return true;
    if ('items' in item && Array.isArray(item.items)) {
      const subItems = item.items as Array<{ href: string }>;
      return subItems.some((subItem) => subItem.href === pathname);
    }
    return false;
  };

  const handleLogout = async () => {
    try {
      await userApi.logout();
    } finally {
      clearUser();
      router.push('/login');
    }
  };

  const getActiveMenuItemTitle = () => {
    // 检查主菜单项（仅检查有 href 的项）
    const item = menuItems.find(
      (item): item is typeof item & { href: string } =>
        'href' in item && item.href === pathname
    );
    if (item) return item.title;

    // 检查子菜单项
    for (const menuItem of menuItems) {
      if ('items' in menuItem && Array.isArray(menuItem.items)) {
        const subItems = menuItem.items as Array<{
          href: string;
          title: string;
        }>;
        const subItem = subItems.find((sub) => sub.href === pathname);
        if (subItem) return subItem.title;
      }
    }

    return PROJECT_NAME;
  };

  const AppHeader = () => {
    // Check if current page is login or signup
    const isAuthPage = pathname === '/login' || pathname === '/signup';

    return (
      <header className="h-16 border-b border-gray-200 bg-white/95 backdrop-blur-sm supports-[backdrop-filter]:bg-white/60 sticky top-0 z-50">
        <div className="flex h-full items-center justify-between px-6">
          {/* Left side - Logo and Title */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            {showSidebar && <SidebarTrigger className="-ml-1" />}
            <Link href="/" className="flex items-center space-x-2 sm:space-x-3">
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center">
                <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
              </div>
              <span className="text-base sm:text-xl font-semibold text-gray-900 hidden sm:block">
                {PROJECT_NAME}
              </span>
            </Link>
            {/* Show page title in header for sidebar pages */}
            {showSidebar && (
              <>
                <span className="text-gray-400 text-sm">|</span>
                <span className="text-base sm:text-lg text-gray-600 truncate max-w-[120px] sm:max-w-none">
                  {title || getActiveMenuItemTitle()}
                </span>
              </>
            )}
          </div>

          {/* Right side - Navigation and User */}
          <NoSSR
            fallback={
              <div className="flex items-center gap-4">
                <Button variant="outline" asChild>
                  <Link href="/login">登录</Link>
                </Button>
              </div>
            }
          >
            <div className="flex items-center gap-4">
              {/* TODO: CartButton temporarily disabled due to import issues */}
              {/* <CartButton variant="default" showCount={true} /> */}

              {/* Auth page toggle - show only on login/signup pages when not logged in */}
              {!isAuthenticated && isAuthPage && (
                <Button
                  variant="ghost"
                  asChild
                  className="hover:bg-primary/5 hover:border-primary hover:text-primary"
                >
                  <Link href={pathname === '/login' ? '/signup' : '/login'}>
                    {pathname === '/login' ? '注册' : '登录'}
                  </Link>
                </Button>
              )}

              {/* User menu */}
              {isAuthenticated ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="relative h-11 px-3 rounded-full border border-gray-200 hover:border-primary hover:bg-primary/5 transition-all duration-200 shadow-sm cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-gray-100 hover:bg-primary/10 rounded-lg flex items-center justify-center transition-colors duration-200">
                          <User className="w-4 h-4 text-gray-600 hover:text-primary transition-colors duration-200" />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-700 group-hover:text-primary transition-colors duration-200 username-text">
                            {user?.displayName || user?.username || '用户'}
                          </span>
                          <div className="w-5 h-5 flex items-center justify-center text-gray-400 group-hover:text-primary transition-colors duration-200">
                            <svg
                              width="12"
                              height="12"
                              viewBox="0 0 12 12"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M3 4.5L6 7.5L9 4.5"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    className="w-64 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 dropdown-content-pointer"
                    align="end"
                  >
                    <div className="px-4 py-3 border-b border-gray-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                          <User className="w-5 h-5 text-gray-600" />
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-gray-900 truncate">
                              {user?.displayName || user?.username || '用户'}
                            </p>
                            <div className="w-2 h-2 bg-green-500 rounded-full shrink-0 online-indicator"></div>
                          </div>
                          <p className="text-xs text-gray-500">在线</p>
                        </div>
                      </div>
                    </div>
                    <DropdownMenuSeparator className="dropdown-separator" />
                    <DropdownMenuItem asChild>
                      <Link
                        href="/api-docs"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center cursor-pointer hover:bg-primary/5 hover:text-primary transition-colors duration-200 rounded-md p-2 w-full"
                      >
                        <BookOpen className="mr-3 h-4 w-4 text-gray-400 group-hover:text-primary" />
                        <span className="text-sm">API 文档</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="dropdown-separator" />
                    {showSidebar ? (
                      <>
                        <DropdownMenuItem
                          className="cursor-pointer hover:bg-red-50 hover:text-red-600 transition-colors duration-200 rounded-md p-2 group"
                          onClick={handleLogout}
                        >
                          <LogOut className="mr-3 h-4 w-4 text-gray-400 group-hover:text-red-600" />
                          <span className="text-sm">退出登录</span>
                        </DropdownMenuItem>
                      </>
                    ) : (
                      <>
                        <DropdownMenuItem asChild>
                          <Link
                            href="/dashboard"
                            className="flex items-center cursor-pointer hover:bg-primary/5 hover:text-primary transition-colors duration-200 rounded-md p-2 w-full"
                          >
                            <Home className="mr-3 h-4 w-4 text-gray-400 group-hover:text-primary" />
                            <span className="text-sm">进入仪表板</span>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="dropdown-separator" />
                        <DropdownMenuItem
                          className="cursor-pointer hover:bg-red-50 hover:text-red-600 transition-colors duration-200 rounded-md p-2 group"
                          onClick={handleLogout}
                        >
                          <LogOut className="mr-3 h-4 w-4 text-gray-400 group-hover:text-red-600" />
                          <span className="text-sm">退出登录</span>
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                // Show login button on non-auth pages when not logged in
                !isAuthPage && (
                  <Button variant="outline" asChild>
                    <Link href="/login">登录</Link>
                  </Button>
                )
              )}
            </div>
          </NoSSR>
        </div>
      </header>
    );
  };

  const AppSidebar = () => (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-semibold text-gray-900">
            {PROJECT_NAME}
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3 py-4">
        <SidebarMenu className="space-y-1">
          {menuItems.map((item) => {
            // 有子菜单的项目
            if (
              'items' in item &&
              Array.isArray(item.items) &&
              item.items.length > 0
            ) {
              const expanded = isMenuExpanded(item.title);
              const active = isMenuActive(item);

              return (
                <div key={item.title}>
                  {/* 主菜单项（可点击展开） */}
                  <SidebarMenuButton
                    onClick={() => toggleMenu(item.title)}
                    className={`
                      h-12 px-4 py-3 rounded-lg transition-all duration-200 group cursor-pointer
                      ${
                        active
                          ? 'bg-primary/15 text-primary font-medium'
                          : 'hover:bg-primary/10 hover:text-primary'
                      }
                    `}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-3">
                        <item.icon
                          className={`w-4 h-4 transition-transform duration-200 ${expanded ? 'rotate-0' : ''}`}
                        />
                        <span className="text-sm font-medium">
                          {item.title}
                        </span>
                      </div>
                      <ChevronRight
                        className={`
                          w-4 h-4 transition-transform duration-200
                          ${expanded ? 'rotate-90' : ''}
                        `}
                      />
                    </div>
                  </SidebarMenuButton>

                  {/* 子菜单项 */}
                  {expanded && (
                    <div className="ml-4 mt-1 space-y-1">
                      {(
                        item.items as Array<{
                          title: string;
                          href: string;
                          icon?: any;
                        }>
                      ).map((subItem) => (
                        <SidebarMenuButton
                          key={subItem.title}
                          asChild
                          isActive={subItem.href === pathname}
                          className={`
                            h-10 px-4 py-2 rounded-lg transition-all duration-200 group cursor-pointer
                            ${
                              subItem.href === pathname
                                ? 'bg-primary/10 text-primary font-medium'
                                : 'hover:bg-primary/5 hover:text-primary text-gray-600'
                            }
                          `}
                        >
                          <Link
                            href={subItem.href}
                            className="flex items-center justify-between w-full"
                          >
                            <div className="flex items-center gap-3">
                              {subItem.icon && (
                                <subItem.icon className="w-3.5 h-3.5" />
                              )}
                              <span className="text-xs font-medium">
                                {subItem.title}
                              </span>
                            </div>

                            {/* 激活状态指示器 */}
                            {subItem.href === pathname && (
                              <div className="w-1 h-5 bg-primary rounded-full"></div>
                            )}
                          </Link>
                        </SidebarMenuButton>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            // 无子菜单的普通菜单项
            if (!('items' in item) || !item.items) {
              const href = (item as any).href;
              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={href === pathname}
                    className="h-12 px-4 py-3 rounded-lg hover:bg-primary/10 hover:text-primary data-[active=true]:bg-primary/15 data-[active=true]:text-primary data-[active=true]:font-medium transition-all duration-200 group cursor-pointer"
                  >
                    <Link
                      href={href || '#'}
                      className="flex items-center justify-between w-full"
                    >
                      <div className="flex items-center gap-3">
                        <item.icon className="w-4 h-4 transition-transform duration-200 group-hover:scale-110" />
                        <span className="text-sm font-medium">
                          {item.title}
                        </span>
                      </div>

                      {/* 激活状态指示器 */}
                      {href === pathname && (
                        <div className="w-1 h-6 bg-primary rounded-full"></div>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            }
          })}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="p-4 pt-0">
        <div className="space-y-2">
          <Button
            variant="ghost"
            size="lg"
            className="w-full justify-start h-11 px-4 text-red-500 hover:text-red-600 hover:bg-red-50 transition-all duration-200 group cursor-pointer"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 mr-3 transition-transform duration-200 group-hover:translate-x-1" />
            <span className="text-sm">退出登录</span>
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );

  // Landing page layout (no sidebar)
  if (!showSidebar) {
    return (
      <div className="min-h-screen flex flex-col">
        <AppHeader />
        <main className="flex-1 flex flex-col">{children}</main>
      </div>
    );
  }

  // Dashboard layout (with sidebar)
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex h-screen w-screen bg-gradient-to-br from-slate-50 to-blue-50 overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/10 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-cyan-100 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse"></div>
        </div>

        <div className="flex flex-col h-full w-full relative z-10">
          <AppHeader />
          <div className="flex flex-1 overflow-hidden">
            <AppSidebar />
            <SidebarInset className="bg-transparent m-0 min-h-0 overflow-auto">
              {children}
            </SidebarInset>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}
