/**
 * 分享报告 Agent 类型
 *
 * @module lib/agent/types
 */

export type ShareReportAgentAction =
  | {
      action: 'invoke_skill';
      skill: 'slides';
      payload: {
        mode: 'native' | 'slides';
        includeImages: boolean;
        validateLayout: boolean;
      };
      reason: string;
      source: 'rule' | 'llm' | 'fallback';
      warnings: string[];
    }
  | {
      action: 'skip';
      reason: string;
      source: 'rule' | 'llm' | 'fallback';
      warnings: string[];
    };
