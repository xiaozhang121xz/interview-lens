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
import { Textarea } from '@/components/ui/textarea';
import type { JourneyStage } from '@/lib/api/interview-assistant/types';
import { CheckCircle, Circle, Edit2, MapPin } from 'lucide-react';
import { useState } from 'react';

interface JourneyStageTimelineProps {
  stages: JourneyStage[];
  onEdit?: (index: number, stage: JourneyStage) => void;
  editable?: boolean;
  activeStageIndex?: number;
}

/**
 * 用户旅程阶段时间线组件
 * 展示用户旅程的阶段时间线，支持编辑阶段名称和描述
 */
export function JourneyStageTimeline({
  stages,
  onEdit,
  editable = false,
  activeStageIndex,
}: JourneyStageTimelineProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<JourneyStage>({ name: '', description: '' });
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleOpenEdit = (index: number) => {
    setEditingIndex(index);
    setEditForm(stages[index]);
    setDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (editingIndex !== null && onEdit) {
      onEdit(editingIndex, editForm);
    }
    setDialogOpen(false);
    setEditingIndex(null);
  };

  if (stages.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        暂无阶段信息
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <MapPin className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">旅程阶段</h3>
        <Badge variant="secondary">{stages.length} 个阶段</Badge>
      </div>

      {/* 时间线 */}
      <div className="relative">
        {/* 连接线 */}
        <div className="absolute left-4 top-8 bottom-8 w-0.5 bg-gradient-to-b from-primary/50 via-primary/30 to-primary/10" />

        <div className="space-y-4">
          {stages.map((stage, index) => (
            <div
              key={index}
              className={`relative flex items-start gap-4 p-4 rounded-lg border transition-colors ${
                activeStageIndex === index
                  ? 'bg-primary/5 border-primary/30'
                  : 'bg-card hover:bg-muted/50'
              }`}
            >
              {/* 节点 */}
              <div className="relative z-10 flex-shrink-0">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    activeStageIndex === index
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {activeStageIndex === index ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <Circle className="w-4 h-4" />
                  )}
                </div>
              </div>

              {/* 内容 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        阶段 {index + 1}
                      </span>
                      <h4 className="font-medium">{stage.name}</h4>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {stage.description}
                    </p>
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
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 编辑对话框 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑阶段</DialogTitle>
            <DialogDescription>修改阶段名称和描述</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>阶段名称</Label>
              <Input
                value={editForm.name}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="输入阶段名称"
              />
            </div>
            <div className="space-y-2">
              <Label>阶段描述</Label>
              <Textarea
                value={editForm.description}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="输入阶段描述"
                rows={3}
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

export default JourneyStageTimeline;