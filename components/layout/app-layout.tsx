'use client';

import { ReactNode } from 'react';

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  // Simple wrapper component - can be used for future app-wide features
  // like theming providers, global state, etc.
  return <>{children}</>;
}
