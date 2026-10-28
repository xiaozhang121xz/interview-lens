/**
 * 验证函数结果接口
 */
export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * 验证阶乘计算器输入
 * @param x - x输入值
 * @param n - n输入值
 * @returns 验证结果
 */
export function validateFactorialInput(x: string, n: string): ValidationResult {
  // 检查输入是否为空
  if (!x.trim() || !n.trim()) {
    return {
      isValid: false,
      error: '请填写完整的输入',
    };
  }

  // 尝试转换为数字
  const xNum = parseInt(x);
  const nNum = parseInt(n);

  // 检查是否为有效数字
  if (isNaN(xNum) || isNaN(nNum)) {
    return {
      isValid: false,
      error: '请输入有效的数字',
    };
  }

  // 检查是否为整数
  if (xNum.toString() !== x || nNum.toString() !== n) {
    return {
      isValid: false,
      error: '请输入整数，不要输入小数',
    };
  }

  // 检查x的范围 (1-10)
  if (xNum < 1 || xNum > 10) {
    return {
      isValid: false,
      error: 'x 必须是 1-10 之间的正整数',
    };
  }

  // 检查n的范围 (1-5)
  if (nNum < 1 || nNum > 5) {
    return {
      isValid: false,
      error: 'n 必须是 1-5 之间的正整数',
    };
  }

  return {
    isValid: true,
  };
}

/**
 * 验证质数判断器输入
 * @param input - 输入值
 * @returns 验证结果
 */
export function validatePrimeInput(input: string): ValidationResult {
  // 检查输入是否为空
  if (!input.trim()) {
    return {
      isValid: false,
      error: '请输入一个数字',
    };
  }

  // 尝试转换为数字
  const num = parseInt(input);

  // 检查是否为有效数字
  if (isNaN(num)) {
    return {
      isValid: false,
      error: '请输入有效的数字',
    };
  }

  // 检查是否为整数
  if (num.toString() !== input) {
    return {
      isValid: false,
      error: '请输入整数，不要输入小数',
    };
  }

  // 检查范围 (1-10000)
  if (num < 1 || num > 10000) {
    return {
      isValid: false,
      error: '请输入 1-10000 之间的正整数',
    };
  }

  return {
    isValid: true,
  };
}

/**
 * 获取输入错误时的CSS类名
 * @param hasError - 是否有错误
 * @param baseClassName - 基础类名
 * @returns 组合后的类名
 */
export function getInputErrorClassName(
  hasError: boolean,
  baseClassName: string = ''
): string {
  const base =
    baseClassName ||
    'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

  if (hasError) {
    return `${base} border-red-500 focus-visible:ring-red-500`;
  }

  return base;
}

/**
 * 验证单个输入是否为正整数
 * @param value - 输入值
 * @param min - 最小值
 * @param max - 最大值
 * @param fieldName - 字段名称（用于错误信息）
 * @returns 验证结果
 */
export function validatePositiveInteger(
  value: string,
  min: number,
  max: number,
  fieldName: string
): ValidationResult {
  if (!value.trim()) {
    return {
      isValid: false,
      error: `请输入${fieldName}`,
    };
  }

  const num = parseInt(value);

  if (isNaN(num)) {
    return {
      isValid: false,
      error: `${fieldName}必须是有效的数字`,
    };
  }

  if (num.toString() !== value) {
    return {
      isValid: false,
      error: `${fieldName}必须是整数，不要输入小数`,
    };
  }

  if (num < min || num > max) {
    return {
      isValid: false,
      error: `${fieldName}必须是 ${min}-${max} 之间的正整数`,
    };
  }

  return {
    isValid: true,
  };
}

/**
 * 清理输入字符串（去除前后空格和无效字符）
 * @param input - 原始输入
 * @returns 清理后的输入
 */
export function sanitizeInput(input: string): string {
  return input.trim();
}

/**
 * 检查输入是否为空
 * @param inputs - 要检查的输入数组
 * @returns 是否有空输入
 */
export function hasEmptyInput(inputs: string[]): boolean {
  return inputs.some((input) => !input.trim());
}

/**
 * 实时输入验证（用于input onChange事件）
 * @param value - 当前输入值
 * @param previousValue - 之前的输入值
 * @returns 是否允许该输入
 */
export function allowRealtimeInput(
  value: string,
  previousValue: string
): boolean {
  // 允许空输入
  if (!value.trim()) {
    return true;
  }

  // 只允许数字和删除操作
  const isNumberOnly = /^\\d*$/.test(value);

  // 检查是否是删除操作（新输入比之前短）或者是纯数字
  return value.length <= previousValue.length || isNumberOnly;
}
