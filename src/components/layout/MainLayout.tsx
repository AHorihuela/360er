import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { LayoutDashboard, Users, ClipboardList, LogOut, Settings } from 'lucide-react';
import { SidebarDemo } from '@/components/ui/SidebarDemo';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps): JSX.Element {
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <SidebarDemo />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
} 