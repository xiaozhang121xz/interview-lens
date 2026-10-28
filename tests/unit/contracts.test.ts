import assert from 'node:assert/strict';
import test from 'node:test';
import {
  customerCreateSchema,
  templateCreateSchema,
  usernameLoginSchema,
} from '../../packages/contracts/src/index.ts';

test('客户合同拒绝空名称和无效网站', () => {
  const result = customerCreateSchema.safeParse({
    name: '',
    industry: '软件',
    website: 'example.com',
  });

  assert.equal(result.success, false);
});

test('模板合同为 isPublic 提供安全默认值', () => {
  const result = templateCreateSchema.parse({
    name: '客户访谈模板',
    outline: '{"sections":[]}',
  });

  assert.equal(result.isPublic, false);
});

test('登录合同限制空用户名和密码', () => {
  assert.equal(
    usernameLoginSchema.safeParse({ username: '', password: '' }).success,
    false
  );
});
