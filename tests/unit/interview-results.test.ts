import test from 'node:test';
import assert from 'node:assert/strict';
import { buildInterviewEvidence } from '../../lib/ai/interview-evidence.ts';
import {
  RESULT_JOURNEY_SYSTEM_PROMPT,
  RESULT_PERSONA_SYSTEM_PROMPT,
  RESULT_PRD_SYSTEM_PROMPT,
  RESULT_SUMMARY_SYSTEM_PROMPT,
} from '../../lib/ai/prompts/interview-results.ts';
import { summaryResponseSchema } from '../../lib/validations/ai.ts';
import {
  validateJourneyQuality,
  validatePersonaQuality,
  validatePRDQuality,
  validateSummaryQuality,
} from '../../lib/ai/result-quality.ts';

test('合并人工记录和实时转写，并为证据编号和去重', () => {
  const result = buildInterviewEvidence(
    [
      {
        content: '审批通常需要三天。',
        type: 'pain_point',
        isHighlight: true,
        createdAt: '2026-01-01T00:00:02.000Z',
      },
    ],
    [
      {
        content: '我们每天都要重复录入客户资料。',
        speaker: '客户',
        confidence: 0.96,
        createdAt: '2026-01-01T00:00:01.000Z',
      },
      {
        content: '审批通常需要三天。',
        speaker: '客户',
        createdAt: '2026-01-01T00:00:03.000Z',
      },
    ]
  );

  assert.equal(result.count, 2);
  assert.match(result.text, /\[T1\]\[实时转写\]\[客户\]/);
  assert.match(result.text, /\[R1\]\[痛点记录\]【重点】/);
  assert.equal(result.text.match(/审批通常需要三天/g)?.length, 1);
  assert.ok(result.text.indexOf('[T1]') < result.text.indexOf('[R1]'));
});

test('结果 Prompt 强制证据引用、未知项标记和可验证输出', () => {
  for (const prompt of [
    RESULT_SUMMARY_SYSTEM_PROMPT,
    RESULT_PRD_SYSTEM_PROMPT,
    RESULT_PERSONA_SYSTEM_PROMPT,
    RESULT_JOURNEY_SYSTEM_PROMPT,
  ]) {
    assert.match(prompt, /\[R1\]/);
    assert.match(prompt, /\[待确认\]/);
    assert.match(prompt, /不得/);
    assert.match(prompt, /JSON/);
  }
  assert.match(RESULT_PRD_SYSTEM_PROMPT, /验收标准/);
  assert.match(RESULT_PRD_SYSTEM_PROMPT, /非目标/);
  assert.match(RESULT_PERSONA_SYSTEM_PROMPT, /不要虚构/);
});

test('纪要结构对缺省数组进行归一化', () => {
  const parsed = summaryResponseSchema.parse({
    summary: '测试总结',
    painPoints: [],
    requirements: [],
  });
  assert.deepEqual(parsed.keyPoints, []);
  assert.deepEqual(parsed.risks, []);
  assert.deepEqual(parsed.nextSteps, []);
});

test('质量闸门拒绝无证据的漂亮空话，接受有证据的可执行结果', () => {
  assert.ok(validateSummaryQuality({
    summary: '内容很有价值。',
    keyPoints: ['效率需要提升'],
    painPoints: [],
    requirements: [],
    risks: [],
    nextSteps: [],
  }).length > 0);
  assert.deepEqual(validateSummaryQuality({
    summary: '客户当前每天重复录入客户资料，已经影响跟进效率；本次访谈确认了需要减少重复录入并保留人工校验环节。',
    keyPoints: ['客户每天重复录入资料 [T1]'],
    painPoints: ['重复录入占用跟进时间 [T1]'],
    requirements: ['需要自动同步并支持人工校验 [R2]'],
    risks: ['具体节省时长尚未量化 [待确认]'],
    nextSteps: ['由客户负责人确认现有字段清单和同步边界'],
  }), []);

  assert.ok(validatePRDQuality({ content: '# PRD\n做一个系统' }).length > 0);
  assert.ok(validatePersonaQuality({ goals: [], painPoints: [], behaviors: [], quotes: [] }).length > 0);
  assert.ok(validateJourneyQuality({ stages: [], actions: [], painPoints: [] }).length > 0);
});

