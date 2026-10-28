'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sparkles,
  Construction,
  Clock,
  Bell,
  Eye,
  Calendar,
  TrendingUp,
  Users,
  MessageCircle,
  ExternalLink,
} from 'lucide-react';

// 占位页面类型
export type PlaceholderType =
  | 'development'
  | 'coming-soon'
  | 'maintenance'
  | 'permission-required';

// 占位页面配置
const placeholderConfig: Record<
  PlaceholderType,
  {
    title: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    iconColor: string;
    status: string;
    badgeVariant: 'default' | 'secondary' | 'outline' | 'destructive';
    actions?: Array<{
      label: string;
      icon: React.ComponentType<{ className?: string }>;
      action: () => void;
    }>;
  }
> = {
  development: {
    title: '功能开发中',
    description: '此功能正在积极开发中，即将为您带来更好的体验',
    icon: Construction,
    iconColor: 'text-primary',
    status: '开发中',
    badgeVariant: 'default',
    actions: [
      {
        label: '了解详情',
        icon: Eye,
        action: () => {
          // 可以打开功能介绍或文档
          console.log('查看功能详情');
        },
      },
      {
        label: '通知我',
        icon: Bell,
        action: () => {
          // 可以实现通知订阅功能
          alert('功能上线时将通知您');
        },
      },
    ],
  },
  'coming-soon': {
    title: '即将上线',
    description: '此功能即将上线，敬请期待',
    icon: Clock,
    iconColor: 'text-green-600',
    status: '即将上线',
    badgeVariant: 'secondary',
    actions: [
      {
        label: '预约通知',
        icon: Calendar,
        action: () => {
          alert('功能上线时将第一时间通知您');
        },
      },
    ],
  },
  maintenance: {
    title: '维护中',
    description: '此功能正在维护中，请稍后再试',
    icon: Construction,
    iconColor: 'text-orange-600',
    status: '维护中',
    badgeVariant: 'outline',
  },
  'permission-required': {
    title: '需要权限',
    description: '此功能需要特定权限才能访问',
    icon: Users,
    iconColor: 'text-purple-600',
    status: '权限受限',
    badgeVariant: 'outline',
    actions: [
      {
        label: '申请权限',
        icon: MessageCircle,
        action: () => {
          alert('请联系管理员申请访问权限');
        },
      },
    ],
  },
};

// 功能信息配置
const featureInfo: Record<
  string,
  {
    type: PlaceholderType;
    description?: string;
    progress?: string;
    estimatedRelease?: string;
  }
> = {
  '/dashboard/templates': {
    type: 'development',
    description: '提供丰富的代码模板库，支持多种编程语言和框架',
    progress: '开发进度: 60%',
    estimatedRelease: '预计2周内上线',
  },
  '/dashboard/projects': {
    type: 'coming-soon',
    description: '管理您的项目文件，支持版本控制和团队协作',
    estimatedRelease: '预计本月下旬上线',
  },
  '/dashboard/analytics': {
    type: 'development',
    description: '详细的数据分析和性能报告功能',
    progress: '开发进度: 40%',
    estimatedRelease: '预计3周内上线',
  },
  '/dashboard/knowledge': {
    type: 'coming-soon',
    description: '知识库和文档管理，支持快速检索和分类管理',
    estimatedRelease: '预计下月上线',
  },
  '/dashboard/automation': {
    type: 'development',
    description: '自动化工作流配置，提升开发效率',
    progress: '开发进度: 25%',
    estimatedRelease: '预计1个月内上线',
  },
  '/dashboard/team': {
    type: 'permission-required',
    description: '团队协作和成员管理功能',
  },
};

interface PlaceholderContentProps {
  title: string;
  type?: PlaceholderType;
  customDescription?: string;
  showActions?: boolean;
}

export function PlaceholderContent({
  title,
  type = 'development',
  customDescription,
  showActions = true,
}: PlaceholderContentProps) {
  const config = placeholderConfig[type];
  const Icon = config.icon;

  return (
    <div className="space-y-6">
      <Card className="bg-white/80 backdrop-blur-sm border-gray-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center ${config.iconColor}/10`}
              >
                <Icon className={`w-6 h-6 ${config.iconColor}`} />
              </div>
              <div>
                <CardTitle className="text-gray-900 flex items-center gap-2">
                  {title}
                  <Badge variant={config.badgeVariant} className="text-xs">
                    {config.status}
                  </Badge>
                </CardTitle>
                <CardDescription className="text-gray-600 mt-1">
                  {customDescription || config.description}
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>

        {showActions && config.actions && (
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-3">
              {config.actions.map((action, index) => {
                const ActionIcon = action.icon;
                return (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={action.action}
                    className="hover:bg-primary/5 hover:border-primary hover:text-primary"
                  >
                    <ActionIcon className="w-4 h-4 mr-2" />
                    {action.label}
                  </Button>
                );
              })}
            </div>
          </CardContent>
        )}
      </Card>

      {/* 功能进度卡片 */}
      {type === 'development' && (
        <Card className="bg-gradient-to-r from-blue-50 to-transparent border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-gray-900">开发进度</h3>
            </div>
            <div className="space-y-2">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: '60%' }}
                ></div>
              </div>
              <p className="text-sm text-gray-600">开发进度: 60%</p>
              <p className="text-xs text-gray-500">预计2周内上线</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 相关功能推荐 */}
      <Card className="bg-gradient-to-r from-purple-50 to-transparent border-purple-200">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <h3 className="font-semibold text-gray-900">推荐功能</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
              <div>
                <h4 className="font-medium text-gray-900">组件管理</h4>
                <p className="text-sm text-gray-600">
                  查看和管理 shadcn/ui 组件
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="hover:bg-purple-50 hover:text-purple-600"
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
              <div>
                <h4 className="font-medium text-gray-900">系统概览</h4>
                <p className="text-sm text-gray-600">查看系统整体状态和统计</p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="hover:bg-purple-50 hover:text-purple-600"
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// 智能占位组件 - 根据路径自动判断
export function SmartPlaceholder({ pathname }: { pathname: string }) {
  const feature = featureInfo[pathname];

  if (!feature) {
    return <PlaceholderContent title="未知功能" type="development" />;
  }

  return (
    <PlaceholderContent
      title={getFeatureTitle(pathname)}
      type={feature.type}
      customDescription={feature.description}
    />
  );
}

// 根据路径获取功能标题
function getFeatureTitle(pathname: string): string {
  const pathSegments = pathname.split('/');
  const currentPath = pathSegments[pathSegments.length - 1];

  const titles: Record<string, string> = {
    templates: '代码模板',
    projects: '项目管理',
    analytics: '数据分析',
    knowledge: '知识库',
    automation: '自动化工作流',
    team: '团队协作',
  };

  return titles[currentPath] || '功能';
}
