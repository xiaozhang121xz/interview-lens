/**
 * 公开分享页面
 * /share/[token]
 *
 * 功能：
 * - 验证token有效性
 * - 展示分享的访谈内容
 * - 只读模式，无编辑功能
 */

'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  FileText,
  User,
  Map,
  Lightbulb,
  MessageSquare,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { JourneyMapViewer, JourneyMapData } from '@/components/features/interview/journey-map-viewer';

interface ShareContent {
  interview: {
    id: string;
    title: string;
    objective?: string;
    background?: string;
    interviewDate?: string;
    customer?: {
      name: string;
      industry?: string;
      description?: string;
    } | null;
  };
  prd?: {
    title: string;
    content: string;
    version: string;
  };
  persona?: {
    name: string;
    role: string;
    demographics?: Record<string, unknown>;
    goals: string[];
    painPoints: string[];
    behaviors: string[];
    quotes: string[];
  };
  journeyMap?: JourneyMapData;
  insights?: Array<{
    type: string;
    content: string;
    createdAt: string;
  }>;
  records?: Array<{
    content: string;
    type: string;
    isHighlight: boolean;
    source: string;
    createdAt: string;
  }>;
}

interface ShareConfig {
  includePRD: boolean;
  includePersona: boolean;
  includeJourneyMap: boolean;
  includeInsights: boolean;
  includeRecords: boolean;
}

export default function SharePage() {
  const params = useParams();
  const token = params.token as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [content, setContent] = useState<ShareContent | null>(null);
  const [config, setConfig] = useState<ShareConfig | null>(null);

  useEffect(() => {
    if (!token) {
      setError('无效的分享链接');
      setLoading(false);
      return;
    }

    fetchContent();
  }, [token]);

  const fetchContent = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/share/${token}/content`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || '获取分享内容失败');
        return;
      }

      setContent(data.content);
      setConfig(data.config);
    } catch (err) {
      console.error('[SharePage] Error:', err);
      setError('加载分享内容时发生错误');
    } finally {
      setLoading(false);
    }
  };

  // 加载状态
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-500">加载分享内容...</span>
      </div>
    );
  }

  // 错误状态
  if (error) {
    return (
      <Card className="max-w-md mx-auto mt-12">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 text-red-500">
            <AlertCircle className="w-6 h-6" />
            <span className="text-lg font-medium">{error}</span>
          </div>
          <p className="mt-4 text-gray-500 text-sm">
            请联系分享者获取新的分享链接，或确认链接是否正确。
          </p>
        </CardContent>
      </Card>
    );
  }

  // 无内容状态
  if (!content) {
    return (
      <Card className="max-w-md mx-auto mt-12">
        <CardContent className="pt-6">
          <div className="text-center text-gray-500">
            暂无分享内容
          </div>
        </CardContent>
      </Card>
    );
  }

  // 计算可用的Tab数量
  const availableTabs = [
    { key: 'overview', label: '访谈概览', icon: FileText, available: true },
    { key: 'prd', label: 'PRD文档', icon: FileText, available: config?.includePRD && content.prd },
    { key: 'persona', label: '用户画像', icon: User, available: config?.includePersona && content.persona },
    { key: 'journey', label: '旅程图', icon: Map, available: config?.includeJourneyMap && content.journeyMap },
    { key: 'insights', label: 'AI洞察', icon: Lightbulb, available: config?.includeInsights && (content.insights?.length ?? 0) > 0 },
    { key: 'records', label: '访谈记录', icon: MessageSquare, available: config?.includeRecords && (content.records?.length ?? 0) > 0 },
  ].filter(tab => tab.available);

  return (
    <div className="space-y-6">
      {/* 访谈基本信息 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{content.interview.title}</CardTitle>
          {content.interview.customer && (
            <div className="text-sm text-gray-500">
              客户：{content.interview.customer.name}
              {content.interview.customer.industry && ` · ${content.interview.customer.industry}`}
            </div>
          )}
        </CardHeader>
        <CardContent>
          {content.interview.objective && (
            <div className="mb-3">
              <span className="font-medium text-gray-700">访谈目标：</span>
              <p className="text-gray-600">{content.interview.objective}</p>
            </div>
          )}
          {content.interview.background && (
            <div>
              <span className="font-medium text-gray-700">背景信息：</span>
              <p className="text-gray-600">{content.interview.background}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 内容Tabs */}
      {availableTabs.length > 1 && (
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            {availableTabs.map(tab => (
              <TabsTrigger key={tab.key} value={tab.key} className="flex items-center gap-2">
                <tab.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {/* 访谈概览 */}
          <TabsContent value="overview">
            <Card>
              <CardHeader>
                <CardTitle>访谈概览</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 已生成内容统计 */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {content.prd && (
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <div className="text-blue-600 font-medium">PRD文档</div>
                      <div className="text-sm text-gray-500">已生成</div>
                    </div>
                  )}
                  {content.persona && (
                    <div className="p-4 bg-green-50 rounded-lg">
                      <div className="text-green-600 font-medium">用户画像</div>
                      <div className="text-sm text-gray-500">{content.persona.name}</div>
                    </div>
                  )}
                  {content.journeyMap && (
                    <div className="p-4 bg-purple-50 rounded-lg">
                      <div className="text-purple-600 font-medium">用户旅程图</div>
                      <div className="text-sm text-gray-500">{content.journeyMap.stages.length} 个阶段</div>
                    </div>
                  )}
                  {content.insights && content.insights.length > 0 && (
                    <div className="p-4 bg-orange-50 rounded-lg">
                      <div className="text-orange-600 font-medium">AI洞察</div>
                      <div className="text-sm text-gray-500">{content.insights.length} 条</div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* PRD文档 */}
          {config?.includePRD && content.prd && (
            <TabsContent value="prd">
              <Card>
                <CardHeader>
                  <CardTitle>{content.prd.title}</CardTitle>
                  <div className="text-sm text-gray-500">版本 {content.prd.version}</div>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm max-w-none">
                    <pre className="whitespace-pre-wrap text-gray-700 bg-gray-50 p-4 rounded-lg overflow-auto">
                      {content.prd.content}
                    </pre>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* 用户画像 */}
          {config?.includePersona && content.persona && (
            <TabsContent value="persona">
              <Card>
                <CardHeader>
                  <CardTitle>{content.persona.name}</CardTitle>
                  <div className="text-sm text-gray-500">{content.persona.role}</div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {content.persona.demographics && (
                    <div>
                      <span className="font-medium text-gray-700">人口统计：</span>
                      <div className="text-gray-600 mt-1">
                        {Object.entries(content.persona.demographics).map(([key, value]) => (
                          <span key={key} className="inline-block bg-gray-100 px-2 py-1 rounded mr-2 mb-1">
                            {key}: {String(value)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {content.persona.goals.length > 0 && (
                    <div>
                      <span className="font-medium text-gray-700">目标：</span>
                      <ul className="list-disc list-inside text-gray-600 mt-1">
                        {content.persona.goals.map((goal, i) => (
                          <li key={i}>{goal}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {content.persona.painPoints.length > 0 && (
                    <div>
                      <span className="font-medium text-gray-700">痛点：</span>
                      <ul className="list-disc list-inside text-gray-600 mt-1">
                        {content.persona.painPoints.map((pain, i) => (
                          <li key={i}>{pain}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {content.persona.behaviors.length > 0 && (
                    <div>
                      <span className="font-medium text-gray-700">行为特征：</span>
                      <ul className="list-disc list-inside text-gray-600 mt-1">
                        {content.persona.behaviors.map((behavior, i) => (
                          <li key={i}>{behavior}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {content.persona.quotes.length > 0 && (
                    <div>
                      <span className="font-medium text-gray-700">典型语录：</span>
                      <div className="mt-1 space-y-1">
                        {content.persona.quotes.map((quote, i) => (
                          <blockquote key={i} className="border-l-4 border-gray-300 pl-4 italic text-gray-600">
                            "{quote}"
                          </blockquote>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* 用户旅程图 */}
          {config?.includeJourneyMap && content.journeyMap && (
            <TabsContent value="journey">
              <Card>
                <CardHeader>
                  <CardTitle>{content.journeyMap.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <JourneyMapViewer journeyMap={content.journeyMap} />
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* AI洞察 */}
          {config?.includeInsights && content.insights && content.insights.length > 0 && (
            <TabsContent value="insights">
              <Card>
                <CardHeader>
                  <CardTitle>AI洞察</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {content.insights.map((insight, i) => (
                      <div key={i} className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            insight.type === 'summary' ? 'bg-blue-100 text-blue-700' :
                            insight.type === 'pain_point' ? 'bg-red-100 text-red-700' :
                            insight.type === 'requirement' ? 'bg-green-100 text-green-700' :
                            'bg-orange-100 text-orange-700'
                          }`}>
                            {insight.type === 'summary' ? '总结' :
                             insight.type === 'pain_point' ? '痛点' :
                             insight.type === 'requirement' ? '需求' : '风险'}
                          </span>
                        </div>
                        <p className="text-gray-700">{insight.content}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* 访谈记录 */}
          {config?.includeRecords && content.records && content.records.length > 0 && (
            <TabsContent value="records">
              <Card>
                <CardHeader>
                  <CardTitle>访谈记录</CardTitle>
                  <div className="text-sm text-gray-500">{content.records.length} 条记录</div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {content.records.map((record, i) => (
                      <div key={i} className={`p-3 rounded-lg ${
                        record.isHighlight ? 'bg-yellow-50 border border-yellow-200' : 'bg-gray-50'
                      }`}>
                        {record.isHighlight && (
                          <span className="inline-block bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded text-xs mb-1">
                            重点
                          </span>
                        )}
                        <p className="text-gray-700">{record.content}</p>
                        <div className="mt-1 text-xs text-gray-400">
                          来源：{record.source} · {new Date(record.createdAt).toLocaleString('zh-CN')}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      )}
    </div>
  );
}