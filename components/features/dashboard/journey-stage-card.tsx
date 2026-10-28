'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, Sparkles, FileOutput, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { JourneyStageConfig } from '@/lib/constants/user-journey-config';

interface JourneyStageCardProps {
  stage: JourneyStageConfig;
  stageKey: 'before' | 'during' | 'after';
  className?: string;
}

const STAGE_ICONS = {
  before: Sparkles,
  during: Zap,
  after: FileOutput,
};

const STAGE_COLORS = {
  before: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    icon: 'text-blue-600',
    title: 'text-blue-900',
  },
  during: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    icon: 'text-green-600',
    title: 'text-green-900',
  },
  after: {
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    icon: 'text-purple-600',
    title: 'text-purple-900',
  },
};

export function JourneyStageCard({
  stage,
  stageKey,
  className,
}: JourneyStageCardProps) {
  const Icon = STAGE_ICONS[stageKey];
  const colors = STAGE_COLORS[stageKey];

  return (
    <Card
      className={cn(
        'h-full transition-all duration-200 hover:shadow-md',
        colors.border,
        className
      )}
    >
      <CardHeader className={cn('pb-3', colors.bg)}>
        <div className="flex items-center gap-3">
          <div className={cn('p-2 rounded-lg bg-white shadow-sm', colors.icon)}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <CardTitle className={cn('text-lg', colors.title)}>
              {stage.name}
            </CardTitle>
            <p className="text-sm text-gray-600">{stage.description}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        {/* 功能列表 */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">核心功能</h4>
          <div className="flex flex-wrap gap-2">
            {stage.features.map((feature, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {feature}
              </Badge>
            ))}
          </div>
        </div>

        {/* AI 动作 */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">AI 能力</h4>
          <ul className="space-y-1">
            {stage.aiActions.map((action, index) => (
              <li
                key={index}
                className="flex items-center gap-2 text-sm text-gray-600"
              >
                <ChevronRight className="w-4 h-4 text-primary" />
                {action}
              </li>
            ))}
          </ul>
        </div>

        {/* 输出物 */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">输出成果</h4>
          <div className="flex flex-wrap gap-2">
            {stage.outputs.map((output, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-xs text-gray-700"
              >
                <FileOutput className="w-3 h-3" />
                {output}
              </span>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default JourneyStageCard;