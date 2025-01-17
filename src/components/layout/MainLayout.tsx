import { ReactNode } from 'react';
import { SidebarDemo } from '@/components/ui/SidebarDemo';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps): JSX.Element {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <SidebarDemo />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
} 