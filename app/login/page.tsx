'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowRight,
  Zap,
  Database,
  CheckCircle,
  XCircle,
  Loader2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { InputWithIcon } from '@/components/ui/input-with-icon';
import { User, Lock } from 'lucide-react';
import MainLayout from '@/components/layout/main-layout';
import { userApi } from '@/lib/api';
import { handleApiError } from '@/lib/api';
import { useUserStore } from '@/stores/core/useUserStore';
import { useLoginCredentialsStore } from '@/stores/core/useLoginCredentialsStore';
import { useToast } from '@/components/ui/toast';
import { getSafeRedirect } from '@/lib/security';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PROJECT_NAME } from '@/lib/config/project';

// 数据库状态响应类型
interface DbStatusResponse {
  success: boolean;
  data: {
    status: 'connected' | 'disconnected' | 'error';
    database: {
      type: string;
      host: string;
      port: number | string;
      database: string;
      connectionString: string;
    };
    environment: {
      nodeEnv: string;
      hasConnectionUri: boolean;
    };
    latency?: string;
    error?: string;
    timestamp: string;
  };
}

function LoginForm() {
  // ========== 获取URL参数 ==========
  const searchParams = useSearchParams();
  const redirectParam = searchParams?.get('redirect');

  // ========== 凭证存储 Store ==========
  const { saveCredentials, setRememberMe } = useLoginCredentialsStore();

  // ========== 用户名密码登录 ==========
  // 初始值设为空，避免被 store 默认值覆盖
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMeLocal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // 标记是否已经处理过凭证（避免 hydration 导致的重复执行）
  const hasInitializedCredentials = useRef(false);

  // ========== 凭证初始化（只执行一次）==========
  useEffect(() => {
    // 防止重复执行
    if (hasInitializedCredentials.current) return;
    hasInitializedCredentials.current = true;

    // 优先使用注册成功的临时凭证（一次性）
    const tempCreds = useLoginCredentialsStore.getState().consumeTempCredentials();
    if (tempCreds && tempCreds.fromRegister) {
      console.log('[Login] 检测到注册临时凭证，自动填充:', tempCreds.username);
      setUsername(tempCreds.username);
      setRememberMeLocal(false);
      setRememberMe(false);
      return;
    }

    // 否则使用存储的记住凭证（从 store 获取最新值）
    const { credentials: storedCreds } = useLoginCredentialsStore.getState();
    if (storedCreds.username) {
      console.log('[Login] 使用记住的凭证:', storedCreds.username);
      setUsername(storedCreds.username);
    }
    setRememberMeLocal(storedCreds.rememberMe);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 空依赖数组，只在组件挂载时执行一次
  const router = useRouter();
  const setUser = useUserStore((state) => state.setUser);
  const fetchRolePersona = useUserStore((state) => state.fetchRolePersona);
  const { showToast } = useToast();

  // ========== 手机号验证码登录 ==========
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [phoneError, setPhoneError] = useState('');

  // ========== 数据库状态检测 ==========
  const [isDbStatusLoading, setIsDbStatusLoading] = useState(false);
  const [isDbStatusDialogOpen, setIsDbStatusDialogOpen] = useState(false);
  const [dbStatus, setDbStatus] = useState<DbStatusResponse | null>(null);

  // 检测数据库状态
  const handleCheckDbStatus = async () => {
    setIsDbStatusLoading(true);
    try {
      const response = await fetch('/api/system/db-status');
      const data: DbStatusResponse = await response.json();
      setDbStatus(data);
      setIsDbStatusDialogOpen(true);
    } catch (error) {
      setDbStatus({
        success: false,
        data: {
          status: 'error',
          database: {
            type: 'Unknown',
            host: 'Unknown',
            port: 'Unknown',
            database: 'Unknown',
            connectionString: 'Failed to fetch',
          },
          environment: {
            nodeEnv: 'unknown',
            hasConnectionUri: false,
          },
          error: '无法连接到服务器',
          timestamp: new Date().toISOString(),
        },
      });
      setIsDbStatusDialogOpen(true);
    } finally {
      setIsDbStatusLoading(false);
    }
  };

  // 处理用户名密码登录
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // 使用axios调用登录API
      const response = await userApi.login(username, password);

      // 登录成功
      if (response.data && response.data.user) {
        // 更新zustand store
        setUser(response.data.user);

        // 记住我只保存用户名，绝不持久化密码
        if (rememberMe) {
          saveCredentials(username);
        }

        // 获取用户角色画像
        await fetchRolePersona();

        showToast('登录成功', 'success');
        // 使用安全的重定向逻辑
        const redirectTarget = getSafeRedirect(
          redirectParam ?? null,
          '/dashboard'
        );
        router.push(redirectTarget);
      } else {
        // 登录失败
        setError('登录失败，请检查用户名和密码');
      }
    } catch (error) {
      // 使用统一的错误处理
      const errorMessage = handleApiError(error);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // 处理记住我复选框变化
  const handleRememberMeChange = (checked: boolean) => {
    setRememberMeLocal(checked);
    setRememberMe(checked);
  };
  const handleSendCode = async () => {
    // 验证手机号格式
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      setPhoneError('请输入正确的手机号');
      return;
    }
    setPhoneError('');

    try {
      setIsSendingCode(true);
      const response = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });

      const data = await response.json();

      if (data.success) {
        showToast('验证码已发送，请注意查收', 'success');
        // 开始倒计时
        setCountdown(60);
        const timer = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        showToast('发送失败，请稍后重试', 'error');
      }
    } catch (error) {
      showToast('发送失败，请稍后重试', 'error');
    } finally {
      setIsSendingCode(false);
    }
  };

  // 验证码登录
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();

    // 验证手机号和验证码
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      setPhoneError('请输入正确的手机号');
      return;
    }
    if (!/^\d{6}$/.test(code)) {
      showToast('请输入6位验证码', 'error');
      return;
    }
    setPhoneError('');

    try {
      setIsVerifying(true);
      const response = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code }),
      });

      const data = await response.json();

      if (data.success) {
        // 令牌由服务端写入 HttpOnly Cookie，前端只保存非敏感用户信息。
        setUser(data.user);

        // 获取用户角色画像
        await fetchRolePersona();

        showToast('登录成功', 'success');
        // 使用安全的重定向逻辑
        const redirectTarget = getSafeRedirect(
          redirectParam ?? null,
          '/dashboard'
        );
        router.push(redirectTarget);
      } else {
        showToast('验证码错误或已过期', 'error');
      }
    } catch (error) {
      showToast('登录失败，请稍后重试', 'error');
    } finally {
      setIsVerifying(false);
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
                className="bg-linear-to-br from-brand-600 to-brand-800 p-8 md:p-12 flex flex-col justify-between text-white"
                initial={{ x: -100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              >
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                >
                  <div className="flex items-center gap-3 mb-8">
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
                  className="space-y-3"
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
                    欢迎回来
                  </motion.h1>
                  <motion.p
                    className="text-blue-100 text-lg leading-relaxed"
                    initial={{ y: 30, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.6, delay: 0.7 }}
                  >
                    登录您的账户，继续您的AI编码之旅。让智能技术助力您的开发工作，提升效率，创造无限可能。
                  </motion.p>
                </motion.div>

                <motion.div
                  className="mt-12 grid grid-cols-3 gap-3"
                  initial={{ y: 30, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.6, delay: 0.9 }}
                >
                  {[
                    { value: '1M+', label: '代码生成', delay: 0.1 },
                    { value: '50M+', label: 'Token消耗', delay: 0.2 },
                    { value: '80%', label: '提效比', delay: 0.3 },
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

              {/* Right side - Login Form */}
              <motion.div
                className="p-8 md:p-12"
                initial={{ x: 100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
              >
                <motion.div
                  className="mb-8"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.6, delay: 0.5 }}
                >
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">
                    登录账户
                  </h2>
                </motion.div>

                {/* Tab切换 */}
                <Tabs defaultValue="username" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-6">
                    <TabsTrigger value="username">用户名登录</TabsTrigger>
                    <TabsTrigger value="phone">手机号登录</TabsTrigger>
                  </TabsList>

                  {/* 用户名密码登录 */}
                  <TabsContent value="username">
                    <form onSubmit={handleSubmit} className="space-y-3">
                      {error && (
                        <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
                          {error}
                        </div>
                      )}

                      <div className="space-y-4">
                        <motion.div
                          className="space-y-2"
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
                          <motion.div
                            whileHover={{ scale: 1.02 }}
                            whileFocus={{ scale: 1.02 }}
                          >
                            <InputWithIcon
                              id="username"
                              type="text"
                              value={username}
                              onChange={setUsername}
                              placeholder="输入您的用户名"
                              icon={User}
                              className="h-12 border-gray-200 rounded-lg focus:border-primary focus:ring-primary/20"
                              required
                            />
                          </motion.div>
                        </motion.div>

                        <motion.div
                          className="space-y-2"
                          initial={{ x: 20, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          transition={{ duration: 0.5, delay: 0.7 }}
                        >
                          <Label
                            htmlFor="password"
                            className="text-sm font-medium text-gray-700"
                          >
                            密码
                          </Label>
                          <motion.div
                            whileHover={{ scale: 1.02 }}
                            whileFocus={{ scale: 1.02 }}
                          >
                            <InputWithIcon
                              id="password"
                              type="password"
                              value={password}
                              onChange={setPassword}
                              placeholder="输入您的密码"
                              icon={Lock}
                              className="h-12 border-gray-200 rounded-lg focus:border-primary focus:ring-primary/20"
                              required
                            />
                          </motion.div>
                        </motion.div>
                      </div>

                      <motion.div
                        className="flex items-center justify-between"
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.5, delay: 0.8 }}
                      >
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="remember"
                            checked={rememberMe}
                            onCheckedChange={handleRememberMeChange}
                            className="border-gray-300 data-[state=checked]:bg-primary data-[state=checked]:text-white data-[state=checked]:border-primary focus:ring-primary/20"
                          />
                          <Label
                            htmlFor="remember"
                            className="text-sm text-gray-600 cursor-pointer"
                          >
                            记住我
                          </Label>
                        </div>
                        <Link
                          href="/forgot-password"
                          className="text-sm text-primary hover:text-primary/80 transition-colors"
                        >
                          忘记密码？
                        </Link>
                      </motion.div>

                      <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.5, delay: 0.9 }}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                      >
                        <Button
                          type="submit"
                          disabled={isLoading}
                          className="w-full h-12"
                        >
                          <AnimatePresence mode="wait">
                            {isLoading ? (
                              <motion.div
                                key="loading"
                                className="flex items-center space-x-2"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                              >
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                <span>正在登录...</span>
                              </motion.div>
                            ) : (
                              <motion.div
                                key="login"
                                className="flex items-center justify-center space-x-2"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                              >
                                <span>登录</span>
                                <ArrowRight className="w-5 h-5" />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </Button>
                      </motion.div>
                    </form>
                  </TabsContent>

                  {/* 手机号验证码登录 */}
                  <TabsContent value="phone">
                    <form onSubmit={handleVerifyCode} className="space-y-3">
                      <div className="space-y-4">
                        <motion.div className="space-y-2">
                          <Label
                            htmlFor="phone"
                            className="text-sm font-medium text-gray-700"
                          >
                            手机号
                          </Label>
                          <Input
                            id="phone"
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="请输入11位手机号"
                            className="h-12"
                            maxLength={11}
                          />
                          {phoneError && (
                            <p className="text-sm text-red-600">{phoneError}</p>
                          )}
                        </motion.div>

                        <motion.div className="space-y-2">
                          <Label
                            htmlFor="code"
                            className="text-sm font-medium text-gray-700"
                          >
                            验证码
                          </Label>
                          <div className="flex gap-2">
                            <Input
                              id="code"
                              type="text"
                              value={code}
                              onChange={(e) => setCode(e.target.value)}
                              placeholder="请输入6位验证码"
                              className="h-12 flex-1"
                              maxLength={6}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              onClick={handleSendCode}
                              disabled={countdown > 0 || isSendingCode}
                              className="h-12 px-4 whitespace-nowrap"
                            >
                              {isSendingCode
                                ? '发送中...'
                                : countdown > 0
                                  ? `${countdown}秒`
                                  : '获取验证码'}
                            </Button>
                          </div>
                        </motion.div>
                      </div>

                      <motion.div
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                      >
                        <Button
                          type="submit"
                          disabled={isVerifying}
                          className="w-full h-12"
                        >
                          <AnimatePresence mode="wait">
                            {isVerifying ? (
                              <motion.div
                                key="loading"
                                className="flex items-center space-x-2"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                              >
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                <span>正在登录...</span>
                              </motion.div>
                            ) : (
                              <motion.div
                                key="login"
                                className="flex items-center justify-center space-x-2"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                              >
                                <span>登录</span>
                                <ArrowRight className="w-5 h-5" />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </Button>
                      </motion.div>
                    </form>
                  </TabsContent>
                </Tabs>

                <motion.div
                  className="mt-8 text-center"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.5, delay: 1.0 }}
                >
                  <p className="text-gray-600">
                    还没有账户？{' '}
                    <Link
                      href="/signup"
                      className="text-primary hover:text-primary/80 font-medium transition-colors"
                    >
                      立即注册
                    </Link>
                  </p>
                </motion.div>

                {/* Quick login options */}
                <motion.div
                  className="mt-8"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.5, delay: 1.1 }}
                >
                  <Separator className="my-4" />

                  <div className="text-center">
                    <span className="text-sm text-gray-500">系统工具</span>
                  </div>

                  {/* 数据库状态检测按钮 */}
                  <motion.div
                    className="mt-4"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCheckDbStatus}
                      disabled={isDbStatusLoading}
                      className="w-full h-11 border-gray-300 hover:border-primary hover:text-primary hover:bg-primary/5"
                    >
                      <div className="flex items-center justify-center space-x-2">
                        {isDbStatusLoading ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Database className="w-5 h-5" />
                        )}
                        <span>
                          {isDbStatusLoading ? '检测中...' : '数据库环境检测'}
                        </span>
                      </div>
                    </Button>
                  </motion.div>
                </motion.div>
              </motion.div>
            </div>
          </motion.div>
        </div>

        {/* 数据库状态对话框 */}
        <Dialog open={isDbStatusDialogOpen} onOpenChange={setIsDbStatusDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                数据库环境状态
              </DialogTitle>
              <DialogDescription>
                当前项目的数据库连接环境信息
              </DialogDescription>
            </DialogHeader>
            {dbStatus && (
              <div className="space-y-4 mt-4">
                {/* 连接状态 */}
                <div className="flex items-center gap-2 p-3 rounded-lg bg-gray-50">
                  {dbStatus.success && dbStatus.data.status === 'connected' ? (
                    <>
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span className="font-medium text-green-700">连接成功</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-5 h-5 text-red-500" />
                      <span className="font-medium text-red-700">
                        连接失败
                      </span>
                    </>
                  )}
                </div>

                {/* 数据库信息 */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-500">数据库类型</span>
                    <span className="font-medium">{dbStatus.data.database.type}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-500">主机地址</span>
                    <span className="font-medium font-mono text-xs">
                      {dbStatus.data.database.host}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-500">端口</span>
                    <span className="font-medium">{dbStatus.data.database.port}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-500">数据库名</span>
                    <span className="font-medium">{dbStatus.data.database.database}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-500">运行环境</span>
                    <span className="font-medium">
                      {dbStatus.data.environment.nodeEnv}
                    </span>
                  </div>
                  {dbStatus.data.latency && (
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-gray-500">响应延迟</span>
                      <span className="font-medium">{dbStatus.data.latency}</span>
                    </div>
                  )}
                  <div className="py-2">
                    <span className="text-gray-500 block mb-1">连接字符串（已脱敏）</span>
                    <code className="block p-2 bg-gray-100 rounded text-xs break-all">
                      {dbStatus.data.database.connectionString}
                    </code>
                  </div>
                  {dbStatus.data.error && (
                    <div className="py-2">
                      <span className="text-red-500 block mb-1">错误信息</span>
                      <code className="block p-2 bg-red-50 rounded text-xs break-all text-red-600">
                        {dbStatus.data.error}
                      </code>
                    </div>
                  )}
                </div>

                {/* 时间戳 */}
                <div className="text-xs text-gray-400 text-right">
                  检测时间: {new Date(dbStatus.data.timestamp).toLocaleString('zh-CN')}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </MainLayout>
  );
}

// 使用Suspense包裹以支持useSearchParams
export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <MainLayout>
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-muted-foreground">加载中...</div>
          </div>
        </MainLayout>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
