/**
 * Skill 系统通用类型
 *
 * @module lib/skills/types
 */

export interface SkillDefinition<TInput = unknown, TResult = unknown> {
  name: string;
  description: string;
  execute: (input: TInput) => Promise<TResult>;
}

export interface SkillExecutionEnvelope<TResult = unknown> {
  skill: string;
  success: boolean;
  result?: TResult;
  error?: string;
}
