# Contributing

感谢你为 TalkAgent 做贡献。

## 开发流程

1. Fork 仓库并从主分支创建功能分支。
2. 复制 `.env.example` 为 `.env.local`，只填写本地或测试凭据。
3. 保持改动聚焦，并为行为变化补充测试。
4. 提交前运行：

```bash
npm run typecheck
npm run test:unit
npm run lint
npm run build
```

涉及接口、数据库或完整用户流程时，额外运行：

```bash
npm run test:functional
npm test
```

## Pull Request

请说明问题、实现方式、验证步骤和可能的兼容性影响。界面变化建议附截图。不要在 PR、Issue、日志或测试夹具中包含真实客户数据和凭据。

## 代码约定

- 使用 TypeScript，并保持现有目录结构和错误响应格式。
- API 输入使用 Zod 校验，用户资源查询必须带所有权条件。
- AI 结论必须能够追溯到访谈证据；缺失信息标记为待确认。
- 不要绕过认证、速率限制、数据范围或结果质量检查。
