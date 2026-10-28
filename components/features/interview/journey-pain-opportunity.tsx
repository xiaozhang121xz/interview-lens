'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type {
  JourneyPainPoint,
  JourneyOpportunity,
  JourneyStage,
  SeverityLevel,
  FrequencyLevel,
  EffortLevel,
} from '@/lib/api/interview-assistant/types';
import {
  AlertTriangle,
  Edit2,
  Lightbulb,
  Plus,
  Trash2,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { useState } from 'react';

interface JourneyPainOpportunityProps {
  stages: JourneyStage[];
  painPoints: JourneyPainPoint[];
  opportunities: JourneyOpportunity[];
  onEditPainPoint?: (index: number, painPoint: JourneyPainPoint) => void;
  onEditOpportunity?: (index: number, opportunity: JourneyOpportunity) => void;
  onAddPainPoint?: (painPoint: JourneyPainPoint) => void;
  onAddOpportunity?: (opportunity: JourneyOpportunity) => void;
  onDeletePainPoint?: (index: number) => void;
  onDeleteOpportunity?: (index: number) => void;
  editable?: boolean;
}

// 严重程度配置
const SEVERITY_CONFIG: Record<SeverityLevel, { label: string; color: string }> = {
  low: { label: '低', color: 'bg-green-100 text-green-800' },
  medium: { label: '中', color: 'bg-yellow-100 text-yellow-800' },
  high: { label: '高', color: 'bg-red-100 text-red-800' },
};

// 频率配置
const FREQUENCY_CONFIG: Record<FrequencyLevel, { label: string }> = {
  rare: { label: '偶尔' },
  occasional: { label: '有时' },
  frequent: { label: '频繁' },
};

// 努力程度配置
const EFFORT_CONFIG: Record<EffortLevel, { label: string; color: string }> = {
  low: { label: '低', color: 'bg-green-100 text-green-800' },
  medium: { label: '中', color: 'bg-yellow-100 text-yellow-800' },
  high: { label: '高', color: 'bg-red-100 text-red-800' },
};

/**
 * 痛点与机会点组件
 * 展示痛点和机会点列表，支持添加、编辑、删除操作
 */
export function JourneyPainOpportunity({
  stages,
  painPoints,
  opportunities,
  onEditPainPoint,
  onEditOpportunity,
  onAddPainPoint,
  onAddOpportunity,
  onDeletePainPoint,
  onDeleteOpportunity,
  editable = false,
}: JourneyPainOpportunityProps) {
  const [dialogType, setDialogType] = useState<'painPoint' | 'opportunity' | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [painPointForm, setPainPointForm] = useState<JourneyPainPoint>({
    stage: '',
    painPoint: '',
    severity: 'medium',
    frequency: 'occasional',
  });
  const [opportunityForm, setOpportunityForm] = useState<JourneyOpportunity>({
    stage: '',
    opportunity: '',
    potential: 'medium',
    effort: 'medium',
  });

  const handleOpenAddPainPoint = () => {
    setDialogType('painPoint');
    setEditingIndex(null);
    setPainPointForm({
      stage: stages[0]?.name || '',
      painPoint: '',
      severity: 'medium',
      frequency: 'occasional',
    });
  };

  const handleOpenEditPainPoint = (index: number) => {
    setDialogType('painPoint');
    setEditingIndex(index);
    setPainPointForm(painPoints[index]);
  };

  const handleOpenAddOpportunity = () => {
    setDialogType('opportunity');
    setEditingIndex(null);
    setOpportunityForm({
      stage: stages[0]?.name || '',
      opportunity: '',
      potential: 'medium',
      effort: 'medium',
    });
  };

  const handleOpenEditOpportunity = (index: number) => {
    setDialogType('opportunity');
    setEditingIndex(index);
    setOpportunityForm(opportunities[index]);
  };

  const handleSavePainPoint = () => {
    if (editingIndex !== null && onEditPainPoint) {
      onEditPainPoint(editingIndex, painPointForm);
    } else if (onAddPainPoint) {
      onAddPainPoint(painPointForm);
    }
    setDialogType(null);
    setEditingIndex(null);
  };

  const handleSaveOpportunity = () => {
    if (editingIndex !== null && onEditOpportunity) {
      onEditOpportunity(editingIndex, opportunityForm);
    } else if (onAddOpportunity) {
      onAddOpportunity(opportunityForm);
    }
    setDialogType(null);
    setEditingIndex(null);
  };

  return (
    <div className="space-y-6">
      {/* 痛点区域 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            <h3 className="text-lg font-semibold">痛点分析</h3>
            <Badge variant="secondary">{painPoints.length} 个痛点</Badge>
          </div>
          {editable && (
            <Button variant="outline" size="sm" onClick={handleOpenAddPainPoint}>
              <Plus className="w-4 h-4 mr-2" />
              添加痛点
            </Button>
          )}
        </div>

        {painPoints.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground border rounded-lg">
            暂无痛点数据
          </div>
        ) : (
          <div className="space-y-3">
            {painPoints.map((painPoint, index) => (
              <div
                key={index}
                className="flex items-start justify-between p-4 rounded-lg border bg-card"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingDown className="w-4 h-4 text-destructive" />
                    <Badge variant="outline">{painPoint.stage}</Badge>
                    <Badge className={SEVERITY_CONFIG[painPoint.severity].color}>
                      严重程度: {SEVERITY_CONFIG[painPoint.severity].label}
                    </Badge>
                    <Badge variant="secondary">
                      频率: {FREQUENCY_CONFIG[painPoint.frequency].label}
                    </Badge>
                  </div>
                  <p className="text-sm">{painPoint.painPoint}</p>
                </div>
                {editable && (
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenEditPainPoint(index)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    {onDeletePainPoint && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDeletePainPoint(index)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 机会点区域 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">机会点</h3>
            <Badge variant="secondary">{opportunities.length} 个机会</Badge>
          </div>
          {editable && (
            <Button variant="outline" size="sm" onClick={handleOpenAddOpportunity}>
              <Plus className="w-4 h-4 mr-2" />
              添加机会点
            </Button>
          )}
        </div>

        {opportunities.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground border rounded-lg">
            暂无机会点数据
          </div>
        ) : (
          <div className="space-y-3">
            {opportunities.map((opportunity, index) => (
              <div
                key={index}
                className="flex items-start justify-between p-4 rounded-lg border bg-card"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    <Badge variant="outline">{opportunity.stage}</Badge>
                    <Badge className={SEVERITY_CONFIG[opportunity.potential].color}>
                      潜力: {SEVERITY_CONFIG[opportunity.potential].label}
                    </Badge>
                    <Badge className={EFFORT_CONFIG[opportunity.effort].color}>
                      努力: {EFFORT_CONFIG[opportunity.effort].label}
                    </Badge>
                  </div>
                  <p className="text-sm">{opportunity.opportunity}</p>
                </div>
                {editable && (
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenEditOpportunity(index)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    {onDeleteOpportunity && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDeleteOpportunity(index)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 痛点编辑对话框 */}
      <Dialog open={dialogType === 'painPoint'} onOpenChange={() => setDialogType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingIndex !== null ? '编辑痛点' : '添加痛点'}</DialogTitle>
            <DialogDescription>记录用户旅程中的痛点</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>所属阶段</Label>
              <Select
                value={painPointForm.stage}
                onValueChange={(value) =>
                  setPainPointForm((prev) => ({ ...prev, stage: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择阶段" />
                </SelectTrigger>
                <SelectContent>
                  {stages.map((stage) => (
                    <SelectItem key={stage.name} value={stage.name}>
                      {stage.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>痛点描述</Label>
              <Textarea
                value={painPointForm.painPoint}
                onChange={(e) =>
                  setPainPointForm((prev) => ({ ...prev, painPoint: e.target.value }))
                }
                placeholder="描述痛点内容"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>严重程度</Label>
                <Select
                  value={painPointForm.severity}
                  onValueChange={(value: SeverityLevel) =>
                    setPainPointForm((prev) => ({ ...prev, severity: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(SEVERITY_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>发生频率</Label>
                <Select
                  value={painPointForm.frequency}
                  onValueChange={(value: FrequencyLevel) =>
                    setPainPointForm((prev) => ({ ...prev, frequency: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(FREQUENCY_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogType(null)}>
              取消
            </Button>
            <Button onClick={handleSavePainPoint}>
              {editingIndex !== null ? '保存' : '添加'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 机会点编辑对话框 */}
      <Dialog open={dialogType === 'opportunity'} onOpenChange={() => setDialogType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingIndex !== null ? '编辑机会点' : '添加机会点'}
            </DialogTitle>
            <DialogDescription>记录用户旅程中的改进机会</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>所属阶段</Label>
              <Select
                value={opportunityForm.stage}
                onValueChange={(value) =>
                  setOpportunityForm((prev) => ({ ...prev, stage: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择阶段" />
                </SelectTrigger>
                <SelectContent>
                  {stages.map((stage) => (
                    <SelectItem key={stage.name} value={stage.name}>
                      {stage.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>机会点描述</Label>
              <Textarea
                value={opportunityForm.opportunity}
                onChange={(e) =>
                  setOpportunityForm((prev) => ({
                    ...prev,
                    opportunity: e.target.value,
                  }))
                }
                placeholder="描述机会点内容"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>潜力</Label>
                <Select
                  value={opportunityForm.potential}
                  onValueChange={(value: SeverityLevel) =>
                    setOpportunityForm((prev) => ({ ...prev, potential: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(SEVERITY_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>实施难度</Label>
                <Select
                  value={opportunityForm.effort}
                  onValueChange={(value: EffortLevel) =>
                    setOpportunityForm((prev) => ({ ...prev, effort: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(EFFORT_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogType(null)}>
              取消
            </Button>
            <Button onClick={handleSaveOpportunity}>
              {editingIndex !== null ? '保存' : '添加'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default JourneyPainOpportunity;