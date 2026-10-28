'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Zap,
  Briefcase,
  MessageSquareQuote,
  CheckCircle,
  Clock,
  FileText,
  Plus,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { useDashboardStore } from '@/stores/features/interview-assistant-store';
import { InterviewStatus } from '@/lib/api/interview-assistant/types';

// 状态颜色映射
const STATUS_COLORS: Record<InterviewStatus, string> = {
  draft: 'bg-gray-100 text-gray-800',
  prepared: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
  archived: 'bg-gray-100 text-gray-600',
};

// 状态文本映射
const STATUS_LABELS: Record<InterviewStatus, string> = {
  draft: '草稿',
  prepared: '已准备',
  in_progress: '进行中',
  completed: '已完成',
  archived: '已归档',
};

export default function DashboardPage() {
  const { stats, loading, fetchStats } = useDashboardStore();

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <PageHeader
          variant="card"
          size="sm"
          title="工作台"
          description="客户需求洞察助手 - 概览和统计数据"
          icon={Zap}
          actions={
            <div className="flex gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard/customers/new">
                  <Plus className="w-4 h-4 mr-2" />
                  新建客户
                </Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/dashboard/interviews/new">
                  <Plus className="w-4 h-4 mr-2" />
                  新建访谈
                </Link>
              </Button>
            </div>
          }
        />

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">客户总数</p>
                  <p className="text-2xl font-bold">
                    {loading ? '-' : stats?.customerCount || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Briefcase className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">访谈总数</p>
                  <p className="text-2xl font-bold">
                    {loading ? '-' : stats?.interviewStats.total || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <MessageSquareQuote className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">已完成</p>
                  <p className="text-2xl font-bold">
                    {loading ? '-' : stats?.interviewStats.completed || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">进行中</p>
                  <p className="text-2xl font-bold">
                    {loading ? '-' : stats?.interviewStats.inProgress || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 快捷操作 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">快捷操作</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Link
                href="/dashboard/customers"
                className="flex items-center gap-3 p-4 rounded-lg border hover:bg-gray-50 transition-colors"
              >
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Briefcase className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium">客户管理</p>
                  <p className="text-sm text-muted-foreground">管理客户信息</p>
                </div>
              </Link>

              <Link
                href="/dashboard/interviews"
                className="flex items-center gap-3 p-4 rounded-lg border hover:bg-gray-50 transition-colors"
              >
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <MessageSquareQuote className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="font-medium">访谈管理</p>
                  <p className="text-sm text-muted-foreground">管理访谈项目</p>
                </div>
              </Link>

              <Link
                href="/dashboard/customers/new"
                className="flex items-center gap-3 p-4 rounded-lg border hover:bg-gray-50 transition-colors"
              >
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Plus className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium">新建客户</p>
                  <p className="text-sm text-muted-foreground">添加新客户</p>
                </div>
              </Link>

              <Link
                href="/dashboard/interviews/new"
                className="flex items-center gap-3 p-4 rounded-lg border hover:bg-gray-50 transition-colors"
              >
                <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Plus className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="font-medium">新建访谈</p>
                  <p className="text-sm text-muted-foreground">创建新访谈</p>
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* 最近访谈 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">最近访谈</CardTitle>
                <CardDescription>最近创建的访谈项目</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard/interviews">
                  查看全部
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : !stats?.recentInterviews ||
              stats.recentInterviews.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8">
                <FileText className="w-10 h-10 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">暂无访谈项目</p>
                <Button variant="outline" size="sm" className="mt-4" asChild>
                  <Link href="/dashboard/interviews/new">
                    <Plus className="w-4 h-4 mr-2" />
                    创建访谈
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {stats.recentInterviews.map((interview) => (
                  <Link
                    key={interview.id}
                    href={`/dashboard/interviews/${interview.id}`}
                    className="flex items-center justify-between p-4 rounded-lg border hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                        <MessageSquareQuote className="w-5 h-5 text-gray-600" />
                      </div>
                      <div>
                        <p className="font-medium">{interview.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {interview.customer.name} -{' '}
                          {interview.customer.industry}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={STATUS_COLORS[interview.status]}>
                        {STATUS_LABELS[interview.status]}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {new Date(interview.createdAt).toLocaleDateString(
                          'zh-CN'
                        )}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 状态分布 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">访谈状态分布</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {(() => {
                  // 将对象格式转换为数组格式（后端返回的是对象，前端期望数组）
                  const statusData = stats?.interviewsByStatus;
                  if (!statusData || !Array.isArray(statusData)) {
                    // 如果是对象格式，转换为数组
                    const statusKeys: InterviewStatus[] = [
                      'draft',
                      'prepared',
                      'in_progress',
                      'completed',
                      'archived',
                    ];
                    const statusObj = statusData as
                      | Record<InterviewStatus, number>
                      | undefined;
                    return statusKeys.map((status) => (
                      <div
                        key={status}
                        className="text-center p-4 rounded-lg border"
                      >
                        <p className="text-2xl font-bold">
                          {statusObj?.[status] || 0}
                        </p>
                        <Badge className={`${STATUS_COLORS[status]} mt-2`}>
                          {STATUS_LABELS[status]}
                        </Badge>
                      </div>
                    ));
                  }
                  // 如果是数组格式，直接遍历
                  return statusData.map((item) => (
                    <div
                      key={item.status}
                      className="text-center p-4 rounded-lg border"
                    >
                      <p className="text-2xl font-bold">{item.count}</p>
                      <Badge className={`${STATUS_COLORS[item.status]} mt-2`}>
                        {STATUS_LABELS[item.status]}
                      </Badge>
                    </div>
                  ));
                })()}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
