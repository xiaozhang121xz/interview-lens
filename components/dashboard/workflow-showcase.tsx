'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Lightbulb,
  MessageCircle,
  ListTodo,
  Code,
  TestTube,
  CheckCircle2,
  ShieldCheck,
  Clock,
  User,
  Zap,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Database,
  Layout,
  Bug,
  FileCheck,
  Cpu,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PROJECT_NAME } from '@/lib/config/project';

// 角色数据类型
interface Role {
  name: string;
  stages: string[];
  color: string;
  icon: React.ComponentType<{ className?: string }>;
  mcpUsage: string[];
  skillUsage: Array<{
    skill: string;
    scenarios: string[];
  }>;
  description: string;
}
interface WorkflowStage {
  id: number;
  name: string;
  nameEn: string;
  icon: typeof Lightbulb;
  executor: string;
  time: string;
  description: string;
  color: string;
  tasks: string[];
  outputs: string[];
}

// 工作流阶段配置
const workflowStages: WorkflowStage[] = [
  {
    id: 1,
    name: '需求规划',
    nameEn: 'Plan',
    icon: Lightbulb,
    executor: '需求专家',
    time: '~5分钟',
    description: '分析需求可行性，识别技术栈要求，设计用户旅程，定义闭合率目标≥90%',
    color: 'blue',
    tasks: [
      '分析需求可行性',
      '识别技术栈要求',
      '评估POC原则符合性',
      '设计用户旅程⭐（核心）',
      '定义闭合率目标≥90%',
    ],
    outputs: ['plan.md', 'user-journeys.md'],
  },
  {
    id: 2,
    name: '需求澄清',
    nameEn: 'Clarify',
    icon: MessageCircle,
    executor: '需求专家',
    time: '~10-15分钟',
    description: '最多5轮交互式澄清，POC原则合规性检查，确认数据结构和功能边界',
    color: 'cyan',
    tasks: [
      '最多5轮交互式澄清',
      'POC原则合规性检查（重要）',
      '确认是否需要权限系统',
      '确认是否需要数据库',
      '确认数据结构',
      '确认功能边界',
    ],
    outputs: ['active-bridge.md', '更新后的 plan.md'],
  },
  {
    id: 3,
    name: '任务拆解',
    nameEn: 'Tasks',
    icon: ListTodo,
    executor: '架构专家',
    time: '~15-20分钟',
    description: '拆解任务（≤6h），定义API契约（RESTful规范），规划串行开发策略',
    color: 'purple',
    tasks: [
      '拆解任务（单个≤6小时）',
      '定义API契约（⭐符合RESTful规范）',
      '每个接口包含成功标准',
      '包含完整Zod Schema定义',
      '确定优先级和依赖',
      '规划串行开发策略',
      '拆解导航任务（⭐P0优先级）',
    ],
    outputs: ['tasks.md', 'spec-api.md'],
  },
  {
    id: 4,
    name: '开发执行',
    nameEn: 'Dev',
    icon: Code,
    executor: 'Backend → Frontend',
    time: '~2-4小时',
    description: '串行开发：后端→OpenAPI→Swagger测试→前端，ralph-loop自动调度',
    color: 'orange',
    tasks: [
      '后端：实现所有API端点（ralph-loop）',
      '后端：添加完整JSDoc注释',
      '后端：强制自检（TS+Build+API测试）',
      'OpenAPI：生成openapi.json',
      '前端：基于openapi.json实现UI',
      '前端：实现导航功能（返回按钮）⭐',
    ],
    outputs: [
      '功能代码',
      'component-decisions.md',
      'public/openapi.json',
    ],
  },
  {
    id: 5,
    name: 'OpenAPI文档',
    nameEn: 'OpenAPI',
    icon: FileCheck,
    executor: '后端专家',
    time: '~10分钟',
    description: '扫描所有API路由，检查JSDoc注释完整性，生成openapi.json',
    color: 'green',
    tasks: [
      '扫描所有API路由',
      '检查JSDoc注释完整性',
      '同步JSDoc与代码实现',
      '生成public/openapi.json',
      '验证Swagger UI可加载',
    ],
    outputs: ['public/openapi.json', 'openapi-generation.log'],
  },
  {
    id: 6,
    name: '测试执行',
    nameEn: 'Test',
    icon: TestTube,
    executor: '测试专家',
    time: '~30-60分钟',
    description: '两类测试：功能测试+导航测试（P0强制），ralph-loop自动调度',
    color: 'red',
    tasks: [
      '后端：Swagger UI手动测试',
      '前端：编写E2E测试用例',
      '区分两类测试⭐（功能+导航）',
      '编写导航测试（⭐P0强制）',
      '运行Playwright测试',
      '统计E2E覆盖率≥90%',
      '计算闭合率≥90%',
    ],
    outputs: [
      'swagger-test-report.md',
      'playwright-test-report.md',
    ],
  },
  {
    id: 7,
    name: '覆盖率检查',
    nameEn: 'Verification',
    icon: CheckCircle2,
    executor: '架构专家',
    time: '~15-20分钟',
    description: '检查E2E覆盖率≥90%和闭合率≥90%，自动返工机制',
    color: 'green',
    tasks: [
      '检查E2E覆盖率≥90%?',
      '检查闭合率≥90%?',
      '运行验证脚本',
      'alt 不达标 → 自动触发返工',
    ],
    outputs: ['验证通过确认'],
  },
  {
    id: 8,
    name: '质量审计',
    nameEn: 'QA',
    icon: ShieldCheck,
    executor: 'QA专家',
    time: '~20-30分钟',
    description: 'API契约完整性检查+用户旅程闭环完整性验收（最终关卡）',
    color: 'indigo',
    tasks: [
      'API契约完整性检查⭐（统计+验证）',
      '用户旅程闭环完整性验收⭐（手动验证）',
      '构建验证（npm run build）',
      '启动开发服务器验证',
      '撰写qa-report.md',
    ],
    outputs: ['qa-report.md'],
  },
];

// 角色分工数据
const roles: Role[] = [
  {
    name: '需求专家',
    stages: ['Plan', 'Clarify'],
    color: 'from-blue-50 to-blue-100/50 border-blue-200 hover:border-blue-400',
    icon: Lightbulb,
    mcpUsage: [],
    skillUsage: [],
    description:
      '专注于需求分析和规划。核心能力:需求模糊时的结构化分析、用户旅程设计（闭合率≥90%）、功能优先级评估和ROI分析、POC原则合规性检查、业务需求与技术实现衔接',
  },
  {
    name: '架构专家',
    stages: ['Tasks', 'Dev', 'Verification'],
    color:
      'from-purple-50 to-purple-100/50 border-purple-200 hover:border-purple-400',
    icon: Zap,
    mcpUsage: [
      'shadcn-mcp: 查询现有组件库',
      'next-devtools: 分析路由结构和项目架构',
    ],
    skillUsage: [],
    description:
      '负责整体架构设计、任务拆解、质量把关和多专家协作协调。核心能力:复杂功能需求拆解、多专家协作协调、串行开发策略规划、API契约设计和维护（RESTful规范）、Verification阶段自动返工协调',
  },
  {
    name: 'Backend专家',
    stages: ['Dev', 'OpenAPI'],
    color:
      'from-orange-50 to-orange-100/50 border-orange-200 hover:border-orange-400',
    icon: Database,
    mcpUsage: ['next-devtools: Next.js后端问题诊断和性能优化'],
    skillUsage: [],
    description:
      '专注于后端开发。核心能力:RESTful API设计与实现、DataManager模式实现、API契约(spec-api.md)遵循、JSDoc注释完整性、OpenAPI文档生成、后端性能优化',
  },
  {
    name: 'Frontend专家',
    stages: ['Dev'],
    color: 'from-cyan-50 to-cyan-100/50 border-cyan-200 hover:border-cyan-400',
    icon: Layout,
    mcpUsage: ['shadcn-mcp: 查询和添加UI组件'],
    skillUsage: [
      {
        skill: 'component-library-guide',
        scenarios: ['查询现有可复用组件', '组件选择决策', '避免重复开发'],
      },
      {
        skill: 'ui-ux-pro-max',
        scenarios: ['复杂UI设计', '响应式布局实现', '交互动效设计'],
      },
    ],
    description:
      '专注于前端开发。核心能力:React/Next.js组件开发、TypeScript类型问题解决、UI/UX实现与优化、基于openapi.json开发、导航功能实现（返回按钮⭐P0）、前端性能优化',
  },
  {
    name: '测试专家',
    stages: ['Test'],
    color: 'from-red-50 to-red-100/50 border-red-200 hover:border-red-400',
    icon: Bug,
    mcpUsage: [],
    skillUsage: [],
    description:
      '专注于测试工作。核心能力:后端Swagger UI手动测试、前端Playwright E2E测试实现、区分两类测试（功能测试+导航测试⭐P0强制）、测试覆盖率分析（≥90%）、闭合率计算（≥90%）、自动化测试脚本开发',
  },
  {
    name: 'QA专家',
    stages: ['QA'],
    color:
      'from-indigo-50 to-indigo-100/50 border-indigo-200 hover:border-indigo-400',
    icon: FileCheck,
    mcpUsage: [],
    skillUsage: [],
    description:
      '负责质量审计和最终验收（最终关卡）。核心能力:API契约完整性检查（100%实现）、用户旅程闭环完整性验收（闭合率≥90%）、代码质量检查、功能完整性验证、构建验证、QA报告撰写。拥有任务关闭的最终否决权',
  },
];

// 颜色映射（简化版）
const colorMap = {
  blue: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-700',
    icon: 'text-blue-600',
    line: 'bg-blue-500',
  },
  cyan: {
    bg: 'bg-cyan-50',
    border: 'border-cyan-200',
    text: 'text-cyan-700',
    icon: 'text-cyan-600',
    line: 'bg-cyan-500',
  },
  purple: {
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    text: 'text-purple-700',
    icon: 'text-purple-600',
    line: 'bg-purple-500',
  },
  orange: {
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    text: 'text-orange-700',
    icon: 'text-orange-600',
    line: 'bg-orange-500',
  },
  red: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-700',
    icon: 'text-red-600',
    line: 'bg-red-500',
  },
  green: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-700',
    icon: 'text-green-600',
    line: 'bg-green-500',
  },
  indigo: {
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
    text: 'text-indigo-700',
    icon: 'text-indigo-600',
    line: 'bg-indigo-500',
  },
};

// 网格卡片组件
interface GridCardProps {
  stage: WorkflowStage;
  isExpanded: boolean;
  onToggle: () => void;
}

function GridCard({ stage, isExpanded, onToggle }: GridCardProps) {
  const Icon = stage.icon;
  const colors = colorMap[stage.color as keyof typeof colorMap];

  return (
    <div
      className={cn('relative group', isExpanded && 'col-span-full row-span-2')}
    >
      {/* 阶段卡片 */}
      <Card
        className={cn(
          'h-full transition-all duration-300 cursor-pointer',
          'border-2 hover:shadow-xl hover:-translate-y-1',
          colors.bg,
          colors.border,
          'hover:border-opacity-80',
          isExpanded && 'ring-2 ring-offset-2 ring-primary shadow-lg',
          'flex flex-col'
        )}
        onClick={onToggle}
      >
        <CardHeader className="pb-3 flex-shrink-0">
          <div className="flex items-start gap-3">
            {/* 图标圆圈 */}
            <div
              className={cn(
                'flex items-center justify-center w-12 h-12 rounded-full border-2 shrink-0',
                colors.border,
                'bg-white shadow-sm',
                'group-hover:shadow-md transition-shadow duration-300'
              )}
            >
              <Icon className={cn('w-5 h-5', colors.icon)} />
            </div>

            {/* 标题区域 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <CardTitle className="text-base font-semibold text-gray-900">
                  {stage.id}. {stage.name}
                </CardTitle>
                <Badge
                  variant="outline"
                  className={cn('text-xs shrink-0', colors.text, colors.border)}
                >
                  {stage.nameEn}
                </Badge>
              </div>
              <CardDescription className="text-sm text-gray-600 line-clamp-2">
                {stage.description}
              </CardDescription>
            </div>

            {/* 展开/收起按钮 */}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 shrink-0 hover:bg-white/60"
              onClick={(e) => {
                e.stopPropagation();
                onToggle();
              }}
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-3 flex-1 flex flex-col">
          {/* 执行者和时间 */}
          <div className="flex items-center gap-4 text-sm flex-shrink-0">
            <div className="flex items-center gap-1.5 text-gray-600">
              <User className="w-3.5 h-3.5" />
              <span className="font-medium">{stage.executor}</span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-600">
              <Clock className="w-3.5 h-3.5" />
              <span>{stage.time}</span>
            </div>
          </div>

          {/* 展开的详细信息 */}
          {isExpanded && (
            <div className="space-y-3 pt-3 border-t border-gray-200/60 animate-in fade-in slide-in-from-top-2 duration-300 flex-1">
              {/* 核心任务 */}
              <div>
                <h4 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                  <ListTodo className="w-3.5 h-3.5" />
                  核心任务
                </h4>
                <ul className="space-y-1.5">
                  {stage.tasks.map((task, index) => (
                    <li
                      key={index}
                      className="text-xs text-gray-600 flex items-start gap-2"
                    >
                      <span className={cn('mt-0.5', colors.icon)}>•</span>
                      <span>{task}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* 输出物 */}
              <div>
                <h4 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                  <ArrowRight className="w-3.5 h-3.5" />
                  输出物
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {stage.outputs.map((output, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="text-xs bg-white/60 border-gray-200 text-gray-700"
                    >
                      {output}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// 角色卡片组件
interface RoleCardProps {
  role: Role;
  isExpanded: boolean;
  onToggle: () => void;
}

function RoleCard({ role, isExpanded, onToggle }: RoleCardProps) {
  const Icon = role.icon;

  return (
    <div className="group">
      <Card
        className={cn(
          'h-full transition-all duration-300 cursor-pointer',
          'border-2 hover:shadow-xl hover:-translate-y-1',
          'bg-gradient-to-br',
          role.color,
          'hover:border-opacity-80',
          isExpanded && 'ring-2 ring-offset-2 ring-primary shadow-lg',
          'flex flex-col'
        )}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggle();
          }
        }}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
      >
        <CardHeader className="pb-3 flex-shrink-0">
          <div className="flex items-start gap-3">
            {/* 图标圆圈 */}
            <div
              className={cn(
                'flex items-center justify-center w-12 h-12 rounded-full border-2 shrink-0',
                'bg-white shadow-sm',
                'group-hover:shadow-md transition-shadow duration-300'
              )}
            >
              <Icon className="w-5 h-5 text-gray-700" />
            </div>

            {/* 标题区域 */}
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base font-semibold text-gray-900 mb-1">
                {role.name}
              </CardTitle>
              <div className="flex items-center gap-1.5 flex-wrap">
                {role.stages.map((stage, stageIndex) => (
                  <Badge
                    key={stageIndex}
                    variant="secondary"
                    className="text-xs bg-white/60 border-gray-200 text-gray-700"
                  >
                    {stage}
                  </Badge>
                ))}
              </div>
            </div>

            {/* 展开/收起按钮 */}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 shrink-0 hover:bg-white/60"
              onClick={(e) => {
                e.stopPropagation();
                onToggle();
              }}
              aria-label={isExpanded ? '收起详情' : '展开详情'}
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-3 flex-1 flex flex-col">
          {/* 角色描述 */}
          <p className="text-sm text-gray-700 leading-relaxed">
            {role.description}
          </p>

          {/* 展开的详细信息 */}
          {isExpanded && (
            <div className="space-y-3 pt-3 border-t border-gray-200/60 animate-in fade-in slide-in-from-top-2 duration-300 flex-1">
              {/* MCP使用场景 */}
              {role.mcpUsage.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-900 mb-2 flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5" />
                    MCP工具使用
                  </h4>
                  <ul className="space-y-1.5">
                    {role.mcpUsage.map((usage, index) => (
                      <li
                        key={index}
                        className="text-xs text-gray-600 flex items-start gap-2"
                      >
                        <span className="text-primary mt-0.5">•</span>
                        <span>{usage}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Skill使用场景 */}
              {role.skillUsage.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-900 mb-2 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5" />
                    Skill技能调用
                  </h4>
                  <div className="space-y-2">
                    {role.skillUsage.map((skill, index) => (
                      <div
                        key={index}
                        className="bg-white/50 rounded-lg p-2 border border-gray-200/60"
                      >
                        <div className="text-xs font-semibold text-gray-900 mb-1.5 font-mono">
                          {skill.skill}
                        </div>
                        <ul className="space-y-1">
                          {skill.scenarios.map((scenario, scenarioIndex) => (
                            <li
                              key={scenarioIndex}
                              className="text-xs text-gray-600 flex items-start gap-2"
                            >
                              <span className="text-primary mt-0.5">-</span>
                              <span>{scenario}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// 主工作流展示组件
export function WorkflowShowcase() {
  const [expandedStages, setExpandedStages] = useState<Set<number>>(new Set());
  const [expandedRoles, setExpandedRoles] = useState<Set<number>>(new Set());

  const toggleStage = (id: number) => {
    setExpandedStages((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const toggleAll = () => {
    if (expandedStages.size === workflowStages.length) {
      // 当前全部展开，收起所有
      setExpandedStages(new Set());
    } else {
      // 否则展开所有
      setExpandedStages(new Set(workflowStages.map((s) => s.id)));
    }
  };

  const isAllExpanded = expandedStages.size === workflowStages.length;

  const toggleRole = (index: number) => {
    setExpandedRoles((prev) => {
      // 如果当前有展开的,则全部关闭
      if (prev.size > 0) {
        return new Set();
      }
      // 如果当前没有展开的,则全部展开
      return new Set(roles.map((_, i) => i));
    });
  };

  const toggleAllRoles = () => {
    if (expandedRoles.size === roles.length) {
      // 当前全部展开，收起所有
      setExpandedRoles(new Set());
    } else {
      // 否则展开所有
      setExpandedRoles(new Set(roles.map((_, index) => index)));
    }
  };

  const isAllRolesExpanded = expandedRoles.size === roles.length;

  return (
    <div className="space-y-6 w-full">
      {/* 🎨 标题模块 - Aurora Hero Style */}
      <div className="relative overflow-hidden rounded-2xl">
        {/* 动态渐变背景 */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 animate-gradient-x" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />

        {/* 毛玻璃容器 */}
        <div className="relative bg-white/60 backdrop-blur-md border border-white/40 rounded-2xl p-4 md:p-5 shadow-lg">
          <div className="relative z-10">
            {/* 主标题区域 */}
            <div className="text-center space-y-3">
              {/* 团队徽章 */}
              <div className="flex justify-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transition-all duration-300 cursor-pointer">
                  <Zap className="w-4 h-4 text-white animate-pulse" />
                  <span className="text-sm font-semibold text-white tracking-wide">
                    {PROJECT_NAME}
                  </span>
                </div>
              </div>

              {/* 主标题 */}
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent leading-tight">
                欢迎使用智能AI编码助手
              </h1>

              {/* 引导语 */}
              <p className="text-base text-gray-600 max-w-2xl mx-auto leading-relaxed">
                让我们开始今天的开发之旅
              </p>
            </div>
          </div>

          {/* 装饰性光晕 */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-blue-400/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-400/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        </div>
      </div>

      {/* 工作流时序图 */}
      <Card className="bg-white/80 backdrop-blur-sm border-gray-200">
        <CardHeader>
          <CardTitle className="text-lg">AI Coding自动化工作流时序图</CardTitle>
          <CardDescription>
            8阶段自动化工作流的完整交互流程，展示各角色之间的协作关系和通信机制
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="w-full">
            <Image
              src="/images/workflow-timeline.svg"
              alt="8阶段自动化工作流时序图"
              width={1200}
              height={1000}
              className="w-full h-auto"
              priority
            />
          </div>
        </CardContent>
      </Card>

      {/* 8阶段自动化工作流 - 统一样式 */}
      <Card className="bg-white/80 backdrop-blur-sm border-gray-200">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg">8阶段自动化工作流</CardTitle>
              <CardDescription className="mt-1">
                从需求到质量验收的完整开发闭环，通过串行开发、契约优先、测试驱动的方式，确保高质量代码交付。核心指标：E2E覆盖率≥90% + 用户旅程闭合率≥90%
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleAll}
                className="gap-2 bg-white hover:bg-indigo-50 border-indigo-200 hover:border-indigo-300 text-indigo-700 hover:text-indigo-800 transition-all duration-200 shadow-sm hover:shadow"
              >
                {isAllExpanded ? (
                  <>
                    <ChevronUp className="w-4 h-4 transition-transform duration-200" />
                    <span className="hidden sm:inline">收起全部</span>
                    <span className="sm:hidden">收起</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4 transition-transform duration-200" />
                    <span className="hidden sm:inline">展开全部</span>
                    <span className="sm:hidden">展开</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* 网格卡片布局 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-fr">
            {workflowStages.map((stage) => (
              <GridCard
                key={stage.id}
                stage={stage}
                isExpanded={expandedStages.has(stage.id)}
                onToggle={() => toggleStage(stage.id)}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 核心角色 */}
      <Card className="bg-white/80 backdrop-blur-sm border-gray-200">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg">核心角色</CardTitle>
              <CardDescription className="mt-1">
                AI Agent核心角色,各司其职,协同完成高质量代码交付
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleAllRoles}
                className="gap-2 bg-white hover:bg-indigo-50 border-indigo-200 hover:border-indigo-300 text-indigo-700 hover:text-indigo-800 transition-all duration-200 shadow-sm hover:shadow"
              >
                {isAllRolesExpanded ? (
                  <>
                    <ChevronUp className="w-4 h-4 transition-transform duration-200" />
                    <span className="hidden sm:inline">收起全部</span>
                    <span className="sm:hidden">收起</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4 transition-transform duration-200" />
                    <span className="hidden sm:inline">展开全部</span>
                    <span className="sm:hidden">展开</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* 网格卡片布局 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {roles.map((role, index) => (
              <RoleCard
                key={index}
                role={role}
                isExpanded={expandedRoles.has(index)}
                onToggle={() => toggleRole(index)}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 工作流核心机制 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Plan版本管理机制 */}
        <Card className="bg-gradient-to-br from-blue-50/90 via-blue-50/50 to-transparent backdrop-blur-sm border border-blue-200/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-600" />
              Plan版本管理机制
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">版本隔离策略</h4>
              <ul className="space-y-1 text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>
                    每个Plan独立目录:{' '}
                    <code className="text-xs bg-blue-100 px-1 rounded">
                      .az/plan-年月日时分/
                    </code>
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>
                    完整通信层:{' '}
                    <code className="text-xs bg-blue-100 px-1 rounded">
                      communication/
                    </code>
                    统一管理
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>
                    时间戳自动记录:{' '}
                    <code className="text-xs bg-blue-100 px-1 rounded">
                      .timestamps.json
                    </code>
                  </span>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">核心文档清单</h4>
              <ul className="space-y-1 text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-semibold">1</span>
                  <span>
                    <code className="text-xs">plan.md</code> - 需求规划文档
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-semibold">2</span>
                  <span>
                    <code className="text-xs">tasks.md</code> - 任务看板
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-semibold">3</span>
                  <span>
                    <code className="text-xs">spec-api.md</code> - API契约
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-semibold">4</span>
                  <span>
                    <code className="text-xs">qa-report.md</code> - 质量报告
                  </span>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">
                communication/目录结构
              </h4>
              <ul className="space-y-1 text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>
                    <code className="text-xs bg-blue-100 px-1 rounded">
                      context.md
                    </code>{' '}
                    - 全局规范、技术栈约束
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>
                    <code className="text-xs bg-blue-100 px-1 rounded">
                      active-bridge.md
                    </code>{' '}
                    - 协同便签 + 测试结果
                  </span>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">
                Plan版本管理优势
              </h4>
              <ul className="space-y-1 text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>
                    <strong>隔离性</strong> - 每个Plan独立，互不干扰
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>
                    <strong>可追溯</strong> - 时间戳记录，完整历史
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>
                    <strong>通信层</strong> - 统一管理，避免信息丢失
                  </span>
                </li>
              </ul>
            </div>
            <div className="pt-3 border-t border-blue-200/60">
              <p className="text-xs text-gray-600">
                ✅ 每个Plan独立版本管理,互不干扰
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 用户旅程闭环机制 ⭐ 核心新增 */}
        <Card className="bg-gradient-to-br from-cyan-50/90 via-cyan-50/50 to-transparent backdrop-blur-sm border border-cyan-200/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-cyan-600" />
              用户旅程闭环机制⭐
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">核心原则</h4>
              <ul className="space-y-1 text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-cyan-600 mt-0.5">•</span>
                  <span>
                    "用户只通过眼睛和鼠标点击来查看功能"
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-600 mt-0.5">•</span>
                  <span>
                    ✅ 眼睛看得到（可视化入口）
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-600 mt-0.5">•</span>
                  <span>
                    ✅ 鼠标点得到（可操作路径）
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-600 mt-0.5">•</span>
                  <span>
                    ✅ 闭环完整性（能返回）
                  </span>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">
                可量化指标
              </h4>
              <ul className="space-y-1 text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-cyan-600 font-semibold">1</span>
                  <span>
                    <strong>闭合率</strong> ≥90%（可量化）
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-600 mt-0.5">•</span>
                  <span>
                    闭合率 = (闭合路径数 / 总路径数) × 100%
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-600 mt-0.5">•</span>
                  <span>
                    每个页面必须有返回按钮（⭐P0优先级）
                  </span>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">验证机制</h4>
              <ul className="space-y-1 text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-cyan-600 mt-0.5">•</span>
                  <span>
                    <strong>Plan阶段（需求专家）:</strong> 设计user-journeys.md
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-600 mt-0.5">•</span>
                  <span>
                    <strong>Test阶段（测试专家）:</strong> 区分功能测试+导航测试
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-600 mt-0.5">•</span>
                  <span>
                    <strong>Verification阶段（架构专家）:</strong> 自动验证闭合率
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-600 mt-0.5">•</span>
                  <span>
                    <strong>QA阶段（QA专家）:</strong> <span className="text-orange-600 font-semibold">手动点击验证</span>所有旅程
                  </span>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">
                用户体验价值
              </h4>
              <ul className="space-y-1 text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-cyan-600 mt-0.5">•</span>
                  <span>
                    <strong>无死胡同</strong> - 用户不会陷入无法返回的页面
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-600 mt-0.5">•</span>
                  <span>
                    <strong>完整闭环</strong> - 所有操作路径都能形成闭环
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-600 mt-0.5">•</span>
                  <span>
                    <strong>流畅体验</strong> - 交互自然，符合用户预期
                  </span>
                </li>
              </ul>
            </div>
            <div className="pt-3 border-t border-cyan-200/60">
              <p className="text-xs text-gray-600">
                ✅ 用户体验完整流畅，无死胡同
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 串行开发 + OpenAPI机制 ⭐ 核心调整 */}
        <Card className="bg-gradient-to-br from-purple-50/90 via-purple-50/50 to-transparent backdrop-blur-sm border border-purple-200/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="w-5 h-5 text-purple-600" />
              串行开发 + OpenAPI⭐
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">
                串行开发策略（4步流程）
              </h4>
              <ul className="space-y-1 text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 font-semibold">1</span>
                  <span>
                    <strong>后端开发（Backend专家）</strong> - ralph-loop自动调度
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 font-semibold">2</span>
                  <span>
                    <strong>OpenAPI文档（Backend专家）</strong> - 生成openapi.json
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 font-semibold">3</span>
                  <span>
                    <strong>Swagger测试（测试专家）</strong> - <span className="text-orange-600 font-semibold">手动点击</span>测试所有API
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 font-semibold">4</span>
                  <span>
                    <strong>前端开发（Frontend专家）</strong> - 基于openapi.json实现
                  </span>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">API契约权威性</h4>
              <ul className="space-y-1 text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-0.5">•</span>
                  <span>
                    <code className="text-xs bg-purple-100 px-1 rounded">
                      spec-api.md
                    </code>{' '}
                    是唯一权威来源
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-0.5">•</span>
                  <span>符合RESTful规范（⭐新增）</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-0.5">•</span>
                  <span>包含完整Zod Schema定义（⭐新增）</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-0.5">•</span>
                  <span>每个接口包含成功标准（⭐新增）</span>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">
                OpenAPI文档生成流程
              </h4>
              <ul className="space-y-1 text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-0.5">•</span>
                  <span>
                    Backend完成 → 扫描所有API路由
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-0.5">•</span>
                  <span>
                    检查JSDoc注释完整性
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-0.5">•</span>
                  <span>
                    生成{' '}
                    <code className="text-xs bg-purple-100 px-1 rounded">
                      public/openapi.json
                    </code>
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-0.5">•</span>
                  <span>
                    验证Swagger UI可加载（供测试专家使用）
                  </span>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">
                串行开发优势
              </h4>
              <ul className="space-y-1 text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-0.5">•</span>
                  <span>
                    <strong>前后端解耦</strong> - 通过契约隔离，互不阻塞
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-0.5">•</span>
                  <span>
                    <strong>质量保障</strong> - Swagger测试确保API正确性
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-0.5">•</span>
                  <span>
                    <strong>文档同步</strong> - OpenAPI自动生成，保持一致性
                  </span>
                </li>
              </ul>
            </div>
            <div className="pt-3 border-t border-purple-200/60">
              <p className="text-xs text-gray-600">
                ✅ 契约优先，串行开发，确保前后端协同一致
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 质量返工机制 ⭐ Verification自动返工 */}
        <Card className="bg-gradient-to-br from-amber-50/90 via-orange-50/50 to-transparent backdrop-blur-sm border border-amber-200/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-orange-600" />
              质量返工机制⭐
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">错误分级</h4>
              <div className="space-y-2">
                <div className="bg-red-50/80 rounded-lg p-2 border border-red-200/60">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-red-600 font-semibold text-xs">
                      🚨 P0 关键错误
                    </span>
                  </div>
                  <ul className="space-y-0.5 text-gray-700 text-xs">
                    <li>• 功能缺失/核心错误</li>
                    <li>• TypeScript类型错误</li>
                    <li>• 覆盖率 &lt; 90%（⭐）</li>
                    <li>• 闭合率 &lt; 90%（⭐）</li>
                  </ul>
                </div>
                <div className="bg-amber-50/80 rounded-lg p-2 border border-amber-200/60">
                  <span className="text-amber-600 font-semibold text-xs">
                    ⚠️ P1 非关键错误
                  </span>
                  <span className="text-gray-700 text-xs ml-2">
                    UI细节（记录但可继续）
                  </span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">
                自动返工⭐
              </h4>
              <ul className="space-y-1 text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-orange-600 mt-0.5">•</span>
                  <span>
                    <strong>E2E &lt;90%</strong> → 返回Test
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-600 mt-0.5">•</span>
                  <span>
                    <strong>闭合率 &lt;90%</strong> → 返回Dev
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-600 mt-0.5">•</span>
                  <span>自动触发，无需人工判断</span>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">
                QA最终把关⭐
              </h4>
              <ul className="space-y-1 text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-orange-600 mt-0.5">•</span>
                  <span>
                    <strong>步骤1（QA专家）:</strong> API完整性（100%）
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-600 mt-0.5">•</span>
                  <span>
                    <strong>步骤2（QA专家）:</strong> <span className="text-orange-600 font-semibold">手动点击</span>所有旅程（≥90%）
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-600 mt-0.5">•</span>
                  <span>
                    <strong>步骤3（QA专家）:</strong> 质量验收
                  </span>
                </li>
              </ul>
            </div>
            <div className="pt-3 border-t border-amber-200/60">
              <p className="text-xs text-gray-600 flex items-center gap-2">
                <span className="text-orange-600 font-semibold">⚠️</span>
                <span>同一问题最多返工5次</span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
