import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import BrowserExtensionHandler from '@/components/browser-extension-handler';
import { ToastProvider } from '@/components/ui/toast';
import { ResponsiveScaleProvider } from '@/components/providers/responsive-scale-provider';
import { PROJECT_NAME, PROJECT_DESCRIPTION } from '@/lib/config/project';
import { Toaster } from 'sonner';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: PROJECT_DESCRIPTION,
  description: '智能客户访谈与需求洞察平台，助力销售、产品、研发高效完成客户访谈与需求采集',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning={true}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning={true}
      >
        <ResponsiveScaleProvider enabled={true} useCSSVariables={true}>
          <ToastProvider>
            <BrowserExtensionHandler />
            {children}
            <Toaster position="top-right" richColors closeButton />
          </ToastProvider>
        </ResponsiveScaleProvider>
      </body>
    </html>
  );
}
