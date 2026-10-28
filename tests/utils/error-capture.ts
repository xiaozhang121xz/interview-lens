/**
 * Next.js 错误捕获工具
 * 用于在E2E测试中自动捕获Next.js错误覆盖层信息
 */

import { Page } from '@playwright/test';

export interface ErrorReport {
  timestamp: string;
  type: ErrorType;
  priority: 'P0' | 'P1' | 'P2';
  content: string;
  extractionMethod: 'copy-button' | 'dom-extraction' | 'console';
  screenshotPath?: string;
  url: string;
  consoleErrors: ConsoleError[];
  testStep?: string;
}

export type ErrorType =
  | 'MODULE_RESOLUTION_ERROR'
  | 'COMPILATION_ERROR'
  | 'RUNTIME_ERROR'
  | 'HYDRATION_ERROR'
  | 'API_ROUTE_ERROR'
  | 'NETWORK_ERROR'
  | 'UNKNOWN_ERROR';

export interface ConsoleError {
  text: string;
  location?: {
    url?: string;
    lineNumber?: number;
    columnNumber?: number;
  };
}

/**
 * 复制按钮选择器优先级列表
 */
const COPY_BUTTON_SELECTORS = [
  'button:has-text("复制")',
  'button:has-text("Copy")',
  '[aria-label="Copy"]',
  'next-dev-overlay button[title="Copy"]',
  '.copy-button',
  'button[title*="opy"]', // Fallback for variations
];

/**
 * 检测是否存在Next.js错误覆盖层
 */
export async function detectNextJSErrorOverlay(page: Page): Promise<boolean> {
  const selectors = [
    'next-dev-overlay',
    '[data-next-dev-overlay]',
    '.next-dev-overlay',
  ];

  for (const selector of selectors) {
    try {
      const count = await page.locator(selector).count();
      if (count > 0) {
        return true;
      }
    } catch {
      continue;
    }
  }

  return false;
}

/**
 * 捕获Next.js错误（主要入口函数）
 */
export async function captureNextJSError(
  page: Page,
  testStep?: string
): Promise<ErrorReport> {
  const timestamp = new Date().toISOString();

  console.log('🔍 开始捕获Next.js错误...');

  // 步骤1: 尝试点击复制按钮（首选方法）
  const copiedText = await tryClickCopyButton(page);

  let errorContent: string;
  let extractionMethod: 'copy-button' | 'dom-extraction' | 'console';

  if (copiedText) {
    console.log('✅ 通过复制按钮成功获取错误信息');
    errorContent = copiedText;
    extractionMethod = 'copy-button';
  } else {
    console.log('⚠️ 复制按钮不可用，使用DOM提取');
    // 步骤2: 降级到DOM提取
    errorContent = await extractFromDOM(page);
    extractionMethod = 'dom-extraction';
  }

  // 步骤3: 分类错误
  const errorType = classifyError(errorContent);
  const priority = determinePriority(errorType);

  console.log(`📊 错误分类: ${errorType} (${priority})`);

  // 步骤4: 截取全页截图
  const screenshotPath = `/test-reports/errors/nextjs-error-${Date.now()}.png`;
  try {
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`📸 截图已保存: ${screenshotPath}`);
  } catch (e) {
    console.error('截图失败:', e);
  }

  // 步骤5: 获取控制台错误
  const consoleErrors = await getConsoleErrors(page);

  return {
    timestamp,
    type: errorType,
    priority,
    content: errorContent,
    extractionMethod,
    screenshotPath,
    url: page.url(),
    consoleErrors,
    testStep,
  };
}

/**
 * 尝试点击复制按钮并获取剪贴板内容
 */
export async function tryClickCopyButton(page: Page): Promise<string | null> {
  for (const selector of COPY_BUTTON_SELECTORS) {
    try {
      console.log(`🔍 尝试选择器: ${selector}`);

      const button = page.locator(selector).first();

      // 检查按钮是否可见
      if (await button.isVisible({ timeout: 2000 })) {
        console.log('✅ 找到复制按钮，点击中...');

        await button.click();

        // 等待复制操作完成
        await page.waitForTimeout(800);

        // 从剪贴板读取
        const clipboardText = await page.evaluate(async () => {
          try {
            const text = await navigator.clipboard.readText();
            return text;
          } catch (e) {
            console.error('读取剪贴板失败:', e);
            return null;
          }
        });

        if (clipboardText && clipboardText.trim().length > 0) {
          console.log('✅ 成功从剪贴板读取错误信息');
          console.log(`📝 错误信息长度: ${clipboardText.length} 字符`);
          return clipboardText;
        }
      }
    } catch (error) {
      console.log(`⚠️ 选择器 ${selector} 失败: ${error}`);
      continue;
    }
  }

  console.log('❌ 所有复制按钮选择器都失败');
  return null;
}

/**
 * 从DOM提取错误信息（降级方案）
 */
export async function extractFromDOM(page: Page): Promise<string> {
  const parts: string[] = [];

  try {
    // 提取错误标题
    const titleSelectors = [
      'h1',
      'h2',
      'h3',
      '[data-error-title]',
      '.error-title',
    ];
    for (const selector of titleSelectors) {
      try {
        const title = await page.locator(selector).first().textContent();
        if (title && title.trim()) {
          parts.push(`## ${title.trim()}`);
          break;
        }
      } catch {
        continue;
      }
    }

    // 提取错误消息
    const messageSelectors = [
      'pre',
      'code',
      '[data-error-message]',
      '.error-message',
      '.error-content',
    ];
    for (const selector of messageSelectors) {
      try {
        const message = await page.locator(selector).first().textContent();
        if (message && message.trim() && message.length > 20) {
          parts.push(message.trim());
          break;
        }
      } catch {
        continue;
      }
    }

    // 提取堆栈跟踪
    const stackSelectors = ['[data-error-stack]', '.stack-trace', 'pre'];
    for (const selector of stackSelectors) {
      try {
        const stack = await page.locator(selector).all();
        if (stack.length > 0) {
          const stackTexts = await Promise.all(
            stack.map((el) => el.textContent())
          );
          const validStack = stackTexts.filter((t) => t && t.includes('at '));
          if (validStack.length > 0) {
            parts.push('\n### Stack Trace\n' + validStack.join('\n'));
            break;
          }
        }
      } catch {
        continue;
      }
    }

    // 如果都没找到，获取整个body文本
    if (parts.length === 0) {
      const bodyText = await page.locator('body').textContent();
      return bodyText?.substring(0, 2000) || ''; // 限制长度
    }

    return parts.join('\n\n');
  } catch (error) {
    console.error('DOM提取失败:', error);
    return 'Error: Failed to extract error information from DOM';
  }
}

/**
 * 分类错误类型
 */
export function classifyError(errorContent: string): ErrorType {
  const content = errorContent.toLowerCase();

  // 按优先级检查
  if (
    content.includes('module not found') ||
    content.includes("can't resolve")
  ) {
    return 'MODULE_RESOLUTION_ERROR';
  }

  if (
    content.includes('compilation error') ||
    content.includes('css syntax error')
  ) {
    return 'COMPILATION_ERROR';
  }

  if (content.includes('hydration') || content.includes('hydration failed')) {
    return 'HYDRATION_ERROR';
  }

  if (content.includes('runtime error') || content.includes('runtime error')) {
    return 'RUNTIME_ERROR';
  }

  if (content.includes('api route') || content.includes('/api/')) {
    return 'API_ROUTE_ERROR';
  }

  if (
    content.includes('network') ||
    content.includes('fetch failed') ||
    content.includes('timeout')
  ) {
    return 'NETWORK_ERROR';
  }

  return 'UNKNOWN_ERROR';
}

/**
 * 确定错误优先级
 */
export function determinePriority(errorType: ErrorType): 'P0' | 'P1' | 'P2' {
  const priorityMap: Record<ErrorType, 'P0' | 'P1' | 'P2'> = {
    MODULE_RESOLUTION_ERROR: 'P0',
    COMPILATION_ERROR: 'P0',
    RUNTIME_ERROR: 'P1',
    HYDRATION_ERROR: 'P1',
    API_ROUTE_ERROR: 'P1',
    NETWORK_ERROR: 'P2',
    UNKNOWN_ERROR: 'P2',
  };

  return priorityMap[errorType] || 'P2';
}

/**
 * 获取控制台错误
 */
export async function getConsoleErrors(page: Page): Promise<ConsoleError[]> {
  const errors: ConsoleError[] = [];

  try {
    // 获取所有控制台消息
    const messages = await page.evaluate(() => {
      const logs: any[] = [];

      // 监听后续的错误
      window.addEventListener('error', (e) => {
        logs.push({
          type: 'error',
          message: e.message,
          filename: e.filename,
          lineno: e.lineno,
          colno: e.colno,
        });
      });

      return logs;
    });

    return messages.map((msg) => ({
      text: msg.message,
      location: {
        url: msg.filename,
        lineNumber: msg.lineno,
        columnNumber: msg.colno,
      },
    }));
  } catch (error) {
    console.error('获取控制台错误失败:', error);
    return [];
  }
}

/**
 * 保存错误报告到文件
 */
export async function saveErrorReport(
  errorReport: ErrorReport
): Promise<string> {
  const fs = require('fs').promises;
  const path = require('path');

  const reportDir = '.test-reports/errors';
  await fs.mkdir(reportDir, { recursive: true });

  const filename = `error-report-${Date.now()}.json`;
  const filepath = path.join(reportDir, filename);

  await fs.writeFile(filepath, JSON.stringify(errorReport, null, 2), 'utf-8');

  console.log(`📄 错误报告已保存: ${filepath}`);

  return filepath;
}

/**
 * 生成Markdown格式的错误报告
 */
export function generateMarkdownReport(errorReport: ErrorReport): string {
  return `## 🚨 Next.js 错误报告

### 错误元数据
- **错误类型**: ${errorReport.type}
- **错误优先级**: ${errorReport.priority}
- **发生时间**: ${errorReport.timestamp}
- **测试步骤**: ${errorReport.testStep || 'N/A'}

### 错误信息（来自Next.js${errorReport.extractionMethod === 'copy-button' ? '复制按钮' : 'DOM提取'}）
\`\`\`
${errorReport.content}
\`\`\`

### 上下文信息
- **页面URL**: ${errorReport.url}
- **提取方法**: ${errorReport.extractionMethod}
${errorReport.screenshotPath ? `- **全页截图**: ${errorReport.screenshotPath}` : ''}

### 控制台错误
${
  errorReport.consoleErrors.length > 0
    ? errorReport.consoleErrors
        .map(
          (err, i) =>
            `${i + 1}. ${err.text}${err.location ? ` (${err.location.url}:${err.location.lineNumber})` : ''}`
        )
        .join('\n')
    : '无控制台错误'
}

### 修复建议
${getFixSuggestions(errorReport.type)}

---
*报告生成时间: ${new Date().toISOString()}*
`;
}

/**
 * 根据错误类型提供修复建议
 */
function getFixSuggestions(errorType: ErrorType): string {
  const suggestions: Record<ErrorType, string[]> = {
    MODULE_RESOLUTION_ERROR: [
      '- [ ] 检查文件路径是否正确（使用相对路径 `../` 或绝对路径 `@/`）',
      '- [ ] 验证CSS/模块文件是否存在',
      '- [ ] 检查文件名大小写是否匹配',
      '- [ ] 重新运行 `npm run build` 查看完整错误',
    ],
    COMPILATION_ERROR: [
      '- [ ] 修复CSS语法错误',
      '- [ ] 修复TypeScript类型错误',
      '- [ ] 检查是否有未闭合的括号或引号',
    ],
    RUNTIME_ERROR: [
      '- [ ] 检查组件是否正确导入',
      '- [ ] 验证props传递是否正确',
      '- [ ] 查看控制台堆栈跟踪定位问题代码',
    ],
    HYDRATION_ERROR: [
      '- [ ] 检查服务端和客户端渲染是否一致',
      '- [ ] 避免在component中使用 `typeof window`',
      '- [ ] 使用 `useEffect` 处理客户端专有逻辑',
    ],
    API_ROUTE_ERROR: [
      '- [ ] 检查API路由是否正确定义',
      '- [ ] 验证请求方法和数据格式',
      '- [ ] 查看后端服务器日志',
    ],
    NETWORK_ERROR: [
      '- [ ] 检查网络连接',
      '- [ ] 验证开发服务器是否运行',
      '- [ ] 查看端口是否被占用',
    ],
    UNKNOWN_ERROR: [
      '- [ ] 查看完整错误堆栈',
      '- [ ] 检查浏览器控制台',
      '- [ ] 尝试重启开发服务器',
    ],
  };

  return (suggestions[errorType] || suggestions['UNKNOWN_ERROR']).join('\n');
}
