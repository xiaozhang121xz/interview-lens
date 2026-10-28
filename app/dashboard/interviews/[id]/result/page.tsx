'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  Loader2,
  Sparkles,
  FileText,
  User,
  Copy,
  Download,
  Check,
  Map,
  Share2,
  History,
} from 'lucide-react';
import { useInterviewStore } from '@/stores/features/interview-assistant-store';
import { aiApi } from '@/lib/api/interview-assistant/api';
import { JourneyMapContainer } from '@/components/features/interview/journey-map-container';
import { ShareReportDialog } from '@/components/features/share/share-report-dialog';

interface SummaryResult {
  summary: string;
  keyPoints: string[];
  painPoints: string[];
  requirements: string[];
  risks: string[];
  nextSteps: string[];
}

interface PRDResult {
  prd: string;
}

interface PersonaResult {
  persona: string;
}

export default function InterviewResultPage() {
  const router = useRouter();
  const params = useParams();
  const interviewId = params.id as string;

  const { currentInterview, fetchInterview } = useInterviewStore();

  const [activeTab, setActiveTab] = useState('summary');
  const [summary, setSummary] = useState<SummaryResult | null>(null);
  const [prd, setPrd] = useState<PRDResult | null>(null);
  const [persona, setPersona] = useState<PersonaResult | null>(null);
  const [generating, setGenerating] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareDialogView, setShareDialogView] = useState<'generate' | 'history'>('generate');

  // 加载数据
  useEffect(() => {
    if (interviewId) {
      fetchInterview(interviewId);
    }
  }, [interviewId]);

  // 从已加载的访谈数据中恢复已保存的内容
  useEffect(() => {
    if (currentInterview) {
      // 恢复用户画像
      if ((currentInterview as any).persona) {
        const savedPersona = (currentInterview as any).persona;
        setPersona({
          persona: formatPersonaToMarkdown(savedPersona),
        });
      }
      // 恢复 PRD 文档
      if ((currentInterview as any).prd) {
        const savedPrd = (currentInterview as any).prd;
        setPrd({
          prd: savedPrd.content,
        });
      }
      // 恢复访谈纪要（从 insights 中获取 type='summary' 的记录）
      if (currentInterview.insights && currentInterview.insights.length > 0) {
        const summaryInsight = currentInterview.insights.find(
          (insight: any) => insight.type === 'summary'
        );
        const painPointInsights = currentInterview.insights.filter(
          (insight: any) => insight.type === 'pain_point'
        );
        const requirementInsights = currentInterview.insights.filter(
          (insight: any) => insight.type === 'requirement'
        );
        const riskInsights = currentInterview.insights.filter(
          (insight: any) => insight.type === 'risk'
        );
        const keyPointInsights = currentInterview.insights.filter(
          (insight: any) => insight.type === 'key_point'
        );
        const nextStepInsights = currentInterview.insights.filter(
          (insight: any) => insight.type === 'next_step'
        );

        if (summaryInsight) {
          setSummary({
            summary: summaryInsight.content,
            keyPoints: keyPointInsights.map((i: any) => i.content),
            painPoints: painPointInsights.map((i: any) => i.content),
            requirements: requirementInsights.map((i: any) => i.content),
            risks: riskInsights.map((i: any) => i.content),
            nextSteps: nextStepInsights.map((i: any) => i.content),
          });
        }
      }
    }
  }, [currentInterview]);

  // 将数据库中的用户画像结构转换为 Markdown
  const formatPersonaToMarkdown = (data: any): string => {
    let markdown = `# 用户画像：${data.name}\n\n`;
    markdown += `## 基本信息\n`;
    markdown += `- **角色/职位**：${data.role}\n`;

    if (data.demographics) {
      try {
        const demographics = JSON.parse(data.demographics);
        Object.entries(demographics).forEach(([key, value]) => {
          markdown += `- **${key}**：${value}\n`;
        });
      } catch {}
    }

    if (data.goals) {
      try {
        const goals = JSON.parse(data.goals);
        markdown += `\n## 目标\n${goals.map((g: string, i: number) => `${i + 1}. ${g}`).join('\n')}\n`;
      } catch {}
    }

    if (data.painPoints) {
      try {
        const painPoints = JSON.parse(data.painPoints);
        markdown += `\n## 痛点\n${painPoints.map((p: string, i: number) => `${i + 1}. ${p}`).join('\n')}\n`;
      } catch {}
    }

    if (data.behaviors) {
      try {
        const behaviors = JSON.parse(data.behaviors);
        markdown += `\n## 行为特征\n${behaviors.map((b: string, i: number) => `${i + 1}. ${b}`).join('\n')}\n`;
      } catch {}
    }

    if (data.quotes) {
      try {
        const quotes = JSON.parse(data.quotes);
        markdown += `\n## 访谈原话\n${quotes.map((q: string, i: number) => `${i + 1}. ${q}`).join('\n')}\n`;
      } catch {}
    }

    return markdown;
  };

  // 生成纪要
  const handleGenerateSummary = async () => {
    setGenerating('summary');
    try {
      const result = await aiApi.generateSummary({ interviewId });
      setSummary(result.data as SummaryResult);
    } catch (error) {
      console.error('Failed to generate summary:', error);
      alert('生成纪要失败，请检查 AI 服务配置');
    } finally {
      setGenerating(null);
    }
  };

  // 生成 PRD
  const handleGeneratePRD = async () => {
    setGenerating('prd');
    try {
      const result = await aiApi.generatePRD({ interviewId });
      setPrd(result.data as PRDResult);
    } catch (error) {
      console.error('Failed to generate PRD:', error);
      alert('生成 PRD 失败，请检查 AI 服务配置');
    } finally {
      setGenerating(null);
    }
  };

  // 生成用户画像
  const handleGeneratePersona = async () => {
    setGenerating('persona');
    try {
      const result = await aiApi.generatePersona({ interviewId });
      setPersona(result.data as PersonaResult);
    } catch (error) {
      console.error('Failed to generate persona:', error);
      alert('生成用户画像失败，请检查 AI 服务配置');
    } finally {
      setGenerating(null);
    }
  };

  // 复制内容
  const handleCopy = async (content: string, key: string) => {
    await navigator.clipboard.writeText(content);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  // 下载内容
  const handleDownload = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!currentInterview) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <PageHeader
          variant="card"
          size="sm"
          title="访谈结果"
          description={`${currentInterview.title} - AI 分析结果`}
          icon={FileText}
          leftContent={
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                router.push(`/dashboard/interviews/${interviewId}`)
              }
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              返回详情
            </Button>
          }
          rightContent={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShareDialogView('history');
                  setShareDialogOpen(true);
                }}
                className="gap-2"
              >
                <History className="w-4 h-4" />
                已生成报告
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShareDialogView('generate');
                  setShareDialogOpen(true);
                }}
                className="gap-2"
              >
                <Share2 className="w-4 h-4" />
                分享
              </Button>
            </div>
          }
        />

        {/* 分享报告对话框（支持版本管理） */}
        <ShareReportDialog
          interviewId={interviewId}
          isOpen={shareDialogOpen}
          onOpenChange={setShareDialogOpen}
          initialView={shareDialogView}
        />

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="summary">访谈纪要</TabsTrigger>
            <TabsTrigger value="prd">PRD 文档</TabsTrigger>
            <TabsTrigger value="persona">用户画像</TabsTrigger>
            <TabsTrigger value="journey">用户旅程图</TabsTrigger>
          </TabsList>

          {/* 访谈纪要 */}
          <TabsContent value="summary" className="mt-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>访谈纪要</CardTitle>
                    <CardDescription>
                      AI 自动生成的访谈纪要和关键洞察
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {summary && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleCopy(formatSummary(summary), 'summary')
                          }
                        >
                          {copied === 'summary' ? (
                            <Check className="w-4 h-4 mr-2" />
                          ) : (
                            <Copy className="w-4 h-4 mr-2" />
                          )}
                          复制
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleDownload(
                              formatSummary(summary),
                              `访谈纪要-${currentInterview.title}.md`
                            )
                          }
                        >
                          <Download className="w-4 h-4 mr-2" />
                          下载
                        </Button>
                      </>
                    )}
                    <Button
                      size="sm"
                      onClick={handleGenerateSummary}
                      disabled={generating === 'summary'}
                    >
                      {generating === 'summary' ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4 mr-2" />
                      )}
                      {summary ? '重新生成' : 'AI 生成'}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {!summary && generating !== 'summary' && (
                  <div className="flex flex-col items-center justify-center py-12">
                    <FileText className="w-12 h-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4">
                      点击&quot;AI 生成&quot;按钮生成访谈纪要
                    </p>
                  </div>
                )}
                {generating === 'summary' && (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
                    <p className="text-muted-foreground">正在生成访谈纪要...</p>
                  </div>
                )}
                {summary && generating !== 'summary' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-2">纪要概述</h3>
                      <p className="text-gray-700 whitespace-pre-wrap">
                        {summary.summary}
                      </p>
                    </div>
                    {(summary.keyPoints?.length ?? 0) > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold mb-2">关键要点</h3>
                        <ul className="list-disc list-inside space-y-1">
                          {summary.keyPoints.map((point, index) => (
                            <li key={index} className="text-gray-700">
                              {point}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {(summary.painPoints?.length ?? 0) > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold mb-2">痛点分析</h3>
                        <ul className="list-disc list-inside space-y-1">
                          {summary.painPoints.map((point, index) => (
                            <li key={index} className="text-gray-700">
                              {point}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {(summary.requirements?.length ?? 0) > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold mb-2">需求梳理</h3>
                        <ul className="list-disc list-inside space-y-1">
                          {summary.requirements.map((req, index) => (
                            <li key={index} className="text-gray-700">
                              {req}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {(summary.risks?.length ?? 0) > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold mb-2">风险与待确认项</h3>
                        <ul className="list-disc list-inside space-y-1">
                          {summary.risks.map((risk, index) => (
                            <li key={index} className="text-gray-700">
                              {risk}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {(summary.nextSteps?.length ?? 0) > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold mb-2">
                          下一步行动
                        </h3>
                        <ul className="list-disc list-inside space-y-1">
                          {summary.nextSteps.map((step, index) => (
                            <li key={index} className="text-gray-700">
                              {step}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* PRD 文档 */}
          <TabsContent value="prd" className="mt-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>PRD 文档</CardTitle>
                    <CardDescription>AI 自动生成的产品需求文档</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {prd && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopy(prd.prd, 'prd')}
                        >
                          {copied === 'prd' ? (
                            <Check className="w-4 h-4 mr-2" />
                          ) : (
                            <Copy className="w-4 h-4 mr-2" />
                          )}
                          复制
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleDownload(
                              prd.prd,
                              `PRD-${currentInterview.title}.md`
                            )
                          }
                        >
                          <Download className="w-4 h-4 mr-2" />
                          下载
                        </Button>
                      </>
                    )}
                    <Button
                      size="sm"
                      onClick={handleGeneratePRD}
                      disabled={generating === 'prd'}
                    >
                      {generating === 'prd' ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4 mr-2" />
                      )}
                      {prd ? '重新生成' : 'AI 生成'}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {!prd && generating !== 'prd' && (
                  <div className="flex flex-col items-center justify-center py-12">
                    <FileText className="w-12 h-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4">
                      点击&quot;AI 生成&quot;按钮生成 PRD 文档
                    </p>
                  </div>
                )}
                {generating === 'prd' && (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
                    <p className="text-muted-foreground">
                      正在生成 PRD 文档...
                    </p>
                  </div>
                )}
                {prd && generating !== 'prd' && (
                  <div className="prose prose-sm max-w-none">
                    <pre className="whitespace-pre-wrap bg-gray-50 p-4 rounded-lg text-sm">
                      {prd.prd}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 用户画像 */}
          <TabsContent value="persona" className="mt-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>用户画像</CardTitle>
                    <CardDescription>AI 自动生成的用户画像分析</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {persona && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopy(persona.persona, 'persona')}
                        >
                          {copied === 'persona' ? (
                            <Check className="w-4 h-4 mr-2" />
                          ) : (
                            <Copy className="w-4 h-4 mr-2" />
                          )}
                          复制
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleDownload(
                              persona.persona,
                              `用户画像-${currentInterview.title}.md`
                            )
                          }
                        >
                          <Download className="w-4 h-4 mr-2" />
                          下载
                        </Button>
                      </>
                    )}
                    <Button
                      size="sm"
                      onClick={handleGeneratePersona}
                      disabled={generating === 'persona'}
                    >
                      {generating === 'persona' ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4 mr-2" />
                      )}
                      {persona ? '重新生成' : 'AI 生成'}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {!persona && generating !== 'persona' && (
                  <div className="flex flex-col items-center justify-center py-12">
                    <User className="w-12 h-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4">
                      点击&quot;AI 生成&quot;按钮生成用户画像
                    </p>
                  </div>
                )}
                {generating === 'persona' && (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
                    <p className="text-muted-foreground">正在生成用户画像...</p>
                  </div>
                )}
                {persona && generating !== 'persona' && (
                  <div className="prose prose-sm max-w-none">
                    <pre className="whitespace-pre-wrap bg-gray-50 p-4 rounded-lg text-sm">
                      {persona.persona}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 用户旅程图 */}
          <TabsContent value="journey" className="mt-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Map className="w-5 h-5" />
                      用户旅程图
                    </CardTitle>
                    <CardDescription>
                      AI 自动生成的用户旅程图，展示用户行为、情绪变化、痛点和机会点
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <JourneyMapContainer
                  interviewId={interviewId}
                  interviewTitle={currentInterview.title}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

// 格式化纪要为 Markdown
function formatSummary(summary: SummaryResult): string {
  let content = `# 访谈纪要\n\n`;
  content += `## 纪要概述\n\n${summary.summary}\n\n`;

  if (summary.keyPoints?.length) {
    content += `## 关键要点\n\n`;
    summary.keyPoints.forEach((point) => {
      content += `- ${point}\n`;
    });
    content += `\n`;
  }

  if (summary.painPoints?.length) {
    content += `## 痛点分析\n\n`;
    summary.painPoints.forEach((point) => {
      content += `- ${point}\n`;
    });
    content += `\n`;
  }

  if (summary.requirements?.length) {
    content += `## 需求梳理\n\n`;
    summary.requirements.forEach((req) => {
      content += `- ${req}\n`;
    });
    content += `\n`;
  }

  if (summary.risks?.length) {
    content += `## 风险与待确认项\n\n`;
    summary.risks.forEach((risk) => {
      content += `- ${risk}\n`;
    });
    content += `\n`;
  }

  if (summary.nextSteps?.length) {
    content += `## 下一步行动\n\n`;
    summary.nextSteps.forEach((step) => {
      content += `- ${step}\n`;
    });
    content += `\n`;
  }

  return content;
}
