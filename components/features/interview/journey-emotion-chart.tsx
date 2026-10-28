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
  JourneyEmotion,
  JourneyStage,
  EmotionType,
} from '@/lib/api/interview-assistant/types';
import {
  Edit2,
  Frown,
  HelpCircle,
  Laugh,
  Meh,
  Smile,
  TrendingUp,
} from 'lucide-react';
import { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
} from 'recharts';

interface JourneyEmotionChartProps {
  stages: JourneyStage[];
  emotions: JourneyEmotion[];
  onEdit?: (index: number, emotion: JourneyEmotion) => void;
  editable?: boolean;
}

// 情绪类型配置
const EMOTION_CONFIG: Record<
  EmotionType,
  { label: string; color: string; icon: typeof Smile }
> = {
  happy: { label: '开心', color: '#22c55e', icon: Smile },
  excited: { label: '兴奋', color: '#f97316', icon: Laugh },
  neutral: { label: '平静', color: '#6b7280', icon: Meh },
  sad: { label: '低落', color: '#3b82f6', icon: Frown },
  frustrated: { label: '沮丧', color: '#ef4444', icon: Frown },
};

/**
 * 用户情绪曲线图组件
 * 使用 recharts 展示情绪曲线图，支持编辑情绪数据
 */
export function JourneyEmotionChart({
  stages,
  emotions,
  onEdit,
  editable = false,
}: JourneyEmotionChartProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<JourneyEmotion>({
    stage: '',
    emotion: 'neutral',
    intensity: 3,
    reason: '',
  });
  const [dialogOpen, setDialogOpen] = useState(false);

  // 构建图表数据
  const chartData = stages.map((stage, index) => {
    const emotion = emotions.find((e) => e.stage === stage.name);
    return {
      name: stage.name,
      stage: stage.name,
      stageIndex: index + 1,
      intensity: emotion?.intensity || 3,
      emotion: emotion?.emotion || 'neutral',
      reason: emotion?.reason || '',
      hasEmotion: !!emotion,
    };
  });

  const handleOpenEdit = (index: number) => {
    const emotion = emotions[index];
    setEditingIndex(index);
    setEditForm(emotion);
    setDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (editingIndex !== null && onEdit) {
      onEdit(editingIndex, editForm);
    }
    setDialogOpen(false);
    setEditingIndex(null);
  };

  // 自定义 Tooltip
  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{ payload: typeof chartData[0] }>;
  }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const config = EMOTION_CONFIG[data.emotion as EmotionType];
      return (
        <div className="bg-popover border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{data.name}</p>
          <div className="flex items-center gap-2 mt-1">
            <Badge
              variant="outline"
              style={{ borderColor: config.color, color: config.color }}
            >
              {config.label}
            </Badge>
            <span className="text-sm text-muted-foreground">
              强度: {data.intensity}
            </span>
          </div>
          {data.reason && (
            <p className="text-sm text-muted-foreground mt-1">{data.reason}</p>
          )}
        </div>
      );
    }
    return null;
  };

  if (emotions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        暂无情绪数据
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">情绪曲线</h3>
        <Badge variant="secondary">{emotions.length} 个情绪节点</Badge>
      </div>

      {/* 图表 */}
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="stageIndex"
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => `阶段${value}`}
              className="text-muted-foreground"
            />
            <YAxis
              domain={[1, 5]}
              ticks={[1, 2, 3, 4, 5]}
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => {
                const labels: Record<number, string> = {
                  1: '很低',
                  2: '低',
                  3: '中',
                  4: '高',
                  5: '很高',
                };
                return labels[value];
              }}
              className="text-muted-foreground"
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="intensity"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={({ cx, cy, payload }) => {
                const config = EMOTION_CONFIG[payload.emotion as EmotionType];
                return (
                  <g>
                    <circle
                      cx={cx}
                      cy={cy}
                      r={8}
                      fill={config.color}
                      stroke="white"
                      strokeWidth={2}
                      className="cursor-pointer"
                      onClick={() => {
                        if (editable) {
                          const idx = emotions.findIndex(
                            (e) => e.stage === payload.stage
                          );
                          if (idx !== -1) handleOpenEdit(idx);
                        }
                      }}
                    />
                    {editable && (
                      <title>点击编辑</title>
                    )}
                  </g>
                );
              }}
              activeDot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 情绪图例 */}
      <div className="flex flex-wrap gap-3 justify-center">
        {Object.entries(EMOTION_CONFIG).map(([key, config]) => {
          const IconComponent = config.icon;
          return (
            <div
              key={key}
              className="flex items-center gap-1 text-sm text-muted-foreground"
            >
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: config.color }}
              />
              <span>{config.label}</span>
            </div>
          );
        })}
      </div>

      {/* 情绪列表 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
        {emotions.map((emotion, index) => {
          const config = EMOTION_CONFIG[emotion.emotion];
          const IconComponent = config.icon;
          return (
            <div
              key={index}
              className="flex items-start justify-between p-3 rounded-lg border bg-card"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <IconComponent
                    className="w-4 h-4"
                    style={{ color: config.color }}
                  />
                  <span className="font-medium">{emotion.stage}</span>
                  <Badge variant="outline" style={{ color: config.color }}>
                    {config.label}
                  </Badge>
                  <Badge variant="secondary">强度: {emotion.intensity}</Badge>
                </div>
                {emotion.reason && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {emotion.reason}
                  </p>
                )}
              </div>
              {editable && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleOpenEdit(index)}
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {/* 编辑对话框 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑情绪</DialogTitle>
            <DialogDescription>修改情绪类型和强度</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>所属阶段</Label>
              <Input value={editForm.stage} disabled />
            </div>
            <div className="space-y-2">
              <Label>情绪类型</Label>
              <Select
                value={editForm.emotion}
                onValueChange={(value: EmotionType) =>
                  setEditForm((prev) => ({ ...prev, emotion: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(EMOTION_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: config.color }}
                        />
                        {config.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>情绪强度 (1-5)</Label>
              <Select
                value={String(editForm.intensity)}
                onValueChange={(value) =>
                  setEditForm((prev) => ({
                    ...prev,
                    intensity: Number(value) as 1 | 2 | 3 | 4 | 5,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n} - {['很低', '低', '中', '高', '很高'][n - 1]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>情绪原因</Label>
              <Textarea
                value={editForm.reason || ''}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, reason: e.target.value }))
                }
                placeholder="描述情绪产生的原因"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSaveEdit}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default JourneyEmotionChart;