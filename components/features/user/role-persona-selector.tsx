'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Briefcase, FileText, Code, Users, Check } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useUserStore } from '@/stores/core/useUserStore';
import {
  UserRolePersona,
  getRolePersonaOptions,
} from '@/lib/constants/user-journey-config';

// 图标映射
const ICON_MAP = {
  Briefcase,
  FileText,
  Code,
  Users,
} as const;

interface RolePersonaSelectorProps {
  /** 选择完成后的回调 */
  onComplete?: () => void;
  /** 是否显示跳过按钮 */
  showSkip?: boolean;
  /** 是否显示标题 */
  showTitle?: boolean;
}

export function RolePersonaSelector({
  onComplete,
  showSkip = false,
  showTitle = true,
}: RolePersonaSelectorProps) {
  const router = useRouter();
  const { updateRolePersona, rolePersona } = useUserStore();
  const [selected, setSelected] = useState<UserRolePersona | null>(
    rolePersona || null
  );
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  // 等待 hydration 完成
  useEffect(() => {
    setMounted(true);
  }, []);

  const options = getRolePersonaOptions();

  const handleSelect = (roleId: UserRolePersona) => {
    setSelected(roleId);
  };

  const handleConfirm = async () => {
    if (!selected) return;

    setLoading(true);
    try {
      await updateRolePersona(selected);
      // 保存成功，调用回调或跳转
      if (onComplete) {
        onComplete();
      } else {
        router.push('/dashboard');
      }
    } catch (error) {
      // 处理401错误
      const axiosError = error as { response?: { status?: number } };
      if (axiosError.response?.status === 401) {
        router.push('/login?redirect=/dashboard/onboarding');
        return;
      }
      console.error('保存角色画像失败:', error);
      alert('保存失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    onComplete?.();
  };

  // 等待 hydration 完成，避免闪烁
  if (!mounted) {
    return (
      <div className="w-full max-w-4xl mx-auto">
        <div className="text-center py-8">加载中...</div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      {showTitle && (
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            选择您的角色画像
          </h2>
          <p className="text-gray-600">
            我们将根据您的角色为您定制访谈体验
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {options.map((option) => {
          const IconComponent = ICON_MAP[option.iconName];
          const isSelected = selected === option.id;

          return (
            <Card
              key={option.id}
              className={cn(
                'cursor-pointer transition-all duration-200 hover:shadow-md',
                isSelected
                  ? 'ring-2 ring-primary bg-primary/5'
                  : 'hover:border-gray-300'
              )}
              onClick={() => handleSelect(option.id)}
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div
                    className={cn(
                      'w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0',
                      isSelected ? 'bg-primary text-white' : 'bg-gray-100'
                    )}
                  >
                    <IconComponent className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">
                        {option.label}
                      </h3>
                      {isSelected && (
                        <Check className="w-5 h-5 text-primary" />
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {option.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex justify-center gap-4">
        {showSkip && (
          <Button variant="outline" onClick={handleSkip}>
            跳过
          </Button>
        )}
        <Button
          onClick={handleConfirm}
          disabled={!selected || loading}
          className="min-w-[120px]"
        >
          {loading ? '保存中...' : '确认选择'}
        </Button>
      </div>
    </div>
  );
}

export default RolePersonaSelector;
