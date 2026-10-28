/**
 * Mock短信服务
 *
 * POC阶段使用，在控制台输出短信内容
 * 生产环境应替换为真实短信服务（如阿里云短信、腾讯云短信）
 */

export interface SmsService {
  sendCode(phone: string, code: string): Promise<void>;
  sendNotification(phone: string, content: string): Promise<void>;
}

/**
 * Mock短信服务实现
 */
export class MockSmsService implements SmsService {
  /**
   * 发送验证码
   * @param phone 手机号
   * @param code 验证码
   */
  async sendCode(phone: string, code: string): Promise<void> {
    const content = `【深瞳AI】您的验证码是${code}，5分钟内有效，请勿泄露。`;
    this.logToConsole(phone, content);
  }

  /**
   * 发送通知短信
   * @param phone 手机号
   * @param content 短信内容
   */
  async sendNotification(phone: string, content: string): Promise<void> {
    this.logToConsole(phone, content);
  }

  /**
   * 控制台输出（模拟短信发送）
   * @param phone 手机号
   * @param content 短信内容
   */
  private logToConsole(phone: string, content: string): void {
    const timestamp = new Date().toISOString();
    console.log(
      `╔════════════════════════════════════════════════════════════╗`
    );
    console.log(
      `║                    SMS Mock Output                         ║`
    );
    console.log(
      `╠════════════════════════════════════════════════════════════╣`
    );
    console.log(`║ Timestamp: ${timestamp.padEnd(48)}║`);
    console.log(`║ To:       ${phone.padEnd(48)}║`);
    console.log(`║ Content:  ${content.substring(0, 46).padEnd(46)}║`);
    if (content.length > 46) {
      console.log(`║           ${content.substring(46).padEnd(46)}║`);
    }
    console.log(
      `╚════════════════════════════════════════════════════════════╝`
    );
  }
}

// 导出单例实例
export const mockSmsService = new MockSmsService();
