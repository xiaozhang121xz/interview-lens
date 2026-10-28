import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

// 阶乘计算器的状态接口
interface FactorialCalculatorState {
  // 输入状态
  x: string; // x的输入值 (1-10)
  n: string; // n的输入值 (1-5)

  // 计算状态
  result: bigint | null; // 计算结果，使用bigint处理大数
  error: string | null; // 错误信息
  isLoading: boolean; // 加载状态

  // Actions
  setX: (value: string) => void;
  setN: (value: string) => void;
  calculate: () => void;
  clear: () => void;
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
}

// 质数判断器的状态接口
interface PrimeCheckerState {
  // 输入状态
  input: string; // 输入值 (1-10000)

  // 计算状态
  result: boolean | null; // 判断结果
  factors: number[] | null; // 因数分解（非质数时）
  error: string | null; // 错误信息
  isLoading: boolean; // 加载状态

  // Actions
  setInput: (value: string) => void;
  check: () => void;
  clear: () => void;
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
}

// 创建阶乘计算器store
export const useFactorialCalculatorStore = create<FactorialCalculatorState>()(
  devtools(
    (set, get) => ({
      // 初始状态
      x: '',
      n: '',
      result: null,
      error: null,
      isLoading: false,

      // Actions
      setX: (value: string) => {
        set({ x: value, error: null });
      },

      setN: (value: string) => {
        set({ n: value, error: null });
      },

      calculate: () => {
        const { x, n } = get();

        // 输入验证
        const xNum = parseInt(x);
        const nNum = parseInt(n);

        if (isNaN(xNum) || isNaN(nNum)) {
          set({ error: '请输入有效的数字' });
          return;
        }

        if (xNum < 1 || xNum > 10) {
          set({ error: 'x 必须是 1-10 之间的正整数' });
          return;
        }

        if (nNum < 1 || nNum > 5) {
          set({ error: 'n 必须是 1-5 之间的正整数' });
          return;
        }

        set({ isLoading: true, error: null });

        try {
          // 计算阶乘
          const factorial = (num: number): bigint => {
            let result = BigInt(1);
            for (let i = 2; i <= num; i++) {
              result *= BigInt(i);
            }
            return result;
          };

          // 计算 (x!)^n
          const factorialResult = factorial(xNum);
          const finalResult = factorialResult ** BigInt(nNum);

          set({
            result: finalResult,
            isLoading: false,
          });
        } catch (error) {
          set({
            error: '计算结果超出安全范围',
            isLoading: false,
          });
        }
      },

      clear: () => {
        set({
          x: '',
          n: '',
          result: null,
          error: null,
          isLoading: false,
        });
      },

      setError: (error: string | null) => {
        set({ error });
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },
    }),
    { name: 'factorial-calculator-store' }
  )
);

// 创建质数判断器store
export const usePrimeCheckerStore = create<PrimeCheckerState>()(
  devtools(
    (set, get) => ({
      // 初始状态
      input: '',
      result: null,
      factors: null,
      error: null,
      isLoading: false,

      // Actions
      setInput: (value: string) => {
        set({ input: value, error: null });
      },

      check: () => {
        const { input } = get();

        // 输入验证
        const num = parseInt(input);

        if (isNaN(num)) {
          set({ error: '请输入有效的数字' });
          return;
        }

        if (num < 1 || num > 10000) {
          set({ error: '请输入 1-10000 之间的正整数' });
          return;
        }

        set({ isLoading: true, error: null });

        try {
          // 质数判断算法
          const isPrime = (n: number): boolean => {
            if (n <= 1) return false;
            if (n <= 3) return true;
            if (n % 2 === 0 || n % 3 === 0) return false;

            for (let i = 5; i * i <= n; i += 6) {
              if (n % i === 0 || n % (i + 2) === 0) {
                return false;
              }
            }
            return true;
          };

          // 因数分解算法
          const getFactors = (n: number): number[] => {
            if (n <= 1) return [n];

            const factors: number[] = [];
            let remaining = n;

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
          };

          const primeResult = isPrime(num);
          const factors = primeResult ? null : getFactors(num);

          set({
            result: primeResult,
            factors,
            isLoading: false,
          });
        } catch (error) {
          set({
            error: '计算过程中发生错误',
            isLoading: false,
          });
        }
      },

      clear: () => {
        set({
          input: '',
          result: null,
          factors: null,
          error: null,
          isLoading: false,
        });
      },

      setError: (error: string | null) => {
        set({ error });
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },
    }),
    { name: 'prime-checker-store' }
  )
);

// 类型导出
export type { FactorialCalculatorState, PrimeCheckerState };
