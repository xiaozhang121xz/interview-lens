'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Briefcase, FileText, Code, Users, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUserStore } from '@/stores/core/useUserStore';
import {
  getUserJourneyConfig,
  UserRolePersona,
} from '@/lib/constants/user-journey-config';
import { JourneyStageCard } from './journey-stage-card';
import { cn } from '@/lib/utils';

// 图标映射
const ICON_MAP = {
  Briefcase,
  FileText,
  Code,
  Users,
} as const;

interface DynamicUserJourneyProps {
  className?: string;
}

export function DynamicUserJourney({ className }: DynamicUserJourneyProps) {
  const router = useRouter();
  const { rolePersona, fetchRolePersona, isAuthenticated } = useUserStore();

  // 获取角色画像（仅在已登录时）
  useEffect(() => {
    if (isAuthenticated && !rolePersona) {
      fetchRolePersona();
    }
  }, [rolePersona, fetchRolePersona, isAuthenticated]);

  // 默认使用 sales 角色
  const currentRole: UserRolePersona = rolePersona || 'sales';
  const config = getUserJourneyConfig(currentRole);
  const IconComponent = ICON_MAP[config.iconName];

  return (
    <div className={cn('w-full', className)}>
      {/* 角色标识 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <IconComponent className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{config.label}</h3>
            <p className="text-sm text-gray-600">{config.description}</p>
          </div>
        </div>
      </div>

      {/* 旅程三阶段 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <JourneyStageCard
          stage={config.stages.before}
          stageKey="before"
        />
        <JourneyStageCard
          stage={config.stages.during}
          stageKey="during"
        />
        <JourneyStageCard
          stage={config.stages.after}
          stageKey="after"
        />
      </div>

      {/* 访谈前提纲侧重 */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-medium text-gray-700 mb-2">
          AI 提纲生成侧重
        </h4>
        <div className="flex flex-wrap gap-2">
          {config.outlineFocus.map((focus, index) => (
            <span
              key={index}
              className="inline-flex items-center px-3 py-1 bg-white rounded-full text-sm text-gray-700 border border-gray-200"
            >
              {focus}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default DynamicUserJourney;