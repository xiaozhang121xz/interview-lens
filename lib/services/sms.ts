import {
  MockSmsService,
  type SmsService,
} from '@/lib/services/mock-sms';

class WebhookSmsService implements SmsService {
  constructor(
    private readonly endpoint: string,
    private readonly token: string | undefined
  ) {}

  async sendCode(phone: string, code: string): Promise<void> {
    await this.send({
      type: 'verification_code',
      phone,
      code,
      expiresInSeconds: 300,
    });
  }

  async sendNotification(phone: string, content: string): Promise<void> {
    await this.send({ type: 'notification', phone, content });
  }

  private async send(payload: Record<string, unknown>): Promise<void> {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      throw new Error(`SMS_PROVIDER_ERROR:${response.status}`);
    }
  }
}

export function getSmsService(): SmsService {
  const endpoint = process.env.SMS_WEBHOOK_URL;
  if (endpoint) {
    return new WebhookSmsService(endpoint, process.env.SMS_WEBHOOK_TOKEN);
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SMS_PROVIDER_NOT_CONFIGURED');
  }
  return new MockSmsService();
}
