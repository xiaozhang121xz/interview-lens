'use client';

/**
 * 访谈验证流程图组件
 *
 * @module components/features/interview/InterviewFlowChart
 * @description 使用React Flow展示分析点→问题的验证路径
 */

import { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import type { InsightReport, Outline } from '@/lib/api/interview-assistant/types';
import { generateFlowData } from '@/lib/utils/interview-flow-utils';

interface InterviewFlowChartProps {
  insightReport: InsightReport;
  outlines: Outline[];
}

export function InterviewFlowChart({ insightReport, outlines }: InterviewFlowChartProps) {
  // 生成节点和边
  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => generateFlowData(insightReport, outlines),
    [insightReport, outlines]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // 缩放到适应视图
  const fitView = useCallback(() => {
    // React Flow会自动处理
  }, []);

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Maximize2 className="h-5 w-5 text-primary" />
            验证流程图
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {outlines.filter(o => o.status === 'asked').length}/{outlines.length} 已问
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="h-[500px] w-full">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            fitView
            attributionPosition="bottom-left"
            proOptions={{ hideAttribution: true }}
          >
            <Background gap={16} size={1} />
            <Controls showInteractive={false} />
            <MiniMap
              nodeColor={(node) => {
                if (node.data?.verificationStatus === 'verified') return '#22c55e';
                if (node.data?.verificationStatus === 'partially_verified') return '#eab308';
                if (node.data?.explorationStatus === 'explored') return '#22c55e';
                return '#94a3b8';
              }}
              maskColor="rgba(0, 0, 0, 0.1)"
            />
          </ReactFlow>
        </div>

        {/* 图例 */}
        <div className="border-t p-3 flex items-center gap-4 text-xs text-muted-foreground">
          <span>图例:</span>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-green-500" />
            <span>已验证/已探索</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-yellow-500" />
            <span>部分验证</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-gray-300" />
            <span>未验证/未探索</span>
          </div>
          <div className="flex items-center gap-1 ml-4">
            <div className="w-6 border-t-2 border-dashed border-gray-400" />
            <span>待提问</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}