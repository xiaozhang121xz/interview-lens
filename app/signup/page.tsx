'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Lock, Mail, User, ArrowRight, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { InputWithIcon } from '@/components/ui/input-with-icon';
import MainLayout from '@/components/layout/main-layout';
import { useLoginCredentialsStore } from '@/stores/core/useLoginCredentialsStore';
import { useToast } from '@/components/ui/toast';
import { PROJECT_NAME } from '@/lib/config/project';

export default function SignupPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const router = useRouter();
  const { saveTempCredentials } = useLoginCredentialsStore();
  const { showToast } = useToast();

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!username.trim()) {
      newErrors.username = '用户名不能为空';
    }

    if (!email.trim()) {
      newErrors.email = '邮箱不能为空';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = '邮箱格式不正确';
    }

    if (!password) {
      newErrors.password = '密码不能为空';
    } else if (password.length < 8) {
      newErrors.password = '密码至少需要8个字符';
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = '两次输入的密码不一致';
    }

    if (!agreeToTerms) {
      newErrors.terms = '请阅读并同意服务条款和隐私政策';
    }

    return newErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formErrors = validateForm();

    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      // 调用注册API
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          password,
          displayName: username, // 显示名称默认使用用户名
          email,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // API返回错误
        throw new Error(data.error || '注册失败');
      }

      // 注册成功
      // 仅保存用户名用于登录页自动填充，密码不写入浏览器存储
      saveTempCredentials(username);

      // 显示成功消息并跳转到登录页
      setTimeout(() => {
        setIsLoading(false);
        showToast('注册成功！请使用您的账户登录', 'success');
        router.push('/login');
      }, 1000);
    } catch (error) {
      console.error('注册错误:', error);
      setIsLoading(false);

      // 显示错误消息
      const errorMessage =
        error instanceof Error ? error.message : '注册失败，请重试';
      setErrors({ submit: errorMessage });
    }
  };

  return (
    <MainLayout>
      <main className="flex-1 flex items-center justify-center p-4 relative">
        {/* Background decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className="absolute -top-40 -right-40 w-80 h-80 bg-primary/20 rounded-full mix-blend-multiply filter blur-xl opacity-30"
            animate={{
              scale: [1, 1.1, 1],
              x: [0, 20, 0],
              y: [0, -20, 0],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
          <motion.div
            className="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-200 rounded-full mix-blend-multiply filter blur-xl opacity-30"
            animate={{
              scale: [1, 1.2, 1],
              x: [0, -30, 0],
              y: [0, 30, 0],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: 1,
            }}
          />
        </div>

        <div className="relative z-10 w-full max-w-5xl">
          <motion.div
            className="bg-white rounded-2xl shadow-2xl overflow-hidden"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            <div className="grid md:grid-cols-2">
              {/* Left side - Branding */}
              <motion.div
                className="bg-linear-to-br from-brand-600 to-brand-800 p-5 md:p-8 flex flex-col justify-between text-white"
                initial={{ x: -100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              >
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <motion.div
                      className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center"
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      transition={{ type: 'spring', stiffness: 300 }}
                    >
                      <Zap className="w-6 h-6 text-white" />
                    </motion.div>
                    <span className="text-2xl font-semibold">
                      {PROJECT_NAME}
                    </span>
                  </div>
                </motion.div>

                <motion.div
                  className="space-y-2"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                >
                  <motion.h1
                    className="text-4xl md:text-5xl font-bold leading-tight"
                    initial={{ y: 30, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.6, delay: 0.5 }}
                  >
                    创建账户
                  </motion.h1>
                  <motion.p
                    className="text-blue-100 text-base leading-relaxed"
                    initial={{ y: 30, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.6, delay: 0.7 }}
                  >
                    加入深瞳AI
                    Coding，开启您的智能编码之旅。让先进的AI技术助力您的开发工作，提升效率，创造无限可能。
                  </motion.p>
                </motion.div>

                <motion.div
                  className="mt-6 grid grid-cols-3 gap-2"
                  initial={{ y: 30, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.6, delay: 0.9 }}
                >
                  {[
                    { value: '10K+', label: '活跃用户', delay: 0.1 },
                    { value: '100+', label: '代码模板', delay: 0.2 },
                    { value: '24/7', label: 'AI支持', delay: 0.3 },
                  ].map((stat, index) => (
                    <motion.div
                      key={index}
                      className="text-center"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{
                        duration: 0.5,
                        delay: 1.1 + stat.delay,
                        type: 'spring',
                        stiffness: 200,
                      }}
                    >
                      <div className="text-2xl font-bold">{stat.value}</div>
                      <div className="text-blue-200 text-sm">{stat.label}</div>
                    </motion.div>
                  ))}
                </motion.div>
              </motion.div>

              {/* Right side - Signup Form */}
              <motion.div
                className="p-5 md:p-7"
                initial={{ x: 100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
              >
                <motion.div
                  className="mb-4"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.6, delay: 0.5 }}
                >
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">
                    注册账户
                  </h2>
                  <p className="text-gray-600 text-sm">填写以下信息创建您的账户</p>
                </motion.div>

                <form onSubmit={handleSubmit} className="space-y-0.5">
                  <div className="space-y-1.5">
                    <motion.div
                      className="space-y-1.5"
                      initial={{ x: 20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ duration: 0.5, delay: 0.6 }}
                    >
                      <Label
                        htmlFor="username"
                        className="text-sm font-medium text-gray-700"
                      >
                        用户名
                      </Label>
                      <InputWithIcon
                        id="username"
                        type="text"
                        value={username}
                        onChange={setUsername}
                        placeholder="输入您的用户名（字母、数字、下划线）"
                        icon={User}
                        className="h-11 border-gray-200 rounded-lg focus:border-primary focus:ring-primary/20"
                        required
                      />
                      {errors.username && (
                        <p className="text-red-500 text-xs mt-0.5">
                          {errors.username}
                        </p>
                      )}
                    </motion.div>

                    <motion.div
                      className="space-y-1.5"
                      initial={{ x: 20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ duration: 0.5, delay: 0.7 }}
                    >
                      <Label
                        htmlFor="email"
                        className="text-sm font-medium text-gray-700"
                      >
                        邮箱地址
                      </Label>
                      <InputWithIcon
                        id="email"
                        type="email"
                        value={email}
                        onChange={setEmail}
                        placeholder="输入您的邮箱地址"
                        icon={Mail}
                        className="h-11 border-gray-200 rounded-lg focus:border-primary focus:ring-primary/20"
                        required
                      />
                      {errors.email && (
                        <p className="text-red-500 text-xs mt-0.5">
                          {errors.email}
                        </p>
                      )}
                    </motion.div>

                    <motion.div
                      className="space-y-1.5"
                      initial={{ x: 20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ duration: 0.5, delay: 0.8 }}
                    >
                      <Label
                        htmlFor="password"
                        className="text-sm font-medium text-gray-700"
                      >
                        密码
                      </Label>
                      <InputWithIcon
                        id="password"
                        type="password"
                        value={password}
                        onChange={setPassword}
                        placeholder="输入您的密码（至少8个字符）"
                        icon={Lock}
                        className="h-11 border-gray-200 rounded-lg focus:border-primary focus:ring-primary/20"
                        required
                      />
                      {errors.password && (
                        <p className="text-red-500 text-xs mt-0.5">
                          {errors.password}
                        </p>
                      )}
                    </motion.div>

                    <motion.div
                      className="space-y-1.5"
                      initial={{ x: 20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ duration: 0.5, delay: 0.9 }}
                    >
                      <Label
                        htmlFor="confirmPassword"
                        className="text-sm font-medium text-gray-700"
                      >
                        确认密码
                      </Label>
                      <InputWithIcon
                        id="confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={setConfirmPassword}
                        placeholder="再次输入您的密码"
                        icon={Lock}
                        className="h-11 border-gray-200 rounded-lg focus:border-primary focus:ring-primary/20"
                        required
                      />
                      {errors.confirmPassword && (
                        <p className="text-red-500 text-xs mt-0.5">
                          {errors.confirmPassword}
                        </p>
                      )}
                    </motion.div>
                  </div>

                  <motion.div
                    className="space-y-3 mt-4"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.5, delay: 1.0 }}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="terms"
                        checked={agreeToTerms}
                        onCheckedChange={(checked) =>
                          setAgreeToTerms(checked as boolean)
                        }
                        className="border-gray-300 data-[state=checked]:bg-primary data-[state=checked]:text-white data-[state=checked]:border-primary focus:ring-primary/20 mt-1"
                      />
                      <Label
                        htmlFor="terms"
                        className="text-sm text-gray-600 leading-relaxed cursor-pointer"
                      >
                        我已阅读并同意{' '}
                        <Link
                          href="/terms"
                          className="text-primary hover:text-primary/80 transition-colors"
                        >
                          服务条款
                        </Link>{' '}
                        和{' '}
                        <Link
                          href="/privacy"
                          className="text-primary hover:text-primary/80 transition-colors"
                        >
                          隐私政策
                        </Link>
                      </Label>
                    </div>
                    {errors.terms && (
                      <p className="text-red-500 text-xs">{errors.terms}</p>
                    )}

                    {errors.submit && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-2.5">
                        <p className="text-red-600 text-sm">{errors.submit}</p>
                      </div>
                    )}
                  </motion.div>

                  <motion.div
                    className="mt-4"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.5, delay: 1.1 }}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="w-full h-11"
                    >
                      {isLoading ? (
                        <div className="flex items-center gap-3">
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          <span>正在创建账户...</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center space-x-2">
                          <span>创建账户</span>
                          <ArrowRight className="w-5 h-5" />
                        </div>
                      )}
                    </Button>
                  </motion.div>
                </form>

                <motion.div
                  className="mt-4 text-center"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.5, delay: 1.2 }}
                >
                  <p className="text-gray-600 text-sm">
                    已有账户？{' '}
                    <Link
                      href="/login"
                      className="text-primary hover:text-primary/80 font-medium transition-colors"
                    >
                      立即登录
                    </Link>
                  </p>
                </motion.div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </main>
    </MainLayout>
  );
}
