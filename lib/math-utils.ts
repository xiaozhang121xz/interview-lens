/**
 * 阶乘计算器 - 计算 (x!)^n
 * @param x - 阶乘的底数 (1-10)
 * @param n - 幂指数 (1-5)
 * @returns 计算结果，使用bigint处理大数
 * @throws 当输入超出范围或计算结果溢出时抛出错误
 */
export function calculateFactorialPower(x: number, n: number): bigint {
  // 输入验证
  if (!Number.isInteger(x) || x < 1 || x > 10) {
    throw new Error('x 必须是 1-10 之间的正整数');
  }

  if (!Number.isInteger(n) || n < 1 || n > 5) {
    throw new Error('n 必须是 1-5 之间的正整数');
  }

  try {
    // 计算阶乘
    const factorial = (num: number): bigint => {
      let result = BigInt(1);
      for (let i = 2; i <= num; i++) {
        result *= BigInt(i);
      }
      return result;
    };

    // 计算 x!
    const factorialResult = factorial(x);

    // 计算 (x!)^n
    const finalResult = factorialResult ** BigInt(n);

    return finalResult;
  } catch (error) {
    throw new Error('计算结果超出安全范围');
  }
}

/**
 * 质数判断函数
 * @param num - 要判断的数字 (1-10000)
 * @returns 如果是质数返回true，否则返回false
 */
export function isPrimeNumber(num: number): boolean {
  // 输入验证
  if (!Number.isInteger(num) || num < 1 || num > 10000) {
    throw new Error('请输入 1-10000 之间的正整数');
  }

  // 特殊情况
  if (num <= 1) return false;
  if (num <= 3) return true;
  if (num % 2 === 0 || num % 3 === 0) return false;

  // 优化的质数判断算法
  // 检查从5开始的奇数，步长为6（检查i和i+2）
  for (let i = 5; i * i <= num; i += 6) {
    if (num % i === 0 || num % (i + 2) === 0) {
      return false;
    }
  }

  return true;
}

/**
 * 因数分解函数
 * @param num - 要分解的数字 (1-10000)
 * @returns 返回因数数组，如果是质数则返回包含自身的数组
 */
export function getPrimeFactors(num: number): number[] {
  // 输入验证
  if (!Number.isInteger(num) || num < 1 || num > 10000) {
    throw new Error('请输入 1-10000 之间的正整数');
  }

  if (num <= 1) return [num];

  const factors: number[] = [];
  let remaining = num;

  // 处理2的因数
  while (remaining % 2 === 0) {
    factors.push(2);
    remaining /= 2;
  }

  // 处理奇数因数
  for (let i = 3; i * i <= remaining; i += 2) {
    while (remaining % i === 0) {
      factors.push(i);
      remaining /= i;
    }
  }

  // 如果剩余的是质数
  if (remaining > 1) {
    factors.push(remaining);
  }

  return factors;
}

/**
 * 格式化bigint结果为可读字符串
 * @param num - 要格式化的bigint
 * @returns 格式化后的字符串
 */
export function formatBigInt(num: bigint): string {
  return num.toString();
}

/**
 * 验证数字是否在指定范围内
 * @param num - 要验证的数字
 * @param min - 最小值
 * @param max - 最大值
 * @returns 验证结果
 */
export function validateNumberRange(
  num: number,
  min: number,
  max: number
): boolean {
  return Number.isInteger(num) && num >= min && num <= max;
}

/**
 * 检查bigint是否超出JavaScript安全整数范围
 * @param num - 要检查的bigint
 * @returns 是否超出安全范围
 */
export function isBigIntSafe(num: bigint): boolean {
  const maxSafeInt = BigInt(Number.MAX_SAFE_INTEGER);
  const minSafeInt = BigInt(Number.MIN_SAFE_INTEGER);

  return num >= minSafeInt && num <= maxSafeInt;
}

// 性能测试函数
export function performanceTest() {
  console.log('=== 数学工具性能测试 ===');

  // 阶乘计算器性能测试
  console.time('calculateFactorialPower');
  try {
    const result = calculateFactorialPower(5, 3); // (5!)^3 = 120^3 = 1,728,000
    console.log(`(5!)^3 = ${result}`);
  } catch (error) {
    console.error('阶乘计算错误:', error);
  }
  console.timeEnd('calculateFactorialPower');

  // 质数判断性能测试
  console.time('isPrimeNumber');
  try {
    const testNumbers = [9973, 9967, 9949, 9929]; // 质数
    testNumbers.forEach((num) => {
      const result = isPrimeNumber(num);
      console.log(`${num} 是质数: ${result}`);
    });
  } catch (error) {
    console.error('质数判断错误:', error);
  }
  console.timeEnd('isPrimeNumber');

  // 因数分解性能测试
  console.time('getPrimeFactors');
  try {
    const result = getPrimeFactors(3600); // 3600 = 2^4 × 3^2 × 5^2
    console.log(`3600 的因数分解: [${result.join(', ')}]`);
  } catch (error) {
    console.error('因数分解错误:', error);
  }
  console.timeEnd('getPrimeFactors');
}
