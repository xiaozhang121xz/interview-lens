'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { RolePersonaSelector } from '@/components/features/user/role-persona-selector';
import { useUserStore } from '@/stores/core/useUserStore';

function OnboardingContent() {
  const router = useRouter();
  const { rolePersona } = useUserStore();

  // 如果已经有角色画像，直接跳转到 dashboard
  useEffect(() => {
    if (rolePersona) {
      router.push('/dashboard');
    }
  }, [rolePersona, router]);

  const handleComplete = () => {
    // 跳转到 dashboard
    router.push('/dashboard');
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-8">
      <RolePersonaSelector
        onComplete={handleComplete}
        showSkip={true}
        showTitle={true}
      />
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <DashboardLayout>
      <OnboardingContent />
    </DashboardLayout>
  );
}