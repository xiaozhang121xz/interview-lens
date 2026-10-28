/**
 * 流程图数据生成工具
 *
 * @module lib/utils/interview-flow-utils
 * @description 将InsightReport + Outlines转换为React Flow节点和边
 */

import type { Node, Edge } from '@xyflow/react';
import type { InsightReport, Outline } from '@/lib/api/interview-assistant/types';

// 节点类型定义
export type PainPointNodeData = {
  label: string;
  hypothesis: string;
  confidence: 'high' | 'medium' | 'low';
  index: number;
  verificationStatus: 'unverified' | 'partially_verified' | 'verified';
  totalQuestions: number;
  askedCount: number;
};

export type PriorityAreaNodeData = {
  label: string;
  area: string;
  index: number;
  explorationStatus: 'unexplored' | 'explored';
  totalQuestions: number;
  askedCount: number;
};

export type QuestionNodeData = {
  label: string;
  question: string;
  status: 'pending' | 'asked' | 'skipped';
  reasoning?: string;
  priority: number;
};

export type RootNodeData = {
  label: string;
};

/**
 * 计算痛点假设验证状态
 */
function calculateVerificationStatus(
  outlines: Outline[],
  painPointIndex: number
): 'unverified' | 'partially_verified' | 'verified' {
  const relatedQuestions = outlines.filter(o => o.relatedPainPointIndex === painPointIndex);
  const askedQuestions = relatedQuestions.filter(o => o.status === 'asked');

  if (askedQuestions.length === 0) return 'unverified';
  if (askedQuestions.length < relatedQuestions.length) return 'partially_verified';
  return 'verified';
}

/**
 * 计算优先领域探索状态
 */
function calculateExplorationStatus(
  outlines: Outline[],
  areaIndex: number
): 'unexplored' | 'explored' {
  const relatedQuestions = outlines.filter(o => o.relatedPriorityAreaIndex === areaIndex);
  const askedQuestions = relatedQuestions.filter(o => o.status === 'asked');
  return askedQuestions.length > 0 ? 'explored' : 'unexplored';
}

/**
 * 生成流程图数据
 */
export function generateFlowData(insightReport: InsightReport, outlines: Outline[]) {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  let nodeId = 0;
  const getNextId = () => `node-${nodeId++}`;

  // 1. 创建根节点
  const rootId = getNextId();
  nodes.push({
    id: rootId,
    type: 'input',
    position: { x: 400, y: 0 },
    data: { label: '访谈分析报告' },
    style: {
      background: 'hsl(var(--primary))',
      color: 'white',
      padding: '10px 20px',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: 600,
    },
  });

  // 2. 创建痛点假设组
  const painPointGroupId = getNextId();
  nodes.push({
    id: painPointGroupId,
    position: { x: 0, y: 100 },
    style: {
      width: '350px',
      background: 'hsl(var(--muted) / 0.3)',
      border: '1px dashed hsl(var(--border))',
      borderRadius: '8px',
      padding: '10px',
    },
    data: { label: '痛点假设验证' },
  });

  // 连接根节点到痛点组
  edges.push({
    id: `edge-${rootId}-${painPointGroupId}`,
    source: rootId,
    target: painPointGroupId,
    style: { stroke: 'hsl(var(--muted-foreground))' },
  });

  // 3. 为每个痛点假设创建节点
  insightReport.painPointHypotheses.forEach((pain, index) => {
    const painPointId = getNextId();
    const verificationStatus = calculateVerificationStatus(outlines, index);
    const relatedQuestions = outlines.filter(o => o.relatedPainPointIndex === index);
    const askedCount = relatedQuestions.filter(o => o.status === 'asked').length;

    // 状态颜色
    const statusColors = {
      unverified: { bg: 'hsl(var(--muted))', border: 'hsl(var(--border))' },
      partially_verified: { bg: 'hsl(var(--warning) / 0.1)', border: 'hsl(var(--warning))' },
      verified: { bg: 'hsl(var(--success) / 0.1)', border: 'hsl(var(--success))' },
    };
    const colors = statusColors[verificationStatus];

    nodes.push({
      id: painPointId,
      position: { x: 20, y: 50 + index * 120 },
      data: {
        label: `#${index + 1} ${pain.hypothesis.slice(0, 20)}...`,
        hypothesis: pain.hypothesis,
        confidence: pain.confidence,
        index,
        verificationStatus,
        totalQuestions: relatedQuestions.length,
        askedCount,
      } as PainPointNodeData,
      style: {
        background: colors.bg,
        border: `2px solid ${colors.border}`,
        borderRadius: '8px',
        padding: '8px 12px',
        fontSize: '12px',
        width: '300px',
      },
    });

    // 连接痛点组到痛点节点
    edges.push({
      id: `edge-${painPointGroupId}-${painPointId}`,
      source: painPointGroupId,
      target: painPointId,
      style: { stroke: 'hsl(var(--muted-foreground))' },
    });

    // 4. 为痛点创建问题节点
    relatedQuestions.forEach((outline, qIndex) => {
      const questionId = getNextId();
      const statusColors = {
        pending: { bg: 'white', border: 'hsl(var(--primary) / 0.3)' },
        asked: { bg: 'hsl(var(--primary) / 0.1)', border: 'hsl(var(--primary))' },
        skipped: { bg: 'hsl(var(--muted))', border: 'hsl(var(--border))' },
      };
      const qColors = statusColors[outline.status as keyof typeof statusColors];

      nodes.push({
        id: questionId,
        position: { x: 30, y: 50 + index * 120 + 50 + qIndex * 50 },
        data: {
          label: `${outline.question.slice(0, 25)}...`,
          question: outline.question,
          status: outline.status,
          reasoning: outline.reasoning,
          priority: outline.priority,
        } as QuestionNodeData,
        style: {
          background: qColors.bg,
          border: `1px solid ${qColors.border}`,
          borderRadius: '6px',
          padding: '6px 10px',
          fontSize: '11px',
          width: '280px',
        },
      });

      // 连接痛点节点到问题节点
      edges.push({
        id: `edge-${painPointId}-${questionId}`,
        source: painPointId,
        target: questionId,
        animated: outline.status === 'pending',
        style: {
          stroke: outline.status === 'asked' ? 'hsl(var(--success))' : 'hsl(var(--muted-foreground))',
          strokeDasharray: outline.status === 'pending' ? '5,5' : undefined,
        },
      });
    });
  });

  // 5. 创建优先领域组
  const priorityAreaGroupId = getNextId();
  nodes.push({
    id: priorityAreaGroupId,
    position: { x: 450, y: 100 },
    style: {
      width: '300px',
      background: 'hsl(var(--muted) / 0.3)',
      border: '1px dashed hsl(var(--border))',
      borderRadius: '8px',
      padding: '10px',
    },
    data: { label: '优先领域探索' },
  });

  // 连接根节点到优先领域组
  edges.push({
    id: `edge-${rootId}-${priorityAreaGroupId}`,
    source: rootId,
    target: priorityAreaGroupId,
    style: { stroke: 'hsl(var(--muted-foreground))' },
  });

  // 6. 为每个优先领域创建节点
  insightReport.interviewStrategy.priorityAreas.forEach((area, index) => {
    const areaId = getNextId();
    const explorationStatus = calculateExplorationStatus(outlines, index);
    const relatedQuestions = outlines.filter(o => o.relatedPriorityAreaIndex === index);
    const askedCount = relatedQuestions.filter(o => o.status === 'asked').length;

    const statusColors = {
      unexplored: { bg: 'hsl(var(--muted))', border: 'hsl(var(--border))' },
      explored: { bg: 'hsl(var(--success) / 0.1)', border: 'hsl(var(--success))' },
    };
    const colors = statusColors[explorationStatus];

    nodes.push({
      id: areaId,
      position: { x: 20, y: 50 + index * 100 },
      data: {
        label: `#${index + 1} ${area}`,
        area,
        index,
        explorationStatus,
        totalQuestions: relatedQuestions.length,
        askedCount,
      } as PriorityAreaNodeData,
      style: {
        background: colors.bg,
        border: `2px solid ${colors.border}`,
        borderRadius: '8px',
        padding: '8px 12px',
        fontSize: '12px',
        width: '250px',
      },
    });

    // 连接优先领域组到领域节点
    edges.push({
      id: `edge-${priorityAreaGroupId}-${areaId}`,
      source: priorityAreaGroupId,
      target: areaId,
      style: { stroke: 'hsl(var(--muted-foreground))' },
    });

    // 7. 为领域创建问题节点
    relatedQuestions.forEach((outline, qIndex) => {
      const questionId = getNextId();
      const statusColors = {
        pending: { bg: 'white', border: 'hsl(var(--primary) / 0.3)' },
        asked: { bg: 'hsl(var(--primary) / 0.1)', border: 'hsl(var(--primary))' },
        skipped: { bg: 'hsl(var(--muted))', border: 'hsl(var(--border))' },
      };
      const qColors = statusColors[outline.status as keyof typeof statusColors];

      nodes.push({
        id: questionId,
        position: { x: 30, y: 50 + index * 100 + 50 + qIndex * 50 },
        data: {
          label: `${outline.question.slice(0, 25)}...`,
          question: outline.question,
          status: outline.status,
          priority: outline.priority,
        } as QuestionNodeData,
        style: {
          background: qColors.bg,
          border: `1px solid ${qColors.border}`,
          borderRadius: '6px',
          padding: '6px 10px',
          fontSize: '11px',
          width: '230px',
        },
      });

      // 连接领域节点到问题节点
      edges.push({
        id: `edge-${areaId}-${questionId}`,
        source: areaId,
        target: questionId,
        animated: outline.status === 'pending',
        style: {
          stroke: outline.status === 'asked' ? 'hsl(var(--success))' : 'hsl(var(--muted-foreground))',
          strokeDasharray: outline.status === 'pending' ? '5,5' : undefined,
        },
      });
    });
  });

  return { nodes, edges };
}