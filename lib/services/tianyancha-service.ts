/**
 * 天眼查企业信息查询服务
 *
 * @module lib/services/tianyancha-service
 * @description 封装天眼查爬虫逻辑，提供企业信息查询服务
 *
 * 功能：
 * - 查询单个企业信息
 * - 频率控制
 * - 缓存集成
 * - 错误处理
 */

import {
  getCachedCompany,
  setCachedCompany,
  getCachedContact,
  setCachedContact,
  type TianyanchaCompanyInfo,
  type TianyanchaContactInfo,
} from './tianyancha-cache';

// 重新导出类型，供其他模块使用
export type { TianyanchaCompanyInfo, TianyanchaContactInfo } from './tianyancha-cache';

// ============================================
// 配置常量
// ============================================

// 是否启用天眼查爬虫（从环境变量读取）
const ENABLE_CRAWLER = process.env.ENABLE_TIANYANCHA_CRAWLER !== 'false';

// 最小查询间隔（毫秒）
const MIN_INTERVAL_MS = parseInt(process.env.TIANYANCHA_MIN_INTERVAL || '10', 10) * 1000;

// 上次查询时间
let lastQueryTime = 0;

// ============================================
// 类型定义
// ============================================

export interface QueryResult {
  success: boolean;
  data?: TianyanchaCompanyInfo;
  error?: string;
  source: 'cache' | 'crawler' | 'none';
}

export interface ContactQueryResult {
  success: boolean;
  data?: TianyanchaContactInfo;
  error?: string;
  source: 'cache' | 'crawler' | 'none';
}

// ============================================
// 频率控制
// ============================================

/**
 * 等待频率限制
 */
async function waitForRateLimit(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastQueryTime;

  if (elapsed < MIN_INTERVAL_MS) {
    const waitTime = MIN_INTERVAL_MS - elapsed;
    console.log(`[TianyanchaService] 频率控制：等待 ${Math.ceil(waitTime / 1000)} 秒`);
    await new Promise((resolve) => setTimeout(resolve, waitTime));
  }

  lastQueryTime = Date.now();
}

// ============================================
// 核心查询函数
// ============================================

/**
 * 查询企业信息（带缓存和频率控制）
 *
 * @param companyName 企业名称
 * @returns 查询结果
 */
export async function queryCompany(companyName: string): Promise<QueryResult> {
  // 检查是否启用爬虫
  if (!ENABLE_CRAWLER) {
    console.log('[TianyanchaService] 爬虫已禁用');
    return {
      success: false,
      error: '天眼查爬虫已禁用',
      source: 'none',
    };
  }

  // 1. 先检查缓存
  const cachedData = getCachedCompany(companyName);
  if (cachedData) {
    console.log(`[TianyanchaService] 命中缓存: ${companyName}`);
    return {
      success: true,
      data: cachedData,
      source: 'cache',
    };
  }

  // 2. 频率控制
  await waitForRateLimit();

  // 3. 调用爬虫脚本
  try {
    console.log(`[TianyanchaService] 开始爬取: ${companyName}`);

    // 使用动态导入调用爬虫脚本
    const { chromium } = await import('playwright');

    const browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled',
      ],
    });

    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });

    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });

    const page = await context.newPage();

    try {
      // 搜索企业
      const searchUrl = `https://www.tianyancha.com/search?key=${encodeURIComponent(companyName)}`;
      await page.goto(searchUrl, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);
      await page.waitForLoadState('networkidle');

      // 提取第一个搜索结果
      const searchResult = await page.evaluate(() => {
        const link = document.querySelector('a[href*="/company/"]');
        if (link) {
          const href = link.getAttribute('href') || '';
          const match = href.match(/\/company\/(\d+)/);
          return {
            name: link.textContent?.trim() || null,
            id: match?.[1] || null,
            url: href.startsWith('http') ? href : `https://www.tianyancha.com${href}`,
          };
        }
        return null;
      });

      if (!searchResult || !searchResult.url) {
        await browser.close();
        return {
          success: false,
          error: '未找到匹配的企业',
          source: 'none',
        };
      }

      // 访问详情页
      await page.goto(searchResult.url, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);
      await page.waitForLoadState('networkidle');

      // 提取企业详情
      const info = await page.evaluate(() => {
        const result: Partial<TianyanchaCompanyInfo> = {
          queryTime: new Date().toISOString(),
          queryName: '',
          companyName: null,
          legalPerson: null,
          establishDate: null,
          registerNumber: null,
          businessTerm: null,
          companyType: null,
          socialCreditCode: null,
          registerAuthority: null,
          businessScope: null,
          phone: null,
          email: null,
          industry: null,
          insuranceCount: null,
          hasBranch: false,
          branchCount: null,
          hasRecruitment: false,
          detailUrl: null,
        };

        // 提取表格数据
        const tables = document.querySelectorAll('table');
        tables.forEach((table) => {
          const rows = table.querySelectorAll('tr');
          rows.forEach((row) => {
            const cells = row.querySelectorAll('td');
            if (cells.length >= 2) {
              const key = cells[0].textContent?.trim()?.replace(/[:：]/g, '');
              const value = cells[1].textContent?.trim();

              if (key && value) {
                switch (key) {
                  case '企业名称':
                    result.companyName = value;
                    break;
                  case '法定代表人':
                    result.legalPerson = value.replace(/关联企业\d*/g, '').trim();
                    break;
                  case '成立日期':
                    result.establishDate = value;
                    break;
                  case '工商注册号':
                    result.registerNumber = value;
                    break;
                  case '营业期限':
                    result.businessTerm = value;
                    break;
                  case '企业类型':
                    result.companyType = value;
                    break;
                  case '统一社会信用代码':
                    result.socialCreditCode = value.replace('复制', '').trim();
                    break;
                  case '登记机关':
                    result.registerAuthority = value;
                    break;
                  case '经营范围':
                    result.businessScope = value;
                    break;
                  case '电话':
                    result.phone = value.replace(/更多\d*/g, '').trim();
                    break;
                  case '邮箱':
                    result.email = value.replace(/更多\d*/g, '').trim();
                    break;
                  case '国标行业':
                    result.industry = value;
                    break;
                  case '参保人数':
                    result.insuranceCount = value.replace(/年报/g, '').trim();
                    break;
                }
              }
            }
          });
        });

        // 检查分支机构
        const branchSection = document.querySelector('[class*="branch"], [class*="分支"]');
        result.hasBranch = !!branchSection;

        // 检查招聘信息
        const recruitmentSection = document.querySelector('[class*="recruit"], [class*="job"], [class*="招聘"]');
        result.hasRecruitment = !!recruitmentSection;

        return result as TianyanchaCompanyInfo;
      });

      info.queryName = companyName;
      info.detailUrl = searchResult.url;

      await browser.close();

      // 存入缓存
      setCachedCompany(companyName, info);

      console.log(`[TianyanchaService] 爬取成功: ${companyName}`);

      return {
        success: true,
        data: info,
        source: 'crawler',
      };
    } catch (error) {
      await browser.close();
      throw error;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[TianyanchaService] 爬取失败: ${errorMessage}`);

    return {
      success: false,
      error: errorMessage,
      source: 'none',
    };
  }
}

/**
 * 批量查询企业信息
 *
 * @param companyNames 企业名称列表
 * @returns 查询结果列表
 */
export async function queryBatch(companyNames: string[]): Promise<QueryResult[]> {
  const results: QueryResult[] = [];

  for (const name of companyNames) {
    const result = await queryCompany(name);
    results.push(result);

    // 如果不是最后一个，等待频率限制
    if (companyNames.indexOf(name) < companyNames.length - 1) {
      await waitForRateLimit();
    }
  }

  return results;
}

/**
 * 检查服务是否可用
 */
export function isServiceAvailable(): boolean {
  return ENABLE_CRAWLER;
}

// ============================================
// 联系人信息查询
// ============================================

/**
 * 查询联系人信息（带缓存和频率控制）
 * 在天眼查上搜索联系人，获取其职位、背景等信息
 *
 * @param contactName 联系人姓名
 * @param companyName 企业名称（用于关联查询）
 * @returns 查询结果
 */
export async function queryContactInfo(
  contactName: string,
  companyName: string
): Promise<ContactQueryResult> {
  // 检查是否启用爬虫
  if (!ENABLE_CRAWLER) {
    console.log('[TianyanchaService] 爬虫已禁用');
    return {
      success: false,
      error: '天眼查爬虫已禁用',
      source: 'none',
    };
  }

  // 1. 先检查缓存
  const cachedData = getCachedContact(contactName, companyName);
  if (cachedData) {
    console.log(`[TianyanchaService] 联系人命中缓存: ${contactName} @ ${companyName}`);
    return {
      success: true,
      data: cachedData,
      source: 'cache',
    };
  }

  // 2. 频率控制
  await waitForRateLimit();

  // 3. 调用爬虫脚本
  try {
    console.log(`[TianyanchaService] 开始爬取联系人: ${contactName} @ ${companyName}`);

    // 使用动态导入调用爬虫脚本
    const { chromium } = await import('playwright');

    const browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled',
      ],
    });

    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });

    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });

    const page = await context.newPage();

    try {
      // 搜索联系人 + 企业名称组合
      const searchUrl = `https://www.tianyancha.com/search?key=${encodeURIComponent(contactName + ' ' + companyName)}`;
      await page.goto(searchUrl, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);
      await page.waitForLoadState('networkidle');

      // 提取搜索结果中的联系人信息
      const searchResult = await page.evaluate(() => {
        // 查找包含联系人姓名的元素
        const contactElements = document.querySelectorAll('[class*="person"], [class*="human"], [class*="contact"]');
        const results: Array<{ name: string; position: string; company: string; url: string }> = [];

        contactElements.forEach((el) => {
          const text = el.textContent?.trim() || '';
          const link = el.querySelector('a') || el.closest('a');
          const href = link?.getAttribute('href') || '';

          if (text && href) {
            results.push({
              name: text.split(/[，,、\s]/)[0] || text,
              position: '',
              company: '',
              url: href.startsWith('http') ? href : `https://www.tianyancha.com${href}`,
            });
          }
        });

        // 如果没有找到专门的联系人元素，尝试从搜索结果列表中提取
        if (results.length === 0) {
          const links = document.querySelectorAll('a[href*="/company/"], a[href*="/human/"]');
          links.forEach((link) => {
            const text = link.textContent?.trim() || '';
            const href = link.getAttribute('href') || '';
            if (text && href) {
              const isHumanPage = href.includes('/human/');
              results.push({
                name: text.split(/[，,、\s]/)[0] || text,
                position: '',
                company: '',
                url: href.startsWith('http') ? href : `https://www.tianyancha.com${href}`,
              });
            }
          });
        }

        return results.length > 0 ? results[0] : null;
      });

      if (!searchResult) {
        await browser.close();
        return {
          success: false,
          error: '未找到匹配的联系人',
          source: 'none',
        };
      }

      // 访问联系人详情页（如果是人物页面）
      let contactInfo: TianyanchaContactInfo = {
        queryTime: new Date().toISOString(),
        queryName: contactName,
        companyName: companyName,
        contactName: contactName,
        position: null,
        background: null,
        otherCompanies: null,
        detailUrl: searchResult.url,
      };

      // 如果是人物详情页，访问并提取更多信息
      if (searchResult.url.includes('/human/')) {
        await page.goto(searchResult.url, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(3000);
        await page.waitForLoadState('networkidle');

        const detailInfo = await page.evaluate(() => {
          const info: Partial<TianyanchaContactInfo> = {
            position: null,
            background: null,
            otherCompanies: null,
          };

          // 提取职位信息
          const positionEl = document.querySelector('[class*="position"], [class*="job"], [class*="title"]');
          if (positionEl) {
            info.position = positionEl.textContent?.trim() || null;
          }

          // 提取背景信息（人物简介）
          const backgroundEl = document.querySelector('[class*="intro"], [class*="desc"], [class*="background"]');
          if (backgroundEl) {
            info.background = backgroundEl.textContent?.trim()?.slice(0, 500) || null;
          }

          // 提取关联企业
          const companyEls = document.querySelectorAll('[class*="company"] a, [class*="关联"] a');
          if (companyEls.length > 0) {
            info.otherCompanies = Array.from(companyEls)
              .map((el) => el.textContent?.trim() || '')
              .filter((text) => text.length > 0)
              .slice(0, 5);
          }

          return info;
        });

        contactInfo = { ...contactInfo, ...detailInfo };
      }

      await browser.close();

      // 存入缓存
      setCachedContact(contactName, companyName, contactInfo);

      console.log(`[TianyanchaService] 联系人爬取成功: ${contactName} @ ${companyName}`);

      return {
        success: true,
        data: contactInfo,
        source: 'crawler',
      };
    } catch (error) {
      await browser.close();
      throw error;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[TianyanchaService] 联系人爬取失败: ${errorMessage}`);

    return {
      success: false,
      error: errorMessage,
      source: 'none',
    };
  }
}