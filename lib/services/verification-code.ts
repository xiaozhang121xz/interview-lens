import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import prisma from '@/lib/db/prisma';

const CODE_TTL_MS = 5 * 60_000;
const SEND_INTERVAL_MS = 60_000;
const MAX_ATTEMPTS = 5;

function hashCode(phone: string, code: string): string {
  const secret = process.env.VERIFICATION_CODE_SECRET || process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('VERIFICATION_CODE_SECRET_NOT_CONFIGURED');
  }
  return createHmac('sha256', secret).update(`${phone}:${code}`).digest('hex');
}

export async function createVerificationCode(phone: string): Promise<string> {
  const now = new Date();
  const existing = await prisma.verificationCode.findUnique({
    where: { phone },
    select: { lastSentAt: true },
  });
  if (existing && now.getTime() - existing.lastSentAt.getTime() < SEND_INTERVAL_MS) {
    throw new Error('TOO_MANY_REQUESTS');
  }

  const code = randomInt(100000, 1000000).toString();
  await prisma.verificationCode.upsert({
    where: { phone },
    create: {
      phone,
      codeHash: hashCode(phone, code),
      expiresAt: new Date(now.getTime() + CODE_TTL_MS),
      lastSentAt: now,
    },
    update: {
      codeHash: hashCode(phone, code),
      attempts: 0,
      expiresAt: new Date(now.getTime() + CODE_TTL_MS),
      lastSentAt: now,
      consumedAt: null,
    },
  });
  return code;
}

export async function invalidateVerificationCode(
  phone: string,
  code: string
): Promise<void> {
  await prisma.verificationCode.deleteMany({
    where: { phone, codeHash: hashCode(phone, code), consumedAt: null },
  });
}

export async function verifyAndConsumeCode(
  phone: string,
  code: string
): Promise<boolean> {
  const challenge = await prisma.verificationCode.findUnique({ where: { phone } });
  const now = new Date();
  if (
    !challenge ||
    challenge.consumedAt ||
    challenge.expiresAt <= now ||
    challenge.attempts >= MAX_ATTEMPTS
  ) {
    return false;
  }

  const expected = Buffer.from(challenge.codeHash, 'hex');
  const supplied = Buffer.from(hashCode(phone, code), 'hex');
  const valid =
    expected.length === supplied.length && timingSafeEqual(expected, supplied);

  if (!valid) {
    await prisma.verificationCode.updateMany({
      where: { id: challenge.id, consumedAt: null, attempts: { lt: MAX_ATTEMPTS } },
      data: { attempts: { increment: 1 } },
    });
    return false;
  }

  const consumed = await prisma.verificationCode.updateMany({
    where: {
      id: challenge.id,
      codeHash: challenge.codeHash,
      consumedAt: null,
      attempts: { lt: MAX_ATTEMPTS },
      expiresAt: { gt: now },
    },
    data: { consumedAt: now, attempts: { increment: 1 } },
  });
  return consumed.count === 1;
}
