import { ReactNode } from 'react';
import { TopNav } from './TopNav';
import { AppSidebar } from './AppSidebar';
import { PrintHeader } from './PrintHeader';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="no-print">
        <TopNav />
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div className="no-print contents">
          <AppSidebar />
        </div>
        <main className="flex-1 overflow-auto p-6 print-main">
          <PrintHeader />
          {children}
        </main>
      </div>
    </div>
  );
}
