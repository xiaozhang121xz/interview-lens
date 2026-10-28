/**
 * 飞书 API 客户端
 * 提供文档读取、认证等功能
 */

// 缓存 tenant_access_token（2小时有效期）
let cachedToken: string | null = null;
let tokenExpireTime: number = 0;

/**
 * 检查飞书凭证是否配置
 */
export function isFeishuConfigured(): boolean {
  const isValid = (value: string | undefined): boolean => {
    if (!value) return false;
    if (value.includes('your_') || value.includes('xxx')) return false;
    return value.length > 10;
  };

  return (
    isValid(process.env.FEISHU_APP_ID) &&
    isValid(process.env.FEISHU_APP_SECRET)
  );
}

/**
 * 获取飞书 Tenant Access Token
 * 自动缓存，2小时有效期
 */
export async function getFeishuTenantToken(): Promise<string> {
  // 检查缓存
  if (cachedToken && Date.now() < tokenExpireTime) {
    return cachedToken;
  }

  const appId = process.env.FEISHU_APP_ID;
  const appSecret = process.env.FEISHU_APP_SECRET;

  if (!appId || !appSecret) {
    throw new Error('FEISHU_NOT_CONFIGURED: 飞书凭证未配置');
  }

  try {
    const response = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        app_id: appId,
        app_secret: appSecret,
      }),
    });

    const data = await response.json();

    if (data.code !== 0) {
      throw new Error(`FEISHU_AUTH_FAILED: 获取访问令牌失败 - ${data.msg}`);
    }

    // 缓存 token（提前5分钟过期，避免边界情况）
    cachedToken = data.tenant_access_token;
    tokenExpireTime = Date.now() + (data.expire - 300) * 1000;

    return cachedToken!;
  } catch (error: any) {
    console.error('[Feishu] Auth error:', error);
    throw new Error(`FEISHU_AUTH_ERROR: ${error.message}`);
  }
}

/**
 * 从 URL 中提取文档 ID
 */
function extractDocumentId(url: string): { type: 'docx' | 'wiki'; id: string } {
  // 匹配 docx 类型
  const docxMatch = url.match(/feishu\.cn\/docx\/([a-zA-Z0-9]+)/);
  if (docxMatch) {
    return { type: 'docx', id: docxMatch[1] };
  }

  // 匹配 wiki 类型
  const wikiMatch = url.match(/feishu\.cn\/wiki\/([a-zA-Z0-9]+)/);
  if (wikiMatch) {
    return { type: 'wiki', id: wikiMatch[1] };
  }

  throw new Error('FEISHU_INVALID_URL: 无法从链接中提取文档 ID');
}

/**
 * 获取 Wiki 节点的实际文档信息
 */
async function getWikiNodeInfo(token: string, wikiToken: string): Promise<string> {
  const accessToken = await getFeishuTenantToken();

  const response = await fetch(
    `https://open.feishu.cn/open-apis/wiki/v2/spaces/get_node?token=${wikiToken}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  const data = await response.json();

  if (data.code === 99991672) {
    throw new Error('FEISHU_WIKI_NO_PERMISSION: 无权限访问该 Wiki 文档');
  }

  if (data.code === 99991673) {
    throw new Error('FEISHU_WIKI_NOT_FOUND: Wiki 文档不存在或已删除');
  }

  if (data.code !== 0) {
    throw new Error(`FEISHU_WIKI_ERROR: ${data.msg}`);
  }

  const node = data.data?.node;
  if (!node || !node.obj_token) {
    throw new Error('FEISHU_WIKI_NO_CONTENT: Wiki 节点无内容');
  }

  // 读取实际文档内容
  return await fetchFeishuDocument(`https://feishu.cn/docx/${node.obj_token}`);
}

/**
 * 读取飞书文档内容
 * 支持 docx 和 wiki 类型
 */
export async function fetchFeishuDocument(url: string): Promise<string> {
  const { type, id } = extractDocumentId(url);

  // 如果是 Wiki 类型，先获取节点信息
  if (type === 'wiki') {
    return await getWikiNodeInfo(id, id);
  }

  // 读取普通文档
  const accessToken = await getFeishuTenantToken();
  let allContent = '';
  let pageToken: string | undefined = undefined;

  do {
    const urlParams: URLSearchParams = new URLSearchParams({
      page_size: '500',
      ...(pageToken && { page_token: pageToken }),
    });

    const response = await fetch(
      `https://open.feishu.cn/open-apis/docx/v1/documents/${id}/blocks/${id}/children?${urlParams}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const data = await response.json();

    // 错误处理
    if (data.code === 99991663) {
      throw new Error('FEISHU_NO_PERMISSION: 无权限访问该文档');
    }

    if (data.code === 99991661) {
      throw new Error('FEISHU_DOC_NOT_FOUND: 文档不存在或已删除');
    }

    if (data.code === 99991406) {
      // 文档内容为空
      return '';
    }

    if (data.code !== 0) {
      throw new Error(`FEISHU_API_ERROR: ${data.msg}`);
    }

    // 转换内容为 Markdown
    const items = data.data?.items || [];
    for (const item of items) {
      allContent += blockToMarkdown(item);
    }

    // 检查是否有更多内容
    pageToken = data.data?.page_token;
    if (!data.data?.has_more) {
      break;
    }
  } while (pageToken);

  if (!allContent.trim()) {
    throw new Error('FEISHU_EMPTY_DOC: 文档内容为空');
  }

  return allContent;
}

/**
 * 将飞书 Block 转换为 Markdown
 */
function blockToMarkdown(block: any): string {
  const blockType = block.block_type;
  const text = extractText(block);

  switch (blockType) {
    case 1: // page（页面标题）
      return `# ${text}\n\n`;

    case 2: // text（文本）
      return `${text}\n\n`;

    case 3: // heading1（一级标题）
      return `# ${text}\n\n`;

    case 4: // heading2（二级标题）
      return `## ${text}\n\n`;

    case 5: // heading3（三级标题）
      return `### ${text}\n\n`;

    case 6: // heading4（四级标题）
      return `#### ${text}\n\n`;

    case 7: // heading5（五级标题）
      return `##### ${text}\n\n`;

    case 8: // heading6（六级标题）
      return `###### ${text}\n\n`;

    case 9: // heading7（七级标题）
      return `###### ${text}\n\n`;

    case 10: // heading8（八级标题）
      return `###### ${text}\n\n`;

    case 11: // heading9（九级标题）
      return `###### ${text}\n\n`;

    case 12: // bullet（无序列表）
      return `- ${text}\n`;

    case 13: // ordered（有序列表）
      return `1. ${text}\n`;

    case 14: // todo（待办事项）
      return `- [ ] ${text}\n`;

    case 15: // code（代码块）
      const lang = block.code?.style?.language || '';
      return `\`\`\`${lang}\n${text}\n\`\`\`\n\n`;

    case 16: // quote（引用）
      return `> ${text}\n\n`;

    case 17: // equation（公式）
      return `$$${text}$$\n\n`;

    case 18: // todo（待办列表）
      return `- [ ] ${text}\n`;

    case 19: // divider（分割线）
      return `---\n\n`;

    case 20: // table（表格）
      return convertTable(block);

    case 21: // table_cell（表格单元格）
      return text;

    default:
      return `${text}\n`;
  }
}

/**
 * 提取 Block 中的文本内容
 */
function extractText(block: any): string {
  // 直接从 block 获取 text 内容
  if (block.text?.content) {
    return block.text.content;
  }

  // 从 paragraph 中提取
  if (block.paragraph?.elements) {
    return block.paragraph.elements.map((e: any) => e.text_run?.content || '').join('');
  }

  // 从 heading 中提取
  if (block.heading1?.elements) {
    return block.heading1.elements.map((e: any) => e.text_run?.content || '').join('');
  }
  if (block.heading2?.elements) {
    return block.heading2.elements.map((e: any) => e.text_run?.content || '').join('');
  }
  if (block.heading3?.elements) {
    return block.heading3.elements.map((e: any) => e.text_run?.content || '').join('');
  }

  // 从 bullet（无序列表）中提取
  if (block.bullet?.elements) {
    return block.bullet.elements.map((e: any) => e.text_run?.content || '').join('');
  }

  // 从 ordered（有序列表）中提取
  if (block.ordered?.elements) {
    return block.ordered.elements.map((e: any) => e.text_run?.content || '').join('');
  }

  // 从 code（代码块）中提取
  if (block.code?.elements) {
    return block.code.elements.map((e: any) => e.text_run?.content || '').join('');
  }

  // 从 quote（引用）中提取
  if (block.quote?.elements) {
    return block.quote.elements.map((e: any) => e.text_run?.content || '').join('');
  }

  return '';
}

/**
 * 转换表格为 Markdown
 */
function convertTable(block: any): string {
  const table = block.table;
  if (!table || !table.cells) return '';

  const rows = table.cells;
  if (rows.length === 0) return '';

  let markdown = '';

  // 表头
  const headerCells = rows[0];
  if (headerCells && Array.isArray(headerCells)) {
    const header = headerCells.map((cell: any) => extractText(cell)).join(' | ');
    markdown += `| ${header} |\n`;
    markdown += `| ${headerCells.map(() => '---').join(' | ')} |\n`;
  }

  // 数据行
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (Array.isArray(row)) {
      const rowData = row.map((cell: any) => extractText(cell)).join(' | ');
      markdown += `| ${rowData} |\n`;
    }
  }

  return markdown + '\n';
}
