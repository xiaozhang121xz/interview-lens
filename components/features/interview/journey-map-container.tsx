'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { aiApi, journeyMapApi } from '@/lib/api/interview-assistant/api';
import type {
  JourneyMapData,
  JourneyStage,
  JourneyEmotion,
  JourneyPainPoint,
  JourneyOpportunity,
} from '@/lib/api/interview-assistant/types';
import {
  Check,
  Copy,
  Download,
  Loader2,
  Map,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { JourneyEmotionChart } from './journey-emotion-chart';
import { JourneyPainOpportunity } from './journey-pain-opportunity';
import { JourneyStageTimeline } from './journey-stage-timeline';

interface JourneyMapContainerProps {
  interviewId: string;
  interviewTitle: string;
}

/**
 * 用户旅程图容器组件
 * 管理旅程图数据状态，协调子组件布局，提供 AI 生成和编辑功能
 */
export function JourneyMapContainer({
  interviewId,
  interviewTitle,
}: JourneyMapContainerProps) {
  const [journeyMapData, setJourneyMapData] = useState<JourneyMapData | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('stages');

  // 加载已有的旅程图数据
  useEffect(() => {
    loadJourneyMap();
  }, [interviewId]);

  const loadJourneyMap = async () => {
    setLoading(true);
    try {
      const response = await journeyMapApi.get(interviewId);
      if (response.success && response.data) {
        setJourneyMapData(response.data);
      }
    } catch (error) {
      console.error('Failed to load journey map:', error);
    } finally {
      setLoading(false);
    }
  };

  // AI 生成旅程图
  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const response = await aiApi.generateJourney({ interviewId });
      if (response.success && response.data) {
        setJourneyMapData(response.data);
        toast.success('用户旅程图生成成功');
      }
    } catch (error) {
      console.error('Failed to generate journey map:', error);
      toast.error('生成失败，请检查 AI 服务配置');
    } finally {
      setGenerating(false);
    }
  };

  // 保存编辑
  const handleSave = useCallback(async () => {
    if (!journeyMapData) return;

    setSaving(true);
    try {
      const response = await journeyMapApi.update(journeyMapData.id, {
        title: journeyMapData.title,
        stages: journeyMapData.stages,
        actions: journeyMapData.actions,
        emotions: journeyMapData.emotions,
        painPoints: journeyMapData.painPoints,
        opportunities: journeyMapData.opportunities,
      });

      if (response.success) {
        setJourneyMapData(response.data);
        toast.success('保存成功');
      }
    } catch (error) {
      console.error('Failed to save journey map:', error);
      toast.error('保存失败');
    } finally {
      setSaving(false);
    }
  }, [journeyMapData]);

  // 编辑阶段
  const handleEditStage = useCallback(
    (index: number, stage: JourneyStage) => {
      if (!journeyMapData) return;
      const newStages = [...journeyMapData.stages];
      newStages[index] = stage;
      setJourneyMapData({ ...journeyMapData, stages: newStages });
    },
    [journeyMapData]
  );

  // 编辑情绪
  const handleEditEmotion = useCallback(
    (index: number, emotion: JourneyEmotion) => {
      if (!journeyMapData || !journeyMapData.emotions) return;
      const newEmotions = [...journeyMapData.emotions];
      newEmotions[index] = emotion;
      setJourneyMapData({ ...journeyMapData, emotions: newEmotions });
    },
    [journeyMapData]
  );

  // 编辑痛点
  const handleEditPainPoint = useCallback(
    (index: number, painPoint: JourneyPainPoint) => {
      if (!journeyMapData || !journeyMapData.painPoints) return;
      const newPainPoints = [...journeyMapData.painPoints];
      newPainPoints[index] = painPoint;
      setJourneyMapData({ ...journeyMapData, painPoints: newPainPoints });
    },
    [journeyMapData]
  );

  // 添加痛点
  const handleAddPainPoint = useCallback(
    (painPoint: JourneyPainPoint) => {
      if (!journeyMapData) return;
      const newPainPoints = [...(journeyMapData.painPoints || []), painPoint];
      setJourneyMapData({ ...journeyMapData, painPoints: newPainPoints });
    },
    [journeyMapData]
  );

  // 删除痛点
  const handleDeletePainPoint = useCallback(
    (index: number) => {
      if (!journeyMapData || !journeyMapData.painPoints) return;
      const newPainPoints = journeyMapData.painPoints.filter((_, i) => i !== index);
      setJourneyMapData({ ...journeyMapData, painPoints: newPainPoints });
    },
    [journeyMapData]
  );

  // 编辑机会点
  const handleEditOpportunity = useCallback(
    (index: number, opportunity: JourneyOpportunity) => {
      if (!journeyMapData || !journeyMapData.opportunities) return;
      const newOpportunities = [...journeyMapData.opportunities];
      newOpportunities[index] = opportunity;
      setJourneyMapData({ ...journeyMapData, opportunities: newOpportunities });
    },
    [journeyMapData]
  );

  // 添加机会点
  const handleAddOpportunity = useCallback(
    (opportunity: JourneyOpportunity) => {
      if (!journeyMapData) return;
      const newOpportunities = [...(journeyMapData.opportunities || []), opportunity];
      setJourneyMapData({ ...journeyMapData, opportunities: newOpportunities });
    },
    [journeyMapData]
  );

  // 删除机会点
  const handleDeleteOpportunity = useCallback(
    (index: number) => {
      if (!journeyMapData || !journeyMapData.opportunities) return;
      const newOpportunities = journeyMapData.opportunities.filter(
        (_, i) => i !== index
      );
      setJourneyMapData({ ...journeyMapData, opportunities: newOpportunities });
    },
    [journeyMapData]
  );

  // 复制内容
  const handleCopy = async () => {
    if (!journeyMapData) return;

    const content = formatJourneyMapAsMarkdown(journeyMapData, interviewTitle);
    await navigator.clipboard.writeText(content);
    setCopied(true);
    toast.success('已复制到剪贴板');
    setTimeout(() => setCopied(false), 2000);
  };

  // 下载内容
  const handleDownload = () => {
    if (!journeyMapData) return;

    const content = formatJourneyMapAsMarkdown(journeyMapData, interviewTitle);
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `用户旅程图-${interviewTitle}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 加载中状态
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">正在加载用户旅程图...</p>
      </div>
    );
  }

  // 空状态
  if (!journeyMapData) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Map className="w-12 h-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground mb-4">
          点击&quot;AI 生成&quot;按钮生成用户旅程图
        </p>
        <Button onClick={handleGenerate} disabled={generating}>
          {generating ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4 mr-2" />
          )}
          AI 生成
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 头部操作区 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Map className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">{journeyMapData.title}</h3>
          <Badge variant="secondary">
            {journeyMapData.stages.length} 个阶段
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleCopy}>
            {copied ? (
              <Check className="w-4 h-4 mr-2" />
            ) : (
              <Copy className="w-4 h-4 mr-2" />
            )}
            复制
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="w-4 h-4 mr-2" />
            下载
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            保存修改
          </Button>
          <Button size="sm" onClick={handleGenerate} disabled={generating}>
            {generating ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 mr-2" />
            )}
            重新生成
          </Button>
        </div>
      </div>

      <Separator />

      {/* 内容区 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="stages">阶段时间线</TabsTrigger>
          <TabsTrigger value="emotions">情绪曲线</TabsTrigger>
          <TabsTrigger value="analysis">痛点与机会</TabsTrigger>
        </TabsList>

        <TabsContent value="stages" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <JourneyStageTimeline
                stages={journeyMapData.stages}
                onEdit={handleEditStage}
                editable
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="emotions" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <JourneyEmotionChart
                stages={journeyMapData.stages}
                emotions={journeyMapData.emotions || []}
                onEdit={handleEditEmotion}
                editable
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analysis" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <JourneyPainOpportunity
                stages={journeyMapData.stages}
                painPoints={journeyMapData.painPoints || []}
                opportunities={journeyMapData.opportunities || []}
                onEditPainPoint={handleEditPainPoint}
                onEditOpportunity={handleEditOpportunity}
                onAddPainPoint={handleAddPainPoint}
                onAddOpportunity={handleAddOpportunity}
                onDeletePainPoint={handleDeletePainPoint}
                onDeleteOpportunity={handleDeleteOpportunity}
                editable
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/**
 * 格式化旅程图为 Markdown
 */
function formatJourneyMapAsMarkdown(
  data: JourneyMapData,
  title: string
): string {
  let content = `# 用户旅程图 - ${title}\n\n`;
  content += `## 标题\n\n${data.title}\n\n`;

  // 阶段
  content += `## 旅程阶段\n\n`;
  data.stages.forEach((stage, index) => {
    content += `### 阶段 ${index + 1}: ${stage.name}\n\n`;
    content += `${stage.description}\n\n`;
  });

  // 情绪
  if (data.emotions && data.emotions.length > 0) {
    content += `## 情绪曲线\n\n`;
    const emotionLabels: Record<string, string> = {
      happy: '开心',
      neutral: '平静',
      sad: '低落',
      frustrated: '沮丧',
      excited: '兴奋',
    };
    data.emotions.forEach((emotion) => {
      content += `- **${emotion.stage}**: ${emotionLabels[emotion.emotion] || emotion.emotion} (强度: ${emotion.intensity})`;
      if (emotion.reason) {
        content += ` - ${emotion.reason}`;
      }
      content += `\n`;
    });
    content += `\n`;
  }

  // 痛点
  if (data.painPoints && data.painPoints.length > 0) {
    content += `## 痛点分析\n\n`;
    const severityLabels: Record<string, string> = {
      low: '低',
      medium: '中',
      high: '高',
    };
    const frequencyLabels: Record<string, string> = {
      rare: '偶尔',
      occasional: '有时',
      frequent: '频繁',
    };
    data.painPoints.forEach((painPoint) => {
      content += `- **${painPoint.stage}**: ${painPoint.painPoint}\n`;
      content += `  - 严重程度: ${severityLabels[painPoint.severity]}\n`;
      content += `  - 发生频率: ${frequencyLabels[painPoint.frequency]}\n`;
    });
    content += `\n`;
  }

  // 机会点
  if (data.opportunities && data.opportunities.length > 0) {
    content += `## 改进机会\n\n`;
    const potentialLabels: Record<string, string> = {
      low: '低',
      medium: '中',
      high: '高',
    };
    const effortLabels: Record<string, string> = {
      low: '低',
      medium: '中',
      high: '高',
    };
    data.opportunities.forEach((opportunity) => {
      content += `- **${opportunity.stage}**: ${opportunity.opportunity}\n`;
      content += `  - 潜力: ${potentialLabels[opportunity.potential]}\n`;
      content += `  - 实施难度: ${effortLabels[opportunity.effort]}\n`;
    });
    content += `\n`;
  }

  return content;
}

export default JourneyMapContainer;