'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface CartButtonProps {
  variant?: 'default' | 'minimal' | 'detailed';
  showCount?: boolean;
  className?: string;
}

export function CartButton({
  variant = 'default',
  showCount = true,
  className = '',
}: CartButtonProps) {
  const pathname = usePathname();

  // 简化状态获取，先让组件能正常工作
  const itemCount = 0; // 暂时硬编码
  const isEmpty = true;

  // 智能显示逻辑
  const shouldShow = () => {
    // 有商品时始终显示
    if (itemCount > 0) return true;

    // 餐厅页面显示
    if (pathname?.startsWith('/restaurant')) return true;

    // 其他情况隐藏
    return false;
  };

  if (!shouldShow()) {
    return null;
  }

  return (
    <Button
      variant={isEmpty ? 'outline' : 'default'}
      asChild
      className={`relative hover:scale-105 transition-all duration-200 ${className}`}
    >
      <Link href="/restaurant/cart" className="flex items-center gap-2">
        <ShoppingCart className="w-5 h-5" />
        {showCount && (
          <span className="hidden sm:inline">
            {isEmpty ? '购物车' : `${itemCount}件商品`}
          </span>
        )}
        {itemCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-2 -right-2 w-5 h-5 p-0 flex items-center justify-center text-xs font-bold animate-pulse"
          >
            {itemCount > 99 ? '99+' : itemCount}
          </Badge>
        )}
      </Link>
    </Button>
  );
}

export default CartButton;
