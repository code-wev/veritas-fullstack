import { ReactNode } from 'react';
import { TopNav } from './TopNav';

interface ClientPortalLayoutProps {
  children: ReactNode;
}

export function ClientPortalLayout({ children }: ClientPortalLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <TopNav />
      <main className="flex-1 overflow-auto p-6 max-w-4xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
