'use client';

import { usePathname } from 'next/navigation';
import Navigation from '@/components/Navigation';

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isFullBleed = pathname === '/' || pathname === '/login';

  if (isFullBleed) {
    return <>{children}</>;
  }

  return (
    <>
      <Navigation />
      <main className="container mx-auto px-4 py-6 max-w-7xl">
        {children}
      </main>
    </>
  );
}
