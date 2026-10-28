/**
 * Skill 注册中心
 *
 * @module lib/skills/registry
 */

import {
  executeSlidesSkill,
  type SlidesSkillInput,
  type SlidesSkillResult,
} from './executors/slides-executor';
import type { SkillDefinition, SkillExecutionEnvelope } from './types';

type RegistryMap = {
  slides: SkillDefinition<SlidesSkillInput, SlidesSkillResult>;
};

const registry: RegistryMap = {
  slides: {
    name: 'slides',
    description: '基于分享报告大纲生成并校验 PPT 预产物',
    execute: executeSlidesSkill,
  },
};

export type SkillName = keyof RegistryMap;

export function getSkillDefinition<TName extends SkillName>(
  name: TName
): RegistryMap[TName] {
  return registry[name];
}

type SkillInputMap = {
  slides: SlidesSkillInput;
};

type SkillResultMap = {
  slides: SlidesSkillResult;
};

export async function executeSkill<TName extends SkillName>(
  name: TName,
  input: SkillInputMap[TName]
): Promise<SkillExecutionEnvelope<SkillResultMap[TName]>> {
  const definition = getSkillDefinition(name);

  try {
    const result = await definition.execute(input) as SkillResultMap[TName];
    return {
      skill: name,
      success: true,
      result,
    };
  } catch (error) {
    return {
      skill: name,
      success: false,
      error: error instanceof Error ? error.message : 'Skill 执行失败',
    };
  }
}
