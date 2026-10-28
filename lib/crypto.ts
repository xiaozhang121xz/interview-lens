import crypto from 'crypto';

/**
 * 简单的密码哈希工具
 * 在生产环境中建议使用 bcrypt 等更安全的库
 */
export class PasswordHasher {
  private static readonly SALT_LENGTH = 32;
  private static readonly ITERATIONS = 210000;
  private static readonly LEGACY_ITERATIONS = 10000;
  private static readonly KEY_LENGTH = 64;
  private static readonly ALGORITHM = 'sha512';

  /**
   * 生成密码哈希
   */
  static async hash(password: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const salt = crypto.randomBytes(this.SALT_LENGTH).toString('hex');

      crypto.pbkdf2(
        password,
        salt,
        this.ITERATIONS,
        this.KEY_LENGTH,
        this.ALGORITHM,
        (err, derivedKey) => {
          if (err) reject(err);

          const hash = `pbkdf2$${this.ITERATIONS}$${salt}$${derivedKey.toString('hex')}`;
          resolve(hash);
        }
      );
    });
  }

  /**
   * 验证密码
   */
  static async verify(password: string, hash: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const modernParts = hash.split('$');
      const isModern = modernParts.length === 4 && modernParts[0] === 'pbkdf2';
      const [salt, key] = isModern
        ? [modernParts[2], modernParts[3]]
        : hash.split(':');
      const iterations = isModern
        ? Number(modernParts[1])
        : this.LEGACY_ITERATIONS;

      if (!salt || !key || !Number.isSafeInteger(iterations) || iterations < 10000) {
        resolve(false);
        return;
      }

      crypto.pbkdf2(
        password,
        salt,
        iterations,
        this.KEY_LENGTH,
        this.ALGORITHM,
        (err, derivedKey) => {
          if (err) reject(err);

          const expected = Buffer.from(key, 'hex');
          const isValid =
            expected.length === derivedKey.length &&
            crypto.timingSafeEqual(derivedKey, expected);
          resolve(isValid);
        }
      );
    });
  }
}

/**
 * 生成唯一ID
 */
export function generateId(): string {
  const timestamp = Date.now().toString(36);
  const randomStr = crypto.randomBytes(8).toString('hex');
  return `${timestamp}-${randomStr}`;
}

/**
 * 生成用户ID（带前缀）
 */
export function generateUserId(): string {
  return `user_${generateId()}`;
}
