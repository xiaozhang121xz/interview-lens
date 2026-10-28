'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useUserStore } from '@/stores/core/useUserStore';
import {
  UserRolePersona,
  getRolePersonaOptions,
} from '@/lib/constants/user-journey-config';
import { Loader2, Briefcase, FileText, Code, Users } from 'lucide-react';

// 图标映射
const ICON_MAP = {
  Briefcase,
  FileText,
  Code,
  Users,
} as const;

interface RolePersonaSelectProps {
  /** 保存成功后的回调 */
  onSuccess?: () => void;
  /** 保存失败后的回调 */
  onError?: (error: Error) => void;
  /** 触发器宽度类名 */
  triggerClassName?: string;
}

/**
 * 角色画像下拉选择组件
 *
 * 用于设置页面，支持即时保存到后端
 */
export function RolePersonaSelect({
  onSuccess,
  onError,
  triggerClassName = 'w-[200px]',
}: RolePersonaSelectProps) {
  const router = useRouter();
  const { rolePersona, updateRolePersona } = useUserStore();
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [localValue, setLocalValue] = useState<UserRolePersona | null>(null);

  // 等待 hydration 完成
  useEffect(() => {
    setMounted(true);
  }, []);

  // 同步 store 中的值到本地状态
  useEffect(() => {
    if (mounted && rolePersona) {
      setLocalValue(rolePersona);
    }
  }, [mounted, rolePersona]);

  const options = getRolePersonaOptions();

  const handleValueChange = async (value: string) => {
    const selectedRole = value as UserRolePersona;

    setLoading(true);
    setLocalValue(selectedRole);

    try {
      await updateRolePersona(selectedRole);
      onSuccess?.();
    } catch (error) {
      // 恢复之前的值
      setLocalValue(rolePersona);

      // 处理401错误
      const axiosError = error as { response?: { status?: number } };
      if (axiosError.response?.status === 401) {
        router.push('/login?redirect=/dashboard');
        return;
      }

      console.error('保存角色画像失败:', error);
      onError?.(error instanceof Error ? error : new Error('保存失败'));
    } finally {
      setLoading(false);
    }
  };

  // 等待 hydration 完成，避免闪烁
  if (!mounted) {
    return (
      <Select disabled>
        <SelectTrigger className={triggerClassName}>
          <SelectValue placeholder="加载中..." />
        </SelectTrigger>
      </Select>
    );
  }

  // 获取当前选中角色的显示信息
  const selectedOption = localValue
    ? options.find((opt) => opt.id === localValue)
    : null;

  return (
    <Select
      value={localValue || undefined}
      onValueChange={handleValueChange}
      disabled={loading}
    >
      <SelectTrigger className={triggerClassName}>
        {loading ? (
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>保存中...</span>
          </div>
        ) : (
          <SelectValue placeholder="选择角色画像">
            {selectedOption && (
              <div className="flex items-center gap-2">
                {(() => {
                  const IconComponent = ICON_MAP[selectedOption.iconName];
                  return <IconComponent className="h-4 w-4" />;
                })()}
                <span>{selectedOption.label}</span>
              </div>
            )}
          </SelectValue>
        )}
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => {
          const IconComponent = ICON_MAP[option.iconName];
          return (
            <SelectItem key={option.id} value={option.id}>
              <div className="flex items-center gap-2">
                <IconComponent className="h-4 w-4" />
                <span>{option.label}</span>
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}

export default RolePersonaSelect;
