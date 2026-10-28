/**
 * 安全工具函数
 * 防止开放重定向攻击等安全漏洞
 */

/**
 * 验证重定向URL是否安全
 * 防止开放重定向攻击（Open Redirect Vulnerability）
 *
 * @security
 * 攻击示例：
 * - ?redirect=https://evil.com/phishing
 * - ?redirect=//evil.com
 * - ?redirect=javascript:alert(1)
 * - ?redirect=/@evil.com
 *
 * @param url - 待验证的重定向URL
 * @returns 是否为安全的重定向目标
 */
export function isValidRedirect(url: string | null): boolean {
  if (!url) return false;

  // 1. 必须是相对路径（以/开头）
  if (!url.startsWith('/')) return false;

  // 2. 防止协议相对攻击（//evil.com）
  if (url.startsWith('//')) return false;

  // 3. 防止域名注入（包含域名的路径）
  // 例如：/evil.com/path 应该被拒绝
  if (/[a-z0-9-]+\.[a-z]{2,}/i.test(url)) return false;

  // 4. 防止@符号攻击（/@evil.com）
  if (url.includes('@')) return false;

  return true;
}

/**
 * 获取安全的重定向目标
 *
 * @param redirectParam - URL中的redirect参数
 * @param defaultPath - 默认跳转路径（默认为'/dashboard'）
 * @returns 安全的重定向目标URL
 */
export function getSafeRedirect(
  redirectParam: string | null,
  defaultPath: string = '/dashboard'
): string {
  return isValidRedirect(redirectParam) ? redirectParam! : defaultPath;
}
